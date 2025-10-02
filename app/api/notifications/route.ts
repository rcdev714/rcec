import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notifications - Get user's notifications
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    // Get actor profiles for notifications
    const actorIds = [...new Set(notifications?.map(n => n.actor_id).filter(Boolean) || [])];
    const { data: profiles } = actorIds.length > 0 ? await supabase
      .from('user_profiles')
      .select('user_id, display_name, first_name, last_name, avatar_url')
      .in('user_id', actorIds) : { data: [] };

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Get post info for post-related notifications
    const postIds = [...new Set(notifications?.map(n => n.post_id).filter(Boolean) || [])];
    const { data: posts } = postIds.length > 0 ? await supabase
      .from('posts')
      .select('id, content')
      .in('id', postIds) : { data: [] };

    const postMap = new Map(posts?.map(p => [p.id, p]) || []);

    // Enrich notifications with details
    const enrichedNotifications = notifications?.map(notification => ({
      ...notification,
      actor: notification.actor_id ? profileMap.get(notification.actor_id) || null : null,
      post: notification.post_id ? postMap.get(notification.post_id) || null : null,
    }));

    return NextResponse.json({
      notifications: enrichedNotifications || [],
      unread_count: unreadCount || 0,
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notification_ids, mark_all_read } = body as { 
      notification_ids?: string[]; 
      mark_all_read?: boolean;
    };

    if (mark_all_read) {
      // Mark all as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }

      return NextResponse.json({ message: 'All notifications marked as read' }, { status: 200 });
    }

    if (notification_ids && notification_ids.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notification_ids)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Notifications marked as read' }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

