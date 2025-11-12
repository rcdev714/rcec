import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';
import { getPlansWithLimits } from '@/lib/plans';
import { isAdmin } from '@/lib/admin';
import { PROFIT_MARGIN_MULTIPLIER, GEMINI_PRICING_PER_MILLION, type GeminiModel } from './ai-config';

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

// Re-export for backward compatibility
export { GEMINI_PRICING_PER_MILLION };

export function estimateTokensFromTextLength(characters: number): number {
  // Rough heuristic: 1 token ≈ 4 characters
  return Math.ceil(characters / 4);
}

export function dollarsFromTokens(model: GeminiModel | string, inputTokens: number, outputTokens: number): number {
  // Fallback to flash if model is unknown
  const modelKey = (model in GEMINI_PRICING_PER_MILLION) ? model as GeminiModel : 'gemini-2.5-flash';
  const pricing = GEMINI_PRICING_PER_MILLION[modelKey];

  // Handle tiered pricing for Pro model
  if ('tierThreshold' in pricing && pricing.tierThreshold && inputTokens > pricing.tierThreshold) {
    // Use high-tier pricing for large prompts
    const inputCost = (inputTokens / 1_000_000) * (pricing.inputHighTier || pricing.input);
    const outputCost = (outputTokens / 1_000_000) * (pricing.outputHighTier || pricing.output);
    return (inputCost + outputCost) * PROFIT_MARGIN_MULTIPLIER;
  } else {
    // Standard pricing with revenue multiplier
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return (inputCost + outputCost) * PROFIT_MARGIN_MULTIPLIER;
  }
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
      console.log('[getLimits] Using database plan limits:', { 
        plan, 
        limits: planData.limits 
      });
      
      return {
        searches: planData.limits.searches_per_month,
        exports: planData.limits.exports_per_month,
        prompt_dollars: planData.limits.prompt_dollars_per_month || 0,
        prompt_count: planData.limits.prompts_per_month,
      } as const;
    }
    
    console.warn('[getLimits] Plan not found in database, using fallback:', plan);
  } catch (error) {
    console.error('[getLimits] Error fetching plan limits from database:', error);
  }

  // Fallback to hardcoded limits if database fails
  const fallback = getFallbackLimits(plan);
  console.log('[getLimits] Using fallback limits:', { plan, limits: fallback });
  return fallback;
}

function getFallbackLimits(plan: Plan) {
  // Monthly limits - fallback
  if (plan === 'FREE') {
    return {
      searches: 10,
      exports: 10,
      prompt_dollars: 5.00, // $5 limit for FREE tier
      prompt_count: -1, // Deprecated - using dollar-based limiting
    };
  }
  if (plan === 'PRO') {
    return {
      searches: -1, // unlimited
      exports: 50,
      prompt_dollars: 20.00, // $20 limit for PRO tier
      prompt_count: -1, // Deprecated - using dollar-based limiting
    };
  }
  // ENTERPRISE
  return {
    searches: -1,
    exports: -1,
    prompt_dollars: 200.00, // $200 limit for ENTERPRISE tier
    prompt_count: -1, // Deprecated - using dollar-based limiting
  };
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

/**
 * Simple pre-check: Verify user hasn't exceeded their dollar limit
 * Does NOT increment - just checks current usage vs limit
 */
export async function ensurePromptAllowedAndTrack(
  userId: string,
  _options: {
    model: GeminiModel | string;
    inputTokensEstimate: number;
  }
): Promise<{ allowed: boolean; remainingDollars?: number; estimatedCost?: number }>
{
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false };

  // Security: Ensure the userId parameter matches the authenticated user
  if (userId !== user.id) {
    console.error('[ensurePromptAllowedAndTrack] UserId mismatch:', { provided: userId, authenticated: user.id });
    return { allowed: false };
  }

  // Admin bypass: Allow unlimited prompts for admin users
  if (await isAdmin()) {
    return { allowed: true };
  }

  const subscription = await getUserSubscription(user.id);
  const plan: Plan = (subscription?.plan as Plan) || 'FREE';

  const { start } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  const usage = await getOrCreateUsageRow(userId, start, start);
  const limits = await getLimits(plan);

  const dollarLimit = limits.prompt_dollars;
  const currentDollars = usage.prompt_dollars || 0;

  // If unlimited, allow
  if (dollarLimit === -1) {
    return { allowed: true };
  }

  // Check if user has exceeded limit
  if (currentDollars >= dollarLimit) {
    const remaining = Math.max(0, dollarLimit - currentDollars);
    console.log('[ensurePromptAllowedAndTrack] Limit exceeded:', { 
      currentDollars, 
      dollarLimit, 
      remaining,
      plan
    });
    return { 
      allowed: false, 
      remainingDollars: remaining
    };
  }

  const remainingDollars = Math.max(0, dollarLimit - currentDollars);
  return { 
    allowed: true, 
    remainingDollars
  };
}

/**
 * Track LLM usage after completion (simple post-tracking)
 * Increments tokens and dollars atomically
 * 
 * @param userId - User ID
 * @param model - Model name
 * @param inputTokens - Actual input tokens from metadata
 * @param outputTokens - Actual output tokens from metadata
 */
export async function trackLLMUsage(
  userId: string,
  model: GeminiModel | string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Security: Ensure the userId parameter matches the authenticated user
  if (userId !== user.id) {
    console.error('[trackLLMUsage] UserId mismatch:', { provided: userId, authenticated: user.id });
    return;
  }

  // Admin bypass: No tracking needed for admin users
  if (await isAdmin()) {
    return;
  }

  const { start } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  await getOrCreateUsageRow(userId, start, start);

  // Calculate cost
  const cost = dollarsFromTokens(model, inputTokens, outputTokens);

  console.log('[trackLLMUsage] Tracking:', {
    model,
    inputTokens,
    outputTokens,
    cost: cost.toFixed(4)
  });

  try {
    const { atomicIncrementUsageBy } = await import('./usage-atomic');
    
    // Atomically increment input tokens
    if (inputTokens > 0) {
      await atomicIncrementUsageBy(userId, start.toISOString(), 'prompt_input_tokens', inputTokens);
    }
    
    // Atomically increment output tokens
    if (outputTokens > 0) {
      await atomicIncrementUsageBy(userId, start.toISOString(), 'prompt_output_tokens', outputTokens);
    }
    
    // Atomically increment dollars
    if (cost > 0) {
      const { error } = await supabase.rpc('atomic_increment_prompt_dollars', {
        p_user_id: userId,
        p_period_start: start.toISOString(),
        p_amount: cost
      });
      
      if (error) {
        console.error('[trackLLMUsage] Failed to increment dollars:', error);
      }
    }
  } catch (error) {
    console.error('[trackLLMUsage] Error tracking usage:', error);
    // Non-critical: Don't throw, just log
  }
}

/**
 * @deprecated Use trackActualLLMUsage instead
 * Legacy function kept for backward compatibility
 */
export async function trackOutputTokensAndDollars(
  userId: string,
  options: {
    model: GeminiModel | string;
    outputTokensEstimate: number;
  }
) {
  console.warn('[trackOutputTokensAndDollars] DEPRECATED: Use trackActualLLMUsage instead');
  
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


