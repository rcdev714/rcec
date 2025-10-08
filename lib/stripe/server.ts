import Stripe from 'stripe';
import { getSubscriptionPlans } from '@/lib/plans';

// Lazily initialize Stripe to avoid build-time failures when env isn't loaded
let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeSingleton = new Stripe(secretKey, {
      // Pin API version if provided (fallback to account default when unset)
      apiVersion: (process.env.STRIPE_API_VERSION || undefined) as unknown as Stripe.LatestApiVersion,
      maxNetworkRetries: 2,
      timeout: 15000,
      appInfo: {
        name: 'rcec-main',
        version: process.env.APP_VERSION || '0.0.0',
      },
      typescript: true,
    });
  }
  return stripeSingleton;
}

// Backward-compatible proxy export so existing imports `import { stripe }` keep working
// Methods are forwarded to the lazily-created client instance
export const stripe = new Proxy({} as Stripe, {
  get(_target: Stripe, prop: PropertyKey) {
    const client = getStripe() as unknown as Record<PropertyKey, unknown>;
    return client[prop];
  },
}) as unknown as Stripe;

// Database-driven subscription plans
export async function getSubscriptionPlansForStripe() {
  try {
    const plans = await getSubscriptionPlans();

    // Transform database plans to Stripe format
    const stripePlans: Record<string, {
      name: string;
      price: number;
      priceId: string;
      features: string[];
      isPopular?: boolean;
    }> = {};

    plans.forEach(plan => {
      // Allow environment variables to override DB price IDs in production
      const envOverride =
        plan.id === 'FREE' ? process.env.STRIPE_FREE_PRICE_ID :
        plan.id === 'PRO' ? process.env.STRIPE_PRO_PRICE_ID :
        plan.id === 'ENTERPRISE' ? process.env.STRIPE_ENTERPRISE_PRICE_ID :
        undefined

      stripePlans[plan.id] = {
        name: plan.name,
        price: plan.price,
        priceId: envOverride || plan.price_id,
        features: plan.features,
        isPopular: plan.is_popular,
      };
    });

    return stripePlans;
  } catch (error) {
    console.error('Error fetching subscription plans for Stripe:', error);
    // Fallback to environment variables if database fails
    return getFallbackStripePlans();
  }
}

// Backward compatibility - synchronous version (may be slower)
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Gratuito',
    price: 0,
    priceId: process.env.STRIPE_FREE_PRICE_ID,
    features: [
      'Acceso a funciones básicas',
      'Búsqueda limitada de empresas',
      'Soporte básico',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 20,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Todas las funciones gratuitas',
      'Búsqueda ilimitada de empresas',
      'Filtros avanzados',
      'Exportación de datos',
      'Soporte prioritario',
    ],
  },
  ENTERPRISE: {
    name: 'Empresarial',
    price: 200,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Todas las funciones Pro',
      'Acceso a API',
      'Integraciones personalizadas',
      'Soporte dedicado',
      'Analíticas avanzadas',
    ],
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

// Fallback function for when database is unavailable
function getFallbackStripePlans() {
  console.warn('Using fallback Stripe plans due to database error');
  return {
    FREE: SUBSCRIPTION_PLANS.FREE,
    PRO: SUBSCRIPTION_PLANS.PRO,
    ENTERPRISE: SUBSCRIPTION_PLANS.ENTERPRISE,
  };
}
