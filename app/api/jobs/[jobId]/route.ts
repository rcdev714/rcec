import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from('job_positions')
      .select('*')
      .eq('id', jobId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching job:', error);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error in job API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
