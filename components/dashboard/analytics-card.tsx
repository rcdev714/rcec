'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/animated-counter';
import { formatTokenCount } from '@/lib/token-counter';

type Point = { date: string; searches: number };

export default function AnalyticsCard() {
  const [_series] = useState<Point[]>([]);
  // Keep internal series if we later add tiny sparklines; not shown now
  const [monthlyCounts, setMonthlyCounts] = useState<{ searches: number; tokens: number; dollars: number }>({ searches: 0, tokens: 0, dollars: 0 });
  const [limits, setLimits] = useState<{ searches: number; dollars: number }>({ searches: -1, dollars: -1 });

  useEffect(() => {
    async function load() {
      // Fetch summary, timeseries, and agent logs for accurate data
      const [sumRes, timeseriesRes, logsRes] = await Promise.all([
        fetch('/api/usage/summary'),
        fetch('/api/usage/timeseries?days=30'),
        fetch('/api/agent/logs?limit=1000') // Fetch all logs for current period
      ]);
      
      if (sumRes.ok && timeseriesRes.ok) {
        const summary = await sumRes.json();
        const timeseries = await timeseriesRes.json();
        
        // Calculate total tokens from timeseries (more accurate as it comes from actual messages)
        const totalTokens = timeseries.data.reduce((sum: number, d: any) => sum + (d.tokens || 0), 0);
        
        // Calculate total dollars from agent logs (uses official pricing with multiplier)
        let totalDollars = 0;
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          totalDollars = logsData.logs?.reduce((sum: number, log: any) => sum + (log.cost || 0), 0) || 0;
        }
        
        console.log('[Analytics] Usage data:', { 
          totalTokens, 
          totalDollars, 
          dbDollars: summary.usage?.cost_dollars 
        });
        
        setMonthlyCounts({
          searches: summary.usage?.searches || 0,
          tokens: totalTokens,
          dollars: totalDollars // Use calculated total from agent logs (matches "Registros del Agente")
        });
        setLimits({
          searches: summary.limits?.searches ?? -1,
          dollars: summary.limits?.prompt_dollars ?? -1
        });
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
    return (
      <div className="bg-white border border-gray-200 p-2 text-center">
        <div className="text-base text-gray-900 mb-1 border-b border-gray-300 pb-1">
          {isDollars ? (
            <span className="font-semibold">
              ${value.toFixed(2)}
              {limit !== -1 ? ` / $${limit.toFixed(2)}` : ''}
            </span>
          ) : isTokens ? (
            <span className="font-semibold">{formatTokenCount(value)}</span>
          ) : (
            <>
              <AnimatedCounter targetNumber={value} />
              {limit !== -1 ? ` / ${limit}` : ''}
            </>
          )}
        </div>
        <div className="text-xs text-gray-600 mb-1 uppercase">{label}</div>
      </div>
    );
  };

  return (
    <Card className="font-mono bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 text-gray-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs text-gray-600 text-center tracking-wide">
        Tu Uso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {renderBullet('Búsquedas', metrics.searches, limits.searches)}
          {renderBullet('Uso Agente', metrics.dollars, limits.dollars, true)}
          {renderBullet('Tokens', metrics.tokens, -1, false, true)}
        </div>
      </CardContent>
    </Card>
  );
}


