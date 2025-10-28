'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  modelName: string;
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
    return date.toLocaleString('es-ES', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
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
    <Card className="font-mono bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="text-center">
          <CardTitle className="text-xs text-gray-600 uppercase tracking-wide mb-1">
            <Activity className="w-3.5 h-3.5 mx-auto mb-1" />
            Registros del Agente
          </CardTitle>
          <span className="text-xs text-gray-400 font-normal">
            {isExpanded ? total : Math.min(5, logs.length)} de {total} eventos
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-xs text-gray-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3">Fecha</th>
                <th scope="col" className="px-6 py-3">Modelo</th>
                <th scope="col" className="px-6 py-3 text-right">Tokens Usados</th>
                <th scope="col" className="px-6 py-3 text-right">Costo</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, isExpanded ? logs.length : 5).map((log) => (
                <tr key={log.id} className="border-b border-gray-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/chat/${log.conversationId}`} className="text-blue-600 hover:underline">
                      {formatDate(log.timestamp)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {log.modelName}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatTokenCount(log.totalTokens)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ${log.cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={2} className="px-6 py-4">
                  Total
                </td>
                <td className="px-6 py-4 text-right">
                  {formatTokenCount(logs.reduce((sum, log) => sum + log.totalTokens, 0))}
                </td>
                <td className="px-6 py-4 text-right">
                  ${logs.reduce((sum, log) => sum + log.cost, 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Expand/Collapse Button */}
        {logs.length > 5 && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-all duration-200 border border-transparent hover:border-gray-200"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Menos</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Más ({logs.length - 5})</span>
                </>
              )}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

