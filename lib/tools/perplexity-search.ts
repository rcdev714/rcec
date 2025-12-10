import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// ============================================================================
// FALLBACK CONFIGURATION
// ============================================================================

/**
 * When Perplexity fails (no credits, rate limit, etc.), fallback to Tavily
 * This ensures the agent doesn't get stuck when Perplexity is unavailable
 */
async function fallbackToTavily(query: string): Promise<{
  success: boolean;
  answer?: string;
  citations?: Array<{ index: number; url: string }>;
  citationsCount?: number;
  source: string;
  error?: string;
}> {
  console.log('[perplexitySearch] Falling back to Tavily web_search');
  
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    return {
      success: false,
      error: 'No fallback available: TAVILY_API_KEY not configured',
      source: 'none',
    };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        max_results: 10,
        search_depth: 'advanced', // Use advanced for better research results
        include_answer: true,
        include_raw_content: false,
        include_images: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily fallback failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Format results similar to Perplexity output
    const citations = (data.results || []).map((r: { url: string }, i: number) => ({
      index: i + 1,
      url: r.url,
    }));

    return {
      success: true,
      answer: data.answer || data.results?.map((r: { content: string }) => r.content).join('\n\n') || 'No results found',
      citations,
      citationsCount: citations.length,
      source: 'tavily_fallback',
    };
  } catch (error) {
    console.error('[perplexitySearch] Tavily fallback also failed:', error);
    return {
      success: false,
      error: `Fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source: 'tavily_fallback',
    };
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityCitation {
  url: string;
  text?: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  citations?: PerplexityCitation[] | string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// PERPLEXITY SEARCH TOOL
// ============================================================================

/**
 * Deep research tool using Perplexity API
 * 
 * Use this for complex research queries that require:
 * - Multi-source synthesis
 * - Market analysis and trends
 * - Comprehensive answers with citations
 * - Questions that need real-time web data + reasoning
 */
export const perplexitySearchTool = tool(
  async ({ 
    query, 
    searchFocus = 'internet',
    returnCitations = true,
  }: { 
    query: string; 
    searchFocus?: 'internet' | 'academic' | 'news' | 'youtube' | 'reddit';
    returnCitations?: boolean;
  }) => {
    try {
      const apiKey = process.env.PERPLEXITY_API_KEY;
      
      // If no API key, immediately fallback to Tavily
      if (!apiKey) {
        console.log('[perplexitySearch] No PERPLEXITY_API_KEY, using Tavily fallback');
        const fallbackResult = await fallbackToTavily(query);
        return {
          ...fallbackResult,
          note: 'Perplexity not configured - used Tavily as fallback',
        };
      }

      // Build messages for the Perplexity chat completion API
      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: `You are a research assistant specializing in business intelligence. 
Provide comprehensive, factual answers with specific details when available.
Focus on: company information, market data, industry trends, and business contacts.
Always cite your sources when possible.
Respond in the same language as the user's query.`,
        },
        {
          role: 'user',
          content: query,
        },
      ];

      // Select model based on search focus
      // sonar-pro is the most capable for complex research
      // sonar is faster and cheaper for simpler queries
      const model = searchFocus === 'academic' 
        ? 'sonar-pro' 
        : 'sonar';

      // Call Perplexity API with timeout and retry logic
      const makeRequest = async (retryCount: number = 0): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.2, // Lower temperature for more factual responses
              max_tokens: 2048,
              return_citations: returnCitations,
              search_domain_filter: searchFocus === 'news' ? ['news'] : undefined,
              search_recency_filter: searchFocus === 'news' ? 'week' : undefined,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);

          // Retry logic for network errors (up to 2 retries)
          if (retryCount < 2 && error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error('Perplexity API request timed out after 30 seconds');
            }

            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`[perplexitySearch] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, delay));

            return makeRequest(retryCount + 1);
          }

          throw error;
        }
      };

      const response = await makeRequest();

      if (!response.ok) {
        const _errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases - fallback to Tavily for recoverable errors
        if (response.status === 401) {
          console.log('[perplexitySearch] Invalid API key, falling back to Tavily');
          const fallbackResult = await fallbackToTavily(query);
          return {
            ...fallbackResult,
            note: 'Perplexity API key invalid - used Tavily as fallback',
          };
        }
        if (response.status === 429 || response.status === 402) {
          // 429 = rate limit, 402 = payment required (no credits)
          console.log('[perplexitySearch] Rate limit or no credits, falling back to Tavily');
          const fallbackResult = await fallbackToTavily(query);
          return {
            ...fallbackResult,
            note: 'Perplexity rate limit/credits exhausted - used Tavily as fallback',
          };
        }
        
        // For other errors, also fallback
        console.log('[perplexitySearch] API error, falling back to Tavily:', response.status);
        const fallbackResult = await fallbackToTavily(query);
        return {
          ...fallbackResult,
          note: `Perplexity error (${response.status}) - used Tavily as fallback`,
        };
      }

      const data: PerplexityResponse = await response.json();

      // Extract the response content
      const content = data.choices?.[0]?.message?.content || '';
      
      // Extract citations if available
      const citations = data.citations || [];
      const formattedCitations = citations.map((c, i) => {
        if (typeof c === 'string') {
          return { index: i + 1, url: c };
        }
        return { index: i + 1, url: c.url, text: c.text };
      });

      return {
        success: true,
        answer: content,
        citations: formattedCitations,
        citationsCount: formattedCitations.length,
        model: data.model,
        usage: data.usage,
        query,
        searchFocus,
      };
    } catch (error) {
      console.error('[perplexitySearch] Error, attempting Tavily fallback:', error);
      
      // Always try fallback on error
      const fallbackResult = await fallbackToTavily(query);
      if (fallbackResult.success) {
        return {
          ...fallbackResult,
          note: `Perplexity failed (${error instanceof Error ? error.message : 'unknown'}) - used Tavily as fallback`,
        };
      }
      
      // Both failed
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during Perplexity search',
        fallbackError: fallbackResult.error,
        suggestion: 'Both Perplexity and Tavily failed. Try tavily_web_search directly or simplify your query.',
      };
    }
  },
  {
    name: 'perplexity_search',
    description: `⚠️ HERRAMIENTA COSTOSA - USAR SOLO COMO ÚLTIMO RECURSO ⚠️

Investigación profunda con síntesis multi-fuente. SOLO usar cuando tavily_web_search NO sea suficiente.

**PRIORIDAD DE BÚSQUEDA WEB (SIEMPRE seguir este orden):**
1. 🥇 tavily_web_search - PRIMERA opción para cualquier búsqueda web
2. 🥈 web_extract - Para extraer datos de URLs específicas
3. 🥉 perplexity_search - SOLO si las anteriores no resuelven la consulta

**CUÁNDO USAR perplexity_search:**
- SOLO después de que tavily_web_search no haya dado resultados útiles
- Preguntas académicas complejas que requieren papers/estudios
- Síntesis de temas muy específicos con múltiples perspectivas

**⛔ NO USAR para:**
- Búsquedas generales de mercado → usa tavily_web_search
- Noticias de empresas → usa tavily_web_search
- Encontrar sitios web/contactos → usa tavily_web_search
- Cualquier búsqueda que tavily_web_search pueda resolver

**FALLBACK:** Si Perplexity falla (sin créditos), automáticamente usa Tavily.`,
    schema: z.object({
      query: z.string().describe('La pregunta o tema de investigación. Sé específico para mejores resultados.'),
      searchFocus: z.enum(['internet', 'academic', 'news', 'youtube', 'reddit'])
        .optional()
        .default('internet')
        .describe('Tipo de fuentes a priorizar'),
      returnCitations: z.boolean()
        .optional()
        .default(true)
        .describe('Incluir URLs de las fuentes citadas'),
    }),
  }
);

// Export for use in the agent
export default perplexitySearchTool;

