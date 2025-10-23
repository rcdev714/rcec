import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { atomicIncrementUsageBy } from "@/lib/usage-atomic";
import { dollarsFromTokens, getMonthlyPeriodForAnchor } from "@/lib/usage";

export const runtime = "edge";

/**
 * Track token usage after a chat message completes
 * This endpoint is called by the frontend after receiving token counts
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
    const { inputTokens, outputTokens, totalTokens, model = "gemini-2.5-flash" } = body;

    // Validate inputs
    if (
      typeof inputTokens !== "number" ||
      typeof outputTokens !== "number" ||
      typeof totalTokens !== "number" ||
      inputTokens < 0 ||
      outputTokens < 0 ||
      totalTokens < 0 ||
      totalTokens !== inputTokens + outputTokens
    ) {
      return NextResponse.json(
        { error: "Invalid token counts" },
        { status: 400 }
      );
    }

    // Calculate the current billing period
    const { start } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
    const periodStart = start.toISOString();

    // Track input tokens (analytics)
    if (inputTokens > 0) {
      try {
        await atomicIncrementUsageBy(
          user.id,
          periodStart,
          "prompt_input_tokens",
          inputTokens
        );
      } catch (error) {
        console.error("[track-tokens] Error tracking input tokens:", error);
        // Don't fail the request if analytics tracking fails
      }
    }

    // Track output tokens (analytics)
    if (outputTokens > 0) {
      try {
        await atomicIncrementUsageBy(
          user.id,
          periodStart,
          "prompt_output_tokens",
          outputTokens
        );
      } catch (error) {
        console.error("[track-tokens] Error tracking output tokens:", error);
        // Don't fail the request if analytics tracking fails
      }
    }

    // Calculate and track cost using atomic operations to prevent race conditions
    if (totalTokens > 0) {
      try {
        const cost = dollarsFromTokens(
          model as any,
          inputTokens,
          outputTokens
        );

        // Use atomic SQL update to prevent race conditions
        // This ensures that concurrent requests don't overwrite each other
        const { error: costError } = await supabase.rpc('atomic_increment_prompt_dollars', {
          p_user_id: user.id,
          p_period_start: periodStart,
          p_amount: cost
        });

        if (costError) {
          console.error("[track-tokens] Error in atomic cost update:", costError);
          // Fallback to non-atomic update if atomic update fails (less ideal but better than failing)
          try {
            const { data: usage } = await supabase
              .from("user_usage")
              .select("prompt_dollars")
              .eq("user_id", user.id)
              .eq("period_start", periodStart)
              .single();

            if (usage) {
              await supabase
                .from("user_usage")
                .update({
                  prompt_dollars: Number(usage.prompt_dollars || 0) + cost,
                })
                .eq("user_id", user.id)
                .eq("period_start", periodStart);
            }
          } catch (fallbackError) {
            console.error("[track-tokens] Fallback cost update also failed:", fallbackError);
          }
        }
      } catch (error) {
        console.error("[track-tokens] Error tracking cost:", error);
        // Don't fail the request if cost tracking fails
      }
    }

    return NextResponse.json({
      success: true,
      tracked: {
        inputTokens,
        outputTokens,
        totalTokens,
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

