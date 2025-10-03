import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, action, contact } = body as {
      id: string;
      action: 'enable' | 'disable' | 'rotate';
      contact?: {
        public_contact_name?: string | null;
        public_contact_email?: string | null;
        public_contact_phone?: string | null;
        public_company_name?: string | null;
      };
    };

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    // Verify ownership
    const { data: offering, error: fetchError } = await supabase
      .from('user_offerings')
      .select('id, is_public, public_slug')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !offering) {
      return NextResponse.json({ error: 'Offering not found or access denied' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...contact };

    if (action === 'enable') {
      updates.is_public = true;
      // Restore same URL if exists; otherwise generate once
      updates.public_revoked_at = null;
      if (!offering.public_slug) {
        updates.public_slug = randomUUID();
      }
    } else if (action === 'disable') {
      updates.is_public = false;
      updates.public_revoked_at = new Date().toISOString();
      // keep slug to restore same URL later
    }

    const { data: updated, error: updateError } = await supabase
      .from('user_offerings')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, is_public, public_slug, public_contact_name, public_contact_email, public_contact_phone, public_company_name')
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update sharing settings', details: updateError.message }, { status: 500 });
    }

    // Get base URL from environment or derive from request
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const envBase = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.NEXT_PUBLIC_APP_URL
        || (host ? `${protocol}://${host}` : 'http://localhost:3000');
    const baseUrl = envBase.startsWith('http://') || envBase.startsWith('https://')
      ? envBase
      : `https://${envBase}`;

    const shareUrl = updated.is_public && updated.public_slug
      ? `${baseUrl}/s/${updated.public_slug}`
      : null;

    return NextResponse.json({ message: 'OK', offering: updated, shareUrl }, { status: 200 });
  } catch (error) {
    console.error('Share API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


