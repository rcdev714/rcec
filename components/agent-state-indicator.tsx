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
  | { type: 'tool_call'; toolName: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; success: boolean; output?: unknown; error?: string }
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

export function AgentStateIndicator({ events, isActive }: AgentStateIndicatorProps) {
  // Get the most recent event
  const currentEvent = events.length > 0 ? events[events.length - 1] : null;

  if (!isActive && !currentEvent) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {(isActive || currentEvent) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-3"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50/50 border border-gray-200/60 rounded-lg px-3 py-2">
            {renderEventIcon(currentEvent)}
            <span className="flex-1 font-normal">{renderEventMessage(currentEvent)}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function renderEventIcon(event: AgentStateEvent | null) {
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
      return <AlertCircle className="w-3.5 h-3.5 text-gray-500" />;
    case 'reflection':
      return <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />;
    case 'todo_update':
      return <ListTodo className="w-3.5 h-3.5 text-gray-400" />;
    case 'iteration':
      return <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />;
    case 'finalize':
      return <CheckCircle2 className="w-3.5 h-3.5 text-gray-500" />;
    default:
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />;
  }
}

function renderEventMessage(event: AgentStateEvent | null): string {
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

