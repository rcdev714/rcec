import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

// Types for memory management
interface ConversationMemory {
  messages: BaseMessage[];
  tokenCount: number;
  conversationId: string;
}

interface MemoryStore {
  [conversationId: string]: ConversationMemory;
}

// Configuration constants
const MAX_CONTEXT_TOKENS = 1_000_000; // 1 million token context window
const TOKEN_BUFFER = 50_000; // Buffer to ensure we don't exceed limits
const MAX_USABLE_TOKENS = MAX_CONTEXT_TOKENS - TOKEN_BUFFER;

// In-memory store (in production, consider using Redis or database)
const memoryStore: MemoryStore = {};

// Lazy initialization of the Gemini model to avoid build-time errors
let model: ChatGoogleGenerativeAI | null = null;

function getModel(): ChatGoogleGenerativeAI {
  if (!model) {
    model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY || '',
      model: "gemini-2.0-flash-exp", // Latest model with largest context window
      temperature: 0.7,
      maxOutputTokens: 8192, // Reasonable output limit
    });
  }
  return model;
}

// Unified accurate token counter with fallback
async function countTokens(text: string): Promise<number> {
  try {
    // Try accurate API first
    const response = await fetch('https://geminitokencounterapi.vercel.app/api/count', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.tokenCount && typeof data.tokenCount === 'number') {
        return data.tokenCount;
      }
    }
  } catch (error) {
    console.warn('Accurate token counting failed, using enhanced estimation:', error);
  }
  
  // Enhanced fallback estimation
  return enhancedTokenEstimation(text);
}

// Enhanced token estimation for fallback scenarios
function enhancedTokenEstimation(text: string): number {
  // More accurate estimation based on Gemini tokenization patterns
  let tokenCount = text.length / 3.5; // Base estimation
  
  // Word-based minimum
  const words = text.split(/\s+/).filter(word => word.length > 0);
  tokenCount = Math.max(tokenCount, words.length * 0.8);
  
  // Pattern-based adjustments
  const patterns = [
    { regex: /```[\s\S]*?```/g, multiplier: 1.3 }, // Code blocks
    { regex: /`[^`]+`/g, multiplier: 1.2 }, // Inline code  
    { regex: /\*\*[^*]+\*\*/g, multiplier: 1.1 }, // Bold
    { regex: /https?:\/\/[^\s]+/g, multiplier: 0.7 }, // URLs
    { regex: /\d+/g, multiplier: 0.8 }, // Numbers
    { regex: /[.,!?;:()[\]{}'"]/g, multiplier: 0.9 }, // Punctuation
  ];
  
  for (const { regex, multiplier } of patterns) {
    const matches = text.match(regex) || [];
    matches.forEach(match => {
      const baseTokens = match.length / 3.5;
      tokenCount += (baseTokens * multiplier - baseTokens);
    });
  }
  
  // Non-ASCII character adjustment
  const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
  tokenCount += nonAsciiCount * 0.3;
  
  return Math.ceil(Math.max(tokenCount, 1));
}



// Calculate total tokens for a list of messages (async)
async function calculateMessageTokens(messages: BaseMessage[]): Promise<number> {
  const tokenCounts = await Promise.all(
    messages.map(message => countTokens(message.content.toString()))
  );
  return tokenCounts.reduce((total, count) => total + count, 0);
}



// Summarize old messages to maintain context while reducing tokens
async function summarizeOldMessages(messages: BaseMessage[]): Promise<BaseMessage[]> {
  if (messages.length <= 4) return messages; // Keep if few messages
  
  // Keep first 2 and last 2 messages, summarize the middle
  const firstMessages = messages.slice(0, 2);
  const lastMessages = messages.slice(-2);
  const middleMessages = messages.slice(2, -2);
  
  if (middleMessages.length === 0) return messages;
  
  // Create summary of middle messages
  const conversationText = middleMessages
    .map(msg => `${msg._getType()}: ${msg.content}`)
    .join('\n');
    
  const summaryPrompt = `Please summarize this conversation segment concisely, preserving key information, decisions, and context:

${conversationText}

Summary:`;

  try {
    const aiModel = getModel();
    const summaryResponse = await aiModel.invoke([new HumanMessage(summaryPrompt)]);
    const summaryMessage = new AIMessage(
      `[CONVERSATION SUMMARY]: ${summaryResponse.content}`
    );
    
    return [...firstMessages, summaryMessage, ...lastMessages];
  } catch (error) {
    console.warn("Failed to summarize messages, keeping original:", error);
    return messages;
  }
}

// Manage memory to stay within token limits
async function manageMemory(conversationId: string, newMessage: BaseMessage): Promise<BaseMessage[]> {
  // Initialize memory if it doesn't exist
  if (!memoryStore[conversationId]) {
    memoryStore[conversationId] = {
      messages: [],
      tokenCount: 0,
      conversationId
    };
  }
  
  const memory = memoryStore[conversationId];
  const newMessages = [...memory.messages, newMessage];
  
  // Calculate total tokens
  const totalTokens = await calculateMessageTokens(newMessages);
  
  // If within limits, update and return
  if (totalTokens <= MAX_USABLE_TOKENS) {
    memory.messages = newMessages;
    memory.tokenCount = totalTokens;
    return newMessages;
  }
  
  // If exceeding limits, summarize old messages
  console.log(`Token limit approached (${totalTokens}/${MAX_USABLE_TOKENS}), summarizing conversation...`);
  
  const summarizedMessages = await summarizeOldMessages(newMessages);
  
  // Recalculate tokens for summarized messages
  const summarizedTokens = await calculateMessageTokens(summarizedMessages);
  
  // Update memory
  memory.messages = summarizedMessages;
  memory.tokenCount = summarizedTokens;
  
  console.log(`Conversation summarized: ${totalTokens} -> ${summarizedTokens} tokens`);
  
  return summarizedMessages;
}

// Enhanced chat function with memory management
async function chatWithMemory(message: string, conversationId: string = 'default') {
  const userMessage = new HumanMessage(message);
  
  // Manage memory and get conversation history
  const conversationMessages = await manageMemory(conversationId, userMessage);
  
  // Stream response from Gemini
  const aiModel = getModel();
  const stream = await aiModel.stream(conversationMessages);
  
  // Collect the complete response for memory storage
  let assistantResponse = '';
  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.content;
          assistantResponse += content;
          controller.enqueue(chunk);
        }
        
        // Store assistant response in memory
        const assistantMessage = new AIMessage(assistantResponse);
        await manageMemory(conversationId, assistantMessage);
        
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
  
  return responseStream;
}

// Get conversation statistics (synchronous)
function getConversationStats(conversationId: string = 'default') {
  const memory = memoryStore[conversationId];
  if (!memory) {
    return { 
      messageCount: 0, 
      tokenCount: 0, 
      conversationId,
      maxTokens: MAX_CONTEXT_TOKENS,
      usableTokens: MAX_CONTEXT_TOKENS // Usar el límite completo en la UI
    };
  }
  
  return {
    messageCount: memory.messages?.length || 0,
    tokenCount: memory.tokenCount || 0,
    conversationId: memory.conversationId || conversationId,
    maxTokens: MAX_CONTEXT_TOKENS,
    usableTokens: MAX_CONTEXT_TOKENS // Usar el límite completo en la UI
  };
}

// Get conversation statistics with token recalculation
async function getConversationStatsAccurate(conversationId: string = 'default') {
  const memory = memoryStore[conversationId];
  if (!memory || !memory.messages?.length) {
    return { 
      messageCount: 0, 
      tokenCount: 0, 
      conversationId,
      maxTokens: MAX_CONTEXT_TOKENS,
      usableTokens: MAX_CONTEXT_TOKENS
    };
  }
  
  // Recalculate token count
  const accurateTokenCount = await calculateMessageTokens(memory.messages);
  // Update memory with accurate count
  memory.tokenCount = accurateTokenCount;
  
  return {
    messageCount: memory.messages.length,
    tokenCount: accurateTokenCount,
    conversationId: memory.conversationId || conversationId,
    maxTokens: MAX_CONTEXT_TOKENS,
    usableTokens: MAX_CONTEXT_TOKENS
  };
}

// Clear conversation memory
function clearConversation(conversationId: string = 'default') {
  delete memoryStore[conversationId];
}

// Get conversation history
function getConversationHistory(conversationId: string = 'default'): BaseMessage[] {
  const memory = memoryStore[conversationId];
  return memory ? memory.messages : [];
}

// Legacy simple chat for backward compatibility
async function simpleChat(message: string) {
  const aiModel = getModel();
  const stream = await aiModel.stream([new HumanMessage(message)]);
  return stream;
}

export { 
  simpleChat, 
  chatWithMemory, 
  getConversationStats,
  getConversationStatsAccurate,
  clearConversation, 
  getConversationHistory,
  countTokens,
  enhancedTokenEstimation,
  MAX_CONTEXT_TOKENS 
};
