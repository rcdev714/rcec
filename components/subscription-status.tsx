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

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [status, setStatus] = useState<SubscriptionStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<{ start?: string; end?: string } | null>(null);

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
    // Also fetch usage summary for reliable period start/end (based on anchor)
    async function fetchPeriod() {
      try {
        const sum = await fetch('/api/usage/summary');
        if (sum.ok) {
          const data = await sum.json();
          setPeriod({ start: data?.period?.start, end: data?.period?.end });
        }
      } catch {
        // noop
      }
    }
    fetchPeriod();
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

  const getStatusColor = (planStatus: string) => {
    switch (planStatus) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'PRO':
        return 'bg-blue-100 text-blue-800';
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800';
      case 'FREE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">No se pudo cargar el estado de la suscripción</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white text-gray-900 border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle>Subscription Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Plan Actual:</span>
          <Badge className={getPlanColor(status.plan)}>
            {translatePlan(status.plan)}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Estado:</span>
          <Badge className={getStatusColor(status.status)}>
            {translateStatus(status.status)}
          </Badge>
        </div>

        {(subscription?.current_period_start || period?.start) && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Inicio del período</span>
            <span className="text-sm text-gray-600">
              {new Date((subscription?.current_period_start || period?.start) as string).toLocaleDateString()}
            </span>
          </div>
        )}
        {(subscription?.current_period_end || period?.end) && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reinicio (1 mes)</span>
            <span className="text-sm text-gray-600">
              {new Date((subscription?.current_period_end || period?.end) as string).toLocaleDateString()}
            </span>
          </div>
        )}

        {status.cancelAtPeriodEnd && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Tu suscripción será cancelada al final del período actual.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {status.plan !== 'FREE' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManageSubscription}
              className="flex-1"
            >
              Gestionar Suscripción
            </Button>
          )}
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => window.location.href = '/pricing'}
            className="flex-1"
          >
            {status.plan === 'FREE' ? 'Actualizar Plan' : 'Cambiar Plan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
