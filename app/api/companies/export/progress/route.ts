import { NextRequest, NextResponse } from 'next/server';
import { getProgress } from '@/lib/progress-tracker';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const progress = getProgress(sessionId);
    
    if (!progress) {
      return NextResponse.json({ fetched: 0, total: 0 });
    }

    return NextResponse.json({
      fetched: progress.fetched,
      total: progress.total,
      percentage: progress.total > 0 ? Math.round((progress.fetched / progress.total) * 100) : 0
    });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 });
  }
}