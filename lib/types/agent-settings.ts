
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
 * Default settings for the agent
 */
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  modelName: 'gemini-2.5-flash',
  thinkingLevel: 'high',
  temperature: 0.2, // Default low temp for factual tasks
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
  
  // Merge layers
  const merged = {
    ...base,
    ...userDefaults,
    ...conversationOverrides,
    ...requestOverrides,
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

  return merged;
}

