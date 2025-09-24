import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Define security headers
const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.googletagmanager.com cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' *.googleapis.com fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' *.supabase.co *.stripe.com",
    "frame-src 'self' *.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; '),

  // HTTP Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS filtering
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()'
  ].join(', '),

  // Remove server information
  'X-Powered-By': '',

  // Cross-Origin Embedder Policy
  'Cross-Origin-Embedder-Policy': 'credentialless',

  // Cross-Origin Opener Policy
  'Cross-Origin-Opener-Policy': 'same-origin',

  // Cross-Origin Resource Policy
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API health check
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/health') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Apply rate limiting to API routes (except health check)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/health')) {
    try {
      const rateLimitResult = await rateLimit(request, rateLimitConfig);
      if (!rateLimitResult.success) {
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: rateLimitResult.message,
            retryAfter: Math.ceil(rateLimitResult.resetTime / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
              ...Object.fromEntries(
                rateLimitResult.headers?.entries() || []
              )
            }
          }
        );
      }
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if there's an error
    }
  }

  // Create response with security headers
  const response = NextResponse.next();

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) { // Only set headers with values
      response.headers.set(key, value);
    }
  });

  // Add rate limit headers if available
  if (pathname.startsWith('/api/')) {
    try {
      const rateLimitInfo = await rateLimit(request, { ...rateLimitConfig, dryRun: true });
      if (rateLimitInfo.headers) {
        rateLimitInfo.headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
      }
    } catch (error) {
      // Silently fail for rate limit header setting
    }
  }

  // Apply Supabase session management
  const supabaseResponse = await updateSession(request);

  // Merge security headers with Supabase response
  const finalResponse = new NextResponse(supabaseResponse.body, {
    status: supabaseResponse.status,
    statusText: supabaseResponse.statusText,
    headers: {
      ...Object.fromEntries(supabaseResponse.headers.entries()),
      ...Object.fromEntries(response.headers.entries())
    }
  });

  return finalResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};