import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/subscription';
import { getMonthlyPeriodForAnchor, resolveUsageAnchorIso, dollarsFromTokens } from '@/lib/usage';
import { isAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(user.id);
    const plan = (subscription?.plan ?? 'FREE') as 'FREE' | 'PRO' | 'ENTERPRISE';

    // Admins are unlimited for agent usage and searches/exports
    const admin = await isAdmin();
    if (admin) {
      const now = new Date();
      const periodStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ));
      const periodEnd = new Date(periodStart);
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

      return NextResponse.json({
        plan: 'ADMIN',
        limits: {
          searches: -1,
          exports: -1,
          prompt_dollars: -1,
          prompts: -1,
        },
        usage: {
          searches: 0,
          exports: 0,
          prompts: 0,
          input_tokens: 0,
          output_tokens: 0,
          cost_dollars: 0,
        },
        period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
      });
    }

    // Determine plan limits (dollar-based for prompts)
    const limits = {
      searches: plan === 'FREE' ? 10 : -1,
      exports: plan === 'FREE' ? 10 : plan === 'PRO' ? 50 : -1,
      prompt_dollars: plan === 'FREE' ? 5.00 : plan === 'PRO' ? 20.00 : 200.00, // Dollar-based limits
      prompts: -1, // Deprecated - keeping for backward compatibility
    } as const;

    // Resolve usage anchor based on plan and subscription
    const anchorIso = resolveUsageAnchorIso(plan, subscription, user.created_at || new Date().toISOString());
    const { start, end } = getMonthlyPeriodForAnchor(anchorIso);

    // Fetch user_usage record (primary source of truth)
    const { data: usageRows, error } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', start.toISOString())
      .limit(1);

    if (error) {
      throw error;
    }

    let usage = usageRows && usageRows.length > 0 ? usageRows[0] : {
      searches: 0,
      exports: 0,
      prompts_count: 0,
      prompt_input_tokens: 0,
      prompt_output_tokens: 0,
      prompt_dollars: 0,
    };

    // AGGREGATE FROM AGENT RUNS (fallback/reconciliation)
    // Trigger.dev runs track tokens in agent_runs table.
    // trackLLMUsageBackground should sync to user_usage, but as a safety net,
    // we reconcile by checking if agent_runs has more data than user_usage.
    
    const { data: agentRuns } = await supabase
      .from('agent_runs')
      .select('input_tokens, output_tokens, model_name, created_at')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .eq('status', 'completed');

    if (agentRuns && agentRuns.length > 0) {
      // Calculate totals from agent_runs with proper cost calculation
      const agentUsage = agentRuns.reduce((acc, run) => {
        const inputTokens = run.input_tokens || 0;
        const outputTokens = run.output_tokens || 0;
        const modelName = run.model_name || 'gemini-2.5-flash';
        
        acc.input_tokens += inputTokens;
        acc.output_tokens += outputTokens;
        acc.cost_dollars += dollarsFromTokens(modelName, inputTokens, outputTokens);
        acc.prompts_count += 1;
        
        return acc;
      }, { input_tokens: 0, output_tokens: 0, cost_dollars: 0, prompts_count: 0 });

      // Use the MAXIMUM of user_usage and agent_runs to ensure we don't under-report
      // This handles cases where sync might be delayed or partially failed
      if (agentUsage.input_tokens > (usage.prompt_input_tokens || 0)) {
        console.log('[usage/summary] Agent runs have more data than user_usage, using agent_runs:', {
          agentUsage,
          userUsage: {
            input: usage.prompt_input_tokens,
            output: usage.prompt_output_tokens,
            dollars: usage.prompt_dollars,
          }
        });
        
        usage = {
          ...usage,
          prompt_input_tokens: agentUsage.input_tokens,
          prompt_output_tokens: agentUsage.output_tokens,
          prompt_dollars: agentUsage.cost_dollars,
          prompts_count: Math.max(usage.prompts_count || 0, agentUsage.prompts_count),
        };
      }
    }

    return NextResponse.json({
      plan,
      limits,
      usage: {
        searches: usage.searches,
        exports: usage.exports,
        prompts: usage.prompts_count ?? 0, // Number of prompt requests
        input_tokens: usage.prompt_input_tokens, // Actual tokens for analytics
        output_tokens: usage.prompt_output_tokens,
        cost_dollars: usage.prompt_dollars,
      },
      period: { start: start.toISOString(), end: end.toISOString() },
    });
  } catch (e) {
    console.error('Usage summary API error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
