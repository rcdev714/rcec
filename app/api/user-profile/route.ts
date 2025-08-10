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
      subscription_plan: subscription?.plan || 'FREE',
      subscription_status: subscription?.status || 'inactive',
      created_at: profile?.created_at,
      updated_at: profile?.updated_at
    };

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
      enterprise_role 
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
      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          first_name,
          last_name,
          phone,
          company_name,
          company_ruc,
          position,
          user_type,
          enterprise_role,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      profileData = data;
      error = updateError;
    } else {
      // Create new profile
      const { data, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          first_name,
          last_name,
          phone,
          company_name,
          company_ruc,
          position,
          user_type,
          enterprise_role
        })
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
