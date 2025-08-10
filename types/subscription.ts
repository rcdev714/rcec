export interface UserSubscription {
  id: string;
  user_id: string;
  subscription_id: string | null;
  customer_id: string | null;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  price_id: string;
  features: string[];
  is_popular?: boolean;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface SubscriptionStatus {
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
  isActive: boolean;
  canAccessFeature: (feature: string) => boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}
