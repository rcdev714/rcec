import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/server-admin';
import { getPlanFromStripePriceId } from '@/lib/plans';
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

  // Use service client for webhook logging (bypass RLS)
  const supabase = createServiceClient();

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
    console.error('[WEBHOOK] Error logging webhook:', logError);
    // We don't return here because we should still try to process the event
  } else if (logError && isPostgrestError(logError) && logError.code === '23505') {
    console.log('[WEBHOOK] Duplicate webhook event received:', event.id, ', processing anyway to ensure idempotency');
    // Don't return early - process the event to ensure idempotency
    // The actual DB operations use upserts so they're safe to repeat
  }

  try {
    await handleStripeEvent(event);
    
    // Update webhook log as processed
    await updateWebhookLog(supabase, event.id, 'processed', Date.now() - startTime);

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[WEBHOOK ERROR] Event:', event.type);
    console.error('[WEBHOOK ERROR] Message:', errorMessage);
    console.error('[WEBHOOK ERROR] Stack:', errorStack);
    console.error('[WEBHOOK ERROR] Event ID:', event.id);
    
    // Update webhook log as failed
    await updateWebhookLog(supabase, event.id, 'failed', Date.now() - startTime, errorMessage);

    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: errorMessage,
        event_type: event.type,
        event_id: event.id
      },
      { status: 500 }
    );
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  // Use service client for all webhook DB writes
  const supabase = createServiceClient();

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
      let userId = (session.metadata?.supabase_user_id || session.client_reference_id || '').toString();

      // If userId not in metadata/client_reference_id, look up by email
      // (Stripe Pricing Tables don't support client-reference-id)
      if (!userId && session.customer_email) {
        try {
          const { data: user, error } = await supabase
            .rpc('get_user_id_by_email', { p_email: session.customer_email });
          
          if (error) {
            console.warn('RPC get_user_id_by_email failed, trying customer lookup', error);
            // Fallback: check if we have this customer_id in user_subscriptions
            if (session.customer) {
              const { data: existingSub } = await supabase
                .from('user_subscriptions')
                .select('user_id')
                .eq('customer_id', session.customer as string)
                .limit(1)
                .maybeSingle();
              userId = existingSub?.user_id || '';
            }
          } else {
            userId = user || '';
          }
        } catch (e) {
          console.error('Failed to lookup user by email:', e);
        }
      }

      if (!userId) {
        console.error('Unable to resolve userId from checkout.session.completed', {
          customer_email: session.customer_email,
          customer: session.customer
        });
        return;
      }

      // Determine plan by retrieving the subscription and mapping the price ID
      let resolvedPlan: 'FREE' | 'PRO' | 'ENTERPRISE' = 'FREE';
      try {
        if (session.subscription) {
          const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
          const priceId = sub.items.data[0]?.price.id || '';
          console.log('[CHECKOUT] Price ID:', priceId);
          
          const plan = await getPlanFromStripePriceId(priceId || '');
          console.log('[CHECKOUT] Resolved plan:', plan);
          
          if (plan === 'PRO' || plan === 'ENTERPRISE' || plan === 'FREE') {
            resolvedPlan = plan;
          }
        }
      } catch (e) {
        console.error('[CHECKOUT ERROR] Failed to resolve plan from subscription:', e);
        // Don't fail the whole webhook, just log the error
      }

      try {
        const subscriptionData = {
          customer_id: session.customer as string,
          subscription_id: session.subscription as string,
          plan: resolvedPlan,
          status: 'active' as const,
          current_period_start: new Date().toISOString(),
          current_period_end: null,
          updated_at: new Date().toISOString(),
        };

        console.log('[CHECKOUT] Upserting subscription for user:', userId, 'plan:', resolvedPlan);
        
        // Upsert by user_id to ensure record exists regardless of prior state
        const { error: upsertError } = await supabase
          .from('user_subscriptions')
          .upsert({ user_id: userId, ...subscriptionData }, { onConflict: 'user_id' });
        
        if (upsertError) {
          console.error('[CHECKOUT ERROR] Upsert failed:', upsertError);
          throw upsertError;
        }
        
        console.log('[CHECKOUT] Subscription updated successfully');

        // Attempt to persist mapping onto the Stripe customer for future events
        if (session.customer) {
          try {
            await getStripe().customers.update(session.customer as string, {
              metadata: { supabase_user_id: userId },
            });
          } catch (e) {
            console.warn('Failed to update Stripe customer metadata:', e);
          }
        }

        logValidationSuccess('webhook_checkout_completed', { userId, plan: resolvedPlan });
      } catch (error) {
        console.error('Error upserting subscription after checkout:', error);
        logValidationError(
          'webhook_checkout_completed',
          { isValid: false, errors: [error instanceof Error ? error.message : 'Unknown error'], warnings: [] },
          { userId, planId: resolvedPlan }
        );
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

      let userId = customer.metadata?.supabase_user_id as string | undefined;
      if (!userId) {
        // Fallback: try to lookup by customer_id or subscription_id from our DB
        const { data: byCustomer } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('customer_id', subscription.customer as string)
          .limit(1)
          .maybeSingle();
        userId = byCustomer?.user_id as string | undefined;
      }
      if (!userId) {
        const { data: bySub } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('subscription_id', subscription.id)
          .limit(1)
          .maybeSingle();
        userId = bySub?.user_id as string | undefined;
      }
      if (!userId) {
        console.error('Unable to resolve user for subscription update');
        return;
      }
      // Ensure we attach metadata for next time
      try {
        await getStripe().customers.update(subscription.customer as string, { metadata: { supabase_user_id: userId } });
      } catch {}

      // Determine plan from price ID - database-driven
      const priceId = subscription.items.data[0]?.price.id;
      let plan = await getPlanFromStripePriceId(priceId || '');

      if (!plan) {
        console.error(`Unknown price ID: ${priceId}, defaulting to FREE plan`);
        plan = 'FREE';
      }

      // Upsert/update subscription directly with service client
      try {
        const subscriptionData = {
          customer_id: subscription.customer as string,
          subscription_id: subscription.id,
          plan: plan as 'FREE' | 'PRO' | 'ENTERPRISE',
          status: subscription.status as 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing',
          current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        };
        const { error: upsertError } = await supabase
          .from('user_subscriptions')
          .upsert({ user_id: userId, ...subscriptionData }, { onConflict: 'user_id' });
        if (upsertError) throw upsertError;
        logValidationSuccess('webhook_subscription_updated', { userId, plan, status: subscription.status });
      } catch (error) {
        console.error('Error updating subscription:', error);
        logValidationError(
          'webhook_subscription_updated',
          { isValid: false, errors: [error instanceof Error ? error.message : 'Unknown error'], warnings: [] },
          { userId, plan, status: subscription.status }
        );
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
