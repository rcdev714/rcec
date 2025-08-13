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

    const { data, error } = await supabase
      .from('user_usage_events')
      .select('event_date, kind, count')
      .eq('user_id', user.id)
      .gte('event_date', start.toISOString().slice(0,10))
      .order('event_date', { ascending: true });

    if (error) throw error;

    // Build zero-filled series
    const series: { date: string; searches: number; exports: number }[] = [];
    const byKey = new Map<string, { searches: number; exports: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0,10);
      series.push({ date: key, searches: 0, exports: 0 });
      byKey.set(key, { searches: 0, exports: 0 });
    }

    for (const row of (data || [])) {
      const bucket = byKey.get(row.event_date);
      if (!bucket) continue;
      if (row.kind === 'search') bucket.searches += row.count as number;
      if (row.kind === 'export') bucket.exports += row.count as number;
    }

    // Copy back aggregated values in date order
    const out = series.map(s => ({
      date: s.date,
      searches: byKey.get(s.date)!.searches,
      exports: byKey.get(s.date)!.exports,
    }));

    return NextResponse.json({ days, data: out });
  } catch (e) {
    console.error('Timeseries API error', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


