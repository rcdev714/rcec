"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Wrench, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ListTodo,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// Agent state event types (matching backend)
export type AgentStateEvent =
  | { type: 'thinking'; node: string; message?: string }
  | { type: 'tool_call'; toolName: string; toolCallId: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; toolCallId: string; success: boolean; output?: unknown; error?: string }
  | { type: 'error'; node: string; error: string }
  | { type: 'todo_update'; todos: TodoItem[] }
  | { type: 'reflection'; message: string; retryCount: number }
  | { type: 'iteration'; count: number; max: number }
  | { type: 'finalize'; message?: string };

interface TodoItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

interface AgentStateIndicatorProps {
  events: AgentStateEvent[];
  isActive: boolean;
}

/**
 * Analyze agent events to determine overall state for multiple concurrent tools
 */
function analyzeAgentState(events: AgentStateEvent[]) {
  if (events.length === 0) {
    return { currentEvent: null, activeTools: [], completedTools: [], hasErrors: false };
  }

  // Track each individual tool call by toolCallId
  const toolCallStates = new Map<string, { status: 'active' | 'completed' | 'error', toolName: string, lastEvent: AgentStateEvent }>();
  let currentEvent: AgentStateEvent | null = null;
  let hasErrors = false;

  // Process events in chronological order (oldest first) to build complete history
  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.type === 'tool_call') {
      const toolCallEvent = event as { type: 'tool_call'; toolName: string; toolCallId: string; input: Record<string, unknown> };
      toolCallStates.set(toolCallEvent.toolCallId, { status: 'active', toolName: toolCallEvent.toolName, lastEvent: event });
    } else if (event.type === 'tool_result') {
      const toolResultEvent = event as { type: 'tool_result'; toolName: string; toolCallId: string; success: boolean; output?: unknown; error?: string };
      const status = toolResultEvent.success ? 'completed' : 'error';

      // Mark the specific tool call as completed
      if (toolCallStates.has(toolResultEvent.toolCallId)) {
        toolCallStates.set(toolResultEvent.toolCallId, {
          status,
          toolName: toolResultEvent.toolName,
          lastEvent: event
        });
      }

      if (!toolResultEvent.success) {
        hasErrors = true;
      }
    } else if (event.type === 'error') {
      hasErrors = true;
      currentEvent = event;
    } else {
      // For other event types (thinking, finalize, etc.), use as current event
      currentEvent = event;
    }
  }

  // Extract active and completed tools, counting by tool name
  const activeToolsMap = new Map<string, number>();
  const completedToolsMap = new Map<string, number>();

  for (const state of toolCallStates.values()) {
    if (state.status === 'active') {
      activeToolsMap.set(state.toolName, (activeToolsMap.get(state.toolName) || 0) + 1);
    } else {
      completedToolsMap.set(state.toolName, (completedToolsMap.get(state.toolName) || 0) + 1);
    }
  }

  // Create readable tool names (e.g., "web_search (2)", "web_search (1)")
  const activeTools: string[] = [];
  const completedTools: string[] = [];

  for (const [toolName, count] of activeToolsMap) {
    if (count === 1) {
      activeTools.push(formatToolName(toolName));
    } else {
      activeTools.push(`${formatToolName(toolName)} (${count})`);
    }
  }

  for (const [toolName, count] of completedToolsMap) {
    if (count === 1) {
      completedTools.push(formatToolName(toolName));
    } else {
      completedTools.push(`${formatToolName(toolName)} (${count})`);
    }
  }

  return { currentEvent, activeTools, completedTools, hasErrors };
}

export function AgentStateIndicator({ events, isActive }: AgentStateIndicatorProps) {
  // Analyze all events to determine overall state
  const { currentEvent, activeTools, completedTools, hasErrors } = analyzeAgentState(events);

  // Don't show if no activity and not actively processing
  if (!isActive && !currentEvent && activeTools.length === 0) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {(isActive || currentEvent || activeTools.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-3"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50/50 border border-gray-200/60 rounded-lg px-3 py-2">
            {renderEventIcon(currentEvent, activeTools.length > 0, hasErrors)}
            <span className="flex-1 font-normal">
              {renderEventMessage(currentEvent, activeTools, completedTools)}
            </span>
          </div>

          {/* Show detailed status for multiple tools */}
          {activeTools.length > 0 && (
            <div className="mt-2 text-[11px] text-gray-400 space-y-1">
              <div>🔄 {activeTools.slice(0, 2).join(', ')}{activeTools.length > 2 ? ` +${activeTools.length - 2} más` : ''}</div>
              {completedTools.length > 0 && (
                <div>✅ Completados: {completedTools.length}</div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function renderEventIcon(event: AgentStateEvent | null, hasActiveTools: boolean = false, _hasErrors: boolean = false) {
  // If there are active tools, show loading regardless of current event
  if (hasActiveTools) {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />;
  }

  if (!event) {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />;
  }

  switch (event.type) {
    case 'thinking':
      return <Brain className="w-3.5 h-3.5 text-gray-400 animate-pulse" />;
    case 'tool_call':
      return <Wrench className="w-3.5 h-3.5 text-gray-400" />;
    case 'tool_result':
      return event.success ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-gray-500" />
      );
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'reflection':
      return <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />;
    case 'todo_update':
      return <ListTodo className="w-3.5 h-3.5 text-gray-400" />;
    case 'iteration':
      return <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />;
    case 'finalize':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    default:
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />;
  }
}

function renderEventMessage(event: AgentStateEvent | null, activeTools: string[] = [], _completedTools: string[] = []): string {
  // If there are multiple active tools, show overall status
  if (activeTools.length > 0) {
    if (activeTools.length === 1) {
      return `Ejecutando: ${activeTools[0]}`;
    } else {
      return `Ejecutando ${activeTools.length} herramientas simultáneamente`;
    }
  }

  if (!event) {
    return 'Procesando...';
  }

  switch (event.type) {
    case 'thinking':
      return event.message || `Pensando en ${event.node}...`;
    case 'tool_call':
      return `Ejecutando: ${formatToolName(event.toolName)}`;
    case 'tool_result':
      if (event.success) {
        return `✓ ${formatToolName(event.toolName)} completado`;
      } else {
        return `✗ Error en ${formatToolName(event.toolName)}: ${event.error || 'Error desconocido'}`;
      }
    case 'error':
      return `Error: ${event.error}`;
    case 'reflection':
      return event.message;
    case 'todo_update':
      const completed = event.todos.filter(t => t.status === 'completed').length;
      const total = event.todos.length;
      return `Tareas: ${completed}/${total} completadas`;
    case 'iteration':
      return `Iteración ${event.count}/${event.max}`;
    case 'finalize':
      return event.message || 'Finalizando...';
    default:
      return 'Procesando...';
  }
}

function formatToolName(toolName: string): string {
  const toolNames: Record<string, string> = {
    // Company tools
    'search_companies': 'Acceder a la base de datos empresarial',
    'get_company_details': 'Obtener detalles de empresa',
    'refine_search': 'Refinar búsqueda',
    'export_companies': 'Exportar empresas a Excel',
    // Web search
    'web_search': 'Búsqueda en internet',
    // Contact tools
    'enrich_company_contacts': 'Buscar contactos ejecutivos',
    // Email tools (if re-enabled in future)
    'generate_sales_email': 'Generar email de ventas',
  };
  return toolNames[toolName] || toolName;
}

// Detailed state panel (expandable)
interface AgentStateDetailProps {
  events: AgentStateEvent[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function AgentStateDetail({ events, isExpanded, onToggle }: AgentStateDetailProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors font-normal"
      >
        <span>{isExpanded ? '▼' : '▶'}</span>
        <span>Ver detalles del agente ({events.length} eventos)</span>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="bg-gray-50/50 border border-gray-200/60 rounded-lg p-3 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-2 text-xs p-2 rounded border border-gray-200/60 bg-white/50"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {renderEventIcon(event)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-normal text-gray-500 text-[11px]">
                        {event.type === 'thinking' && `[${event.node}]`}
                        {event.type === 'tool_call' && `[Tool Call]`}
                        {event.type === 'tool_result' && `[Tool Result]`}
                        {event.type === 'error' && `[Error]`}
                        {event.type === 'reflection' && `[Reflection]`}
                        {event.type === 'todo_update' && `[Todo Update]`}
                        {event.type === 'iteration' && `[Iteration]`}
                        {event.type === 'finalize' && `[Finalize]`}
                      </div>
                      <div className="text-gray-500 break-words text-[11px] font-normal">
                        {renderEventMessage(event)}
                      </div>
                      {event.type === 'tool_call' && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-gray-400 hover:text-gray-600 text-[10px]">
                            Ver input
                          </summary>
                          <pre className="mt-1 text-[10px] bg-white/50 p-2 rounded border border-gray-200/60 overflow-x-auto text-gray-500">
                            {JSON.stringify(event.input, null, 2)}
                          </pre>
                        </details>
                      )}
                      {event.type === 'tool_result' && event.output != null && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-gray-400 hover:text-gray-600 text-[10px]">
                            Ver output
                          </summary>
                          <pre className="mt-1 text-[10px] bg-white/50 p-2 rounded border border-gray-200/60 overflow-x-auto max-h-32 text-gray-500">
                            {JSON.stringify(event.output, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

