import { task, logger, metadata } from "@trigger.dev/sdk";
import { BaseMessage } from "@langchain/core/messages";

// Import agent components - these will be executed in the background
// Note: We import dynamically to avoid bundling issues

/**
 * Enterprise Agent Background Task
 * 
 * This task runs the LangGraph agent in a background worker without
 * timeout constraints. It saves state to Supabase for real-time updates.
 * 
 * Benefits:
 * - No 60s timeout limit (can run for up to 60 minutes)
 * - Parallel tool execution without throttling
 * - Real-time updates via Supabase Realtime
 * - Crash recovery via checkpointing
 */
export const enterpriseAgentTask = task({
  id: "enterprise-agent-run",
  // Allow up to 30 minutes for complex research workflows
  maxDuration: 1800,
  // Use a medium machine for better performance
  machine: { preset: "medium-1x" },
  
  retry: {
    maxAttempts: 2,
    factor: 1.5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },

  run: async (payload: {
    runId: string;
    threadId: string;
    conversationId: string;
    userId: string;
    message: string;
    modelName?: string;
    thinkingLevel?: "high" | "low";
    conversationHistory?: Array<{ role: string; content: string }>;
  }) => {
    const { 
      runId, 
      threadId, 
      conversationId, 
      userId, 
      message, 
      modelName = "gemini-2.5-flash",
      thinkingLevel = "high",
      conversationHistory = []
    } = payload;

    logger.info("Starting enterprise agent task", { 
      runId, 
      threadId, 
      conversationId,
      messageLength: message.length,
      historyLength: conversationHistory.length,
      modelName,
    });

    // Set metadata for progress tracking
    metadata.set("runId", runId);
    metadata.set("status", "initializing");
    metadata.set("progress", 0);

    try {
      // Dynamic imports for Node.js runtime compatibility
      // Use require for Supabase as import() might return a module object in some environments
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require("@supabase/supabase-js");
      const { HumanMessage, AIMessage } = await import("@langchain/core/messages");
      
      // Create Supabase admin client for background operations
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase credentials");
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
      });

      // Update run status to running
      await supabase
        .from("agent_runs")
        .update({ 
          status: "running", 
          started_at: new Date().toISOString(),
          current_node: "initializing",
        })
        .eq("id", runId);

      metadata.set("status", "running");

      // Convert conversation history to LangChain messages
      const messages: BaseMessage[] = conversationHistory.map((msg) => {
        if (msg.role === "user") {
          return new HumanMessage(msg.content);
        } else {
          return new AIMessage(msg.content);
        }
      });
      
      // Add current message
      messages.push(new HumanMessage(message));

      // Import and build the graph
      const { buildEnterpriseAgentGraphWithCheckpointer } = await import("@/lib/agents/enterprise-agent/graph");
      
      // Build graph with checkpointing enabled
      const graph = buildEnterpriseAgentGraphWithCheckpointer();

      logger.info("Graph built, starting execution", { threadId });

      // Track results
      let finalResponse = "";
      let searchResults: unknown = null;
      let emailDraft: unknown = null;
      let todos: unknown[] = [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalTokens = 0;
      let currentNode = "";
      
      // Track ALL tool invocations and results for visibility
      const toolOutputsHistory: Array<{
        kind: 'tool_call' | 'tool_result';
        toolName: string;
        toolCallId?: string;
        input: Record<string, unknown>;
        output?: unknown;
        success?: boolean;
        timestamp: string;
        errorMessage?: string;
      }> = [];
      const processedToolCallIds = new Set<string>();

      // Helper to update run status in Supabase
      const updateRunStatus = async (updates: Record<string, unknown>) => {
        await supabase
          .from("agent_runs")
          .update(updates)
          .eq("id", runId);
      };

      /**
       * Persist todos in a normalized relational table for durable conversation reloads.
       * This complements agent_runs.todos (jsonb) by storing each todo as its own row.
       */
      const normalizeTodoStatus = (value: unknown): "pending" | "in_progress" | "completed" | "failed" => {
        const v = typeof value === "string" ? value : "";
        if (v === "pending" || v === "in_progress" || v === "completed" || v === "failed") return v;
        return "pending";
      };

      const toIsoOrNull = (value: unknown): string | null => {
        if (!value) return null;
        if (typeof value === "string") {
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        }
        if (value instanceof Date) {
          return Number.isNaN(value.getTime()) ? null : value.toISOString();
        }
        return null;
      };

      const upsertConversationTodos = async (todosList: unknown[]) => {
        if (!Array.isArray(todosList) || todosList.length === 0) return;
        try {
          const rows = todosList
            .map((t: any, idx: number) => {
              const todoId = String(t?.id ?? idx);
              const description = String(t?.description ?? "");
              if (!description.trim()) return null;

              const createdAtIso = toIsoOrNull(t?.createdAt) || new Date().toISOString();
              const completedAtIso = toIsoOrNull(t?.completedAt);
              const errorMessage =
                typeof t?.errorMessage === "string" && t.errorMessage.trim().length > 0
                  ? t.errorMessage.trim()
                  : null;

              return {
                run_id: runId,
                conversation_id: conversationId,
                todo_id: todoId,
                description,
                status: normalizeTodoStatus(t?.status),
                sort_order: idx,
                created_at: createdAtIso,
                completed_at: completedAtIso,
                error_message: errorMessage,
                updated_at: new Date().toISOString(),
              };
            })
            .filter(Boolean);

          if (rows.length === 0) return;

          const { error } = await supabase
            .from("conversation_todos")
            .upsert(rows as any, { onConflict: "run_id,todo_id" });

          if (error) {
            logger.warn("Failed to upsert conversation_todos", {
              runId,
              conversationId,
              error: error.message,
            });
          }
        } catch (e) {
          logger.warn("Failed to sync todos to conversation_todos", {
            runId,
            conversationId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      };

      // Stream the graph execution
      // IMPORTANT: Initialize userContext with userId for background tools
      const streamResult = await graph.stream(
        {
          messages,
          iterationCount: 0,
          retryCount: 0,
          todo: [],
          toolOutputs: [],
          modelName,
          thinkingLevel,
          startTime: new Date(),
          runId,
          // Initialize userContext with userId - required for offerings tools in background
          userContext: {
            userId,
            offerings: [],
            subscription: { plan: 'FREE', status: 'active' },
            usage: { searches: 0, exports: 0, prompts: 0 },
            limits: { searches: 100, exports: 10, prompts: 100 },
          },
        },
        {
          configurable: { 
            // CRITICAL: Must use threadId (stable per conversation), not runId (unique per run),
            // otherwise checkpointing can't restore prior state.
            thread_id: threadId,
            checkpoint_ns: "",
          },
          // Enable checkpointing for state persistence
          streamMode: "updates" as const,
          recursionLimit: 100,
        }
      );

      // Process stream updates
      for await (const update of streamResult) {
        const nodeName = Object.keys(update)[0];
        const nodeOutput = update[nodeName] as Record<string, unknown>;

        // Track current node
        if (nodeName !== currentNode) {
          logger.info("Node transition", { from: currentNode, to: nodeName });
          currentNode = nodeName;
          
          // Update progress in Supabase for real-time UI
          await updateRunStatus({
            current_node: nodeName,
            progress: {
              currentNode: nodeName,
              timestamp: new Date().toISOString(),
            },
          });

          metadata.set("currentNode", nodeName);
        }

        // Track tool calls when AI decides to call tools (before execution)
        if (nodeName === "think" && nodeOutput.messages && Array.isArray(nodeOutput.messages)) {
          const lastMsg = nodeOutput.messages[nodeOutput.messages.length - 1];
          if (lastMsg && typeof lastMsg === "object" && "_getType" in lastMsg) {
            const msgType = typeof lastMsg._getType === "function" ? lastMsg._getType() : null;
            if (msgType === "ai" && "tool_calls" in lastMsg) {
              const toolCalls = (lastMsg as { tool_calls?: Array<{ name: string; id: string; args: Record<string, unknown> }> }).tool_calls;
              if (Array.isArray(toolCalls) && toolCalls.length > 0) {
                logger.info("AI decided to call tools", {
                  tools: toolCalls.map(tc => ({
                    name: tc.name,
                    id: tc.id,
                    argsKeys: Object.keys(tc.args || {}),
                  })),
                });

                // Persist pending tool calls
                let hasNewCalls = false;
                for (const tc of toolCalls) {
                  // We don't track tool_call IDs in processedToolCallIds because that set tracks results
                  // But we should verify we haven't already added this specific tool call event
                  const toolCallId = tc.id || `${tc.name}-${Date.now()}`;
                  
                  // Check if we already have a tool_call event with this ID
                  const exists = toolOutputsHistory.some(e => e.kind === 'tool_call' && e.toolCallId === toolCallId);
                  if (!exists) {
                    toolOutputsHistory.push({
                      kind: 'tool_call',
                      toolName: tc.name,
                      toolCallId: toolCallId,
                      input: tc.args || {},
                      timestamp: new Date().toISOString(),
                    });
                    hasNewCalls = true;
                  }
                }
                
                if (hasNewCalls) {
                  await updateRunStatus({ tool_outputs: toolOutputsHistory });
                }
              }
            }
          }
        }

        // Track todos - now updated automatically in process_tool_results
        if (nodeOutput.todo && Array.isArray(nodeOutput.todo)) {
          todos = nodeOutput.todo as unknown[];
          await updateRunStatus({ todos });
          await upsertConversationTodos(todos);
          metadata.set("todos", JSON.stringify(todos));
          logger.info("Todos updated", { 
            nodeName,
            todoCount: todos.length,
            completed: todos.filter((t: any) => t.status === 'completed').length,
            inProgress: todos.filter((t: any) => t.status === 'in_progress').length,
            failed: todos.filter((t: any) => t.status === 'failed').length,
          });
        }

        // Track ALL tool outputs for visibility
        if (nodeOutput.toolOutputs && Array.isArray(nodeOutput.toolOutputs)) {
          for (const output of nodeOutput.toolOutputs as Array<{ 
            toolName: string; 
            toolCallId?: string;
            input?: Record<string, unknown>;
            success: boolean; 
            output: unknown;
            errorMessage?: string;
          }>) {
            // Only process each tool call once (avoid duplicates)
            const toolCallId = output.toolCallId || `${output.toolName}-${Date.now()}`;
            if (!processedToolCallIds.has(toolCallId)) {
              processedToolCallIds.add(toolCallId);
              
              // Add to history
              toolOutputsHistory.push({
                kind: 'tool_result',
                toolName: output.toolName,
                toolCallId,
                input: output.input || {},
                output: output.output,
                success: output.success,
                timestamp: new Date().toISOString(),
                errorMessage: output.errorMessage,
              });
              
              logger.info("Tool execution tracked", {
                toolName: output.toolName,
                toolCallId,
                success: output.success,
                errorMessage: output.errorMessage,
              });
              
              // Update tool_outputs in real-time
              await updateRunStatus({ tool_outputs: toolOutputsHistory });
            }
            
            // Track search results specifically (for backwards compatibility)
            if (output.toolName === "search_companies" && output.success) {
              const result = (output.output as { result?: unknown })?.result;
              if (result) {
                searchResults = result;
                await updateRunStatus({ search_results: searchResults });
              }
            }
          }
        }

        // Track email draft
        if (nodeOutput.emailDraft) {
          emailDraft = nodeOutput.emailDraft;
          await updateRunStatus({ email_draft: emailDraft });
        }

        // Track token usage
        if (nodeOutput.totalInputTokens) {
          totalInputTokens += nodeOutput.totalInputTokens as number;
        }
        if (nodeOutput.totalOutputTokens) {
          totalOutputTokens += nodeOutput.totalOutputTokens as number;
        }
        if (nodeOutput.totalTokens) {
          totalTokens += nodeOutput.totalTokens as number;
        }

        // Track final response content
        if (nodeOutput.messages && Array.isArray(nodeOutput.messages)) {
          const lastMessage = nodeOutput.messages[nodeOutput.messages.length - 1];
          
          // Check if it's an AI message with content
          if (lastMessage && typeof lastMessage === "object") {
            const msgType = typeof lastMessage._getType === "function" 
              ? lastMessage._getType() 
              : (lastMessage as Record<string, unknown>).type;
              
            if (msgType === "ai") {
              const content = (lastMessage as Record<string, unknown>).content;
              if (typeof content === "string" && content.length > 10) {
                finalResponse = content;
                
                // Clean response content
                finalResponse = finalResponse
                  .replace(/\[object Object\],?/g, "")
                  .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, "")
                  .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, "")
                  .trim();
                
                // Update response in real-time
                await updateRunStatus({ response_content: finalResponse });
              }
            }
          }
        }
      }

      logger.info("Graph execution completed", { 
        responseLength: finalResponse.length,
        hasSearchResults: !!searchResults,
        hasEmailDraft: !!emailDraft,
        totalTokens,
      });

      // Final update with completed status
      await updateRunStatus({
        status: "completed",
        completed_at: new Date().toISOString(),
        response_content: finalResponse,
        search_results: searchResults,
        email_draft: emailDraft,
        todos,
        tool_outputs: toolOutputsHistory,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        total_tokens: totalTokens,
        current_node: "completed",
      });
      await upsertConversationTodos(todos);

      logger.info("Tool outputs summary", {
        totalToolCalls: toolOutputsHistory.length,
        successfulCalls: toolOutputsHistory.filter(t => t.success).length,
        failedCalls: toolOutputsHistory.filter(t => !t.success).length,
        toolsUsed: [...new Set(toolOutputsHistory.map(t => t.toolName))],
      });

      // Also save the message to conversation_messages for persistence
      if (finalResponse) {
        await supabase.from("conversation_messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: finalResponse,
          metadata: {
            searchResult: searchResults,
            emailDraft: emailDraft,
            model: modelName,
            runId,
          },
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          model_name: modelName,
        });
      }

      // CRITICAL: Sync token usage to user_usage table for billing/limits
      // This ensures the dashboard and subscription limits reflect actual usage
      if (totalInputTokens > 0 || totalOutputTokens > 0) {
        try {
          const { trackLLMUsageBackground } = await import("@/lib/usage");
          await trackLLMUsageBackground(
            userId,
            modelName,
            totalInputTokens,
            totalOutputTokens
          );
          logger.info("Token usage synced to user_usage", {
            userId,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          });
        } catch (usageError) {
          // Non-critical: log but don't fail the task
          logger.error("Failed to sync token usage", { 
            error: usageError instanceof Error ? usageError.message : "Unknown error" 
          });
        }
      }

      metadata.set("status", "completed");
      metadata.set("progress", 100);

      return {
        success: true,
        runId,
        responseLength: finalResponse.length,
        hasSearchResults: !!searchResults,
        hasEmailDraft: !!emailDraft,
        totalTokens,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      };

    } catch (error) {
      logger.error("Enterprise agent task failed", { 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      metadata.set("status", "failed");
      metadata.set("error", error instanceof Error ? error.message : "Unknown error");

      // Update run status to failed
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );

        await supabase
          .from("agent_runs")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            completed_at: new Date().toISOString(),
          })
          .eq("id", payload.runId);
      } catch (updateError) {
        logger.error("Failed to update run status", { updateError });
      }

      throw error;
    }
  },
});

// Export type for use in other files
export type EnterpriseAgentTaskPayload = Parameters<typeof enterpriseAgentTask.trigger>[0];

// Backwards compatibility alias
export const salesAgentTask = enterpriseAgentTask;
export type SalesAgentTaskPayload = EnterpriseAgentTaskPayload;

