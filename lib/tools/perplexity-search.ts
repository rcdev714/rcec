import { tool } from '@langchain/core/tools';
import { z } from 'zod';

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
      
      if (!apiKey) {
        return {
          success: false,
          error: 'Perplexity API is not configured. Please add PERPLEXITY_API_KEY to environment variables.',
          fallbackSuggestion: 'Use web_search as an alternative for web research.',
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
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Invalid Perplexity API key. Please check your PERPLEXITY_API_KEY.');
        }
        if (response.status === 429) {
          throw new Error('Perplexity rate limit exceeded. Please try again later.');
        }
        
        throw new Error(`Perplexity API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
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
      console.error('Perplexity search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during Perplexity search',
        fallbackSuggestion: 'Use web_search as an alternative for web research.',
      };
    }
  },
  {
    name: 'perplexity_search',
    description: `Investigación profunda usando Perplexity AI - ideal para consultas complejas que requieren síntesis de múltiples fuentes.

**CUÁNDO USAR:**
- Análisis de mercado y tendencias de industria
- Preguntas complejas que requieren razonamiento + datos web
- Cuando necesitas una respuesta sintetizada con fuentes citadas
- Investigación que va más allá de búsqueda simple

**CUÁNDO NO USAR:**
- Búsquedas simples de empresas (usa search_companies)
- Búsqueda de URLs específicas (usa web_search)
- Extracción de datos de páginas (usa web_extract)

**EJEMPLOS:**
- "¿Cuáles son las tendencias del sector fintech en Latinoamérica 2024?"
- "Análisis del mercado de delivery en Ecuador"
- "¿Cómo está evolucionando la industria de energías renovables en la región?"

**FOCUS OPTIONS:**
- internet: Búsqueda general (default)
- news: Enfocado en noticias recientes
- academic: Fuentes académicas y papers`,
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

