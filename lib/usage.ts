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
  prompt_input_tokens: number;
  prompt_output_tokens: number;
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

  // Admin bypass: Allow unlimited searches for admin users
  if (await isAdmin()) {
    return { allowed: true };
  }

  const subscription = await getUserSubscription(user.id);
  const plan: Plan = (subscription?.plan as Plan) || 'FREE';

  const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  const usage = await getOrCreateUsageRow(userId, start, end);
  const limits = await getLimits(plan);

  if (limits.searches !== -1 && usage.searches >= limits.searches) {
    return { allowed: false, remaining: 0 };
  }

  const { data, error } = await supabase
    .from('user_usage')
    .update({ searches: usage.searches + 1 })
    .eq('user_id', userId)
    .eq('period_start', usage.period_start)
    .select()
    .single();

  if (error) throw error;

  // Also increment daily events for timeseries
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  await supabase
    .from('user_usage_events')
    .upsert({ user_id: userId, event_date: todayKey, kind: 'search', count: 0 }, { onConflict: 'user_id,event_date,kind' });
  const rpcRes = await supabase
    .rpc('increment_usage_event', { p_user_id: userId, p_event_date: todayKey, p_kind: 'search', p_delta: 1 });
  if (rpcRes.error) {
    const { data: ev } = await supabase
      .from('user_usage_events')
      .select('count')
      .eq('user_id', userId)
      .eq('event_date', todayKey)
      .eq('kind', 'search')
      .single();
    await supabase
      .from('user_usage_events')
      .update({ count: (ev?.count || 0) + 1 })
      .eq('user_id', userId)
      .eq('event_date', todayKey)
      .eq('kind', 'search');
  }
  const remaining = limits.searches === -1 ? undefined : Math.max(0, limits.searches - (data.searches as number));
  return { allowed: true, remaining };
}

export async function ensureExportAllowedAndIncrement(userId: string): Promise<{ allowed: boolean; remaining?: number }>
{
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false };

  // Admin bypass: Allow unlimited exports for admin users
  if (await isAdmin()) {
    return { allowed: true };
  }

  const subscription = await getUserSubscription(user.id);
  const plan: Plan = (subscription?.plan as Plan) || 'FREE';

  const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  const usage = await getOrCreateUsageRow(userId, start, end);
  const limits = await getLimits(plan);

  if (limits.exports !== -1 && usage.exports >= limits.exports) {
    return { allowed: false, remaining: 0 };
  }

  const { data, error } = await supabase
    .from('user_usage')
    .update({ exports: usage.exports + 1 })
    .eq('user_id', userId)
    .eq('period_start', usage.period_start)
    .select()
    .single();

  if (error) throw error;
  const remaining = limits.exports === -1 ? undefined : Math.max(0, limits.exports - (data.exports as number));
  return { allowed: true, remaining };
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

  // Admin bypass: Allow unlimited prompts for admin users
  if (await isAdmin()) {
    return { allowed: true };
  }

  const subscription = await getUserSubscription(user.id);
  const plan: Plan = (subscription?.plan as Plan) || 'FREE';

  const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());
  const usage = await getOrCreateUsageRow(userId, start, end);
  const limits = await getLimits(plan);

  // Count-based limit for all plans
  const usedCount = Math.floor(usage.prompt_input_tokens); // repurpose prompt_input_tokens as counter
  if (usedCount >= limits.prompt_count) {
    return { allowed: false, remainingPrompts: 0 };
  }

  // Track prompt usage
  const { error } = await supabase
    .from('user_usage')
    .update({ prompt_input_tokens: usedCount + 1 })
    .eq('user_id', userId)
    .eq('period_start', usage.period_start);
  if (error) throw error;

  const remainingPrompts = Math.max(0, limits.prompt_count - (usedCount + 1));
  return { allowed: true, remainingPrompts };
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


