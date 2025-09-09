import { createClient } from '@/lib/supabase/server';

// Types for database-driven plans
export interface DatabasePlan {
  id: string;
  name: string;
  price: number;
  price_id: string;
  features: string[];
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanWithLimits extends DatabasePlan {
  limits: {
    searches_per_month: number;
    exports_per_month: number;
    companies_per_export: number;
    prompts_per_month: number;
  };
}

// Server-side plan management functions
export async function getSubscriptionPlans(): Promise<DatabasePlan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price');

  if (error) {
    console.error('Error fetching subscription plans:', error);
    throw new Error('Failed to fetch subscription plans');
  }

  return data || [];
}

export async function getPlanById(planId: string): Promise<DatabasePlan | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Plan not found
      return null;
    }
    console.error('Error fetching plan by ID:', error);
    throw new Error('Failed to fetch plan');
  }

  return data;
}

export async function getPlanByStripePriceId(priceId: string): Promise<DatabasePlan | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('price_id', priceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Price ID not found
      return null;
    }
    console.error('Error fetching plan by Stripe price ID:', error);
    throw new Error('Failed to fetch plan by price ID');
  }

  return data;
}

export async function getPlansWithLimits(): Promise<PlanWithLimits[]> {
  const plans = await getSubscriptionPlans();

  // Add usage limits to each plan (this could be moved to database later)
  const plansWithLimits: PlanWithLimits[] = plans.map(plan => ({
    ...plan,
    limits: getPlanLimits(plan.id)
  }));

  return plansWithLimits;
}

// Plan limits (these could be moved to database in future iterations)
function getPlanLimits(planId: string) {
  switch (planId) {
    case 'FREE':
      return {
        searches_per_month: 100,
        exports_per_month: 10,
        companies_per_export: 0,
        prompts_per_month: 10,
      };
    case 'PRO':
      return {
        searches_per_month: -1, // unlimited
        exports_per_month: 50,
        companies_per_export: 1000,
        prompts_per_month: 100,
      };
    case 'ENTERPRISE':
      return {
        searches_per_month: -1, // unlimited
        exports_per_month: -1, // unlimited
        companies_per_export: -1, // unlimited
        prompts_per_month: 500,
      };
    default:
      return {
        searches_per_month: 0,
        exports_per_month: 0,
        companies_per_export: 0,
        prompts_per_month: 0,
      };
  }
}

// Utility functions for backward compatibility
export function isValidPlan(planId: string): boolean {
  return ['FREE', 'PRO', 'ENTERPRISE'].includes(planId);
}

// Stripe integration helpers

export async function getPlanFromStripePriceId(priceId: string): Promise<string | null> {
  const plan = await getPlanByStripePriceId(priceId);
  return plan?.id || null;
}
