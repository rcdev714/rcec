import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateGeminiCost } from "@/lib/token-counter";

export const runtime = "edge";

/**
 * Get agent logs (conversation messages with token usage)
 * Returns timestamped entries with token counts and costs
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

    // Fetch conversation messages for this user with token counts
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id);

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        logs: [],
        total: 0,
      });
    }

    const conversationIds = conversations.map((c) => c.id);

    // Fetch messages with accurate token counts
    const { data: messages, error, count } = await supabase
      .from("conversation_messages")
      .select("id, conversation_id, role, token_count, input_tokens, output_tokens, model_name, metadata, created_at", { count: "exact" })
      .in("conversation_id", conversationIds)
      .eq("role", "assistant") // Only show assistant messages (agent responses)
      .gt("token_count", 0) // Only messages with token counts
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching agent logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch agent logs" },
        { status: 500 }
      );
    }

    // Transform messages into log entries with accurate cost calculation
    const logs = (messages || []).map((msg) => {
      // Use actual stored token counts (fallback to legacy calculation if not available)
      const inputTokens = msg.input_tokens || Math.round((msg.token_count || 0) * 0.3); // More conservative estimate for migration period
      const outputTokens = msg.output_tokens || Math.round((msg.token_count || 0) * 0.7);
      const totalTokens = inputTokens + outputTokens;
      const modelName = msg.model_name || "gemini-2.5-flash";

      const cost = calculateGeminiCost(
        modelName,
        inputTokens,
        outputTokens
      );

      return {
        id: msg.id,
        conversationId: msg.conversation_id,
        timestamp: msg.created_at,
        inputTokens,
        outputTokens,
        totalTokens,
        modelName,
        cost,
      };
    });

    return NextResponse.json({
      logs,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in agent logs API:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent logs" },
      { status: 500 }
    );
  }
}

