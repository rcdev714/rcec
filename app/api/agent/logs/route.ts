import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateGeminiCost } from "@/lib/token-counter";
import { getMonthlyPeriodForAnchor, resolveUsageAnchorIso } from "@/lib/usage";

export const runtime = "edge";

interface AgentLogEntry {
  id: string;
  conversationId: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelName: string;
  cost: number;
  source: 'message' | 'agent_run';
}

/**
 * Get agent logs (from both conversation_messages AND agent_runs)
 * Returns timestamped entries with token counts and costs
 * 
 * Data sources:
 * - conversation_messages: Traditional message-based tracking
 * - agent_runs: Trigger.dev background task tracking (primary for async mode)
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "50")));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0"));

    // Determine billing period so logs and analytics align
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const plan = (subscription?.plan ?? "FREE") as "FREE" | "PRO" | "ENTERPRISE";
    const anchorIso = resolveUsageAnchorIso(
      plan,
      subscription,
      user.created_at || new Date().toISOString()
    );
    const { start, end } = getMonthlyPeriodForAnchor(anchorIso);

    // Fetch from BOTH sources in parallel
    const [conversationsResult, agentRunsResult] = await Promise.all([
      // Source 1: Conversations for message-based logs
      supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user.id),
      
      // Source 2: Agent runs (Trigger.dev background tasks)
      supabase
        .from("agent_runs")
        .select("id, conversation_id, input_tokens, output_tokens, model_name, created_at, status")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false })
    ]);

    const { data: conversations, error: conversationsError } = conversationsResult;
    const { data: agentRuns, error: agentRunsError } = agentRunsResult;

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
    }

    if (agentRunsError) {
      console.error("Error fetching agent runs:", agentRunsError);
    }

    const logs: AgentLogEntry[] = [];
    const seenRunIds = new Set<string>();

    // Process agent_runs first (primary source for async mode)
    if (agentRuns && agentRuns.length > 0) {
      for (const run of agentRuns) {
        const inputTokens = run.input_tokens || 0;
        const outputTokens = run.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;
        
        // Skip runs with no token data
        if (totalTokens === 0) continue;
        
        const modelName = run.model_name || "gemini-2.5-flash";
        const cost = calculateGeminiCost(modelName, inputTokens, outputTokens);

        logs.push({
          id: run.id,
          conversationId: run.conversation_id,
          timestamp: run.created_at,
          inputTokens,
          outputTokens,
          totalTokens,
          modelName,
          cost,
          source: 'agent_run',
        });
        
        seenRunIds.add(run.id);
      }
    }

    // Process conversation_messages (fallback/legacy source)
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c) => c.id);

      // Fetch messages with token data (using OR for both old and new token fields)
      const { data: messages, error: messagesError } = await supabase
        .from("conversation_messages")
        .select("id, conversation_id, role, token_count, input_tokens, output_tokens, model_name, metadata, created_at")
        .in("conversation_id", conversationIds)
        .eq("role", "assistant")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
      } else if (messages) {
        for (const msg of messages) {
          // Skip if this message is from an agent_run we already processed
          const metadata = msg.metadata as { runId?: string } | null;
          if (metadata?.runId && seenRunIds.has(metadata.runId)) {
            continue;
          }

          // Use actual stored token counts (fallback to legacy calculation)
          const inputTokens = msg.input_tokens ?? Math.round((msg.token_count || 0) * 0.3);
          const outputTokens = msg.output_tokens ?? Math.round((msg.token_count || 0) * 0.7);
          const totalTokens = inputTokens + outputTokens;

          // Skip messages with no token data
          if (totalTokens === 0) continue;

          const modelName = msg.model_name ?? "gemini-2.5-flash";
          const cost = calculateGeminiCost(modelName, inputTokens, outputTokens);

          logs.push({
            id: msg.id,
            conversationId: msg.conversation_id,
            timestamp: msg.created_at,
            inputTokens,
            outputTokens,
            totalTokens,
            modelName,
            cost,
            source: 'message',
          });
        }
      }
    }

    // Sort by timestamp descending and apply pagination
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const totalCount = logs.length;
    const paginatedLogs = logs.slice(offset, offset + limit);

    return NextResponse.json({
      logs: paginatedLogs,
      total: totalCount,
      limit,
      offset,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    });
  } catch (error) {
    console.error("Error in agent logs API:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent logs" },
      { status: 500 }
    );
  }
}

