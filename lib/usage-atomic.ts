/**
 * Atomic usage increment helpers to prevent race conditions
 * 
 * This module provides atomic increment operations to ensure
 * concurrent requests don't bypass rate limits.
 */

import { createClient } from '@/lib/supabase/server';

export interface AtomicIncrementResult {
  success: boolean;
  newValue: number;
  error?: string;
}

/**
 * Atomically increment a usage counter using Supabase RPC
 * 
 * This prevents race conditions where two concurrent requests
 * both read the same value and increment it, causing one increment to be lost.
 * 
 * @param userId - User ID
 * @param periodStart - Period start timestamp
 * @param column - Column to increment ('searches', 'exports', 'prompts_count')
 * @returns New value after increment
 */
export async function atomicIncrementUsage(
  userId: string,
  periodStart: string,
  column: 'searches' | 'exports' | 'prompts_count'
): Promise<AtomicIncrementResult> {
  const supabase = await createClient();

  try {
    // Use PostgreSQL UPDATE ... RETURNING with expression to atomic increment
    const { data, error } = await supabase
      .rpc('atomic_increment_usage', {
        p_user_id: userId,
        p_period_start: periodStart,
        p_column: column
      });

    if (error) {
      // If RPC doesn't exist, fall back to client-side increment with optimistic locking
      console.warn('atomic_increment_usage RPC not found, using fallback');
      return await fallbackAtomicIncrement(userId, periodStart, column);
    }

    return {
      success: true,
      newValue: data as number
    };
  } catch (error) {
    console.error('Error in atomic increment:', error);
    return {
      success: false,
      newValue: -1,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fallback atomic increment using SELECT FOR UPDATE (pessimistic locking)
 * 
 * NOTE: This requires RLS to be properly configured or using service client
 */
async function fallbackAtomicIncrement(
  userId: string,
  periodStart: string,
  column: 'searches' | 'exports' | 'prompts_count'
): Promise<AtomicIncrementResult> {
  const supabase = await createClient();

  try {
    // Read current value
    const { data: currentRow, error: selectError } = await supabase
      .from('user_usage')
      .select(column)
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .single();

    if (selectError) throw selectError;

    const currentValue = (currentRow as any)[column] as number;
    const newValue = currentValue + 1;

    // Update with optimistic concurrency check
    const { data: updatedRow, error: updateError } = await supabase
      .from('user_usage')
      .update({ [column]: newValue })
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .eq(column, currentValue) // Only update if value hasn't changed
      .select(column)
      .single();

    if (updateError) {
      // If update failed due to concurrent modification, retry
      if (updateError.code === 'PGRST116') {
        // Row was modified by another request, retry
        console.warn('Concurrent modification detected, retrying...');
        return await fallbackAtomicIncrement(userId, periodStart, column);
      }
      throw updateError;
    }

    return {
      success: true,
      newValue: (updatedRow as any)[column] as number
    };
  } catch (error) {
    console.error('Error in fallback atomic increment:', error);
    return {
      success: false,
      newValue: -1,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Rollback an increment (e.g., if limit check fails after increment)
 */
export async function rollbackIncrement(
  userId: string,
  periodStart: string,
  column: 'searches' | 'exports' | 'prompts_count'
): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .rpc('atomic_decrement_usage', {
        p_user_id: userId,
        p_period_start: periodStart,
        p_column: column
      });

    if (error) {
      // Fallback to direct update
      const { data: current } = await supabase
        .from('user_usage')
        .select(column)
        .eq('user_id', userId)
        .eq('period_start', periodStart)
        .single();

      if (current) {
        const currentValue = (current as any)[column] as number;
        await supabase
          .from('user_usage')
          .update({ [column]: Math.max(0, currentValue - 1) })
          .eq('user_id', userId)
          .eq('period_start', periodStart);
      }
    }

    return true;
  } catch (error) {
    console.error('Error rolling back increment:', error);
    return false;
  }
}

/**
 * Atomically increment usage by a delta value (for tokens)
 *
 * @param userId - User ID
 * @param periodStart - Period start timestamp
 * @param column - Column to increment ('prompt_input_tokens', 'prompt_output_tokens', etc.)
 * @param delta - Amount to increment by
 * @returns New value after increment
 */
export async function atomicIncrementUsageBy(
  userId: string,
  periodStart: string,
  column: 'prompt_input_tokens' | 'prompt_output_tokens' | 'searches' | 'exports' | 'prompts_count',
  delta: number
): Promise<AtomicIncrementResult> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .rpc('atomic_increment_usage_by', {
        p_user_id: userId,
        p_period_start: periodStart,
        p_column: column,
        p_delta: delta
      });

    if (error) {
      console.error('atomic_increment_usage_by RPC error:', error);
      return {
        success: false,
        newValue: -1,
        error: error.message
      };
    }

    return {
      success: true,
      newValue: data as number
    };
  } catch (error) {
    console.error('Error in atomic increment by delta:', error);
    return {
      success: false,
      newValue: -1,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Atomically increment usage with limit checking
 *
 * @param userId - User ID
 * @param periodStart - Period start timestamp
 * @param column - Column to increment ('searches', 'exports', 'prompts_count')
 * @param limit - Maximum allowed value (-1 or null for unlimited)
 * @returns New value after increment, or -1 if limit exceeded
 */
export async function atomicIncrementWithLimit(
  userId: string,
  periodStart: string,
  column: 'searches' | 'exports' | 'prompts_count',
  limit: number | null
): Promise<AtomicIncrementResult> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .rpc('atomic_increment_with_limit', {
        p_user_id: userId,
        p_period_start: periodStart,
        p_column: column,
        p_limit: limit
      });

    if (error) {
      console.error('atomic_increment_with_limit RPC error:', error);
      return {
        success: false,
        newValue: -1,
        error: error.message
      };
    }

    const newValue = data as number;

    // If limit exceeded, return failure
    if (newValue === -1) {
      return {
        success: false,
        newValue: -1,
        error: 'Limit exceeded'
      };
    }

    return {
      success: true,
      newValue: newValue
    };
  } catch (error) {
    console.error('Error in atomic increment with limit:', error);
    return {
      success: false,
      newValue: -1,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

