/**
 * Tool Retry Middleware with Exponential Backoff
 * 
 * Provides automatic retry capabilities for tool executions with:
 * - Exponential backoff with jitter
 * - Configurable retry conditions per tool
 * - Structured error reporting
 * 
 * @module tool-retry
 */

import { ToolOutput } from "../state";

// ============================================================================
// TYPES
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs: number;
  /** Backoff multiplier (default: 2.0) */
  backoffFactor: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  jitter: boolean;
}

export interface ToolRetryConfig {
  /** Default retry config for all tools */
  defaultConfig: RetryConfig;
  /** Per-tool overrides */
  toolOverrides?: Record<string, Partial<RetryConfig>>;
  /** Custom retry condition - return true to retry */
  shouldRetry?: (error: Error, toolName: string, attempt: number) => boolean;
  /** Callback when a retry occurs */
  onRetry?: (toolName: string, attempt: number, error: Error, delayMs: number) => void;
  /** Callback when all retries exhausted */
  onExhausted?: (toolName: string, totalAttempts: number, finalError: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
  retryHistory: Array<{
    attempt: number;
    error: string;
    delayMs: number;
    timestamp: Date;
  }>;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2.0,
  jitter: true,
};

/**
 * Pre-configured retry settings for common tool types
 */
export const TOOL_RETRY_PRESETS: Record<string, Partial<RetryConfig>> = {
  // External API calls (Tavily, etc.) - more aggressive retries
  tavily_web_search: {
    maxRetries: 3,
    initialDelayMs: 1500,
    maxDelayMs: 15000,
    backoffFactor: 2.0,
  },
  web_extract: {
    maxRetries: 3,
    initialDelayMs: 2000,
    maxDelayMs: 20000,
    backoffFactor: 2.0,
  },
  // Database queries - faster retries, fewer attempts
  search_companies: {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffFactor: 1.5,
  },
  get_company_details: {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffFactor: 1.5,
  },
  // Contact enrichment - medium
  enrich_company_contacts: {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffFactor: 2.0,
  },
};

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Errors that should trigger a retry
 */
const RETRYABLE_ERROR_PATTERNS = [
  // Network errors
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /ECONNREFUSED/i,
  /fetch failed/i,
  /network/i,
  /timeout/i,
  /aborted/i,
  // Rate limiting
  /rate limit/i,
  /too many requests/i,
  /429/,
  // Service unavailable
  /503/,
  /502/,
  /service unavailable/i,
  /temporarily unavailable/i,
  // Database transient errors
  /connection pool/i,
  /deadlock/i,
  /lock wait timeout/i,
];

/**
 * Errors that should NOT trigger a retry (fatal)
 */
const NON_RETRYABLE_ERROR_PATTERNS = [
  // Authentication
  /unauthorized/i,
  /forbidden/i,
  /401/,
  /403/,
  // Not found
  /not found/i,
  /404/,
  // Bad request
  /invalid/i,
  /malformed/i,
  /400/,
  // API key issues
  /api key/i,
  /authentication/i,
  // Permission issues
  /permission denied/i,
];

/**
 * Determines if an error should trigger a retry
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Check for non-retryable patterns first (takes precedence)
  for (const pattern of NON_RETRYABLE_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return false;
    }
  }
  
  // Check for retryable patterns
  for (const pattern of RETRYABLE_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return true;
    }
  }
  
  // Default: don't retry unknown errors
  return false;
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: initialDelay * (backoffFactor ^ attempt)
  let delay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt);
  
  // Cap at maximum delay
  delay = Math.min(delay, config.maxDelayMs);
  
  // Add jitter (±25% randomness) to prevent thundering herd
  if (config.jitter) {
    const jitterRange = delay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    delay = Math.max(config.initialDelayMs, delay + jitter);
  }
  
  return Math.round(delay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN RETRY MIDDLEWARE
// ============================================================================

/**
 * Execute a function with retry logic
 * 
 * @example
 * ```typescript
 * const result = await executeWithRetry(
 *   () => searchCompaniesTool({ query: "tech companies" }),
 *   "search_companies",
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  toolName: string,
  config: Partial<ToolRetryConfig> = {}
): Promise<RetryResult<T>> {
  // Merge configs: defaults < tool presets < user overrides
  const toolPreset = TOOL_RETRY_PRESETS[toolName] || {};
  const userOverride = config.toolOverrides?.[toolName] || {};
  
  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...toolPreset,
    ...userOverride,
    ...(config.defaultConfig || {}),
  };
  
  const retryHistory: RetryResult<T>['retryHistory'] = [];
  let lastError: Error | null = null;
  let totalDelayMs = 0;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      
      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalDelayMs,
        retryHistory,
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      const shouldRetry = config.shouldRetry
        ? config.shouldRetry(lastError, toolName, attempt)
        : isRetryableError(lastError);
      
      // If this was the last attempt or error is not retryable, give up
      if (attempt >= retryConfig.maxRetries || !shouldRetry) {
        break;
      }
      
      // Calculate delay for next retry
      const delayMs = calculateDelay(attempt, retryConfig);
      totalDelayMs += delayMs;
      
      // Record retry attempt
      retryHistory.push({
        attempt: attempt + 1,
        error: lastError.message,
        delayMs,
        timestamp: new Date(),
      });
      
      // Callback for retry event
      if (config.onRetry) {
        config.onRetry(toolName, attempt + 1, lastError, delayMs);
      }
      
      console.log(
        `[ToolRetry] ${toolName} failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}). ` +
        `Retrying in ${delayMs}ms. Error: ${lastError.message}`
      );
      
      // Wait before retry
      await sleep(delayMs);
    }
  }
  
  // All retries exhausted
  if (config.onExhausted && lastError) {
    config.onExhausted(toolName, retryConfig.maxRetries + 1, lastError);
  }
  
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts: retryConfig.maxRetries + 1,
    totalDelayMs,
    retryHistory,
  };
}

// ============================================================================
// TOOL WRAPPER WITH RETRY
// ============================================================================

/**
 * Wrap a tool function with automatic retry capabilities
 * 
 * @example
 * ```typescript
 * const robustSearchTool = wrapToolWithRetry(
 *   searchCompaniesTool,
 *   "search_companies"
 * );
 * ```
 */
export function wrapToolWithRetry<TInput, TOutput>(
  toolFn: (input: TInput) => Promise<TOutput>,
  toolName: string,
  config?: Partial<ToolRetryConfig>
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const result = await executeWithRetry(
      () => toolFn(input),
      toolName,
      config
    );
    
    if (result.success && result.result !== undefined) {
      return result.result;
    }
    
    // Throw enriched error with retry information
    const error = result.error || new Error('Tool execution failed');
    (error as any).retryAttempts = result.attempts;
    (error as any).totalDelayMs = result.totalDelayMs;
    (error as any).retryHistory = result.retryHistory;
    
    throw error;
  };
}

// ============================================================================
// TOOL OUTPUT WITH RETRY METADATA
// ============================================================================

/**
 * Execute tool and return ToolOutput with retry metadata
 */
export async function executeToolWithRetryOutput(
  toolFn: () => Promise<unknown>,
  toolName: string,
  toolCallId: string,
  input: Record<string, unknown>,
  config?: Partial<ToolRetryConfig>
): Promise<ToolOutput> {
  const startTime = new Date();
  
  const result = await executeWithRetry(
    toolFn,
    toolName,
    {
      ...config,
      onRetry: (name, attempt, error, delayMs) => {
        console.log(`[executeToolWithRetryOutput] ${name} retry ${attempt}: ${error.message} (waiting ${delayMs}ms)`);
      },
    }
  );
  
  return {
    toolName,
    toolCallId,
    input,
    output: result.success ? result.result : { error: result.error?.message },
    success: result.success,
    timestamp: startTime,
    errorMessage: result.success ? undefined : result.error?.message,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  executeWithRetry,
  wrapToolWithRetry,
  executeToolWithRetryOutput,
  isRetryableError,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  TOOL_RETRY_PRESETS,
};

