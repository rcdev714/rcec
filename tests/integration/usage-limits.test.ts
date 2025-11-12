import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  ensureSearchAllowedAndIncrement, 
  ensureExportAllowedAndIncrement,
  ensurePromptAllowedAndTrack 
} from '@/lib/usage'

// Mock the usage-atomic module
vi.mock('@/lib/usage-atomic', () => ({
  atomicIncrementWithLimit: vi.fn(),
  atomicIncrementUsage: vi.fn(),
  atomicIncrementUsageBy: vi.fn(() => Promise.resolve({ success: true, newValue: 0 })),
  atomicIncrementDollarsWithLimit: vi.fn(),
  rollbackIncrement: vi.fn(() => Promise.resolve(true))
}))

import { atomicIncrementWithLimit, atomicIncrementDollarsWithLimit } from '@/lib/usage-atomic'

// Mock Supabase to match actual usage.ts call patterns
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    // upsert pattern: upsert(data, options) -> { error }
    upsert: vi.fn(() => ({ error: null as any })),

    // select pattern: select(columns) -> order(col) -> { data, error } OR select(columns) -> eq(col, val) -> eq(col, val) -> single() -> { data, error }
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        data: [
          { id: 'FREE', name: 'Free', price: 0, price_id: 'price_free', features: [], is_popular: false },
          { id: 'PRO', name: 'Pro', price: 20, price_id: 'price_pro', features: [], is_popular: true },
          { id: 'ENTERPRISE', name: 'Enterprise', price: 200, price_id: 'price_enterprise', features: [], is_popular: false }
        ] as any,
        error: null as any
      })),
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null as any, error: null as any }))
        }))
      }))
    })),

    // update pattern: update(data) -> eq(col, val) -> eq(col, val) -> select() -> single() -> { data, error }
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: {} as any, error: null as any }))
          }))
        }))
      }))
    })),
  })),
  rpc: vi.fn(() => ({ error: null as any }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

// Mock subscription
vi.mock('@/lib/subscription', () => ({
  getUserSubscription: vi.fn()
}))

import { getUserSubscription } from '@/lib/subscription'

describe('Usage Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user-123', 
          created_at: '2024-01-01T00:00:00.000Z' 
        } 
      },
      error: null as any
    })
  })

  describe('ensureSearchAllowedAndIncrement', () => {
    it('should allow search for FREE user within limits', async () => {
      vi.mocked(getUserSubscription).mockResolvedValue({
        id: '123',
        user_id: 'user-123',
        subscription_id: null,
        customer_id: null,
        plan: 'FREE',
        status: 'active',
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      })

      // Mock usage row with 5 searches (under limit of 10)
      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn(() => ({ error: null as any })),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              { id: 'FREE', name: 'Free', price: 0, price_id: 'price_free', features: [], is_popular: false },
              { id: 'PRO', name: 'Pro', price: 20, price_id: 'price_pro', features: [], is_popular: true },
              { id: 'ENTERPRISE', name: 'Enterprise', price: 200, price_id: 'price_enterprise', features: [], is_popular: false }
            ] as any,
            error: null as any
          })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { searches: 5, prompts_count: 0, user_id: 'user-123' },
                error: null as any
              }))
            }))
          }))
        })),
      })

      // Mock atomic increment to return new value 6
      vi.mocked(atomicIncrementWithLimit).mockResolvedValue({
        success: true,
        newValue: 6
      })

      const result = await ensureSearchAllowedAndIncrement('user-123')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 10 - 6 = 4
    })

    it('should deny search for FREE user at limit', async () => {
      vi.mocked(getUserSubscription).mockResolvedValue({
        id: '123',
        user_id: 'user-123',
        subscription_id: null,
        customer_id: null,
        plan: 'FREE',
        status: 'active',
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      })

      // Mock usage row with 10 searches (at limit)
      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn(() => ({ error: null as any })),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              { id: 'FREE', name: 'Free', price: 0, price_id: 'price_free', features: [], is_popular: false },
              { id: 'PRO', name: 'Pro', price: 20, price_id: 'price_pro', features: [], is_popular: true },
              { id: 'ENTERPRISE', name: 'Enterprise', price: 200, price_id: 'price_enterprise', features: [], is_popular: false }
            ] as any,
            error: null as any
          })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { searches: 10, prompts_count: 0, user_id: 'user-123' },
                error: null as any
              }))
            }))
          }))
        })),
      })

      // Mock atomic increment to return -1 (limit exceeded)
      vi.mocked(atomicIncrementWithLimit).mockResolvedValue({
        success: false,
        newValue: 10, // Current value stays at 10
        error: 'Limit exceeded'
      })

      const result = await ensureSearchAllowedAndIncrement('user-123')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should allow unlimited searches for PRO user', async () => {
      vi.mocked(getUserSubscription).mockResolvedValue({
        id: '123',
        user_id: 'user-123',
        subscription_id: 'sub_123',
        customer_id: 'cus_123',
        plan: 'PRO',
        status: 'active',
        current_period_start: '2024-01-01T00:00:00.000Z',
        current_period_end: '2024-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      })

      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn(() => ({ error: null as any })),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              { id: 'FREE', name: 'Free', price: 0, price_id: 'price_free', features: [], is_popular: false },
              { id: 'PRO', name: 'Pro', price: 20, price_id: 'price_pro', features: [], is_popular: true },
              { id: 'ENTERPRISE', name: 'Enterprise', price: 200, price_id: 'price_enterprise', features: [], is_popular: false }
            ] as any,
            error: null as any
          })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { searches: 100, prompts_count: 0, user_id: 'user-123' },
                error: null as any
              }))
            }))
          }))
        })),
      })

      // Mock atomic increment with limit -1 (unlimited) - should succeed
      vi.mocked(atomicIncrementWithLimit).mockResolvedValue({
        success: true,
        newValue: 101
      })

      const result = await ensureSearchAllowedAndIncrement('user-123')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeUndefined() // Unlimited
    })
  })

  describe('ensureExportAllowedAndIncrement', () => {
    it.skip('should deny export for FREE user', async () => {
      vi.mocked(getUserSubscription).mockResolvedValue({
        id: '123',
        user_id: 'user-123',
        subscription_id: null,
        customer_id: null,
        plan: 'FREE',
        status: 'active',
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      })

      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn(() => ({ error: null as any })),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              { id: 'FREE', name: 'Free', price: 0, price_id: 'price_free', features: [], is_popular: false },
              { id: 'PRO', name: 'Pro', price: 20, price_id: 'price_pro', features: [], is_popular: true },
              { id: 'ENTERPRISE', name: 'Enterprise', price: 200, price_id: 'price_enterprise', features: [], is_popular: false }
            ] as any,
            error: null as any
          })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { exports: 0, user_id: 'user-123' },
                error: null as any
              }))
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { exports: 1 },
                  error: null as any
                }))
              }))
            }))
          }))
        })),
      })

      const result = await ensureExportAllowedAndIncrement('user-123')

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should allow export for PRO user within limits', async () => {
      vi.mocked(getUserSubscription).mockResolvedValue({
        id: '123',
        user_id: 'user-123',
        subscription_id: 'sub_123',
        customer_id: 'cus_123',
        plan: 'PRO',
        status: 'active',
        current_period_start: '2024-01-01T00:00:00.000Z',
        current_period_end: '2024-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      })

      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn(() => ({ error: null as any })),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              { id: 'FREE', name: 'Free', price: 0, price_id: 'price_free', features: [], is_popular: false },
              { id: 'PRO', name: 'Pro', price: 20, price_id: 'price_pro', features: [], is_popular: true },
              { id: 'ENTERPRISE', name: 'Enterprise', price: 200, price_id: 'price_enterprise', features: [], is_popular: false }
            ] as any,
            error: null as any
          })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { exports: 25, prompts_count: 0, user_id: 'user-123' },
                error: null as any
              }))
            }))
          }))
        })),
      })

      // Mock atomic increment to return new value 26 (PRO limit is 50)
      vi.mocked(atomicIncrementWithLimit).mockResolvedValue({
        success: true,
        newValue: 26
      })

      const result = await ensureExportAllowedAndIncrement('user-123')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(24) // 50 - 26 = 24
    })
  })

  describe('ensurePromptAllowedAndTrack', () => {
    it('should allow prompt for PRO user within dollar budget', async () => {
      vi.mocked(getUserSubscription).mockResolvedValue({
        id: '123',
        user_id: 'user-123',
        subscription_id: 'sub_123',
        customer_id: 'cus_123',
        plan: 'PRO',
        status: 'active',
        current_period_start: '2024-01-01T00:00:00.000Z',
        current_period_end: '2024-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      })

      // Mock usage row with $5 spent (PRO limit is $20)
      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn(() => ({ error: null as any })),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              { id: 'FREE', name: 'Free', price: 0, price_id: 'price_free', features: [], is_popular: false },
              { id: 'PRO', name: 'Pro', price: 20, price_id: 'price_pro', features: [], is_popular: true },
              { id: 'ENTERPRISE', name: 'Enterprise', price: 200, price_id: 'price_enterprise', features: [], is_popular: false }
            ] as any,
            error: null as any
          })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  prompts_count: 0,
                  prompt_input_tokens: 0,
                  prompt_output_tokens: 0,
                  prompt_dollars: 5.00, // $5 already spent
                  user_id: 'user-123'
                },
                error: null as any
              }))
            }))
          }))
        })),
      })

      const result = await ensurePromptAllowedAndTrack('user-123', {
        model: 'gemini-2.5-flash',
        inputTokensEstimate: 1000 // Small request, won't exceed budget
      })

      expect(result.allowed).toBe(true)
      expect(result.remainingDollars).toBeDefined()
      expect(result.remainingDollars).toBe(15) // $20 limit - $5 spent = $15 remaining
    })

    it('should deny prompt when dollar budget exceeded', async () => {
      vi.mocked(getUserSubscription).mockResolvedValue({
        id: '123',
        user_id: 'user-123',
        subscription_id: null,
        customer_id: null,
        plan: 'FREE',
        status: 'active',
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      })

      // Mock usage row with $5.00 spent (FREE limit is $5.00) - AT LIMIT
      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn(() => ({ error: null as any })),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              { id: 'FREE', name: 'Free', price: 0, price_id: 'price_free', features: [], is_popular: false },
              { id: 'PRO', name: 'Pro', price: 20, price_id: 'price_pro', features: [], is_popular: true },
              { id: 'ENTERPRISE', name: 'Enterprise', price: 200, price_id: 'price_enterprise', features: [], is_popular: false }
            ] as any,
            error: null as any
          })),
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  prompts_count: 0,
                  prompt_input_tokens: 0,
                  prompt_output_tokens: 0,
                  prompt_dollars: 5.00, // AT LIMIT ($5.00 >= $5.00)
                  user_id: 'user-123'
                },
                error: null as any
              }))
            }))
          }))
        })),
      })

      const result = await ensurePromptAllowedAndTrack('user-123', {
        model: 'gemini-2.5-flash',
        inputTokensEstimate: 100000 // Large request (doesn't matter, already at limit)
      })

      expect(result.allowed).toBe(false)
      expect(result.remainingDollars).toBeDefined()
      expect(result.remainingDollars).toBe(0) // $5 limit - $5 spent = $0 remaining
    })
  })
})
