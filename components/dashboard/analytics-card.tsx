'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Point = { date: string; searches: number; exports: number };

export default function AnalyticsCard() {
  const [series, setSeries] = useState<Point[]>([]);
  const [range, setRange] = useState<'1d' | '7d' | '30d'>('7d');
  const [monthlyCounts, setMonthlyCounts] = useState<{ searches: number; exports: number }>({ searches: 0, exports: 0 });
  const [limits, setLimits] = useState<{ searches: number; exports: number }>({ searches: -1, exports: -1 });

  useEffect(() => {
    async function load() {
      const days = range === '1d' ? 1 : range === '7d' ? 7 : 30;
      // Fetch timeseries for sparkline
      const ts = await fetch(`/api/usage/timeseries?days=${days}`);
      if (ts.ok) {
        const data = await ts.json();
        setSeries(data.data as Point[]);
      }
      // Fetch monthly summary for accurate counters
      const sum = await fetch('/api/usage/summary');
      if (sum.ok) {
        const data = await sum.json();
        setMonthlyCounts({ searches: data.usage?.searches || 0, exports: data.usage?.exports || 0 });
        setLimits({ searches: data.limits?.searches ?? -1, exports: data.limits?.exports ?? -1 });
      }
    }
    load();
  }, [range]);

  const metrics = useMemo(() => ({
    searches: monthlyCounts.searches,
    exports: monthlyCounts.exports,
  }), [monthlyCounts]);

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="flex items-center justify-between flex-row">
        <CardTitle className="text-base">Tus analíticas</CardTitle>
        <div className="flex gap-1 text-xs">
          {(['1d','7d','30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 rounded border ${range===r ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'}`}
            >{r}</button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded border border-gray-200 bg-white">
            <div className="text-xs text-muted-foreground">Búsquedas</div>
            <div className="text-xl font-semibold">
              {metrics.searches}{limits.searches === -1 ? '' : ` / ${limits.searches}`}
            </div>
            {limits.searches !== -1 && (
              <div className="mt-2 w-full h-2 bg-gray-200 rounded">
                <div
                  className="h-2 bg-gray-900 rounded"
                  style={{ width: `${Math.min(100, (metrics.searches / limits.searches) * 100)}%` }}
                />
              </div>
            )}
          </div>
          <div className="p-3 rounded border border-gray-200 bg-white">
            <div className="text-xs text-muted-foreground">Exportaciones</div>
            <div className="text-xl font-semibold">
              {metrics.exports}{limits.exports === -1 ? '' : ` / ${limits.exports}`}
            </div>
            {limits.exports !== -1 && (
              <div className="mt-2 w-full h-2 bg-gray-200 rounded">
                <div
                  className="h-2 bg-gray-900 rounded"
                  style={{ width: `${Math.min(100, (metrics.exports / limits.exports) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 h-40 w-full bg-gray-50 border border-gray-200 rounded relative overflow-hidden">
          {series.length > 1 && (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 160" preserveAspectRatio="none">
              {(() => {
                const pad = 8;
                const w = 300; const h = 160;
                const maxY = Math.max(1, ...series.map(p => p.searches));
                const step = (w - pad * 2) / (series.length - 1);
                const pts = series.map((p, i) => {
                  const x = pad + i * step;
                  const y = h - pad - (p.searches / maxY) * (h - pad * 2);
                  return `${x},${y}`;
                }).join(' ');
                return (
                  <g>
                    <polyline points={pts} fill="none" stroke="#1f2937" strokeWidth="2" />
                    {series.map((p, i) => {
                      const x = pad + i * step;
                      const y = h - pad - (p.searches / maxY) * (h - pad * 2);
                      return <circle key={i} cx={x} cy={y} r="2" fill="#1f2937" />
                    })}
                  </g>
                );
              })()}
            </svg>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


