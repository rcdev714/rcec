import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { getSalesAgentGraph } from "./graph";
import { SalesAgentStateType, AgentStateEvent, EmailDraft, MAX_RETRIES } from "./state";
import { getLangChainTracer, flushLangsmith, langsmithEnabled } from "@/lib/langsmith";

/**
 * Helper function to emit state events to the stream
 */
function emitStateEvent(controller: ReadableStreamDefaultController, event: AgentStateEvent) {
  const eventTag = `[STATE_EVENT]${JSON.stringify(event)}[/STATE_EVENT]\n`;
  controller.enqueue(new TextEncoder().encode(eventTag));
}

/**
 * Chat with the Sales Agent using LangGraph
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
export async function chatWithSalesAgent(
  message: string,
  conversationHistory: BaseMessage[] = [],
  options?: {
    userId?: string;
    conversationId?: string;
    projectName?: string;
    runName?: string;
    modelName?: string;
    thinkingLevel?: 'high' | 'low';
  }
): Promise<ReadableStream> {
  const userMessage = new HumanMessage(message);

  // Prepare initial state
  const initialMessages = [...conversationHistory, userMessage];

  // Create a readable stream to return results
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const graph = getSalesAgentGraph();

        // Configure with thread_id for checkpointing and LangSmith tracing
        const tracer = langsmithEnabled ? getLangChainTracer(options?.projectName) : undefined;
        const config = {
          configurable: {
            thread_id: options?.conversationId || options?.userId || 'default',
            checkpoint_ns: '',
          },
          callbacks: tracer ? [tracer] : undefined,
          tags: ["sales-agent", "langgraph"],
          metadata: {
            userId: options?.userId,
            conversationId: options?.conversationId,
          },
          runName: options?.runName || "Sales Agent Chat",
        };

        // Stream the graph execution
        let finalResponse = '';
        const searchResults: unknown[] = []; // Changed to array to accumulate ALL search results
        let emailDraft: EmailDraft | null = null;
        let previousState: SalesAgentStateType | null = null;
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
          },
          {
            ...config,
            streamMode: "updates" as const, // Changed to "updates" to track node execution
            recursionLimit: 50, // Increased from default 25 to handle complex workflows
          }
        );

        // Track which tool results we've already emitted to avoid duplicates
        const emittedToolResultIds = new Set<string>();

        // Process stream
        for await (const update of streamResult) {
          // update is a dict with node name as key
          const nodeName = Object.keys(update)[0];
          const nodeOutput = update[nodeName] as Partial<SalesAgentStateType>;
          
          // Emit thinking event when entering a new node
          if (nodeName && nodeName !== currentNode) {
            currentNode = nodeName;
            
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
          if (nodeName === 'think' && nodeOutput.messages && nodeOutput.messages.length > 0) {
            const lastMsg = nodeOutput.messages[nodeOutput.messages.length - 1];
            if (lastMsg._getType() === 'ai' && 'tool_calls' in lastMsg && Array.isArray((lastMsg as any).tool_calls)) {
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
            // Send todos as a structured tag so UI can render them
            const todosTag = `\n\n[AGENT_PLAN]${JSON.stringify(nodeOutput.todo)}[/AGENT_PLAN]\n\n`;
            controller.enqueue(new TextEncoder().encode(todosTag));
            
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
            controller.enqueue(new TextEncoder().encode(errorText));
            finalResponse += errorText;
          }

          // Get the last message if it's from the AI
          if (nodeOutput.messages && nodeOutput.messages.length > 0) {
            const lastMessage = nodeOutput.messages[nodeOutput.messages.length - 1];
            
            // Robust type guard for AI messages (handles both instances and serialized objects)
            const isAIMessage = (() => {
              if (lastMessage && typeof lastMessage === 'object') {
                // Check for LangChain message methods/properties
                if (typeof lastMessage._getType === 'function' && lastMessage._getType() === 'ai') {
                  return true;
                }
                // Check for serialized properties (cast to any to access role/type)
                const msgAsAny = lastMessage as any;
                if (msgAsAny.type === 'ai' || msgAsAny.role === 'assistant') {
                  if (!(lastMessage instanceof AIMessage)) {
                    console.log('[stream] Detected serialized AI message (non-instance)');
                  }
                  return true;
                }
              }
              return false;
            })();
            
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
              
              // Filter out artifacts: [object Object], tool transcripts, and AGENT_PLAN snippets
              if (content) {
                // Remove [object Object]
                if (content.includes('[object Object]')) {
                  console.log('[stream] Filtering out [object Object] artifacts from response');
                  content = content.replace(/\[object Object\],?/g, '').trim();
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
                
                // Stream the content
                controller.enqueue(new TextEncoder().encode(content + '\n'));  // Add newline for better chunking
              }
            }
          }

          // Check for search results in tool outputs - ACCUMULATE all search results
          if (nodeOutput.toolOutputs && nodeOutput.toolOutputs.length > 0) {
            const lastToolOutput = nodeOutput.toolOutputs[nodeOutput.toolOutputs.length - 1];
            
            if (lastToolOutput.toolName === 'search_companies' && lastToolOutput.success) {
              const result = (lastToolOutput.output as { result?: unknown })?.result;
              if (result) {
                searchResults.push(result); // Accumulate instead of overwrite
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

          previousState = { ...previousState, ...nodeOutput } as SalesAgentStateType;
        }

        // End-of-stream fallback: Ensure some assistant text was emitted
        if (finalResponse.trim() === '') {
          console.log('[stream] No text emitted during loop, applying fallback');
          
          // Try to extract from final state messages
          let fallbackContent = '';
          if (previousState && previousState.messages && previousState.messages.length > 0) {
            // Find last AI-like message
            for (let i = previousState.messages.length - 1; i >= 0; i--) {
              const msg = previousState.messages[i];
              const isFallbackAIMessage = (() => {
                if (msg && typeof msg === 'object') {
                  if (typeof msg._getType === 'function' && msg._getType() === 'ai') {
                    return true;
                  }
                  const msgAsAny = msg as any;
                  if (msgAsAny.type === 'ai' || msgAsAny.role === 'assistant') {
                    return true;
                  }
                }
                return false;
              })();
              
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
            controller.enqueue(new TextEncoder().encode(fallbackContent + '\n'));
            console.log('[stream] Fallback: Emitted extracted content from state');
          } else {
            // Ultimate fallback
            const ultimateFallback = 'Completé la acción solicitada. Revisa los resultados adjuntos si los hay.';
            finalResponse = ultimateFallback;
            controller.enqueue(new TextEncoder().encode(ultimateFallback + '\n'));
            console.log('[stream] Fallback: Emitted ultimate fallback message');
          }
        } else {
          console.log('[stream] Text emitted successfully during loop');
        }

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
          controller.enqueue(new TextEncoder().encode(searchResultTag));
        }

        // Append email draft if available
        if (emailDraft) {
          const emailDraftTag = `\n\n[EMAIL_DRAFT]${JSON.stringify(emailDraft)}[/EMAIL_DRAFT]`;
          controller.enqueue(new TextEncoder().encode(emailDraftTag));
        }

        // Append token usage if available
        if (totalTokens > 0) {
          const tokenUsageTag = `\n\n[TOKEN_USAGE]${JSON.stringify({
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalTokens,
          })}[/TOKEN_USAGE]`;
          controller.enqueue(new TextEncoder().encode(tokenUsageTag));
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

        // User-friendly error messages
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

        controller.enqueue(new TextEncoder().encode(errorMessage));
        controller.close();
      }
    },
  });

  return stream;
}

// Export the graph for direct access if needed
export { getSalesAgentGraph } from "./graph";
export { SalesAgentState } from "./state";
export type { SalesAgentStateType } from "./state";

