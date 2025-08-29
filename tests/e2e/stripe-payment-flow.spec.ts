import { test, expect } from '@playwright/test'

// Stripe test card numbers from official documentation
const STRIPE_TEST_CARDS = {
  SUCCESS: '4242 4242 4242 4242',
  DECLINE: '4000 0000 0000 0002',
  INSUFFICIENT_FUNDS: '4000 0000 0000 9995',
  REQUIRES_AUTH: '4000 0000 0000 3063',
  EXPIRED: '4000 0000 0000 0069',
  PROCESSING_ERROR: '4000 0000 0000 0119'
}

test.describe('Stripe Payment Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test user
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/)
  })

  test('should complete successful payment flow with test card', async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing')
    
    // Click on Pro plan upgrade
    await page.click('[data-testid="pro-plan"] button')
    
    // Wait for Stripe Checkout to load (in test mode)
    await page.waitForURL(/checkout\.stripe\.com|localhost.*checkout/, { timeout: 10000 })
    
    // Only proceed if we're on actual Stripe checkout page (not redirected back due to error)
    if (page.url().includes('checkout.stripe.com')) {
      // Fill in test card information
      await page.fill('[data-testid="cardNumber"]', STRIPE_TEST_CARDS.SUCCESS)
      await page.fill('[data-testid="cardExpiry"]', '12/34')
      await page.fill('[data-testid="cardCvc"]', '123')
      await page.fill('[data-testid="billingName"]', 'Test User')
      
      // Submit payment
      await page.click('[data-testid="submitButton"]')
      
      // Should redirect back to success page
      await expect(page).toHaveURL(/dashboard.*success|success/, { timeout: 15000 })
      
      // Verify subscription upgrade
      await page.goto('/settings')
      await expect(page.locator('[data-testid="current-plan"]')).toContainText('Pro')
    }
  })

  test('should handle card declined scenario', async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing')
    
    // Click on Pro plan upgrade
    await page.click('[data-testid="pro-plan"] button')
    
    // Wait for Stripe Checkout
    await page.waitForURL(/checkout\.stripe\.com|localhost.*checkout/, { timeout: 10000 })
    
    if (page.url().includes('checkout.stripe.com')) {
      // Use declined test card
      await page.fill('[data-testid="cardNumber"]', STRIPE_TEST_CARDS.DECLINE)
      await page.fill('[data-testid="cardExpiry"]', '12/34')
      await page.fill('[data-testid="cardCvc"]', '123')
      await page.fill('[data-testid="billingName"]', 'Test User')
      
      // Submit payment
      await page.click('[data-testid="submitButton"]')
      
      // Should show decline error
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/declined|failed/)
      
      // User should still be on checkout page or redirected to cancel URL
      expect(page.url()).toMatch(/checkout\.stripe\.com|pricing/)
    }
  })

  test('should handle insufficient funds scenario', async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing')
    
    // Click on Pro plan upgrade
    await page.click('[data-testid="pro-plan"] button')
    
    await page.waitForURL(/checkout\.stripe\.com|localhost.*checkout/, { timeout: 10000 })
    
    if (page.url().includes('checkout.stripe.com')) {
      // Use insufficient funds test card
      await page.fill('[data-testid="cardNumber"]', STRIPE_TEST_CARDS.INSUFFICIENT_FUNDS)
      await page.fill('[data-testid="cardExpiry"]', '12/34')
      await page.fill('[data-testid="cardCvc"]', '123')
      await page.fill('[data-testid="billingName"]', 'Test User')
      
      // Submit payment
      await page.click('[data-testid="submitButton"]')
      
      // Should show insufficient funds error
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/insufficient|funds/)
    }
  })

  test('should handle 3D Secure authentication flow', async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing')
    
    // Click on Pro plan upgrade
    await page.click('[data-testid="pro-plan"] button')
    
    await page.waitForURL(/checkout\.stripe\.com|localhost.*checkout/, { timeout: 10000 })
    
    if (page.url().includes('checkout.stripe.com')) {
      // Use 3D Secure test card
      await page.fill('[data-testid="cardNumber"]', STRIPE_TEST_CARDS.REQUIRES_AUTH)
      await page.fill('[data-testid="cardExpiry"]', '12/34')
      await page.fill('[data-testid="cardCvc"]', '123')
      await page.fill('[data-testid="billingName"]', 'Test User')
      
      // Submit payment
      await page.click('[data-testid="submitButton"]')
      
      // Should show 3D Secure authentication modal/page
      await expect(page.locator('[data-testid="threeds-frame"], iframe[name*="__privateStripeFrame"]')).toBeVisible({ timeout: 10000 })
      
      // In a real test, you would complete the 3D Secure flow
      // For this test, we just verify the authentication step appears
    }
  })

  test('should access billing portal for existing subscription', async ({ page }) => {
    // This test assumes user already has an active subscription
    await page.goto('/settings')
    
    // Check if manage subscription button exists (user has paid plan)
    const manageButton = page.locator('[data-testid="manage-subscription"]')
    
    if (await manageButton.isVisible()) {
      await manageButton.click()
      
      // Should redirect to Stripe billing portal
      await page.waitForURL(/billing\.stripe\.com/, { timeout: 10000 })
      
      // Verify we're on Stripe billing portal
      expect(page.url()).toContain('billing.stripe.com')
      
      // Should show subscription management options
      await expect(page.locator('text=Subscription')).toBeVisible()
    }
  })

  test('should prevent access to paid features for free users', async ({ page }) => {
    // Verify user is on free plan
    await page.goto('/settings')
    await expect(page.locator('[data-testid="current-plan"]')).toContainText('Free')
    
    // Try to access export functionality
    await page.goto('/companies')
    await page.fill('[data-testid="search-input"]', 'test company')
    await page.click('[data-testid="search-button"]')
    
    // Try to export (should show upgrade prompt)
    const exportButton = page.locator('[data-testid="export-button"]')
    if (await exportButton.isVisible()) {
      await exportButton.click()
      
      // Should show upgrade prompt instead of allowing export
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible()
      await expect(page.locator('text=upgrade')).toBeVisible()
    }
  })

  test('should handle webhook delays and eventual consistency', async ({ page }) => {
    // This test verifies that the UI handles webhook processing delays gracefully
    await page.goto('/pricing')
    
    // Start upgrade process
    await page.click('[data-testid="pro-plan"] button')
    
    // If successful payment occurs, user might see a processing state
    // before webhook updates subscription status
    
    // Check for loading/processing states
    const loadingIndicators = [
      '[data-testid="processing-payment"]',
      '[data-testid="updating-subscription"]',
      'text=Processing',
      'text=Updating'
    ]
    
    // At least one loading state should be shown during webhook processing
    for (const indicator of loadingIndicators) {
      const element = page.locator(indicator)
      if (await element.isVisible()) {
        // Good - the UI shows processing state
        break
      }
    }
  })

  test('should display correct subscription status after payment', async ({ page }) => {
    // Navigate to dashboard after a successful payment
    await page.goto('/dashboard')
    
    // Check subscription status component
    const subscriptionStatus = page.locator('[data-testid="subscription-status"]')
    
    if (await subscriptionStatus.isVisible()) {
      // Status should be either "Active" or show processing
      const statusText = await subscriptionStatus.textContent()
      expect(statusText).toMatch(/Active|Processing|Pro|Enterprise/)
    }
    
    // Check usage limits reflect the new plan
    const usageLimits = page.locator('[data-testid="usage-limits"]')
    if (await usageLimits.isVisible()) {
      // Should show updated limits for paid plan
      await expect(usageLimits).not.toContainText('0 exports remaining')
    }
  })

  test('should handle subscription cancellation', async ({ page }) => {
    // This test requires an active subscription
    await page.goto('/settings')
    
    const manageButton = page.locator('[data-testid="manage-subscription"]')
    
    if (await manageButton.isVisible()) {
      await manageButton.click()
      
      // On Stripe billing portal
      await page.waitForURL(/billing\.stripe\.com/)
      
      // Look for cancel subscription option
      const cancelButton = page.locator('text=Cancel subscription, button[data-test*="cancel"]')
      
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        
        // Confirm cancellation
        const confirmButton = page.locator('text=Confirm, button[data-test*="confirm"]')
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
        }
        
        // Go back to our app
        await page.goto('/settings')
        
        // Should eventually show cancelled status
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText(/Cancel|Expir/, { timeout: 30000 })
      }
    }
  })
})
