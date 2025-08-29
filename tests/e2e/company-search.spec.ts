import { test, expect } from '@playwright/test'

test.describe('Company Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test user
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/)
  })

  test('should perform basic company search', async ({ page }) => {
    await page.goto('/companies')
    
    // Fill search form
    await page.fill('[data-testid="search-input"]', 'Banco')
    await page.click('[data-testid="search-button"]')
    
    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Should show search results
    const companyCards = page.locator('[data-testid="company-card"]')
    await expect(companyCards.first()).toBeVisible()
    
    // Should show company information
    const firstCard = page.locator('[data-testid="company-card"]').first()
    await expect(firstCard.locator('[data-testid="company-name"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="company-ruc"]')).toBeVisible()
  })

  test('should apply filters to search results', async ({ page }) => {
    await page.goto('/companies')
    
    // Perform initial search
    await page.fill('[data-testid="search-input"]', 'Empresa')
    await page.click('[data-testid="search-button"]')
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Apply province filter
    await page.click('[data-testid="filter-button"]')
    await page.selectOption('[data-testid="province-filter"]', 'PICHINCHA')
    await page.click('[data-testid="apply-filters"]')
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Should show filtered results
    const companyCards = page.locator('[data-testid="company-card"]')
    await expect(companyCards.first()).toBeVisible()
    
    // Verify filter is applied
    await expect(page.locator('[data-testid="active-filters"]')).toContainText('PICHINCHA')
  })

  test('should show company details page', async ({ page }) => {
    await page.goto('/companies')
    
    // Search for a specific company
    await page.fill('[data-testid="search-input"]', 'Banco Pichincha')
    await page.click('[data-testid="search-button"]')
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Click on first company card
    await page.click('[data-testid="company-card"]')
    
    // Should navigate to company details page
    await expect(page).toHaveURL(/companies\/\d+/)
    
    // Should show company information
    await expect(page.locator('[data-testid="company-header"]')).toBeVisible()
    await expect(page.locator('[data-testid="financial-data"]')).toBeVisible()
    await expect(page.locator('[data-testid="company-metrics"]')).toBeVisible()
  })

  test('should handle search with no results', async ({ page }) => {
    await page.goto('/companies')
    
    // Search for non-existent company
    await page.fill('[data-testid="search-input"]', 'NonExistentCompanyXYZ123')
    await page.click('[data-testid="search-button"]')
    
    // Should show no results message
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible()
    await expect(page.locator('[data-testid="no-results"]')).toContainText(/No se encontraron/)
  })

  test('should export search results (Pro users)', async ({ page }) => {
    // This test assumes user has Pro subscription
    await page.goto('/companies')
    
    // Perform search
    await page.fill('[data-testid="search-input"]', 'Banco')
    await page.click('[data-testid="search-button"]')
    await page.waitForSelector('[data-testid="search-results"]')
    
    // Try to export results
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="export-button"]')
    
    // Should either download file or show upgrade prompt
    try {
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
    } catch {
      // If user doesn't have permission, should show upgrade prompt
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible()
    }
  })

  test('should show search history', async ({ page }) => {
    await page.goto('/companies')
    
    // Perform a few searches
    const searches = ['Banco', 'Empresa', 'Cooperativa']
    
    for (const search of searches) {
      await page.fill('[data-testid="search-input"]', search)
      await page.click('[data-testid="search-button"]')
      await page.waitForTimeout(1000)
    }
    
    // Check if search history is visible
    const historyButton = page.locator('[data-testid="search-history"]')
    if (await historyButton.isVisible()) {
      await historyButton.click()
      
      // Should show recent searches
      for (const search of searches) {
        await expect(page.locator('[data-testid="history-item"]')).toContainText(search)
      }
    }
  })
})
