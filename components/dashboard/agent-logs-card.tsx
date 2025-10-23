'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTokenCount } from '@/lib/token-counter';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface AgentLog {
  id: string;
  conversationId: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export default function AgentLogsCard() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch('/api/agent/logs?limit=20');
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error('Error fetching agent logs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium text-gray-600 text-center uppercase tracking-wide">
            <Activity className="w-3.5 h-3.5 mx-auto mb-1" />
            Registros del Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            <div className="text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 animate-pulse opacity-50" />
              Cargando registros...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium text-gray-600 text-center uppercase tracking-wide">
            <Activity className="w-3.5 h-3.5 mx-auto mb-1" />
            Registros del Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
            <div className="text-center">
              <Activity className="w-8 h-8 mb-3 opacity-30" />
              <p className="font-medium mb-1">No hay registros de agente aún</p>
              <p className="text-xs">Los registros aparecerán después de usar el chat</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="text-center">
          <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
            <Activity className="w-3.5 h-3.5 mx-auto mb-1" />
            Registros del Agente
          </CardTitle>
          <span className="text-xs text-gray-400 font-normal">
            {isExpanded ? total : Math.min(5, logs.length)} de {total} eventos
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-4 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Fecha</th>
                <th className="text-right py-4 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Tokens Entrada</th>
                <th className="text-right py-4 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Tokens Salida</th>
                <th className="text-right py-4 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Total</th>
                <th className="text-right py-4 px-6 font-medium text-gray-500 uppercase tracking-wide text-xs">Costo</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, isExpanded ? logs.length : 5).map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors duration-150">
                  <td className="py-4 px-6 text-gray-700 whitespace-nowrap font-medium text-sm">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="py-4 px-6 text-right text-gray-600 font-mono text-sm font-medium">
                    {formatTokenCount(log.inputTokens)}
                  </td>
                  <td className="py-4 px-6 text-right text-gray-600 font-mono text-sm font-medium">
                    {formatTokenCount(log.outputTokens)}
                  </td>
                  <td className="py-4 px-6 text-right font-semibold text-gray-900 font-mono text-sm">
                    {formatTokenCount(log.totalTokens)}
                  </td>
                  <td className="py-4 px-6 text-right text-emerald-600 font-semibold font-mono text-sm">
                    ${log.cost.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50/30 font-medium">
                <td className="py-4 px-6 text-gray-800 font-bold text-sm">
                  Total {isExpanded ? '' : '(mostrando 5)'}
                </td>
                <td className="py-4 px-6 text-right text-gray-900 font-mono text-sm font-bold">
                  {formatTokenCount(logs.slice(0, isExpanded ? logs.length : 5).reduce((sum, log) => sum + log.inputTokens, 0))}
                </td>
                <td className="py-4 px-6 text-right text-gray-900 font-mono text-sm font-bold">
                  {formatTokenCount(logs.slice(0, isExpanded ? logs.length : 5).reduce((sum, log) => sum + log.outputTokens, 0))}
                </td>
                <td className="py-4 px-6 text-right font-bold text-gray-900 font-mono text-sm">
                  {formatTokenCount(logs.slice(0, isExpanded ? logs.length : 5).reduce((sum, log) => sum + log.totalTokens, 0))}
                </td>
                <td className="py-4 px-6 text-right font-bold text-emerald-700 font-mono text-sm">
                  ${logs.slice(0, isExpanded ? logs.length : 5).reduce((sum, log) => sum + log.cost, 0).toFixed(4)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Expand/Collapse Button */}
        {logs.length > 5 && (
          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 mr-1" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 mr-1" />
                  Mostrar más ({logs.length - 5} registros)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

