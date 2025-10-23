'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Point = { date: string; searches: number; exports: number };

export default function AnalyticsCard() {
  const [_series] = useState<Point[]>([]);
  // Keep internal series if we later add tiny sparklines; not shown now
  const [monthlyCounts, setMonthlyCounts] = useState<{ searches: number; exports: number; prompts: number }>({ searches: 0, exports: 0, prompts: 0 });
  const [limits, setLimits] = useState<{ searches: number; exports: number; prompts: number }>({ searches: -1, exports: -1, prompts: -1 });

  useEffect(() => {
    async function load() {
      // Monthly summary for accurate counters (tracked in lib/usage.ts)
      const sum = await fetch('/api/usage/summary');
      if (sum.ok) {
        const data = await sum.json();
        setMonthlyCounts({
          searches: data.usage?.searches || 0,
          exports: data.usage?.exports || 0,
          prompts: data.usage?.prompts || 0
        });
        setLimits({
          searches: data.limits?.searches ?? -1,
          exports: data.limits?.exports ?? -1,
          prompts: data.limits?.prompts ?? -1
        });
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => ({
    searches: monthlyCounts.searches,
    exports: monthlyCounts.exports,
    prompts: monthlyCounts.prompts,
  }), [monthlyCounts]);

  const renderBullet = (label: string, value: number, limit: number) => {
    if (limit === -1) {
      return (
        <div className="p-4 rounded border border-gray-200 bg-white">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      );
    }

    const percent = Math.min(100, (value / limit) * 100);
    const isWarning = percent >= 70 && percent < 90;
    const isDanger = percent >= 90;

    return (
      <div className="p-4 rounded border border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-sm text-gray-500">{value} / {limit}</div>
        </div>
        <div className="mt-3">
          <div className="relative w-full h-1 bg-gray-100 border border-gray-200 overflow-hidden">
            {/* Primary measure */}
            <div
              className={`h-full ${isDanger ? 'bg-red-600' : isWarning ? 'bg-yellow-500' : 'bg-gray-900'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 text-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-medium text-gray-600 text-center uppercase tracking-wide">
          <div className="w-3.5 h-3.5 mx-auto mb-1 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          Tus Analíticas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {renderBullet('Búsquedas', metrics.searches, limits.searches)}
          {renderBullet('Exportaciones', metrics.exports, limits.exports)}
          {renderBullet('Prompts', metrics.prompts, limits.prompts)}
        </div>
      </CardContent>
    </Card>
  );
}


