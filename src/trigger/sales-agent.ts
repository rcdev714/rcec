import { task, logger, metadata } from "@trigger.dev/sdk/v3";
import { BaseMessage } from "@langchain/core/messages";

// Import agent components - these will be executed in the background
// Note: We import dynamically to avoid bundling issues

/**
 * Sales Agent Background Task
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
export const salesAgentTask = task({
  id: "sales-agent-run",
  // Allow up to 10 minutes for complex research workflows
  maxDuration: 600,
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

    logger.info("Starting sales agent task", { 
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
      const { buildSalesAgentGraph } = await import("@/lib/agents/sales-agent/graph");
      // const { SupabaseCheckpointSaver } = await import("@/lib/agents/sales-agent/checkpointer");
      
      // Build graph with checkpointing enabled
      const graph = buildSalesAgentGraph();

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

      // Helper to update run status in Supabase
      const updateRunStatus = async (updates: Record<string, unknown>) => {
        await supabase
          .from("agent_runs")
          .update(updates)
          .eq("id", runId);
      };

      // Stream the graph execution
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
        },
        {
          configurable: { 
            thread_id: threadId,
            checkpoint_ns: "",
          },
          // Enable checkpointing for state persistence
          // Note: Uncomment when ready to enable full checkpointing
          // checkpointer,
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
          currentNode = nodeName;
          logger.info("Node transition", { from: currentNode, to: nodeName });
          
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

        // Track todos
        if ((nodeName === "plan_todos" || nodeName === "update_todos") && nodeOutput.todo) {
          todos = nodeOutput.todo as unknown[];
          await updateRunStatus({ todos });
          metadata.set("todos", JSON.stringify(todos));
        }

        // Track search results
        if (nodeOutput.toolOutputs && Array.isArray(nodeOutput.toolOutputs)) {
          for (const output of nodeOutput.toolOutputs as Array<{ toolName: string; success: boolean; output: unknown }>) {
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
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        total_tokens: totalTokens,
        current_node: "completed",
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
      logger.error("Sales agent task failed", { 
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
export type SalesAgentTaskPayload = Parameters<typeof salesAgentTask.trigger>[0];

