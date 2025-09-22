import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

// Minimal types to satisfy linting without changing Supabase logic
type MinimalUser = { id: string }
type RefreshTokenError = { status?: number; code?: string; message?: unknown }

function isRefreshTokenMissingError(err: unknown): boolean {
  const e = err as RefreshTokenError
  return (
    e?.status === 400 &&
    (e?.code === 'refresh_token_not_found' ||
      (typeof e?.message === 'string' && e.message.includes('Refresh Token Not Found')))
  )
}

export async function updateSession(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Gracefully handle missing/invalid refresh tokens to avoid noisy logs
  let user: MinimalUser | null = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (err) {
    if (!isRefreshTokenMissingError(err)) {
      console.error('Error fetching user in middleware:', err)
    }
  }

  // Define public paths that don't require authentication
  const publicPaths = ['/', '/dashboard', '/pricing', '/auth/confirm', '/auth/sign-up-success']
  const publicPrefixes = ['/s/']
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname) ||
    publicPrefixes.some(prefix => request.nextUrl.pathname.startsWith(prefix))

  // Authentication check
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !isPublicPath
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Subscription-based route protection
  if (user && shouldCheckSubscription(request.nextUrl.pathname)) {
    const subscription = await getUserSubscription(supabase, user.id)
    const hasAccess = checkRouteAccess(request.nextUrl.pathname, subscription?.plan || 'FREE')
    
    if (!hasAccess) {
      const url = request.nextUrl.clone()
      url.pathname = '/pricing'
      url.searchParams.set('upgrade', 'required')
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the response object you're returning to myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return response
}

// Helper function to get user subscription in middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserSubscription(supabase: any, userId: string) {
  try {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single()
    
    return data
  } catch (error) {
    console.error('Error fetching subscription in middleware:', error)
    return null
  }
}

// Define which routes should be checked for subscription
function shouldCheckSubscription(pathname: string): boolean {
  const protectedRoutes = [
    '/companies/export', // Pro+ feature
    '/api/companies/export', // Pro+ feature
    '/analytics', // Enterprise feature
    '/api/analytics', // Enterprise feature
  ]
  
  return protectedRoutes.some(route => pathname.startsWith(route))
}

// Check if user has access to specific route based on their plan
function checkRouteAccess(pathname: string, plan: string): boolean {
  // Free plan restrictions
  if (plan === 'FREE') {
    const restrictedPaths = [
      '/companies/export',
      '/api/companies/export',
      '/analytics',
      '/api/analytics',
    ]
    return !restrictedPaths.some(path => pathname.startsWith(path))
  }
  
  // Pro plan restrictions
  if (plan === 'PRO') {
    const enterpriseOnlyPaths = [
      '/analytics',
      '/api/analytics',
    ]
    return !enterpriseOnlyPaths.some(path => pathname.startsWith(path))
  }
  
  // Enterprise has access to everything
  return true
}
