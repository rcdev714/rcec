import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureSearchAllowedAndIncrement } from '@/lib/usage';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await ensureSearchAllowedAndIncrement(user.id);
    if (!result.allowed) {
      return NextResponse.json({ error: 'Search limit reached' }, { status: 403 });
    }

    return NextResponse.json({ ok: true, remaining: result.remaining ?? null });
  } catch (error) {
    console.error('Usage search API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


