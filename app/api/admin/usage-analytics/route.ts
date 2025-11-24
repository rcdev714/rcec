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
    
    // Get usage events data (daily counts for searches/exports)
    const { data: usageEvents } = await supabase
      .from('user_usage_events')
      .select('event_date, kind, count')
      .gte('event_date', startDate.toISOString().split('T')[0])
      .order('event_date', { ascending: true })

    // Get prompt/token usage from conversation messages
    // We aggregate assistant messages to get daily token/cost stats
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('created_at, input_tokens, output_tokens, model_name')
      .eq('role', 'assistant')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Group data by date
    const dataMap = new Map<string, { searches: number; exports: number; prompts: number; revenue: number }>()
    
    // Initialize all dates with zero values
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      dataMap.set(dateKey, { searches: 0, exports: 0, prompts: 0, revenue: 0 })
    }
    
    // Fill in actual data from usage events
    usageEvents?.forEach(event => {
      const existing = dataMap.get(event.event_date) || { searches: 0, exports: 0, prompts: 0, revenue: 0 }
      
      if (event.kind === 'search') {
        existing.searches = (existing.searches || 0) + event.count
      } else if (event.kind === 'export') {
        existing.exports = (existing.exports || 0) + event.count
      }
      
      dataMap.set(event.event_date, existing)
    })

    // Helper to calculate cost (mirroring lib/usage.ts logic but simplified for aggregation)
    const getCost = (model: string | null, input: number, output: number) => {
      // Base rates per million tokens (approximate avg if not importing exact config)
      // Flash: $0.30/2.50, Pro: $1.25/10.00
      // We use a simplified calculation here for the chart
      const isPro = model?.includes('pro');
      const inputRate = isPro ? 1.25 : 0.30;
      const outputRate = isPro ? 10.00 : 2.50;
      const profitMargin = 15; // Match config
      
      const cost = ((input / 1000000) * inputRate) + ((output / 1000000) * outputRate);
      return cost * profitMargin;
    };

    // Fill in token usage data
    messages?.forEach(msg => {
      const dateKey = new Date(msg.created_at).toISOString().split('T')[0];
      // Only aggregate if date is within our map range (it should be due to query filter)
      if (dataMap.has(dateKey)) {
        const existing = dataMap.get(dateKey)!;
        
        const input = msg.input_tokens || 0;
        const output = msg.output_tokens || 0;
        const revenue = getCost(msg.model_name, input, output);
        
        existing.prompts += 1;
        existing.revenue += revenue;
        
        dataMap.set(dateKey, existing);
      }
    });
    
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
