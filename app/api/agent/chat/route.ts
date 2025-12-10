import { chatWithMemory, getConversationStats } from "@/lib/chat-agent";
import { chatWithLangGraph } from "@/lib/chat-agent-langgraph";
import { chatWithEnterpriseAgent } from "@/lib/agents/enterprise-agent";
import { createClient } from "@/lib/supabase/server";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { validateEnvironment } from "@/lib/env-validation";
import { ensurePromptAllowedAndTrack, estimateTokensFromTextLength } from "@/lib/usage";

// Use Node.js runtime for full compatibility with LangChain and streaming
// Edge runtime has limitations with certain Node.js APIs
export const runtime = "nodejs";
export const maxDuration = 180; // 3 minutes for complex agentic workflows

export async function POST(req: Request) {
  // Validate environment variables
  const envValidation = validateEnvironment();
  if (!envValidation.isValid) {
    console.error("Environment validation failed:", envValidation.missing);

    // Provide user-friendly error message
    let userMessage = "Error de configuración del servidor. ";
    if (envValidation.missing.includes('GOOGLE_API_KEY')) {
      userMessage += "La clave API de Google no está configurada. El chat AI requiere esta configuración para funcionar.";
    } else {
      userMessage += "Faltan variables de entorno necesarias. Por favor contacta al administrador.";
    }

    return new Response(
      JSON.stringify({
        error: "Configuration error",
        message: userMessage,
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

    const { message, conversationId, useLangGraph = true, useSalesAgent = true, model, thinkingLevel = 'high' } = await req.json();

    // Use user ID as conversation ID if not provided for user-specific memory
    const effectiveConversationId = conversationId || user.id;

    // Check and track prompt usage before processing
    const inputTokensEstimate = estimateTokensFromTextLength(message);
    const selectedModel = model || "gemini-2.5-flash"; // Default model

    // Model access validation removed - all models available to all users
    /*
    if (selectedModel === 'gemini-2.5-pro' || selectedModel === 'gemini-3-pro-preview') {
      const subscription = await getUserSubscription(user.id);
      const plan = (subscription?.plan as 'FREE' | 'PRO' | 'ENTERPRISE') || 'FREE';
      const canAccessProModels = canAccessFeatureSync(plan, 'advanced_reasoning_models');
      
      if (!canAccessProModels) {
        const modelName = selectedModel === 'gemini-3-pro-preview' ? 'Gemini 3 Pro Preview' : 'gemini-2.5-pro';
        return new Response(
          JSON.stringify({
            error: "Model access denied",
            message: `El modelo de razonamiento avanzado (${modelName}) requiere un plan Pro o Enterprise. Por favor actualiza tu plan.`,
            upgradeUrl: "/pricing",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    */

    const promptCheck = await ensurePromptAllowedAndTrack(user.id, {
      model: selectedModel,
      inputTokensEstimate,
    });

    if (!promptCheck.allowed) {
      const remainingAmount = promptCheck.remainingDollars !== undefined
        ? `$${promptCheck.remainingDollars.toFixed(2)}`
        : 'unlimited';
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Has excedido tu límite mensual de uso del agente. Saldo restante: ${remainingAmount}. Actualiza tu plan para continuar usando el chat.`,
          upgradeUrl: "/pricing",
          remainingDollars: promptCheck.remainingDollars,
          estimatedCost: promptCheck.estimatedCost,
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
      // Use new Enterprise Agent with StateGraph and checkpointing
      stream = await chatWithEnterpriseAgent(message, conversationHistory, {
        userId: user.id,
        conversationId: effectiveConversationId,
        ...langsmithConfig,
        runName: "Enterprise Agent Chat",
        modelName: selectedModel,
        thinkingLevel: thinkingLevel as 'high' | 'low',
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
