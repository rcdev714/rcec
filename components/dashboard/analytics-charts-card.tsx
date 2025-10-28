'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  value: number;
}

interface UsageData {
  searches: DataPoint[];
  exports: DataPoint[];
  prompts: DataPoint[];
}

interface TimeseriesDataPoint {
  date: string;
  searches: number;
  exports: number;
  prompts: number;
}

export default function AnalyticsChartsCard() {
  const [data, setData] = useState<UsageData>({ searches: [], exports: [], prompts: [] });
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ searches: 0, exports: 0, prompts: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch real time-series data for searches and exports
        const timeseriesRes = await fetch('/api/usage/timeseries?days=7');
        const summaryRes = await fetch('/api/usage/summary');

        if (!timeseriesRes.ok || !summaryRes.ok) {
          console.error('Failed to fetch usage data');
          return;
        }

        const timeseriesData = await timeseriesRes.json();
        const summary = await summaryRes.json();

        // Format the real time-series data with proper date labels
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr + 'T00:00:00Z'); // Parse as UTC to avoid timezone shifts
          return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        };

        const searches: DataPoint[] = timeseriesData.data.map((d: TimeseriesDataPoint) => ({
          date: formatDate(d.date),
          value: d.searches
        }));

        const exports: DataPoint[] = timeseriesData.data.map((d: TimeseriesDataPoint) => ({
          date: formatDate(d.date),
          value: d.exports
        }));

        const prompts: DataPoint[] = timeseriesData.data.map((d: TimeseriesDataPoint) => ({
          date: formatDate(d.date),
          value: d.prompts
        }));

        setData({ searches, exports, prompts });
        
        setTotals({
          searches: summary.usage?.searches || 0,
          exports: summary.usage?.exports || 0,
          prompts: summary.usage?.prompts || 0,
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []); // Run only once on mount

  const chartConfig = [
    {
      title: 'Búsquedas',
      data: data.searches,
      total: totals.searches,
    },
    {
      title: 'Prompts',
      data: data.prompts,
      total: totals.prompts,
    },
    {
      title: 'Exportaciones',
      data: data.exports,
      total: totals.exports,
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-center">Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {chartConfig.map((chart, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{chart.title}</span>
                <span className="text-lg font-bold">{chart.total.toLocaleString()}</span>
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
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
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

