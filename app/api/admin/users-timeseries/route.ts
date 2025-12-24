import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/server-admin'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const url = new URL(request.url)
    const daysParam = url.searchParams.get('days') || '7'
    const days = Math.max(1, Math.min(365, parseInt(daysParam, 10) || 7))

    const supabase = createServiceClient()
    const start = new Date()
    start.setUTCDate(start.getUTCDate() - (days - 1))
    start.setUTCHours(0, 0, 0, 0)

    // Get all users created in the time range
    const { data: users, error } = await supabase
      .from('user_subscriptions')
      .select('created_at')
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching users timeseries:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Generate date series for the period
    const dateSeries: string[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
      dateSeries.push(date.toISOString().split('T')[0])
    }

    // Count users per day (cumulative)
    const usersByDate = new Map<string, number>()

    // First, count total users before the start date
    const { count: usersBeforeStart } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', start.toISOString())

    let cumulativeCount = usersBeforeStart || 0

    // Count new users per day
    const newUsersByDate = new Map<string, number>()
    dateSeries.forEach(date => {
      newUsersByDate.set(date, 0)
    })

    users?.forEach(user => {
      const userDate = new Date(user.created_at).toISOString().split('T')[0]
      if (newUsersByDate.has(userDate)) {
        newUsersByDate.set(userDate, (newUsersByDate.get(userDate) || 0) + 1)
      }
    })

    // Build cumulative counts
    dateSeries.forEach(date => {
      const newUsersToday = newUsersByDate.get(date) || 0
      cumulativeCount += newUsersToday
      usersByDate.set(date, cumulativeCount)
    })

    // Build output array
    const data = dateSeries.map(date => ({
      date,
      users: usersByDate.get(date) || 0
    }))

    return NextResponse.json({ days, data })
  } catch (error) {
    console.error('Error in users-timeseries API:', error)
    return NextResponse.json(
      { error: 'Unauthorized or server error' },
      { status: error instanceof Error && error.message === 'Unauthorized: Admin access required' ? 401 : 500 }
    )
  }
}

