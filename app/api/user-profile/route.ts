import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = row not found
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Get subscription data
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const userSettings = {
      email: user.email,
      user_id: user.id,
      user_type: profile?.user_type,
      enterprise_role: profile?.enterprise_role,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      phone: profile?.phone,
      company_name: profile?.company_name,
      company_ruc: profile?.company_ruc,
      position: profile?.position,
      // Social fields
      display_name: profile?.display_name,
      bio: profile?.bio,
      location: profile?.location,
      website_url: profile?.website_url,
      avatar_url: profile?.avatar_url,
      is_public_profile: profile?.is_public_profile,
      subscription_plan: subscription?.plan || 'FREE',
      subscription_status: subscription?.status || 'inactive',
      created_at: profile?.created_at,
      updated_at: profile?.updated_at
    };

    console.log('Returning user settings with is_public_profile:', profile?.is_public_profile);

    return NextResponse.json(userSettings, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      first_name, 
      last_name, 
      phone, 
      company_name, 
      company_ruc, 
      position,
      user_type,
      enterprise_role,
      // Social fields
      display_name,
      bio,
      location,
      website_url,
      avatar_url,
      is_public_profile
    } = body;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let profileData;
    let error;

    if (existingProfile) {
      // Update existing profile
      const updatePayload: Record<string, unknown> = {
        first_name,
        last_name,
        phone,
        company_name,
        company_ruc,
        position,
        updated_at: new Date().toISOString()
      };

      // Only update user_type if a valid value is provided; avoid NULLing a NOT NULL column
      if (typeof user_type === 'string' && (user_type === 'individual' || user_type === 'enterprise')) {
        updatePayload.user_type = user_type;
      }

      // Only update enterprise_role if explicitly provided
      if (typeof enterprise_role === 'string') {
        updatePayload.enterprise_role = enterprise_role;
      }

      // Social fields - update if provided
      if (display_name !== undefined) updatePayload.display_name = display_name;
      if (bio !== undefined) updatePayload.bio = bio;
      if (location !== undefined) updatePayload.location = location;
      if (website_url !== undefined) updatePayload.website_url = website_url;
      if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;
      if (typeof is_public_profile === 'boolean') updatePayload.is_public_profile = is_public_profile;

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('user_id', user.id)
        .select()
        .single();
      
      profileData = data;
      error = updateError;
    } else {
      // Create new profile
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        first_name,
        last_name,
        phone,
        company_name,
        company_ruc,
        position,
        // Ensure NOT NULL + CHECK constraint is satisfied on first insert
        user_type: (typeof user_type === 'string' && (user_type === 'individual' || user_type === 'enterprise'))
          ? user_type
          : 'individual'
      };

      if (typeof enterprise_role === 'string') {
        insertPayload.enterprise_role = enterprise_role;
      }

      // Social fields for new profiles
      if (display_name !== undefined) insertPayload.display_name = display_name;
      if (bio !== undefined) insertPayload.bio = bio;
      if (location !== undefined) insertPayload.location = location;
      if (website_url !== undefined) insertPayload.website_url = website_url;
      if (avatar_url !== undefined) insertPayload.avatar_url = avatar_url;
      if (typeof is_public_profile === 'boolean') insertPayload.is_public_profile = is_public_profile;

      const { data, error: insertError } = await supabase
        .from('user_profiles')
        .insert(insertPayload)
        .select()
        .single();
      
      profileData = data;
      error = insertError;
    }

    if (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully', 
      profile: profileData 
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
