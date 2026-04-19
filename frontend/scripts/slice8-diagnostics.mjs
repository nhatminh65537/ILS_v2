import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000'

async function clearSession(page) {
  await page.goto(`${BASE_URL}/vi/login`)
  await page.evaluate(() => localStorage.clear())
}

async function loginUser(page, username, password, locale = 'vi') {
  await page.goto(`${BASE_URL}/${locale}/login`, { waitUntil: 'load' })
  await page.fill('#username', username)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1800)
}

async function loginAdmin(page, username, password, locale = 'vi') {
  await page.goto(`${BASE_URL}/${locale}/admin/login`, { waitUntil: 'load' })
  await page.fill('#admin-username', username)
  await page.fill('#admin-password', password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2200)
}

async function textOrNull(page, selector) {
  try {
    const el = page.locator(selector).first()
    return await el.textContent()
  } catch {
    return null
  }
}

async function wireApiProxy(context) {
  await context.route('http://localhost:4000/api/**', async (route) => {
    const upstreamUrl = route.request().url().replace('http://localhost:4000', 'http://localhost:8000')
    const upstreamResponse = await route.fetch({ url: upstreamUrl })
    await route.fulfill({ response: upstreamResponse })
  })
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const memberContext = await browser.newContext()
  const memberPage = await memberContext.newPage()
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()

  await wireApiProxy(memberContext)
  await wireApiProxy(adminContext)

  const results = []

  // Member flows
  await clearSession(memberPage)
  await loginUser(memberPage, 'member1', 'member1234')

  await memberPage.goto(`${BASE_URL}/vi/profile/settings`, { waitUntil: 'load' })
  await memberPage.waitForTimeout(2800)
  results.push({
    label: 'member-profile-settings-vi',
    url: memberPage.url(),
    h1: await textOrNull(memberPage, 'h1'),
    hasDisplayNameInput: (await memberPage.locator('#displayName').count()) > 0,
    hasUsernameInput: (await memberPage.locator('#username').count()) > 0,
    hasSaveProfile: (await memberPage.locator('button:has-text("Lưu hồ sơ")').count()) > 0,
    hasSaveSettings: (await memberPage.locator('button:has-text("Lưu cài đặt")').count()) > 0,
    hasSaveAccount: (await memberPage.locator('button:has-text("Lưu tài khoản")').count()) > 0,
  })

  const canSaveProfile = (await memberPage.locator('#displayName').count()) > 0
  if (canSaveProfile) {
    await memberPage.fill('#displayName', `Member One ${Date.now()}`)
    await memberPage.locator('button:has-text("Lưu hồ sơ")').click()
    await memberPage.waitForTimeout(1700)
  }
  results.push({
    label: 'member-profile-save',
    canSaveProfile,
    saveSuccessCount: await memberPage.locator('text=Đã lưu thành công.').count(),
    saveErrorCount: await memberPage.locator('text=/Lưu thất bại|save failed/i').count(),
  })

  const hasEntryYear = (await memberPage.locator('#entryYear').count()) > 0
  const minAttr = hasEntryYear ? await memberPage.locator('#entryYear').getAttribute('min') : null
  const maxAttr = hasEntryYear ? await memberPage.locator('#entryYear').getAttribute('max') : null
  results.push({
    label: 'member-entry-year-constraints',
    hasEntryYear,
    min: minAttr,
    max: maxAttr,
  })

  await memberPage.goto(`${BASE_URL}/en/profile/settings`, { waitUntil: 'load' })
  await memberPage.waitForTimeout(2000)
  results.push({
    label: 'member-profile-settings-en',
    url: memberPage.url(),
    h1: await textOrNull(memberPage, 'h1'),
    hasDisplayNameInput: (await memberPage.locator('#displayName').count()) > 0,
  })

  await memberPage.goto(`${BASE_URL}/vi/profile/sessions`, { waitUntil: 'load' })
  await memberPage.waitForTimeout(2500)
  const sessionRowsBefore = await memberPage.locator('tbody tr').count()
  const revokeButtonsEnabledBefore = await memberPage.locator('button:has-text("Thu hồi"):not([disabled])').count()
  results.push({
    label: 'member-sessions-list',
    url: memberPage.url(),
    rows: sessionRowsBefore,
    enabledRevokeButtons: revokeButtonsEnabledBefore,
    hasRevokeAllButton: (await memberPage.locator('button:has-text("Thu hồi tất cả phiên khác")').count()) > 0,
  })

  if (revokeButtonsEnabledBefore > 0) {
    await memberPage.locator('button:has-text("Thu hồi"):not([disabled])').first().click()
    await memberPage.waitForTimeout(400)
    await memberPage.locator('button:has-text("Xác nhận")').last().click()
    await memberPage.waitForTimeout(1500)
  }

  results.push({
    label: 'member-session-revoke-one',
    successCount: await memberPage.locator('text=Thu hồi phiên thành công.').count(),
    rowsAfter: await memberPage.locator('tbody tr').count(),
  })

  // Public profile
  await memberPage.goto(`${BASE_URL}/vi/profile/member1`, { waitUntil: 'load' })
  await memberPage.waitForTimeout(2000)
  results.push({
    label: 'public-profile-member1',
    url: memberPage.url(),
    hasProfileTitle: (await memberPage.locator('h1:has-text("Hồ sơ người dùng")').count()) > 0,
    hasActivitySection: (await memberPage.locator('text=Hoạt động gần đây').count()) > 0,
  })

  // Admin users page with admin auth
  await clearSession(adminPage)
  await loginAdmin(adminPage, 'admin', 'admin1234')
  await adminPage.goto(`${BASE_URL}/vi/admin/users`, { waitUntil: 'load' })
  await adminPage.waitForTimeout(2500)
  results.push({
    label: 'admin-users-list',
    url: adminPage.url(),
    h1: await textOrNull(adminPage, 'h1'),
    rows: await adminPage.locator('tbody tr').count(),
    createButtonCount: await adminPage.locator('button:has-text("Tạo người dùng")').count(),
  })

  // Member tries admin users
  await clearSession(memberPage)
  await loginUser(memberPage, 'member1', 'member1234')
  await memberPage.goto(`${BASE_URL}/vi/admin/users`, { waitUntil: 'load' })
  await memberPage.waitForTimeout(1500)
  results.push({
    label: 'member-admin-users-access',
    url: memberPage.url(),
    h1: await textOrNull(memberPage, 'h1'),
    hasUsersTable: (await memberPage.locator('tbody tr').count()) > 0,
  })

  console.log(JSON.stringify(results, null, 2))

  await memberContext.close()
  await adminContext.close()
  await browser.close()
}

await run()
