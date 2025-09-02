import Stripe from 'stripe';

// Lazily initialize Stripe to avoid build-time failures when env isn't loaded
let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeSingleton = new Stripe(secretKey, {
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
