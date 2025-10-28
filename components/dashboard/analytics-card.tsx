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
      // Fetch summary and cost summary for accurate data
      const [sumRes, costSummaryRes] = await Promise.all([
        fetch('/api/usage/summary'),
        fetch('/api/agent/cost-summary') // New dedicated endpoint for accurate cost aggregation
      ]);
      
      if (sumRes.ok) {
        const summary = await sumRes.json();
        
        // Get accurate cost from dedicated aggregation endpoint
        let totalDollars = summary.usage?.cost_dollars || 0; // Fallback to DB value
        let totalTokens = (summary.usage?.input_tokens || 0) + (summary.usage?.output_tokens || 0);
        
        if (costSummaryRes.ok) {
          const costData = await costSummaryRes.json();
          totalDollars = costData.totalCost || 0;
          totalTokens = costData.totalTokens || 0;
          
          console.log('[Analytics] Using cost summary data:', { 
            totalTokens, 
            totalDollars,
            messageCount: costData.messageCount 
          });
        } else {
          console.error('[Analytics] Failed to fetch cost summary, falling back to summary data');
          console.log('[Analytics] Using fallback data:', { 
            totalTokens, 
            totalDollars 
          });
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
      } else {
        console.error('[Analytics] Failed to fetch usage summary');
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


