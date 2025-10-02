import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreatePostRequest, UpdatePostRequest } from '@/types/social';

// GET /api/posts - Get posts (optionally filtered by author)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('author');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('posts')
      .select('id, author_id, content, attachments, visibility, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (authorId) {
      query = query.eq('author_id', authorId);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        posts: [],
        limit,
        offset,
        total: 0,
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
      total: postsWithAuthors.length,
    }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/posts - Create a new post
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreatePostRequest = await request.json();
    const { content, attachments = [], visibility = 'public' } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (!['public', 'followers', 'private'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 });
    }

    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        content: content.trim(),
        attachments,
        visibility,
      })
      .select(`
        id,
        author_id,
        content,
        attachments,
        visibility,
        created_at,
        updated_at
      `)
      .single();

    if (insertError) {
      console.error('Error creating post:', insertError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Post created successfully', 
      post: newPost 
    }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/posts - Update an existing post
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdatePostRequest = await request.json();
    const { id, content, attachments, visibility } = body;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', id)
      .eq('author_id', user.id)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found or access denied' }, { status: 404 });
    }

    // Build updates object
    const updates: Record<string, unknown> = { 
      updated_at: new Date().toISOString() 
    };
    
    if (content !== undefined) updates.content = content.trim();
    if (attachments !== undefined) updates.attachments = attachments;
    if (visibility !== undefined) {
      if (!['public', 'followers', 'private'].includes(visibility)) {
        return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 });
      }
      updates.visibility = visibility;
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .eq('author_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating post:', updateError);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Post updated successfully',
      post: updatedPost
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/posts - Delete a post
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .eq('author_id', user.id)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found or access denied' }, { status: 404 });
    }

    // Delete post (cascade will handle comments and likes)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Post deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

