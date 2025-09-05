'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
// Removed server-side imports to fix Next.js error
import { UserSubscription } from '@/types/subscription';

// Usage limits function moved here to avoid server-side imports
function getUsageLimits(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  // Monthly limits aligned with server usage tracking (lib/usage.ts)
  const limits = {
    FREE: {
      searches_per_month: 100,
      exports_per_month: 10,
    },
    PRO: {
      searches_per_month: -1, // unlimited
      exports_per_month: 50,
    },
    ENTERPRISE: {
      searches_per_month: -1, // unlimited
      exports_per_month: -1, // unlimited
    },
  } as const;

  return limits[plan];
}

type UsageSummary = {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  usage: { searches: number; exports: number };
};

export default function UsageLimits() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<{
    searches_this_month: number;
    exports_this_month: number;
    searches_limit: number;
    exports_limit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Load subscription for plan label
        const [statusResp, summaryResp] = await Promise.all([
          fetch('/api/subscriptions/status'),
          fetch('/api/usage/summary'),
        ]);

        if (statusResp.ok) {
          const data = await statusResp.json();
          setSubscription(data.subscription);
        }

        if (summaryResp.ok) {
          const summary: UsageSummary = await summaryResp.json();
          console.debug('UsageLimits summary', summary);
          const limits = getUsageLimits(summary.plan);
          setUsage({
            searches_this_month: summary.usage.searches || 0,
            exports_this_month: summary.usage.exports || 0,
            searches_limit: limits.searches_per_month,
            exports_limit: limits.exports_per_month,
          });
        }
      } catch (error) {
        console.error('Error fetching usage data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Límites de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription || !usage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Límites de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No se pudieron cargar los datos de uso</p>
        </CardContent>
      </Card>
    );
  }

  const searchesPercentage = usage.searches_limit === -1 
    ? 0 
    : (usage.searches_this_month / usage.searches_limit) * 100;
    
  const exportsPercentage = usage.exports_limit === -1 
    ? 0 
    : (usage.exports_this_month / usage.exports_limit) * 100;

  // const getProgressColor = (percentage: number) => {
  //   if (percentage >= 90) return 'bg-red-500';
  //   if (percentage >= 70) return 'bg-yellow-500';
  //   return 'bg-green-500';
  // };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Límites de Uso
          <Badge className="ml-2">
            {subscription.plan}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Searches */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Búsquedas Mensuales</span>
            <span className="text-sm text-gray-600">
              {usage.searches_this_month} / {usage.searches_limit === -1 ? '∞' : usage.searches_limit}
            </span>
          </div>
          {usage.searches_limit !== -1 && (
            <Progress 
              value={Math.min(searchesPercentage, 100)} 
              className="h-2"
            />
          )}
          {usage.searches_limit === -1 && (
            <div className="text-sm text-green-600 font-medium">Ilimitado</div>
          )}
        </div>

        {/* Exports */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Exportaciones Mensuales</span>
            <span className="text-sm text-gray-600">
              {usage.exports_this_month} / {usage.exports_limit === -1 ? '∞' : usage.exports_limit}
            </span>
          </div>
          {usage.exports_limit !== -1 && usage.exports_limit > 0 && (
            <Progress 
              value={Math.min(exportsPercentage, 100)} 
              className="h-2"
            />
          )}
          {usage.exports_limit === -1 && (
            <div className="text-sm text-green-600 font-medium">Ilimitado</div>
          )}
          {usage.exports_limit === 0 && (
            <div className="text-sm text-gray-500">No disponible en el plan gratuito</div>
          )}
        </div>

        {/* Warning messages */}
        {searchesPercentage >= 90 && usage.searches_limit !== -1 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              Te estás acercando a tu límite diario de búsquedas. Considera actualizar para búsquedas ilimitadas.
            </p>
          </div>
        )}

        {exportsPercentage >= 90 && usage.exports_limit !== -1 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Te estás acercando a tu límite mensual de exportaciones.
            </p>
          </div>
        )}

        {subscription.plan === 'FREE' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Actualiza a Pro para búsquedas ilimitadas y capacidades de exportación.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
