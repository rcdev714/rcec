import { NextRequest } from 'next/server';

// Simple in-memory rate limiting store
// In production, consider using Redis or a similar persistent store
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  dryRun?: boolean;
}

interface RateLimitResult {
  success: boolean;
  message?: string;
  resetTime: number;
  remaining: number;
  headers?: Headers;
}

// In-memory store (replace with Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    windowMs,
    max,
    message = 'Too many requests',
    standardHeaders = true,
    legacyHeaders = false,
    dryRun = false
  } = config;

  // Get client identifier (IP address)
  const ip = getClientIP(request);
  const key = `${ip}:${request.nextUrl.pathname}`;

  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  // Check if limit exceeded
  const limitExceeded = entry.count >= max;

  if (!dryRun) {
    if (!limitExceeded) {
      entry.count++;
      rateLimitStore.set(key, entry);
    }
  }

  const remaining = Math.max(0, max - entry.count);
  const resetTime = entry.resetTime;

  // Create headers
  const headers = new Headers();

  if (standardHeaders) {
    headers.set('X-RateLimit-Limit', max.toString());
    headers.set('X-RateLimit-Remaining', remaining.toString());
    headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  }

  if (legacyHeaders) {
    headers.set('X-RateLimit-Limit', max.toString());
    headers.set('X-RateLimit-Remaining', remaining.toString());
    headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  }

  return {
    success: !limitExceeded,
    message: limitExceeded ? message : undefined,
    resetTime,
    remaining,
    headers
  };
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  // Try different headers to get the real client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  // Priority: CF-Connecting-IP > X-Forwarded-For > X-Real-IP > X-Client-IP > fallback
  const ip = cfConnectingIP || forwardedFor?.split(',')[0]?.trim() || realIP || clientIP;

  // Fallback to a hash of the user agent for development (not secure for production)
  return ip || hashUserAgent(request.headers.get('user-agent') || 'unknown');
}

// Simple hash function for fallback IP identification
function hashUserAgent(userAgent: string): string {
  let hash = 0;
  for (let i = 0; i < userAgent.length; i++) {
    const char = userAgent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
}

// Specialized rate limiting for authentication endpoints
export async function authRateLimit(
  request: NextRequest,
  options?: { maxAttempts?: number; windowMs?: number }
): Promise<RateLimitResult> {
  const { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = options || {};

  return rateLimit(request, {
    windowMs,
    max: maxAttempts,
    message: 'Too many authentication attempts. Please try again later.',
    standardHeaders: true
  });
}

// Specialized rate limiting for API endpoints
export async function apiRateLimit(
  request: NextRequest,
  options?: { maxRequests?: number; windowMs?: number }
): Promise<RateLimitResult> {
  const { maxRequests = 100, windowMs = 15 * 60 * 1000 } = options || {};

  return rateLimit(request, {
    windowMs,
    max: maxRequests,
    message: 'API rate limit exceeded. Please try again later.',
    standardHeaders: true
  });
}