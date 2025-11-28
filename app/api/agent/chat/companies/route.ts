import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchCompaniesTool } from '@/lib/tools/company-tools';
import { ensureSearchAllowedAndIncrement } from '@/lib/usage';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { query, limit = 10, page = 1 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Check rate limiting for searches
    const rateLimitResult = await ensureSearchAllowedAndIncrement(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Search limit reached. Please upgrade your plan or try again later.' },
        { status: 429 }
      );
    }

    // Use the search tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await searchCompaniesTool.func({
      query,
      limit: Math.min(Math.max(limit, 1), 50),
      page: Math.max(page, 1),
    }) as any;

    // Log the search for analytics
    if (result.success && result.result) {
      try {
        await supabase
          .from('user_search_history')
          .insert({
            user_id: user.id,
            search_query: query,
            search_filters: result.appliedFilters || {},
            results_count: result.result.totalCount,
          });
      } catch (logError) {
        console.warn('Failed to log search history:', logError);
        // Don't fail the request if logging fails
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in companies search API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
