import { createClient } from "@/lib/supabase/server";
import { tasks } from "@trigger.dev/sdk";
import { validateEnvironment } from "@/lib/env-validation";
import { ensurePromptAllowedAndTrack, estimateTokensFromTextLength } from "@/lib/usage";
import type { enterpriseAgentTask } from "@/src/trigger/enterprise-agent";
import { mergeAgentSettings, AgentSettings } from "@/lib/types/agent-settings";


export const runtime = "nodejs";

/**
 * API Route to start an async agent run
 * 
 * This endpoint:
 * 1. Validates the user and request
 * 2. Creates an agent_runs record for tracking
 * 3. Triggers the background Trigger.dev task
 * 4. Returns immediately with the run ID
 * 
 * The frontend then subscribes to the agent_runs table
 * via Supabase Realtime to get updates.
 */
export async function POST(req: Request) {
  // Validate environment
  const envValidation = validateEnvironment();
  if (!envValidation.isValid) {
    return new Response(
      JSON.stringify({
        error: "Configuration error",
        message: "Server configuration is incomplete",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { 
      message, 
      conversationId, 
      model = "gemini-2.5-flash",
      thinkingLevel = "high",
      agentSettings: requestSettings,
    } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check usage limits
    const inputTokensEstimate = estimateTokensFromTextLength(message.length);
    const promptCheck = await ensurePromptAllowedAndTrack(user.id, {
      model,
      inputTokensEstimate,
    });

    if (!promptCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: promptCheck.remainingDollars !== undefined
            ? `Has excedido tu límite mensual. Saldo: $${promptCheck.remainingDollars.toFixed(2)}`
            : "Has excedido tu límite de uso",
          upgradeUrl: "/pricing",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use or create conversation
    let effectiveConversationId = conversationId;
    let conversationSettings: AgentSettings | null = null;
    
    // Fetch user profile for default settings
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('agent_settings')
      .eq('user_id', user.id)
      .single();
    
    if (!effectiveConversationId) {
      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: message.substring(0, 100),
          metadata: { agentSettings: requestSettings || {} }
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Error creating conversation:", convError);
        return new Response(
          JSON.stringify({ error: "Failed to create conversation" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      effectiveConversationId = newConversation.id;
    } else {
      // Fetch existing conversation metadata
      const { data: conversation } = await supabase
        .from("conversations")
        .select("metadata")
        .eq("id", effectiveConversationId)
        .single();
      
      if (conversation?.metadata && typeof conversation.metadata === 'object') {
        const meta = conversation.metadata as Record<string, any>;
        if (meta.agentSettings) {
          conversationSettings = meta.agentSettings as AgentSettings;
        }
      }
      
      // If request has new settings, update conversation metadata to persist overrides
      if (requestSettings) {
        await supabase
          .from("conversations")
          .update({
            metadata: { 
              ...(conversation?.metadata as object || {}), 
              agentSettings: requestSettings 
            }
          })
          .eq("id", effectiveConversationId);
      }
    }

    // Merge settings: User Defaults -> Conversation Overrides -> Request Overrides
    const effectiveSettings = mergeAgentSettings(
      userProfile?.agent_settings as AgentSettings | null,
      conversationSettings,
      requestSettings as AgentSettings | null
    );
    
    // Ensure model/thinking match (legacy params take precedence if passed explicitly)
    if (model) effectiveSettings.modelName = model;
    if (thinkingLevel) effectiveSettings.thinkingLevel = thinkingLevel as any;

    // Save user message to conversation
    const { error: insertError } = await supabase.from("conversation_messages").insert({
      conversation_id: effectiveConversationId,
      role: "user",
      content: message,
    });

    if (insertError) {
      console.error("Error saving user message:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save message" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch conversation history
    const { data: historyMessages } = await supabase
      .from("conversation_messages")
      .select("role, content")
      .eq("conversation_id", effectiveConversationId)
      .order("created_at", { ascending: true })
      .limit(20); // Limit to last 20 messages

    const conversationHistory = (historyMessages || [])
      .slice(0, -1) // Exclude the message we just added
      .map((msg) => ({
        role: msg.role as string,
        content: msg.content as string,
      }));

    // Create thread ID for checkpointing
    const threadId = `${user.id}-${effectiveConversationId}`;

    // Create agent run record
    const { data: agentRun, error: runError } = await supabase
      .from("agent_runs")
      .insert({
        thread_id: threadId,
        conversation_id: effectiveConversationId,
        user_id: user.id,
        status: "pending",
        model_name: effectiveSettings.modelName,
        progress: { currentNode: "pending" },
        todos: [],
        settings: effectiveSettings,
      })
      .select("id")
      .single();

    if (runError) {
      console.error("Error creating agent run:", runError);
      return new Response(
        JSON.stringify({ error: "Failed to create agent run" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Trigger the background task
    try {
      const handle = await tasks.trigger<typeof enterpriseAgentTask>("enterprise-agent-run", {
        runId: agentRun.id,
        threadId,
        conversationId: effectiveConversationId,
        userId: user.id,
        message,
        modelName: effectiveSettings.modelName,
        thinkingLevel: effectiveSettings.thinkingLevel,
        agentSettings: effectiveSettings,
        conversationHistory,
      });

      console.log("[agent/start] Task triggered:", handle.id);

      // Return immediately with run info
      return new Response(
        JSON.stringify({
          success: true,
          runId: agentRun.id,
          conversationId: effectiveConversationId,
          taskId: handle.id,
          status: "pending",
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "X-Run-Id": agentRun.id,
            "X-Conversation-Id": effectiveConversationId,
          } 
        }
      );

    } catch (triggerError) {
      console.error("Error triggering task:", triggerError);
      
      // Update run status to failed
      await supabase
        .from("agent_runs")
        .update({
          status: "failed",
          error_message: triggerError instanceof Error ? triggerError.message : "Failed to start task",
        })
        .eq("id", agentRun.id);

      return new Response(
        JSON.stringify({ 
          error: "Failed to start agent",
          message: triggerError instanceof Error ? triggerError.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in agent start:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Get status of a specific run
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const runId = url.searchParams.get("runId");

    if (!runId) {
      return new Response(
        JSON.stringify({ error: "runId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: run, error } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", user.id)
      .single();

    if (error || !run) {
      return new Response(
        JSON.stringify({ error: "Run not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(run),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching run:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}



