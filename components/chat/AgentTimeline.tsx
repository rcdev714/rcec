import React from 'react';
import { LoaderCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to format tool names for display
const formatToolName = (toolName: string): string => {
  const toolNames: Record<string, string> = {
    // Company tools
    'search_companies': 'Búsqueda en base de datos empresarial',
    'search_companies_by_sector': 'Búsqueda por sector industrial',
    'get_company_details': 'Obtener detalles de empresa',
    'refine_search': 'Refinar búsqueda en base de datos empresarial',
    'export_companies': 'Exportar empresas',
    // Web search
    'web_search': 'Búsqueda en internet',
    'tavily_web_search': 'Búsqueda en internet (Tavily)',
    'perplexity_search': 'Investigación profunda (Perplexity)',
    'web_extract': 'Extraer información de páginas web',
    // Contact tools
    'enrich_company_contacts': 'Buscar contactos en base de datos empresarial',
    // Offerings tools
    'list_user_offerings': 'Ver mis servicios/productos',
    'get_offering_details': 'Obtener detalles de mi servicio',
    // Email tools
    'generate_sales_email': 'Generar email de ventas',
  };
  return toolNames[toolName] || toolName;
};

// Tool Run Interface
interface ToolRun {
  toolName: string;
  toolCallId: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  thought?: string;
  output?: unknown;
}

interface AgentTimelineProps {
  events: any[]; // AgentStateEvent[]
}

export function AgentTimeline({ events }: AgentTimelineProps) {
  // Keep only tool events and thinking; drop others
  const relevant = events.filter(e => e.type === 'tool_call' || e.type === 'tool_result' || e.type === 'thinking');
  
  // Boilerplate to hide
  const GENERIC_THINKING = /(cargando.*contexto|planificando.*tarea|ejecutando.*herramient|procesando.*resultado|analizando.*consulta|finalizando.*respuesta)/i;
  
  const runs: ToolRun[] = [];
  const byId = new Map<string, ToolRun>();
  const pendingStack: string[] = [];
  
  const attachThought = (text: string) => {
    const msgText = (text || '').trim();
    if (!msgText || GENERIC_THINKING.test(msgText)) return;
    let target: ToolRun | undefined;
    if (pendingStack.length > 0) {
      target = byId.get(pendingStack[pendingStack.length - 1]);
    } else if (runs.length > 0) {
      target = runs[runs.length - 1];
    }
    if (target && !target.thought) target.thought = msgText;
  };
  
  for (const ev of relevant) {
    if (ev.type === 'tool_call') {
      const r: ToolRun = { toolName: ev.toolName, toolCallId: ev.toolCallId, status: 'pending' };
      runs.push(r);
      byId.set(ev.toolCallId, r);
      pendingStack.push(ev.toolCallId);
    } else if (ev.type === 'tool_result') {
      const r = byId.get(ev.toolCallId);
      if (r) {
        r.status = ev.success ? 'success' : 'failed';
        if ((ev as any).output !== undefined) r.output = (ev as any).output;
        if (!ev.success && ev.error) r.error = ev.error;
      }
      // remove from pending stack if present
      const idx = pendingStack.lastIndexOf(ev.toolCallId);
      if (idx !== -1) pendingStack.splice(idx, 1);
    } else if (ev.type === 'thinking') {
      attachThought(ev.message || '');
    }
  }
  
  const summarizeOutput = (out: any): string | null => {
    try {
      if (!out) return null;
      if (typeof out === 'string') return out.slice(0, 200);
      if (out.success === false && out.error) return String(out.error).slice(0, 200);
      const data = out.result || out;
      if (data?.companies && Array.isArray(data.companies)) {
        return `Resultados: ${data.companies.length} empresas`;
      }
      if (data?.company && (data.company.nombre || data.company.nombre_comercial)) {
        return `Empresa: ${data.company.nombre || data.company.nombre_comercial}`;
      }
      if (data?.results && Array.isArray(data.results)) {
        return `Resultados: ${data.results.length}`;
      }
      if (data?.contacts && Array.isArray(data.contacts)) {
        return `Contactos: ${data.contacts.length}`;
      }
      if (data?.message) return String(data.message).slice(0, 200);
      return null;
    } catch {
      return null;
    }
  };
  
  if (runs.length === 0) return null;
  
  return (
    <div className="mb-3 p-2.5 md:p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-2.5 text-xs text-gray-600">
        <span className="font-medium text-gray-900">Ejecución del agente</span>
        <span className="ml-auto text-[11px] text-gray-400">
          {runs.length} {runs.length === 1 ? 'paso' : 'pasos'}
        </span>
      </div>
      <div className="space-y-2">
        {runs.map((run, i) => {
          const derivedThought = run.thought || summarizeOutput(run.output);
          const statusLabel = run.status === 'pending'
            ? 'En progreso'
            : run.status === 'failed'
              ? 'Error'
              : 'Completado';
          const statusColor = run.status === 'pending'
            ? 'text-amber-500'
            : run.status === 'failed'
              ? 'text-red-500'
              : 'text-green-500';

          return (
            <div key={`run-${run.toolCallId || i}`} className="text-xs rounded-lg bg-white/90 border border-indigo-100/60 shadow-sm">
              <div className="flex items-center gap-2.5 p-2">
                <div className="flex-shrink-0">
                  {run.status === 'pending' ? (
                    <LoaderCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500 animate-spin" />
                  ) : run.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900">
                    {formatToolName(run.toolName)}
                  </div>
                  <div className={cn("text-[10px] font-semibold uppercase tracking-wide", statusColor)}>
                    {statusLabel}
                  </div>
                </div>
              </div>
              {(run.error || derivedThought) && (
                <div className="px-2 pb-2">
                  {run.error && (
                    <div className="text-[10px] text-red-500/80 mt-0.5 truncate" title={run.error}>{run.error}</div>
                  )}
                  {derivedThought && (
                    <div className="mt-1 p-2 rounded-lg bg-gray-50 border border-gray-100 text-[10px] md:text-[11px] text-gray-700">
                      {derivedThought}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

