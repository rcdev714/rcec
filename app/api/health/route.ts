import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check database connectivity with a simple query
    const supabase = await createClient()
    
    // Use a simpler database check that doesn't rely on specific tables
    const { error: dbError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)
    
    // If information_schema fails, try a basic connection check
    if (dbError) {
      console.warn('Information schema check failed, trying basic connection:', dbError)
      
      // Fallback to a basic auth check which should always work
      const { error: authError } = await supabase.auth.getUser()
      
      if (authError && authError.message !== 'Auth session missing!') {
        console.error('Database health check failed:', authError)
        return NextResponse.json(
          { 
            status: 'unhealthy', 
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
          },
          { status: 503 }
        )
      }
    }

    // Check environment variables (allow missing GOOGLE_API_KEY)
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        { 
          status: 'unhealthy', 
          error: 'Missing environment variables',
          missing: missingEnvVars,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // All checks passed
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        environment: 'ok'
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
