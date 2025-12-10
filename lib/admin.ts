import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * Admin access control utilities
 * 
 * REQUIRED ENVIRONMENT VARIABLE:
 * ADMIN_EMAILS - Comma-separated list of admin email addresses
 * Example: "admin1@company.com,admin2@company.com,admin3@company.com"
 * 
 * Note: This must be set in your environment variables for admin access to work.
 * Without this variable, no users will have admin access.
 */

// Admin email addresses from environment variable (REQUIRED)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(Boolean) || []

if (ADMIN_EMAILS.length === 0) {
  console.warn('WARNING: ADMIN_EMAILS environment variable is not set. No users will have admin access.')
}

export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return false
    }

    return ADMIN_EMAILS.includes(user.email || '')
  } catch (error) {
    // Check for Next.js DynamicServerError to avoid noisy logs during build
    // @ts-expect-error - digest property exists on Next.js errors
    if (error?.digest === 'DYNAMIC_SERVER_USAGE') {
      return false
    }
    
    console.error('Error checking admin status:', error)
    return false
  }
}

export async function requireAdmin() {
  const adminStatus = await isAdmin()
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required')
  }
  return true
}

export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('No authenticated user')
  }

  if (!ADMIN_EMAILS.includes(user.email || '')) {
    throw new Error('User is not an admin')
  }

  return user
}

/**
 * Check if admin password has been verified via cookie
 * This is an additional security layer on top of email-based admin access
 */
export async function isAdminPasswordVerified(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const passwordVerified = cookieStore.get('admin_password_verified')
    return passwordVerified?.value === 'true'
  } catch (error) {
    // Check for Next.js DynamicServerError to avoid noisy logs during build
    // @ts-expect-error - digest property exists on Next.js errors
    if (error?.digest === 'DYNAMIC_SERVER_USAGE') {
      return false
    }
    
    console.error('Error checking admin password verification:', error)
    return false
  }
}
