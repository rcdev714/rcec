import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { EnterpriseAgentStateType, TodoItem, MAX_ITERATIONS, MAX_RETRIES, ToolOutput } from "./state";
import { ENTERPRISE_AGENT_SYSTEM_PROMPT } from "./prompt";
import { extractTokenUsageFromMetadata } from "@/lib/token-counter";
import { trackLLMUsageBackground } from "@/lib/usage";

// Import middleware
import {
  executeWithRetry,
  TOOL_RETRY_PRESETS,
} from "./middleware/tool-retry";
import {
  invokeWithFallback,
  getFallbackChainForModel,
} from "./middleware/model-fallback";
import {
  PIIRedactionMiddleware,
  LATAM_PII_RULES,
} from "./middleware/pii-redaction";

/**
 * Track LLM usage in background context
 * 
 * NOTE: The agent graph is ONLY invoked from Trigger.dev background workers,
 * so we always use the background-safe version that uses service role key
 * instead of cookies-based authentication.
 */
async function trackUsageSafe(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  // Always use background-safe version since this code only runs in Trigger.dev workers
  await trackLLMUsageBackground(userId, model, inputTokens, outputTokens);
}
import { optimizeConversationHistory } from "./context-optimizer";

// Initialize Gemini models (lazy, cached per model name)
const geminiModels: Record<string, ChatGoogleGenerativeAI> = {};

// PII Middleware instance (shared across the agent lifecycle)
// Instantiated per-request in think() to ensure fresh state
let piiMiddleware: PIIRedactionMiddleware | null = null;

/**
 * Get or create the PII middleware instance
 */
function getPIIMiddleware(): PIIRedactionMiddleware {
  if (!piiMiddleware) {
    piiMiddleware = new PIIRedactionMiddleware({
      rules: LATAM_PII_RULES,
      applyToInput: true,
      applyToOutput: true,
      restoreForTools: [
        'search_companies',
        'get_company_details',
        'lookup_customer_by_ssn',
        'enrich_company_contacts',
      ],
      enableAuditLog: true,
      onAudit: (event) => {
        console.log(`[PII] ${event.type}: ${event.piiType} in ${event.location}`);
      },
    });
  }
  return piiMiddleware;
}

/**
 * Reset PII middleware (call between conversations)
 */
export function resetPIIMiddleware(): void {
  if (piiMiddleware) {
    piiMiddleware.reset();
    piiMiddleware = null;
  }
}

function getGeminiModel(modelName: string = "gemini-2.5-flash"): ChatGoogleGenerativeAI {
  // Always recreate in development to pick up config changes
  if (process.env.NODE_ENV === 'development') {
    delete geminiModels[modelName];
  }
  
  if (!geminiModels[modelName]) {
    console.log('[getGeminiModel] Initializing model:', modelName);
    
    // Validate API key before initialization
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required but not set. Please configure your environment.');
    }
    
    const isGemini3 = modelName.startsWith('gemini-3');
    // Use v1beta for Gemini 3 models as they are in preview and may not be fully available in v1
    // Some capabilities like 'thinking' mode are definitely preview/beta
    const apiVersion = isGemini3 ? 'v1beta' : undefined; 
    // Lower temperatures for stricter instruction-following
    // Increase slightly to avoid repetition loops
    const temperature = isGemini3 ? 0.1 : 0.2;

    // Workaround: Remove 'tools' from Gemini 3 initialization if they are causing issues
    // or bind them later. For now, we initialize the base model without binding tools here.
    // The bindTools call in the think function handles the binding.
    
    geminiModels[modelName] = new ChatGoogleGenerativeAI({
      apiKey,
      model: modelName,
      temperature,
      maxOutputTokens: 8192,
      ...(apiVersion && { apiVersion }),
    });
  }
  return geminiModels[modelName];
}

/**
 * Load user context from Supabase (with caching for B2C performance)
 */
export async function loadUserContext(_state: EnterpriseAgentStateType): Promise<Partial<EnterpriseAgentStateType>> {
  try {
    // Dynamic imports for Node.js runtime compatibility
    // Use require for Supabase as import() might return a module object in some environments
    // const { createClient } = require("@supabase/supabase-js");
    
    // Use direct supabase-js client instead of server component helper
    // to avoid "cookies was called outside a request scope" error in background tasks
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials in loadUserContext');
      return {
        errorInfo: 'Error de configuración: Faltan credenciales de Supabase',
      };
    }
    
    // Use user ID passed from trigger payload if available in state
    // Note: We need to update EnterpriseAgentState to include userId if not already present
    // For now, we'll try to get it from context or fallback
    
    // Since we can't access cookies/auth.getUser() in background task, 
    // we rely on the userId being passed in the userContext or we need to fetch it
    // However, loadUserContext is the FIRST step to populate userContext.
    // The fix is to pass userId into the graph state when initializing in src/trigger/enterprise-agent.ts
    
    // TEMPORARY FIX: Check if we can extract user ID from thread_id config if available
    // or rely on the caller to pass it. The caller (enterprise-agent.ts) DOES pass userId
    // but we need to read it from the state passed in.
    
    // Assuming userId is part of userContext if partially initialized, 
    // or we need to modify how this node works.
    
    // Actually, let's look at how the graph is initialized. 
    // The enterprise-agent.ts passes a message but maybe not the user context initially.
    // We should update enterprise-agent.ts to pass initial userContext with userId.
    
    // For now, return empty context if we can't get user. 
    // The real fix is in enterprise-agent.ts to pass userId in the initial state.
    return {}; 

  } catch (error) {
    console.error('Error loading user context:', error);
    return {
      errorInfo: 'Error al cargar contexto del usuario',
    };
  }
}

/**
 * Plan todos based on user query using Gemini AI
 */
export async function planTodos(state: EnterpriseAgentStateType): Promise<Partial<EnterpriseAgentStateType>> {
  try {
    const lastMessage = state.messages[state.messages.length - 1];
    const userQuery = lastMessage?.content?.toString() || '';
    const modelName = "gemini-2.5-pro"; // Upgraded to pro for better planning
    const model = getGeminiModel(modelName);

    const contextParts: string[] = [];
    if (state.userContext?.offerings?.length) {
      contextParts.push(`Servicios del usuario: ${state.userContext.offerings.map(o => o.offering_name).join(', ')}`);
    }

    const prompt = `
Eres un Planificador Estratégico de Inteligencia Empresarial. Tu tarea es desglosar la consulta del usuario en una lista de tareas (todos) lógica y secuencial.

CONSULTA DEL USUARIO: "${userQuery}"
CONTEXTO: ${contextParts.join('\n')}

Analiza la intención del usuario y genera un plan JSON con la siguiente estructura:
{
  "goal": "lead_generation" | "company_research" | "contact_enrichment" | "email_drafting" | "general_query",
  "todos": [
    {
      "id": "string_id",
      "description": "Descripción clara de la acción (ej: 'Buscar empresas de logística en Guayas')",
      "status": "pending"
    }
  ]
}

REGLAS:
1. Si la consulta es compleja (ej: "comparar X e Y"), crea tareas separadas para cada parte.
2. Si pide contactos, incluye primero la búsqueda de la empresa y luego la búsqueda de contactos.
3. Si pide redactar un email, incluye primero la investigación de la empresa/contacto y al final la redacción.
4. Mantén el plan conciso (máximo 5 pasos).
5. Responde SOLAMENTE con el JSON válido.
`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const content = response.content.toString();
    
    // Extract JSON from response (supports ```json fenced blocks or raw JSON)
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    let jsonText: string | null = null;
    if (fenceMatch && fenceMatch[1]) {
      jsonText = fenceMatch[1];
    } else {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }
    if (!jsonText) {
      throw new Error('No valid JSON found in planner response');
    }
    
    const plan = JSON.parse(jsonText);
    
    // Map to TodoItem type
    const todos: TodoItem[] = (plan.todos || []).map((t: any, index: number) => ({
      id: t.id || Math.random().toString(36).substring(7),
      description: t.description,
      status: index === 0 ? 'in_progress' : 'pending',
      createdAt: new Date(),
    }));

    // Fallback if empty
    if (todos.length === 0) {
      todos.push({
        id: 'respond_to_query',
        description: 'Responder a la consulta del usuario',
        status: 'in_progress',
        createdAt: new Date(),
      });
    }

    return {
      todo: todos,
      goal: plan.goal || 'general_query',
      // Track token usage if available in metadata
      ...(extractTokenUsageFromMetadata(response.response_metadata) ? {
        totalInputTokens: extractTokenUsageFromMetadata(response.response_metadata)!.inputTokens,
        totalOutputTokens: extractTokenUsageFromMetadata(response.response_metadata)!.outputTokens,
        totalTokens: extractTokenUsageFromMetadata(response.response_metadata)!.totalTokens
      } : {})
    };

  } catch (error) {
    console.error('[planTodos] Error in AI planning, falling back to heuristic:', error);
    
    // Fallback to original heuristic logic
    const lastMessage = state.messages[state.messages.length - 1];
    const userQuery = lastMessage?.content?.toString() || '';
    const lowerQuery = userQuery.toLowerCase();
    const todos: TodoItem[] = [];

    if (lowerQuery.includes('busca') || lowerQuery.includes('encuentra') || lowerQuery.includes('muestra')) {
      todos.push({
        id: 'search_companies',
        description: 'Buscar empresas según criterios del usuario',
        status: 'pending',
        createdAt: new Date(),
      });
    }
    
    if (lowerQuery.includes('contacto') || lowerQuery.includes('email') || lowerQuery.includes('teléfono')) {
      todos.push({
        id: 'find_contacts',
        description: 'Encontrar información de contacto',
        status: 'pending',
        createdAt: new Date(),
      });
    }
  
    if (lowerQuery.includes('redacta') || lowerQuery.includes('escribe') || lowerQuery.includes('email') || lowerQuery.includes('correo')) {
      todos.push({
        id: 'draft_email',
        description: 'Redactar borrador de email',
        status: 'pending',
        createdAt: new Date(),
      });
    }
  
    // Default: at least one todo for general query
    if (todos.length === 0) {
      todos.push({
        id: 'respond_to_query',
        description: 'Responder a la consulta del usuario',
        status: 'pending',
        createdAt: new Date(),
      });
    }

    // Auto-start first todo
    if (todos.length > 0) {
      todos[0].status = 'in_progress';
    }
  
    // Determine goal
    let goal: EnterpriseAgentStateType['goal'] = 'general_query';
    if (lowerQuery.includes('lead') || lowerQuery.includes('prospecto') || lowerQuery.includes('busca empresas')) {
      goal = 'lead_generation';
    } else if (lowerQuery.includes('contacto') || lowerQuery.includes('enriquec')) {
      goal = 'contact_enrichment';
    } else if (lowerQuery.includes('email') || lowerQuery.includes('redacta')) {
      goal = 'email_drafting';
    } else if (lowerQuery.includes('investig') || lowerQuery.includes('analiza')) {
      goal = 'company_research';
    }
  
    return {
      todo: todos,
      goal,
    };
  }
}

/**
 * Think node - LLM reasoning about next action
 * 
 * SIMPLIFIED: Let the model work naturally. Don't force tool calls.
 * Gemini doesn't respect tool_choice anyway.
 */
export async function think(state: EnterpriseAgentStateType): Promise<Partial<EnterpriseAgentStateType>> {
  try {
    // SIMPLIFIED: No narration detection, no forced tool calls
    // Just let the model do its job
    const shouldSkipTools = false;
    
    // Import tools dynamically to bind to model
    const { companyTools } = await import("@/lib/tools/company-tools");
    const { webSearchTool, webExtractTool } = await import("@/lib/tools/web-search");
    const { enrichCompanyContactsTool } = await import("@/lib/tools/contact-tools");
    const { offeringTools } = await import("@/lib/tools/offerings-tools");
    const { perplexitySearchTool } = await import("@/lib/tools/perplexity-search");
    
    const allTools = shouldSkipTools ? [] : [
      ...companyTools,
      webSearchTool,
      webExtractTool,
      enrichCompanyContactsTool,
      ...offeringTools,
      perplexitySearchTool,
    ];
    
    // Bind tools to the model (use state.modelName for dynamic selection)
    const modelName = state.modelName || "gemini-3-pro-preview";
    
    // Gemini 3 models currently have issues with tool binding in some library versions or regions.
    // If we encounter issues with Gemini 3, we might need to fallback to a version without tools bound
    // or strictly control the schema. For now, we bind tools as usual.
    
    // NOTE: If using Gemini 3 thinking mode, we might need to be careful with tool binding
    // as some preview versions don't support both simultaneously well.
    const baseModel = getGeminiModel(modelName);
    
    // Add thinking level hint for Gemini 3 models (fallback if native param unsupported by current lib)
    let aiThinkingHint = '';
    const modelIsGemini3 = modelName.startsWith('gemini-3');
    if (modelIsGemini3 && state.thinkingLevel === 'low') {
      aiThinkingHint = '\n\n[THINKING_LEVEL: LOW] Optimize for latency and cost. Use minimal reasoning steps.\n';
    }

    // Check if this is Gemini 3 AND we are in thinking mode
    // In some cases, Gemini 3 + thinking mode + tools causes issues
    const isGemini3Thinking = modelIsGemini3 && !!aiThinkingHint;
    
    // If Gemini 3 is in thinking mode, it seems it DOES NOT support tools yet in the v1beta API.
    // The error "Invalid JSON payload received. Unknown name 'tools': Cannot find field" is specific to this.
    // Workaround: When thinking is enabled for Gemini 3, we DO NOT bind tools to the model call.
    // But the 'think' node is supposed to select tools!
    // This implies we cannot use 'thinking' mode for tool selection. We can only use it for pure reasoning.
    
    // Correct strategy:
    // 1. If we need to select tools (which 'think' usually does), we MUST disable thinking mode for this specific call if tools are bound.
    // 2. Alternatively, if we want deep reasoning, we don't bind tools and ask the model to output JSON, but that breaks the graph contract.
    
    // Decision: Prioritize tool usage for the 'think' node. Disable thinking hint if it conflicts.
    // We will override the thinkingHint variable if we are binding tools.
    
    if (isGemini3Thinking && allTools.length > 0) {
        console.log('[think] Disabling thinking mode to allow tool usage for Gemini 3');
        // Clear the thinking hint from the prompt context so we don't trigger the mode
        // We can't easily clear the variable 'thinkingHint' passed to prompt construction below, 
        // so we'll handle it by NOT passing it in the prompt construction if tools are bound.
    }
    
    // Bind tools to model (simple, no forced tool choice - Gemini ignores it anyway)
    const model = allTools.length > 0 ? baseModel.bindTools(allTools) : baseModel;
    
    console.log('[think] Using model:', modelName);
    if (process.env.NODE_ENV === 'development') {
      console.log('[think] Model object created:', !!model);
    }
    console.log('[think] Tools bound to model:', allTools.map(t => t.name));

    // Build context message
    const contextParts: string[] = [];
    
    if (state.userContext) {
      contextParts.push(`Usuario: ${state.userContext.userProfile?.firstName || 'Usuario'}`);
      contextParts.push(`Plan: ${state.userContext.subscription.plan}`);
      
      // Include detailed offerings context
      if (state.userContext.offerings.length > 0) {
        contextParts.push(`\nServicios del usuario: ${state.userContext.offerings.length} ${state.userContext.offerings.length === 1 ? 'servicio' : 'servicios'}`);
        
        // List each offering with key details
        state.userContext.offerings.forEach((offering, idx) => {
          const offeringParts = [
            `${idx + 1}. ${offering.offering_name}`,
            offering.industry ? `(${offering.industry})` : null,
          ].filter(Boolean).join(' ');
          contextParts.push(`  ${offeringParts}`);
          
          // Add industry targets if available
          if (offering.industry_targets && offering.industry_targets.length > 0) {
            contextParts.push(`     - Sectores objetivo: ${offering.industry_targets.join(', ')}`);
          }
          
          // Add description preview if available
          if (offering.description && offering.description.length > 0) {
            const preview = offering.description.substring(0, 80);
            contextParts.push(`     - ${preview}${offering.description.length > 80 ? '...' : ''}`);
          }
          
          // Add offering ID for reference
          if (offering.id) {
            contextParts.push(`     - ID: ${offering.id}`);
          }
        });
        
        // Aggregate target industries across all offerings
        const allTargetIndustries = [...new Set(state.userContext.offerings.flatMap(o => o.industry_targets || []))];
        if (allTargetIndustries.length > 0) {
          contextParts.push(`\nTodos los sectores objetivo: ${allTargetIndustries.join(', ')}`);
        }
      }
    }

    if (state.todo.length > 0) {
      const pendingTodos = state.todo.filter(t => t.status === 'pending' || t.status === 'in_progress');
      contextParts.push(`Tareas pendientes: ${pendingTodos.map(t => t.description).join(', ')}`);
    }

    if (state.toolOutputs.length > 0) {
      const lastOutput = state.toolOutputs[state.toolOutputs.length - 1];
      contextParts.push(`Última herramienta: ${lastOutput.toolName} (${lastOutput.success ? 'éxito' : 'fallo'})`);
      
      // CRITICAL FIX: Include ALL successful tool results in context, not just the last one
      // This ensures the LLM has access to all gathered data when generating the final response
      const successfulOutputs = state.toolOutputs.filter(output => output.success && output.output);
      
      if (successfulOutputs.length > 0) {
        contextParts.push(`\n[TOOL RESULTS SUMMARY - USE THIS DATA IN YOUR RESPONSE]`);
        
        successfulOutputs.forEach(output => {
          try {
            const outputData = output.output as any;
            
            // For search_companies, include full summary with sector relevance detection
            if (output.toolName === 'search_companies' && outputData.result) {
              const companies = outputData.result.companies || [];
              const originalQuery = outputData.result?.query || output.input?.query || '';
              const sectorInfo = outputData.sectorInfo as {
                matchingCount?: number;
                matchPercentage?: number;
                topMatches?: string[];
                detectedSector?: string;
                lowCoverageWarning?: boolean;
              } | undefined;
              
              contextParts.push(`\n- search_companies: ${companies.length} empresas encontradas`);
              contextParts.push(`  * Query original: "${originalQuery}"`);
              
              // NEW: Use the tool's built-in sector relevance info
              if (sectorInfo) {
                contextParts.push(`  * Sector detectado: ${sectorInfo.detectedSector || 'ninguno'}`);
                contextParts.push(`  * Coincidencia sectorial: ${sectorInfo.matchingCount || 0} empresas (${sectorInfo.matchPercentage || 0}%)`);
                
                if (sectorInfo.topMatches && sectorInfo.topMatches.length > 0) {
                  contextParts.push(`  * Top matches del sector: ${sectorInfo.topMatches.join(', ')}`);
                }
                
                // CRITICAL: If low sector coverage, prompt web_search
                if (sectorInfo.lowCoverageWarning) {
                  contextParts.push(`\n  ⚠️ **ALERTA: BAJA COBERTURA DE SECTOR (${sectorInfo.matchPercentage}%)**`);
                  contextParts.push(`  * La base de datos tiene poca información del sector "${sectorInfo.detectedSector}".`);
                  contextParts.push(`  * **ACCIÓN OBLIGATORIA**: Ejecuta \`web_search\` AHORA con:`);
                  contextParts.push(`    - Query: "empresas de ${sectorInfo.detectedSector} en Ecuador lista principales"`);
                  contextParts.push(`    - O: "mejores ${sectorInfo.detectedSector} Ecuador directorio empresas"`);
                  contextParts.push(`  * Luego busca los nombres encontrados en la BD para datos financieros.`);
                }
              } else if (companies.length > 0) {
                // Fallback: Manual sector relevance detection for older tool versions
                const queryLower = originalQuery.toLowerCase();
                const sectorKeywords = [
                  'alimentos', 'comida', 'food', 'agrícola', 'agricultura',
                  'tecnología', 'software', 'tech', 'it', 'sistemas',
                  'logística', 'transporte', 'cargo', 'envíos',
                  'construcción', 'inmobiliaria', 'real estate',
                  'salud', 'médico', 'farmacéutica', 'hospital',
                  'financiero', 'banco', 'seguros', 'fintech',
                  'retail', 'comercio', 'tienda', 'supermercado',
                  'manufactura', 'industrial', 'fábrica',
                  'turismo', 'hotel', 'restaurante', 'viajes',
                  'educación', 'universidad', 'colegio', 'capacitación',
                ];
                
                const querySector = sectorKeywords.find(kw => queryLower.includes(kw));
                
                if (querySector) {
                  // Check if any company names or descriptions match the sector
                  const companyTexts = companies.slice(0, 10).map((c: any) => 
                    `${c.nombre || ''} ${c.nombre_comercial || ''} ${c.actividad_principal || ''} ${c.ciiu || ''}`.toLowerCase()
                  );
                  const sectorMatchCount = companyTexts.filter((text: string) => 
                    sectorKeywords.some(kw => text.includes(kw) && queryLower.includes(kw))
                  ).length;
                  
                  if (sectorMatchCount < 2) {
                    contextParts.push(`\n  ⚠️ **ALERTA: BAJA COINCIDENCIA DE SECTOR**`);
                    contextParts.push(`  * El usuario busca "${querySector}" pero los resultados parecen ser de otros sectores.`);
                    contextParts.push(`  * **ACCIÓN REQUERIDA**: Usa \`web_search\` para encontrar empresas específicas del sector "${querySector}"`);
                  }
                }
              }
              
              // Always show top companies for context
              if (companies.length > 0) {
                const topCompanies = companies.slice(0, 5).map((c: any) => {
                  const parts = [
                    c.nombre_comercial || c.nombre,
                    `RUC: ${c.ruc}`,
                    `Empleados: ${c.n_empleados || 'N/A'}`,
                    c.ingresos_ventas ? `Ingresos: $${c.ingresos_ventas.toLocaleString()}` : null,
                    // Use descripcion (not actividad_principal which is empty in DB)
                    c.descripcion ? `Actividad: ${c.descripcion.substring(0, 60)}` : null,
                    c.ciiu ? `CIIU: ${c.ciiu}` : null,
                  ].filter(Boolean).join(', ');
                  return `  * ${parts}`;
                }).join('\n');
                contextParts.push(topCompanies);
              }
            }
            
            // For get_company_details, include rich company data
            if (output.toolName === 'get_company_details' && outputData.company) {
              const company = outputData.company;
              contextParts.push(`\n- get_company_details: ${company.nombre || company.nombre_comercial}`);
              contextParts.push(`  * RUC: ${company.ruc}`);
              if (company.provincia) contextParts.push(`  * Provincia: ${company.provincia}`);
              if (company.n_empleados) contextParts.push(`  * Empleados: ${company.n_empleados}`);
              if (company.total_ingresos) contextParts.push(`  * Ingresos: $${company.total_ingresos.toLocaleString()}`);
              if (company.utilidad_neta) contextParts.push(`  * Utilidad: $${company.utilidad_neta.toLocaleString()}`);
              if (company.representante_legal) contextParts.push(`  * Rep. Legal: ${company.representante_legal}`);
            }
            
            // For web_search, include key findings
            if (output.toolName === 'web_search' && outputData.results) {
              const results = outputData.results;
              contextParts.push(`\n- web_search: ${results.length} resultados encontrados`);
              if (results.length > 0 && results[0].title) {
                contextParts.push(`  * Top result: ${results[0].title}`);
              }
            }
            
            // For web_extract, include contact info
            if (output.toolName === 'web_extract' && outputData.results) {
              const results = outputData.results;
              contextParts.push(`\n- web_extract: Información extraída de ${results.length} página(s)`);
              results.forEach((r: any) => {
                if (r.contactInfo) {
                  if (r.contactInfo.emails?.length) {
                    contextParts.push(`  * Emails: ${r.contactInfo.emails.map((e: any) => e.address).join(', ')}`);
                  }
                  if (r.contactInfo.phones?.length) {
                    contextParts.push(`  * Teléfonos: ${r.contactInfo.phones.map((p: any) => p.number).join(', ')}`);
                  }
                }
              });
            }
            
            // For enrich_company_contacts, include contact info
            if (output.toolName === 'enrich_company_contacts' && outputData.contacts) {
              contextParts.push(`\n- enrich_company_contacts: ${outputData.contacts.length} contactos encontrados`);
              outputData.contacts.slice(0, 3).forEach((c: any) => {
                contextParts.push(`  * ${c.name || 'N/A'} - ${c.position || 'N/A'}`);
              });
            }
            
            // For perplexity_search, include synthesized answer and citations
            if (output.toolName === 'perplexity_search' && outputData.answer) {
              contextParts.push(`\n- perplexity_search: Investigación profunda completada`);
              // Include a preview of the answer (first 500 chars)
              const answerPreview = outputData.answer.substring(0, 500);
              contextParts.push(`  * Resumen: ${answerPreview}${outputData.answer.length > 500 ? '...' : ''}`);
              if (outputData.citations && outputData.citations.length > 0) {
                contextParts.push(`  * Fuentes: ${outputData.citationsCount} citaciones`);
              }
            }
            
            // For list_user_offerings, include offerings summary
            if (output.toolName === 'list_user_offerings' && outputData.offerings) {
              contextParts.push(`\n- list_user_offerings: ${outputData.count} servicios encontrados`);
              if (outputData.statistics && outputData.statistics.target_industries) {
                contextParts.push(`  * Industrias objetivo: ${outputData.statistics.target_industries.join(', ')}`);
              }
              outputData.offerings.slice(0, 3).forEach((o: any) => {
                contextParts.push(`  * ${o.offering_name} (${o.industry || 'N/A'})`);
              });
            }
            
            // For get_offering_details, include detailed offering info
            if (output.toolName === 'get_offering_details' && outputData.offering) {
              const offering = outputData.offering;
              contextParts.push(`\n- get_offering_details: ${offering.offering_name}`);
              if (offering.description) contextParts.push(`  * ${offering.description.substring(0, 150)}...`);
              if (offering.pricing) {
                const priceInfo = offering.pricing.plans.length === 1
                  ? `$${offering.pricing.plans[0].price}`
                  : `${offering.pricing.plans.length} planes desde $${Math.min(...offering.pricing.plans.map((p: any) => p.price))}`;
                contextParts.push(`  * Precio: ${priceInfo}`);
              }
              if (offering.industry_targets?.length) {
                contextParts.push(`  * Sectores objetivo: ${offering.industry_targets.join(', ')}`);
              }
            }
          } catch (e) {
            // Ignore parsing errors
            console.warn('[think] Error parsing tool output:', e);
          }
        });
        
        contextParts.push(`[END TOOL RESULTS - REMEMBER TO USE THIS DATA]\n`);
      }
      
      // If tool failed, provide detailed error feedback so AI can adjust
      if (!lastOutput.success && lastOutput.errorMessage) {
        contextParts.push(`Error de herramienta: ${lastOutput.errorMessage}`);
        if (state.retryCount > 0) {
          contextParts.push(`Intento ${state.retryCount} de ${MAX_RETRIES}`);
        }
      }
    }
    
    // If we have an error from callTools node itself
    if (state.errorInfo && !state.lastToolSuccess) {
      contextParts.push(`Error del sistema: ${state.errorInfo}`);
      contextParts.push('Intenta con una consulta más simple o una herramienta diferente');
    }

    // Build context message (simplified - no narration warnings)
    const contextMessage = contextParts.length > 0 
      ? `\n\n[CONTEXTO INTERNO]\n${contextParts.join('\n')}\n[/CONTEXTO INTERNO]\n`
      : '';

    // Prepare conversation messages
    // For Gemini 3, avoid sending functionCall/response parts directly because the current LangChain
    // wrapper may not preserve thoughtSignature. Rely on summarized tool results in context.
    const shouldFilterFunctionTurn = modelIsGemini3;
    let baseMessages = shouldFilterFunctionTurn
      ? state.messages.filter((m) => {
          const type = m._getType();
          const isFunctionCall = type === 'ai' && 'tool_calls' in (m as any);
          const isFunctionResponse = type === 'tool';
          return !isFunctionCall && !isFunctionResponse;
        })
      : state.messages;
    // Safeguard: if filtering removed everything, fall back to original messages
    if (shouldFilterFunctionTurn && baseMessages.length === 0) {
      console.warn('[think] All messages filtered out, using original messages');
      baseMessages = state.messages;
    }
    
    // OPTIMIZATION: Compress conversation history to reduce token usage
    // Preserves more recent messages to maintain context for follow-up questions
    if (baseMessages.length > 10) {
      const originalLength = baseMessages.length;
      baseMessages = optimizeConversationHistory(baseMessages, {
        preserveRecentMessages: 8, // Increased to preserve user follow-up questions
      });
      console.log(`[think] Optimized conversation: ${originalLength} -> ${baseMessages.length} messages`);
    }

    // Trim messages if too many (keep system, first message, last 10)
    // IMPORTANT: Include ALL surviving message types after filtering
    
    // Logic to disable thinking hint if we are binding tools for Gemini 3 to avoid API conflict
    const effectiveThinkingHint = (isGemini3Thinking) ? '' : aiThinkingHint;
    
    let messagesToSend = [new SystemMessage(ENTERPRISE_AGENT_SYSTEM_PROMPT + contextMessage + effectiveThinkingHint)];
    
    // Secondary trimming only if optimizer output is still too large
    // Aligned with optimizer's maxMessages: 20 setting
    if (baseMessages.length > 20) {
      messagesToSend.push(baseMessages[0]); // First message (to preserve context)
      messagesToSend = messagesToSend.concat(baseMessages.slice(-18)); // Keep last 18 to stay under 20 total
    } else {
      messagesToSend = messagesToSend.concat(baseMessages);
    }
    
    // Fix for Google Generative AI error: "Google requires a tool name for each tool call response"
    // Ensure all ToolMessages have a name property. If missing, try to infer it or set a default.
    messagesToSend = messagesToSend.map(msg => {
      if (msg._getType() === 'tool') {
        const toolMsg = msg as any;
        if (!toolMsg.name) {
          // Try to find the corresponding tool call in previous AI messages
          // This is a best-effort heuristic
          const toolCallId = toolMsg.tool_call_id;
          let foundName = 'unknown_tool';
          
          if (toolCallId) {
             // Look backwards for the AI message that called this tool
             for (let i = messagesToSend.indexOf(msg) - 1; i >= 0; i--) {
               const prevMsg = messagesToSend[i] as any;
               if (prevMsg._getType() === 'ai' && Array.isArray(prevMsg.tool_calls)) {
                 const matchingCall = prevMsg.tool_calls.find((tc: any) => tc.id === toolCallId);
                 if (matchingCall && matchingCall.name) {
                   foundName = matchingCall.name;
                   break;
                 }
               }
             }
          }
          
          console.log(`[think] Patching missing name for ToolMessage ${toolCallId}: ${foundName}`);
          // Create a new ToolMessage with the name
          // We can't easily modify the existing instance if it's readonly, so we create a new one if possible
          // or just mutate if it allows (LangChain messages are usually mutable classes)
          toolMsg.name = foundName;
        }
      }
      return msg;
    });
    
    console.log('[think] Sending', messagesToSend.length, 'messages to model');
    console.log('[think] Message types:', messagesToSend.map(m => m._getType()).join(', '));
    if (aiThinkingHint) {
      console.log('[think] Thinking level: low (optimizing for speed)');
    }

    // Apply PII redaction to messages before sending to LLM
    const pii = getPIIMiddleware();
    const redactedMessages = pii.redactMessages(messagesToSend);
    console.log('[think] PII redaction applied to', redactedMessages.length, 'messages');

    // Use model fallback chain for resilience
    const fallbackResult = await invokeWithFallback(redactedMessages, {
      preferredModel: modelName,
      tools: allTools,
      fallbackChain: getFallbackChainForModel(modelName),
      onFallback: (from, to, error) => {
        console.log(`[think] Model fallback: ${from} -> ${to} due to: ${error.message}`);
      },
    });

    if (!fallbackResult.success || !fallbackResult.result) {
      console.error('[think] All models failed:', fallbackResult.error?.message);
      throw fallbackResult.error || new Error('All models failed');
    }

    const response = fallbackResult.result;
    console.log('[think] Response from model:', fallbackResult.modelUsed, 'after', fallbackResult.attempts.length, 'attempt(s)');
    
    console.log('[think] Response type:', response._getType());
    console.log('[think] Has tool_calls property:', 'tool_calls' in response);
    console.log('[think] tool_calls value:', (response as any).tool_calls);
    console.log('[think] Is array:', Array.isArray((response as any).tool_calls));
    if ('tool_calls' in response && Array.isArray((response as any).tool_calls)) {
      console.log('[think] Tool calls count:', (response as any).tool_calls.length);
      console.log('[think] Tool calls:', (response as any).tool_calls.map((tc: any) => tc.name));
    }
    console.log('[think] Response content preview:', response.content.toString().substring(0, 200));

    // Debug: Log the entire response_metadata to see structure
    if (process.env.NODE_ENV === 'development') {
      console.log('[think] Response metadata:', JSON.stringify(response.response_metadata, null, 2));
    }

    // Extract token usage from response metadata
    const tokenUsage = extractTokenUsageFromMetadata(response.response_metadata);
    if (tokenUsage) {
      console.log('[think] ✓ Token usage captured:', tokenUsage);
      
      // Track usage (non-blocking) - uses background-safe version in Trigger.dev
      if (state.userContext?.userId) {
        trackUsageSafe(
          state.userContext.userId,
          modelName,
          tokenUsage.inputTokens,
          tokenUsage.outputTokens
        ).catch(error => {
          console.error('[think] Error tracking usage:', error);
        });
      }
    } else {
      console.log('[think] ⚠️ No token usage found in metadata');
    }

    // Check if response has tool calls
    const hasToolCalls = 'tool_calls' in response && 
      Array.isArray((response as any).tool_calls) && 
      ((response as any).tool_calls).length > 0;

    // Increment iteration count
    const newIterationCount = (state.iterationCount || 0) + 1;
    console.log(`[think] Iteration ${newIterationCount}, hasToolCalls: ${hasToolCalls}`);

    // Return the AI message with token counts
    return {
      messages: [response],
      lastUpdateTime: new Date(),
      iterationCount: newIterationCount,
      ...(tokenUsage && {
        totalInputTokens: tokenUsage.inputTokens,
        totalOutputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.totalTokens,
      }),
    };
  } catch (error) {
    console.error('Error in think node:', error);
    return {
      errorInfo: `Error al pensar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      iterationCount: (state.iterationCount || 0) + 1,
    };
  }
}

/**
 * Process tool results from ToolMessage and populate toolOutputs
 * This bridges the gap between ToolNode (which creates ToolMessages) and our custom state tracking
 */
export function processToolResults(state: EnterpriseAgentStateType): Partial<EnterpriseAgentStateType> {
  // Process ALL ToolMessages that haven't been converted into ToolOutputs yet.
  // This fixes the case where multiple tools run in parallel and only the last
  // ToolMessage was previously processed, leaving others without a result event.
  const messages = state.messages;
  const processedIds = new Set((state.toolOutputs || []).map(o => o.toolCallId).filter(Boolean) as string[]);

  // Build a lookup of tool_call_id -> { name, args } from AI tool_calls
  const toolCallInfo = new Map<string, { name: string; args: Record<string, unknown> }>();
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as any;
    if (msg._getType && msg._getType() === 'ai' && Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls) {
        if (tc?.id) {
          toolCallInfo.set(tc.id, { name: tc.name || 'unknown_tool', args: tc.args || {} });
        }
      }
    }
  }

  const newOutputs: ToolOutput[] = [];

  for (const msg of messages as any[]) {
    if (msg && 'tool_call_id' in msg) {
      const toolCallId = msg.tool_call_id as string;
      if (!toolCallId || processedIds.has(toolCallId)) {
        continue; // skip already processed results
      }

      const info = toolCallInfo.get(toolCallId) || { name: 'unknown_tool', args: {} };

      // Parse tool content safely
      let toolOutput: unknown = msg.content;
      let success = true;
      let errorMessage: string | undefined;
      try {
        if (typeof msg.content === 'string') {
          const parsed = JSON.parse(msg.content);
          toolOutput = parsed;
          if (parsed && typeof parsed === 'object' && 'success' in parsed) {
            success = !!parsed.success;
            if (!success && 'error' in parsed) {
              errorMessage = String((parsed as { error: unknown }).error);
            }
          }
        }
      } catch {
        // leave toolOutput as-is
      }

      newOutputs.push({
        toolName: info.name,
        toolCallId,
        input: info.args,
        output: toolOutput,
        success,
        timestamp: new Date(),
        errorMessage,
      });
      processedIds.add(toolCallId);
    }
  }

  // Circuit Breaker: Check for infinite loops
  if (newOutputs.length > 0 && state.toolOutputs.length > 0) {
    const lastOldOutput = state.toolOutputs[state.toolOutputs.length - 1];
    const lastNewOutput = newOutputs[newOutputs.length - 1];
    
    // Check 1: Exact same tool + same args (obvious loop)
    const isSameTool = lastOldOutput.toolName === lastNewOutput.toolName;
    const isSameInput = JSON.stringify(lastOldOutput.input) === JSON.stringify(lastNewOutput.input);
    
    if (isSameTool && isSameInput) {
      console.warn('[processToolResults] Detected exact tool loop. Forcing finalization.');
      return {
        toolOutputs: newOutputs,
        lastTool: lastNewOutput.toolName,
        lastToolSuccess: false,
        errorInfo: 'Loop detectado: El agente está repitiendo la misma acción sin progreso.',
        retryCount: MAX_RETRIES
      };
    }
    
    // Check 2: Too many consecutive calls to same tool type (semantic loop)
    // This catches cases where the agent keeps trying similar searches with different params
    const allOutputs = [...state.toolOutputs, ...newOutputs];
    const recentOutputs = allOutputs.slice(-5); // Last 5 tool calls
    const sameToolCount = recentOutputs.filter(o => o.toolName === lastNewOutput.toolName).length;
    
    if (sameToolCount >= 4) {
      console.warn(`[processToolResults] Detected semantic loop: ${sameToolCount} consecutive ${lastNewOutput.toolName} calls. Forcing strategy change.`);
      return {
        toolOutputs: newOutputs,
        lastTool: lastNewOutput.toolName,
        lastToolSuccess: false,
        errorInfo: `Has intentado ${lastNewOutput.toolName} ${sameToolCount} veces sin resultados satisfactorios. Intenta un enfoque diferente o reformula tu consulta.`,
        retryCount: MAX_RETRIES
      };
    }
    
    // Check 3: Search results not improving (same total count or 0 results multiple times)
    if (lastNewOutput.toolName === 'search_companies') {
      const searchOutputs = allOutputs.filter(o => o.toolName === 'search_companies').slice(-3);
      if (searchOutputs.length >= 3) {
        const allZeroResults = searchOutputs.every(o => {
          try {
            const output = o.output as any;
            const count = output?.result?.totalCount || output?.result?.companies?.length || 0;
            return count === 0;
          } catch { return false; }
        });
        
        if (allZeroResults) {
          console.warn('[processToolResults] 3 consecutive searches with 0 results. Suggesting different approach.');
          return {
            toolOutputs: newOutputs,
            lastTool: lastNewOutput.toolName,
            lastToolSuccess: false,
            errorInfo: 'Las últimas 3 búsquedas no encontraron resultados. Intenta con términos más generales o usa búsqueda web.',
            retryCount: MAX_RETRIES
          };
        }
      }
    }
  }

  if (newOutputs.length === 0) {
    // If no new ToolMessages found, but we have a system error, increment retry
    if (state.errorInfo) {
      return {
        lastToolSuccess: false,
        retryCount: state.retryCount + 1,
      };
    }
    return {};
  }

  const allSucceeded = newOutputs.every(o => o.success);
  const lastOutput = newOutputs[newOutputs.length - 1];
  const shouldRetry = !allSucceeded && state.retryCount < MAX_RETRIES;

  // NOTE: iterationCount is now incremented in think() to handle think→think loops correctly
  // Don't increment here to avoid double-counting

  return {
    toolOutputs: newOutputs,
    lastTool: lastOutput.toolName,
    lastToolSuccess: allSucceeded,
    retryCount: shouldRetry ? state.retryCount + 1 : 0,
    errorInfo: allSucceeded ? null : lastOutput.errorMessage,
  };
}

/**
 * Evaluate result of tool call
 */
export function evaluateResult(state: EnterpriseAgentStateType): Partial<EnterpriseAgentStateType> {
  if (state.toolOutputs.length === 0) {
    return { lastToolSuccess: true };
  }

  // Preserve batch evaluation decided in processToolResults.
  // Do not overwrite lastToolSuccess or errorInfo here, as mixed batches may be misrepresented by a single last output.
  return {};
}

/**
 * Reflection node - analyze failures and adjust
 */
export async function reflection(state: EnterpriseAgentStateType): Promise<Partial<EnterpriseAgentStateType>> {
  const lastOutput = state.toolOutputs[state.toolOutputs.length - 1];
  const retryCount = state.retryCount + 1;

  if (retryCount >= MAX_RETRIES) {
    // Max retries reached, inform user
    const errorMessage = `Lo siento, no pude completar la acción "${lastOutput.toolName}" después de ${MAX_RETRIES} intentos. ${lastOutput.errorMessage || ''}`;
    
    return {
      messages: [new AIMessage(errorMessage)],
      retryCount: 0, // Reset for next action
      errorInfo: null,
    };
  }

  // Analyze error and suggest adjustment
  const reflectionMessage = `La herramienta "${lastOutput.toolName}" falló. Error: ${lastOutput.errorMessage || 'Desconocido'}. Intento ${retryCount} de ${MAX_RETRIES}. Ajustando parámetros...`;

  return {
    messages: [new AIMessage(reflectionMessage)],
    retryCount,
  };
}

/**
 * Update todos based on progress
 */
export function updateTodos(state: EnterpriseAgentStateType): Partial<EnterpriseAgentStateType> {
  let hasCompletedCurrent = false;

  const updatedTodos = state.todo.map(todo => {
    // Mark completed todos
    if (todo.status === 'in_progress' && state.lastToolSuccess) {
      hasCompletedCurrent = true;
      return {
        ...todo,
        status: 'completed' as const,
        completedAt: new Date(),
      };
    }
    
    // Mark failed todos
    if (todo.status === 'in_progress' && !state.lastToolSuccess && state.retryCount >= MAX_RETRIES) {
      hasCompletedCurrent = true; // Moved past it (failed)
      return {
        ...todo,
        status: 'failed' as const,
        errorMessage: state.errorInfo || undefined,
      };
    }
    
    return todo;
  });

  // If we finished a task, start the next one
  if (hasCompletedCurrent) {
    const nextTodoIndex = updatedTodos.findIndex(t => t.status === 'pending');
    if (nextTodoIndex !== -1) {
      updatedTodos[nextTodoIndex] = {
        ...updatedTodos[nextTodoIndex],
        status: 'in_progress'
      };
    }
  }

  return {
    todo: updatedTodos,
  };
}

/**
 * Iteration control - decide whether to continue or finalize
 */
export function iterationControl(state: EnterpriseAgentStateType): Partial<EnterpriseAgentStateType> {
  const newIterationCount = state.iterationCount + 1;
  
  return {
    iterationCount: newIterationCount,
    lastUpdateTime: new Date(),
  };
}

/**
 * Finalize - prepare final response
 * If the AI hasn't generated a substantial final response, create one here
 */
export async function finalize(state: EnterpriseAgentStateType): Promise<Partial<EnterpriseAgentStateType>> {
  // Check if we have a substantial final response from the AI
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  
  // If last message is an AIMessage with substantial content, we're good
  if (lastMessage && lastMessage._getType() === 'ai') {
    let content = lastMessage.content.toString().trim();
    
    // Clean content similar to how index.ts does it to ensure we're measuring visible text
    content = content
      .replace(/\[object Object\],?/g, '')
      .replace(/^Herramienta utilizada:[\s\S]*?(?=\n\n|$)/gmi, '')
      .replace(/^Parámetros:[\s\S]*?(?=\n\n|$)/gmi, '')
      .replace(/\[CALL:[^\]]*\][^\n]*\n?/g, '')
      .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, '')
      .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, '')
      .trim();

    // Check if content looks like raw JSON function calls
    const isRawJson = (content.startsWith('[') || content.startsWith('{')) && 
                      (content.includes('functionCall') || content.includes('"name":'));

    // Check if content is substantial (not just internal context markers or empty)
    const hasSubstantialContent = content.length > 50 && 
      !content.startsWith('[CONTEXTO INTERNO]') &&
      !content.match(/^[,\s]*$/) &&
      !isRawJson; // Don't count raw JSON as substantial content
    
    if (hasSubstantialContent) {
      console.log('[finalize] Substantial AI response already exists, finalizing');
      return {
        lastUpdateTime: new Date(),
      };
    }
  }
  
  // If we don't have a substantial response, generate one now
  console.log('[finalize] No substantial response found, generating final response');
  
  try {
    // Build a comprehensive summary of all tool results
    const contextParts: string[] = [];
    contextParts.push('INSTRUCCIÓN: Genera una respuesta final COMPLETA y SUSTANCIAL para el usuario.');
    contextParts.push('Debes sintetizar TODOS los resultados de las herramientas que ejecutaste.');
    contextParts.push('NO digas "ya busqué" o "ya encontré" - PRESENTA los resultados directamente.');
    contextParts.push('');
    
    // Include user context
    if (state.userContext?.userProfile) {
      contextParts.push(`Usuario: ${state.userContext.userProfile.firstName || 'Usuario'}`);
    }
    
    // Include goal
    if (state.goal) {
      const goalNames: Record<string, string> = {
        'lead_generation': 'Generación de leads',
        'company_research': 'Investigación de empresas',
        'contact_enrichment': 'Enriquecimiento de contactos',
        'email_drafting': 'Redacción de email',
        'general_query': 'Consulta general',
      };
      contextParts.push(`Objetivo: ${goalNames[state.goal] || state.goal}`);
    }
    
    // Include ALL successful tool results
    const successfulOutputs = state.toolOutputs.filter(output => output.success && output.output);
    
    if (successfulOutputs.length > 0) {
      contextParts.push('');
      contextParts.push('=== RESULTADOS DE HERRAMIENTAS (USA TODA ESTA INFORMACIÓN) ===');
      
      successfulOutputs.forEach((output, index) => {
        try {
          const outputData = output.output as any;
          contextParts.push(`\n${index + 1}. ${output.toolName}:`);
          
          // Format each tool's output appropriately
          if (output.toolName === 'search_companies' && outputData.result) {
            const companies = outputData.result.companies || [];
            contextParts.push(`   - Encontradas: ${companies.length} empresas`);
            if (companies.length > 0) {
              contextParts.push('   - Datos clave:');
              companies.slice(0, 10).forEach((c: any) => {
                const parts = [
                  c.nombre_comercial || c.nombre,
                  `RUC: ${c.ruc}`,
                  c.n_empleados ? `Empleados: ${c.n_empleados}` : null,
                  c.total_ingresos ? `Ingresos: $${c.total_ingresos.toLocaleString()}` : null,
                  c.provincia,
                ].filter(Boolean).join(' | ');
                contextParts.push(`     * ${parts}`);
              });
            }
          } else if (output.toolName === 'get_company_details' && outputData.company) {
            const company = outputData.company;
            contextParts.push(`   - Empresa: ${company.nombre || company.nombre_comercial}`);
            contextParts.push(`   - RUC: ${company.ruc}`);
            if (company.provincia) contextParts.push(`   - Ubicación: ${company.provincia}`);
            if (company.n_empleados) contextParts.push(`   - Empleados: ${company.n_empleados}`);
            if (company.total_ingresos) contextParts.push(`   - Ingresos: $${company.total_ingresos.toLocaleString()}`);
            if (company.utilidad_neta) contextParts.push(`   - Utilidad: $${company.utilidad_neta.toLocaleString()}`);
          } else if (output.toolName === 'web_search' && outputData.results) {
            const results = outputData.results;
            contextParts.push(`   - Resultados de búsqueda: ${results.length} páginas encontradas`);
            results.slice(0, 3).forEach((r: any) => {
              if (r.title) contextParts.push(`     * ${r.title}`);
              if (r.snippet) contextParts.push(`       ${r.snippet.substring(0, 150)}...`);
            });
          } else if (output.toolName === 'web_extract' && outputData.results) {
            const results = outputData.results;
            contextParts.push(`   - Información extraída de ${results.length} página(s)`);
            results.forEach((r: any) => {
              if (r.url) contextParts.push(`     * URL: ${r.url}`);
              if (r.contactInfo) {
                if (r.contactInfo.emails?.length) {
                  contextParts.push(`     * Emails: ${r.contactInfo.emails.map((e: any) => e.address).join(', ')}`);
                }
                if (r.contactInfo.phones?.length) {
                  contextParts.push(`     * Teléfonos: ${r.contactInfo.phones.map((p: any) => p.number).join(', ')}`);
                }
              }
            });
          } else if (output.toolName === 'enrich_company_contacts' && outputData.contacts) {
            contextParts.push(`   - Contactos encontrados: ${outputData.contacts.length}`);
            outputData.contacts.slice(0, 5).forEach((c: any) => {
              contextParts.push(`     * ${c.name || 'N/A'} - ${c.position || 'N/A'}`);
              if (c.email) contextParts.push(`       Email: ${c.email}`);
              if (c.phone) contextParts.push(`       Tel: ${c.phone}`);
            });
          }
        } catch (e) {
          console.warn('[finalize] Error formatting tool output:', e);
          contextParts.push(`   - [Error formateando resultado]`);
        }
      });
      
      contextParts.push('');
      contextParts.push('=== FIN DE RESULTADOS ===');
      contextParts.push('');
      contextParts.push('Ahora, genera una respuesta completa, estructurada y profesional que:');
      contextParts.push('1. Presente TODOS los resultados relevantes de forma clara');
      contextParts.push('2. Use tablas/listas para datos de empresas');
      contextParts.push('3. Incluya insights y análisis del contexto');
      contextParts.push('4. Sugiera próximos pasos al usuario');
      contextParts.push('5. Sea profesional, útil y directa');
    } else {
      // No tool results, but we still need a response
      contextParts.push('');
      contextParts.push('No se ejecutaron herramientas. Genera una respuesta apropiada basada en la conversación.');
    }
    
    const finalizationContext = contextParts.join('\n');
    
    // Get the most recent user query
    const lastUserMessage = [...messages].reverse().find(m => m._getType() === 'human');
    const userQuery = lastUserMessage?.content?.toString() || 'consulta del usuario';
    
    // Add thinking level hint for Gemini 3 models (fallback until LangChain exposes native param)
    const modelName = state.modelName || "gemini-2.5-flash";
    let thinkingHint = '';
    const isGemini3Final = modelName.startsWith('gemini-3');
    if (isGemini3Final && state.thinkingLevel === 'low') {
      thinkingHint = '\n[THINKING_LEVEL: LOW] Optimize for latency and cost. Use minimal reasoning steps.\n';
    }
    
    // Determine if we should use thinking mode for finalization.
    // Finalize node does NOT use tools, so thinking mode SHOULD be safe here.
    const effectiveThinkingHint = thinkingHint;
    
    // Create finalization prompt as a human message to satisfy alternation rules
    const finalizationPrompt = new HumanMessage(`${finalizationContext}

CONSULTA ORIGINAL DEL USUARIO:
"${userQuery}"
${effectiveThinkingHint}
Genera tu respuesta final ahora. DEBE ser completa, profesional y útil.`);
    
    // Invoke model for final response with MODEL FALLBACK
    // Note: finalize does not bind tools, so this call is safe for Gemini 3 + Thinking
    // Use the selected model for synthesis (no time-based switching in async mode)
    let synthesisModelName = modelName;
    
    // For Gemini 3 with thinking mode issues, fall back to Gemini 2.5 Pro
    if (modelName.startsWith('gemini-3')) {
      console.log('[finalize] Switching from Gemini 3 to Gemini 2.5 Pro for reliable synthesis');
      synthesisModelName = 'gemini-2.5-pro';
    }
    
    console.log('[finalize] Generating final response with model fallback chain starting at:', synthesisModelName);
    if (effectiveThinkingHint) {
      console.log('[finalize] Thinking level: low (optimizing for speed)');
    }
    
    // Use model fallback for resilience
    const fallbackResult = await invokeWithFallback([finalizationPrompt], {
      preferredModel: synthesisModelName,
      fallbackChain: getFallbackChainForModel(synthesisModelName),
      onFallback: (from, to, error) => {
        console.log(`[finalize] Model fallback: ${from} -> ${to} due to: ${error.message}`);
      },
    });

    if (!fallbackResult.success || !fallbackResult.result) {
      console.error('[finalize] All models failed:', fallbackResult.error?.message);
      throw fallbackResult.error || new Error('All models failed in finalize');
    }

    const response = fallbackResult.result;
    console.log('[finalize] Response from model:', fallbackResult.modelUsed, 'after', fallbackResult.attempts.length, 'attempt(s)');
    
    console.log('[finalize] Final response generated, length:', response.content.toString().length);
    
    // Debug: Log the entire response_metadata to see structure
    if (process.env.NODE_ENV === 'development') {
      console.log('[finalize] Response metadata:', JSON.stringify(response.response_metadata, null, 2));
    }
    
    // Extract token usage from response metadata
    const tokenUsage = extractTokenUsageFromMetadata(response.response_metadata);
    if (tokenUsage) {
      console.log('[finalize] ✓ Token usage captured:', tokenUsage);
      
      // Track usage (non-blocking) - uses background-safe version in Trigger.dev
      if (state.userContext?.userId) {
        trackUsageSafe(
          state.userContext.userId,
          modelName,
          tokenUsage.inputTokens,
          tokenUsage.outputTokens
        ).catch(error => {
          console.error('[finalize] Error tracking usage:', error);
        });
      }
    } else {
      console.log('[finalize] ⚠️ No token usage found in metadata');
    }
    
    return {
      messages: [response],
      lastUpdateTime: new Date(),
      ...(tokenUsage && {
        totalInputTokens: tokenUsage.inputTokens,
        totalOutputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.totalTokens,
      }),
    };
    
  } catch (error) {
    console.error('[finalize] Error generating final response:', error);
    
    // Fallback: create a basic summary message
    const summaryParts: string[] = [];
    summaryParts.push('## Resumen de Acciones Completadas\n');
    
    if (state.toolOutputs.length > 0) {
      summaryParts.push('He completado las siguientes acciones:\n');
      state.toolOutputs.forEach((output, i) => {
        summaryParts.push(`${i + 1}. **${output.toolName}**: ${output.success ? '✓ Completado' : '✗ Falló'}`);
      });
    }
    
    summaryParts.push('\n¿En qué más puedo ayudarte?');
    
    const fallbackMessage = new AIMessage(summaryParts.join('\n'));
    
    return {
      messages: [fallbackMessage],
      lastUpdateTime: new Date(),
      errorInfo: null,
    };
  }
}

// NOTE: executeToolWithTimeout removed - not needed in async mode
// The Trigger.dev worker manages overall execution time

/**
 * Manually execute tools (bypass ToolNode to avoid invocation issues)
 * This directly executes tool functions and creates ToolMessages manually
 * 
 * NOTE: Time-based cutoffs have been removed since we now run in
 * Trigger.dev background workers with no timeout constraints.
 */
export async function callTools(state: EnterpriseAgentStateType): Promise<Partial<EnterpriseAgentStateType>> {
  try {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];
    
    console.log('[callTools] Processing, messages count:', messages.length);
    
    // Verify we have an AIMessage with tool_calls
    if (lastMessage._getType() !== 'ai' || !('tool_calls' in lastMessage)) {
      console.log('[callTools] No tool calls found in last message');
      return {};
    }
    
    const toolCalls = (lastMessage as any).tool_calls;
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      console.log('[callTools] tool_calls is not an array or is empty');
      return {};
    }
    
    // Execute ALL tools in parallel - no limits in async mode
    // The background worker has unlimited time so we can run comprehensive searches
    console.log('[callTools] Executing', toolCalls.length, 'tool(s) in parallel (async mode)');
    
    // Import all tools
    const { companyTools } = await import("@/lib/tools/company-tools");
    const { webSearchTool, webExtractTool } = await import("@/lib/tools/web-search");
    const { enrichCompanyContactsTool } = await import("@/lib/tools/contact-tools");
    const { offeringTools } = await import("@/lib/tools/offerings-tools");
    const { perplexitySearchTool } = await import("@/lib/tools/perplexity-search");
    
    const allTools = [
      ...companyTools,
      webSearchTool,
      webExtractTool,
      enrichCompanyContactsTool,
      ...offeringTools,
      perplexitySearchTool,
    ];
    
    // Create a map of tool names to tool functions
    const toolMap = new Map(allTools.map(tool => [tool.name, tool]));
    
    // Execute all tool calls in parallel
    const { ToolMessage } = await import("@langchain/core/messages");

    // Tools that need userId injection for background task support
    const toolsNeedingUserId = ['list_user_offerings', 'get_offering_details'];
    
    // Execute ALL requested tools (no limiting in async mode)
    const toolExecutionPromises = toolCalls.map(async (toolCall: any) => {
      const tool = toolMap.get(toolCall.name);

      if (!tool) {
        console.error('[callTools] Tool not found:', toolCall.name);
        // Create error ToolMessage
        return new ToolMessage({
          content: JSON.stringify({
            success: false,
            error: `Tool "${toolCall.name}" not found`,
          }),
          tool_call_id: toolCall.id,
          name: toolCall.name || 'unknown_tool',
        });
      }

      // Inject userId for tools that need it in background mode
      const toolArgs = { ...toolCall.args };
      if (toolsNeedingUserId.includes(toolCall.name) && state.userContext?.userId) {
        toolArgs.userId = state.userContext.userId;
        console.log('[callTools] Injected userId for', toolCall.name, ':', state.userContext.userId);
      }

      try {
        console.log('[callTools] Executing tool:', toolCall.name);
        console.log('[callTools] Tool args:', JSON.stringify(toolArgs, null, 2));

        // Restore PII in tool args for tools that need original values
        const pii = getPIIMiddleware();
        const processedArgs = pii.processToolInput(toolCall.name, toolArgs);

        // Execute the tool function with RETRY MIDDLEWARE
        // Uses exponential backoff for transient failures (network, rate limits)
        const retryConfig = TOOL_RETRY_PRESETS[toolCall.name] || {};
        const retryResult = await executeWithRetry(
          // Cast to any to bypass strict typing - tools expect specific arg shapes
          // but we're dynamically dispatching based on LLM output
          () => (tool.func as (args: Record<string, unknown>) => Promise<unknown>)(processedArgs) as Promise<{ success?: boolean; [key: string]: unknown }>,
          toolCall.name,
          {
            defaultConfig: {
              maxRetries: retryConfig.maxRetries ?? 3,
              initialDelayMs: retryConfig.initialDelayMs ?? 1000,
              maxDelayMs: retryConfig.maxDelayMs ?? 15000,
              backoffFactor: retryConfig.backoffFactor ?? 2.0,
              jitter: true,
            },
            onRetry: (name, attempt, error, delayMs) => {
              console.log(`[callTools] Tool ${name} retry ${attempt}: ${error.message} (waiting ${delayMs}ms)`);
            },
          }
        );

        if (retryResult.success && retryResult.result) {
          const toolResult = retryResult.result;
          console.log('[callTools] Tool', toolCall.name, 'executed successfully after', retryResult.attempts, 'attempt(s)');
          console.log('[callTools] Tool result success:', toolResult?.success);

          // Create ToolMessage with the result
          return new ToolMessage({
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
            name: tool.name,
          });
        } else {
          // All retries failed
          console.error('[callTools] Tool', toolCall.name, 'failed after', retryResult.attempts, 'attempts');
          console.error('[callTools] Retry history:', retryResult.retryHistory);
          
          return new ToolMessage({
            content: JSON.stringify({
              success: false,
              error: retryResult.error?.message || 'Tool execution failed after retries',
              retryAttempts: retryResult.attempts,
              totalDelayMs: retryResult.totalDelayMs,
            }),
            tool_call_id: toolCall.id,
            name: tool.name,
          });
        }

      } catch (error) {
        console.error('[callTools] Error executing tool:', toolCall.name);
        console.error('[callTools] Error details:', error);
        console.error('[callTools] Error stack:', error instanceof Error ? error.stack : 'No stack');

        // Create error ToolMessage
        return new ToolMessage({
          content: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
          tool_call_id: toolCall.id,
          name: tool.name,
        });
      }
    });

    // Execute all tools in parallel and wait for all to complete (or timeout)
    console.log('[callTools] Executing', toolExecutionPromises.length, 'tools in parallel');
    const newMessages = await Promise.all(toolExecutionPromises);
    console.log('[callTools] All tools completed (success or failure)');
    
    console.log('[callTools] Created', newMessages.length, 'ToolMessages');
    
    // Return the new ToolMessages to be appended to state
    return {
      messages: newMessages,
    };
    
  } catch (error) {
    console.error('[callTools] Critical error in tool execution:', error);
    
    return {
      errorInfo: `Error crítico ejecutando herramientas: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      lastToolSuccess: false,
    };
  }
}

/**
 * Correction node - injects feedback when model narrates action without calling tools
 */
export async function correction(state: EnterpriseAgentStateType): Promise<Partial<EnterpriseAgentStateType>> {
  console.log('[correction] Detected narration without tool call or raw JSON output. Injecting correction message.');
  
  // Check if the last message looks like raw JSON
  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage.content.toString().trim();
  const isRawJson = (content.startsWith('[') || content.startsWith('{')) && 
                    (content.includes('functionCall') || content.includes('"name":'));
  
  let feedbackContent = "Has descrito una acción futura pero NO has ejecutado ninguna herramienta.\n\nPOR FAVOR: No narres lo que vas a hacer. EJECUTA la herramienta necesaria directamente ahora usando tool_call.";
  
  if (isRawJson) {
    feedbackContent = "Has respondido con JSON crudo en el texto. NO hagas esto.\n\nPOR FAVOR: Usa el formato nativo de tool_calls para ejecutar herramientas.";
  }
  
  // Create a message that prompts the model to execute the action it just described
  const feedbackMessage = new HumanMessage({
    content: feedbackContent
  });
  
  return {
    messages: [feedbackMessage],
    // Increment iteration count to avoid infinite loops if it ignores correction repeatedly
    iterationCount: (state.iterationCount || 0) + 1
  };
}
/**
 * Routing functions for conditional edges
 * 
 * NOTE: Time-based circuit breakers have been removed since we now run in
 * Trigger.dev background workers with no timeout constraints.
 */

export function shouldCallTools(state: EnterpriseAgentStateType): string {
  // Check iteration limit (safety against infinite loops)
  if (state.iterationCount >= MAX_ITERATIONS) {
    console.log('[shouldCallTools] Max iterations reached, finalizing');
    return 'finalize';
  }
  
  // Check retry limit for failed tools
  if (state.errorInfo && state.retryCount >= MAX_RETRIES) {
    console.log('[shouldCallTools] Max retries reached after tool failure, finalizing');
    return 'finalize';
  }
  
  // Check if the last message has tool calls
  const messages = state.messages;
  if (messages.length === 0) {
    console.log('[shouldCallTools] No messages, finalizing');
    return 'finalize';
  }
  
  const lastMessage = messages[messages.length - 1];
  const messageType = lastMessage._getType();
  const hasToolCalls = 'tool_calls' in lastMessage && 
    Array.isArray((lastMessage as { tool_calls?: unknown[] }).tool_calls) && 
    ((lastMessage as { tool_calls: unknown[] }).tool_calls).length > 0;
  
  console.log('[shouldCallTools]', {
    messageType,
    hasToolCalls,
    toolCallsCount: hasToolCalls ? ((lastMessage as { tool_calls: unknown[] }).tool_calls).length : 0,
    iterationCount: state.iterationCount,
  });
  
  // SIMPLE: If model called tools, execute them. Otherwise, finalize.
  if (messageType === 'ai' && hasToolCalls) {
    console.log('[shouldCallTools] Routing to tools');
    return 'tools';
  }
  
  // NARRATION DETECTION: If no tools but model says it will do something
  if (messageType === 'ai' && !hasToolCalls) {
    const content = lastMessage.content.toString();
    const contentLower = content.toLowerCase();
    
    // Check if content looks like raw JSON function calls
    // This catches models (like Gemini 2.5 Pro) that sometimes output JSON as text instead of tool calls
    const hasRawJsonFunctionCall = (content.includes('functionCall') || content.includes('"name":')) && 
                                   (content.trim().startsWith('[') || content.trim().startsWith('{'));
                                   
    if (hasRawJsonFunctionCall) {
      console.log('[shouldCallTools] Detected raw JSON function call in content. Routing to correction.');
      return 'correction';
    }
    
    // Keywords indicating future action
    const narrationKeywords = [
      'procederé', 'voy a', 'a continuación', 'ahora buscaré', 
      'pasaré a', 'comenzaré a', 'iniciaré', 'continuaré con',
      'utilizaré', 'usaré', 'buscaré ahora', 'siguientes pasos:'
    ];
    
    const hasNarration = narrationKeywords.some(kw => contentLower.includes(kw));
    
    // Additional check: content should be relatively short (not a full report)
    // If it's a huge report, it might use these words in a summary/advice context
    const isShortMessage = content.length < 500;
    
    if (hasNarration && isShortMessage) {
       console.log('[shouldCallTools] Detected narration without action. Routing to correction.');
       return 'correction';
    }
  }  
  // No tool calls = model is done, finalize
  console.log('[shouldCallTools] No tool calls, finalizing');
  return 'finalize';
}

export function shouldContinue(state: EnterpriseAgentStateType): string {
  // Check if max iterations reached
  if (state.iterationCount >= MAX_ITERATIONS) {
    return 'finalize';
  }

  // Check if all todos are completed
  const pendingTodos = state.todo.filter(t => t.status === 'pending' || t.status === 'in_progress');
  if (pendingTodos.length === 0 && state.todo.length > 0) {
    return 'finalize';
  }

  // Check if there's an error that can't be recovered
  if (state.errorInfo && state.retryCount >= MAX_RETRIES) {
    return 'finalize';
  }

  // Continue iterating
  return 'think';
}

export function shouldRetry(state: EnterpriseAgentStateType): string {
  if (state.lastToolSuccess) {
    return 'update_todos';
  }

  if (state.retryCount >= MAX_RETRIES) {
    return 'update_todos'; // Give up and move on
  }

  return 'reflection';
}


