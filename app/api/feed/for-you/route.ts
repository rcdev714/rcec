import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/feed/for-you - Get all public posts from public profiles
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get all posts from public profiles
    // RLS policy "Public posts from public profiles are viewable" will filter automatically
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, author_id, content, attachments, visibility, created_at, updated_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching for you feed:', error);
      return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        posts: [],
        limit,
        offset,
        has_more: false,
      }, { status: 200 });
    }

    // Get author profiles separately
    const authorIds = [...new Set(posts.map(p => p.author_id))];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url, position, company_name')
      .in('user_id', authorIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Get like counts and user's like status for each post
    const postIds = posts.map(p => p.id);
    
    const { data: likeCounts } = await supabase
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds);

    const { data: userLikes } = await supabase
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds)
      .eq('user_id', user.id);

    const likeCountMap = new Map<string, number>();
    likeCounts?.forEach(like => {
      likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) || 0) + 1);
    });

    const userLikedSet = new Set(userLikes?.map(like => like.post_id) || []);

    // Get comment counts
    const { data: commentCounts } = await supabase
      .from('comments')
      .select('post_id')
      .in('post_id', postIds);

    const commentCountMap = new Map<string, number>();
    commentCounts?.forEach(comment => {
      commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1);
    });

    // Transform to PostWithAuthor format with counts
    const postsWithAuthors = posts.map(post => ({
      ...post,
      author: profileMap.get(post.author_id) || {
        user_id: post.author_id,
        display_name: null,
        first_name: null,
        last_name: null,
        avatar_url: null,
        position: null,
        company_name: null,
      },
      like_count: likeCountMap.get(post.id) || 0,
      comment_count: commentCountMap.get(post.id) || 0,
      is_liked: userLikedSet.has(post.id),
    }));

    return NextResponse.json({
      posts: postsWithAuthors,
      limit,
      offset,
      has_more: postsWithAuthors.length === limit,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

