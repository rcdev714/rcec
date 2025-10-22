import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';
import { getPlansWithLimits } from '@/lib/plans';
import { isAdmin } from '@/lib/admin';

type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';

export type UsageKind = 'search' | 'export' | 'prompt_input_tokens' | 'prompt_output_tokens' | 'prompt_dollars';

interface UsageRecord {
  user_id: string;
  period_start: string; // ISO
  period_end: string;   // ISO
  searches: number;
  exports: number;
  prompts_count: number; // Count of prompts (for rate limiting)
  prompt_input_tokens: number; // Actual input tokens (for analytics)
  prompt_output_tokens: number; // Actual output tokens (for analytics)
  prompt_dollars: number;
  created_at?: string;
  updated_at?: string;
}

// Pricing per 1M tokens in USD (approx; update as provider pricing changes)
// Source: Google Gemini public pricing (values may require adjustment)
export const GEMINI_PRICING_PER_MILLION = {
  'gemini-2.5-flash': { input: 0.35, output: 0.53 },
  'gemini-2.5-pro': { input: 3.50, output: 10.50 },
} as const;

export function estimateTokensFromTextLength(characters: number): number {
  // Rough heuristic: 1 token ≈ 4 characters
  return Math.ceil(characters / 4);
}

export function dollarsFromTokens(model: keyof typeof GEMINI_PRICING_PER_MILLION, inputTokens: number, outputTokens: number): number {
  const pricing = GEMINI_PRICING_PER_MILLION[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

export function getMonthlyPeriodForAnchor(anchorIso: string, now: Date = new Date()): { start: Date; end: Date } {
  // Normalize all computations to UTC to avoid timezone drift
  const nowUtc = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  const anchor = new Date(anchorIso);
  const anchorDay = anchor.getUTCDate();

  // Candidate period start is this month's anchor day at 00:00:00Z
  const periodStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), anchorDay, 0, 0, 0, 0));

  // If that start is in the future, roll back one month
  if (periodStart > nowUtc) {
    periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);
  }

  // Period end is +1 month from start (Date auto-adjusts day-of-month overflows)
  const periodEnd = new Date(periodStart);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  return { start: periodStart, end: periodEnd };
}

async function getOrCreateUsageRow(userId: string, periodStart: Date, periodEnd: Date): Promise<UsageRecord> {
  const supabase = await createClient();
  // Try to upsert a zeroed row for this user/period to avoid duplicate-key races
  const baseRow: Omit<UsageRecord, 'created_at' | 'updated_at'> = {
    user_id: userId,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    searches: 0,
    exports: 0,
    prompts_count: 0,
    prompt_input_tokens: 0,
    prompt_output_tokens: 0,
    prompt_dollars: 0,
  };

  await supabase
    .from('user_usage')
    .upsert(baseRow, { onConflict: 'user_id,period_start', ignoreDuplicates: true });

  const { data, error } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', baseRow.period_start)
    .single();

  if (error) throw error;
  return data as UsageRecord;
}

async function getLimits(plan: Plan) {
  try {
    // Try to get limits from database-driven plans
    const plansWithLimits = await getPlansWithLimits();
    const planData = plansWithLimits.find(p => p.id === plan);

    if (planData) {
      return {
        searches: planData.limits.searches_per_month,
        exports: planData.limits.exports_per_month,
        prompt_dollars: 0, // Keeping for backward compatibility
        prompt_count: planData.limits.prompts_per_month,
      } as const;
    }
  } catch (error) {
    console.error('Error fetching plan limits from database:', error);
  }

  // Fallback to hardcoded limits if database fails
  return getFallbackLimits(plan);
}

function getFallbackLimits(plan: Plan) {
  // Monthly limits - fallback
  if (plan === 'FREE') {
    return {
      searches: 10,
      exports: 10,
      prompt_dollars: 0, // Not used for FREE plan
      prompt_count: 10,
    } as const;
  }
  if (plan === 'PRO') {
    return {
      searches: -1, // unlimited
      exports: 50,
      prompt_dollars: 0, // Not used for PRO plan - using count-based
      prompt_count: 100,
    } as const;
  }
  // ENTERPRISE
  return {
    searches: -1,
    exports: -1,
    prompt_dollars: 0, // Not used for ENTERPRISE plan - using count-based
    prompt_count: 500,
  } as const;
}

export async function ensureSearchAllowedAndIncrement(userId: string): Promise<{ allowed: boolean; remaining?: number }>
{
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false };

  // Security: Ensure the userId parameter matches the authenticated user
  if (userId !== user.id) {
    console.error('UserId mismatch in ensureSearchAllowedAndIncrement:', { provided: userId, authenticated: user.id });
    return { allowed: false };
  }

  // Admin bypass: Allow unlimited searches for admin users
  if (await isAdmin()) {
    return { allowed: true };
  }

  const subscription = await getUserSubscription(user.id);
  const plan: Plan = (subscription?.plan as Plan) || 'FREE';

  const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  const usage = await getOrCreateUsageRow(userId, start, end);
  const limits = await getLimits(plan);

  // Use atomic increment with limit checking to prevent race conditions
  try {
    const { atomicIncrementWithLimit } = await import('./usage-atomic');
    const limit = limits.searches;
    const result = await atomicIncrementWithLimit(userId, usage.period_start, 'searches', limit);

    if (!result.success) {
      return { allowed: false, remaining: limit === -1 ? undefined : Math.max(0, limit - (result.newValue ?? 0)) };
    }

    const remaining = limit === -1 ? undefined : Math.max(0, limit - result.newValue);
    
    // Track daily events (non-blocking)
    trackDailyEvent(supabase, userId, 'search').catch(err => {
      console.error('[NON-CRITICAL] Failed to track daily event:', err);
    });

    return { allowed: true, remaining };
  } catch (error) {
    console.error('[CRITICAL] Usage increment failed:', error);
    throw error;
  }

}

/**
 * Track daily usage event for analytics (non-blocking)
 */
async function trackDailyEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  kind: 'search' | 'export'
): Promise<void> {
  const todayKey = new Date().toISOString().slice(0, 10);
  
  try {
    // Atomic increment using INSERT ... ON CONFLICT DO UPDATE
    // No fallback needed - the RPC handles everything atomically
    const rpcRes = await supabase.rpc('increment_usage_event', {
      p_user_id: userId,
      p_event_date: todayKey,
      p_kind: kind,
      p_delta: 1
    });

    if (rpcRes.error) {
      // Log error but don't throw - event tracking is non-critical
      console.error('[EVENT_TRACKING] Failed to increment event:', rpcRes.error);
    }
  } catch (error) {
    // Non-critical: log but don't throw
    console.error('[EVENT_TRACKING] Failed:', error);
  }
}

export async function ensureExportAllowedAndIncrement(userId: string): Promise<{ allowed: boolean; remaining?: number }>
{
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false };

  // Security: Ensure the userId parameter matches the authenticated user
  if (userId !== user.id) {
    console.error('UserId mismatch in ensureExportAllowedAndIncrement:', { provided: userId, authenticated: user.id });
    return { allowed: false };
  }

  // Admin bypass: Allow unlimited exports for admin users
  if (await isAdmin()) {
    return { allowed: true };
  }

  const subscription = await getUserSubscription(user.id);
  const plan: Plan = (subscription?.plan as Plan) || 'FREE';

  const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  const usage = await getOrCreateUsageRow(userId, start, end);
  const limits = await getLimits(plan);

  // Use atomic increment with limit checking
  try {
    const { atomicIncrementWithLimit } = await import('./usage-atomic');
    const limit = limits.exports;
    const result = await atomicIncrementWithLimit(userId, usage.period_start, 'exports', limit);

    if (!result.success) {
      return { allowed: false, remaining: limit === -1 ? undefined : Math.max(0, limit - (result.newValue ?? 0)) };
    }

    const remaining = limit === -1 ? undefined : Math.max(0, limit - result.newValue);
    
    // Track daily events (non-blocking)
    trackDailyEvent(supabase, userId, 'export').catch(err => {
      console.error('[NON-CRITICAL] Failed to track export event:', err);
    });

    return { allowed: true, remaining };
  } catch (error) {
    console.error('[CRITICAL] Export increment failed:', error);
    throw error;
  }
}

export async function ensurePromptAllowedAndTrack(
  userId: string,
  _options: {
    model: keyof typeof GEMINI_PRICING_PER_MILLION;
    inputTokensEstimate: number;
  }
): Promise<{ allowed: boolean; remainingPrompts?: number }>
{
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false };

  // Security: Ensure the userId parameter matches the authenticated user
  if (userId !== user.id) {
    console.error('UserId mismatch in ensurePromptAllowedAndTrack:', { provided: userId, authenticated: user.id });
    return { allowed: false };
  }

  // Admin bypass: Allow unlimited prompts for admin users
  if (await isAdmin()) {
    return { allowed: true };
  }

  const subscription = await getUserSubscription(user.id);
  const plan: Plan = (subscription?.plan as Plan) || 'FREE';

  const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  const usage = await getOrCreateUsageRow(userId, start, end);
  const limits = await getLimits(plan);

  // Use atomic increment with limit checking for prompt count
  try {
    const { atomicIncrementWithLimit } = await import('./usage-atomic');
    const limit = limits.prompt_count;
    const result = await atomicIncrementWithLimit(userId, usage.period_start, 'prompts_count', limit);

    if (!result.success) {
      return { allowed: false, remainingPrompts: limit === -1 ? undefined : Math.max(0, limit - (result.newValue ?? 0)) };
    }

    // Track actual input tokens for analytics (non-blocking, best effort)
    if (_options.inputTokensEstimate > 0) {
      const { atomicIncrementUsageBy } = await import('./usage-atomic');
      atomicIncrementUsageBy(userId, usage.period_start, 'prompt_input_tokens', _options.inputTokensEstimate)
        .catch(error => {
          console.warn('[ANALYTICS] Failed to track input tokens:', error);
        });
    }

    const remainingPrompts = limits.prompt_count === -1 ? undefined : Math.max(0, limits.prompt_count - result.newValue);
    return { allowed: true, remainingPrompts };
  } catch (error) {
    console.error('[CRITICAL] Prompt increment failed:', error);
    throw error;
  }
}

export async function trackOutputTokensAndDollars(
  userId: string,
  options: {
    model: keyof typeof GEMINI_PRICING_PER_MILLION;
    outputTokensEstimate: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Security: Ensure the userId parameter matches the authenticated user
  if (userId !== user.id) {
    console.error('UserId mismatch in trackOutputTokensAndDollars:', { provided: userId, authenticated: user.id });
    return;
  }

  const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  const usage = await getOrCreateUsageRow(userId, start, end);

  const addedDollars = dollarsFromTokens(options.model, 0, options.outputTokensEstimate);

  await supabase
    .from('user_usage')
    .update({
      prompt_output_tokens: usage.prompt_output_tokens + options.outputTokensEstimate,
      prompt_dollars: usage.prompt_dollars + addedDollars,
    })
    .eq('user_id', userId)
    .eq('period_start', usage.period_start);
}


