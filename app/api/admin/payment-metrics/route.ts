import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export async function GET() {
  try {
    await requireAdmin()
    
    const supabase = await createClient()
    const now = new Date()
    const _yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Check Stripe status (simplified)
    let stripeStatus: 'operational' | 'degraded' | 'down' = 'operational'
    try {
      await stripe.balance.retrieve()
    } catch (error) {
      console.error('Stripe error:', error)
      stripeStatus = 'down'
    }

    // Get recent transactions from Stripe
    const recentTransactions = await getRecentTransactions()

    // Get failed payments count from user_subscriptions with past_due status
    const { count: failedPayments } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'past_due')

    // Get webhook activity from webhook_logs
    const { count: activeWebhooks } = await supabase
      .from('webhook_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())

    // Get last webhook received
    const { data: lastWebhook } = await supabase
      .from('webhook_logs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastWebhookReceived = lastWebhook?.created_at || new Date().toISOString()

    // Calculate monthly revenue
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .in('status', ['active', 'trialing'])
      .neq('plan', 'FREE')

    const monthlyRevenue = subscriptions?.reduce((total, sub) => {
      switch (sub.plan) {
        case 'PRO':
          return total + 20
        case 'ENTERPRISE':
          return total + 200
        default:
          return total
      }
    }, 0) || 0

    // Calculate churn rate (simplified - last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const { count: cancelledSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('updated_at', thirtyDaysAgo.toISOString())

    const { count: totalActiveSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trialing'])

    const churnRate = totalActiveSubscriptions && totalActiveSubscriptions > 0 
      ? ((cancelledSubscriptions || 0) / totalActiveSubscriptions) * 100 
      : 0

    return NextResponse.json({
      stripeStatus,
      recentTransactions,
      failedPayments: failedPayments || 0,
      activeWebhooks,
      lastWebhookReceived,
      monthlyRevenue,
      churnRate
    })

  } catch (error) {
    console.error('Error fetching payment metrics:', error)
    return NextResponse.json(
      { error: 'Unauthorized or server error' },
      { status: error instanceof Error && error.message === 'Unauthorized: Admin access required' ? 401 : 500 }
    )
  }
}

async function getRecentTransactions(): Promise<number> {
  try {
    // Get charges from last 7 days
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
    
    const charges = await stripe.charges.list({
      created: { gte: sevenDaysAgo },
      limit: 100,
    })

    return charges.data.length
  } catch (error) {
    console.error('Error fetching Stripe transactions:', error)
    return 0
  }
}
