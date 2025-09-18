import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { companyTools } from "./tools/company-tools";
import { CompanySearchResult } from "@/types/chat";
import { getLangChainTracer, flushLangsmith, langsmithEnabled } from "./langsmith";

// System prompt for the company search assistant (Spanish)
const SYSTEM_PROMPT = `Eres un asistente de IA especializado en ayudar a usuarios a buscar empresas en Ecuador. Tienes acceso a una base de datos completa de empresas con información financiera y empresarial detallada.

## Herramientas Disponibles

Tienes acceso a las siguientes herramientas:
1. **search_companies**: Buscar empresas basado en consultas en lenguaje natural
2. **export_companies**: Exportar resultados de búsqueda a archivos Excel
3. **get_company_details**: Obtener información detallada sobre empresas específicas
4. **refine_search**: Refinar resultados de búsquedas previas

## Capacidades de Búsqueda

Puedes buscar empresas por:
- **Ubicación**: Las 24 provincias del Ecuador (usa nombres de provincia como PICHINCHA, GUAYAS, AZUAY, etc.)
- **Tamaño**: Rangos de número de empleados (micro: 1-9, pequeña: 10-49, mediana: 50-199, grande: 200+)
- **Métricas financieras**: Rangos de ingresos, activos, patrimonio, utilidad neta
- **Períodos de tiempo**: Años fiscales (2000-presente)
- **Identificadores de empresa**: Números RUC, nombres de empresa, nombres comerciales
- **Rentabilidad**: Empresas rentables/no rentables

## Mapeo de Provincias
- Quito → PICHINCHA
- Guayaquil → GUAYAS  
- Cuenca → AZUAY
- Machala → EL ORO
- Manta/Portoviejo → MANABI
- Ambato → TUNGURAHUA
- Y todas las demás ciudades principales a sus respectivas provincias

## Directrices de Respuesta

1. **Siempre usa herramientas** para buscar empresas en lugar de inventar información.
2. **Presenta resultados claramente** usando las tarjetas de empresa.
3. **Explica cómo están ordenados los resultados**. Menciona que los resultados se priorizan por la completitud de la información de contacto (nombre, teléfono) y la relevancia financiera. Informa al usuario que al "cargar más" se mostrará el siguiente grupo de empresas relevantes.
4. **Proporciona resúmenes concisos** de los criterios de búsqueda aplicados y el número total de resultados encontrados.
5. **Ofrece proactivamente la opción de exportar** los resultados a Excel, especialmente para listas grandes.
6. **Haz preguntas aclaratorias** si las consultas de los usuarios son ambiguas para asegurar que los filtros sean precisos.
7. **Sugiere refinamientos** si hay demasiados o muy pocos resultados (ej. "¿Quieres filtrar por una provincia específica?").

## Ejemplos de Interacciones

Usuario: "Muéstrame empresas rentables en Guayaquil"
→ Usar search_companies con consulta "empresas rentables en Guayaquil"
→ Presentar resultados con tarjetas de empresa
→ Ofrecer opción de exportación

Usuario: "Empresas con más de 100 empleados en tecnología"
→ Usar search_companies con filtros apropiados
→ Si hay demasiados resultados, sugerir agregar filtros de ubicación o ingresos

Usuario: "Exportar empresas manufactureras del 2023"
→ Usar export_companies con filtros apropiados
→ Proporcionar información de descarga

## Formato de Respuesta

- **Tono y Lenguaje**: Responde SIEMPRE en español, con un tono profesional pero amigable.
- **Jerarquía Clara**: Usa markdown (##, ###, **, listas) para estructurar tus respuestas. Empieza con un resumen general y luego entra en detalles.
- **Tablas Comparativas**: Cuando presentes varias empresas, después de las tarjetas de empresa, **incluye una tabla comparativa en formato markdown** que resuma las métricas clave (ej. Ingresos, Empleados, Utilidad, Provincia). Esto ayuda al usuario a comparar las opciones rápidamente.
- **Claridad**: Explica claramente los criterios de búsqueda aplicados y proporciona contexto útil sobre los resultados.
- **Proactividad**: Sugiere acciones adicionales (como exportar o refinar la búsqueda) cuando sea apropiado.

Recuerda: Siempre sé útil, preciso, y usa las herramientas disponibles para proporcionar datos reales en lugar de especulaciones.`;

// Lazily initialize the Gemini model and agent to avoid build-time env checks
let geminiModel: ChatGoogleGenerativeAI | null = null;
let langGraphAgentInstance: ReturnType<typeof createReactAgent> | null = null;

function getGeminiModel(): ChatGoogleGenerativeAI {
  if (!geminiModel) {
    const apiKey = process.env.GOOGLE_API_KEY || '';
    geminiModel = new ChatGoogleGenerativeAI({
      apiKey,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      temperature: 0.7,
      maxOutputTokens: 2048,
      maxRetries: 2,
    });
  }
  return geminiModel;
}

function getLangGraphAgent() {
  if (!langGraphAgentInstance) {
    langGraphAgentInstance = createReactAgent({
      llm: getGeminiModel(),
      tools: companyTools,
      messageModifier: SYSTEM_PROMPT,
    });
  }
  return langGraphAgentInstance;
}

// Enhanced chat function with LangGraph
export async function chatWithLangGraph(
  message: string, 
  conversationHistory: BaseMessage[] = [],
  options?: { userId?: string; conversationId?: string; projectName?: string; runName?: string }
): Promise<ReadableStream> {
  const userMessage = new HumanMessage(message);
  
  // Prepare initial state for the React agent
  const initialMessages = [...conversationHistory, userMessage];
  
  // Create a readable stream to return results
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let finalResponse = '';
        let searchResult: CompanySearchResult | undefined;
        
        // Execute the React agent
        const tracer = getLangChainTracer(options?.projectName);
        const result = await getLangGraphAgent().invoke(
          {
            messages: initialMessages,
          },
          {
            callbacks: langsmithEnabled ? [tracer] : undefined,
            tags: ["langgraph", "react-agent"],
            metadata: {
              userId: options?.userId,
              conversationId: options?.conversationId,
            },
            runName: options?.runName || "RCEC LangGraph Chat",
          }
        );
        
        // Get the final AI response
        if (result && result.messages && Array.isArray(result.messages)) {
          const lastMessage = result.messages[result.messages.length - 1];
          if (lastMessage && lastMessage.content) {
            finalResponse = lastMessage.content.toString();
          }
          
          // Extract search results from tool calls if available
          for (const msg of result.messages) {
            if (msg && 'tool_calls' in msg && msg.tool_calls && Array.isArray(msg.tool_calls)) {
              for (const toolCall of msg.tool_calls) {
                if (toolCall.name === 'search_companies') {
                  // Find corresponding tool response
                  const toolResponseIndex = result.messages.findIndex(
                    (m: BaseMessage, idx: number) => idx > result.messages.indexOf(msg) && 
                    m && 'tool_call_id' in m && (m as BaseMessage & { tool_call_id: string }).tool_call_id === toolCall.id
                  );
                  
                  if (toolResponseIndex !== -1) {
                    const toolResponse = result.messages[toolResponseIndex];
                    try {
                      const toolResult = JSON.parse(toolResponse.content.toString());
                      if (toolResult.success && toolResult.result) {
                        searchResult = toolResult.result;
                      }
                    } catch (e) {
                      console.warn('Failed to parse tool result:', e);
                    }
                  }
                }
              }
            }
          }
        }
        

        
        // Send the final response directly (no chunking to avoid controller issues)
        const responseText = finalResponse + (searchResult ? `\n\n[SEARCH_RESULTS]${JSON.stringify(searchResult)}[/SEARCH_RESULTS]` : '');
        controller.enqueue(new TextEncoder().encode(responseText));
        if (langsmithEnabled) {
          await flushLangsmith();
        }
        controller.close();
        
      } catch (error) {
        console.error('Error in LangGraph chat:', error);
        
        // More detailed error logging for production debugging
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
        
        // Check for specific error types
        let errorMessage = 'Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo.';
        
        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            errorMessage = 'Error de configuración: La clave API no está configurada correctamente.';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'La solicitud tardó demasiado tiempo. Por favor, intenta con una consulta más simple.';
          } else if (error.message.includes('rate limit') || error.message.includes('Too Many Requests') || error.message.includes('quota')) {
            errorMessage = 'Has excedido el límite de consultas diarias de la API. Por favor, espera hasta mañana o considera actualizar tu plan de Google AI.';
          } else if (error.message.includes('429')) {
            errorMessage = 'Límite de consultas alcanzado. El plan gratuito de Google Gemini permite 50 consultas por día. Intenta de nuevo mañana.';
          }
        }
        
        controller.enqueue(new TextEncoder().encode(errorMessage));
        controller.close();
      }
    },
  });
  
  return stream;
}

// Function to get conversation context from Supabase
export async function getConversationContext(): Promise<BaseMessage[]> {
  // This will be implemented when we update the conversation manager
  // For now, return empty array
  return [];
}

// Export accessor for the React agent for direct use if needed
export const langGraphAgent = {
  get: () => getLangGraphAgent(),
};
