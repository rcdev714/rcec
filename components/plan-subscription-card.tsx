'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, RefreshCw, Lock } from 'lucide-react';
import { UserSubscription, SubscriptionStatus as SubscriptionStatusType } from '@/types/subscription';


export default function PlanAndSubscriptionCard() {
  const [_subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [status, setStatus] = useState<SubscriptionStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/subscriptions/status');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
          setStatus(data.status);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/usage/summary', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted) {
          setPeriod(json?.period ?? null);
        }
      } catch {
        // silent error
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/portal', { method: 'POST' });
      if (!response.ok) throw new Error('Error');
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
  };

  const translatePlan = (plan: string) => {
    switch (plan) {
      case 'FREE': return 'Gratuito';
      case 'PRO': return 'Pro';
      case 'ENTERPRISE': return 'Empresarial';
      default: return plan;
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardHeader className="pb-3 border-b border-gray-100/50">
          <CardTitle className="text-sm font-medium text-gray-900">Tu Plan</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-xs text-gray-400">
          Cargando información...
        </CardContent>
      </Card>
    );
  }

  const currentPlan = status?.plan || 'FREE';
  const isPro = currentPlan !== 'FREE';

  return (
    <Card className="shadow-sm border-gray-200 bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-gray-100/50 bg-gray-50/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tu Plan</CardTitle>
          {status?.status === 'active' && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-medium border border-green-100">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Activo
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5 pb-5">
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-xl font-semibold text-gray-900">
              {translatePlan(currentPlan)}
            </h3>
            {currentPlan === 'FREE' && (
               <span className="text-xs text-gray-500 font-normal">Basic</span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            {currentPlan === 'FREE' 
              ? 'Actualiza para desbloquear todas las funciones.' 
              : 'Tienes acceso completo a la plataforma.'}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {isPro ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Lock className="w-3.5 h-3.5 text-indigo-500" />}
            <span>Búsquedas ilimitadas</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {isPro ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Lock className="w-3.5 h-3.5 text-indigo-500" />}
            <span>Acceso a LinkedIn</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {isPro ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Lock className="w-3.5 h-3.5 text-indigo-500" />}
            <span>Analíticas avanzadas</span>
          </div>
        </div>

        {period && (
          <div className="bg-gray-50/50 rounded-lg p-3 mb-4 border border-gray-100">
             <div className="flex items-center gap-2 mb-2">
               <RefreshCw className="w-3 h-3 text-gray-400" />
               <span className="text-[10px] font-medium text-gray-500 uppercase">Renovación</span>
             </div>
             <p className="text-xs text-gray-700">
               {new Date(period.end).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
             </p>
          </div>
        )}

        {isPro && (
          <Button
            onClick={handleManageSubscription}
            className="w-full h-9 text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            variant="outline"
          >
            Gestionar Suscripción
          </Button>
        )}
        {!isPro && (
          <Button
            onClick={() => window.location.href = '/pricing'}
            className="w-full h-9 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Actualizar Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
