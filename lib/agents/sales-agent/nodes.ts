import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SalesAgentStateType, TodoItem, MAX_ITERATIONS, MAX_RETRIES, ToolOutput } from "./state";
import { SALES_AGENT_SYSTEM_PROMPT } from "./prompt";
import { createClient } from "@/lib/supabase/server";
import { UserOffering } from "@/types/user-offering";
import { extractTokenUsageFromMetadata } from "@/lib/token-counter";
import { trackLLMUsage } from "@/lib/usage";

// Initialize Gemini models (lazy, cached per model name)
const geminiModels: Record<string, ChatGoogleGenerativeAI> = {};

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
    
    geminiModels[modelName] = new ChatGoogleGenerativeAI({
      apiKey,
      model: modelName,
      temperature: 0.3, // Lower temperature for more consistent tool usage
      maxOutputTokens: 8192, // Increased for longer, complete responses
    });
  }
  return geminiModels[modelName];
}

/**
 * Load user context from Supabase
 */
export async function loadUserContext(_state: SalesAgentStateType): Promise<Partial<SalesAgentStateType>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorInfo: 'Usuario no autenticado',
      };
    }

    // Fetch user offerings
    const { data: offerings } = await supabase
      .from('user_offerings')
      .select('*')
      .eq('user_id', user.id);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Define limits based on plan
    const plan = subscription?.plan || 'FREE';

    // Fetch usage using billing-aligned period
    const { resolveUsageAnchorIso, getMonthlyPeriodForAnchor } = await import('@/lib/usage');
    const anchorIso = resolveUsageAnchorIso(
      plan as 'FREE' | 'PRO' | 'ENTERPRISE',
      subscription,
      user.created_at || new Date().toISOString()
    );
    const { start: periodStart } = getMonthlyPeriodForAnchor(anchorIso);

    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', periodStart.toISOString())
      .single();
    const limitsMap: Record<string, { searches: number; exports: number; prompts: number }> = {
      FREE: { searches: 10, exports: 2, prompts: 10 },
      PRO: { searches: 100, exports: 20, prompts: 100 },
      ENTERPRISE: { searches: 1000, exports: 100, prompts: 1000 },
    };
    const limits = limitsMap[plan] || limitsMap['FREE'];

    return {
      userContext: {
        userId: user.id,
        offerings: (offerings || []) as UserOffering[],
        userProfile: profile ? {
          firstName: profile.first_name,
          lastName: profile.last_name,
          companyName: profile.company_name,
          position: profile.position,
          email: user.email,
          phone: profile.phone,
        } : undefined,
        subscription: {
          plan: plan as 'FREE' | 'PRO' | 'ENTERPRISE',
          status: subscription?.status || 'active',
        },
        usage: {
          searches: usage?.searches || 0,
          exports: usage?.exports || 0,
          prompts: 0, // Will be calculated from events
        },
        limits,
      },
    };
  } catch (error) {
    console.error('Error loading user context:', error);
    return {
      errorInfo: 'Error al cargar contexto del usuario',
    };
  }
}

/**
 * Plan todos based on user query
 */
export async function planTodos(state: SalesAgentStateType): Promise<Partial<SalesAgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const userQuery = lastMessage?.content?.toString() || '';

  // Simple heuristic-based todo generation
  const todos: TodoItem[] = [];
  const lowerQuery = userQuery.toLowerCase();

  // Detect intent and create todos
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

  // Determine goal
  let goal: SalesAgentStateType['goal'] = 'general_query';
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

/**
 * Think node - LLM reasoning about next action
 */
export async function think(state: SalesAgentStateType): Promise<Partial<SalesAgentStateType>> {
  try {
    // Import tools dynamically to bind to model
    const { companyTools } = await import("@/lib/tools/company-tools");
    const { webSearchTool, webExtractTool } = await import("@/lib/tools/web-search");
    const { enrichCompanyContactsTool } = await import("@/lib/tools/contact-tools");
    const { offeringTools } = await import("@/lib/tools/offerings-tools");
    
    const allTools = [
      ...companyTools,
      webSearchTool,
      webExtractTool,
      enrichCompanyContactsTool,
      ...offeringTools,
    ];
    
    // Bind tools to the model (use state.modelName for dynamic selection)
    const modelName = state.modelName || "gemini-2.5-flash";
    const model = getGeminiModel(modelName).bindTools(allTools);
    
    console.log('[think] Using model:', modelName);
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
            
            // For search_companies, include full summary
            if (output.toolName === 'search_companies' && outputData.result) {
              const companies = outputData.result.companies || [];
              contextParts.push(`\n- search_companies: ${companies.length} empresas encontradas`);
              
              // Include top 5 companies with key details
              if (companies.length > 0) {
                const topCompanies = companies.slice(0, 5).map((c: any) => {
                  const parts = [
                    c.nombre_comercial || c.nombre,
                    `RUC: ${c.ruc}`,
                    `Empleados: ${c.n_empleados || 'N/A'}`,
                    c.total_ingresos ? `Ingresos: $${c.total_ingresos.toLocaleString()}` : null,
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

    const contextMessage = contextParts.length > 0 
      ? `\n\n[CONTEXTO INTERNO]\n${contextParts.join('\n')}\n[/CONTEXTO INTERNO]\n`
      : '';

    // Trim messages if too many (keep system, first user, last 10)
    // IMPORTANT: Include ALL message types (Human, AI, Tool) for context
    let messagesToSend = [new SystemMessage(SALES_AGENT_SYSTEM_PROMPT + contextMessage)];
    
    if (state.messages.length > 12) {
      messagesToSend.push(state.messages[0]); // First user message
      messagesToSend = messagesToSend.concat(state.messages.slice(-10)); // Last 10 (includes ToolMessages)
    } else {
      messagesToSend = messagesToSend.concat(state.messages);
    }
    
    console.log('[think] Sending', messagesToSend.length, 'messages to model');
    console.log('[think] Message types:', messagesToSend.map(m => m._getType()).join(', '));

    const response = await model.invoke(messagesToSend);
    
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
      
      // Track usage (non-blocking)
      if (state.userContext?.userId) {
        trackLLMUsage(
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

    // Return the full AI message (which may include tool calls) with token counts
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
    console.error('Error in think node:', error);
    return {
      errorInfo: `Error al pensar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

/**
 * Process tool results from ToolMessage and populate toolOutputs
 * This bridges the gap between ToolNode (which creates ToolMessages) and our custom state tracking
 */
export function processToolResults(state: SalesAgentStateType): Partial<SalesAgentStateType> {
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

  return {
    toolOutputs: newOutputs,
    lastTool: lastOutput.toolName,
    lastToolSuccess: allSucceeded,
    iterationCount: state.iterationCount + 1,
    retryCount: shouldRetry ? state.retryCount + 1 : 0,
    errorInfo: allSucceeded ? null : lastOutput.errorMessage,
  };
}

/**
 * Evaluate result of tool call
 */
export function evaluateResult(state: SalesAgentStateType): Partial<SalesAgentStateType> {
  if (state.toolOutputs.length === 0) {
    return { lastToolSuccess: true };
  }

  const lastOutput = state.toolOutputs[state.toolOutputs.length - 1];
  
  // Check if tool execution was successful
  const success = lastOutput.success && lastOutput.output !== null;

  return {
    lastToolSuccess: success,
    errorInfo: success ? null : lastOutput.errorMessage || 'Tool execution failed',
  };
}

/**
 * Reflection node - analyze failures and adjust
 */
export async function reflection(state: SalesAgentStateType): Promise<Partial<SalesAgentStateType>> {
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
export function updateTodos(state: SalesAgentStateType): Partial<SalesAgentStateType> {
  const updatedTodos = state.todo.map(todo => {
    // Mark completed todos
    if (todo.status === 'in_progress' && state.lastToolSuccess) {
      return {
        ...todo,
        status: 'completed' as const,
        completedAt: new Date(),
      };
    }
    
    // Mark failed todos
    if (todo.status === 'in_progress' && !state.lastToolSuccess && state.retryCount >= MAX_RETRIES) {
      return {
        ...todo,
        status: 'failed' as const,
        errorMessage: state.errorInfo || undefined,
      };
    }
    
    return todo;
  });

  return {
    todo: updatedTodos,
  };
}

/**
 * Iteration control - decide whether to continue or finalize
 */
export function iterationControl(state: SalesAgentStateType): Partial<SalesAgentStateType> {
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
export async function finalize(state: SalesAgentStateType): Promise<Partial<SalesAgentStateType>> {
  // Check if we have a substantial final response from the AI
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  
  // If last message is an AIMessage with substantial content, we're good
  if (lastMessage && lastMessage._getType() === 'ai') {
    const content = lastMessage.content.toString().trim();
    // Check if content is substantial (not just internal context markers or empty)
    const hasSubstantialContent = content.length > 50 && 
      !content.startsWith('[CONTEXTO INTERNO]') &&
      !content.match(/^[,\s]*$/);
    
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
    
    // Get the original user query
    const firstUserMessage = messages.find(m => m._getType() === 'human');
    const userQuery = firstUserMessage?.content?.toString() || 'consulta del usuario';
    
    // Create finalization prompt
    const finalizationPrompt = new SystemMessage(`${finalizationContext}

CONSULTA ORIGINAL DEL USUARIO:
"${userQuery}"

Genera tu respuesta final ahora. DEBE ser completa, profesional y útil.`);
    
    // Invoke model for final response
    const modelName = state.modelName || "gemini-2.5-flash";
    const model = getGeminiModel(modelName);
    
    console.log('[finalize] Generating final response with model:', modelName);
    
    const response = await model.invoke([finalizationPrompt]);
    
    console.log('[finalize] Final response generated, length:', response.content.toString().length);
    
    // Debug: Log the entire response_metadata to see structure
    if (process.env.NODE_ENV === 'development') {
      console.log('[finalize] Response metadata:', JSON.stringify(response.response_metadata, null, 2));
    }
    
    // Extract token usage from response metadata
    const tokenUsage = extractTokenUsageFromMetadata(response.response_metadata);
    if (tokenUsage) {
      console.log('[finalize] ✓ Token usage captured:', tokenUsage);
      
      // Track usage (non-blocking)
      if (state.userContext?.userId) {
        trackLLMUsage(
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

/**
 * Execute a tool with timeout protection
 */
async function executeToolWithTimeout(
  tool: any,
  toolCall: any,
  timeoutMs: number = 30000 // 30 second default timeout
): Promise<any> {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  const toolPromise = tool.func(toolCall.args);

  try {
    return await Promise.race([toolPromise, timeoutPromise]);
  } catch (error) {
    // If timeout occurred, throw a specific timeout error
    if (error instanceof Error && error.message.includes('timed out')) {
      throw new Error(`Tool "${toolCall.name}" execution timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Manually execute tools (bypass ToolNode to avoid invocation issues)
 * This directly executes tool functions and creates ToolMessages manually
 */
export async function callTools(state: SalesAgentStateType): Promise<Partial<SalesAgentStateType>> {
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
    
    console.log('[callTools] Executing', toolCalls.length, 'tool(s) with timeout protection');
    
    // Import all tools
    const { companyTools } = await import("@/lib/tools/company-tools");
    const { webSearchTool, webExtractTool } = await import("@/lib/tools/web-search");
    const { enrichCompanyContactsTool } = await import("@/lib/tools/contact-tools");
    const { offeringTools } = await import("@/lib/tools/offerings-tools");
    
    const allTools = [
      ...companyTools,
      webSearchTool,
      webExtractTool,
      enrichCompanyContactsTool,
      ...offeringTools,
    ];
    
    // Create a map of tool names to tool functions
    const toolMap = new Map(allTools.map(tool => [tool.name, tool]));
    
    // Execute all tool calls in parallel to prevent blocking
    const { ToolMessage } = await import("@langchain/core/messages");

    // Prepare tool execution promises
    const toolExecutionPromises = toolCalls.map(async (toolCall) => {
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
        });
      }

      try {
        console.log('[callTools] Executing tool:', toolCall.name);
        console.log('[callTools] Tool args:', JSON.stringify(toolCall.args, null, 2));
        console.log('[callTools] Tool object:', { name: tool.name, hasFunc: !!tool.func });

        // Execute the tool function with timeout protection
        const toolResult = await executeToolWithTimeout(tool, toolCall, 30000); // 30 second timeout

        console.log('[callTools] Tool', toolCall.name, 'executed successfully');
        console.log('[callTools] Tool result type:', typeof toolResult);
        console.log('[callTools] Tool result success:', toolResult?.success);

        // Create ToolMessage with the result
        return new ToolMessage({
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id,
        });

      } catch (error) {
        console.error('[callTools] Error executing tool:', toolCall.name);
        console.error('[callTools] Error details:', error);
        console.error('[callTools] Error stack:', error instanceof Error ? error.stack : 'No stack');

        // Create error ToolMessage for timeout or other errors
        return new ToolMessage({
          content: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timeout: error instanceof Error && error.message.includes('timed out'),
          }),
          tool_call_id: toolCall.id,
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
 * Routing functions for conditional edges
 */

export function shouldCallTools(state: SalesAgentStateType): string {
  // Check iteration limit first
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
    retryCount: state.retryCount,
    hasError: !!state.errorInfo,
  });
  
  // Check if this is an AIMessage with tool_calls
  if (messageType === 'ai' && hasToolCalls) {
    console.log('[shouldCallTools] Routing to tools');
    return 'tools';
  }
  
  // Otherwise, we're done thinking and should finalize
  console.log('[shouldCallTools] No tool calls, finalizing');
  return 'finalize';
}

export function shouldContinue(state: SalesAgentStateType): string {
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

export function shouldRetry(state: SalesAgentStateType): string {
  if (state.lastToolSuccess) {
    return 'update_todos';
  }

  if (state.retryCount >= MAX_RETRIES) {
    return 'update_todos'; // Give up and move on
  }

  return 'reflection';
}

