import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/likes - Like or unlike a post (toggle)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { post_id, action } = body as { post_id: string; action?: 'like' | 'unlike' };

    if (!post_id) {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    // Verify the post exists and user has access (RLS will handle this)
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', post_id)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found or access denied' }, { status: 404 });
    }

    // Check current like status
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single();

    const isCurrentlyLiked = !!existingLike;

    // Determine action
    let shouldLike: boolean;
    if (action) {
      shouldLike = action === 'like';
    } else {
      // Toggle if no action specified
      shouldLike = !isCurrentlyLiked;
    }

    if (shouldLike && !isCurrentlyLiked) {
      // Like
      const { error: insertError } = await supabase
        .from('post_likes')
        .insert({
          post_id,
          user_id: user.id,
        });

      if (insertError) {
        console.error('Error creating like:', insertError);
        return NextResponse.json({ error: 'Failed to like post' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Post liked successfully',
        is_liked: true,
      }, { status: 201 });

    } else if (!shouldLike && isCurrentlyLiked) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting like:', deleteError);
        return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Post unliked successfully',
        is_liked: false,
      }, { status: 200 });

    } else {
      // No change needed
      return NextResponse.json({
        message: 'No change needed',
        is_liked: isCurrentlyLiked,
      }, { status: 200 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/likes - Get users who liked a post
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!postId) {
      return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
    }

    // Get likes with user profile information
    const { data: likes, error } = await supabase
      .from('post_likes')
      .select(`
        user_id,
        created_at,
        user_profiles!post_likes_user_id_fkey (
          user_id,
          display_name,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching likes:', error);
      return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 });
    }

    // Get total count
    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    return NextResponse.json({
      likes: likes || [],
      total: count || 0,
      limit,
      offset,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

