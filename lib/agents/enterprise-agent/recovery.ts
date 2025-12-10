/**
 * Agent Recovery System
 * Ensures the agent ALWAYS provides a response, even on partial failures
 * Similar to how production AI labs handle streaming failures
 */

import { ToolOutput, TodoItem } from "./state";

/**
 * Checkpoint of agent execution state
 * Saved periodically to enable recovery
 */
export interface AgentCheckpoint {
  timestamp: Date;
  phase: 'init' | 'planning' | 'thinking' | 'tools' | 'processing' | 'finalizing';
  
  // What we've accomplished
  completedTools: string[];
  toolOutputs: ToolOutput[];
  todos: TodoItem[];
  
  // Partial content generated
  partialResponse: string;
  
  // User's original query
  userQuery: string;
  
  // Any errors encountered (non-fatal)
  warnings: string[];
  
  // Last successful node
  lastSuccessfulNode: string | null;
}

/**
 * Recovery Manager - tracks execution and enables recovery
 */
export class AgentRecoveryManager {
  private checkpoint: AgentCheckpoint;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number = Date.now();
  private readonly HEARTBEAT_TIMEOUT_MS = 30000; // 30 seconds without progress = stall
  
  constructor(userQuery: string) {
    this.checkpoint = {
      timestamp: new Date(),
      phase: 'init',
      completedTools: [],
      toolOutputs: [],
      todos: [],
      partialResponse: '',
      userQuery,
      warnings: [],
      lastSuccessfulNode: null,
    };
  }
  
  /**
   * Update checkpoint phase
   */
  updatePhase(phase: AgentCheckpoint['phase'], nodeName?: string) {
    this.checkpoint.phase = phase;
    this.checkpoint.timestamp = new Date();
    this.lastHeartbeat = Date.now();
    if (nodeName) {
      this.checkpoint.lastSuccessfulNode = nodeName;
    }
  }
  
  /**
   * Record completed tool
   */
  recordToolCompletion(toolName: string, output: ToolOutput) {
    this.checkpoint.completedTools.push(toolName);
    this.checkpoint.toolOutputs.push(output);
    this.checkpoint.timestamp = new Date();
    this.lastHeartbeat = Date.now();
  }
  
  /**
   * Update partial response
   */
  updatePartialResponse(content: string) {
    if (content && content.length > this.checkpoint.partialResponse.length) {
      this.checkpoint.partialResponse = content;
      this.lastHeartbeat = Date.now();
    }
  }
  
  /**
   * Record a non-fatal warning
   */
  addWarning(warning: string) {
    this.checkpoint.warnings.push(warning);
  }
  
  /**
   * Update todos
   */
  updateTodos(todos: TodoItem[]) {
    this.checkpoint.todos = todos;
  }
  
  /**
   * Get current checkpoint
   */
  getCheckpoint(): AgentCheckpoint {
    return { ...this.checkpoint };
  }
  
  /**
   * Check if execution has stalled
   */
  hasStalled(): boolean {
    return Date.now() - this.lastHeartbeat > this.HEARTBEAT_TIMEOUT_MS;
  }
  
  /**
   * Generate a recovery response from checkpoint
   * This is the KEY function - always produces something useful
   */
  generateRecoveryResponse(): string {
    const cp = this.checkpoint;
    const parts: string[] = [];
    
    // Header based on what happened
    if (cp.completedTools.length === 0 && !cp.partialResponse) {
      // Complete failure before any work
      parts.push('## ⚠️ No pude completar tu solicitud\n');
      parts.push(`Encontré un problema al procesar: "${cp.userQuery}"\n`);
      parts.push('\n**Sugerencias:**');
      parts.push('- Intenta con una consulta más simple');
      parts.push('- Divide tu solicitud en pasos más pequeños');
      parts.push('- Verifica que tu consulta sea clara y específica\n');
    } else if (cp.partialResponse && cp.partialResponse.length > 100) {
      // We have a partial response - use it
      parts.push(cp.partialResponse);
      
      // Add note about incompleteness if we had warnings
      if (cp.warnings.length > 0) {
        parts.push('\n\n---\n*Nota: Esta respuesta puede estar incompleta debido a limitaciones técnicas.*');
      }
    } else {
      // Partial work completed - synthesize from tools
      parts.push('## Resultados Parciales\n');
      parts.push(`Logré completar parte de tu solicitud: "${cp.userQuery}"\n`);
      
      // Show completed work
      if (cp.completedTools.length > 0) {
        parts.push('\n### ✓ Acciones completadas:');
        cp.completedTools.forEach(tool => {
          parts.push(`- ${formatToolName(tool)}`);
        });
      }
      
      // Show tool results if we have them
      if (cp.toolOutputs.length > 0) {
        parts.push('\n### Información encontrada:\n');
        
        for (const output of cp.toolOutputs) {
          if (output.success && output.output) {
            const summary = summarizeToolOutput(output.toolName, output.output);
            if (summary) {
              parts.push(summary);
            }
          }
        }
      }
      
      // Show what was pending
      const pendingTodos = cp.todos.filter(t => t.status === 'pending' || t.status === 'in_progress');
      if (pendingTodos.length > 0) {
        parts.push('\n### ⏳ Pendiente (no completado):');
        pendingTodos.forEach(todo => {
          parts.push(`- ${todo.description}`);
        });
      }
      
      // Add warnings if any
      if (cp.warnings.length > 0) {
        parts.push('\n### ⚠️ Notas:');
        cp.warnings.slice(0, 3).forEach(w => {
          parts.push(`- ${w}`);
        });
      }
    }
    
    return parts.join('\n');
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

/**
 * Format tool name for display
 */
function formatToolName(toolName: string): string {
  const names: Record<string, string> = {
    'search_companies': 'Búsqueda de empresas',
    'get_company_details': 'Detalles de empresa',
    'refine_search': 'Refinamiento de búsqueda',
    'web_search': 'Búsqueda web',
    'web_extract': 'Extracción de contenido web',
    'enrich_company_contacts': 'Enriquecimiento de contactos',
    'list_user_offerings': 'Listado de servicios',
    'get_offering_details': 'Detalles de servicio',
  };
  return names[toolName] || toolName;
}

/**
 * Summarize tool output for recovery response
 */
function summarizeToolOutput(toolName: string, output: unknown): string | null {
  try {
    const data = typeof output === 'string' ? JSON.parse(output) : output;
    
    if (toolName === 'search_companies' && data.result?.companies) {
      const companies = data.result.companies;
      const total = data.result.totalCount || companies.length;
      
      if (companies.length === 0) {
        return '**Búsqueda de empresas:** No se encontraron resultados.\n';
      }
      
      let summary = `**Búsqueda de empresas:** ${total} encontradas\n\n`;
      summary += '| Empresa | RUC | Empleados | Ingresos |\n';
      summary += '|---------|-----|-----------|----------|\n';
      
      companies.slice(0, 5).forEach((c: any) => {
        const name = c.nombre_comercial || c.nombre || 'N/A';
        const truncName = name.length > 30 ? name.substring(0, 27) + '...' : name;
        const ingresos = c.total_ingresos || c.ingresos_ventas;
        const ingresosStr = ingresos ? `$${(ingresos/1000000).toFixed(1)}M` : 'N/A';
        summary += `| ${truncName} | ${c.ruc || 'N/A'} | ${c.n_empleados || 'N/A'} | ${ingresosStr} |\n`;
      });
      
      if (total > 5) {
        summary += `\n*...y ${total - 5} empresas más*\n`;
      }
      
      return summary;
    }
    
    if (toolName === 'get_company_details' && data.company) {
      const c = data.company;
      return `**Detalles de ${c.nombre_comercial || c.nombre}:**
- RUC: ${c.ruc}
- Provincia: ${c.provincia || 'N/A'}
- Empleados: ${c.n_empleados || 'N/A'}
- Ingresos: ${c.ingresos_ventas ? `$${(c.ingresos_ventas/1000000).toFixed(2)}M` : 'N/A'}
- Utilidad: ${c.utilidad_neta ? `$${(c.utilidad_neta/1000000).toFixed(2)}M` : 'N/A'}
`;
    }
    
    if (toolName === 'web_search' && data.results) {
      if (data.results.length === 0) {
        return '**Búsqueda web:** No se encontraron resultados.\n';
      }
      
      let summary = `**Búsqueda web:** ${data.results.length} resultados\n\n`;
      data.results.slice(0, 3).forEach((r: any, i: number) => {
        summary += `${i + 1}. [${r.title}](${r.url})\n`;
        if (r.snippet) {
          summary += `   ${r.snippet.substring(0, 100)}...\n`;
        }
      });
      return summary;
    }
    
    if (toolName === 'enrich_company_contacts' && data.contacts) {
      if (data.contacts.length === 0) {
        return '**Contactos:** No se encontraron contactos.\n';
      }
      
      let summary = `**Contactos encontrados:** ${data.contacts.length}\n\n`;
      data.contacts.slice(0, 5).forEach((c: any) => {
        summary += `- **${c.name || 'N/A'}** - ${c.position || 'N/A'}`;
        if (c.email) summary += ` (${c.email})`;
        summary += '\n';
      });
      return summary;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a guaranteed response wrapper
 * This ensures we ALWAYS return something to the user
 */
export function createGuaranteedResponseWrapper(
  streamFn: () => Promise<ReadableStream>,
  userQuery: string
): Promise<ReadableStream> {
  const recovery = new AgentRecoveryManager(userQuery);
  
  return new Promise(async (resolve) => {
    try {
      const stream = await streamFn();
      
      // Wrap the stream with recovery tracking
      const wrappedStream = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          
          let hasEmittedContent = false;
          let accumulatedContent = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // Stream completed normally
                recovery.cleanup();
                
                // If no content was emitted, generate recovery response
                if (!hasEmittedContent) {
                  const recoveryResponse = recovery.generateRecoveryResponse();
                  controller.enqueue(encoder.encode(recoveryResponse));
                }
                
                controller.close();
                break;
              }
              
              // Track content for recovery
              const chunk = decoder.decode(value, { stream: true });
              accumulatedContent += chunk;
              
              // Update recovery manager
              if (!chunk.startsWith('[STATE_EVENT]') && !chunk.startsWith('[AGENT_PLAN]')) {
                recovery.updatePartialResponse(accumulatedContent);
                if (chunk.trim().length > 0) {
                  hasEmittedContent = true;
                }
              }
              
              // Pass through the chunk
              controller.enqueue(value);
            }
          } catch (streamError) {
            console.error('[GuaranteedResponse] Stream error:', streamError);
            
            // Generate recovery response on error
            recovery.addWarning(`Error de streaming: ${streamError instanceof Error ? streamError.message : 'desconocido'}`);
            const recoveryResponse = recovery.generateRecoveryResponse();
            
            // Emit recovery response
            controller.enqueue(encoder.encode('\n\n' + recoveryResponse));
            controller.close();
          }
        }
      });
      
      resolve(wrappedStream);
    } catch (initError) {
      console.error('[GuaranteedResponse] Init error:', initError);
      
      // Create a simple error stream
      const encoder = new TextEncoder();
      recovery.addWarning(`Error de inicialización: ${initError instanceof Error ? initError.message : 'desconocido'}`);
      
      const errorStream = new ReadableStream({
        start(controller) {
          const recoveryResponse = recovery.generateRecoveryResponse();
          controller.enqueue(encoder.encode(recoveryResponse));
          controller.close();
        }
      });
      
      resolve(errorStream);
    }
  });
}

