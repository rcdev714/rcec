import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserSubscription, getSubscriptionStatus, canAccessFeature } from '@/lib/subscription'
import { UserSubscription } from '@/types/subscription'

// Mock Supabase with flexible types
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({ 
      eq: vi.fn(() => ({ 
        single: vi.fn(() => ({ data: null as any, error: null as any }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

describe('Subscription System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserSubscription', () => {
    it('should return subscription data for existing user', async () => {
      const mockSubscription: UserSubscription = {
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
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockSubscription, error: null }))
          }))
        }))
      })

      const result = await getUserSubscription('user-123')
      expect(result).toEqual(mockSubscription)
    })

    it('should return null when subscription not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: { code: 'PGRST116' } }))
          }))
        }))
      })

      const result = await getUserSubscription('user-123')
      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      // Mock console.error to prevent logging during tests
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: { message: 'Database error' } }))
          }))
        }))
      })

      const result = await getUserSubscription('user-123')
      
      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user subscription:', { message: 'Database error' });

      // Restore original console.error
      consoleErrorSpy.mockRestore();
    })
  })

  describe('getSubscriptionStatus', () => {
    it('should return FREE status for null subscription', () => {
      const status = getSubscriptionStatus(null)
      
      expect(status.plan).toBe('FREE')
      expect(status.status).toBe('inactive')
      expect(status.isActive).toBe(false)
      expect(status.canAccessFeature('basic_search')).toBe(false)
    })

    it('should return active status for active PRO subscription', () => {
      const subscription: UserSubscription = {
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
      }

      const status = getSubscriptionStatus(subscription)
      
      expect(status.plan).toBe('PRO')
      expect(status.status).toBe('active')
      expect(status.isActive).toBe(true)
      expect(status.canAccessFeature('unlimited_search')).toBe(true)
    })

    it('should handle trialing status as active', () => {
      const subscription: UserSubscription = {
        id: '123',
        user_id: 'user-123',
        subscription_id: 'sub_123',
        customer_id: 'cus_123',
        plan: 'PRO',
        status: 'trialing',
        current_period_start: '2024-01-01T00:00:00.000Z',
        current_period_end: '2024-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      const status = getSubscriptionStatus(subscription)
      expect(status.isActive).toBe(true)
    })
  })

  describe('canAccessFeature', () => {
    it('should allow FREE plan users access to basic features', () => {
      expect(canAccessFeature('FREE', 'basic_search')).toBe(true)
      expect(canAccessFeature('FREE', 'basic_support')).toBe(true)
    })

    it('should deny FREE plan users access to PRO features', () => {
      expect(canAccessFeature('FREE', 'unlimited_search')).toBe(false)
      expect(canAccessFeature('FREE', 'export_data')).toBe(false)
    })

    it('should allow PRO plan users access to PRO features', () => {
      expect(canAccessFeature('PRO', 'unlimited_search')).toBe(true)
      expect(canAccessFeature('PRO', 'advanced_filtering')).toBe(true)
      expect(canAccessFeature('PRO', 'export_data')).toBe(true)
    })

    it('should deny PRO plan users access to ENTERPRISE features', () => {
      expect(canAccessFeature('PRO', 'api_access')).toBe(false)
      expect(canAccessFeature('PRO', 'custom_integrations')).toBe(false)
    })

    it('should allow ENTERPRISE plan users access to all features', () => {
      expect(canAccessFeature('ENTERPRISE', 'basic_search')).toBe(true)
      expect(canAccessFeature('ENTERPRISE', 'unlimited_search')).toBe(true)
      expect(canAccessFeature('ENTERPRISE', 'api_access')).toBe(true)
      expect(canAccessFeature('ENTERPRISE', 'custom_integrations')).toBe(true)
    })

    it('should return false for unknown features', () => {
      expect(canAccessFeature('PRO', 'unknown_feature')).toBe(false)
    })
  })
})
