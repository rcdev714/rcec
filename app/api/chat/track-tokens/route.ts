import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

/**
 * DEPRECATED: Track token usage after a chat message completes
 * 
 * This endpoint is now redundant - tracking happens server-side in agent nodes via trackLLMUsage()
 * We keep it for backward compatibility to avoid breaking the frontend
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { inputTokens, outputTokens, totalTokens } = body;

    // NOTE: This endpoint is now redundant - tracking happens server-side in agent nodes
    // We keep it for backward compatibility but just return success
    console.log('[track-tokens] DEPRECATED: Server-side tracking already handled this. Frontend call is redundant.');
    
    // Validate inputs (more lenient now)
    if (
      typeof inputTokens !== "number" ||
      typeof outputTokens !== "number" ||
      inputTokens < 0 ||
      outputTokens < 0
    ) {
      console.warn('[track-tokens] Invalid token counts:', { inputTokens, outputTokens, totalTokens });
      // Return success anyway since server already tracked
      return NextResponse.json({
        success: true,
        message: "Server-side tracking already completed",
        tracked: {
          inputTokens: inputTokens || 0,
          outputTokens: outputTokens || 0,
          totalTokens: totalTokens || 0,
        },
      });
    }

    // Server-side tracking already handled this in agent nodes via trackLLMUsage()
    // Just return success to avoid breaking the frontend
    return NextResponse.json({
      success: true,
      message: "Tracking completed server-side",
      tracked: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    });
  } catch (error) {
    console.error("[track-tokens] Error:", error);
    return NextResponse.json(
      { error: "Failed to track tokens" },
      { status: 500 }
    );
  }
}

