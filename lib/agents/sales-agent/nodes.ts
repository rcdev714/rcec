import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SalesAgentStateType, TodoItem, MAX_ITERATIONS, MAX_RETRIES, ToolOutput } from "./state";
import { SALES_AGENT_SYSTEM_PROMPT } from "./prompt";
import { createClient } from "@/lib/supabase/server";
import { UserOffering } from "@/types/user-offering";

// Initialize Gemini models (lazy, cached per model name)
const geminiModels: Record<string, ChatGoogleGenerativeAI> = {};

function getGeminiModel(modelName: string = "gemini-2.5-flash"): ChatGoogleGenerativeAI {
  // Always recreate in development to pick up config changes
  if (process.env.NODE_ENV === 'development') {
    delete geminiModels[modelName];
  }
  
  if (!geminiModels[modelName]) {
    console.log('[getGeminiModel] Initializing model:', modelName);
    
    geminiModels[modelName] = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY || '',
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

    // Fetch usage
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(1);
    currentPeriodStart.setHours(0, 0, 0, 0);

    const { data: usage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_start', currentPeriodStart.toISOString())
      .single();

    // Define limits based on plan
    const plan = subscription?.plan || 'FREE';
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
    
    const allTools = [
      ...companyTools,
      webSearchTool,
      webExtractTool,
      enrichCompanyContactsTool,
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
      if (state.userContext.offerings.length > 0) {
        contextParts.push(`Offerings disponibles: ${state.userContext.offerings.length}`);
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

    // Return the full AI message (which may include tool calls)
    return {
      messages: [response],
      lastUpdateTime: new Date(),
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
  // Find the last ToolMessage in the messages array
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  
  console.log('[processToolResults] Processing, last message type:', lastMessage?._getType());
  
  // Check if the last message is a ToolMessage
  if (lastMessage && 'tool_call_id' in lastMessage) {
    try {
      // Extract tool call info from the AIMessage before the ToolMessage
      let toolName = 'unknown_tool';
      let toolInput: Record<string, unknown> = {};
      
      // Look for the AIMessage with tool_calls that triggered this ToolMessage
      for (let i = messages.length - 2; i >= 0; i--) {
        const msg = messages[i];
        if (msg._getType() === 'ai' && 'tool_calls' in msg && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
          const toolCall = msg.tool_calls.find((tc: { id?: string }) => tc.id === lastMessage.tool_call_id);
          if (toolCall && 'name' in toolCall && 'args' in toolCall) {
            toolName = toolCall.name as string;
            toolInput = toolCall.args as Record<string, unknown>;
          }
          break;
        }
      }
      
      console.log('[processToolResults] Tool executed:', toolName);
      
      // Parse the tool result
      const toolContent = lastMessage.content;
      let toolOutput: unknown;
      let success = true;
      let errorMessage: string | undefined;
      
      try {
        // Try to parse as JSON if it's a string
        if (typeof toolContent === 'string') {
          toolOutput = JSON.parse(toolContent);
          // Check if the tool returned a success flag
          if (typeof toolOutput === 'object' && toolOutput !== null && 'success' in toolOutput) {
            success = (toolOutput as { success: boolean }).success;
            if (!success && 'error' in toolOutput) {
              errorMessage = String((toolOutput as { error: unknown }).error);
            }
          }
        } else {
          toolOutput = toolContent;
        }
      } catch {
        // If parsing fails, use the content as-is
        toolOutput = toolContent;
      }
      
      console.log('[processToolResults] Tool success:', success);
      
      // Create a new ToolOutput entry
      const newToolOutput: ToolOutput = {
        toolName,
        input: toolInput,
        output: toolOutput,
        success,
        timestamp: new Date(),
        errorMessage,
      };
      
      // If tool failed and we haven't hit retry limit, increment retry counter
      const shouldRetry = !success && state.retryCount < MAX_RETRIES;
      
      return {
        toolOutputs: [newToolOutput],
        lastTool: toolName,
        lastToolSuccess: success,
        iterationCount: state.iterationCount + 1,
        retryCount: shouldRetry ? state.retryCount + 1 : 0, // Increment retry or reset on success
        errorInfo: success ? null : errorMessage,
      };
    } catch (error) {
      console.error('[processToolResults] Error processing tool results:', error);
      return {
        toolOutputs: [{
          toolName: 'unknown_tool',
          input: {},
          output: null,
          success: false,
          timestamp: new Date(),
          errorMessage: `Failed to process tool result: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
        lastToolSuccess: false,
        errorInfo: `Failed to process tool result: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
  
  // If no ToolMessage found (e.g., tool execution failed before creating ToolMessage)
  console.log('[processToolResults] No ToolMessage found - tool may have failed');
  
  // Check if there's an error from callTools
  if (state.errorInfo) {
    return {
      lastToolSuccess: false,
      retryCount: state.retryCount + 1,
    };
  }
  
  return {};
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
 */
export function finalize(_state: SalesAgentStateType): Partial<SalesAgentStateType> {
  // The final AI message should already be in state.messages
  // Just mark completion
  return {
    lastUpdateTime: new Date(),
  };
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
    
    console.log('[callTools] Executing', toolCalls.length, 'tool(s)');
    
    // Import all tools
    const { companyTools } = await import("@/lib/tools/company-tools");
    const { webSearchTool, webExtractTool } = await import("@/lib/tools/web-search");
    const { enrichCompanyContactsTool } = await import("@/lib/tools/contact-tools");
    
    const allTools = [
      ...companyTools,
      webSearchTool,
      webExtractTool,
      enrichCompanyContactsTool,
    ];
    
    // Create a map of tool names to tool functions
    const toolMap = new Map(allTools.map(tool => [tool.name, tool]));
    
    // Execute each tool call and create ToolMessages
    const { ToolMessage } = await import("@langchain/core/messages");
    const newMessages = [];
    
    for (const toolCall of toolCalls) {
      const tool = toolMap.get(toolCall.name);
      
      if (!tool) {
        console.error('[callTools] Tool not found:', toolCall.name);
        // Create error ToolMessage
        newMessages.push(new ToolMessage({
          content: JSON.stringify({
            success: false,
            error: `Tool "${toolCall.name}" not found`,
          }),
          tool_call_id: toolCall.id,
        }));
        continue;
      }
      
      try {
        console.log('[callTools] Executing tool:', toolCall.name);
        console.log('[callTools] Tool args:', JSON.stringify(toolCall.args, null, 2));
        console.log('[callTools] Tool object:', { name: tool.name, hasFunc: !!tool.func });
        
        // Execute the tool function
        const toolResult = await tool.func(toolCall.args);
        
        console.log('[callTools] Tool', toolCall.name, 'executed successfully');
        console.log('[callTools] Tool result type:', typeof toolResult);
        console.log('[callTools] Tool result success:', toolResult?.success);
        
        // Create ToolMessage with the result
        newMessages.push(new ToolMessage({
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id,
        }));
        
      } catch (error) {
        console.error('[callTools] Error executing tool:', toolCall.name);
        console.error('[callTools] Error details:', error);
        console.error('[callTools] Error stack:', error instanceof Error ? error.stack : 'No stack');
        
        // Create error ToolMessage
        newMessages.push(new ToolMessage({
          content: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          }),
          tool_call_id: toolCall.id,
        }));
      }
    }
    
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

