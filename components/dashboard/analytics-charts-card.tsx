'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Search, FileDown, MessageSquare } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
}

interface UsageData {
  searches: DataPoint[];
  exports: DataPoint[];
  prompts: DataPoint[];
}

export default function AnalyticsChartsCard() {
  const [data, setData] = useState<UsageData>({ searches: [], exports: [], prompts: [] });
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ searches: 0, exports: 0, prompts: 0 });
  const [limits, setLimits] = useState({ searches: -1, exports: -1, prompts: -1 });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch usage summary for totals
        const summaryRes = await fetch('/api/usage/summary');
        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          setTotals({
            searches: summary.usage?.searches || 0,
            exports: summary.usage?.exports || 0,
            prompts: summary.usage?.prompts || 0,
          });
          setLimits({
            searches: summary.limits?.searches ?? -1,
            exports: summary.limits?.exports ?? -1,
            prompts: summary.limits?.prompts ?? -1,
          });
        } else {
          console.error('Failed to fetch usage summary:', summaryRes.status, summaryRes.statusText);
        }

        // Generate sample time-series data (last 7 days)
        // In production, this would come from an analytics endpoint
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        });

        // For now, distribute totals across the week with some randomization
        const generateTimeSeries = (total: number) => {
          const data: DataPoint[] = [];
          let remaining = total;

          for (let i = 0; i < 7; i++) {
            const isLast = i === 6;
            const value = isLast ? remaining : Math.floor(remaining / (7 - i) * (0.7 + Math.random() * 0.6));
            data.push({ date: last7Days[i], value: Math.max(0, value) });
            remaining -= value;
          }

          return data;
        };

        setData({
          searches: generateTimeSeries(totals.searches),
          exports: generateTimeSeries(totals.exports),
          prompts: generateTimeSeries(totals.prompts),
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [totals.searches, totals.exports, totals.prompts]);

  const chartConfig = [
    {
      title: 'Búsquedas',
      data: data.searches,
      color: '#3b82f6', // blue
      icon: Search,
      total: totals.searches,
      limit: limits.searches,
    },
    {
      title: 'Prompts',
      data: data.prompts,
      color: '#8b5cf6', // purple
      icon: MessageSquare,
      total: totals.prompts,
      limit: limits.prompts,
    },
    {
      title: 'Exportaciones',
      data: data.exports,
      color: '#10b981', // emerald
      icon: FileDown,
      total: totals.exports,
      limit: limits.exports,
    },
  ];

  if (loading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium text-gray-600 text-center uppercase tracking-wide">
            <TrendingUp className="w-3.5 h-3.5 mx-auto mb-1" />
            Analíticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            <div className="text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 animate-pulse opacity-50" />
              Cargando gráficas...
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
            <TrendingUp className="w-3.5 h-3.5 mx-auto mb-1" />
            Analíticas
          </CardTitle>
          <span className="text-xs text-gray-400 font-normal">últimos 7 días</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 gap-6">
          {chartConfig.map((chart, idx) => {
            const Icon = chart.icon;
            const percentage = chart.limit > 0 ? (chart.total / chart.limit) * 100 : 0;
            const hasLimit = chart.limit > 0;
            
            return (
              <div key={idx} className="space-y-3 p-4 rounded-lg bg-gray-50/30 border border-gray-100 hover:bg-gray-50/50 transition-colors duration-200">
                {/* Header with icon and stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md" style={{ backgroundColor: `${chart.color}15` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: chart.color }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{chart.title}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">{chart.total.toLocaleString()}</span>
                    {hasLimit && (
                      <span className="text-xs text-gray-500 ml-1">/ {chart.limit.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Progress bar (if limit exists) */}
                {hasLimit && (
                  <div className="relative w-full h-2 rounded-full bg-gray-100 border border-gray-200/50 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                      style={{
                        width: `${Math.min(100, percentage)}%`,
                        backgroundColor: chart.color,
                        opacity: percentage > 90 ? 0.9 : 1,
                        boxShadow: `0 0 8px ${chart.color}30`,
                      }}
                    />
                    {percentage > 90 && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    )}
                  </div>
                )}

                {/* Chart */}
                <div className="h-28 rounded-md overflow-hidden border border-gray-100 bg-white/50">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart.data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chart.color} stopOpacity={0.4} />
                          <stop offset="70%" stopColor={chart.color} stopOpacity={0.1} />
                          <stop offset="100%" stopColor={chart.color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" stroke="#f5f5f5" vertical={false} strokeWidth={1} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: '#888', fontWeight: 500 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '11px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontWeight: 500,
                        }}
                        labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: '4px' }}
                        cursor={{ stroke: chart.color, strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={chart.color}
                        strokeWidth={2.5}
                        fill={`url(#gradient-${idx})`}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        dot={{ fill: chart.color, strokeWidth: 2, r: 3, stroke: 'white' }}
                        activeDot={{
                          r: 4,
                          fill: chart.color,
                          stroke: 'white',
                          strokeWidth: 2
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

