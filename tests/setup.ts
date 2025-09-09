/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global type declarations for test environment
declare global {
  var STRIPE_TEST_CARDS: {
    SUCCESS: string
    DECLINE: string
    INSUFFICIENT_FUNDS: string
    REQUIRES_AUTH: string
    EXPIRED: string
    PROCESSING_ERROR: string
  }
}

// Mock environment variables for tests
// NODE_ENV is automatically set by test runner, no need to override
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'test-google-api-key'
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_123'
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_123'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_123'

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase client with flexible types
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => ({ data: [], error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: {}, error: null }))
          }))
        }))
      })),
      delete: vi.fn(() => ({ data: [], error: null })),
      upsert: vi.fn(() => ({ data: [], error: null })),
      eq: vi.fn(() => ({ 
        data: [], 
        error: null,
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: {}, error: null }))
        }))
      })),
      single: vi.fn(() => ({ data: null, error: null })),
    })),
  }),
}))

// Mock Supabase server client with flexible types
const mockSupabaseQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: vi.fn(), // For promise-like behavior
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => mockSupabaseQueryBuilder),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }),
}));

// Mock Stripe with comprehensive test setup
vi.mock('@/lib/stripe/server', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
    paymentMethods: {
      attach: vi.fn(),
      detach: vi.fn(),
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    balance: {
      retrieve: vi.fn(),
    },
  },
  SUBSCRIPTION_PLANS: {
    FREE: { 
      name: 'Gratuito', 
      price: 0, 
      priceId: 'price_free_test',
      features: ['Acceso a funciones básicas', 'Búsqueda limitada', 'Soporte básico']
    },
    PRO: { 
      name: 'Pro', 
      price: 20, 
      priceId: 'price_pro_test',
      features: ['Todas las funciones gratuitas', 'Búsqueda ilimitada', 'Filtros avanzados']
    },
    ENTERPRISE: { 
      name: 'Empresarial', 
      price: 200, 
      priceId: 'price_enterprise_test',
      features: ['Todas las funciones Pro', 'Acceso a API', 'Soporte dedicado']
    },
  },
}))

// Stripe test card numbers for E2E testing
global.STRIPE_TEST_CARDS = {
  SUCCESS: '4242424242424242',
  DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  REQUIRES_AUTH: '4000000000003063',
  EXPIRED: '4000000000000069',
  PROCESSING_ERROR: '4000000000000119'
}

// Cleanup after each test case
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Setup and teardown
beforeAll(() => {
  // Global test setup
})

afterAll(() => {
  // Global test cleanup
})
