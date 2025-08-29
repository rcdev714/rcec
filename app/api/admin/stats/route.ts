import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireAdmin()
    
    const supabase = await createClient()

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })

    // Get active subscriptions count
    const { count: activeSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trialing'])
      .neq('plan', 'FREE')

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

    // Basic system health check (inline to avoid self-HTTP call)
    let systemHealth: 'healthy' | 'warning' | 'error' = 'healthy'
    try {
      // Test database connectivity
      const dbStart = Date.now()
      await supabase.from('subscription_plans').select('count(*)')
      const responseTime = Date.now() - dbStart
      
      if (responseTime > 1000) {
        systemHealth = 'warning'
      }
    } catch (error) {
      console.error('Database connectivity error in stats:', error)
      systemHealth = 'error'
    }

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      monthlyRevenue,
      systemHealth
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Unauthorized or server error' },
      { status: error instanceof Error && error.message === 'Unauthorized: Admin access required' ? 401 : 500 }
    )
  }
}
