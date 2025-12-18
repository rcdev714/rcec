import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { getEnterpriseAgentGraph } from "./graph";
import { EnterpriseAgentStateType, AgentStateEvent, EmailDraft, MAX_RETRIES } from "./state";
import { getLangChainTracer, flushLangsmith, langsmithEnabled } from "@/lib/langsmith";
import { optimizeConversationHistory, getMessageType } from "./context-optimizer";
import { AgentRecoveryManager } from "./recovery";
import { AgentSettings } from "@/lib/types/agent-settings";

// Shared TextEncoder for performance (avoid creating new instances)
const sharedEncoder = new TextEncoder();

/**
 * Helper function to emit state events to the stream
 * Uses shared encoder for better performance
 */
function emitStateEvent(controller: ReadableStreamDefaultController, event: AgentStateEvent) {
  const eventTag = `[STATE_EVENT]${JSON.stringify(event)}[/STATE_EVENT]\n`;
  controller.enqueue(sharedEncoder.encode(eventTag));
}

/**
 * Helper to stream content in optimized chunks
 * Improves perceived performance by sending content progressively
 */
function streamContent(controller: ReadableStreamDefaultController, content: string) {
  // For short content, send immediately
  if (content.length < 500) {
    controller.enqueue(sharedEncoder.encode(content + '\n'));
    return;
  }
  
  // For longer content, chunk by sentences/paragraphs for progressive rendering
  // This improves perceived performance as users see content appear gradually
  const chunks = content.split(/(?<=[.!?\n])\s+/);
  let buffer = '';
  
  for (const chunk of chunks) {
    buffer += chunk + ' ';
    // Send when buffer reaches optimal size (~200 chars)
    if (buffer.length >= 200) {
      controller.enqueue(sharedEncoder.encode(buffer));
      buffer = '';
    }
  }
  
  // Send remaining content
  if (buffer.trim()) {
    controller.enqueue(sharedEncoder.encode(buffer + '\n'));
  }
}

/**
 * Chat with the Enterprise Agent using LangGraph
 * 
 * This function:
 * 1. Initializes the agent graph with checkpointing
 * 2. Streams the agent's execution with real-time state events
 * 3. Returns a ReadableStream for real-time UI updates
 * 
 * @param message - User's message
 * @param conversationHistory - Previous messages in the conversation
 * @param options - Configuration options (userId, conversationId, etc.)
 * @returns ReadableStream of agent responses and state events
 */
export async function chatWithEnterpriseAgent(
  message: string,
  conversationHistory: BaseMessage[] = [],
  options?: {
    userId?: string;
    conversationId?: string;
    projectName?: string;
    runName?: string;
    modelName?: string;
    thinkingLevel?: 'high' | 'low';
    agentSettings?: AgentSettings;
  }
): Promise<ReadableStream> {
  const userMessage = new HumanMessage(message);

  // OPTIMIZATION: Compress long conversation histories to reduce token usage
  // This is critical for B2C production where conversations can be lengthy
  let optimizedHistory = conversationHistory;
  if (conversationHistory.length > 8) {
    console.log(`[chatWithEnterpriseAgent] Optimizing conversation history: ${conversationHistory.length} messages`);
    optimizedHistory = optimizeConversationHistory(conversationHistory, {
      maxMessages: 10,
      preserveRecentMessages: 4,
    });
    console.log(`[chatWithEnterpriseAgent] Optimized to: ${optimizedHistory.length} messages`);
  }

  // Prepare initial state
  const initialMessages = [...optimizedHistory, userMessage];

  // Extract user query for recovery
  const userQuery = message;
  
  // Create a readable stream to return results
  const stream = new ReadableStream({
    async start(controller) {
      // Initialize recovery manager for guaranteed response
      const recovery = new AgentRecoveryManager(userQuery);
      
      try {
        const graph = getEnterpriseAgentGraph();

        // Configure with thread_id for checkpointing and LangSmith tracing
        const tracer = langsmithEnabled ? getLangChainTracer(options?.projectName) : undefined;
        const config = {
          configurable: {
            thread_id: options?.conversationId || options?.userId || 'default',
            checkpoint_ns: '',
          },
          callbacks: tracer ? [tracer] : undefined,
          tags: ["enterprise-agent", "langgraph"],
          metadata: {
            userId: options?.userId,
            conversationId: options?.conversationId,
          },
          runName: options?.runName || "Sales Agent Chat",
        };

        // Stream the graph execution
        let finalResponse = '';
        const searchResults: unknown[] = []; // Changed to array to accumulate ALL search results
        let latestDisplayConfig: unknown = null; // NEW: Track display config from tool results
        let emailDraft: EmailDraft | null = null;
        let previousState: EnterpriseAgentStateType | null = null;
        let currentNode: string | null = null;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalTokens = 0;

        // Invoke the graph with streaming
        // Initialize with fresh state (no checkpointing = no state pollution)
        const streamResult = await graph.stream(
          {
            messages: initialMessages,
            // Explicitly initialize counters to avoid undefined issues
            iterationCount: 0,
            retryCount: 0,
            todo: [],
            toolOutputs: [],
            modelName: options?.modelName || "gemini-2.5-flash",
            thinkingLevel: options?.thinkingLevel || 'high',
            agentSettings: options?.agentSettings,
            // CRITICAL: Set start time for time-based circuit breaker
            startTime: new Date(),
          },
          {
            ...config,
            streamMode: "updates" as const, // Changed to "updates" to track node execution
            recursionLimit: 100, // High limit for complex multi-tool workflows (time-based circuit breaker will stop earlier if needed)
          }
        );

        // Track which tool results we've already emitted to avoid duplicates
        const emittedToolResultIds = new Set<string>();

        // Process stream
        for await (const update of streamResult) {
          // update is a dict with node name as key
          const nodeName = Object.keys(update)[0];
          const nodeOutput = update[nodeName] as Partial<EnterpriseAgentStateType>;
          
          // Emit thinking event when entering a new node
          if (nodeName && nodeName !== currentNode) {
            currentNode = nodeName;
            
            // Update recovery checkpoint with current phase
            const phaseMap: Record<string, 'init' | 'planning' | 'thinking' | 'tools' | 'processing' | 'finalizing'> = {
              'load_user_context': 'init',
              'plan_todos': 'planning',
              'think': 'thinking',
              'tools': 'tools',
              'process_tool_results': 'processing',
              'finalize': 'finalizing',
            };
            recovery.updatePhase(phaseMap[nodeName] || 'thinking', nodeName);
            
            // Map node names to user-friendly messages
            const nodeMessages: Record<string, string> = {
              'load_user_context': 'Cargando tu contexto de usuario...',
              'plan_todos': 'Planificando tareas para tu consulta...',
              'think': 'Analizando tu consulta y decidiendo qué hacer...',
              'tools': 'Ejecutando herramientas...',
              'process_tool_results': 'Procesando resultados de herramientas...',
              'evaluate_result': 'Evaluando resultados de la herramienta...',
              'reflection': 'Reflexionando sobre el error y ajustando estrategia...',
              'update_todos': 'Actualizando lista de tareas...',
              'iteration_control': 'Verificando progreso...',
              'finalize': 'Finalizando respuesta...',
            };
            
            emitStateEvent(controller, {
              type: 'thinking',
              node: nodeName,
              message: nodeMessages[nodeName] || `Procesando: ${nodeName}`,
            });
          }

          // Track tool calls from think node (when AI decides to call a tool)
          // Use getMessageType() for safe type detection that handles serialized checkpoint messages
          if (nodeName === 'think' && nodeOutput.messages && nodeOutput.messages.length > 0) {
            const lastMsg = nodeOutput.messages[nodeOutput.messages.length - 1];
            if (getMessageType(lastMsg) === 'ai' && 'tool_calls' in lastMsg && Array.isArray((lastMsg as any).tool_calls)) {
              const toolCalls = (lastMsg as any).tool_calls;
              if (toolCalls.length > 0) {
                toolCalls.forEach((tc: any) => {
                  emitStateEvent(controller, {
                    type: 'tool_call',
                    toolName: tc.name,
                    toolCallId: tc.id,
                    input: tc.args || {},
                  });
                });
              }
            }
          }

          // Track tool results from processToolResults node (emit all new ones)
          if (nodeName === 'process_tool_results' && nodeOutput.toolOutputs) {
            for (const out of nodeOutput.toolOutputs) {
              const id = (out as any).toolCallId || 'unknown';
              if (emittedToolResultIds.has(id)) continue;
              emittedToolResultIds.add(id);
              
              // Record in recovery manager for potential recovery
              recovery.recordToolCompletion((out as any).toolName, out as any);

              emitStateEvent(controller, {
                type: 'tool_result',
                toolName: (out as any).toolName,
                toolCallId: id,
                success: !!(out as any).success,
                output: (out as any).success ? (out as any).output : undefined,
                error: (out as any).success ? undefined : (out as any).errorMessage,
              });
            }

            // Emit reflection event once if the last output failed and we're retrying
            const lastToolOutput = nodeOutput.toolOutputs[nodeOutput.toolOutputs.length - 1] as any;
            const currentRetryCount = nodeOutput.retryCount || 0;
            if (lastToolOutput && !lastToolOutput.success && currentRetryCount > 0 && currentRetryCount < MAX_RETRIES) {
              emitStateEvent(controller, {
                type: 'reflection',
                message: `La herramienta "${lastToolOutput.toolName}" falló. Ajustando estrategia... (Intento ${currentRetryCount} de ${MAX_RETRIES})`,
                retryCount: currentRetryCount,
              });
            }
          }

          // Track reflection
          if (nodeName === 'reflection' && nodeOutput.retryCount !== undefined) {
            emitStateEvent(controller, {
              type: 'reflection',
              message: `Intento ${nodeOutput.retryCount} de reintentar la acción...`,
              retryCount: nodeOutput.retryCount,
            });
          }

          // Track todo planning and updates - emit as a special message
          if ((nodeName === 'plan_todos' || nodeName === 'update_todos') && nodeOutput.todo && nodeOutput.todo.length > 0) {
            // Update recovery manager with todos
            recovery.updateTodos(nodeOutput.todo);
            
            // Send todos as a structured tag so UI can render them
            const todosTag = `\n\n[AGENT_PLAN]${JSON.stringify(nodeOutput.todo)}[/AGENT_PLAN]\n\n`;
            controller.enqueue(sharedEncoder.encode(todosTag));
            
            emitStateEvent(controller, {
              type: 'todo_update',
              todos: nodeOutput.todo,
            });
          }

          // Track iterations
          if (nodeName === 'iteration_control' && nodeOutput.iterationCount !== undefined) {
            emitStateEvent(controller, {
              type: 'iteration',
              count: nodeOutput.iterationCount,
              max: 15, // MAX_ITERATIONS
            });
          }

          // Track errors
          if (nodeOutput.errorInfo) {
            emitStateEvent(controller, {
              type: 'error',
              node: nodeName,
              error: nodeOutput.errorInfo,
            });
            
            // Also emit error as visible text content so user can see it
            const errorText = `⚠️ Error: ${nodeOutput.errorInfo}\n\n`;
            controller.enqueue(sharedEncoder.encode(errorText));
            finalResponse += errorText;
          }

          // Get the last message if it's from the AI
          if (nodeOutput.messages && nodeOutput.messages.length > 0) {
            const lastMessage = nodeOutput.messages[nodeOutput.messages.length - 1];
            
            // Robust type guard for AI messages (handles both instances and serialized objects)
            // Use centralized getMessageType() for consistent type detection
            const isAIMessage = getMessageType(lastMessage) === 'ai';
            
            if (isAIMessage) {
              let content = '';
              
              // Robust content extraction (cast if needed for content array)
              const msgAsAny = lastMessage as any;
              if (typeof msgAsAny.content === 'string') {
                content = msgAsAny.content;
              } else if (Array.isArray(msgAsAny.content)) {
                // Handle content parts (e.g., [{type: 'text', text: '...'}])
                content = msgAsAny.content
                  .map((part: Record<string, unknown>) => {
                    if (part && typeof part === 'object' && 'text' in part) {
                      return (part as { text?: string }).text || '';
                    }
                    return String(part);
                  })
                  .join('');
              } else if (msgAsAny.content !== null && msgAsAny.content !== undefined) {
                content = String(msgAsAny.content);
              }
              
              // Filter out artifacts: [object Object], tool transcripts, internal JSON
              if (content) {
                // Remove [object Object]
                if (content.includes('[object Object]')) {
                  console.log('[stream] Filtering out [object Object] artifacts from response');
                  content = content.replace(/\[object Object\],?/g, '').trim();
                }
                // Remove Gemini internal JSON (functionCall, thoughtSignature)
                if (content.includes('"functionCall"') || content.includes('"thoughtSignature"')) {
                  console.log('[stream] Filtering out internal Gemini JSON');
                  content = content.replace(/\[\s*\{[^]*?"(?:functionCall|thoughtSignature)"[^]*?\}\s*\]/g, '');
                }
                // Remove any tool transcript lines
                content = content
                  .replace(/^Herramienta utilizada:[\s\S]*?(?=\n\n|$)/gmi, '')
                  .replace(/^Parámetros:[\s\S]*?(?=\n\n|$)/gmi, '')
                  .replace(/\[CALL:[^\]]*\][^\n]*\n?/g, '')
                  // Remove any inlined structured tags accidentally echoed
                  .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, '')
                  .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, '')
                  .trim();
                // If content is only commas/whitespace or too short, skip
                // Reduced min length from 5 to 2 to allow short confirmations like "Ok." or "Si."
                if (!content || content.match(/^[,\s]*$/) || content.length < 2) {
                  content = '';
                }
              }
              
              // Only send new content (avoid duplicates), but emit if nothing has been sent yet
              const hasEmittedBefore = finalResponse.length > 0;
              if (content && (!hasEmittedBefore || content !== finalResponse) && !content.startsWith('[CONTEXTO INTERNO]')) {
                finalResponse = content;
                
                // Update recovery manager with partial response
                recovery.updatePartialResponse(content);
                
                // Stream the content with optimized chunking for progressive rendering
                streamContent(controller, content);
              }
            }
          }

          // Check for search results in tool outputs - ACCUMULATE all search results
          if (nodeOutput.toolOutputs && nodeOutput.toolOutputs.length > 0) {
            const lastToolOutput = nodeOutput.toolOutputs[nodeOutput.toolOutputs.length - 1];
            
            if (lastToolOutput.toolName === 'search_companies' && lastToolOutput.success) {
              const toolOutput = lastToolOutput.output as { result?: unknown; displayConfig?: unknown };
              const result = toolOutput?.result;
              if (result) {
                searchResults.push(result); // Accumulate instead of overwrite
              }
              // NEW: Capture display config
              if (toolOutput?.displayConfig) {
                latestDisplayConfig = toolOutput.displayConfig;
              }
            }
            
            // Also capture displayConfig from get_company_details
            if (lastToolOutput.toolName === 'get_company_details' && lastToolOutput.success) {
              const toolOutput = lastToolOutput.output as { displayConfig?: unknown };
              if (toolOutput?.displayConfig) {
                latestDisplayConfig = toolOutput.displayConfig;
              }
            }
          }

          // Check for email draft
          if (nodeOutput.emailDraft) {
            emailDraft = nodeOutput.emailDraft;
          }

          // Track token usage
          if (nodeOutput.totalInputTokens) {
            totalInputTokens += nodeOutput.totalInputTokens;
          }
          if (nodeOutput.totalOutputTokens) {
            totalOutputTokens += nodeOutput.totalOutputTokens;
          }
          if (nodeOutput.totalTokens) {
            totalTokens += nodeOutput.totalTokens;
          }

          previousState = { ...previousState, ...nodeOutput } as EnterpriseAgentStateType;
        }

        // End-of-stream fallback: Ensure some assistant text was emitted
        if (finalResponse.trim() === '') {
          console.log('[stream] No text emitted during loop, applying fallback');
          
          // RECOVERY: First try to generate from recovery manager (uses tool outputs)
          const checkpoint = recovery.getCheckpoint();
          if (checkpoint.completedTools.length > 0 || checkpoint.toolOutputs.length > 0) {
            console.log('[stream] Using recovery manager to generate response from tool outputs');
            const recoveryResponse = recovery.generateRecoveryResponse();
            finalResponse = recoveryResponse;
            controller.enqueue(sharedEncoder.encode(recoveryResponse + '\n'));
            console.log('[stream] Fallback: Generated recovery response from tool outputs');
          } else {
            // Try to extract from final state messages
            let fallbackContent = '';
            if (previousState && previousState.messages && previousState.messages.length > 0) {
              // Find last AI-like message
              // Use centralized getMessageType() for consistent type detection
              for (let i = previousState.messages.length - 1; i >= 0; i--) {
                const msg = previousState.messages[i];
                const isFallbackAIMessage = getMessageType(msg) === 'ai';
                
                if (isFallbackAIMessage) {
                  const msgAsAny = msg as any;
                  let content = '';
                  if (typeof msgAsAny.content === 'string') {
                    content = msgAsAny.content;
                  } else if (Array.isArray(msgAsAny.content)) {
                    content = msgAsAny.content
                      .map((part: Record<string, unknown>) => {
                        if (part && typeof part === 'object' && 'text' in part) {
                          return (part as { text?: string }).text || '';
                        }
                        return String(part);
                      })
                      .join('');
                  } else if (msgAsAny.content !== null && msgAsAny.content !== undefined) {
                    content = String(msgAsAny.content);
                  }
                  
                  // Apply same filtering
                  if (content) {
                    // Remove Gemini internal JSON
                    if (content.includes('"functionCall"') || content.includes('"thoughtSignature"')) {
                      content = content.replace(/\[\s*\{[^]*?"(?:functionCall|thoughtSignature)"[^]*?\}\s*\]/g, '');
                    }
                    content = content
                      .replace(/\[object Object\],?/g, '').trim()
                      .replace(/^Herramienta utilizada:[\s\S]*?(?=\n\n|$)/gmi, '')
                      .replace(/^Parámetros:[\s\S]*?(?=\n\n|$)/gmi, '')
                      .replace(/\[CALL:[^\]]*\][^\n]*\n?/g, '')
                      .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, '')
                      .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, '')
                      .trim();
                    
                    // Reduced min length to 2 to match stream logic
                    if (content && !content.match(/^[,\s]*$/) && content.length >= 2 && !content.startsWith('[CONTEXTO INTERNO]')) {
                      fallbackContent = content;
                      break;
                    }
                  }
                }
              }
            }
            
            if (fallbackContent) {
              finalResponse = fallbackContent;
              controller.enqueue(sharedEncoder.encode(fallbackContent + '\n'));
              console.log('[stream] Fallback: Emitted extracted content from state');
            } else {
              // Ultimate fallback - use recovery manager
              const ultimateFallback = recovery.generateRecoveryResponse();
              finalResponse = ultimateFallback;
              controller.enqueue(sharedEncoder.encode(ultimateFallback + '\n'));
              console.log('[stream] Fallback: Emitted recovery manager fallback');
            }
          }
        } else {
          console.log('[stream] Text emitted successfully during loop');
        }
        
        // Cleanup recovery manager
        recovery.cleanup();

        // Emit finalize event
        emitStateEvent(controller, {
          type: 'finalize',
          message: 'Respuesta completada',
        });
        
        // Log final token usage
        if (totalTokens > 0) {
          console.log('[Sales Agent] Total token usage:', {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalTokens,
          });
        }

        // Append ALL search results if available (use the last one for primary display, but include all)
        if (searchResults.length > 0) {
          // Use the most specific/refined search result (usually the last one)
          const primaryResult = searchResults[searchResults.length - 1];
          const searchResultTag = `\n\n[SEARCH_RESULTS]${JSON.stringify(primaryResult)}[/SEARCH_RESULTS]`;
          controller.enqueue(sharedEncoder.encode(searchResultTag));
          
          // NEW: Include display config for smart rendering
          if (latestDisplayConfig) {
            const displayConfigTag = `\n\n[DISPLAY_CONFIG]${JSON.stringify(latestDisplayConfig)}[/DISPLAY_CONFIG]`;
            controller.enqueue(sharedEncoder.encode(displayConfigTag));
          }
        }

        // Append email draft if available
        if (emailDraft) {
          const emailDraftTag = `\n\n[EMAIL_DRAFT]${JSON.stringify(emailDraft)}[/EMAIL_DRAFT]`;
          controller.enqueue(sharedEncoder.encode(emailDraftTag));
        }

        // Append token usage if available
        if (totalTokens > 0) {
          const tokenUsageTag = `\n\n[TOKEN_USAGE]${JSON.stringify({
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalTokens,
          })}[/TOKEN_USAGE]`;
          controller.enqueue(sharedEncoder.encode(tokenUsageTag));
        }

        // Flush LangSmith traces before closing
        if (langsmithEnabled) {
          await flushLangsmith();
        }

        controller.close();
      } catch (error) {
        console.error('Error in Sales Agent chat:', error);

        // Emit error event
        emitStateEvent(controller, {
          type: 'error',
          node: 'system',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Detailed error logging
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });

        // Add error to recovery manager
        recovery.addWarning(error instanceof Error ? error.message : 'Error desconocido');

        // RECOVERY: Try to generate a useful response from what we have
        const checkpoint = recovery.getCheckpoint();
        const hasPartialWork = checkpoint.completedTools.length > 0 || checkpoint.partialResponse.length > 50;
        
        if (hasPartialWork) {
          // We have partial work - generate recovery response
          console.log('[Recovery] Generating response from partial work...');
          const recoveryResponse = recovery.generateRecoveryResponse();
          controller.enqueue(sharedEncoder.encode(recoveryResponse));
        } else {
          // No partial work - show user-friendly error
          let errorMessage = 'Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo.';

          if (error instanceof Error) {
            if (error.message.includes('GOOGLE_API_KEY') || error.message.includes('API key')) {
              errorMessage = 'Error de configuración: La clave API de Google no está configurada correctamente o es inválida.';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'La solicitud tardó demasiado tiempo. Por favor, intenta con una consulta más simple.';
            } else if (error.message.includes('rate limit') || error.message.includes('Too Many Requests') || error.message.includes('quota')) {
              errorMessage = 'Has excedido el límite de consultas de la API de Google. Por favor, espera o verifica tu configuración.';
            } else if (error.message.includes('429')) {
              errorMessage = 'Límite de consultas alcanzado. Intenta de nuevo más tarde.';
            } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
              errorMessage = 'La clave API de Google no tiene los permisos necesarios. Verifica tu configuración en Google Cloud Console.';
            } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
              errorMessage = 'La clave API de Google es inválida o ha expirado. Por favor, verifica tu configuración.';
            } else {
              // Include the actual error message for debugging
              errorMessage = `Error: ${error.message}`;
            }
          }

          controller.enqueue(sharedEncoder.encode(errorMessage));
        }
        
        // Cleanup recovery manager
        recovery.cleanup();
        controller.close();
      }
    },
  });

  return stream;
}

// Export the graph for direct access if needed
export { getEnterpriseAgentGraph, getSalesAgentGraph } from "./graph";
export { EnterpriseAgentState, SalesAgentState } from "./state";
export type { EnterpriseAgentStateType, SalesAgentStateType } from "./state";

// Backwards compatibility alias
export const chatWithSalesAgent = chatWithEnterpriseAgent;

