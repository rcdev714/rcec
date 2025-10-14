import { PostgrestError } from '@supabase/supabase-js';

export function isPostgrestError(error: unknown): error is PostgrestError {
  return !!(error && typeof error === 'object' && 'code' in error && 'details' in error && 'message' in error);
}
