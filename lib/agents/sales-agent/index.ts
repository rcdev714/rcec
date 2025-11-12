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
          },
          {
            ...config,
            streamMode: "updates" as const, // Changed to "updates" to track node execution
            recursionLimit: 50, // Increased from default 25 to handle complex workflows
          }
        );

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

          // Track tool results from processToolResults node
          if (nodeName === 'process_tool_results' && nodeOutput.toolOutputs) {
            const lastToolOutput = nodeOutput.toolOutputs[nodeOutput.toolOutputs.length - 1];
            if (lastToolOutput) {
              emitStateEvent(controller, {
                type: 'tool_result',
                toolName: lastToolOutput.toolName,
                toolCallId: lastToolOutput.toolCallId || 'unknown',
                success: lastToolOutput.success,
                output: lastToolOutput.success ? lastToolOutput.output : undefined,
                error: lastToolOutput.success ? undefined : lastToolOutput.errorMessage,
              });
              
              // Emit reflection event if tool failed and we're retrying
              const currentRetryCount = nodeOutput.retryCount || 0;
              if (!lastToolOutput.success && currentRetryCount > 0 && currentRetryCount < MAX_RETRIES) {
                emitStateEvent(controller, {
                  type: 'reflection',
                  message: `La herramienta "${lastToolOutput.toolName}" falló. Ajustando estrategia... (Intento ${currentRetryCount} de ${MAX_RETRIES})`,
                  retryCount: currentRetryCount,
                });
              }
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

          // Track todo planning - emit as a special message
          if (nodeName === 'plan_todos' && nodeOutput.todo && nodeOutput.todo.length > 0) {
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
          }

          // Get the last message if it's from the AI
          if (nodeOutput.messages && nodeOutput.messages.length > 0) {
            const lastMessage = nodeOutput.messages[nodeOutput.messages.length - 1];
            
            if (lastMessage instanceof AIMessage) {
              let content = lastMessage.content.toString();
              
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
                // If content is only commas/whitespace, skip
                if (!content || content.match(/^[,\s]*$/)) {
                  content = '';
                }
              }
              
              // Only send new content (avoid duplicates)
              if (content && content !== finalResponse && !content.startsWith('[CONTEXTO INTERNO]')) {
                finalResponse = content;
                
                // Stream the content
                controller.enqueue(new TextEncoder().encode(content));
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
          if (error.message.includes('API key')) {
            errorMessage = 'Error de configuración: La clave API no está configurada correctamente.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'La solicitud tardó demasiado tiempo. Por favor, intenta con una consulta más simple.';
          } else if (error.message.includes('rate limit') || error.message.includes('Too Many Requests') || error.message.includes('quota')) {
            errorMessage = 'Has excedido el límite de consultas. Por favor, espera o actualiza tu plan.';
          } else if (error.message.includes('429')) {
            errorMessage = 'Límite de consultas alcanzado. Intenta de nuevo más tarde.';
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

