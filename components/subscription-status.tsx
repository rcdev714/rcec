'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        linkedin: '🔒 LinkedIn bloqueado',
        agent: '🔒 Modo Agente bloqueado'
      },
      PRO: {
        prompts: '$20.00 en tokens/mes',
        search: '✅ Búsqueda ilimitada',
        linkedin: '✅ LinkedIn disponible',
        agent: '✅ Modo Agente disponible'
      },
      ENTERPRISE: {
        prompts: '$200.00 en tokens/mes',
        search: '✅ Búsqueda ilimitada',
        linkedin: '✅ LinkedIn disponible',
        agent: '✅ Modo Agente disponible'
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
              <span>Modo Agente:</span>
              <span>{currentFeatures.agent}</span>
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
