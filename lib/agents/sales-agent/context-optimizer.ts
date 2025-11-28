/**
 * Context Window Optimizer
 * Reduces token usage by intelligently compressing conversation history
 * and summarizing tool outputs for B2C production efficiency
 */

import { BaseMessage, AIMessage } from "@langchain/core/messages";

interface OptimizationConfig {
  maxMessages: number;           // Max messages to keep in full
  maxToolOutputLength: number;   // Max chars per tool output
  maxTotalContextChars: number;  // Approximate max context size
  preserveRecentMessages: number; // Always keep N most recent messages
}

const DEFAULT_CONFIG: OptimizationConfig = {
  maxMessages: 10,
  maxToolOutputLength: 2000,
  maxTotalContextChars: 30000, // ~7500 tokens approx
  preserveRecentMessages: 4,
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
    if (toolName === 'web_search' && data.results) {
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
      if (msg._getType() === 'ai' && 'tool_calls' in msg) {
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
      if (msg._getType() === 'ai') {
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
  }
  
  // Add recent messages in full
  for (let i = recentStartIndex; i < messages.length; i++) {
    optimized.push(messages[i]);
  }
  
  return optimized;
}

/**
 * Estimate token count from text (rough approximation)
 * ~4 chars per token for English/Spanish mixed content
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
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
  return estimateTokens(totalChars.toString()) < maxTokens;
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

