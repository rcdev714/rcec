import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  ensureSearchAllowedAndIncrement, 
  ensureExportAllowedAndIncrement,
  ensurePromptAllowedAndTrack 
} from '@/lib/usage'

// Mock Supabase to match actual usage.ts call patterns
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    // upsert pattern: upsert(data, options) -> { error }
    upsert: vi.fn(() => ({ error: null as any })),
    
    // select pattern: select(columns) -> eq(col, val) -> eq(col, val) -> single() -> { data, error }
    select: vi.fn(() => ({
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
          eq: vi.fn(() => ({ 
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ 
                data: { searches: 5, user_id: 'user-123' }, 
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
                  data: { searches: 6 }, 
                  error: null as any 
                }))
              }))
            }))
          }))
        })),
      })

      const result = await ensureSearchAllowedAndIncrement('user-123')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(94)
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

      // Mock usage row with 100 searches (at limit)
      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn(() => ({ error: null as any })),
        select: vi.fn(() => ({ 
          eq: vi.fn(() => ({ 
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ 
                data: { searches: 100, user_id: 'user-123' }, 
                error: null as any 
              }))
            }))
          }))
        })),
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
          eq: vi.fn(() => ({ 
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ 
                data: { searches: 100, user_id: 'user-123' }, 
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
                  data: { searches: 101 }, 
                  error: null as any 
                }))
              }))
            }))
          }))
        })),
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
          eq: vi.fn(() => ({ 
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ 
                data: { exports: 25, user_id: 'user-123' }, 
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
                  data: { exports: 26 }, 
                  error: null as any 
                }))
              }))
            }))
          }))
        })),
      })

      const result = await ensureExportAllowedAndIncrement('user-123')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(24)
    })
  })

  describe('ensurePromptAllowedAndTrack', () => {
    it('should track prompt usage for PRO user', async () => {
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
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  prompt_dollars: 0,
                  prompt_input_tokens: 10, // Repurposed as prompt count
                  user_id: 'user-123'
                },
                error: null as any
              }))
            }))
          }))
        })),
        // @ts-ignore - Test update mock
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              error: null as any
            }))
          }))
        })),
      })

      const result = await ensurePromptAllowedAndTrack('user-123', {
        model: 'gemini-2.5-flash',
        inputTokensEstimate: 1000
      })

      expect(result.allowed).toBe(true)
      // PRO limit is 100. Used 10, after this one it's 11. 100 - 11 = 89.
      expect(result.remainingPrompts).toBe(89)
    })

    it('should deny prompt when budget exceeded', async () => {
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
          eq: vi.fn(() => ({ 
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ 
                data: { 
                  prompt_dollars: 19.99, 
                  prompt_input_tokens: 50000000,
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
        inputTokensEstimate: 100000 // This would exceed the $20 budget
      })

      expect(result.allowed).toBe(false)
    })
  })
})
