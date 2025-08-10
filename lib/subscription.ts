import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { UserSubscription, SubscriptionStatus } from '@/types/subscription';

// Server-side subscription utilities
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }

  return data;
}

export async function updateUserSubscription(
  userId: string, 
  updates: Partial<UserSubscription>
): Promise<UserSubscription | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user subscription:', error);
    return null;
  }

  return data;
}

export async function createUserSubscription(
  userId: string,
  subscriptionData: Partial<UserSubscription>
): Promise<UserSubscription | null> {
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
    return null;
  }

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
    console.error('Error fetching user subscription:', error);
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
    canAccessFeature: (feature: string) => canAccessFeature(subscription.plan as 'FREE' | 'PRO' | 'ENTERPRISE', feature),
    currentPeriodEnd: subscription.current_period_end || undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

// Feature access control
export function canAccessFeature(plan: 'FREE' | 'PRO' | 'ENTERPRISE', feature: string): boolean {
  const featureMap = {
    // Free features
    'basic_search': ['FREE', 'PRO', 'ENTERPRISE'],
    'basic_support': ['FREE', 'PRO', 'ENTERPRISE'],
    
    // Pro features
    'unlimited_search': ['PRO', 'ENTERPRISE'],
    'advanced_filtering': ['PRO', 'ENTERPRISE'],
    'export_data': ['PRO', 'ENTERPRISE'],
    'priority_support': ['PRO', 'ENTERPRISE'],
    
    // Enterprise features
    'api_access': ['ENTERPRISE'],
    'custom_integrations': ['ENTERPRISE'],
    'dedicated_support': ['ENTERPRISE'],
    'advanced_analytics': ['ENTERPRISE'],
  };

  const allowedPlans = featureMap[feature as keyof typeof featureMap];
  return allowedPlans ? allowedPlans.includes(plan) : false;
}

// Usage limits
export function getUsageLimits(plan: 'FREE' | 'PRO' | 'ENTERPRISE') {
  const limits = {
    FREE: {
      searches_per_day: 10,
      exports_per_month: 0,
      companies_per_export: 0,
    },
    PRO: {
      searches_per_day: -1, // unlimited
      exports_per_month: 50,
      companies_per_export: 1000,
    },
    ENTERPRISE: {
      searches_per_day: -1, // unlimited
      exports_per_month: -1, // unlimited
      companies_per_export: -1, // unlimited
    },
  };

  return limits[plan];
}
