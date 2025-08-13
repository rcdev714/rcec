import { chatWithMemory, getConversationStats } from "@/lib/chat-agent";
import { chatWithLangGraph } from "@/lib/chat-agent-langgraph";
import { createClient } from "@/lib/supabase/server";
import ConversationManager from "@/lib/conversation-manager";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

export const runtime = "edge";

export async function POST(req: Request) {
  if (!process.env.GOOGLE_API_KEY) {
    return new Response("Missing GOOGLE_API_KEY", { status: 500 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { message, conversationId, useLangGraph = true } = await req.json();
    
    // Use user ID as conversation ID if not provided for user-specific memory
    const effectiveConversationId = conversationId || user.id;

    let stream: ReadableStream;

    if (useLangGraph) {
      // Use LangGraph agent for company search capabilities
      const conversationManager = ConversationManager.getInstance();
      
      // Get conversation history if conversationId is provided
      let conversationHistory: BaseMessage[] = [];
      if (conversationId) {
        const messages = await conversationManager.getConversationMessages(conversationId);
        conversationHistory = messages.map(msg => 
          msg.role === 'user' 
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content)
        );
      }

      stream = await chatWithLangGraph(message, conversationHistory);
    } else {
      // Fallback to original memory-based agent
      const statsBefore = getConversationStats(effectiveConversationId);
      console.log(`Conversation ${effectiveConversationId} stats before:`, statsBefore);
      stream = await chatWithMemory(message, effectiveConversationId);
    }

    if (useLangGraph) {
      // LangGraph stream already returns a ReadableStream
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Conversation-Id": effectiveConversationId,
          "X-Use-LangGraph": "true",
        },
      });
    } else {
      // Transform stream for original agent
      const textEncoder = new TextEncoder();
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(textEncoder.encode(chunk.content));
        },
      });

      const statsBefore = getConversationStats(effectiveConversationId);
      return new Response(stream.pipeThrough(transformStream), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Conversation-Id": effectiveConversationId,
          "X-Token-Count": statsBefore.tokenCount.toString(),
          "X-Use-LangGraph": "false",
        },
      });
    }
  } catch (error) {
    console.error("Error in chat route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
}
