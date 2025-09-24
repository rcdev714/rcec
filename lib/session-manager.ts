import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionValidationResult {
  isValid: boolean;
  user: unknown | null;
  needsRefresh: boolean;
  error?: string;
}

// Server-side session validation
export async function validateServerSession(_request?: NextRequest): Promise<SessionValidationResult> {
  try {
    const supabase = await createClient();

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session validation error:', error);
      return {
        isValid: false,
        user: null,
        needsRefresh: false,
        error: error.message
      };
    }

    if (!session) {
      return {
        isValid: false,
        user: null,
        needsRefresh: false
      };
    }

    // Check if session is expired or will expire soon (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const needsRefresh = expiresAt ? (expiresAt - now) < 300 : false; // 5 minutes

    return {
      isValid: true,
      user: session.user,
      needsRefresh
    };
  } catch (error) {
    console.error('Unexpected error during session validation:', error);
    return {
      isValid: false,
      user: null,
      needsRefresh: false,
      error: 'Unexpected session validation error'
    };
  }
}

// Client-side session validation
export async function validateClientSession(): Promise<SessionValidationResult> {
  try {
    const supabase = createBrowserClient();

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Client session validation error:', error);
      return {
        isValid: false,
        user: null,
        needsRefresh: false,
        error: error.message
      };
    }

    if (!session) {
      return {
        isValid: false,
        user: null,
        needsRefresh: false
      };
    }

    // Check if session is expired or will expire soon (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const needsRefresh = expiresAt ? (expiresAt - now) < 300 : false; // 5 minutes

    return {
      isValid: true,
      user: session.user,
      needsRefresh
    };
  } catch (error) {
    console.error('Unexpected error during client session validation:', error);
    return {
      isValid: false,
      user: null,
      needsRefresh: false,
      error: 'Unexpected session validation error'
    };
  }
}

// Refresh session if needed
export async function refreshSessionIfNeeded(sessionResult: SessionValidationResult): Promise<SessionValidationResult> {
  if (!sessionResult.needsRefresh && sessionResult.isValid) {
    return sessionResult;
  }

  try {
    const supabase = createBrowserClient();

    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      console.error('Session refresh failed:', error);
      return {
        isValid: false,
        user: null,
        needsRefresh: false,
        error: error?.message || 'Session refresh failed'
      };
    }

    return {
      isValid: true,
      user: data.session.user,
      needsRefresh: false
    };
  } catch (error) {
    console.error('Unexpected error during session refresh:', error);
    return {
      isValid: false,
      user: null,
      needsRefresh: false,
      error: 'Unexpected session refresh error'
    };
  }
}

// Enhanced middleware session handling
export async function handleSessionInMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const sessionValidation = await validateServerSession(request);

  // If session is invalid and we're not on an auth page, redirect to login
  if (!sessionValidation.isValid) {
    const pathname = request.nextUrl.pathname;

    // Skip middleware for static files and API health check
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.startsWith('/api/health') ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2)$/)
    ) {
      return null; // Continue with normal flow
    }

    // Allow access to public paths
    const publicPaths = ['/', '/dashboard', '/pricing', '/auth/confirm', '/auth/sign-up-success'];
    const publicPrefixes = ['/s/'];

    const isPublicPath = publicPaths.includes(pathname) ||
      publicPrefixes.some(prefix => pathname.startsWith(prefix));

    if (!pathname.startsWith('/auth') && !pathname.startsWith('/api') && !isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }
  }

  return null; // Continue with normal flow
}

// Session monitoring utility
export class SessionMonitor {
  private static instance: SessionMonitor;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(isValid: boolean) => void> = [];

  static getInstance(): SessionMonitor {
    if (!SessionMonitor.instance) {
      SessionMonitor.instance = new SessionMonitor();
    }
    return SessionMonitor.instance;
  }

  startMonitoring(intervalMs: number = 60000): void { // Default: check every minute
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const sessionResult = await validateClientSession();

      if (!sessionResult.isValid) {
        this.notifyListeners(false);
      } else if (sessionResult.needsRefresh) {
        // Try to refresh the session
        const refreshedSession = await refreshSessionIfNeeded(sessionResult);
        this.notifyListeners(refreshedSession.isValid);
      } else {
        this.notifyListeners(true);
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  addListener(callback: (isValid: boolean) => void): void {
    this.listeners.push(callback);
  }

  removeListener(callback: (isValid: boolean) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(isValid: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isValid);
      } catch (error) {
        console.error('Error in session monitor listener:', error);
      }
    });
  }
}

// Session utilities
export const sessionUtils = {
  // Check if user needs to re-authenticate
  shouldReAuthenticate: (session: unknown): boolean => {
    if (!session || typeof session !== 'object') return true;

    const sessionObj = session as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = sessionObj.expires_at as number | undefined;

    // Consider session expired if it expires within 1 minute
    return expiresAt ? (expiresAt - now) < 60 : true;
  },

  // Get session time remaining in minutes
  getSessionTimeRemaining: (session: unknown): number => {
    if (!session || typeof session !== 'object') return 0;

    const sessionObj = session as Record<string, unknown>;
    if (!sessionObj.expires_at) return 0;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = sessionObj.expires_at as number;

    return Math.max(0, Math.floor((expiresAt - now) / 60));
  },

  // Format session expiry for display
  formatSessionExpiry: (session: unknown): string => {
    const remaining = sessionUtils.getSessionTimeRemaining(session);

    if (remaining === 0) return 'Expired';
    if (remaining < 60) return `${remaining}m`;
    if (remaining < 1440) return `${Math.floor(remaining / 60)}h`;

    return `${Math.floor(remaining / 1440)}d`;
  }
};