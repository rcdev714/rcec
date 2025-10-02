import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateCommentRequest } from '@/types/social';

// GET /api/comments - Get comments for a post
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

    // Fetch comments
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, post_id, author_id, content, created_at, updated_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({
        comments: [],
        limit,
        offset,
        total: 0,
      }, { status: 200 });
    }

    // Get author profiles separately
    const authorIds = [...new Set(comments.map(c => c.author_id))];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url')
      .in('user_id', authorIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Transform to CommentWithAuthor format
    const commentsWithAuthors = comments.map(comment => ({
      ...comment,
      author: profileMap.get(comment.author_id) || {
        id: comment.author_id,
        user_id: comment.author_id,
        display_name: null,
        first_name: null,
        last_name: null,
        avatar_url: null,
      },
    }));

    return NextResponse.json({
      comments: commentsWithAuthors,
      limit,
      offset,
      total: commentsWithAuthors.length,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/comments - Create a new comment
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateCommentRequest = await request.json();
    const { post_id, content } = body;

    if (!post_id || !content || !content.trim()) {
      return NextResponse.json({ error: 'post_id and content are required' }, { status: 400 });
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

    // Create comment
    const { data: newComment, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id,
        author_id: user.id,
        content: content.trim(),
      })
      .select(`
        id,
        post_id,
        author_id,
        content,
        created_at,
        updated_at
      `)
      .single();

    if (insertError) {
      console.error('Error creating comment:', insertError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Comment created successfully',
      comment: newComment,
    }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/comments - Delete a comment
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
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }

    // Verify ownership (RLS will also enforce this)
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', id)
      .eq('author_id', user.id)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found or access denied' }, { status: 404 });
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Comment deleted successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

