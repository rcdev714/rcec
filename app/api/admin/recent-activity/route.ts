import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

interface ActivityItem {
  id: string
  type: 'signup' | 'subscription' | 'payment' | 'export' | 'error' | 'webhook' | 'system'
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export async function GET() {
  try {
    await requireAdmin()
    
    const supabase = await createClient()
    const activities: ActivityItem[] = []

    // Get recent signups (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const { data: recentSignups } = await supabase
      .from('user_subscriptions')
      .select('created_at, user_id')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    recentSignups?.forEach(signup => {
      activities.push({
        id: `signup-${signup.user_id}`,
        type: 'signup',
        message: 'New user signed up',
        timestamp: signup.created_at,
        metadata: { user_id: signup.user_id }
      })
    })

    // Get recent subscription changes
    const { data: recentSubscriptionChanges } = await supabase
      .from('user_subscriptions')
      .select('updated_at, plan, status, user_id')
      .gte('updated_at', oneDayAgo.toISOString())
      .neq('plan', 'FREE')
      .order('updated_at', { ascending: false })
      .limit(5)

    recentSubscriptionChanges?.forEach(change => {
      activities.push({
        id: `subscription-${change.user_id}-${change.updated_at}`,
        type: 'subscription',
        message: `Subscription changed to ${change.plan} (${change.status})`,
        timestamp: change.updated_at,
        metadata: { plan: change.plan, status: change.status }
      })
    })

    // Get recent exports (from usage events)
    const { data: recentExports } = await supabase
      .from('user_usage_events')
      .select('created_at, user_id, count')
      .eq('kind', 'export')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    recentExports?.forEach(exportEvent => {
      activities.push({
        id: `export-${exportEvent.user_id}-${exportEvent.created_at}`,
        type: 'export',
        message: `User exported ${exportEvent.count} companies`,
        timestamp: exportEvent.created_at,
        metadata: { count: exportEvent.count }
      })
    })

    // Get recent webhook events
    const { data: recentWebhooks } = await supabase
      .from('webhook_logs')
      .select('id, event_type, status, created_at')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    recentWebhooks?.forEach(webhook => {
      activities.push({
        id: `webhook-${webhook.id}`,
        type: 'webhook',
        message: `Stripe webhook: ${webhook.event_type} (${webhook.status})`,
        timestamp: webhook.created_at,
        metadata: { event_type: webhook.event_type, status: webhook.status }
      })
    })

    // Get recent system events
    const { data: recentSystemEvents } = await supabase
      .from('system_events')
      .select('id, event_type, description, severity, created_at')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    recentSystemEvents?.forEach(systemEvent => {
      activities.push({
        id: `system-${systemEvent.id}`,
        type: systemEvent.severity === 'error' || systemEvent.severity === 'critical' ? 'error' : 'system',
        message: systemEvent.description || `${systemEvent.event_type} event`,
        timestamp: systemEvent.created_at,
        metadata: { event_type: systemEvent.event_type, severity: systemEvent.severity }
      })
    })

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Return latest 20 activities
    return NextResponse.json(activities.slice(0, 20))

  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: 'Unauthorized or server error' },
      { status: error instanceof Error && error.message === 'Unauthorized: Admin access required' ? 401 : 500 }
    )
  }
}
