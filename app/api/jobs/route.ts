import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: jobs, error } = await supabase
      .from('job_positions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    return NextResponse.json(jobs || []);
  } catch (error) {
    console.error('Error in jobs API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
