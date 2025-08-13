import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';
import { getMonthlyPeriodForAnchor } from '@/lib/usage';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(user.id);
    const plan = (subscription?.plan ?? 'FREE') as 'FREE' | 'PRO' | 'ENTERPRISE';

    // Determine plan dollar and usage limits
    const planDollarLimit = plan === 'ENTERPRISE' ? 200 : plan === 'PRO' ? 20 : 0;
    const limits = {
      searches: plan === 'FREE' ? 10 : -1,
      exports: plan === 'FREE' ? 10 : plan === 'PRO' ? 100 : -1,
    } as const;

    const { start, end } = getMonthlyPeriodForAnchor(user.created_at || new Date().toISOString());

    const { data: usageRows, error } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', start.toISOString())
      .limit(1);

    if (error) {
      throw error;
    }

    const usage = usageRows && usageRows.length > 0 ? usageRows[0] : {
      searches: 0,
      exports: 0,
      prompt_input_tokens: 0,
      prompt_output_tokens: 0,
      prompt_dollars: 0,
    };

    return NextResponse.json({
      plan,
      planDollarLimit,
      limits,
      usage,
      period: { start: start.toISOString(), end: end.toISOString() },
    });
  } catch (e) {
    console.error('Usage summary API error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


