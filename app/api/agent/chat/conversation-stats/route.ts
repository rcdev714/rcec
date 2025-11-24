import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateGeminiCost } from "@/lib/token-counter";

export const runtime = "edge";

/**
 * Get token usage statistics for a conversation
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
    const conversationId = url.searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Fetch all messages for the conversation
    const { data: messages, error } = await supabase
      .from("conversation_messages")
      .select("token_count, metadata")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching conversation messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversation stats" },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
      });
    }

    // Calculate totals
    const totalTokens = messages.reduce(
      (sum, msg) => sum + (msg.token_count || 0),
      0
    );

    // Estimate cost (rough approximation since we don't track input/output separately per message)
    // Assume 40% input, 60% output ratio on average
    const estimatedInputTokens = Math.round(totalTokens * 0.4);
    const estimatedOutputTokens = Math.round(totalTokens * 0.6);
    const totalCost = calculateGeminiCost(
      "gemini-2.5-flash",
      estimatedInputTokens,
      estimatedOutputTokens
    );

    return NextResponse.json({
      totalTokens,
      totalCost,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error("Error in conversation-stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation stats" },
      { status: 500 }
    );
  }
}

