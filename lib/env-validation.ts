/**
 * Environment variable validation for production deployment
 */

export function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
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
