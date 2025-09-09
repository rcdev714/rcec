import { createClient } from '@/lib/supabase/server';
import { getPlanById, isValidPlan } from '@/lib/plans';

// Validation results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Subscription validation functions
export async function validateSubscriptionData(data: {
  user_id?: string;
  plan?: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  status?: string;
}): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate user_id
  if (!data.user_id) {
    errors.push('user_id is required');
  } else if (!isValidUUID(data.user_id)) {
    errors.push('user_id must be a valid UUID');
  } else {
    // Check if user exists
    const userExists = await checkUserExists(data.user_id);
    if (!userExists) {
      errors.push('user_id does not correspond to an existing user');
    }
  }

  // Validate plan
  if (!data.plan) {
    errors.push('plan is required');
  } else if (!isValidPlan(data.plan)) {
    errors.push(`plan '${data.plan}' is not a valid plan. Valid plans: FREE, PRO, ENTERPRISE`);
  } else {
    // Check if plan exists in database
    const planExists = await checkPlanExists(data.plan);
    if (!planExists) {
      errors.push(`plan '${data.plan}' does not exist in database`);
    }
  }

  // Validate status
  const validStatuses = ['active', 'inactive', 'cancelled', 'past_due', 'trialing'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`status '${data.status}' is not valid. Valid statuses: ${validStatuses.join(', ')}`);
  }

  // Validate customer_id format (Stripe customer IDs start with 'cus_')
  if (data.customer_id && !data.customer_id.startsWith('cus_')) {
    warnings.push('customer_id does not have expected Stripe format (should start with cus_)');
  }

  // Validate subscription_id format (Stripe subscription IDs start with 'sub_')
  if (data.subscription_id && !data.subscription_id.startsWith('sub_')) {
    warnings.push('subscription_id does not have expected Stripe format (should start with sub_)');
  }

  // Business logic validations
  if (data.plan === 'FREE' && (data.customer_id || data.subscription_id)) {
    warnings.push('FREE plan should not have customer_id or subscription_id');
  }

  if (data.plan !== 'FREE' && !data.customer_id) {
    warnings.push('Paid plans should have a customer_id');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Plan change validation
export async function validatePlanChange(
  userId: string,
  newPlan: string,
  currentPlan?: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate new plan
  if (!isValidPlan(newPlan)) {
    errors.push(`New plan '${newPlan}' is not valid`);
    return { isValid: false, errors, warnings };
  }

  // Check if plan exists in database
  const planExists = await checkPlanExists(newPlan);
  if (!planExists) {
    errors.push(`Plan '${newPlan}' does not exist in database`);
    return { isValid: false, errors, warnings };
  }

  // Business logic validations
  if (currentPlan === newPlan) {
    warnings.push('New plan is the same as current plan');
  }

  // Check user's current subscription status
  const subscriptionStatus = await getUserSubscriptionStatus(userId);
  if (subscriptionStatus === 'past_due' && newPlan !== 'FREE') {
    warnings.push('User has past due subscription - consider reviewing payment status');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Payment validation
export async function validatePaymentIntent(
  userId: string,
  planId: string,
  amount: number
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate plan and get expected price
  const plan = await getPlanById(planId);
  if (!plan) {
    errors.push(`Plan '${planId}' not found`);
    return { isValid: false, errors, warnings };
  }

  // Check amount matches expected price (allow small tolerance for fees)
  const tolerance = 0.01; // 1 cent tolerance
  if (Math.abs(amount - plan.price) > tolerance) {
    errors.push(`Payment amount ${amount} does not match plan price ${plan.price}`);
  }

  // Check if user can upgrade to this plan
  const canUpgrade = await checkUserCanUpgrade(userId, planId);
  if (!canUpgrade.allowed) {
    errors.push(canUpgrade.reason || 'User cannot upgrade to this plan');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Usage validation
export async function validateUsageLimit(
  userId: string,
  action: 'search' | 'export' | 'prompt',
  currentUsage: number,
  limit: number
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (limit !== -1 && currentUsage >= limit) {
    errors.push(`${action} limit exceeded. Current: ${currentUsage}, Limit: ${limit}`);
  }

  // Warning for approaching limit (80% usage)
  if (limit !== -1 && currentUsage >= limit * 0.8) {
    warnings.push(`${action} usage is at ${Math.round((currentUsage / limit) * 100)}% of limit`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Helper functions
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

async function checkUserExists(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
}

async function checkPlanExists(planId: string): Promise<boolean> {
  try {
    const plan = await getPlanById(planId);
    return !!plan;
  } catch (error) {
    console.error('Error checking if plan exists:', error);
    return false;
  }
}

async function getUserSubscriptionStatus(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .single();

    return error ? null : data?.status || null;
  } catch (error) {
    console.error('Error getting user subscription status:', error);
    return null;
  }
}

async function checkUserCanUpgrade(userId: string, newPlan: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = await createClient();
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      return { allowed: true }; // New user, can choose any plan
    }

    // Business rules for plan changes
    const planHierarchy = { 'FREE': 0, 'PRO': 1, 'ENTERPRISE': 2 };
    const currentLevel = planHierarchy[subscription.plan as keyof typeof planHierarchy] || 0;
    const newLevel = planHierarchy[newPlan as keyof typeof planHierarchy] || 0;

    // Allow upgrades and downgrades, but warn about past_due
    if (subscription.status === 'past_due' && newLevel > currentLevel) {
      return {
        allowed: false,
        reason: 'Cannot upgrade while subscription is past due. Please update payment method first.'
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking user upgrade eligibility:', error);
    return { allowed: false, reason: 'Error validating upgrade eligibility' };
  }
}

// Error logging utility
export function logValidationError(context: string, result: ValidationResult, additionalData?: unknown) {
  if (!result.isValid) {
    console.error(`Validation failed in ${context}:`, {
      errors: result.errors,
      warnings: result.warnings,
      additionalData,
    });
  }

  if (result.warnings.length > 0) {
    console.warn(`Validation warnings in ${context}:`, result.warnings);
  }
}

// Success logging utility
export function logValidationSuccess(context: string, additionalData?: unknown) {
  console.log(`Validation passed in ${context}`, additionalData ? { additionalData } : '');
}
