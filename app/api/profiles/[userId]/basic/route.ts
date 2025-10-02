import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET /api/profiles/[userId]/basic - Get basic profile info
// Returns basic info that's safe to show publicly
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    // First check if user exists in auth.users
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
    
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Try to get profile (will work if public or own profile due to RLS)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url, position, company_name, is_public_profile')
      .eq('user_id', userId)
      .single();

    // If RLS blocks it, return minimal info from auth
    if (!profile) {
      // Profile is private and blocked by RLS
      // Return minimal safe data
      return NextResponse.json({
        user_id: userId,
        display_name: null,
        first_name: authUser.user_metadata?.full_name?.split(' ')[0] || null,
        last_name: authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
        avatar_url: null,
        position: null,
        company_name: null,
        is_public_profile: false, // Must be private if RLS blocked it
      }, { status: 200 });
    }

    // Return profile data
    return NextResponse.json({
      user_id: profile.user_id,
      display_name: profile.display_name,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      position: profile.position,
      company_name: profile.company_name,
      is_public_profile: profile.is_public_profile ?? true,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

