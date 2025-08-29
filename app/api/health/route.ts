import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check database connectivity
    const supabase = await createClient()
    const { error } = await supabase
      .from('subscription_plans')
      .select('count(*)')
      .single()

    if (error) {
      console.error('Database health check failed:', error)
      return NextResponse.json(
        { 
          status: 'unhealthy', 
          error: 'Database connection failed',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    // Check environment variables
    const requiredEnvVars = [
      'GOOGLE_API_KEY',
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
