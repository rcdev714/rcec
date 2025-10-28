'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/animated-counter';

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
    return (
      <div className="bg-white border border-gray-200 p-2 text-center">
        <div className="text-base text-gray-900 mb-1 border-b border-gray-300 pb-1">
          <AnimatedCounter targetNumber={value} />
          {limit !== -1 ? ` / ${limit}` : ''}
        </div>
        <div className="text-xs text-gray-600 mb-1 uppercase">{label}</div>
      </div>
    );
  };

  return (
    <Card className="font-mono bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 text-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs text-gray-600 text-center uppercase tracking-wide">
        Tú Uso
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


