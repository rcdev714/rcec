import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'

export async function GET() {
  try {
    await requireAdmin()
    
    const supabase = await createClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get total users
    const { count: totalUsers } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })

    // Get plan distribution
    const { data: planData } = await supabase
      .from('user_subscriptions')
      .select('plan')

    const planDistribution = planData?.reduce((acc, sub) => {
      acc[sub.plan as keyof typeof acc] = (acc[sub.plan as keyof typeof acc] || 0) + 1
      return acc
    }, { FREE: 0, PRO: 0, ENTERPRISE: 0 }) || { FREE: 0, PRO: 0, ENTERPRISE: 0 }

    // Recent signups (users created in last 30 days)
    const { count: recentSignups } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Recent cancellations
    const { count: recentCancellations } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('updated_at', thirtyDaysAgo.toISOString())

    // Recent upgrades (simplified - users who updated from FREE to paid plans)
    const { count: recentUpgrades } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .neq('plan', 'FREE')
      .gte('updated_at', thirtyDaysAgo.toISOString())

    // Calculate churn rate
    const { count: activeSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trialing'])

    const churnRate = activeSubscriptions && activeSubscriptions > 0 
      ? ((recentCancellations || 0) / activeSubscriptions) * 100 
      : 0

    // Calculate MRR (Monthly Recurring Revenue) from Stripe
    const mrr = await getActualMRRFromStripe()

    // Get top users by revenue (simplified)
    const { data: topUsersData } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan')
      .neq('plan', 'FREE')
      .in('status', ['active', 'trialing'])
      .limit(10)

    // Get usage data for top users (simplified)
    const topUsers = await Promise.all(
      (topUsersData || []).slice(0, 5).map(async (sub) => {
        const { data: usageData } = await supabase
          .from('user_usage')
          .select('searches, exports')
          .eq('user_id', sub.user_id)
          .limit(1)
          .single()

        const revenue = sub.plan === 'PRO' ? 20 : sub.plan === 'ENTERPRISE' ? 200 : 0

        return {
          id: sub.user_id,
          email: `user-${sub.user_id.slice(0, 8)}`, // Simplified for privacy
          plan: sub.plan,
          usage: {
            searches: usageData?.searches || 0,
            exports: usageData?.exports || 0
          },
          revenue
        }
      })
    )

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      planDistribution,
      recentSignups: recentSignups || 0,
      recentCancellations: recentCancellations || 0,
      recentUpgrades: recentUpgrades || 0,
      churnRate,
      mrr,
      topUsers
    })

  } catch (error) {
    console.error('Error fetching subscription metrics:', error)
    return NextResponse.json(
      { error: 'Unauthorized or server error' },
      { status: error instanceof Error && error.message === 'Unauthorized: Admin access required' ? 401 : 500 }
    )
  }
}

async function getActualMRRFromStripe(): Promise<number> {
  try {
    let mrr = 0
    
    // Use auto-pagination to get all active subscriptions
    const stripe = getStripe()
    for await (const subscription of stripe.subscriptions.list({
      status: 'active',
    })) {
      for (const item of subscription.items.data) {
        // Convert from cents to dollars and from the billing interval to monthly
        const amount = item.price.unit_amount || 0
        const amountInDollars = amount / 100

        if (item.price.recurring?.interval === 'month') {
          mrr += amountInDollars
        } else if (item.price.recurring?.interval === 'year') {
          mrr += amountInDollars / 12 // Convert yearly to monthly
        }
      }
    }

    return Math.round(mrr * 100) / 100 // Round to 2 decimal places
  } catch (error) {
    console.error('Error fetching MRR from Stripe:', error)
    
    // Fallback to Supabase calculation
    const supabase = await createClient()
    const { data: activeSubscriptionData } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .in('status', ['active', 'trialing'])
      .neq('plan', 'FREE')

    return activeSubscriptionData?.reduce((total, sub) => {
      switch (sub.plan) {
        case 'PRO':
          return total + 20
        case 'ENTERPRISE':
          return total + 200
        default:
          return total
      }
    }, 0) || 0
  }
}
