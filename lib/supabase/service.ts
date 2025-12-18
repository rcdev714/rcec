import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the Service Role key.
 * This client bypasses Row Level Security (RLS) and does not rely on Next.js cookies.
 * Safe to use in background tasks (Trigger.dev), webhooks, and server-side logic where no user session exists.
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

