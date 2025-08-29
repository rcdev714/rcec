import { createClient } from '@/lib/supabase/server'

/**
 * Admin access control utilities
 */

// Admin email addresses (can be moved to environment variables)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [
  process.env.ADMIN_EMAIL || 'admin@acquirab2b.com'
]

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
