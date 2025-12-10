/**
 * Model Fallback Middleware
 * 
 * Provides automatic model fallback capabilities for LLM calls with:
 * - Configurable fallback chain
 * - Per-model error handling
 * - Automatic model switching on failures
 * - Telemetry and logging
 * 
 * @module model-fallback
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage, AIMessage } from "@langchain/core/messages";

// ============================================================================
// TYPES
// ============================================================================

export interface ModelConfig {
  /** Model name/ID */
  name: string;
  /** Priority (lower = tried first) */
  priority: number;
  /** Maximum retries for this model before fallback */
  maxRetries?: number;
  /** Custom temperature for this model */
  temperature?: number;
  /** API version override */
  apiVersion?: string;
  /** Model-specific flags */
  flags?: {
    supportsTools?: boolean;
    supportsThinking?: boolean;
    isPreview?: boolean;
  };
}

export interface FallbackConfig {
  /** Ordered list of models to try */
  models: ModelConfig[];
  /** Default max retries per model */
  defaultMaxRetries?: number;
  /** Callback when model switch occurs */
  onFallback?: (
    fromModel: string,
    toModel: string,
    error: Error,
    attempt: number
  ) => void;
  /** Callback when all models exhausted */
  onExhausted?: (attempts: ModelAttempt[]) => void;
}

export interface ModelAttempt {
  model: string;
  attempt: number;
  error?: string;
  duration?: number;
  timestamp: Date;
}

export interface FallbackResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  modelUsed: string;
  attempts: ModelAttempt[];
  totalDuration: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default Gemini model fallback chain
 * Ordered by reliability and cost-effectiveness
 */
export const GEMINI_FALLBACK_CHAIN: ModelConfig[] = [
  {
    name: "gemini-2.5-flash",
    priority: 1,
    temperature: 0.2,
    flags: { supportsTools: true, supportsThinking: false },
  },
  {
    name: "gemini-2.5-pro",
    priority: 2,
    temperature: 0.1,
    flags: { supportsTools: true, supportsThinking: false },
  },
  {
    name: "gemini-1.5-flash",
    priority: 3,
    temperature: 0.3,
    flags: { supportsTools: true, supportsThinking: false },
  },
  {
    name: "gemini-1.5-pro",
    priority: 4,
    temperature: 0.2,
    flags: { supportsTools: true, supportsThinking: false },
  },
];

/**
 * Gemini 3 experimental chain (for when user requests Gemini 3)
 */
export const GEMINI_3_FALLBACK_CHAIN: ModelConfig[] = [
  {
    name: "gemini-2.5-pro", // Upgraded from Gemini 3 due to API compatibility issues
    priority: 1,
    temperature: 0.1,
    flags: { supportsTools: true, supportsThinking: false },
  },
  {
    name: "gemini-2.5-flash",
    priority: 2,
    temperature: 0.2,
    flags: { supportsTools: true, supportsThinking: false },
  },
  {
    name: "gemini-1.5-pro",
    priority: 3,
    temperature: 0.2,
    flags: { supportsTools: true, supportsThinking: false },
  },
];

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Errors that indicate we should try a different model
 */
const MODEL_FALLBACK_ERROR_PATTERNS = [
  // Rate limiting
  /rate limit/i,
  /429/,
  /too many requests/i,
  /quota exceeded/i,
  // Model unavailable
  /model.*unavailable/i,
  /503/,
  /502/,
  /service unavailable/i,
  // Model-specific issues
  /model not found/i,
  /model.*not supported/i,
  /unsupported model/i,
  // Capability errors
  /does not support/i,
  /cannot.*tools/i,
  /thinking.*not supported/i,
  // Region/availability
  /not available.*region/i,
  /preview.*not available/i,
  // API version issues
  /unknown name.*tools/i,
  /invalid json payload/i,
];

/**
 * Errors that are fatal and should not trigger fallback
 */
const FATAL_ERROR_PATTERNS = [
  // Authentication
  /invalid api key/i,
  /api key.*invalid/i,
  /authentication failed/i,
  // Bad request (likely prompt issue)
  /content.*blocked/i,
  /safety/i,
  /harmful/i,
  // Context length
  /context length/i,
  /too long/i,
  /maximum.*tokens/i,
];

/**
 * Determines if an error should trigger model fallback
 */
export function shouldFallbackToNextModel(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Check for fatal errors first
  for (const pattern of FATAL_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return false;
    }
  }
  
  // Check for fallback-triggering errors
  for (const pattern of MODEL_FALLBACK_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // Default: try fallback for unknown errors (be resilient)
  return true;
}

// ============================================================================
// MODEL INSTANCE MANAGEMENT
// ============================================================================

const modelCache = new Map<string, ChatGoogleGenerativeAI>();

/**
 * Get or create a Gemini model instance
 */
export function getGeminiModelInstance(config: ModelConfig): ChatGoogleGenerativeAI {
  const cacheKey = `${config.name}-${config.temperature}-${config.apiVersion}`;
  
  // In development, always create fresh instances
  if (process.env.NODE_ENV === 'development') {
    modelCache.delete(cacheKey);
  }
  
  if (!modelCache.has(cacheKey)) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
    
    const isGemini3 = config.name.startsWith('gemini-3');
    
    const model = new ChatGoogleGenerativeAI({
      apiKey,
      model: config.name,
      temperature: config.temperature ?? 0.2,
      maxOutputTokens: 8192,
      ...(config.apiVersion && { apiVersion: config.apiVersion }),
      ...(isGemini3 && !config.apiVersion && { apiVersion: 'v1beta' }),
    });
    
    modelCache.set(cacheKey, model);
  }
  
  return modelCache.get(cacheKey)!;
}

/**
 * Clear model cache (useful for testing or config changes)
 */
export function clearModelCache(): void {
  modelCache.clear();
}

// ============================================================================
// MAIN FALLBACK MIDDLEWARE
// ============================================================================

/**
 * Execute a model call with automatic fallback
 * 
 * @example
 * ```typescript
 * const result = await executeWithModelFallback(
 *   async (model) => {
 *     const response = await model.invoke(messages);
 *     return response;
 *   },
 *   { models: GEMINI_FALLBACK_CHAIN }
 * );
 * ```
 */
export async function executeWithModelFallback<T>(
  fn: (model: ChatGoogleGenerativeAI, modelConfig: ModelConfig) => Promise<T>,
  config: FallbackConfig
): Promise<FallbackResult<T>> {
  const attempts: ModelAttempt[] = [];
  const startTime = Date.now();
  
  // Sort models by priority
  const sortedModels = [...config.models].sort((a, b) => a.priority - b.priority);
  
  for (const modelConfig of sortedModels) {
    const maxRetries = modelConfig.maxRetries ?? config.defaultMaxRetries ?? 1;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      const attemptStart = Date.now();
      
      try {
        const model = getGeminiModelInstance(modelConfig);
        const result = await fn(model, modelConfig);
        
        attempts.push({
          model: modelConfig.name,
          attempt: retry + 1,
          duration: Date.now() - attemptStart,
          timestamp: new Date(),
        });
        
        return {
          success: true,
          result,
          modelUsed: modelConfig.name,
          attempts,
          totalDuration: Date.now() - startTime,
        };
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        attempts.push({
          model: modelConfig.name,
          attempt: retry + 1,
          error: errorMessage,
          duration: Date.now() - attemptStart,
          timestamp: new Date(),
        });
        
        console.log(
          `[ModelFallback] ${modelConfig.name} failed (attempt ${retry + 1}/${maxRetries}): ${errorMessage}`
        );
        
        // Check if we should try a different model
        const shouldFallback = error instanceof Error && shouldFallbackToNextModel(error);
        
        // If last retry for this model, try next model
        if (retry === maxRetries - 1) {
          const nextModel = sortedModels[sortedModels.indexOf(modelConfig) + 1];
          
          if (nextModel && shouldFallback) {
            console.log(
              `[ModelFallback] Falling back from ${modelConfig.name} to ${nextModel.name}`
            );
            
            if (config.onFallback) {
              config.onFallback(
                modelConfig.name,
                nextModel.name,
                error instanceof Error ? error : new Error(String(error)),
                attempts.length
              );
            }
          }
        }
        
        // If error is fatal, don't retry this model but might try others
        if (error instanceof Error && !shouldFallback) {
          console.log(
            `[ModelFallback] Fatal error for ${modelConfig.name}, skipping retries`
          );
          
          // For authentication errors, all models share the same API key - return early
          // to avoid wasting requests that will all fail
          if (/invalid api key|api key.*invalid|authentication failed/i.test(error.message)) {
            console.log(`[ModelFallback] Authentication error - returning early (all models share same key)`);
            return {
              success: false,
              error,
              modelUsed: modelConfig.name,
              attempts,
              totalDuration: Date.now() - startTime,
            };
          }
          
          break;
        }
      }
    }
  }
  
  // All models exhausted
  const lastError = attempts[attempts.length - 1]?.error || 'All models failed';
  
  if (config.onExhausted) {
    config.onExhausted(attempts);
  }
  
  return {
    success: false,
    error: new Error(lastError),
    modelUsed: attempts[attempts.length - 1]?.model || 'none',
    attempts,
    totalDuration: Date.now() - startTime,
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Invoke model with messages using fallback chain
 */
export async function invokeWithFallback(
  messages: BaseMessage[],
  options: {
    preferredModel?: string;
    tools?: any[];
    fallbackChain?: ModelConfig[];
    onFallback?: FallbackConfig['onFallback'];
  } = {}
): Promise<FallbackResult<AIMessage>> {
  // Determine which fallback chain to use
  let chain = options.fallbackChain || GEMINI_FALLBACK_CHAIN;
  
  // If user requested Gemini 3, use the Gemini 3 chain
  if (options.preferredModel?.startsWith('gemini-3')) {
    chain = GEMINI_3_FALLBACK_CHAIN;
  }
  
  // If a specific model is preferred, put it first
  if (options.preferredModel && !options.preferredModel.startsWith('gemini-3')) {
    const preferredConfig = chain.find(m => m.name === options.preferredModel);
    if (preferredConfig) {
      chain = [
        { ...preferredConfig, priority: 0 },
        ...chain.filter(m => m.name !== options.preferredModel),
      ];
    }
  }
  
  return executeWithModelFallback(
    async (model, config) => {
      // Bind tools if provided and model supports them
      const effectiveModel = options.tools && config.flags?.supportsTools !== false
        ? model.bindTools(options.tools)
        : model;
      
      const response = await effectiveModel.invoke(messages);
      return response as AIMessage;
    },
    {
      models: chain,
      defaultMaxRetries: 2,
      onFallback: options.onFallback || ((from, to, error) => {
        console.log(`[invokeWithFallback] Switched from ${from} to ${to}: ${error.message}`);
      }),
    }
  );
}

/**
 * Get the recommended fallback chain for a model selection
 */
export function getFallbackChainForModel(modelName: string): ModelConfig[] {
  if (modelName.startsWith('gemini-3')) {
    return GEMINI_3_FALLBACK_CHAIN;
  }
  
  // Move the requested model to the front if it exists
  const chain = [...GEMINI_FALLBACK_CHAIN];
  const requestedIndex = chain.findIndex(m => m.name === modelName);
  
  if (requestedIndex > 0) {
    const [requested] = chain.splice(requestedIndex, 1);
    chain.unshift({ ...requested, priority: 0 });
  }
  
  return chain;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  executeWithModelFallback,
  invokeWithFallback,
  getFallbackChainForModel,
  shouldFallbackToNextModel,
  getGeminiModelInstance,
  clearModelCache,
  GEMINI_FALLBACK_CHAIN,
  GEMINI_3_FALLBACK_CHAIN,
};

