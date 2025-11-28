import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get usage timeseries data for charts
 * 
 * Data sources:
 * - user_usage_events: Daily search/export counts
 * - conversation_messages: Message-based prompts and tokens (legacy)
 * - agent_runs: Trigger.dev background task prompts and tokens (primary for async mode)
 */
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

    // Fetch all data sources in parallel
    const [usageEventsResult, conversationsResult, agentRunsResult] = await Promise.all([
      // Source 1: Usage events (searches and exports)
      supabase
        .from('user_usage_events')
        .select('event_date, kind, count')
        .eq('user_id', user.id)
        .gte('event_date', start.toISOString().slice(0, 10))
        .order('event_date', { ascending: true }),
      
      // Source 2: Conversations for message lookup
      supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id),
      
      // Source 3: Agent runs (Trigger.dev background tasks)
      supabase
        .from('agent_runs')
        .select('created_at, input_tokens, output_tokens')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', start.toISOString())
    ]);

    const { data: usageEvents, error: usageError } = usageEventsResult;
    const { data: conversations, error: convError } = conversationsResult;
    const { data: agentRuns, error: agentRunsError } = agentRunsResult;

    if (usageError) {
      console.error('Error fetching usage events:', usageError);
    }
    if (convError) {
      console.error('Error fetching conversations:', convError);
    }
    if (agentRunsError) {
      console.error('Error fetching agent runs:', agentRunsError);
    }

    const conversationIds = conversations?.map(c => c.id) || [];

    // Track data by date from all sources
    const promptsByDate = new Map<string, number>();
    const tokensByDate = new Map<string, number>();

    // Process agent_runs FIRST (primary source for async mode)
    if (agentRuns && agentRuns.length > 0) {
      for (const run of agentRuns) {
        const dateKey = run.created_at.slice(0, 10); // Extract YYYY-MM-DD
        const inputTokens = run.input_tokens || 0;
        const outputTokens = run.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;

        if (totalTokens > 0) {
          promptsByDate.set(dateKey, (promptsByDate.get(dateKey) || 0) + 1);
          tokensByDate.set(dateKey, (tokensByDate.get(dateKey) || 0) + totalTokens);
        }
      }
    }

    // Process conversation_messages (fallback/legacy - avoid double counting)
    if (conversationIds.length > 0) {
      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select('created_at, input_tokens, output_tokens, token_count, metadata')
        .in('conversation_id', conversationIds)
        .eq('role', 'assistant')
        .gte('created_at', start.toISOString());

      if (!msgError && messages) {
        for (const msg of messages) {
          // Skip if this message is from an agent_run (avoid double counting)
          const metadata = msg.metadata as { runId?: string } | null;
          if (metadata?.runId) {
            // Already counted via agent_runs
            continue;
          }

          const dateKey = msg.created_at.slice(0, 10);
          const totalTokens = (msg.input_tokens || 0) + (msg.output_tokens || 0) || msg.token_count || 0;

          if (totalTokens > 0) {
            promptsByDate.set(dateKey, (promptsByDate.get(dateKey) || 0) + 1);
            tokensByDate.set(dateKey, (tokensByDate.get(dateKey) || 0) + totalTokens);
          }
        }
      }
    }

    // Build zero-filled series
    const series: { date: string; searches: number; prompts: number; tokens: number }[] = [];
    const byKey = new Map<string, { searches: number; prompts: number; tokens: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, searches: 0, prompts: 0, tokens: 0 });
      byKey.set(key, { searches: 0, prompts: 0, tokens: 0 });
    }

    // Add usage events data (searches)
    for (const row of (usageEvents || [])) {
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

    // Build final output in date order
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


