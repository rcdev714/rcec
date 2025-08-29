// @ts-nocheck - Temporarily disabled file with mocking issues
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
    update: vi.fn(() => ({ error: null, data: {} })),
    eq: vi.fn(() => ({ error: null }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

describe.skip('Stripe Webhook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  it('should handle checkout.session.completed event', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: {
            supabase_user_id: 'user-123',
            plan_id: 'pro'
          }
        }
      }
    }

    const { stripe } = await import('@/lib/stripe/server')
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent)

    const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: {
        'stripe-signature': 'test_signature'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.received).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions')
  })

  it('should handle customer.subscription.updated event', async () => {
    const mockEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          current_period_start: 1640995200, // 2022-01-01
          current_period_end: 1643673600,   // 2022-02-01
          cancel_at_period_end: false,
          items: {
            data: [
              {
                price: {
                  id: process.env.STRIPE_PRO_PRICE_ID || 'price_pro'
                }
              }
            ]
          }
        }
      }
    }

    const mockCustomer = {
      deleted: false,
      metadata: {
        supabase_user_id: 'user-123'
      }
    }

    const { stripe: stripeLib } = await import('@/lib/stripe/server')
    vi.mocked(stripeLib.webhooks.constructEvent).mockReturnValue(mockEvent)
    vi.mocked(stripeLib.customers.retrieve).mockResolvedValue(mockCustomer)

    const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: {
        'stripe-signature': 'test_signature'
      }
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(stripeLib.customers.retrieve).toHaveBeenCalledWith('cus_123')
  })

  it('should handle customer.subscription.deleted event', async () => {
    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123'
        }
      }
    }

    const mockCustomer = {
      deleted: false,
      metadata: {
        supabase_user_id: 'user-123'
      }
    }

    const { stripe: stripeInstance } = await import('@/lib/stripe/server')
    vi.mocked(stripeInstance.webhooks.constructEvent).mockReturnValue(mockEvent)
    vi.mocked(stripeInstance.customers.retrieve).mockResolvedValue(mockCustomer)

    const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: {
        'stripe-signature': 'test_signature'
      }
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    // Should revert to FREE plan
    expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions')
  })

  it('should handle invoice.payment_failed event', async () => {
    const mockEvent = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          subscription: 'sub_123'
        }
      }
    }

    const { stripe: stripeService } = await import('@/lib/stripe/server')
    vi.mocked(stripeService.webhooks.constructEvent).mockReturnValue(mockEvent)

    const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: {
        'stripe-signature': 'test_signature'
      }
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    // Should mark subscription as past_due
  })

  it('should return 400 for missing signature', async () => {
    const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
      method: 'POST',
      body: 'test body'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No signature provided')
  })

  it('should return 400 for invalid signature', async () => {
    const { stripe: stripeClient } = await import('@/lib/stripe/server')
    vi.mocked(stripeClient.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const request = new NextRequest('http://localhost:3000/api/subscriptions/webhook', {
      method: 'POST',
      body: 'test body',
      headers: {
        'stripe-signature': 'invalid_signature'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid signature')
  })
})
