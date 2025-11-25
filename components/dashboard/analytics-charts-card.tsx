'use client';

import { useEffect, useId, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTokenCount } from '@/lib/token-counter';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataPoint {
  date: string;
  value: number;
}

interface UsageData {
  searches: DataPoint[];
  prompts: DataPoint[];
  tokens: DataPoint[];
}

interface TimeseriesDataPoint {
  date: string;
  searches: number;
  prompts: number;
  tokens: number;
}

export default function AnalyticsChartsCard() {
  const [data, setData] = useState<UsageData>({ searches: [], prompts: [], tokens: [] });
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ searches: 0, prompts: 0, tokens: 0 });
  const [plan, setPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
  const [error, setError] = useState<string | null>(null);
  const gradientBaseId = useId().replace(/:/g, '');
  const promptsGradientId = `${gradientBaseId}-prompts`;
  const tokensGradientId = `${gradientBaseId}-tokens`;
  const valueGradientId = `${gradientBaseId}-value`;

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const timeseriesRes = await fetch('/api/usage/timeseries?days=7');
        const summaryRes = await fetch('/api/usage/summary');

        if (!timeseriesRes.ok || !summaryRes.ok) {
          console.error('Error fetching analytics data: Invalid response status');
          setError('No pudimos cargar tus analíticas. Intenta nuevamente.');
          setData({ searches: [], prompts: [], tokens: [] });
          setTotals({ searches: 0, prompts: 0, tokens: 0 });
          setLoading(false);
          return;
        }

        const timeseriesData = await timeseriesRes.json();
        const summary = await summaryRes.json();
        
        setPlan(summary.plan || 'FREE');

        const formatDate = (dateStr: string) => {
          try {
            const hasTimeComponent = /T/.test(dateStr) || /[+-]\d{2}:?\d{2}$/.test(dateStr) || /Z$/.test(dateStr);
            const normalizedDate = hasTimeComponent ? dateStr : `${dateStr}T00:00:00Z`;
            const parsedDate = new Date(normalizedDate);
            if (Number.isNaN(parsedDate.getTime())) {
              throw new Error('Invalid date');
            }
            return parsedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
          } catch (err) {
            console.warn('Error formatting date:', dateStr, err);
            return dateStr || 'Fecha inválida';
          }
        };

        const searches: DataPoint[] = timeseriesData.data.map((d: TimeseriesDataPoint) => ({
          date: formatDate(d.date),
          value: d.searches
        }));

        const prompts: DataPoint[] = timeseriesData.data.map((d: TimeseriesDataPoint) => ({
          date: formatDate(d.date),
          value: d.prompts
        }));

        const tokens: DataPoint[] = timeseriesData.data.map((d: TimeseriesDataPoint) => ({
          date: formatDate(d.date),
          value: d.tokens
        }));

        setData({ searches, prompts, tokens });
        
        const totalTokensFromTimeseries = timeseriesData.data.reduce((sum: number, d: TimeseriesDataPoint) => sum + d.tokens, 0);
        
        setTotals({
          searches: summary.usage?.searches || 0,
          prompts: summary.usage?.prompts || 0,
          tokens: totalTokensFromTimeseries,
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setError('Ocurrió un problema al cargar los gráficos.');
        setData({ searches: [], prompts: [], tokens: [] });
        setTotals({ searches: 0, prompts: 0, tokens: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const promptsTokensData = data.prompts.map((point, idx) => ({
    date: point.date,
    prompts: point.value,
    tokens: data.tokens[idx]?.value || 0,
  }));

  const chartConfig = [
    {
      title: 'Tendencia de Búsquedas',
      data: data.searches,
      total: totals.searches,
      isTokens: false,
      isCombined: false,
    },
    {
      title: 'Consumo de Prompts & Tokens',
      data: promptsTokensData,
      total: totals.prompts,
      secondaryTotal: totals.tokens,
      isTokens: false,
      isCombined: true,
    },
  ];

  if (error) {
    return (
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-gray-100/50">
          <CardTitle className="text-sm font-medium text-gray-900">Gráficos de Tendencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-gray-100/50">
          <CardTitle className="text-sm font-medium text-gray-900">Gráficos de Tendencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400 text-sm">Cargando gráficos...</div>
        </CardContent>
      </Card>
    );
  }

  const isFreeTier = plan === 'FREE';

  return (
    <Card className="border-gray-200 shadow-sm bg-white relative">
      <CardHeader className="pb-3 border-b border-gray-100/50">
        <CardTitle className="text-sm font-medium text-gray-900">Tendencias de Uso (7 días)</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className={`space-y-8 ${isFreeTier ? 'blur-sm pointer-events-none opacity-50' : ''}`}>
          {chartConfig.map((chart, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{chart.title}</span>
                {chart.isCombined ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-sm font-semibold text-gray-900">{chart.total.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">prompts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                      <span className="text-sm font-semibold text-gray-900">{formatTokenCount(chart.secondaryTotal || 0)}</span>
                      <span className="text-xs text-gray-400">tokens</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-gray-900">
                    {chart.isTokens ? formatTokenCount(chart.total) : chart.total.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.isCombined ? (
                    <AreaChart data={chart.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id={promptsGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id={tokensGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                        formatter={(value: number, name: string) => [
                          name === 'tokens' ? formatTokenCount(value) : value,
                          name === 'prompts' ? 'Prompts' : 'Tokens'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="prompts"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill={`url(#${promptsGradientId})`}
                      />
                      <Area
                        type="monotone"
                        dataKey="tokens"
                        stroke="#9ca3af"
                        strokeWidth={2}
                        fill={`url(#${tokensGradientId})`}
                      />
                    </AreaChart>
                  ) : (
                    <AreaChart data={chart.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id={valueGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill={`url(#${valueGradientId})`}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* Overlay for Free Tier */}
        {isFreeTier && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl z-10">
            <div className="text-center space-y-4 p-6 max-w-xs">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  Analíticas Avanzadas
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Desbloquea gráficos detallados y métricas históricas con un plan superior.
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/pricing'}
                size="sm"
                className="bg-gray-900 hover:bg-gray-800 text-white w-full text-xs h-8"
              >
                Actualizar Plan
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
