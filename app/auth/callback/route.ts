import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent(error.message)}`)
    }
    
    // Check if user profile exists, create it if not
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      try {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (!existingProfile) {
          // Create profile for OAuth user
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              user_type: 'individual', // default type
              first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
              last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            })
          
          if (insertError) {
            // Log the error but don't fail the auth flow
            // A database trigger might have already created the profile
            console.error('Error creating user profile in auth callback:', insertError)
            // Check if profile was created by trigger
            const { data: retryProfile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('user_id', user.id)
              .single()
            
            if (!retryProfile) {
              console.error('Profile creation failed and no profile found after retry')
            }
          }
        }
      } catch (profileError) {
        // Log error but continue auth flow
        console.error('Error in profile creation flow:', profileError)
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/dashboard`)
}
