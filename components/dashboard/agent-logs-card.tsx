'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTokenCount } from '@/lib/token-counter';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

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
        const logsResponse = await fetch('/api/agent/logs?limit=20');
        if (logsResponse.ok) {
          const data = await logsResponse.json();
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
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardHeader className="pb-3 border-b border-gray-100/50">
          <CardTitle className="text-sm font-medium text-gray-900">Historial de Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            <div className="text-center flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Cargando registros...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardHeader className="pb-3 border-b border-gray-100/50">
          <CardTitle className="text-sm font-medium text-gray-900">Historial de Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Sin actividad reciente</p>
            <p className="text-xs text-gray-500">Tus interacciones con el agente aparecerán aquí</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-gray-200 bg-white font-inter">
      <CardHeader className="pb-3 border-b border-gray-100/50 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-gray-900">Historial de Actividad</CardTitle>
        <span className="text-xs text-gray-400 font-normal bg-gray-50 px-2 py-1 rounded-full">
          {total} eventos
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] text-gray-400 uppercase tracking-wider font-medium bg-gray-50/50">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Fecha</th>
                <th scope="col" className="px-6 py-3 font-medium">Modelo</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">Tokens</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.slice(0, isExpanded ? logs.length : 5).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    <Link href={`/chat/${log.conversationId}`} className="hover:text-indigo-600 transition-colors flex items-center gap-2">
                      {formatDate(log.timestamp)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                      {log.modelName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 font-mono">
                    {formatTokenCount(log.totalTokens)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600 font-mono">
                    ${log.cost.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length > 5 && (
          <div className="flex justify-center py-3 border-t border-gray-50">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Ver más
                </>
              )}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
