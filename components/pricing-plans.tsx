'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { UserSubscription } from '@/types/subscription';
import { transformPlanForDisplay, getPlansWithLimitsClient } from '@/lib/plans-client';

// transformPlanForDisplay function is imported from plans-client.ts

// Define plan-specific features to avoid redundancy
const planFeatures = {
  FREE: [
    { name: 'Chat con IA (10 mensajes/mes)', available: true },
    { name: 'Búsqueda manual limitada (10/mes)', available: true },
    { name: 'IA', available: true },
    { name: 'Soporte básico', available: true },
    { name: 'Acceso a la comunidad', available: true },
    { name: 'Búsqueda en LinkedIn', available: false },
    { name: 'Exportación de datos', available: false },
    { name: 'Soporte prioritario', available: false }
  ],
  PRO: [
    'Chat con IA (100 mensajes/mes)',
    'Búsqueda ilimitada de empresas',
    'Modo Agente',
    'Exportación de datos (50/mes)',
    'Búsqueda en LinkedIn',
    'Soporte prioritario'
  ],
  ENTERPRISE: [
    'Chat con IA (500 mensajes/mes)',
    'Búsqueda ilimitada de empresas',
    'Modo Agente',
    'Exportaciones ilimitadas',
    'Búsqueda en LinkedIn',
    'Integraciones personalizadas',
    'Soporte dedicado'
  ]
};

// Get fallback plans (defined outside component to avoid useEffect dependency issues)
const getFallbackPlans = () => [
  {
    id: 'FREE',
    name: 'Gratuito',
    price: 0,
    description: 'Prueba la IA para búsquedas empresariales',
    features: planFeatures.FREE,
    buttonText: 'Plan Actual',
    popular: false,
    limits: { searches_per_month: 10, exports_per_month: 0, companies_per_export: 0, prompts_per_month: 10 },
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 20,
    description: 'Potencia tu negocio con IA avanzada',
    features: planFeatures.PRO,
    buttonText: 'Actualizar a Pro',
    popular: true,
    limits: { searches_per_month: -1, exports_per_month: 50, companies_per_export: 1000, prompts_per_month: 100 },
  },
  {
    id: 'ENTERPRISE',
    name: 'Empresarial',
    price: 200,
    description: 'IA empresarial para grandes organizaciones',
    features: planFeatures.ENTERPRISE,
    buttonText: 'Actualizar a Empresarial',
    popular: false,
    limits: { searches_per_month: -1, exports_per_month: -1, companies_per_export: -1, prompts_per_month: 500 },
  },
];

type PlanFeature = string | { name: string; available: boolean };

export default function PricingPlans() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<Array<{
    id: string;
    name: string;
    price: number;
    description: string;
    features: PlanFeature[] | Array<{ name: string; available: boolean }>;
    buttonText: string;
    popular: boolean;
    limits: {
      searches_per_month: number;
      exports_per_month: number;
      companies_per_export: number;
      prompts_per_month: number;
    };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch subscription status
        const subscriptionResponse = await fetch('/api/subscriptions/status');
        if (subscriptionResponse.ok) {
          const data = await subscriptionResponse.json();
          setSubscription(data.subscription);
        }

        // Fetch plans with limits from database
        const plansWithLimits = await getPlansWithLimitsClient();
        const plansForDisplay = plansWithLimits.map(plan =>
          transformPlanForDisplay(plan, plan.limits)
        );

        // Replace features with plan-specific features to avoid redundancy
        const plansWithFeatures = plansForDisplay.map(plan => ({
          ...plan,
          features: planFeatures[plan.id as keyof typeof planFeatures] || plan.features
        }));

        setPlans(plansWithFeatures);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback to hardcoded plans if database fails
        setPlans(getFallbackPlans());
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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

  const isButtonDisabled = (plan: { id: string }): boolean => {
    return !!(loading || processingPlan !== null || (plan.id === 'FREE' && subscription && subscription.plan === 'FREE'));
  };

  return (
    <div className="mt-12 space-y-6 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-8 lg:max-w-5xl lg:mx-auto">
      {plans.map((plan) => (
        <Card key={plan.id} className="relative border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              
            </div>
          )}

          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-semibold text-gray-900">{plan.name}</CardTitle>
            <div className="mt-4 mb-2">
              <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
              <span className="text-gray-500 text-sm">/mes</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{plan.description}</p>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature: PlanFeature, index: number) => {
                const isObject = typeof feature === 'object' && feature !== null;
                const featureName = isObject ? feature.name : feature;
                const isAvailable = isObject ? feature.available : true;

                return (
                  <li key={index} className="flex items-start">
                    {isAvailable ? (
                      <CheckIcon className="h-4 w-4 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <XMarkIcon className="h-4 w-4 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <span className={`text-sm leading-relaxed ${isAvailable ? 'text-gray-700' : 'text-gray-400'}`}>
                      {featureName}
                    </span>
                  </li>
                );
              })}
            </ul>

            <Button
              className="w-full h-11 text-sm font-medium"
              variant={getButtonVariant(plan)}
              disabled={isButtonDisabled(plan)}
              onClick={() => {
                if (subscription && plan.id === subscription.plan && plan.id !== 'FREE') {
                  handleManageSubscription();
                } else if (plan.id !== 'FREE' && (!subscription || plan.id !== subscription.plan)) {
                  handlePlanSelect(plan.id);
                }
              }}
            >
              {processingPlan === plan.id ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Procesando...
                </div>
              ) : (
                getButtonText(plan)
              )}
            </Button>

            {subscription && plan.id === subscription.plan && (
              <div className="mt-3 text-center">
                <Badge variant="outline" className="text-xs text-gray-600 border-gray-300 bg-gray-50">
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
