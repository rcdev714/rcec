import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPostgrestError } from '@/lib/type-guards';
import { UserProfilePayload } from '@/types/user-profile';

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

    if (profileError && (!isPostgrestError(profileError) || profileError.code !== 'PGRST116')) { // PGRST116 = row not found
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

    const body: UserProfilePayload = await request.json();
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

    if (existingProfile) {
      // Update existing profile
      const updatePayload: UserProfilePayload = {
        first_name,
        last_name,
        phone,
        company_name,
        company_ruc,
        position,
      };

      // Only update user_type if a valid value is provided; avoid NULLing a NOT NULL column
      if (typeof user_type === 'string' && (user_type === 'individual' || user_type === 'enterprise')) {
        updatePayload.user_type = user_type;
      }

      // Only update enterprise_role if explicitly provided
      if (typeof enterprise_role === 'string') {
        updatePayload.enterprise_role = enterprise_role;
      }

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update({ ...updatePayload, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating user profile:', updateError);
        if (isPostgrestError(updateError)) {
          return NextResponse.json(
            { error: `Failed to update profile: ${updateError.message}` },
            { status: 500 }
          );
        }
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Profile updated successfully', 
        profile: data 
      }, { status: 200 });
    } else {
      // Create new profile
      const insertPayload: UserProfilePayload & { user_id: string } = {
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

      const { data, error: insertError } = await supabase
        .from('user_profiles')
        .insert(insertPayload)
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating user profile:', insertError);
        if (isPostgrestError(insertError)) {
          return NextResponse.json(
            { error: `Failed to create profile: ${insertError.message}` },
            { status: 500 }
          );
        }
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Profile created successfully', 
        profile: data 
      }, { status: 200 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
