import { chatWithMemory, getConversationStats } from "@/lib/chat-agent";
import { chatWithLangGraph } from "@/lib/chat-agent-langgraph";
import { createClient } from "@/lib/supabase/server";
import ConversationManager from "@/lib/conversation-manager";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { validateEnvironment } from "@/lib/env-validation";
import { ensurePromptAllowedAndTrack, estimateTokensFromTextLength } from "@/lib/usage";

// Use Node.js runtime for full compatibility with LangChain and streaming
// Edge runtime has limitations with certain Node.js APIs
export const runtime = "nodejs";
export const maxDuration = 30; // Maximum allowed duration for Vercel Hobby plan

export async function POST(req: Request) {
  // Validate environment variables
  const envValidation = validateEnvironment();
  if (!envValidation.isValid) {
    console.error("Environment validation failed:", envValidation.missing);
    return new Response(
      JSON.stringify({ 
        error: "Configuration error", 
        message: "Required environment variables are missing. Please check your configuration.", 
        missing: envValidation.missing
      }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
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

    // Check and track prompt usage before processing
    const inputTokensEstimate = estimateTokensFromTextLength(message);
    const promptCheck = await ensurePromptAllowedAndTrack(user.id, {
      model: "gemini-2.5-flash", // Default model
      inputTokensEstimate,
    });

    if (!promptCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: "Has excedido tu límite mensual de prompts. Actualiza tu plan para continuar usando el chat.",
          upgradeUrl: "/pricing",
          remainingPrompts: promptCheck.remainingPrompts,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

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

      stream = await chatWithLangGraph(message, conversationHistory, {
        userId: user.id,
        conversationId: effectiveConversationId,
        projectName: process.env.LANGSMITH_PROJECT || "rcec-chat",
        runName: "RCEC Chat (LangGraph)",
      });
    } else {
      // Fallback to original memory-based agent
      const statsBefore = getConversationStats(effectiveConversationId);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Conversation ${effectiveConversationId} stats before:`, statsBefore);
      }
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
    
    // Detailed error response for better debugging
    const errorDetails = {
      error: "Chat processing failed",
      message: error instanceof Error ? error.message : "An unknown error occurred",
      timestamp: new Date().toISOString(),
      // Include stack trace in non-production environments for debugging
      ...(process.env.NODE_ENV !== 'production' && error instanceof Error ? { stack: error.stack } : {})
    };
    
    return new Response(
      JSON.stringify(errorDetails), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
