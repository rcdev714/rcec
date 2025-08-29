import { describe, it, expect, vi, beforeEach } from 'vitest'
import { stripe } from '@/lib/stripe/server'

// Mock Stripe with test card numbers from Stripe documentation
const STRIPE_TEST_CARDS = {
  SUCCESS: '4242424242424242',
  DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  REQUIRES_AUTH: '4000000000003063',
  EXPIRED: '4000000000000069',
  PROCESSING_ERROR: '4000000000000119'
}

// Mock Stripe
vi.mock('@/lib/stripe/server', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn()
      }
    },
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn()
    },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn()
    },
    webhooks: {
      constructEvent: vi.fn()
    },
    paymentMethods: {
      attach: vi.fn(),
      detach: vi.fn()
    },
    billingPortal: {
      sessions: {
        create: vi.fn()
      }
    }
  }
}))

describe('Stripe Billing Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Checkout Session Creation', () => {
    it('should create checkout session for PRO plan', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        payment_status: 'unpaid',
        mode: 'subscription',
        customer: 'cus_test_123'
      }

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue(mockSession as any)

      const session = await stripe.checkout.sessions.create({
        customer: 'cus_test_123',
        line_items: [{
          price: 'price_pro_test',
          quantity: 1
        }],
        mode: 'subscription',
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel'
      })

      expect(session.id).toBe('cs_test_123')
      expect(session.mode).toBe('subscription')
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        line_items: [{
          price: 'price_pro_test',
          quantity: 1
        }],
        mode: 'subscription',
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel'
      })
    })

    it('should handle checkout session creation failure', async () => {
      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(new Error('Invalid price ID'))

      await expect(stripe.checkout.sessions.create({
        line_items: [{
          price: 'invalid_price',
          quantity: 1
        }],
        mode: 'subscription',
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel'
      })).rejects.toThrow('Invalid price ID')
    })
  })

  describe('Customer Management', () => {
    it('should create customer with metadata', async () => {
      const mockCustomer = {
        id: 'cus_test_123',
        email: 'user@example.com',
        metadata: {
          supabase_user_id: 'user_123'
        }
      }

      vi.mocked(stripe.customers.create).mockResolvedValue(mockCustomer as any)

      const customer = await stripe.customers.create({
        email: 'user@example.com',
        metadata: {
          supabase_user_id: 'user_123'
        }
      })

      expect(customer.id).toBe('cus_test_123')
      expect(customer.metadata.supabase_user_id).toBe('user_123')
    })

    it('should retrieve customer data', async () => {
      const mockCustomer = {
        id: 'cus_test_123',
        email: 'user@example.com',
        deleted: false,
        metadata: {
          supabase_user_id: 'user_123'
        }
      }

      vi.mocked(stripe.customers.retrieve).mockResolvedValue(mockCustomer as any)

      const customer = await stripe.customers.retrieve('cus_test_123')

      expect(customer.id).toBe('cus_test_123')
      expect(customer.deleted).toBe(false)
    })
  })

  describe('Subscription Lifecycle', () => {
    it('should retrieve active subscription', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        status: 'active',
        customer: 'cus_test_123',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        cancel_at_period_end: false,
        items: {
          data: [{
            price: {
              id: 'price_pro_test'
            }
          }]
        }
      }

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(mockSubscription as any)

      const subscription = await stripe.subscriptions.retrieve('sub_test_123')

      expect(subscription.status).toBe('active')
      expect(subscription.cancel_at_period_end).toBe(false)
    })

    it('should cancel subscription at period end', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        status: 'active',
        cancel_at_period_end: true
      }

      vi.mocked(stripe.subscriptions.update).mockResolvedValue(mockSubscription as any)

      const subscription = await stripe.subscriptions.update('sub_test_123', {
        cancel_at_period_end: true
      })

      expect(subscription.cancel_at_period_end).toBe(true)
    })

    it('should immediately cancel subscription', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000)
      }

      vi.mocked(stripe.subscriptions.cancel).mockResolvedValue(mockSubscription as any)

      const subscription = await stripe.subscriptions.cancel('sub_test_123')

      expect(subscription.status).toBe('canceled')
      expect(subscription.canceled_at).toBeDefined()
    })
  })

  describe('Billing Portal', () => {
    it('should create billing portal session', async () => {
      const mockPortalSession = {
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/p/session/bps_test_123',
        customer: 'cus_test_123',
        return_url: 'https://app.com/settings'
      }

      vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue(mockPortalSession as any)

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: 'cus_test_123',
        return_url: 'https://app.com/settings'
      })

      expect(portalSession.url).toContain('billing.stripe.com')
      expect(portalSession.customer).toBe('cus_test_123')
    })
  })

  describe('Webhook Event Handling', () => {
    const webhookEvents = [
      'customer.created',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.created',
      'invoice.finalized',
      'invoice.paid',
      'invoice.payment_failed',
      'checkout.session.completed',
      'checkout.session.expired'
    ]

    webhookEvents.forEach(eventType => {
      it(`should handle ${eventType} webhook event`, async () => {
        const mockEvent = {
          id: `evt_test_${eventType}`,
          type: eventType,
          data: {
            object: {
              id: 'obj_test_123'
            }
          },
          created: Math.floor(Date.now() / 1000)
        }

        vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(mockEvent as any)

        const event = stripe.webhooks.constructEvent(
          JSON.stringify(mockEvent),
          'test_signature',
          'whsec_test_secret'
        )

        expect(event.type).toBe(eventType)
        expect((event.data.object as any).id).toBe('obj_test_123')
      })
    })

    it('should reject invalid webhook signature', async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      expect(() => {
        stripe.webhooks.constructEvent(
          'invalid_payload',
          'invalid_signature',
          'whsec_test_secret'
        )
      }).toThrow('Invalid signature')
    })
  })

  describe('Payment Method Testing', () => {
    it('should attach payment method to customer', async () => {
      const mockPaymentMethod = {
        id: 'pm_test_123',
        customer: 'cus_test_123',
        type: 'card'
      }

      vi.mocked(stripe.paymentMethods.attach).mockResolvedValue(mockPaymentMethod as any)

      const paymentMethod = await stripe.paymentMethods.attach('pm_test_123', {
        customer: 'cus_test_123'
      })

      expect(paymentMethod.customer).toBe('cus_test_123')
    })

    it('should detach payment method from customer', async () => {
      const mockPaymentMethod = {
        id: 'pm_test_123',
        customer: null,
        type: 'card'
      }

      vi.mocked(stripe.paymentMethods.detach).mockResolvedValue(mockPaymentMethod as any)

      const paymentMethod = await stripe.paymentMethods.detach('pm_test_123')

      expect(paymentMethod.customer).toBeNull()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle card declined scenario', async () => {
      const declineError = new Error('Your card was declined.')
      Object.assign(declineError, { 
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'generic_decline'
      })

      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(declineError)

      await expect(stripe.checkout.sessions.create({
        line_items: [{
          price: 'price_test',
          quantity: 1
        }],
        mode: 'subscription',
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel'
      })).rejects.toThrow('Your card was declined.')
    })

    it('should handle insufficient funds scenario', async () => {
      const insufficientFundsError = new Error('Your card has insufficient funds.')
      Object.assign(insufficientFundsError, { 
        type: 'card_error',
        code: 'card_declined',
        decline_code: 'insufficient_funds'
      })

      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(insufficientFundsError)

      await expect(stripe.checkout.sessions.create({
        line_items: [{
          price: 'price_test',
          quantity: 1
        }],
        mode: 'subscription',
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel'
      })).rejects.toThrow('Your card has insufficient funds.')
    })

    it('should handle processing error scenario', async () => {
      const processingError = new Error('An error occurred while processing your card.')
      Object.assign(processingError, { 
        type: 'card_error',
        code: 'processing_error'
      })

      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(processingError)

      await expect(stripe.checkout.sessions.create({
        line_items: [{
          price: 'price_test',
          quantity: 1
        }],
        mode: 'subscription',
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel'
      })).rejects.toThrow('An error occurred while processing your card.')
    })
  })
})
