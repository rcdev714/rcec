import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/follows - Get followers or following list for a user
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || user.id;
    const type = searchParams.get('type') || 'followers'; // 'followers' or 'following'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!['followers', 'following'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    const isFollowers = type === 'followers';
    const idField = isFollowers ? 'followed_id' : 'follower_id';
    const profileIdField = isFollowers ? 'follower_id' : 'followed_id';

    // Get follows with profile information
    const { data: follows, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        followed_id,
        created_at,
        user_profiles!follows_${profileIdField}_fkey (
          user_id,
          display_name,
          first_name,
          last_name,
          avatar_url,
          bio,
          position,
          company_name,
          is_public_profile
        )
      `)
      .eq(idField, userId)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching follows:', error);
      return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 });
    }

    // Get total counts
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followed_id', userId);

    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    // Check if current user follows this user (if viewing someone else's profile)
    let isFollowing = false;
    if (userId !== user.id) {
      const { data: followCheck } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('followed_id', userId)
        .single();
      isFollowing = !!followCheck;
    }

    // Transform data
    const followsList = follows?.map(follow => ({
      ...follow,
      profile: Array.isArray(follow.user_profiles) 
        ? follow.user_profiles[0] 
        : follow.user_profiles,
      user_profiles: undefined,
    })).filter(f => f.profile?.is_public_profile !== false) || [];

    return NextResponse.json({
      follows: followsList,
      stats: {
        follower_count: followerCount || 0,
        following_count: followingCount || 0,
        is_following: isFollowing,
      },
      type,
      limit,
      offset,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/follows - Follow or unfollow a user (toggle)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { followed_id, action } = body as { followed_id: string; action?: 'follow' | 'unfollow' };

    if (!followed_id) {
      return NextResponse.json({ error: 'followed_id is required' }, { status: 400 });
    }

    if (followed_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check current follow status
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('followed_id', followed_id)
      .single();

    const isCurrentlyFollowing = !!existingFollow;

    // Determine action
    let shouldFollow: boolean;
    if (action) {
      shouldFollow = action === 'follow';
    } else {
      // Toggle if no action specified
      shouldFollow = !isCurrentlyFollowing;
    }

    if (shouldFollow && !isCurrentlyFollowing) {
      // Follow
      const { error: insertError } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          followed_id,
        });

      if (insertError) {
        console.error('Error creating follow:', insertError);
        return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Successfully followed user',
        is_following: true,
      }, { status: 201 });

    } else if (!shouldFollow && isCurrentlyFollowing) {
      // Unfollow
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('followed_id', followed_id);

      if (deleteError) {
        console.error('Error deleting follow:', deleteError);
        return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Successfully unfollowed user',
        is_following: false,
      }, { status: 200 });

    } else {
      // No change needed
      return NextResponse.json({
        message: 'No change needed',
        is_following: isCurrentlyFollowing,
      }, { status: 200 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

