'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AnimatedCounter } from '@/components/animated-counter';
import { formatTokenCount } from '@/lib/token-counter';

type Point = { date: string; searches: number };

export default function AnalyticsCard() {
  const [_series] = useState<Point[]>([]);
  const [monthlyCounts, setMonthlyCounts] = useState<{ searches: number; tokens: number; dollars: number }>({ searches: 0, tokens: 0, dollars: 0 });
  const [limits, setLimits] = useState<{ searches: number; dollars: number }>({ searches: -1, dollars: -1 });

  useEffect(() => {
    async function load() {
      try {
        const [sumRes, costSummaryRes] = await Promise.all([
          fetch('/api/usage/summary'),
          fetch('/api/agent/cost-summary')
        ]);
        
        if (!sumRes.ok) return;
        
        const summary = await sumRes.json();
        
        let totalDollars = summary.usage?.cost_dollars || 0;
        let totalTokens = (summary.usage?.input_tokens || 0) + (summary.usage?.output_tokens || 0);
        
        if (costSummaryRes.ok) {
          const costData = await costSummaryRes.json();
          totalDollars = costData.totalCost || 0;
          totalTokens = costData.totalTokens || 0;
        }
        
        setMonthlyCounts({
          searches: summary.usage?.searches || 0,
          tokens: totalTokens,
          dollars: totalDollars
        });
        setLimits({
          searches: summary.limits?.searches ?? -1,
          dollars: summary.limits?.prompt_dollars ?? -1
        });
      } catch (error) {
        console.error('[Analytics] Error loading data:', error);
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => ({
    searches: monthlyCounts.searches,
    tokens: monthlyCounts.tokens,
    dollars: monthlyCounts.dollars,
  }), [monthlyCounts]);

  const renderBullet = (label: string, value: number, limit: number, isDollars = false, isTokens = false) => {
    const progressValue = limit !== -1 ? Math.min((value / limit) * 100, 100) : 0;

    return (
      <div className="flex flex-col p-4 rounded-lg bg-gray-50/50 border border-gray-100">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">{label}</div>
        <div className="flex items-baseline gap-1.5 mt-auto">
          <div className="text-xl font-medium text-gray-900">
            {isDollars ? (
              `$${value.toFixed(2)}`
            ) : isTokens ? (
              formatTokenCount(value)
            ) : (
              <AnimatedCounter targetNumber={value} />
            )}
          </div>
          {limit !== -1 && (
            <span className="text-xs text-gray-400 font-light">
              / {isDollars ? `$${limit.toFixed(2)}` : limit}
            </span>
          )}
        </div>
        {isDollars && limit !== -1 && (
          <div className="mt-3">
            <Progress
              value={progressValue}
              className="h-1.5 bg-gray-200 [&>div]:bg-indigo-600"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-sm border-gray-200 bg-white">
      <CardHeader className="pb-3 border-b border-gray-100/50">
        <CardTitle className="text-sm font-medium text-gray-900">Resumen de Actividad</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {renderBullet('Búsquedas', metrics.searches, limits.searches)}
          {renderBullet('Uso Agente', metrics.dollars, limits.dollars, true)}
          {renderBullet('Tokens', metrics.tokens, -1, false, true)}
        </div>
      </CardContent>
    </Card>
  );
}
