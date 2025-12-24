
export type AgentModelName = 
  | 'gemini-3-pro-preview' 
  | 'gemini-2.5-pro' 
  | 'gemini-2.5-flash' 
  | 'gemini-2.5-flash-lite';

export type ThinkingLevel = 'high' | 'low';

export interface ToolPolicy {
  /**
   * Map of tool names to boolean enabled state.
   * If a tool is missing, it defaults to true (enabled).
   */
  allowedTools: Record<string, boolean | undefined>;
  
  /**
   * List of tool names that require human approval before execution.
   */
  requireApproval: string[];
}

export interface AgentSettings {
  modelName: string;
  thinkingLevel: ThinkingLevel;
  temperature: number;
  toolPolicy: ToolPolicy;
}

/**
 * Get the default temperature for a model based on Gemini API documentation.
 * Gemini 3 models should use temperature 1.0 (default) to avoid unexpected behavior.
 * Other models can use lower temperatures for more deterministic outputs.
 */
export function getDefaultTemperatureForModel(modelName: string): number {
  // Gemini 3 models: keep at default 1.0 per documentation
  // Changing temperature below 1.0 may lead to unexpected behavior, looping, or degraded performance
  if (modelName.startsWith('gemini-3')) {
    return 1.0;
  }
  // Gemini 2.5 and other models: use lower temperature for factual tasks
  return 0.2;
}

/**
 * Default settings for the agent
 */
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  modelName: 'gemini-2.5-pro',
  thinkingLevel: 'high',
  temperature: 0.2, // Default low temp for factual tasks (will be adjusted based on model)
  toolPolicy: {
    allowedTools: {
      // All tools enabled by default
      'search_companies': true,
      'search_companies_by_sector': true,
      'get_company_details': true,
      'refine_search': true,
      'tavily_web_search': true,
      'web_extract': true,
      'perplexity_search': true,
      'enrich_company_contacts': true,
      'list_user_offerings': true,
      'get_offering_details': true,
      'export_companies': true,
    },
    requireApproval: [
      'perplexity_search',
      'export_companies'
    ]
  }
};

/**
 * Merge settings from multiple sources with priority:
 * Request > Conversation > User > Default
 */
export function mergeAgentSettings(
  userDefaults?: Partial<AgentSettings> | null,
  conversationOverrides?: Partial<AgentSettings> | null,
  requestOverrides?: Partial<AgentSettings> | null
): AgentSettings {
  const base = { ...DEFAULT_AGENT_SETTINGS };

  // Track where modelName/temperature came from so we can keep temperature aligned to the chosen model.
  type Layer = 'request' | 'conversation' | 'user' | 'default';
  const modelNameSource: Layer =
    requestOverrides?.modelName !== undefined
      ? 'request'
      : conversationOverrides?.modelName !== undefined
        ? 'conversation'
        : userDefaults?.modelName !== undefined
          ? 'user'
          : 'default';
  const temperatureSource: Layer =
    requestOverrides?.temperature !== undefined
      ? 'request'
      : conversationOverrides?.temperature !== undefined
        ? 'conversation'
        : userDefaults?.temperature !== undefined
          ? 'user'
          : 'default';

  const modelName =
    requestOverrides?.modelName ??
    conversationOverrides?.modelName ??
    userDefaults?.modelName ??
    base.modelName;
  const thinkingLevel =
    requestOverrides?.thinkingLevel ??
    conversationOverrides?.thinkingLevel ??
    userDefaults?.thinkingLevel ??
    base.thinkingLevel;
  const temperatureCandidate =
    requestOverrides?.temperature ??
    conversationOverrides?.temperature ??
    userDefaults?.temperature ??
    base.temperature;
  
  // Merge layers
  const merged = {
    ...base,
    ...userDefaults,
    ...conversationOverrides,
    ...requestOverrides,
    modelName,
    thinkingLevel,
    temperature: temperatureCandidate,
  };

  // Deep merge toolPolicy
  // IMPORTANT: `requireApproval: []` must be treated as an explicit override (do NOT use `||`).
  const requireApprovalSource =
    requestOverrides?.toolPolicy?.requireApproval !== undefined
      ? requestOverrides.toolPolicy.requireApproval
      : conversationOverrides?.toolPolicy?.requireApproval !== undefined
        ? conversationOverrides.toolPolicy.requireApproval
        : userDefaults?.toolPolicy?.requireApproval !== undefined
          ? userDefaults.toolPolicy.requireApproval
          : base.toolPolicy.requireApproval;

  merged.toolPolicy = {
    allowedTools: {
      ...base.toolPolicy.allowedTools,
      ...(userDefaults?.toolPolicy?.allowedTools || {}),
      ...(conversationOverrides?.toolPolicy?.allowedTools || {}),
      ...(requestOverrides?.toolPolicy?.allowedTools || {}),
    },
    requireApproval: [...new Set(requireApprovalSource)],
  };

  // Keep temperature aligned to the selected model.
  // - Gemini 3: always force 1.0 (per documentation)
  // - Non-Gemini 3: if temperature came from a different layer than the model selection,
  //   reset to the recommended default for the selected model.
  if (merged.modelName.startsWith('gemini-3')) {
    merged.temperature = 1.0;
  } else if (temperatureSource !== modelNameSource) {
    merged.temperature = getDefaultTemperatureForModel(merged.modelName);
  }

  return merged;
}

