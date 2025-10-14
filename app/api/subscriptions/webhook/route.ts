import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import { getPlanFromStripePriceId } from '@/lib/plans';
import { updateUserSubscription } from '@/lib/subscription';
import { logValidationError, logValidationSuccess } from '@/lib/subscription-validation';
import Stripe from 'stripe';
import { isPostgrestError } from '@/lib/type-guards';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Extended interface for Stripe subscription with period dates
interface StripeSubscriptionWithPeriods extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

// Extended interface for Stripe invoice with subscription
interface StripeInvoiceWithSubscription extends Stripe.Invoice {
  subscription: string | null;
}

interface SimplifiedStripeEvent {
  id: string;
  type: string;
  object: 'event';
  api_version: string | null;
  created: number;
  data: {
    object: {
      id?: string;
      [key: string]: unknown;
    };
  };
}

interface StripeObjectWithId {
  id: string;
}

async function updateWebhookLog(supabase: SupabaseClient, eventId: string, status: string, processingTimeMs: number, errorMessage?: string) {
  await supabase
    .from('webhook_logs')
    .update({
      status,
      processing_time_ms: processingTimeMs,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_event_id', eventId);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Received Stripe event:', event.type);
  }

  const supabase = await createClient();

  // Log webhook event for idempotency and audit
  const simplifiedEvent: SimplifiedStripeEvent = {
    id: event.id,
    type: event.type,
    object: 'event',
    api_version: event.api_version,
    created: event.created,
    data: {
      object: {
        id: (event.data.object as StripeObjectWithId).id,
      },
    },
  };

  const { error: logError } = await supabase
    .from('webhook_logs')
    .insert({
      webhook_id: event.id,
      event_type: event.type,
      status: 'received',
      stripe_event_id: event.id,
      payload: simplifiedEvent,
    });

  if (logError && (!isPostgrestError(logError) || logError.code !== '23505')) {
    console.error('Error logging webhook:', logError);
    // We don't return here because we should still try to process the event
  } else if (logError && isPostgrestError(logError) && logError.code === '23505') {
    console.log(`Duplicate webhook event received: ${event.id}`);
    return NextResponse.json({ received: true, message: 'Duplicate event' });
  }

  try {
    await handleStripeEvent(event);
    
    // Update webhook log as processed
    await updateWebhookLog(supabase, event.id, 'processed', Date.now() - startTime);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Update webhook log as failed
    await updateWebhookLog(supabase, event.id, 'failed', Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  const supabase = await createClient();

  switch (event.type) {
    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer;
      
      // Log system event
      await supabase
        .from('system_events')
        .insert({
          event_type: 'customer_created',
          description: `New Stripe customer created: ${customer.id}`,
          metadata: { customer_id: customer.id, email: customer.email },
        });
      break;
    }

    case 'invoice.created': {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Log system event
      await supabase
        .from('system_events')
        .insert({
          event_type: 'invoice_created',
          description: `Invoice created: ${invoice.id}`,
          metadata: { 
            invoice_id: invoice.id,
            amount: invoice.amount_due,
            customer_id: invoice.customer,
          },
        });
      break;
    }

    case 'invoice.finalized': {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Log system event
      await supabase
        .from('system_events')
        .insert({
          event_type: 'invoice_finalized',
          description: `Invoice finalized: ${invoice.id}`,
          metadata: { 
            invoice_id: invoice.id,
            amount: invoice.amount_due,
            customer_id: invoice.customer,
          },
        });
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Log system event
      await supabase
        .from('system_events')
        .insert({
          event_type: 'invoice_paid',
          description: `Invoice paid: ${invoice.id}`,
          metadata: { 
            invoice_id: invoice.id,
            amount_paid: invoice.amount_paid,
            customer_id: invoice.customer,
          },
        });
      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const planId = session.metadata?.plan_id;

      if (!userId || !planId) {
        console.error('Missing metadata in checkout session');
        return;
      }

      // Update or create user subscription with validation
      try {
        const subscriptionData = {
          customer_id: session.customer as string,
          subscription_id: session.subscription as string,
          plan: planId.toUpperCase() as 'FREE' | 'PRO' | 'ENTERPRISE',
          status: 'active' as const,
          current_period_start: new Date().toISOString(),
          current_period_end: null, // Will be updated by subscription.created
        };

        // Try to update existing subscription first
        const existingSubscription = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (existingSubscription.data) {
          // Update existing subscription
          await updateUserSubscription(userId, subscriptionData);
        } else {
          // Create new subscription
          const { createUserSubscription } = await import('@/lib/subscription');
          await createUserSubscription(userId, subscriptionData);
        }

        logValidationSuccess('webhook_checkout_completed', { userId, plan: planId });
      } catch (error) {
        console.error('Error updating subscription after checkout:', error);
        logValidationError('webhook_checkout_completed', {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: []
        }, { userId, planId });
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as StripeSubscriptionWithPeriods;
      
      // Get the customer to find the user
      const customer = await getStripe().customers.retrieve(subscription.customer as string);
      
      if (customer.deleted) {
        console.error('Customer was deleted');
        return;
      }

      const userId = customer.metadata?.supabase_user_id;
      if (!userId) {
        console.error('No supabase_user_id in customer metadata');
        return;
      }

      // Determine plan from price ID - database-driven
      const priceId = subscription.items.data[0]?.price.id;
      let plan = await getPlanFromStripePriceId(priceId || '');

      if (!plan) {
        console.error(`Unknown price ID: ${priceId}, defaulting to FREE plan`);
        plan = 'FREE';
      }

      // Update subscription with validation
      try {
        const subscriptionData = {
          customer_id: subscription.customer as string,
          subscription_id: subscription.id,
          plan: plan as 'FREE' | 'PRO' | 'ENTERPRISE',
          status: subscription.status as 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing',
          current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        };

        await updateUserSubscription(userId, subscriptionData);
        logValidationSuccess('webhook_subscription_updated', { userId, plan, status: subscription.status });
      } catch (error) {
        console.error('Error updating subscription:', error);
        logValidationError('webhook_subscription_updated', {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: []
        }, { userId, plan, status: subscription.status });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Get the customer to find the user
      const customer = await getStripe().customers.retrieve(subscription.customer as string);
      
      if (customer.deleted) {
        console.error('Customer was deleted');
        return;
      }

      const userId = customer.metadata?.supabase_user_id;
      if (!userId) {
        console.error('No supabase_user_id in customer metadata');
        return;
      }

      // Revert to free plan
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan: 'FREE',
          status: 'cancelled',
          subscription_id: null,
          current_period_end: null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error cancelling subscription:', error);
        if (isPostgrestError(error)) {
          // Handle PostgrestError
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as StripeInvoiceWithSubscription;
      const subscriptionId = invoice.subscription;

      if (!subscriptionId) return;

      // Mark subscription as past_due
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('subscription_id', subscriptionId);

      if (error) {
        console.error('Error updating subscription status to past_due:', error);
        if (isPostgrestError(error)) {
          // Handle PostgrestError
        }
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as StripeInvoiceWithSubscription;
      const subscriptionId = invoice.subscription;

      if (!subscriptionId) return;

      // Reactivate subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('subscription_id', subscriptionId);

      if (error) {
        console.error('Error reactivating subscription:', error);
        if (isPostgrestError(error)) {
          // Handle PostgrestError
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
