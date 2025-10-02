import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/follow-requests - Get pending follow requests
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'received' or 'sent'

    const field = type === 'received' ? 'target_id' : 'requester_id';

    const { data: requests, error } = await supabase
      .from('follow_requests')
      .select('*')
      .eq(field, user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching follow requests:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    // Get requester profiles
    const requesterIds = requests?.map(r => r.requester_id) || [];
    const { data: profiles } = requesterIds.length > 0 ? await supabase
      .from('user_profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url, position, company_name')
      .in('user_id', requesterIds) : { data: [] };

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const requestsWithProfiles = requests?.map(request => ({
      ...request,
      requester: profileMap.get(request.requester_id) || null,
    })) || [];

    return NextResponse.json({
      requests: requestsWithProfiles,
      type,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/follow-requests - Create, accept, or decline follow request
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { target_id, action, request_id } = body as {
      target_id?: string;
      action: 'request' | 'accept' | 'decline';
      request_id?: string;
    };

    if (action === 'request') {
      // Create new follow request
      if (!target_id) {
        return NextResponse.json({ error: 'target_id required' }, { status: 400 });
      }

      // Check if target profile is private
      const { data: targetProfile } = await supabase
        .from('user_profiles')
        .select('is_public_profile')
        .eq('user_id', target_id)
        .single();

      if (!targetProfile || targetProfile.is_public_profile) {
        return NextResponse.json({ 
          error: 'Profile is public, use direct follow instead' 
        }, { status: 400 });
      }

      // Create request
      const { data: newRequest, error } = await supabase
        .from('follow_requests')
        .insert({
          requester_id: user.id,
          target_id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating follow request:', error);
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Follow request sent',
        request: newRequest,
      }, { status: 201 });
    }

    if (action === 'accept' || action === 'decline') {
      // Accept or decline a request
      if (!request_id) {
        return NextResponse.json({ error: 'request_id required' }, { status: 400 });
      }

      const newStatus = action === 'accept' ? 'accepted' : 'declined';

      const { data: updatedRequest, error } = await supabase
        .from('follow_requests')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request_id)
        .eq('target_id', user.id) // Only target can accept/decline
        .select()
        .single();

      if (error) {
        console.error('Error updating request:', error);
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
      }

      // If accepted, create a follow relationship
      if (action === 'accept') {
        await supabase
          .from('follows')
          .insert({
            follower_id: updatedRequest.requester_id,
            followed_id: updatedRequest.target_id,
          });
      }

      return NextResponse.json({
        message: `Request ${action}ed`,
        request: updatedRequest,
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

