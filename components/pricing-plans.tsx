'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckIcon } from '@heroicons/react/20/solid';
// Removed server-side import to fix Next.js error
import { UserSubscription } from '@/types/subscription';

const plans = [
  {
    id: 'FREE',
    name: 'Gratuito',
    price: 0,
    description: 'Prueba la IA para búsquedas empresariales',
    features: [
      'Chat con IA (10 mensajes/mes)',
      'Búsqueda manual limitada de empresas (100/mes)',
      'Acceso a funciones básicas',
      'Soporte básico',
      'Acceso a la comunidad',
    ],
    buttonText: 'Plan Actual',
    popular: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 20,
    description: 'Potencia tu negocio con IA avanzada',
    features: [
      'Chat con IA (100 mensajes/mes)',
      'Búsqueda ilimitada de empresas',
      'Filtros avanzados de IA',
      'Análisis inteligente de datos',
      'Exportación de datos (50/mes)',
      'Soporte prioritario',
      'Búsqueda en LinkedIn',
    ],
    buttonText: 'Actualizar a Pro',
    popular: true,
  },
  {
    id: 'ENTERPRISE',
    name: 'Empresarial',
    price: 200,
    description: 'IA empresarial para grandes organizaciones',
    features: [
      'Chat con IA (500 mensajes/mes)',
      'Búsqueda ilimitada de empresas',
      'Análisis avanzado con IA',
      'Análisis inteligente de datos',
      'Exportaciones ilimitadas',
      'Búsqueda en LinkedIn',
      'Integraciones personalizadas',
      'Soporte dedicado',
    ],
    buttonText: 'Actualizar a Empresarial',
    popular: false,
  },
];

export default function PricingPlans() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/subscriptions/status');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'FREE' || (subscription && planId === subscription.plan)) return;

    setProcessingPlan(planId);
    
    try {
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error('No se pudo crear la sesión de checkout');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('No se pudo iniciar el checkout. Por favor, intenta de nuevo.');
    } finally {
      setProcessingPlan(null);
    }
  };

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

  const getButtonText = (plan: { id: string; buttonText: string }) => {
    if (loading) return 'Cargando...';
    
    if (subscription && plan.id === subscription.plan) {
      return subscription.plan === 'FREE' ? 'Plan Actual' : 'Gestionar Suscripción';
    }
    
    if (plan.id === 'FREE') {
      return 'Cambiar a Gratuito';
    }
    
    return plan.buttonText;
  };

  const getButtonVariant = (plan: { id: string; popular: boolean }) => {
    if (subscription && plan.id === subscription.plan) {
      return plan.id === 'FREE' ? 'outline' : 'default';
    }
    return plan.popular ? 'default' : 'outline';
  };

  const isButtonDisabled = (plan: { id: string }) => {
    return loading || processingPlan !== null || (plan.id === 'FREE' && subscription && subscription.plan === 'FREE');
  };

  return (
    <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
      {plans.map((plan) => (
        <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}>
          {plan.popular && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Badge className="bg-blue-500 text-white">Más Popular</Badge>
            </div>
          )}
          
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-gray-600">/mes</span>
            </div>
            <p className="mt-2 text-gray-600">{plan.description}</p>
          </CardHeader>
          
          <CardContent>
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button
              className="w-full"
              variant={getButtonVariant(plan)}
              disabled={isButtonDisabled(plan) || false}
              onClick={() => {
                if (subscription && plan.id === subscription.plan && plan.id !== 'FREE') {
                  handleManageSubscription();
                } else if (plan.id !== 'FREE' && (!subscription || plan.id !== subscription.plan)) {
                  handlePlanSelect(plan.id);
                }
              }}
            >
              {processingPlan === plan.id ? 'Procesando...' : getButtonText(plan)}
            </Button>
            
            {subscription && plan.id === subscription.plan && (
              <div className="mt-2 text-center">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Plan Activo
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
