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
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      );
    }

    const percent = Math.min(100, (value / limit) * 100);
    const isWarning = percent >= 70 && percent < 90;
    const isDanger = percent >= 90;

    return (
      <div className="p-4 rounded border border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-base text-gray-500">{value} / {limit}</div>
        </div>
        <div className="mt-3">
          <div className="relative w-full h-4 rounded bg-gray-100 border border-gray-200 overflow-hidden">
            {/* Qualitative ticks at 70% and 90% */}
            <div className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: '70%' }} />
            <div className="absolute top-0 bottom-0 w-px bg-gray-300" style={{ left: '90%' }} />
            {/* Primary measure */}
            <div
              className={`h-full rounded-r ${isDanger ? 'bg-red-600' : isWarning ? 'bg-yellow-500' : 'bg-gray-900'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px] text-gray-500">
            <span>0%</span>
            <span>70%</span>
            <span>90%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm text-gray-900">
      <CardHeader className="flex items-center justify-between flex-row">
        <CardTitle className="text-base">Tus analíticas</CardTitle>
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


