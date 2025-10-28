import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days') || '7';
    const days = Math.max(1, Math.min(30, parseInt(daysParam, 10) || 7));

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    // Fetch usage events (searches and exports)
    const { data, error } = await supabase
      .from('user_usage_events')
      .select('event_date, kind, count')
      .eq('user_id', user.id)
      .gte('event_date', start.toISOString().slice(0,10))
      .order('event_date', { ascending: true });

    if (error) throw error;

    // Fetch conversations for this user
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id);

    if (convError) throw convError;

    const conversationIds = conversations?.map(c => c.id) || [];

    // Fetch assistant messages (prompts) with timestamps and tokens
    const promptsByDate = new Map<string, number>();
    const tokensByDate = new Map<string, number>();
    if (conversationIds.length > 0) {
      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select('created_at, input_tokens, output_tokens, token_count')
        .in('conversation_id', conversationIds)
        .eq('role', 'assistant')
        .gte('created_at', start.toISOString());

      if (!msgError && messages) {
        // Group messages and tokens by date
        for (const msg of messages) {
          const dateKey = msg.created_at.slice(0, 10); // Extract YYYY-MM-DD
          promptsByDate.set(dateKey, (promptsByDate.get(dateKey) || 0) + 1);
          
          // Sum tokens (use new fields if available, fallback to legacy token_count)
          const totalTokens = (msg.input_tokens || 0) + (msg.output_tokens || 0) || msg.token_count || 0;
          tokensByDate.set(dateKey, (tokensByDate.get(dateKey) || 0) + totalTokens);
        }
      }
    }

    // Build zero-filled series
    const series: { date: string; searches: number; prompts: number; tokens: number }[] = [];
    const byKey = new Map<string, { searches: number; prompts: number; tokens: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0,10);
      series.push({ date: key, searches: 0, prompts: 0, tokens: 0 });
      byKey.set(key, { searches: 0, prompts: 0, tokens: 0 });
    }

    // Add usage events data (only searches now)
    for (const row of (data || [])) {
      const bucket = byKey.get(row.event_date);
      if (!bucket) continue;
      if (row.kind === 'search') bucket.searches += row.count as number;
    }

    // Add prompts data
    for (const [dateKey, count] of promptsByDate.entries()) {
      const bucket = byKey.get(dateKey);
      if (bucket) {
        bucket.prompts = count;
      }
    }

    // Add tokens data
    for (const [dateKey, count] of tokensByDate.entries()) {
      const bucket = byKey.get(dateKey);
      if (bucket) {
        bucket.tokens = count;
      }
    }

    // Copy back aggregated values in date order
    const out = series.map(s => ({
      date: s.date,
      searches: byKey.get(s.date)!.searches,
      prompts: byKey.get(s.date)!.prompts,
      tokens: byKey.get(s.date)!.tokens,
    }));

    return NextResponse.json({ days, data: out });
  } catch (e) {
    console.error('Timeseries API error', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


