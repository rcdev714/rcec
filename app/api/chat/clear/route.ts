import { clearConversation } from "@/lib/chat-agent";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { conversationId } = await req.json();
    const effectiveConversationId = conversationId || user.id;

    clearConversation(effectiveConversationId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Conversation cleared",
      conversationId: effectiveConversationId 
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error clearing conversation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}
