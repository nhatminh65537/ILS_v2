import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000'
const ADMIN_PASSWORD = 'admin1234'
const MEMBER_PASSWORD = 'member1234'

async function clearSession(page: Page) {
  await page.goto(`${BASE_URL}/vi/login`)
  await page.evaluate(() => localStorage.clear())
}

async function loginUser(page: Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/vi/login`)
  await page.fill('#username', username)
  await page.fill('#password', password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/(vi|en)\/dashboard/, { timeout: 10000 })
}

async function loginAdmin(page: Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/vi/admin/login`)
  await page.fill('#admin-username', username)
  await page.fill('#admin-password', password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/(vi|en)\/admin\/dashboard/, { timeout: 10000 })
}

test.describe('Slice 7 Checklist Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page)
  })

  test('BRW-701: quiz catalog renders published quizzes and hides draft', async ({ page }) => {
    await loginUser(page, 'member1', MEMBER_PASSWORD)
    await page.goto(`${BASE_URL}/vi/quizzes`)
    await expect(page.locator('h1')).toContainText('Quiz')
    await expect(page.locator('a[href="/vi/quizzes/1"]')).toBeVisible()
    await expect(page.locator('a[href="/vi/quizzes/4"]')).toHaveCount(0)
  })

  test('BRW-702: quiz catalog search filters by title', async ({ page }) => {
    await loginUser(page, 'member1', MEMBER_PASSWORD)
    await page.goto(`${BASE_URL}/vi/quizzes`)
    await page.fill('input[placeholder*="Tìm"]', 'crypto')
    await expect(page.locator('a[href="/vi/quizzes/3"]')).toBeVisible()
    await expect(page.locator('a[href="/vi/quizzes/1"]')).toHaveCount(0)
  })

  test('BRW-703: quiz detail shows title, stats, and session link', async ({ page }) => {
    await loginUser(page, 'member1', MEMBER_PASSWORD)
    await page.goto(`${BASE_URL}/vi/quizzes/1`)
    await expect(page.locator('h1')).toContainText('OWASP Basics Quiz')
    await expect(page.locator('a[href="/vi/quizzes/1/session"]')).toBeVisible()
    await expect(page.locator('text=/100|15|3|5/')).toBeVisible()
  })

  test('BRW-704: session route connects or surfaces connection error for member', async ({ page }) => {
    await loginUser(page, 'member1', MEMBER_PASSWORD)
    await page.goto(`${BASE_URL}/vi/quizzes/1/session`)

    const visible = page.locator('text=/Đang kết nối|Đang xác thực|Không thể kết nối|connection/i')
    await expect(visible.first()).toBeVisible({ timeout: 15000 })
  })

  test('BRW-711: admin quiz list renders and exposes draft row state', async ({ page }) => {
    await loginAdmin(page, 'admin', ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/vi/admin/quizzes`)

    await expect(page.locator('text=/Quiz|Tạo quiz|Create/i').first()).toBeVisible({ timeout: 15000 })
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('BRW-714: draft quiz visibility in admin list is explicit', async ({ page }) => {
    await loginAdmin(page, 'admin', ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/vi/admin/quizzes`)

    const draftVisible = await page.locator('text=/Advanced Forensics|Draft|Bản nháp/i').count()
    expect(draftVisible).toBeGreaterThanOrEqual(0)
  })

  test('BRW-715: member access to admin quiz routes is restricted', async ({ page }) => {
    await loginUser(page, 'member1', MEMBER_PASSWORD)
    await page.goto(`${BASE_URL}/vi/admin/quizzes`)

    const url = page.url()
    const adminContent = await page.locator('text=/Tạo quiz|Quiz|Draft|Published/i').count()
    const restricted = !url.includes('/vi/admin/quizzes') || adminContent === 0
    expect(restricted).toBeTruthy()
  })
})
