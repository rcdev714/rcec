import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getUserSubscription,
  getSubscriptionStatus,
  getSubscriptionStatusAsync,
  canAccessFeature,
  createUserSubscription,
  updateUserSubscription
} from '@/lib/subscription'
import { UserSubscription } from '@/types/subscription'
import { validateSubscriptionData, validatePlanChange, validatePaymentIntent } from '@/lib/subscription-validation'
import { getPlanById } from '@/lib/plans'

// Mock Supabase server
const mockSupabaseClient = {
  from: vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
              error: null
            }))
          }))
        }))
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null }))
          }))
        }))
      }))
    };
  })
};

const mockSupabaseClientWithUser = {
  from: vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
              error: null
            }))
          }))
        }))
      };
    }
    if (table === 'user_subscriptions') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { plan: 'FREE', status: 'active' },
              error: null
            }))
          }))
        }))
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null }))
          }))
        }))
      }))
    };
  })
};

// Mock supabase server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClientWithUser)
}))

// Mock the plans module
vi.mock('@/lib/plans', () => ({
  getPlanById: vi.fn(),
  getPlansWithLimits: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  getPlanByStripePriceId: vi.fn(),
  getPlansWithLimitsClient: vi.fn(),
  isValidPlan: vi.fn((planId: string) => ['FREE', 'PRO', 'ENTERPRISE'].includes(planId)),
  getPlanDisplayName: vi.fn(),
  getStripePriceIds: vi.fn(),
  getPlanFromStripePriceId: vi.fn()
}))

// Get the mocked functions
const mockGetPlanById = vi.mocked(getPlanById)

describe('Subscription System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserSubscription', () => {
    it('should return subscription data for existing user', async () => {
      const mockSubscription: UserSubscription = {
        id: '123',
        user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
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
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockSubscription, error: null })
              })
            })
          };
        }
      };
      const { createClient } = await import('@/lib/supabase/server')
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const result = await getUserSubscription('ffcc1afc-9510-4166-98d4-7a93465acac8')
      expect(result).toEqual(mockSubscription)
    })

    it('should return null when subscription not found', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } })
              })
            })
          };
        }
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserSubscription('ffcc1afc-9510-4166-98d4-7a93465acac8')
      expect(result).toBeNull()
    })

    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'Database error' } })
              })
            })
          };
        }
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const result = await getUserSubscription('ffcc1afc-9510-4166-98d4-7a93465acac8')
      
      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user subscription:', { message: 'Database error' });

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
        user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
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
        user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
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
    beforeEach(() => {
      // Mock getPlanById to return a valid plan object
      mockGetPlanById.mockImplementation(async (planId) => {
        if (['FREE', 'PRO', 'ENTERPRISE'].includes(planId)) {
          return {
            id: planId,
            name: planId,
            price: planId === 'FREE' ? 0 : planId === 'PRO' ? 20 : 200,
            price_id: `price_${planId.toLowerCase()}_test`,
            features: [],
            is_popular: planId === 'PRO',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          };
        }
        return null;
      });
    });

    it('should allow FREE plan users access to basic features', async () => {
      const result = await canAccessFeature('FREE', 'basic_search');
      expect(result).toBe(true);

      const result2 = await canAccessFeature('FREE', 'basic_support');
      expect(result2).toBe(true);
    });

    it('should deny FREE plan users access to PRO features', async () => {
      const result = await canAccessFeature('FREE', 'unlimited_search');
      expect(result).toBe(false);

      const result2 = await canAccessFeature('FREE', 'export_data');
      expect(result2).toBe(false);
    });

    it('should allow PRO plan users access to PRO features', async () => {
      const result = await canAccessFeature('PRO', 'unlimited_search');
      expect(result).toBe(true);

      const result2 = await canAccessFeature('PRO', 'advanced_filtering');
      expect(result2).toBe(true);

      const result3 = await canAccessFeature('PRO', 'export_data');
      expect(result3).toBe(true);
    });

    it('should deny PRO plan users access to ENTERPRISE features', async () => {
      const result = await canAccessFeature('PRO', 'api_access');
      expect(result).toBe(false);

      const result2 = await canAccessFeature('PRO', 'custom_integrations');
      expect(result2).toBe(false);
    });

    it('should allow ENTERPRISE plan users access to all features', async () => {
      const result = await canAccessFeature('ENTERPRISE', 'basic_search');
      expect(result).toBe(true);

      const result2 = await canAccessFeature('ENTERPRISE', 'unlimited_search');
      expect(result2).toBe(true);

      const result3 = await canAccessFeature('ENTERPRISE', 'api_access');
      expect(result3).toBe(true);

      const result4 = await canAccessFeature('ENTERPRISE', 'custom_integrations');
      expect(result4).toBe(true);
    });

    it('should return false for unknown features', async () => {
      const result = await canAccessFeature('PRO', 'unknown_feature');
      expect(result).toBe(false);
    });

    it('should return false if plan is not found', async () => {
      mockGetPlanById.mockResolvedValue(null);
      const result = await canAccessFeature('UNKNOWN_PLAN', 'basic_search');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetPlanById.mockRejectedValue(new Error('Database error'));

      const result = await canAccessFeature('PRO', 'basic_search');
      expect(result).toBe(true); // Should return true for basic features even when database fails

      consoleSpy.mockRestore();
    });
  })

  describe('getSubscriptionStatusAsync', () => {
    it('should return FREE status for null subscription', async () => {
      const status = await getSubscriptionStatusAsync(null)

      expect(status.plan).toBe('FREE')
      expect(status.status).toBe('inactive')
      expect(status.isActive).toBe(false)
    })

    it('should return active status for active PRO subscription', async () => {
      const subscription: UserSubscription = {
        id: '123',
        user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
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

      const status = await getSubscriptionStatusAsync(subscription)

      expect(status.plan).toBe('PRO')
      expect(status.status).toBe('active')
      expect(status.isActive).toBe(true)
    })
  })

  describe('createUserSubscription', () => {
    beforeEach(() => {
      mockGetPlanById.mockImplementation(async (planId) => {
        if (['FREE', 'PRO', 'ENTERPRISE'].includes(planId)) {
          return {
            id: planId,
            name: planId,
            price: planId === 'FREE' ? 0 : planId === 'PRO' ? 20 : 200,
            price_id: `price_${planId.toLowerCase()}_test`,
            features: [],
            is_popular: planId === 'PRO',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          };
        }
        return null;
      });
    });

    it('should create a subscription successfully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: '123',
                    user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
                    plan: 'PRO' as const,
                    status: 'active' as const,
                    subscription_id: null,
                    customer_id: null,
                    current_period_start: null,
                    current_period_end: null,
                    cancel_at_period_end: false,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                  },
                  error: null
                })
              })
            })
          };
        }
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const subscriptionData: Partial<UserSubscription> = {
        plan: 'PRO',
        status: 'active',
        customer_id: 'cus_test123',
        subscription_id: 'sub_test123'
      };
      const result = await createUserSubscription('ffcc1afc-9510-4166-98d4-7a93465acac8', subscriptionData);

      expect(result).toBeDefined();
      expect(result?.plan).toBe('PRO');
    });

    it('should validate subscription data before creation', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: '123',
                    user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
                    plan: 'INVALID_PLAN' as any,
                    status: 'active' as const,
                    subscription_id: null,
                    customer_id: null,
                    current_period_start: null,
                    current_period_end: null,
                    cancel_at_period_end: false,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z'
                  },
                  error: null
                })
              })
            })
          };
        }
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as any)

      const subscriptionData: Partial<UserSubscription> = { plan: 'INVALID_PLAN' as any, status: 'active' };

      await expect(createUserSubscription('ffcc1afc-9510-4166-98d4-7a93465acac8', subscriptionData))
        .rejects
        .toThrow('Subscription validation failed');
    });
  })

  describe('updateUserSubscription', () => {
    beforeEach(() => {
      mockGetPlanById.mockImplementation(async (planId) => {
        if (['FREE', 'PRO', 'ENTERPRISE'].includes(planId)) {
          return {
            id: planId,
            name: planId,
            price: planId === 'FREE' ? 0 : planId === 'PRO' ? 20 : 200,
            price_id: `price_${planId.toLowerCase()}_test`,
            features: [],
            is_popular: planId === 'PRO',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          };
        }
        return null;
      });
    });

    it('should update a subscription successfully', async () => {
      // Mock existing subscription
      const existingSubscription: UserSubscription = {
        id: '123',
        user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
        plan: 'FREE',
        status: 'active',
        subscription_id: 'sub_test123',
        customer_id: 'cus_test123',
        current_period_start: '2024-01-01T00:00:00.000Z',
        current_period_end: '2024-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      };

      const { createClient } = await import('@/lib/supabase/server');

      // Mock for getUserSubscription (first call)
      const mockGetSupabase = {
        from: (table: string) => {
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: existingSubscription, error: null })
              })
            })
          };
        }
      };

      // Mock for updateUserSubscription (second call)
      const mockUpdateSupabase = {
        from: (table: string) => {
          if (table === 'user_profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'ffcc1afc-9510-4166-98d4-7a93465acac8' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: () => Promise.resolve({
                    data: { ...existingSubscription, plan: 'PRO' },
                    error: null
                  })
                })
              })
            })
          };
        }
      };

      // First call returns existing subscription, second call does the update
      (createClient as any)
        .mockReturnValueOnce(mockGetSupabase)
        .mockReturnValueOnce(mockUpdateSupabase)
        .mockReturnValueOnce(mockUpdateSupabase);

      const updates: Partial<UserSubscription> = {
        plan: 'PRO',
        customer_id: 'cus_test123',
        subscription_id: 'sub_test123'
      };
      const result = await updateUserSubscription('ffcc1afc-9510-4166-98d4-7a93465acac8', updates);

      expect(result).toBeDefined();
      expect(result?.plan).toBe('PRO');
    });
  })

  describe('validateSubscriptionData', () => {
    beforeEach(() => {
      mockGetPlanById.mockImplementation(async (planId) => {
        if (['FREE', 'PRO', 'ENTERPRISE'].includes(planId)) {
          return {
            id: planId,
            name: planId,
            price: planId === 'FREE' ? 0 : planId === 'PRO' ? 20 : 200,
            price_id: `price_${planId.toLowerCase()}_test`,
            features: [],
            is_popular: planId === 'PRO',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          };
        }
        return null;
      });
    });

    it('should validate valid subscription data', async () => {
      const data = {
        user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
        plan: 'PRO',
        status: 'active',
        customer_id: 'cus_test123',
        subscription_id: 'sub_test123'
      };

      const result = await validateSubscriptionData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid plan', async () => {
      const data = {
        user_id: 'ffcc1afc-9510-4166-98d4-7a93465acac8',
        plan: 'INVALID_PLAN',
        status: 'active'
      };

      const result = await validateSubscriptionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("plan 'INVALID_PLAN' is not a valid plan. Valid plans: FREE, PRO, ENTERPRISE");
    });

    it('should reject missing user_id', async () => {
      const data = {
        plan: 'PRO',
        status: 'active'
      };

      const result = await validateSubscriptionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('user_id is required');
    });
  })

  describe('validatePlanChange', () => {
    beforeEach(() => {
      mockGetPlanById.mockImplementation(async (planId) => {
        if (['FREE', 'PRO', 'ENTERPRISE'].includes(planId)) {
          return {
            id: planId,
            name: planId,
            price: planId === 'FREE' ? 0 : planId === 'PRO' ? 20 : 200,
            price_id: `price_${planId.toLowerCase()}_test`,
            features: [],
            is_popular: planId === 'PRO',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          };
        }
        return null;
      });
    });

    it('should validate valid plan change', async () => {
      // Mock createClient for this specific test
      const { createClient } = await import('@/lib/supabase/server');
      const mockClient = {
        from: (table: string) => {
          if (table === 'user_subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { plan: 'FREE', status: 'active' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null, error: null })
              })
            })
          };
        }
      };
      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await validatePlanChange('user-123', 'PRO', 'FREE');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid new plan', async () => {
      const result = await validatePlanChange('user-123', 'INVALID_PLAN');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("New plan 'INVALID_PLAN' is not valid");
    });
  })

  describe('validatePaymentIntent', () => {
    beforeEach(() => {
      mockGetPlanById.mockImplementation(async (planId) => {
        if (['FREE', 'PRO', 'ENTERPRISE'].includes(planId)) {
          return {
            id: planId,
            name: planId,
            price: planId === 'FREE' ? 0 : planId === 'PRO' ? 20 : 200,
            price_id: `price_${planId.toLowerCase()}_test`,
            features: [],
            is_popular: planId === 'PRO',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          };
        }
        return null;
      });
    });

    it('should validate correct payment amount', async () => {
      // Mock createClient for this specific test
      const { createClient } = await import('@/lib/supabase/server');
      const mockClient = {
        from: (table: string) => {
          if (table === 'user_subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { plan: 'FREE', status: 'active' },
                    error: null
                  })
                })
              })
            };
          }
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null, error: null })
              })
            })
          };
        }
      };
      vi.mocked(createClient).mockResolvedValue(mockClient as any);

      const result = await validatePaymentIntent('ffcc1afc-9510-4166-98d4-7a93465acac8', 'PRO', 20);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject incorrect payment amount', async () => {
      const result = await validatePaymentIntent('user-123', 'PRO', 25);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment amount 25 does not match plan price 20');
    });

    it('should reject invalid plan', async () => {
      const result = await validatePaymentIntent('user-123', 'INVALID_PLAN', 20);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Plan 'INVALID_PLAN' not found");
    });
  })
})
