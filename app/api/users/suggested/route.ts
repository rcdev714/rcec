import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/users/suggested - Get suggested users to follow
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get users the current user is already following
    const { data: following } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', user.id);

    const followingIds = following?.map(f => f.followed_id) || [];

    // Get all public profiles excluding current user and already-followed users
    let query = supabase
      .from('user_profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url, position, company_name, is_public_profile')
      .eq('is_public_profile', true)
      .neq('user_id', user.id)
      .limit(limit);

    if (followingIds.length > 0) {
      query = query.not('user_id', 'in', `(${followingIds.join(',')})`);
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('Error fetching suggested users:', error);
      return NextResponse.json({ error: 'Failed to fetch suggested users' }, { status: 500 });
    }

    // Get follower counts for each user
    const userIds = profiles?.map(p => p.user_id) || [];
    const { data: followerCounts } = await supabase
      .from('follows')
      .select('followed_id')
      .in('followed_id', userIds);

    const followerCountMap = new Map<string, number>();
    followerCounts?.forEach(follow => {
      followerCountMap.set(
        follow.followed_id,
        (followerCountMap.get(follow.followed_id) || 0) + 1
      );
    });

    // Enrich profiles with follower counts
    const enrichedProfiles = profiles?.map(profile => ({
      ...profile,
      follower_count: followerCountMap.get(profile.user_id) || 0,
    })) || [];

    // Sort by follower count (most followers first)
    enrichedProfiles.sort((a, b) => b.follower_count - a.follower_count);

    return NextResponse.json({
      users: enrichedProfiles,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

