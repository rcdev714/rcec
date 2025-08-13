'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UsageSummary {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  planDollarLimit: number;
  usage: {
    prompt_dollars: number;
  };
}

export default function PlanCard() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/usage/summary');
        if (r.ok) {
          const data = await r.json();
          setSummary(data);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const planLabel = (p: string) => (p === 'FREE' ? 'Gratuito' : p === 'PRO' ? 'Pro' : 'Empresarial');

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="flex items-center justify-between flex-row">
        <div>
          <CardTitle className="text-base">Plan</CardTitle>
          <div className="mt-1">
            <Badge className={
              summary?.plan === 'PRO' ? 'bg-blue-100 text-blue-800' :
              summary?.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' : 'light-outline'
            }>
              {summary ? planLabel(summary.plan) : '—'}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Gasto este mes</div>
          <div className="text-sm font-medium">
            {loading || !summary ? '$0' : `$${summary.usage.prompt_dollars.toFixed(2)} / $${summary.planDollarLimit}`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => (window.location.href = '/pricing')}>Cambiar Plan</Button>
        <Button variant="default" size="sm" className="ml-auto" onClick={() => (window.location.href = '/settings')}>Editar</Button>
      </CardContent>
    </Card>
  );
}


