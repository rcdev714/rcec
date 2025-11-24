import { getConversationStatsAccurate } from "@/lib/chat-agent";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId") || user.id;

    // Use accurate token counting
    const stats = await getConversationStatsAccurate(conversationId);

    return new Response(JSON.stringify({
      ...stats,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error getting conversation stats:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}
