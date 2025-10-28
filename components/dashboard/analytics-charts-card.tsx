'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch real time-series data for searches, prompts, and tokens
        const timeseriesRes = await fetch('/api/usage/timeseries?days=7');
        const summaryRes = await fetch('/api/usage/summary');

        if (!timeseriesRes.ok || !summaryRes.ok) {
          console.error('Failed to fetch usage data');
          return;
        }

        const timeseriesData = await timeseriesRes.json();
        const summary = await summaryRes.json();

        // Set plan for access control
        setPlan(summary.plan || 'FREE');

        // Format the real time-series data with proper date labels
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr + 'T00:00:00Z'); // Parse as UTC to avoid timezone shifts
          return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
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
        
        // Calculate total tokens from timeseries data (sum of all daily tokens)
        const totalTokensFromTimeseries = timeseriesData.data.reduce((sum: number, d: TimeseriesDataPoint) => sum + d.tokens, 0);
        
        setTotals({
          searches: summary.usage?.searches || 0,
          prompts: summary.usage?.prompts || 0,
          tokens: totalTokensFromTimeseries,
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []); // Run only once on mount

  // Combine prompts and tokens data for the merged chart
  const promptsTokensData = data.prompts.map((point, idx) => ({
    date: point.date,
    prompts: point.value,
    tokens: data.tokens[idx]?.value || 0,
  }));

  const chartConfig = [
    {
      title: 'Búsquedas',
      data: data.searches,
      total: totals.searches,
      isTokens: false,
      isCombined: false,
    },
    {
      title: 'Prompts & Tokens',
      data: promptsTokensData,
      total: totals.prompts, // Primary metric
      secondaryTotal: totals.tokens,
      isTokens: false,
      isCombined: true,
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-center">Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const isFreeTier = plan === 'FREE';

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-center">Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`space-y-6 ${isFreeTier ? 'blur-sm pointer-events-none' : ''}`}>
          {chartConfig.map((chart, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{chart.title}</span>
                {chart.isCombined ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-sm font-bold">{chart.total.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">prompts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                      <span className="text-sm font-bold">{formatTokenCount(chart.secondaryTotal || 0)}</span>
                      <span className="text-xs text-gray-500">tokens</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-lg font-bold">
                    {chart.isTokens ? formatTokenCount(chart.total) : chart.total.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.isCombined ? (
                    <AreaChart data={chart.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis yAxisId="left" hide />
                      <YAxis yAxisId="right" orientation="right" hide />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'tokens' ? formatTokenCount(value) : value,
                          name === 'prompts' ? 'Prompts' : 'Tokens'
                        ]}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="prompts"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="tokens"
                        stroke="#9ca3af"
                        fill="#f3f4f6"
                        fillOpacity={0.4}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  ) : (
                    <AreaChart data={chart.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis hide />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.1}
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
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="text-center space-y-6 p-8 max-w-md">
              <div className="flex justify-center">
                <Lock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-gray-900">
                  Analíticas Avanzadas
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Accede a gráficos detallados de uso, tendencias y métricas avanzadas con el plan Pro o Enterprise.
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
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

