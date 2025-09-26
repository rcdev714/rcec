import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should allow user to sign up, login, and logout', async ({ page }) => {
    // Navigate to sign up page
    await page.goto('/auth/sign-up')
    await expect(page).toHaveTitle(/Camella B2B/)

    // Test sign up form validation
    await page.fill('input[type="email"]', '')
    await page.fill('input[type="password"]', '')
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('[role="alert"]')).toBeVisible()

    // Fill valid registration data
    const testEmail = `test+${Date.now()}@example.com`
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', 'SecurePassword123!')
    
    // Submit registration
    await page.click('button[type="submit"]')
    
    // Should redirect to success page or dashboard
    await expect(page).toHaveURL(/sign-up-success|dashboard/)

    // Test login with the new account
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', 'SecurePassword123!')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/)
    
    // Verify user is logged in (check for user avatar or logout button)
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()

    // Test logout
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/auth\/login/)
  })

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.fill('input[type="email"]', 'nonexistent@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('[role="alert"]')).toContainText(/Invalid/)
  })

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL(/auth\/login/)
  })
})

test.describe('Password Reset Flow', () => {
  test('should allow password reset request', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('button[type="submit"]')
    
    // Should show success message
    await expect(page.locator('[role="alert"]')).toContainText(/sent/)
  })
})
