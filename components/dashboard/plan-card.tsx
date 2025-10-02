'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon } from '@heroicons/react/20/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface UsageSummary {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  planDollarLimit: number;
  usage: {
    prompt_dollars: number;
  };
}

interface PlanFeature {
  name: string;
  free: boolean;
  pro: boolean;
  enterprise: boolean;
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

  const features: PlanFeature[] = [
    { name: 'Chat con IA (10 mensajes/mes)', free: true, pro: false, enterprise: false },
    { name: 'Chat con IA (100 mensajes/mes)', free: false, pro: true, enterprise: false },
    { name: 'Chat con IA (500 mensajes/mes)', free: false, pro: false, enterprise: true },
    { name: 'Búsqueda manual limitada (10/mes)', free: true, pro: false, enterprise: false },
    { name: 'Búsqueda ilimitada de empresas', free: false, pro: true, enterprise: true },
    { name: 'IA', free: true, pro: true, enterprise: true },
    { name: 'Modo Agente', free: false, pro: true, enterprise: true },
    { name: 'Exportación de datos', free: false, pro: true, enterprise: true },
    { name: 'Búsqueda en LinkedIn', free: false, pro: true, enterprise: true },
    { name: 'Integraciones personalizadas', free: false, pro: false, enterprise: true },
    { name: 'Soporte dedicado', free: false, pro: false, enterprise: true },
  ];

  const getCurrentPlanFeatures = () => {
    if (!summary) return features.map(f => ({ ...f, available: false }));

    const planKey = summary.plan.toLowerCase() as 'free' | 'pro' | 'enterprise';
    return features.map(feature => ({
      ...feature,
      available: feature[planKey]
    }));
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm text-gray-900">
      <CardHeader className="flex items-center justify-between flex-row">
        <div>
          <CardTitle className="text-base">Plan Actual</CardTitle>
          <div className="mt-1">
            <Badge className={
              summary?.plan === 'PRO' ? 'bg-blue-100 text-blue-800' :
              summary?.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
            }>
              {summary ? planLabel(summary.plan) : '—'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-4">
          {getCurrentPlanFeatures().map((feature, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 flex-1">{feature.name}</span>
              <div className="ml-2">
                {feature.available ? (
                  <CheckIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <XMarkIcon className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-indigo-600 text-indigo-600 hover:bg-indigo-500 hover:text-white"
            onClick={() => router.push('/pricing')}
          >
            Cambiar Plan
          </Button>
          <Button
            variant="default"
            size="sm"
            className="ml-auto bg-indigo-500 hover:bg-indigo-600"
            onClick={() => router.push('/settings')}
          >
            Configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


