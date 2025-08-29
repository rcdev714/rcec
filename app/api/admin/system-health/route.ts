import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireAdmin()
    
    const supabase = await createClient()

    // Test database connectivity and response time
    let dbStatus: 'connected' | 'disconnected' | 'slow' = 'connected'
    let responseTime = 0
    
    try {
      const dbStart = Date.now()
      await supabase.from('subscription_plans').select('count(*)')
      responseTime = Date.now() - dbStart
      
      if (responseTime > 1000) {
        dbStatus = 'slow'
      }
    } catch (_error) {
      console.error('Database connectivity error:', _error)
      dbStatus = 'disconnected'
      responseTime = -1
    }

    // Check external APIs
    const apis = {
      stripe: 'operational' as 'operational' | 'degraded' | 'down',
      supabase: dbStatus === 'connected' ? 'operational' as const : 'down' as const,
      gemini: 'operational' as 'operational' | 'degraded' | 'down'
    }

    // Check Google Gemini API (simplified)
    try {
      if (!process.env.GOOGLE_API_KEY) {
        apis.gemini = 'down'
      }
    } catch {
      apis.gemini = 'down'
    }

    // Server metrics (simplified for Railway/serverless)
    const memUsage = process.memoryUsage ? process.memoryUsage() : null
    const server = {
      uptime: process.uptime ? process.uptime() : 0,
      // More accurate representation: show actual memory values instead of misleading percentage
      memoryMB: memUsage ? Math.round(memUsage.heapUsed / 1024 / 1024) : 0,
      memoryTotalMB: memUsage ? Math.round(memUsage.heapTotal / 1024 / 1024) : 0,
      cpu: 0 // CPU usage is not easily available in serverless
    }

    // Determine overall health status
    let status: 'healthy' | 'warning' | 'error' = 'healthy'
    
    if (dbStatus === 'disconnected' || apis.stripe === 'down' || apis.gemini === 'down') {
      status = 'error'
    } else if (dbStatus === 'slow' || apis.stripe === 'degraded' || apis.gemini === 'degraded') {
      status = 'warning'
    }
    // Note: Removed memory threshold check as heap usage % is misleading in serverless

    return NextResponse.json({
      status,
      database: {
        status: dbStatus,
        responseTime
      },
      apis,
      server,
      lastChecked: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error checking system health:', error)
    return NextResponse.json(
      { error: 'Unauthorized or server error' },
      { status: error instanceof Error && error.message === 'Unauthorized: Admin access required' ? 401 : 500 }
    )
  }
}
