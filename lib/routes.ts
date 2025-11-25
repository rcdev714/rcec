const STATIC_PUBLIC_ROUTES = new Set<string>([
  '/',
  '/pricing',
  '/contacto',
  '/carreras',
  '/inversores',
  '/auth/confirm',
  '/auth/sign-up-success',
])

const PUBLIC_PREFIXES = ['/s/']
const AUTH_PREFIX = '/auth'

export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith(AUTH_PREFIX)
}

export function isPublicRoute(pathname: string): boolean {
  if (!pathname) {
    return true
  }

  if (STATIC_PUBLIC_ROUTES.has(pathname)) {
    return true
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function shouldRenderAppShell(pathname: string): boolean {
  if (!pathname) {
    return false
  }

  if (isAuthRoute(pathname)) {
    return false
  }

  return !isPublicRoute(pathname)
}

export function requiresTermsAcceptance(pathname: string): boolean {
  return shouldRenderAppShell(pathname)
}

