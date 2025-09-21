import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { offering_id } = await request.json();
    if (!offering_id) return NextResponse.json({ error: 'offering_id required' }, { status: 400 });

    const xfwd = request.headers.get('x-forwarded-for') || '';
    const ip = xfwd.split(',')[0]?.trim() || null;
    const ua = request.headers.get('user-agent') || null;
    const ref = request.headers.get('referer') || null;

    const { error } = await supabase.from('offering_public_views').insert({
      offering_id,
      viewer_ip: ip,
      user_agent: ua,
      referrer: ref,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


