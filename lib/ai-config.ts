/**
 * Centralized AI Configuration
 * 
 * Single source of truth for:
 * - Model pricing (base API costs from Google)
 * - Revenue multiplier (profit margin)
 * - Model-specific settings
 * 
 * Update this file when:
 * - Google changes Gemini pricing
 * - Adding new models
 * - Adjusting profit margins
 */

/**
 * Revenue multiplier applied to base API costs
 * This represents the markup for the service
 * 
 * Example: 20x means $0.30/M input becomes $6.00/M charged to user
 */
export const PROFIT_MARGIN_MULTIPLIER = 20;

/**
 * Official Gemini API pricing per 1M tokens (USD)
 * Source: https://ai.google.dev/pricing (October 2025)
 * 
 * NOTE: These are BASE costs from Google API
 * Actual user charges = BASE * PROFIT_MARGIN_MULTIPLIER
 */
export const GEMINI_PRICING_PER_MILLION = {
  'gemini-2.5-pro': {
    input: 1.25,        // $1.25 for prompts <= 200k tokens
    output: 10.00,      // $10.00 for prompts <= 200k tokens
    inputHighTier: 2.50,  // $2.50 for prompts > 200k tokens
    outputHighTier: 15.00, // $15.00 for prompts > 200k tokens
    tierThreshold: 200000 // 200k tokens threshold
  },
  'gemini-2.5-flash': {
    input: 0.30,  // $0.30 for text/image/video
    output: 2.50  // $2.50 output
  },
  'gemini-2.5-flash-lite': {
    input: 0.10,  // $0.10 for text/image/video
    output: 0.40  // $0.40 output
  }
} as const;

/**
 * Type-safe model names
 */
export type GeminiModel = keyof typeof GEMINI_PRICING_PER_MILLION;

/**
 * Default model for the application
 */
export const DEFAULT_MODEL: GeminiModel = 'gemini-2.5-flash';

/**
 * Model display names for UI
 */
export const MODEL_DISPLAY_NAMES: Record<GeminiModel, string> = {
  'gemini-2.5-pro': 'Gemini 2.5 Pro (Razonamiento Avanzado)',
  'gemini-2.5-flash': 'Gemini 2.5 Flash (Rápido)',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite (Económico)'
};

/**
 * Model descriptions for UI
 */
export const MODEL_DESCRIPTIONS: Record<GeminiModel, string> = {
  'gemini-2.5-pro': 'Mejor para tareas complejas que requieren razonamiento profundo',
  'gemini-2.5-flash': 'Balance óptimo entre velocidad y capacidad',
  'gemini-2.5-flash-lite': 'Más rápido y económico para tareas simples'
};

