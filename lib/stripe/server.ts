import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

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
