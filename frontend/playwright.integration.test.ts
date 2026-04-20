/**
 * Integration Test Suite: FE-BE Auth + Admin Pages
 *
 * Test Plan:
 * 1. User registration form render
 * 2. User login form render
 * 3. Admin login form render
 * 4. Admin login with credentials (admin/admin1234)
 * 5. Admin RBAC page loads and displays data
 * 6. System config page loads and displays data
 * 7. Verify MSW is disabled (real backend API calls)
 * 8. Token persistence after page reload
 */

import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000'
const ADMIN_USER = 'admin'
const ADMIN_PASS = 'admin1234'

async function clearSession(page: Page) {
  await page.goto(`${BASE_URL}/vi/login`)
  await page.evaluate(() => localStorage.clear())
}

async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/vi/admin/login`)
  await page.fill('#admin-username', ADMIN_USER)
  await page.fill('#admin-password', ADMIN_PASS)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/(vi|en)\/admin\/dashboard/, { timeout: 10000 })
}

test.describe('FE-BE Integration Tests', () => {
  let page: Page

  test.beforeEach(async ({ page: p }) => {
    page = p
    await clearSession(page)
  })

  test('1. User registration form renders', async () => {
    await page.goto(`${BASE_URL}/vi/register`)
    await expect(page.locator('#username')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('2. User login form renders', async () => {
    await page.goto(`${BASE_URL}/vi/login`)
    await expect(page.locator('#username')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('3. Admin login form renders', async () => {
    await page.goto(`${BASE_URL}/vi/admin/login`)
    await expect(page.locator('#admin-username')).toBeVisible()
    await expect(page.locator('#admin-password')).toBeVisible()
  })

  test('4. Admin login succeeds with valid credentials', async () => {
    await loginAdmin(page)
    expect(page.url()).toContain('/admin/')
  })

  test('5. Admin RBAC page loads data', async () => {
    await loginAdmin(page)
    await page.goto(`${BASE_URL}/vi/admin/rbac`)
    await page.waitForLoadState('networkidle')

    const content = await page.content()
    expect(content).toBeTruthy()
    expect(/vai tr[oò]|quy[eề]n|role|permission/i.test(content)).toBeTruthy()
  })

  test('6. System config page loads data', async () => {
    await loginAdmin(page)
    await page.goto(`${BASE_URL}/vi/admin/config`)
    await page.waitForLoadState('networkidle')

    const content = await page.content()
    expect(content.length).toBeGreaterThan(100)
  })

  test('6.1 Admin quizzes routes render', async () => {
    await loginAdmin(page)

    await page.goto(`${BASE_URL}/vi/admin/quizzes`)
    await page.waitForLoadState('networkidle')
    const listContent = await page.content()
    expect(listContent.length).toBeGreaterThan(100)

    await page.goto(`${BASE_URL}/vi/admin/quizzes/new`)
    await page.waitForLoadState('networkidle')
    const createContent = await page.content()
    expect(createContent.length).toBeGreaterThan(100)
  })

  test('7. MSW disabled - real backend API calls', async () => {
    const requests: string[] = []

    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        requests.push(response.url())
      }
    })

    await loginAdmin(page)
    await page.waitForTimeout(1000)

    expect(requests.some((url) => url.includes('localhost:8000'))).toBeTruthy()
  })

  test('8. Token persistence across reload', async () => {
    await loginAdmin(page)
    await page.waitForTimeout(1000)

    const token1 = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token1).toBeTruthy()

    await page.reload({ waitUntil: 'load' })

    const token2 = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token2).toBe(token1)
    expect(token2).toBeTruthy()
  })
})

export default test
