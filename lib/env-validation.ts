/**
 * Environment variable validation for production deployment
 */

export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID',
    'GOOGLE_API_KEY' // Required for Gemini AI chat functionality
  ];

  const missing: string[] = [];
  
  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    
    // In production, log but don't throw to avoid crashing the app
    if (process.env.NODE_ENV === 'production') {
      console.error('WARNING: App running with missing environment variables');
    } else {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  // Validate format of certain env vars (reserved for future use)

  // Additional Stripe-related recommendations (non-fatal warnings)
  const recommended: string[] = [];
  if (!process.env.STRIPE_API_VERSION) recommended.push('STRIPE_API_VERSION');
  if (!process.env.STRIPE_PRO_PRICE_ID) recommended.push('STRIPE_PRO_PRICE_ID');
  if (!process.env.STRIPE_ENTERPRISE_PRICE_ID) recommended.push('STRIPE_ENTERPRISE_PRICE_ID');
  if (!process.env.NEXT_PUBLIC_APP_URL && !process.env.RAILWAY_PUBLIC_DOMAIN) recommended.push('NEXT_PUBLIC_APP_URL or RAILWAY_PUBLIC_DOMAIN');
  // Vector Buckets / S3 Vectors (optional, used for semantic search candidate generation)
  if (!process.env.COMPANIES_VECTOR_BUCKET) recommended.push('COMPANIES_VECTOR_BUCKET');
  if (!process.env.COMPANIES_VECTOR_INDEX) recommended.push('COMPANIES_VECTOR_INDEX');
  if (!process.env.COMPANIES_VECTOR_ENABLED) recommended.push('COMPANIES_VECTOR_ENABLED');

  if (recommended.length > 0) {
    console.warn('Recommended environment variables not set (using safe defaults/fallbacks):', recommended);
  }

  // Log optional configurations
  console.log('\nOptional configurations:');
  console.log(`GEMINI_MODEL: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash (default)'}`);

  return {
    isValid: missing.length === 0,
    missing
  };
}

// Run validation on module load
if (typeof window === 'undefined') { // Only run on server
  validateEnvironment();
}
