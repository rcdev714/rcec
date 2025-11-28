import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateGeminiCost } from "@/lib/token-counter";
import { getMonthlyPeriodForAnchor, resolveUsageAnchorIso } from "@/lib/usage";

export const runtime = "edge";

type AggregatedSummary = {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  messageCount: number;
};

type UsageSnapshot = {
  cost: number;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Get aggregated cost summary for the current billing period
 * This is more efficient than fetching all logs when you only need totals
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get subscription to determine correct billing anchor
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    const plan = (subscription?.plan ?? 'FREE') as 'FREE' | 'PRO' | 'ENTERPRISE';

    // Get current billing period using billing-aligned anchor
    const anchorIso = resolveUsageAnchorIso(plan, subscription, user.created_at || new Date().toISOString());
    const { start, end } = getMonthlyPeriodForAnchor(anchorIso);

    const usageSnapshotPromise = supabase
      .from('user_usage')
      .select('prompt_dollars, prompt_input_tokens, prompt_output_tokens')
      .eq('user_id', user.id)
      .eq('period_start', start.toISOString())
      .maybeSingle();

    // Fetch agent_runs for this period (Trigger.dev background tasks)
    const agentRunsPromise = supabase
      .from('agent_runs')
      .select('input_tokens, output_tokens, model_name')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .eq('status', 'completed');

    // Use database-level aggregation for optimal performance
    // This avoids transferring all message records to the client
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_user_cost_summary', {
        p_user_id: user.id,
        p_period_start: start.toISOString(),
        p_period_end: end.toISOString()
      });

    const [{ data: usageRow, error: usageError }, { data: agentRuns }] = await Promise.all([
      usageSnapshotPromise,
      agentRunsPromise
    ]);
    
    if (usageError) {
      console.warn("Unable to read usage snapshot for cost summary merge:", usageError);
    }
    
    // Calculate agent_runs totals
    let agentRunsSnapshot: UsageSnapshot = { cost: 0, inputTokens: 0, outputTokens: 0 };
    if (agentRuns && agentRuns.length > 0) {
      agentRunsSnapshot = agentRuns.reduce((acc, run) => {
        const inputTokens = run.input_tokens || 0;
        const outputTokens = run.output_tokens || 0;
        const modelName = run.model_name || 'gemini-2.5-flash';
        const cost = calculateGeminiCost(modelName, inputTokens, outputTokens);
        
        return {
          cost: acc.cost + cost,
          inputTokens: acc.inputTokens + inputTokens,
          outputTokens: acc.outputTokens + outputTokens,
        };
      }, { cost: 0, inputTokens: 0, outputTokens: 0 });
    }
    
    const usageSnapshot = normalizeUsageSnapshot(usageRow);
    
    // Use the maximum of user_usage and agent_runs
    const mergedUsageSnapshot: UsageSnapshot = {
      cost: Math.max(usageSnapshot.cost, agentRunsSnapshot.cost),
      inputTokens: Math.max(usageSnapshot.inputTokens, agentRunsSnapshot.inputTokens),
      outputTokens: Math.max(usageSnapshot.outputTokens, agentRunsSnapshot.outputTokens),
    };

    let aggregatedSummary: AggregatedSummary;

    if (summaryError) {
      console.error("Error fetching cost summary:", summaryError);
      // Fallback to the original implementation if the RPC function doesn't exist yet
      console.warn("Falling back to client-side aggregation");
      aggregatedSummary = await fallbackCostSummary(supabase, user.id, start, end);
    } else {
      const result = summary?.[0] || {
        total_cost: 0,
        total_tokens: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        message_count: 0
      };
      aggregatedSummary = mapRpcResultToSummary(result);
    }

    const payload = mergeUsageAndAggregate(aggregatedSummary, mergedUsageSnapshot, start, end);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error in cost summary API:", error);
    return NextResponse.json(
      { error: "Failed to compute cost summary" },
      { status: 500 }
    );
  }
}

/**
 * Fallback implementation using client-side aggregation
 * Used when the optimized RPC function is not available
 */
async function fallbackCostSummary(
  supabase: any,
  userId: string,
  start: Date,
  end: Date
): Promise<AggregatedSummary> {
  // Fetch all conversations for this user
  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId);

  if (conversationsError) {
    console.error("Error fetching conversations:", conversationsError);
    throw conversationsError;
  }

  if (!conversations || conversations.length === 0) {
    return {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      messageCount: 0,
    };
  }

  const conversationIds = conversations.map((c: { id: string }) => c.id);

  // Fetch ALL messages in the current period (no limit)
  // Only select the fields needed for cost calculation to minimize data transfer
  const { data: messages, error: messagesError } = await supabase
    .from("conversation_messages")
    .select("input_tokens, output_tokens, token_count, model_name")
    .in("conversation_id", conversationIds)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .eq("role", "assistant"); // Only count assistant messages

  if (messagesError) {
    console.error("Error fetching messages for cost summary:", messagesError);
    throw messagesError;
  }

  // Aggregate totals
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  (messages || []).forEach((msg: {
    input_tokens?: number;
    output_tokens?: number;
    token_count?: number;
    model_name?: string;
  }) => {
    // Use actual stored token counts (fallback to legacy calculation if not available)
    const inputTokens = msg.input_tokens ?? Math.round((msg.token_count || 0) * 0.3);
    const outputTokens = msg.output_tokens ?? Math.round((msg.token_count || 0) * 0.7);
    const modelName = msg.model_name ?? "gemini-2.5-flash";

    const cost = calculateGeminiCost(modelName, inputTokens, outputTokens);

    totalCost += cost;
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
  });

  return {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    messageCount: messages?.length || 0,
  };
}

function normalizeUsageSnapshot(
  row?: { prompt_dollars?: number | null; prompt_input_tokens?: number | null; prompt_output_tokens?: number | null } | null
): UsageSnapshot {
  return {
    cost: Number(row?.prompt_dollars ?? 0),
    inputTokens: Number(row?.prompt_input_tokens ?? 0),
    outputTokens: Number(row?.prompt_output_tokens ?? 0),
  };
}

function mapRpcResultToSummary(result: any): AggregatedSummary {
  return {
    totalCost: Number(result.total_cost || 0),
    totalInputTokens: Number(result.total_input_tokens || 0),
    totalOutputTokens: Number(result.total_output_tokens || 0),
    messageCount: Number(result.message_count || 0),
  };
}

function mergeUsageAndAggregate(
  aggregated: AggregatedSummary,
  usage: UsageSnapshot,
  periodStart: Date,
  periodEnd: Date
) {
  const totalInputTokens = Math.max(aggregated.totalInputTokens, usage.inputTokens);
  const totalOutputTokens = Math.max(aggregated.totalOutputTokens, usage.outputTokens);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const totalCost = Math.max(aggregated.totalCost, usage.cost);

  const aggregatedTokenTotal = aggregated.totalInputTokens + aggregated.totalOutputTokens;
  const usageTokenTotal = usage.inputTokens + usage.outputTokens;

  const dollarsSource =
    totalCost === usage.cost && usage.cost > 0
      ? 'usage_table'
      : aggregated.totalCost > 0
        ? 'aggregated_messages'
        : 'usage_table';

  const tokensSource =
    totalInputTokens === usage.inputTokens &&
    totalOutputTokens === usage.outputTokens &&
    usageTokenTotal > 0
      ? 'usage_table'
      : aggregatedTokenTotal > 0
        ? 'aggregated_messages'
        : 'usage_table';

  return {
    totalCost,
    totalTokens,
    totalInputTokens,
    totalOutputTokens,
    messageCount: aggregated.messageCount,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    sources: {
      dollars: dollarsSource,
      tokens: tokensSource,
    },
  };
}

