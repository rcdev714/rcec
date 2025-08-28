import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
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
    event = stripe.webhooks.constructEvent(
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

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  const supabase = await createClient();

  switch (event.type) {
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
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      
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
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      
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
