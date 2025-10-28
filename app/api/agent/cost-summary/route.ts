import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateGeminiCost } from "@/lib/token-counter";
import { getMonthlyPeriodForAnchor } from "@/lib/usage";

export const runtime = "edge";

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

    // Get current billing period
    const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());

    // Use database-level aggregation for optimal performance
    // This avoids transferring all message records to the client
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_user_cost_summary', {
        p_user_id: user.id,
        p_period_start: start.toISOString(),
        p_period_end: end.toISOString()
      });

    if (summaryError) {
      console.error("Error fetching cost summary:", summaryError);
      // Fallback to the original implementation if the RPC function doesn't exist yet
      console.warn("Falling back to client-side aggregation");
      return await fallbackCostSummary(supabase, user.id, start, end);
    }

    // The RPC returns an array with one row, extract the values
    const result = summary?.[0] || {
      total_cost: 0,
      total_tokens: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      message_count: 0
    };

    return NextResponse.json({
      totalCost: Number(result.total_cost || 0),
      totalTokens: Number(result.total_tokens || 0),
      totalInputTokens: Number(result.total_input_tokens || 0),
      totalOutputTokens: Number(result.total_output_tokens || 0),
      messageCount: Number(result.message_count || 0),
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    });
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
): Promise<NextResponse> {
  // Fetch all conversations for this user
  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId);

  if (conversationsError) {
    console.error("Error fetching conversations:", conversationsError);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({
      totalCost: 0,
      totalTokens: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      messageCount: 0,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    });
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
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
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

  return NextResponse.json({
    totalCost,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalInputTokens,
    totalOutputTokens,
    messageCount: messages?.length || 0,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  });
}

