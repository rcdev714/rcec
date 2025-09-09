// Client-side plans utilities (no server imports allowed)
// Types for database-driven plans
export interface DatabasePlan {
  id: string;
  name: string;
  price: number;
  price_id: string;
  features: string[];
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanWithLimits extends DatabasePlan {
  limits: {
    searches_per_month: number;
    exports_per_month: number;
    companies_per_export: number;
    prompts_per_month: number;
  };
}

// Client-side plan functions (use API routes instead of direct database access)
export async function getSubscriptionPlansClient(): Promise<DatabasePlan[]> {
  const response = await fetch('/api/plans');

  if (!response.ok) {
    throw new Error('Failed to fetch subscription plans');
  }

  return response.json();
}

export async function getPlanByIdClient(planId: string): Promise<DatabasePlan | null> {
  const response = await fetch(`/api/plans/${planId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch plan');
  }

  return response.json();
}

// Utility functions for backward compatibility
export function isValidPlan(planId: string): boolean {
  return ['FREE', 'PRO', 'ENTERPRISE'].includes(planId);
}

export function getPlanDisplayName(planId: string): string {
  switch (planId) {
    case 'FREE': return 'Gratuito';
    case 'PRO': return 'Pro';
    case 'ENTERPRISE': return 'Empresarial';
    default: return planId;
  }
}

// Stripe integration helpers (client-side)
export async function getStripePriceIds(): Promise<Record<string, string>> {
  const plans = await getSubscriptionPlansClient();
  return plans.reduce((acc, plan) => {
    acc[plan.id] = plan.price_id;
    return acc;
  }, {} as Record<string, string>);
}

export async function getPlanFromStripePriceId(priceId: string): Promise<string | null> {
  const plans = await getSubscriptionPlansClient();
  const plan = plans.find(p => p.price_id === priceId);
  return plan?.id || null;
}

// Get plan limits (client-side version)
function getPlanLimits(planId: string) {
  switch (planId) {
    case 'FREE':
      return {
        searches_per_month: 100,
        exports_per_month: 10,
        companies_per_export: 0,
        prompts_per_month: 10
      };
    case 'PRO':
      return {
        searches_per_month: -1,
        exports_per_month: 50,
        companies_per_export: 1000,
        prompts_per_month: 100
      };
    case 'ENTERPRISE':
      return {
        searches_per_month: -1,
        exports_per_month: -1,
        companies_per_export: -1,
        prompts_per_month: 500
      };
    default:
      return {
        searches_per_month: 0,
        exports_per_month: 0,
        companies_per_export: 0,
        prompts_per_month: 0
      };
  }
}

// Transform database plan to component format
export function transformPlanForDisplay(plan: DatabasePlan, limits: {
  searches_per_month: number;
  exports_per_month: number;
  companies_per_export: number;
  prompts_per_month: number;
}) {
  const featureDescriptions: Record<string, string[]> = {
    FREE: [
      `Chat con IA (${limits.prompts_per_month} mensajes/mes)`,
      `Búsqueda manual limitada de empresas (${limits.searches_per_month}/mes)`,
      'Acceso a funciones básicas',
      'Soporte básico',
      'Acceso a la comunidad',
    ],
    PRO: [
      `Chat con IA (${limits.prompts_per_month} mensajes/mes)`,
      'Búsqueda ilimitada de empresas',
      'Filtros avanzados de IA',
      'Análisis inteligente de datos',
      `Exportación de datos (${limits.exports_per_month}/mes)`,
      'Soporte prioritario',
      'Búsqueda en LinkedIn',
    ],
    ENTERPRISE: [
      `Chat con IA (${limits.prompts_per_month} mensajes/mes)`,
      'Búsqueda ilimitada de empresas',
      'Análisis avanzado con IA',
      'Análisis inteligente de datos',
      'Exportaciones ilimitadas',
      'Búsqueda en LinkedIn',
      'Integraciones personalizadas',
      'Soporte dedicado',
    ],
  };

  const descriptions: Record<string, string> = {
    FREE: 'Prueba la IA para búsquedas empresariales',
    PRO: 'Potencia tu negocio con IA avanzada',
    ENTERPRISE: 'IA empresarial para grandes organizaciones',
  };

  const buttonTexts: Record<string, string> = {
    FREE: 'Plan Actual',
    PRO: 'Actualizar a Pro',
    ENTERPRISE: 'Actualizar a Empresarial',
  };

  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    description: descriptions[plan.id] || plan.name,
    features: featureDescriptions[plan.id] || plan.features,
    buttonText: buttonTexts[plan.id] || `Actualizar a ${plan.name}`,
    popular: plan.is_popular || false,
    limits,
  };
}

// Get plans with limits for client components
export async function getPlansWithLimitsClient(): Promise<PlanWithLimits[]> {
  const plans = await getSubscriptionPlansClient();

  return plans.map(plan => ({
    ...plan,
    limits: getPlanLimits(plan.id)
  }));
}
