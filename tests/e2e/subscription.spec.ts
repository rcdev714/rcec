import { test, expect } from '@playwright/test'

test.describe('Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test user
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/)
  })

  test('should display current subscription status', async ({ page }) => {
    await page.goto('/settings')
    
    // Should show subscription status card
    await expect(page.locator('[data-testid="subscription-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="current-plan"]')).toBeVisible()
  })

  test('should navigate to pricing page from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Click upgrade button or pricing link
    await page.click('[data-testid="upgrade-plan-button"]')
    
    // Should navigate to pricing page
    await expect(page).toHaveURL(/pricing/)
    
    // Should show pricing plans
    await expect(page.locator('[data-testid="pricing-plans"]')).toBeVisible()
    await expect(page.locator('[data-testid="pro-plan"]')).toBeVisible()
    await expect(page.locator('[data-testid="enterprise-plan"]')).toBeVisible()
  })

  test('should handle subscription upgrade flow', async ({ page }) => {
    await page.goto('/pricing')
    
    // Click on Pro plan upgrade button
    await page.click('[data-testid="pro-plan"] button')
    
    // Should redirect to Stripe Checkout (or show checkout form)
    // Note: In a real test, you might want to mock Stripe or use test mode
    await page.waitForTimeout(2000) // Wait for redirect
    
    // Check if we're on Stripe checkout page or our success page
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/(checkout\.stripe\.com|dashboard)/)
  })

  test('should show usage limits for free users', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should show usage limits component
    await expect(page.locator('[data-testid="usage-limits"]')).toBeVisible()
    
    // Should show search limit
    await expect(page.locator('[data-testid="search-limit"]')).toBeVisible()
    
    // Should show export limit (0 for free users)
    await expect(page.locator('[data-testid="export-limit"]')).toContainText('0')
  })

  test('should enforce search limits for free users', async ({ page }) => {
    // Navigate to companies search
    await page.goto('/companies')
    
    // Perform multiple searches to hit the limit
    for (let i = 0; i < 12; i++) {
      await page.fill('[data-testid="search-input"]', `test query ${i}`)
      await page.click('[data-testid="search-button"]')
      await page.waitForTimeout(1000)
    }
    
    // Should show upgrade prompt after hitting limit
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible()
  })

  test('should handle subscription cancellation', async ({ page }) => {
    // Only run this test if user has an active subscription
    await page.goto('/settings')
    
    const manageButton = page.locator('[data-testid="manage-subscription"]')
    if (await manageButton.isVisible()) {
      await manageButton.click()
      
      // Should redirect to Stripe customer portal
      await page.waitForTimeout(2000)
      const currentUrl = page.url()
      expect(currentUrl).toMatch(/(billing\.stripe\.com|settings)/)
    }
  })
})
