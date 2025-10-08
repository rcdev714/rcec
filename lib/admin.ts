import { createClient } from '@/lib/supabase/server'

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
