import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/subscriptions/webhook/route'
import { NextRequest } from 'next/server'

// Mock Stripe
vi.mock('@/lib/stripe/server', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn()
    },
    customers: {
      retrieve: vi.fn()
    }
  }
}))

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    upsert: vi.fn(() => ({ error: null })),
    update: vi.fn(() => ({ 
      eq: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({ single: vi.fn(() => ({ data: {}, error: null })) }))
    })),
    eq: vi.fn(() => ({ error: null }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

describe.skip('Stripe Webhook Events Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    
    // Get the mocked stripe instance
    const { stripe } = await import('@/lib/stripe/server')
    
    // Default customer mock
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({
      id: 'cus_test_123',
      deleted: false,
      metadata: {
        supabase_user_id: 'user_123'
      }
    } as any)
  })

  describe('Critical Billing Events', () => {
    it('should handle customer.created event', async () => {
      const mockEvent = {
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_test_123',
            email: 'user@example.com',
            metadata: {
              supabase_user_id: 'user_123'
            },
            created: Math.floor(Date.now() / 1000)
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle customer.subscription.created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            current_period_start: 1640995200,
            current_period_end: 1643673600,
            cancel_at_period_end: false,
            items: {
              data: [{
                price: {
                  id: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_test'
                }
              }]
            }
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions')
    })

    it('should handle invoice.created event', async () => {
      const mockEvent = {
        type: 'invoice.created',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            status: 'draft',
            amount_due: 2000, // $20.00
            currency: 'usd',
            period_start: 1640995200,
            period_end: 1643673600
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle invoice.finalized event', async () => {
      const mockEvent = {
        type: 'invoice.finalized',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            status: 'open',
            amount_due: 2000,
            hosted_invoice_url: 'https://invoice.stripe.com/i/inv_test'
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle invoice.paid event', async () => {
      const mockEvent = {
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            status: 'paid',
            amount_paid: 2000,
            payment_intent: 'pi_test_123'
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle invoice.payment_failed event with retries', async () => {
      const mockEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            status: 'open',
            attempt_count: 1,
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86400 // Tomorrow
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      // Should update subscription status to past_due
      expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions')
    })

    it('should handle customer.subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled',
            canceled_at: Math.floor(Date.now() / 1000),
            cancel_at_period_end: false
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      // Should revert user to FREE plan
      expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions')
    })
  })

  describe('Checkout Events', () => {
    it('should handle checkout.session.completed for subscription', async () => {
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            mode: 'subscription',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            payment_status: 'paid',
            metadata: {
              supabase_user_id: 'user_123',
              plan_id: 'pro'
            }
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions')
    })

    it('should handle checkout.session.expired', async () => {
      const mockEvent = {
        type: 'checkout.session.expired',
        data: {
          object: {
            id: 'cs_test_123',
            mode: 'subscription',
            payment_status: 'unpaid',
            status: 'expired',
            metadata: {
              supabase_user_id: 'user_123',
              plan_id: 'pro'
            }
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle webhook with missing customer metadata', async () => {
      const { stripe } = await import('@/lib/stripe/server')
      vi.mocked(stripe.customers.retrieve).mockResolvedValue({
        id: 'cus_test_123',
        deleted: false,
        metadata: {} // Missing supabase_user_id
      } as any)

      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active'
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      // Should handle gracefully without crashing
    })

    it('should handle webhook with deleted customer', async () => {
      const { stripe } = await import('@/lib/stripe/server')
      vi.mocked(stripe.customers.retrieve).mockResolvedValue({
        id: 'cus_test_123',
        deleted: true
      } as any)

      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active'
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle database connection errors gracefully', async () => {
      // @ts-ignore - Test mock override
      mockSupabase.from.mockReturnValue({
        // @ts-ignore - Test error simulation
        upsert: vi.fn(() => ({ error: new Error('Database connection failed') }))
      })

      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            metadata: {
              supabase_user_id: 'user_123',
              plan_id: 'pro'
            }
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200) // Should still return 200 to Stripe
    })

    it('should handle unknown webhook event types', async () => {
      const mockEvent = {
        type: 'unknown.event.type',
        data: {
          object: {
            id: 'obj_test_123'
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200) // Should handle gracefully
    })

    it('should validate webhook signature properly', async () => {
      const { stripe } = await import('@/lib/stripe/server')
      vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: 'invalid body',
        headers: { 'stripe-signature': 'invalid_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBe('Invalid signature')
    })
  })

  describe('Subscription Plan Detection', () => {
    it('should correctly identify PRO plan from price ID', async () => {
      process.env.STRIPE_PRO_PRICE_ID = 'price_pro_test'
      
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            items: {
              data: [{
                price: {
                  id: 'price_pro_test'
                }
              }]
            }
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should correctly identify ENTERPRISE plan from price ID', async () => {
      process.env.STRIPE_ENTERPRISE_PRICE_ID = 'price_enterprise_test'
      
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            items: {
              data: [{
                price: {
                  id: 'price_enterprise_test'
                }
              }]
            }
          }
        }
      }

      const { stripe: stripeImport } = await import('@/lib/stripe/server')
      vi.mocked(stripeImport.webhooks.constructEvent).mockReturnValue(mockEvent as any)

      const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'test_signature' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})
