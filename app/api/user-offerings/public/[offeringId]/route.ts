import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ offeringId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { offeringId } = await params;
    const supabase = await createClient();

    // Fetch the offering - no auth required for public offerings
    const { data: offering, error } = await supabase
      .from('user_offerings')
      .select('*')
      .eq('id', offeringId)
      .single();

    if (error || !offering) {
      return NextResponse.json({ error: 'Offering not found' }, { status: 404 });
    }

    return NextResponse.json(offering, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

