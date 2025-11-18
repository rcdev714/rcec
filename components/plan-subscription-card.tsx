'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Calendar, RefreshCw } from 'lucide-react';
// Removed server-side imports to fix Next.js error
import { UserSubscription, SubscriptionStatus as SubscriptionStatusType } from '@/types/subscription';

// Client-side function to get subscription status
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getSubscriptionStatus(subscription: UserSubscription | null): SubscriptionStatusType {
  if (!subscription) {
    return {
      plan: 'FREE',
      status: 'inactive',
      isActive: false,
      canAccessFeature: () => false,
    };
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  
  return {
    plan: subscription.plan as 'FREE' | 'PRO' | 'ENTERPRISE',
    status: subscription.status as 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled',
    isActive,
    canAccessFeature: () => true, // Simplified for client-side
    currentPeriodEnd: subscription.current_period_end || undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

export default function PlanAndSubscriptionCard() {
  const [_subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [status, setStatus] = useState<SubscriptionStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);

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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (isMounted) {
          setPeriod(json?.period ?? null);
        }
      } catch {
        if (isMounted) {
          setPeriodError('No se pudo cargar el periodo de uso.');
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('No se pudo crear la sesión del portal');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('No se pudo abrir el portal de facturación. Por favor, intenta de nuevo.');
    }
  };


  const translatePlan = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'Gratuito';
      case 'PRO':
        return 'Pro';
      case 'ENTERPRISE':
        return 'Empresarial';
      default:
        return plan;
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'trialing':
        return 'En prueba';
      case 'past_due':
        return 'Vencido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getPlanFeatures = (plan: string) => {
    const features = {
      FREE: {
        prompts: '$5.00 en tokens/mes',
        search: 'Búsqueda limitada (10/mes)',
        linkedin: <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" />LinkedIn bloqueado</span>,
        reasoning: <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" />Modelo de razonamiento avanzado bloqueado</span>,
        analytics: <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" />Analíticas avanzadas de uso bloqueadas</span>
      },
      PRO: {
        prompts: '$20.00 en tokens/mes',
        search: <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" />Búsqueda ilimitada</span>,
        linkedin: <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" />LinkedIn disponible</span>,
        reasoning: <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" />Modelo de razonamiento avanzado disponible</span>,
        analytics: <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" />Analíticas avanzadas de uso disponibles</span>
      },
      ENTERPRISE: {
        prompts: '$200.00 en tokens/mes',
        search: <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" />Búsqueda ilimitada</span>,
        linkedin: <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" />LinkedIn disponible</span>,
        reasoning: <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" />Modelo de razonamiento avanzado disponible</span>,
        analytics: <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" />Analíticas avanzadas de uso disponibles</span>
      }
    };
    return features[plan as keyof typeof features] || features.FREE;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-center">Plan y Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-center">Plan y Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-600">Error cargando estado</div>
        </CardContent>
      </Card>
    );
  }

  const currentFeatures = status ? getPlanFeatures(status.plan) : getPlanFeatures('FREE');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-center">Plan y Suscripción</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            <Badge variant="secondary" className="mb-2">
              {status ? translatePlan(status.plan) : '—'}
            </Badge>
          </div>
          <div className="text-center">
            <Badge variant="outline">
              {status ? translateStatus(status.status) : '—'}
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Prompts Agente:</span>
              <span className="font-medium">{currentFeatures.prompts}</span>
            </div>
            <div className="flex justify-between">
              <span>Búsqueda:</span>
              <span>{currentFeatures.search}</span>
            </div>
            <div className="flex justify-between">
              <span>LinkedIn:</span>
              <span>{currentFeatures.linkedin}</span>
            </div>
            <div className="flex justify-between">
              <span>Razonamiento avanzado:</span>
              <span>{currentFeatures.reasoning}</span>
            </div>
            <div className="flex justify-between">
              <span>Analíticas avanzadas:</span>
              <span>{currentFeatures.analytics}</span>
            </div>
          </div>

          {/* Billing Period Section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-gray-900 mb-2">
                  Periodo de Facturación y Uso
                </h4>
                {period ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-900">Inicio:</span>
                      <span className="text-indigo-600">
                        {new Date(period.start).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <RefreshCw className="h-3 w-3 text-gray-500" />
                      <span className="font-medium text-gray-900">Reinicio:</span>
                      <span className="text-indigo-600">
                        {new Date(period.end).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        Tu uso se reinicia automáticamente en la fecha de reinicio mostrada arriba.
                      </p>
                    </div>
                  </div>
                ) : periodError ? (
                  <p className="text-xs text-red-600">{periodError}</p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    <span>Cargando periodo de facturación...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {status?.plan !== 'FREE' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              className="flex-1"
            >
              Gestionar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/pricing'}
            className="flex-1"
          >
            {status?.plan === 'FREE' ? 'Actualizar' : 'Cambiar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
