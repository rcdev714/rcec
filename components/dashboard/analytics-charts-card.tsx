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

type TimePeriod = '7D' | '1M' | '3M';

export default function AnalyticsChartsCard() {
  const [data, setData] = useState<UsageData>({ searches: [], prompts: [], tokens: [] });
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ searches: 0, prompts: 0, tokens: 0 });
  const [plan, setPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7D');
  const gradientBaseId = useId().replace(/:/g, '');

  const getDaysFromPeriod = (period: TimePeriod): number => {
    switch (period) {
      case '7D':
        return 7;
      case '1M':
        return 30;
      case '3M':
        return 90;
      default:
        return 7;
    }
  };

  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case '7D':
        return '7 días';
      case '1M':
        return '1 mes';
      case '3M':
        return '3 meses';
      default:
        return '7 días';
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        setLoading(true);
        const days = getDaysFromPeriod(timePeriod);
        const timeseriesRes = await fetch(`/api/usage/timeseries?days=${days}`);
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
  }, [timePeriod]);

  const chartConfig = [
    {
      title: 'Consumo de Tokens',
      data: data.tokens,
      total: totals.tokens,
      isTokens: true,
    },
    {
      title: 'Consumo de Prompts',
      data: data.prompts,
      total: totals.prompts,
      isTokens: false,
    },
    {
      title: 'Tendencia de Búsquedas',
      data: data.searches,
      total: totals.searches,
      isTokens: false,
    },
  ];

  if (error) {
    return (
      <Card className="border-gray-200 shadow-sm bg-gray-50">
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
      <Card className="border-gray-200 shadow-sm bg-gray-50">
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
    <Card className="border-gray-200 shadow-sm bg-gray-50 relative">
      <CardHeader className="pb-3 border-b border-gray-100/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-900">
            Tendencias de Uso ({getPeriodLabel(timePeriod)})
          </CardTitle>
          <div className="flex gap-1">
            <button
              onClick={() => setTimePeriod('7D')}
              className={`px-3 py-1.5 rounded-md text-xs font-normal transition-colors ${
                timePeriod === '7D'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimePeriod('1M')}
              className={`px-3 py-1.5 rounded-md text-xs font-normal transition-colors ${
                timePeriod === '1M'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              1M
            </button>
            <button
              onClick={() => setTimePeriod('3M')}
              className={`px-3 py-1.5 rounded-md text-xs font-normal transition-colors ${
                timePeriod === '3M'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              3M
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className={`space-y-8 ${isFreeTier ? 'blur-sm pointer-events-none opacity-50' : ''}`}>
          {chartConfig.map((chart, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{chart.title}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {chart.isTokens ? formatTokenCount(chart.total) : chart.total.toLocaleString()}
                </span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`${gradientBaseId}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeWidth={1} />
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
                      formatter={(value: number) => [
                        chart.isTokens ? formatTokenCount(value) : value.toLocaleString(),
                        chart.isTokens ? 'Tokens' : chart.title.includes('Prompts') ? 'Prompts' : 'Búsquedas'
                      ]}
                    />
                    <Area
                      type="linear"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill={`url(#${gradientBaseId}-${idx})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* Overlay for Free Tier */}
        {isFreeTier && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl z-10">
            <div className="text-center space-y-4 p-6 max-w-xs">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-indigo-900">
                  Analíticas Avanzadas
                </h3>
                <p className="text-xs text-indigo-600 leading-relaxed">
                  Desbloquea gráficos detallados y métricas históricas con un plan superior.
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/pricing'}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-full text-xs h-8"
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
