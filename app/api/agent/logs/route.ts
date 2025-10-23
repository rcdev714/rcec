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
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Fetch conversation messages for this user with token counts
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id);

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        logs: [],
        total: 0,
      });
    }

    const conversationIds = conversations.map((c) => c.id);

    // Fetch messages with token counts
    const { data: messages, error, count } = await supabase
      .from("conversation_messages")
      .select("id, conversation_id, role, token_count, metadata, created_at", { count: "exact" })
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

    // Transform messages into log entries with cost calculation
    const logs = (messages || []).map((msg) => {
      // Estimate input/output split (40% input, 60% output as rough approximation)
      const totalTokens = msg.token_count || 0;
      const estimatedInputTokens = Math.round(totalTokens * 0.4);
      const estimatedOutputTokens = Math.round(totalTokens * 0.6);
      
      const cost = calculateGeminiCost(
        "gemini-2.5-flash",
        estimatedInputTokens,
        estimatedOutputTokens
      );

      return {
        id: msg.id,
        conversationId: msg.conversation_id,
        timestamp: msg.created_at,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        totalTokens: totalTokens,
        cost: cost,
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

