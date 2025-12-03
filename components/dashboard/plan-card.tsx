'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [_loading, setLoading] = useState(true);

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


  const isFreeTier = summary?.plan === 'FREE';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-center">Current Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <Badge variant="secondary" className={isFreeTier ? 'bg-indigo-100 text-indigo-700' : ''}>
            {summary ? planLabel(summary.plan) : '—'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/pricing')}
            className={`flex-1 ${isFreeTier ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600' : ''}`}
          >
            Change Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/settings')}
            className="flex-1"
          >
            Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


