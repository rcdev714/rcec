import { chatWithMemory, getConversationStats } from "@/lib/chat-agent";
import { chatWithLangGraph } from "@/lib/chat-agent-langgraph";
import { chatWithSalesAgent } from "@/lib/agents/sales-agent";
import { createClient } from "@/lib/supabase/server";
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

    const { message, conversationId, useLangGraph = true, useSalesAgent = true, model } = await req.json();

    // Use user ID as conversation ID if not provided for user-specific memory
    const effectiveConversationId = conversationId || user.id;

    // Check and track prompt usage before processing
    const inputTokensEstimate = estimateTokensFromTextLength(message);
    const selectedModel = model || "gemini-2.5-flash"; // Default model
    const promptCheck = await ensurePromptAllowedAndTrack(user.id, {
      model: selectedModel,
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

    // Shared LangSmith configuration
    const langsmithConfig = {
      projectName: process.env.LANGSMITH_PROJECT || "rcec-chat",
    };

    // Fetch conversation history once for LangGraph-based agents (server-side)
    let conversationHistory: BaseMessage[] = [];
    if (conversationId && (useSalesAgent || useLangGraph)) {
      const { data: messages, error } = await supabase
        .from('conversation_messages')
        .select('role, content, metadata, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && messages) {
        conversationHistory = messages.map(msg => {
          if (msg.role === 'user') {
            return new HumanMessage(msg.content);
          } else {
            // For assistant messages, include search results in content if available (for sales agent)
            let content = msg.content;
            
            // If this message had search results, append a summary
            if (useSalesAgent && msg.metadata?.searchResult) {
              const sr = msg.metadata.searchResult;
              const companiesSummary = sr.companies?.slice(0, 3).map((c: any) => 
                `- ${c.nombre_comercial || c.nombre} (RUC: ${c.ruc}, Empleados: ${c.n_empleados || 'N/A'}, Ingresos: $${c.ingresos_ventas?.toLocaleString() || 'N/A'})`
              ).join('\n') || '';
              
              content += `\n\n[PREVIOUS_SEARCH_RESULTS]\nEncontré ${sr.totalCount} empresas para "${sr.query}". Las principales fueron:\n${companiesSummary}\n[/PREVIOUS_SEARCH_RESULTS]`;
            }
            
            return new AIMessage(content);
          }
        });
      }
    }

    let stream: ReadableStream;

    if (useSalesAgent) {
      // Use new Sales Agent with StateGraph and checkpointing
      stream = await chatWithSalesAgent(message, conversationHistory, {
        userId: user.id,
        conversationId: effectiveConversationId,
        ...langsmithConfig,
        runName: "Sales Agent Chat",
        modelName: selectedModel,
      });
    } else if (useLangGraph) {
      // Fallback to simple LangGraph React agent
      stream = await chatWithLangGraph(message, conversationHistory, {
        userId: user.id,
        conversationId: effectiveConversationId,
        ...langsmithConfig,
        runName: "RCEC Chat (LangGraph)",
        modelName: selectedModel,
      });
    } else {
      // Fallback to original memory-based agent
      const statsBefore = getConversationStats(effectiveConversationId);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Conversation ${effectiveConversationId} stats before:`, statsBefore);
      }
      stream = await chatWithMemory(message, effectiveConversationId, selectedModel);
    }

    if (useSalesAgent || useLangGraph) {
      // LangGraph stream already returns a ReadableStream
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Conversation-Id": effectiveConversationId,
          "X-Use-Sales-Agent": useSalesAgent ? "true" : "false",
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
