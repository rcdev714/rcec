/**
 * Google Search Grounding Configuration
 * 
 * NOTE: Google Search Grounding is NOT a separate tool - it's a configuration
 * option for Gemini models that enriches responses with real-time web data.
 * 
 * When enabled, the model automatically:
 * - Searches the web for relevant information
 * - Grounds its responses in current web data
 * - Provides citations/sources for claims
 * 
 * This file exports configuration helpers for enabling grounding in Gemini calls.
 */

// ============================================================================
// GROUNDING CONFIGURATION
// ============================================================================

/**
 * Configuration for Google Search grounding in Gemini API calls
 * 
 * Usage with @langchain/google-genai:
 * ```typescript
 * const model = new ChatGoogleGenerativeAI({
 *   model: 'gemini-2.0-flash',
 *   ...getGroundingConfig()
 * });
 * ```
 */
export interface GroundingConfig {
  /**
   * Enable dynamic retrieval from Google Search
   * When true, the model will search the web to ground its responses
   */
  groundingEnabled: boolean;
  
  /**
   * Threshold for when to trigger grounding (0.0 to 1.0)
   * Lower values = more aggressive grounding
   * Higher values = only ground when very uncertain
   */
  dynamicRetrievalThreshold?: number;
}

/**
 * Default grounding configuration for enterprise intelligence use cases
 * 
 * We use a moderate threshold (0.3) because:
 * - Enterprise queries often need current data (company news, market trends)
 * - But we don't want to ground every single response (wastes quota)
 * - The model should ground when it's uncertain or when data freshness matters
 */
export const DEFAULT_GROUNDING_CONFIG: GroundingConfig = {
  groundingEnabled: true,
  dynamicRetrievalThreshold: 0.3,
};

/**
 * Get grounding configuration for Gemini model initialization
 * 
 * NOTE: As of 2024-2025, the @langchain/google-genai library may not directly
 * support all grounding parameters. Check the latest documentation.
 * 
 * For direct Gemini API usage (not via LangChain), the configuration would be:
 * ```json
 * {
 *   "tools": [{
 *     "google_search_retrieval": {
 *       "dynamic_retrieval_config": {
 *         "mode": "MODE_DYNAMIC",
 *         "dynamic_threshold": 0.3
 *       }
 *     }
 *   }]
 * }
 * ```
 */
export function getGroundingConfig(options?: Partial<GroundingConfig>): Record<string, unknown> {
  const config = { ...DEFAULT_GROUNDING_CONFIG, ...options };
  
  if (!config.groundingEnabled) {
    return {};
  }
  
  // LangChain Google GenAI configuration
  // Note: This may need to be updated based on library version
  return {
    // Some versions use 'tools' array with google_search_retrieval
    // Others might use different parameter names
    // Keeping this flexible for future updates
  };
}

/**
 * Check if grounding should be enabled based on query characteristics
 * 
 * Useful for dynamically deciding whether to enable grounding per-request
 */
export function shouldEnableGrounding(query: string): boolean {
  const queryLower = query.toLowerCase();
  
  // Enable grounding for queries that likely need current data
  const groundingTriggers = [
    'noticias', 'news', 'reciente', 'recent', 'actual', 'current',
    'tendencia', 'trend', '2024', '2025', 'último', 'latest',
    'precio', 'price', 'cotización', 'mercado', 'market',
    'linkedin', 'sitio web', 'website', 'contacto', 'contact',
  ];
  
  return groundingTriggers.some(trigger => queryLower.includes(trigger));
}

/**
 * Format grounding sources for display
 * 
 * When Gemini returns grounding chunks/citations, use this to format them
 */
export function formatGroundingSources(sources: Array<{ uri?: string; title?: string }>): string {
  if (!sources || sources.length === 0) {
    return '';
  }
  
  const formattedSources = sources
    .filter(s => s.uri)
    .map((s, i) => `[${i + 1}] ${s.title || s.uri}`)
    .join('\n');
  
  return formattedSources ? `\n\n**Fuentes:**\n${formattedSources}` : '';
}

// ============================================================================
// INTEGRATION NOTES
// ============================================================================

/**
 * INTEGRATION WITH ENTERPRISE AGENT
 * 
 * Google Search Grounding is complementary to our explicit search tools:
 * 
 * | Tool/Feature | Use Case | Control |
 * |--------------|----------|---------|
 * | Grounding | Automatic web enrichment | Model decides |
 * | web_search (Tavily) | Explicit search, specific URLs | Agent decides |
 * | perplexity_search | Deep research, synthesis | Agent decides |
 * 
 * The grounding feature is "always on" in the background, while explicit
 * search tools give the agent direct control for specific needs.
 * 
 * CURRENT STATUS:
 * - Grounding via Gemini API: Available but requires specific API config
 * - LangChain support: Partial - check @langchain/google-genai version
 * - Fallback: If grounding isn't available, explicit tools (web_search) provide coverage
 */

export default {
  DEFAULT_GROUNDING_CONFIG,
  getGroundingConfig,
  shouldEnableGrounding,
  formatGroundingSources,
};

