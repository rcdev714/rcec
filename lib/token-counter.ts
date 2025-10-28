/**
 * Token counting utilities for Gemini models using Google's native API
 * 
 * This module provides accurate token counting for Gemini models using
 * Google's official token counting API.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseMessage } from "@langchain/core/messages";

// Define a multiplier for profit margin to easily adjust revenue
const PROFIT_MARGIN_MULTIPLIER = 12;

// Initialize Google AI SDK
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not found in environment variables");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Token count result from Google's API
 */
export interface TokenCountResult {
  totalTokens: number;
  cachedContentTokenCount?: number;
}

/**
 * Count tokens for a single text string using Google's native API
 * 
 * @param text - The text to count tokens for
 * @param modelName - The Gemini model name (default: gemini-2.5-flash)
 * @returns Token count
 */
export async function countTokensForText(
  text: string,
  modelName: string = "gemini-2.5-flash"
): Promise<number> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: modelName });
    
    const result = await model.countTokens(text);
    return result.totalTokens;
  } catch (error) {
    console.error("[countTokensForText] Error counting tokens:", error);
    // Fallback to rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Count tokens for a conversation history (array of messages)
 * 
 * @param messages - Array of BaseMessage objects from LangChain
 * @param modelName - The Gemini model name (default: gemini-2.5-flash)
 * @returns Total token count for all messages
 */
export async function countTokensForMessages(
  messages: BaseMessage[],
  modelName: string = "gemini-2.5-flash"
): Promise<number> {
  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: modelName });
    
    // Convert LangChain messages to Google AI format
    const contents = messages.map(msg => {
      const role = msg._getType() === "human" ? "user" : "model";
      return {
        role,
        parts: [{ text: msg.content.toString() }]
      };
    });
    
    const result = await model.countTokens({ contents });
    return result.totalTokens;
  } catch (error) {
    console.error("[countTokensForMessages] Error counting tokens:", error);
    // Fallback: sum individual message lengths with rough estimation
    const totalChars = messages.reduce((sum, msg) => 
      sum + msg.content.toString().length, 0
    );
    return Math.ceil(totalChars / 4);
  }
}

/**
 * Extract token usage from LangChain response metadata
 * 
 * LangChain's ChatGoogleGenerativeAI returns usage metadata in the response
 * when streaming is disabled or after streaming completes.
 * 
 * @param responseMetadata - Metadata from LangChain AIMessage
 * @returns Object with input, output, and total token counts
 */
export function extractTokenUsageFromMetadata(responseMetadata: any): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} | null {
  try {
    // LangChain returns tokenUsage in response metadata
    const usage = responseMetadata?.tokenUsage;
    
    if (usage && typeof usage === 'object') {
      return {
        inputTokens: usage.promptTokens || 0,
        outputTokens: usage.completionTokens || 0,
        totalTokens: usage.totalTokens || 0,
      };
    }
    
    return null;
  } catch (error) {
    console.error("[extractTokenUsageFromMetadata] Error extracting usage:", error);
    return null;
  }
}

/**
 * Estimate tokens from text length (fast, less accurate)
 * Use this for quick estimates before API calls.
 * 
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokensFromText(text: string): number {
  // Gemini uses ~4 characters per token on average
  // This is a rough estimate, use countTokensForText for accuracy
  return Math.ceil(text.length / 4);
}

/**
 * Format token count for display
 * 
 * @param tokens - Number of tokens
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  } else if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
}

/**
 * Calculate cost for Gemini API usage
 * Official pricing per 1M tokens as of October 2025
 *
 * @param modelName - Gemini model name
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateGeminiCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Official Gemini pricing per 1M tokens (October 2025)
  // Note: For gemini-2.5-pro, pricing depends on total prompt size (>200k tokens = higher rate)
  const pricing: Record<string, { input: number; output: number; inputHighTier?: number; outputHighTier?: number; tierThreshold?: number }> = {
    "gemini-2.5-pro": {
      input: 1.25,        // $1.25 for prompts <= 200k tokens
      output: 10.00,      // $10.00 for prompts <= 200k tokens
      inputHighTier: 2.50,  // $2.50 for prompts > 200k tokens
      outputHighTier: 15.00, // $15.00 for prompts > 200k tokens
      tierThreshold: 200000 // 200k tokens threshold
    },
    "gemini-2.5-flash": {
      input: 0.30,  // $0.30 for text/image/video
      output: 2.50  // $2.50 output
    },
    "gemini-2.5-flash-lite": {
      input: 0.10,  // $0.10 for text/image/video
      output: 0.40  // $0.40 output
    }
  };

  const modelPricing = pricing[modelName] || pricing["gemini-2.5-flash"];

  // Handle tiered pricing for Pro model
  if (modelPricing.tierThreshold && inputTokens > modelPricing.tierThreshold) {
    // Use high-tier pricing for large prompts
    const inputCost = (inputTokens / 1_000_000) * (modelPricing.inputHighTier || modelPricing.input);
    const outputCost = (outputTokens / 1_000_000) * (modelPricing.outputHighTier || modelPricing.output);
    return (inputCost + outputCost) * PROFIT_MARGIN_MULTIPLIER;
  } else {
    // Standard pricing
    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
    return (inputCost + outputCost) * PROFIT_MARGIN_MULTIPLIER;
  }
}

