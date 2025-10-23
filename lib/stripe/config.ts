/**
 * Stripe configuration utility
 * Handles switching between test and live mode based on environment
 */

export function getStripeConfig() {
  const isTestMode = process.env.STRIPE_MODE === 'test' || process.env.NODE_ENV === 'test';

  return {
    secretKey: isTestMode 
      ? (process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY)
      : process.env.STRIPE_SECRET_KEY,
    
    webhookSecret: isTestMode
      ? (process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET)
      : process.env.STRIPE_WEBHOOK_SECRET,
    
    publishableKey: isTestMode
      ? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    
    pricingTableId: isTestMode
      ? (process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID_TEST || process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID)
      : process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID,

    isTestMode,
    mode: isTestMode ? 'test' : 'live'
  };
}

/**
 * Get Stripe secret key (server-side only)
 */
export function getStripeSecretKey(): string {
  const config = getStripeConfig();
  if (!config.secretKey) {
    throw new Error(`Missing STRIPE_SECRET_KEY${config.isTestMode ? '_TEST' : ''}`);
  }
  return config.secretKey;
}

/**
 * Get Stripe webhook secret (server-side only)
 */
export function getStripeWebhookSecret(): string {
  const config = getStripeConfig();
  if (!config.webhookSecret) {
    throw new Error(`Missing STRIPE_WEBHOOK_SECRET${config.isTestMode ? '_TEST' : ''}`);
  }
  return config.webhookSecret;
}

/**
 * Get Stripe publishable key (client-side safe)
 */
export function getStripePublishableKey(): string {
  const config = getStripeConfig();
  if (!config.publishableKey) {
    throw new Error(`Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY${config.isTestMode ? '_TEST' : ''}`);
  }
  return config.publishableKey;
}

/**
 * Get Stripe pricing table ID (client-side safe)
 */
export function getStripePricingTableId(): string {
  const config = getStripeConfig();
  if (!config.pricingTableId) {
    throw new Error(`Missing NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID${config.isTestMode ? '_TEST' : ''}`);
  }
  return config.pricingTableId;
}

