/**
 * @deprecated This checkout route is deprecated in favor of Stripe Pricing Table.
 * 
 * The Stripe Pricing Table (embedded on /pricing page) now handles checkout directly.
 * This route is kept for backward compatibility and legacy integrations only.
 * 
 * For new integrations, use the Stripe Pricing Table component which provides:
 * - Automatic price updates from Stripe Dashboard
 * - Built-in promotional code support
 * - Better mobile experience
 * - Automatic tax calculation
 * - No need for server-side checkout session creation
 * 
 * See STRIPE_SETUP.md for migration guide.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { getStripe, getSubscriptionPlansForStripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();
    
    // Validate the plan - database-driven
    const stripePlans = await getSubscriptionPlansForStripe();
    if (!planId || !(planId in stripePlans)) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Don't allow checkout for FREE plan
    if (planId === 'FREE') {
      return NextResponse.json(
        { error: 'Free plan does not require checkout' },
        { status: 400 }
      );
    }

    const plan = stripePlans[planId as keyof typeof stripePlans];
    
    // Get existing subscription
    const existingSubscription = await getUserSubscription(user.id);
    
    let customerId = existingSubscription?.customer_id;
    
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const baseUrl = request.nextUrl.origin;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      billing_address_collection: 'auto',
      line_items: [
        {
          price: plan.priceId!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      client_reference_id: user.id,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_id: planId,
        },
      },
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
      },
    };

    const idempotencyKey =
      request.headers.get('x-request-id') ||
      request.headers.get('x-correlation-id') ||
      randomUUID();

    const session = await getStripe().checkout.sessions.create(sessionParams, { idempotencyKey });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
