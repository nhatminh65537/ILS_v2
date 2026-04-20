import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000'
const ADMIN_PASSWORD = 'admin1234'
const EDITOR_PASSWORD = 'editor1234'
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
}

async function loginAdmin(page: Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/vi/admin/login`)
  await page.fill('#admin-username', username)
  await page.fill('#admin-password', password)
  await page.locator('button[type="submit"]').click()
}

test.describe('Slice 1-4 Checklist Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page)
  })

  test('BRW-102: register password mismatch shows validation and no navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/vi/register`)
    await page.fill('#username', 'user_mismatch_01')
    await page.fill('#email', 'mismatch01@test.local')
    await page.fill('#password', 'Password123!')
    await page.fill('#confirmPassword', 'Password999!')
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/vi\/register/)
    await expect(page.locator('p.text-destructive')).toBeVisible()
  })

  test('BRW-104: member login navigates away from login and token is set', async ({ page }) => {
    await loginUser(page, 'member1', MEMBER_PASSWORD)

    await page.waitForURL(/\/(vi|en)\/(dashboard|admin)/, { timeout: 10000 })
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeTruthy()
  })

  test('BRW-106: invalid user login stays on login with error', async ({ page }) => {
    await loginUser(page, 'member1', 'wrong-password')

    await expect(page).toHaveURL(/\/vi\/login/)
    await expect(page.locator('p.text-destructive')).toBeVisible()
  })

  test('BRW-202: member access to admin RBAC is restricted', async ({ page }) => {
    await loginUser(page, 'member1', MEMBER_PASSWORD)
    await page.waitForURL(/\/(vi|en)\/dashboard/, { timeout: 10000 })
    await page.goto(`${BASE_URL}/vi/admin/rbac`)
    await page.waitForLoadState('networkidle')

    const restricted = !page.url().includes('/vi/admin/rbac')
    expect(restricted).toBeTruthy()
  })

  test('BRW-203: editor RBAC behavior is policy-consistent (page loads or read-only hint)', async ({ page }) => {
    await loginUser(page, 'editor1', EDITOR_PASSWORD)
    await page.waitForURL(/\/(vi|en)\/dashboard/, { timeout: 10000 })
    await page.goto(`${BASE_URL}/vi/admin/rbac`)
    await page.waitForLoadState('networkidle')

    const loadedRoleContent = await page.getByText(/vai tr[oò]|quy[eề]n|role|permission/i).count()
    const readonlyHint = await page.getByText(/ch[iỉ] xem|read only|read-only/i).count()
    expect(loadedRoleContent > 0 || readonlyHint > 0).toBeTruthy()
  })

  test('BRW-204: create-role action visibility differs between admin and editor', async ({ page, browser }) => {
    await loginAdmin(page, 'admin', ADMIN_PASSWORD)
    await page.waitForURL(/\/(vi|en)\/admin\/dashboard/, { timeout: 10000 })
    await page.goto(`${BASE_URL}/vi/admin/rbac`)
    await page.waitForLoadState('networkidle')
    const adminCreateRoleVisible = (await page.getByRole('button', { name: /tạo vai trò/i }).count()) > 0

    const editorContext = await browser.newContext()
    const editorPage = await editorContext.newPage()
    await clearSession(editorPage)
    await loginUser(editorPage, 'editor1', EDITOR_PASSWORD)
    await editorPage.waitForURL(/\/(vi|en)\/dashboard/, { timeout: 10000 })
    await editorPage.goto(`${BASE_URL}/vi/admin/rbac`)
    await editorPage.waitForLoadState('networkidle')
    const editorCreateRoleVisible =
      (await editorPage.getByRole('button', { name: /tạo vai trò/i }).count()) > 0

    await editorContext.close()

    expect(adminCreateRoleVisible && !editorCreateRoleVisible).toBeTruthy()
  })

  test('BRW-302: editable config key can be edited and saved', async ({ page }) => {
    await loginAdmin(page, 'admin', ADMIN_PASSWORD)
    await page.waitForURL(/\/(vi|en)\/admin\/dashboard/, { timeout: 10000 })
    await page.goto(`${BASE_URL}/vi/admin/config`)
    await page.waitForLoadState('networkidle')

    const editableCard = page
      .locator('article')
      .filter({ hasText: /string/i })
      .filter({ hasNotText: /không cho sửa/i })
      .first()
    await expect(editableCard).toBeVisible()
    await editableCard.getByRole('button', { name: /sửa/i }).click()

    const input = editableCard.locator('input[type="text"]').first()
    await input.fill(`updated-${Date.now()}`)
    await editableCard.getByRole('button', { name: /lưu/i }).click()

    await expect(page.getByText(/lưu cấu hình thành công/i)).toBeVisible({ timeout: 8000 })
  })

  test('BRW-303: read-only config key blocks update action', async ({ page }) => {
    await loginAdmin(page, 'admin', ADMIN_PASSWORD)
    await page.waitForURL(/\/(vi|en)\/admin\/dashboard/, { timeout: 10000 })
    await page.goto(`${BASE_URL}/vi/admin/config`)
    await page.waitForLoadState('networkidle')

    const readOnlyCard = page.locator('article').filter({ hasText: /không cho sửa/i }).first()
    await expect(readOnlyCard).toBeVisible()
    await expect(readOnlyCard.getByRole('button', { name: /sửa/i })).toHaveCount(0)
  })

  test('BRW-304: secret config value is masked by default', async ({ page }) => {
    await loginAdmin(page, 'admin', ADMIN_PASSWORD)
    await page.waitForURL(/\/(vi|en)\/admin\/dashboard/, { timeout: 10000 })
    await page.goto(`${BASE_URL}/vi/admin/config`)
    await page.waitForLoadState('networkidle')

    const secretCard = page.locator('article').filter({ hasText: /secret/i }).first()
    await expect(secretCard).toBeVisible()
    await expect(secretCard.locator('pre')).toContainText('***')
  })

  test('BRW-305: secret update requires confirmation dialog', async ({ page }) => {
    await loginAdmin(page, 'admin', ADMIN_PASSWORD)
    await page.waitForURL(/\/(vi|en)\/admin\/dashboard/, { timeout: 10000 })
    await page.goto(`${BASE_URL}/vi/admin/config`)
    await page.waitForLoadState('networkidle')

    const secretCard = page.locator('article').filter({ hasText: /secret/i }).first()
    await expect(secretCard).toBeVisible()

    await secretCard.getByRole('button', { name: /sửa/i }).click()
    await secretCard.locator('input[type="text"]').fill(`secret-${Date.now()}`)
    await secretCard.getByRole('button', { name: /lưu/i }).click()

    await expect(page.getByText(/xác nhận cập nhật giá trị bí mật/i)).toBeVisible({ timeout: 8000 })
  })

  test('BRW-401: both /vi/login and /en/login routes render login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/vi/login`)
    await expect(page.locator('#username')).toBeVisible()

    await page.goto(`${BASE_URL}/en/login`)
    await expect(page.locator('#username')).toBeVisible()
  })

  test('BRW-402: admin navigation shell is visible after login', async ({ page }) => {
    await loginAdmin(page, 'admin', ADMIN_PASSWORD)
    await page.waitForURL(/\/(vi|en)\/admin\/dashboard/, { timeout: 10000 })
    await page.goto(`${BASE_URL}/vi/admin/rbac`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/RBAC|Vai tr[oò]|Quy[eề]n|Cấu hình/i).first()).toBeVisible()
  })

  test('BRW-403: unauthenticated access to admin protected route redirects to admin login', async ({ page }) => {
    await clearSession(page)
    await page.goto(`${BASE_URL}/vi/admin/rbac`)

    await page.waitForURL(/\/vi\/admin\/login/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/vi\/admin\/login/)
  })
})
