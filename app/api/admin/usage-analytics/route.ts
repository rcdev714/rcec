import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    
    const url = new URL(request.url)
    const range = url.searchParams.get('range') || '30d'
    
    const supabase = await createClient()
    const now = new Date()
    
    // Calculate date range
    let daysBack = 30
    switch (range) {
      case '7d':
        daysBack = 7
        break
      case '90d':
        daysBack = 90
        break
      default:
        daysBack = 30
    }
    
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    
    // Get usage events data
    const { data: usageEvents } = await supabase
      .from('user_usage_events')
      .select('event_date, kind, count')
      .gte('event_date', startDate.toISOString().split('T')[0])
      .order('event_date', { ascending: true })

    // Group data by date
    const dataMap = new Map<string, { searches: number; exports: number; prompts: number; revenue: number }>()
    
    // Initialize all dates with zero values
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      dataMap.set(dateKey, { searches: 0, exports: 0, prompts: 0, revenue: 0 })
    }
    
    // Fill in actual data
    usageEvents?.forEach(event => {
      const existing = dataMap.get(event.event_date) || { searches: 0, exports: 0, prompts: 0, revenue: 0 }
      
      if (event.kind === 'search') {
        existing.searches = event.count
      } else if (event.kind === 'export') {
        existing.exports = event.count
      }
      // Note: prompts are not tracked in user_usage_events yet, would need separate tracking
      
      dataMap.set(event.event_date, existing)
    })
    
    // Convert to array format
    const data = Array.from(dataMap.entries()).map(([date, values]) => ({
      date,
      ...values
    }))

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching usage analytics:', error)
    return NextResponse.json(
      { error: 'Unauthorized or server error' },
      { status: error instanceof Error && error.message === 'Unauthorized: Admin access required' ? 401 : 500 }
    )
  }
}
