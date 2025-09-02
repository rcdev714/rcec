import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

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
  const { error: logError } = await supabase
    .from('webhook_logs')
    .insert({
      webhook_id: event.id,
      event_type: event.type,
      status: 'received',
      stripe_event_id: event.id,
      payload: {
        id: event.id,
        type: event.type,
        object: 'event',
        api_version: event.api_version,
        created: event.created,
                  // @ts-expect-error - Simplified payload structure for logging
          data: { object: { id: event.data.object.id } }
      }
    });

  // If it's a unique constraint violation, it's a duplicate event, so we can ignore it.
  if (logError && logError.code === '23505') {
    console.log(`Duplicate webhook event received: ${event.id}`);
    return NextResponse.json({ received: true, message: 'Duplicate event' });
  }

  if (logError) {
    console.error('Error logging webhook:', logError);
    // We don't return here because we should still try to process the event
  }

  try {
    await handleStripeEvent(event);
    
    // Update webhook log as processed
    await supabase
      .from('webhook_logs')
      .update({
        status: 'processed',
        processing_time_ms: Date.now() - startTime,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Update webhook log as failed
    await supabase
      .from('webhook_logs')
      .update({
        status: 'failed',
        processing_time_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id);

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

      // Update or create user subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          customer_id: session.customer as string,
          subscription_id: session.subscription as string,
          plan: planId.toUpperCase(),
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: null, // Will be updated by subscription.created
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating subscription after checkout:', error);
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

      // Determine plan from price ID
      let plan = 'FREE';
      if (subscription.items.data[0]?.price.id === process.env.STRIPE_PRO_PRICE_ID) {
        plan = 'PRO';
      } else if (subscription.items.data[0]?.price.id === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        plan = 'ENTERPRISE';
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          customer_id: subscription.customer as string,
          subscription_id: subscription.id,
          plan,
          status: subscription.status,
          current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error updating subscription:', error);
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
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
