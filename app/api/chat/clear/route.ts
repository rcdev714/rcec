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
    
    if (!conversationId) {
      return new Response("Conversation ID is required", { status: 400 });
    }

    // Clear legacy in-memory conversation state (for backward compatibility)
    const effectiveConversationId = conversationId || user.id;
    clearConversation(effectiveConversationId);

    // Delete conversation messages from Supabase
    const { error: messagesError } = await supabase
      .from('conversation_messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (messagesError) {
      console.error("Error deleting messages:", messagesError);
    }

    // Delete LangGraph agent checkpoints (for Sales Agent memory)
    const { error: checkpointWritesError } = await supabase
      .from('agent_checkpoint_writes')
      .delete()
      .eq('thread_id', conversationId);

    if (checkpointWritesError) {
      console.error("Error deleting checkpoint writes:", checkpointWritesError);
    }

    const { error: checkpointsError } = await supabase
      .from('agent_checkpoints')
      .delete()
      .eq('thread_id', conversationId);

    if (checkpointsError) {
      console.error("Error deleting checkpoints:", checkpointsError);
    }

    // Delete the conversation itself
    const { error: conversationError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (conversationError) {
      console.error("Error deleting conversation:", conversationError);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Failed to delete conversation",
        error: conversationError.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Conversation deleted successfully",
      conversationId 
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error clearing conversation:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ 
      success: false, 
      message: errorMessage 
    }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
