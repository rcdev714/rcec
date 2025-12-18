/**
 * Context Window Optimizer
 * Reduces token usage by intelligently compressing conversation history
 * and summarizing tool outputs for B2C production efficiency
 */

import { BaseMessage, AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

/**
 * Reconstruct a LangChain message from a plain object (e.g., from checkpoint deserialization)
 * 
 * When messages are serialized to JSON and stored in Supabase checkpoints,
 * they lose their prototype methods (like _getType()). This function
 * reconstructs proper LangChain message objects from the serialized data.
 */
export function reconstructMessage(msg: unknown): BaseMessage {
  if (!msg || typeof msg !== 'object') {
    // Return a placeholder if invalid
    return new HumanMessage({ content: String(msg || '') });
  }

  const msgObj = msg as Record<string, unknown>;
  
  // If it's already a proper LangChain message with _getType method, return as-is
  if (typeof (msgObj as any)._getType === 'function') {
    return msg as BaseMessage;
  }

  // Determine message type from serialized data
  // LangChain serialization uses 'type' field or 'lc_id' array
  const type = msgObj.type as string | undefined;
  const lcId = msgObj.lc_id as string[] | undefined;
  const content = (msgObj.content as string) || '';
  
  // Extract additional_kwargs and tool_calls if present
  const additionalKwargs = msgObj.additional_kwargs as Record<string, unknown> | undefined;
  const toolCalls = msgObj.tool_calls as Array<{ id: string; name: string; args: Record<string, unknown> }> | undefined;
  const toolCallId = msgObj.tool_call_id as string | undefined;
  const name = msgObj.name as string | undefined;
  
  // Detect type from various serialization formats
  let detectedType: string = 'human'; // default
  
  if (type) {
    detectedType = type.toLowerCase();
  } else if (lcId && Array.isArray(lcId)) {
    // LangChain serialization format: ['langchain_core', 'messages', 'HumanMessage']
    const lastPart = lcId[lcId.length - 1]?.toLowerCase() || '';
    if (lastPart.includes('human')) detectedType = 'human';
    else if (lastPart.includes('ai') || lastPart.includes('assistant')) detectedType = 'ai';
    else if (lastPart.includes('system')) detectedType = 'system';
    else if (lastPart.includes('tool') || lastPart.includes('function')) detectedType = 'tool';
  }
  
  // Also check for common type patterns
  if (msgObj.role === 'user' || msgObj.role === 'human') detectedType = 'human';
  else if (msgObj.role === 'assistant' || msgObj.role === 'ai') detectedType = 'ai';
  else if (msgObj.role === 'system') detectedType = 'system';
  else if (msgObj.role === 'tool' || msgObj.role === 'function') detectedType = 'tool';
  
  // Reconstruct based on detected type
  switch (detectedType) {
    case 'human':
    case 'user':
      return new HumanMessage({ content, additional_kwargs: additionalKwargs });
    
    case 'ai':
    case 'assistant':
      // AIMessage may have tool_calls
      if (toolCalls && toolCalls.length > 0) {
        return new AIMessage({
          content,
          tool_calls: toolCalls,
          additional_kwargs: additionalKwargs,
        });
      }
      return new AIMessage({ content, additional_kwargs: additionalKwargs });
    
    case 'system':
      return new SystemMessage({ content, additional_kwargs: additionalKwargs });
    
    case 'tool':
    case 'function':
      // ToolMessage requires tool_call_id
      return new ToolMessage({
        content,
        tool_call_id: toolCallId || 'unknown',
        name: name || 'unknown_tool',
        additional_kwargs: additionalKwargs,
      });
    
    default:
      // Default to HumanMessage if type is unknown
      console.warn('[reconstructMessage] Unknown message type, defaulting to HumanMessage:', detectedType, msgObj);
      return new HumanMessage({ content });
  }
}

/**
 * Reconstruct all messages in an array from plain objects to proper LangChain messages
 * Safe to call on already-proper messages (they pass through unchanged)
 */
export function reconstructMessages(messages: unknown[]): BaseMessage[] {
  if (!Array.isArray(messages)) {
    console.warn('[reconstructMessages] Input is not an array, returning empty array');
    return [];
  }
  
  return messages.map((msg, index) => {
    try {
      return reconstructMessage(msg);
    } catch (error) {
      console.error(`[reconstructMessages] Failed to reconstruct message at index ${index}:`, error);
      // Return a placeholder message to avoid breaking the chain
      return new HumanMessage({ content: `[Error reconstructing message ${index}]` });
    }
  });
}

/**
 * Safely get message type, handling both proper LangChain messages and serialized objects
 */
export function getMessageType(msg: unknown): string {
  if (!msg || typeof msg !== 'object') {
    return 'unknown';
  }
  
  const msgObj = msg as Record<string, unknown>;
  
  // If it has _getType method, use it
  if (typeof (msgObj as any)._getType === 'function') {
    try {
      return (msgObj as any)._getType();
    } catch {
      // Fall through to manual detection
    }
  }
  
  // Manual type detection for serialized messages
  const type = msgObj.type as string | undefined;
  const lcId = msgObj.lc_id as string[] | undefined;
  const role = msgObj.role as string | undefined;
  
  if (type) {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('human') || typeLower === 'user') return 'human';
    if (typeLower.includes('ai') || typeLower === 'assistant') return 'ai';
    if (typeLower.includes('system')) return 'system';
    if (typeLower.includes('tool') || typeLower.includes('function')) return 'tool';
    return typeLower;
  }
  
  if (lcId && Array.isArray(lcId)) {
    const lastPart = lcId[lcId.length - 1]?.toLowerCase() || '';
    if (lastPart.includes('human')) return 'human';
    if (lastPart.includes('ai') || lastPart.includes('assistant')) return 'ai';
    if (lastPart.includes('system')) return 'system';
    if (lastPart.includes('tool') || lastPart.includes('function')) return 'tool';
  }
  
  if (role) {
    if (role === 'user' || role === 'human') return 'human';
    if (role === 'assistant' || role === 'ai') return 'ai';
    if (role === 'system') return 'system';
    if (role === 'tool' || role === 'function') return 'tool';
  }
  
  return 'unknown';
}

interface OptimizationConfig {
  maxMessages: number;           // Max messages to keep in full
  maxToolOutputLength: number;   // Max chars per tool output
  maxTotalContextChars: number;  // Approximate max context size
  preserveRecentMessages: number; // Always keep N most recent messages
}

const DEFAULT_CONFIG: OptimizationConfig = {
  maxMessages: 15,
  maxToolOutputLength: 2000,
  maxTotalContextChars: 50000, // ~12500 tokens approx
  preserveRecentMessages: 8, // Increased to preserve more context including user follow-ups
};

/**
 * Compress tool output to essential information
 */
export function compressToolOutput(output: unknown, toolName: string, maxLength: number = 2000): string {
  if (!output) return 'Sin resultados';
  
  try {
    const data = typeof output === 'string' ? JSON.parse(output) : output;
    
    // Handle company search results - extract only key fields
    if (toolName === 'search_companies' && data.result?.companies) {
      const companies = data.result.companies;
      const totalCount = data.result.totalCount || companies.length;
      
      // Compress to essential fields only
      const compressed = companies.slice(0, 5).map((c: Record<string, unknown>) => ({
        nombre: c.nombre_comercial || c.nombre,
        ruc: c.ruc,
        empleados: c.n_empleados,
        ingresos: c.total_ingresos || c.ingresos_ventas,
        provincia: c.provincia,
      }));
      
      return JSON.stringify({
        total: totalCount,
        showing: compressed.length,
        companies: compressed,
      });
    }
    
    // Handle company details - extract key metrics
    if (toolName === 'get_company_details' && data.company) {
      const c = data.company;
      return JSON.stringify({
        nombre: c.nombre_comercial || c.nombre,
        ruc: c.ruc,
        provincia: c.provincia,
        empleados: c.n_empleados,
        ingresos: c.ingresos_ventas,
        utilidad: c.utilidad_neta,
        representante: c.representante_legal,
      });
    }
    
    // Handle web search - extract titles and snippets
    if (toolName === 'tavily_web_search' && data.results) {
      const results = data.results.slice(0, 3).map((r: Record<string, unknown>) => ({
        title: r.title,
        snippet: typeof r.snippet === 'string' ? r.snippet.substring(0, 150) : '',
        url: r.url,
      }));
      return JSON.stringify({ count: data.results.length, top: results });
    }
    
    // Handle contact enrichment
    if (toolName === 'enrich_company_contacts' && data.contacts) {
      const contacts = data.contacts.slice(0, 5).map((c: Record<string, unknown>) => ({
        name: c.name,
        position: c.position,
        email: c.email,
      }));
      return JSON.stringify({ count: data.contacts.length, contacts });
    }
    
    // Default: stringify and truncate
    const str = JSON.stringify(data);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '... [truncated]';
    }
    return str;
    
  } catch {
    // If parsing fails, just truncate the string
    const str = String(output);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '... [truncated]';
    }
    return str;
  }
}

/**
 * Optimize conversation history for reduced token usage
 * CRITICAL: Always preserves ALL human messages to ensure follow-up questions are not lost
 * 
 * NOTE: This function now uses getMessageType() for safe type detection,
 * which handles both proper LangChain messages and serialized checkpoint objects.
 */
export function optimizeConversationHistory(
  messages: BaseMessage[],
  config: Partial<OptimizationConfig> = {}
): BaseMessage[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (messages.length <= cfg.preserveRecentMessages) {
    return messages;
  }
  
  const optimized: BaseMessage[] = [];
  const recentStartIndex = Math.max(0, messages.length - cfg.preserveRecentMessages);
  
  // CRITICAL: First, collect ALL human messages - they must NEVER be compressed
  // User follow-up questions are the agent's primary directive
  // Use safe type detection that works with both proper messages and serialized objects
  const allHumanMessages: Array<{ index: number; message: BaseMessage }> = [];
  for (let i = 0; i < messages.length; i++) {
    if (getMessageType(messages[i]) === 'human') {
      allHumanMessages.push({ index: i, message: messages[i] });
    }
  }
  
  // Keep first message (usually the initial user query for context)
  if (messages.length > cfg.preserveRecentMessages && messages[0]) {
    optimized.push(messages[0]);
  }
  
  // For middle messages, create a compressed summary if there are many
  if (recentStartIndex > 1) {
    const middleMessages = messages.slice(1, recentStartIndex);
    
    // Group by type and summarize
    const toolCalls: string[] = [];
    const keyFindings: string[] = [];
    
    for (const msg of middleMessages) {
      const msgType = getMessageType(msg);
      
      // SKIP human messages in the middle - they'll be added separately
      if (msgType === 'human') {
        continue;
      }
      
      if (msgType === 'ai' && 'tool_calls' in (msg as unknown as Record<string, unknown>)) {
        const aiMsg = msg as unknown as { tool_calls?: Array<{ name: string }> };
        if (aiMsg.tool_calls) {
          aiMsg.tool_calls.forEach(tc => {
            if (!toolCalls.includes(tc.name)) {
              toolCalls.push(tc.name);
            }
          });
        }
      }
      
      // Extract key findings from AI responses
      if (msgType === 'ai') {
        const content = typeof msg.content === 'string' ? msg.content : '';
        if (content.length > 50 && !content.startsWith('[')) {
          // Extract first meaningful sentence
          const firstSentence = content.split(/[.!?\n]/)[0];
          if (firstSentence && firstSentence.length > 20) {
            keyFindings.push(firstSentence.substring(0, 100));
          }
        }
      }
    }
    
    // Create summary message only if there's meaningful content
    if (toolCalls.length > 0 || keyFindings.length > 0) {
      const summaryParts: string[] = [];
      if (toolCalls.length > 0) {
        summaryParts.push(`[Herramientas usadas: ${toolCalls.join(', ')}]`);
      }
      if (keyFindings.length > 0) {
        summaryParts.push(`[Hallazgos previos: ${keyFindings.slice(0, 2).join('; ')}]`);
      }
      
      optimized.push(new AIMessage({
        content: summaryParts.join(' '),
      }));
    }
    
    // CRITICAL: Add ALL human messages from the middle section that aren't the first message
    // These are follow-up questions that must be preserved
    for (const { index, message } of allHumanMessages) {
      if (index > 0 && index < recentStartIndex) {
        optimized.push(message);
      }
    }
  }
  
  // Add recent messages in full
  for (let i = recentStartIndex; i < messages.length; i++) {
    optimized.push(messages[i]);
  }
  
  return optimized;
}

/**
 * Estimate token count from text or character count (rough approximation)
 * ~4 chars per token for English/Spanish mixed content
 * @param input - Either a string (will use its length) or a number (character count)
 */
export function estimateTokens(input: string | number): number {
  const charCount = typeof input === 'number' ? input : input.length;
  return Math.ceil(charCount / 4);
}

/**
 * Check if context is within budget
 */
export function isWithinTokenBudget(
  messages: BaseMessage[],
  maxTokens: number = 8000
): boolean {
  let totalChars = 0;
  for (const msg of messages) {
    const content = typeof msg.content === 'string' 
      ? msg.content 
      : JSON.stringify(msg.content);
    totalChars += content.length;
  }
  // Fix: Use totalChars directly (not toString()) - estimateTokens now accepts number
  return estimateTokens(totalChars) < maxTokens;
}

/**
 * Compress tool outputs in state for reduced memory/token usage
 */
export function compressToolOutputsForContext(
  toolOutputs: Array<{ toolName: string; output: unknown; success: boolean }>
): string {
  if (!toolOutputs || toolOutputs.length === 0) {
    return '';
  }
  
  const compressed = toolOutputs
    .filter(t => t.success)
    .map(t => {
      const summary = compressToolOutput(t.output, t.toolName, 300);
      return `- ${t.toolName}: ${summary}`;
    });
  
  if (compressed.length === 0) {
    return '';
  }
  
  return `\n[RESULTADOS COMPRIMIDOS]\n${compressed.join('\n')}\n[/RESULTADOS]`;
}