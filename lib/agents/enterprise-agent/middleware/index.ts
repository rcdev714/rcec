/**
 * Sales Agent Middleware - Central Export
 * 
 * This module exports all middleware components for the sales agent:
 * - Tool Retry: Automatic retry with exponential backoff
 * - Model Fallback: Gemini model fallback chain
 * - PII Redaction: LATAM-specific PII detection and redaction
 * 
 * @module middleware
 */

// Tool Retry Middleware
export {
  executeWithRetry,
  wrapToolWithRetry,
  executeToolWithRetryOutput,
  isRetryableError,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  TOOL_RETRY_PRESETS,
  type RetryConfig,
  type ToolRetryConfig,
  type RetryResult,
} from './tool-retry';

// Model Fallback Middleware  
export {
  executeWithModelFallback,
  invokeWithFallback,
  getFallbackChainForModel,
  shouldFallbackToNextModel,
  getGeminiModelInstance,
  clearModelCache,
  GEMINI_FALLBACK_CHAIN,
  GEMINI_3_FALLBACK_CHAIN,
  type ModelConfig,
  type FallbackConfig,
  type FallbackResult,
  type ModelAttempt,
} from './model-fallback';

// PII Redaction Middleware
export {
  PIIRedactionMiddleware,
  LATAM_PII_RULES,
  redactPII,
  restorePII,
  redactMessages,
  redactMessage,
  redactToolInput,
  restoreToolInput,
  createRedactionMap,
  type PIIRule,
  type PIIRedactionConfig,
  type PIIAuditEvent,
  type RedactionMap,
  type RedactionResult,
} from './pii-redaction';

