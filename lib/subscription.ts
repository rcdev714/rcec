import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { UserSubscription, SubscriptionStatus } from '@/types/subscription';
import { getPlanById, getPlansWithLimits } from '@/lib/plans';
import { validateSubscriptionData, logValidationError, logValidationSuccess } from '@/lib/subscription-validation';

// Server-side subscription utilities
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // PostgREST error PGRST116: "The result of a function call or a view is empty, and the client requested a single object."
    // This is not an actual error but a "not found" case, so we don't log it.
    if (error.code !== 'PGRST116') {
      console.error('Error fetching user subscription:', error);
    }
    return null;
  }

  return data;
}

export async function updateUserSubscription(
  userId: string,
  updates: Partial<UserSubscription>
): Promise<UserSubscription | null> {
  // Get current subscription for validation
  const currentSubscription = await getUserSubscription(userId);

  if (!currentSubscription) {
    throw new Error(`No subscription found for user ${userId}`);
  }

  // Validate the updated data
  const validationData = {
    user_id: userId,
    plan: updates.plan || currentSubscription.plan,
    customer_id: updates.customer_id !== undefined
      ? (updates.customer_id === null ? undefined : updates.customer_id)
      : (currentSubscription.customer_id === null ? undefined : currentSubscription.customer_id),
    subscription_id: updates.subscription_id !== undefined
      ? (updates.subscription_id === null ? undefined : updates.subscription_id)
      : (currentSubscription.subscription_id === null ? undefined : currentSubscription.subscription_id),
    status: updates.status || currentSubscription.status,
  };

  const validation = await validateSubscriptionData(validationData);

  if (!validation.isValid) {
    logValidationError('updateUserSubscription', validation, { userId, updates });
    throw new Error(`Subscription validation failed: ${validation.errors.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('Subscription update warnings:', validation.warnings);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update(updates as Partial<UserSubscription>) // Type assertion for Supabase compatibility
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user subscription:', error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  logValidationSuccess('updateUserSubscription', {
    userId,
    oldPlan: currentSubscription.plan,
    newPlan: data.plan
  });

  return data;
}

export async function createUserSubscription(
  userId: string,
  subscriptionData: Partial<UserSubscription>
): Promise<UserSubscription | null> {
  // Validate subscription data before creation
  const validationData = { user_id: userId, ...subscriptionData };
  const validation = await validateSubscriptionData(validationData);

  if (!validation.isValid) {
    logValidationError('createUserSubscription', validation, { userId, subscriptionData });
    throw new Error(`Subscription validation failed: ${validation.errors.join(', ')}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('Subscription creation warnings:', validation.warnings);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      ...subscriptionData,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user subscription:', error);
    throw new Error(`Failed to create subscription: ${error.message}`);
  }

  logValidationSuccess('createUserSubscription', { userId, plan: data.plan });
  return data;
}

// Client-side subscription utilities
export async function getUserSubscriptionClient(): Promise<UserSubscription | null> {
  const supabase = createBrowserClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // PostgREST error PGRST116: "The result of a function call or a view is empty, and the client requested a single object."
    // This is not an actual error but a "not found" case, so we don't log it.
    if (error.code !== 'PGRST116') {
      console.error('Error fetching user subscription:', error);
    }
    return null;
  }

  return data;
}

// Subscription status utilities
export function getSubscriptionStatus(subscription: UserSubscription | null): SubscriptionStatus {
  if (!subscription) {
    return {
      plan: 'FREE',
      status: 'inactive',
      isActive: false,
      canAccessFeature: () => false,
    };
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  return {
    plan: subscription.plan as 'FREE' | 'PRO' | 'ENTERPRISE',
    status: subscription.status as 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled',
    isActive,
    canAccessFeature: (feature: string) => canAccessFeatureSync(subscription.plan as 'FREE' | 'PRO' | 'ENTERPRISE', feature),
    currentPeriodEnd: subscription.current_period_end || undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

// Async version for new implementations
export async function getSubscriptionStatusAsync(subscription: UserSubscription | null): Promise<SubscriptionStatus> {
  if (!subscription) {
    return {
      plan: 'FREE',
      status: 'inactive',
      isActive: false,
      canAccessFeature: () => false,
    };
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  // Create synchronous wrapper for async feature checker
  const cachedFeatureAccess: Record<string, boolean> = {};

  const syncFeatureChecker = (feature: string): boolean => {
    // Check cache first
    if (cachedFeatureAccess[feature] !== undefined) {
      return cachedFeatureAccess[feature];
    }

    // For synchronous calls, use the synchronous version
    // In async contexts, this should be called via getSubscriptionStatusAsync
    try {
      const result = canAccessFeatureSync(subscription.plan, feature);
      cachedFeatureAccess[feature] = result;
      return result;
    } catch (error) {
      console.error('Error checking feature access in subscription status:', error);
      return false;
    }
  };

  return {
    plan: subscription.plan as 'FREE' | 'PRO' | 'ENTERPRISE',
    status: subscription.status as 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled',
    isActive,
    canAccessFeature: syncFeatureChecker,
    currentPeriodEnd: subscription.current_period_end || undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

// Feature access control - database-driven
export async function canAccessFeature(planId: string, feature: string): Promise<boolean> {
  try {
    const plan = await getPlanById(planId);
    if (!plan) {
      console.warn(`Plan ${planId} not found in database`);
      return false;
    }

    // For now, use feature mapping based on plan ID
    // This could be enhanced to store features in the database
    return checkFeatureAccess(planId, feature);
  } catch (error) {
    console.error('Error checking feature access:', error);
    // Fallback to free tier access for safety
    return isFreeFeature(feature);
  }
}

// Backward compatibility function for synchronous calls
export function canAccessFeatureSync(plan: 'FREE' | 'PRO' | 'ENTERPRISE', feature: string): boolean {
  return checkFeatureAccess(plan, feature);
}

// Internal feature access logic
function checkFeatureAccess(planId: string, feature: string): boolean {
  // Free features - available to all plans
  const freeFeatures = [
    'basic_search',
    'basic_support',
    'linkedin_search'
  ];

  // Pro features - available to Pro and Enterprise
  const proFeatures = [
    'unlimited_search',
    'advanced_filtering',
    'export_data',
    'priority_support'
  ];

  // Enterprise features - available only to Enterprise
  const enterpriseFeatures = [
    'custom_integrations',
    'dedicated_support',
    'advanced_analytics',
    'api_access'
  ];

  if (freeFeatures.includes(feature)) {
    return true;
  }

  if (proFeatures.includes(feature)) {
    return ['PRO', 'ENTERPRISE'].includes(planId);
  }

  if (enterpriseFeatures.includes(feature)) {
    return planId === 'ENTERPRISE';
  }

  // Unknown feature - deny access for security
  console.warn(`Unknown feature requested: ${feature}`);
  return false;
}

function isFreeFeature(feature: string): boolean {
  const freeFeatures = [
    'basic_search',
    'basic_support',
    'linkedin_search'
  ];
  return freeFeatures.includes(feature);
}

// Usage limits - database-driven
export async function getUsageLimits(planId: string) {
  try {
    const plansWithLimits = await getPlansWithLimits();
    const plan = plansWithLimits.find(p => p.id === planId);

    if (!plan) {
      console.warn(`Plan ${planId} not found, returning free tier limits`);
      return getDefaultLimits('FREE');
    }

    return plan.limits;
  } catch (error) {
    console.error('Error fetching usage limits:', error);
    // Fallback to hardcoded limits for safety
    return getDefaultLimits(planId as 'FREE' | 'PRO' | 'ENTERPRISE');
  }
}

// Backward compatibility function for synchronous calls
export function getUsageLimitsSync(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  return getDefaultLimits(plan);
}

// Default limits as fallback
function getDefaultLimits(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  const limits = {
    FREE: {
      searches_per_month: 100,
      exports_per_month: 10,
      companies_per_export: 0,
      prompts_per_month: 10,
    },
    PRO: {
      searches_per_month: -1, // unlimited
      exports_per_month: 50,
      companies_per_export: 1000,
      prompts_per_month: 100,
    },
    ENTERPRISE: {
      searches_per_month: -1, // unlimited
      exports_per_month: -1, // unlimited
      companies_per_export: -1, // unlimited
      prompts_per_month: 500,
    },
  };

  return limits[plan];
}
