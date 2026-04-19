import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000'
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

async function clearSession(page) {
  await page.goto(`${BASE_URL}/vi/login`)
  await page.evaluate(() => localStorage.clear())
}

async function seedAuth(page, { admin = false } = {}) {
  const username = admin ? 'admin' : 'member1'
  const password = admin ? 'admin' : 'member1234'
  const loginPassword = admin ? 'admin' : 'member1234'
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: loginPassword }),
  })

  if (!response.ok) {
    throw new Error(`Login API failed for ${username}: ${response.status}`)
  }

  const tokens = await response.json()
  await page.evaluate(
    async ({ access, refresh, user }) => {
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem(
        'ils-auth-storage',
        JSON.stringify({ state: { user, accessToken: access, refreshToken: refresh }, version: 0 })
      )
    },
    {
      access: tokens.access,
      refresh: tokens.refresh,
      user: tokens.user,
    }
  )
  await page.reload({ waitUntil: 'load' })
}

async function textOrNull(locator) {
  try {
    return await locator.first().textContent()
  } catch {
    return null
  }
}

async function summarizePage(page, label) {
  const url = page.url()
  const h1 = await textOrNull(page.locator('h1'))
  const bodyText = await page.locator('body').innerText().catch(() => '')
  return {
    label,
    url,
    h1,
    bodySnippet: bodyText.slice(0, 500).replace(/\s+/g, ' ').trim(),
  }
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

const results = []

await clearSession(page)

await seedAuth(page, { admin: false })
results.push(await summarizePage(page, 'member-after-login'))

await page.goto(`${BASE_URL}/vi/quizzes`)
await page.waitForTimeout(2000)
results.push({
  label: 'member-catalog',
  url: page.url(),
  h1: await textOrNull(page.locator('h1')),
  links: await page.locator('a[href^="/vi/quizzes/"]').count().catch(() => 0),
  bodySnippet: (await page.locator('body').innerText().catch(() => '')).slice(0, 500).replace(/\s+/g, ' ').trim(),
})

await page.goto(`${BASE_URL}/vi/quizzes/1`)
await page.waitForTimeout(2000)
results.push({
  label: 'member-detail-1',
  url: page.url(),
  h1: await textOrNull(page.locator('h1')),
  sessionLinkCount: await page.locator('a[href="/vi/quizzes/1/session"]').count().catch(() => 0),
  bodySnippet: (await page.locator('body').innerText().catch(() => '')).slice(0, 500).replace(/\s+/g, ' ').trim(),
})

await page.goto(`${BASE_URL}/vi/quizzes/1/session`)
await page.waitForTimeout(5000)
results.push({
  label: 'member-session-1',
  url: page.url(),
  h1: await textOrNull(page.locator('h1')),
  bodySnippet: (await page.locator('body').innerText().catch(() => '')).slice(0, 700).replace(/\s+/g, ' ').trim(),
})

const adminContext = await browser.newContext()
const adminPage = await adminContext.newPage()
await clearSession(adminPage)
await seedAuth(adminPage, { admin: true })
results.push(await summarizePage(adminPage, 'admin-after-login'))

await adminPage.goto(`${BASE_URL}/vi/admin/quizzes`)
await adminPage.waitForTimeout(3000)
results.push({
  label: 'admin-quizzes',
  url: adminPage.url(),
  h1: await textOrNull(adminPage.locator('h1')),
  rows: await adminPage.locator('tbody tr').count().catch(() => 0),
  draftCount: await adminPage.locator('text=/Draft|Bản nháp|Nháp/i').count().catch(() => 0),
  createButton: await adminPage.locator('text=/Tạo quiz|Create/i').count().catch(() => 0),
  bodySnippet: (await adminPage.locator('body').innerText().catch(() => '')).slice(0, 700).replace(/\s+/g, ' ').trim(),
})

await adminPage.goto(`${BASE_URL}/vi/admin/quizzes/1`)
await adminPage.waitForTimeout(1500)
results.push({
  label: 'admin-quiz-detail-1',
  url: adminPage.url(),
  h1: await textOrNull(adminPage.locator('h1')),
  bodySnippet: (await adminPage.locator('body').innerText().catch(() => '')).slice(0, 500).replace(/\s+/g, ' ').trim(),
})

const memberAdminPage = await adminContext.newPage()
await clearSession(memberAdminPage)
await seedAuth(memberAdminPage, { admin: false })
await memberAdminPage.goto(`${BASE_URL}/vi/admin/quizzes`)
await memberAdminPage.waitForTimeout(1500)
results.push({
  label: 'member-admin-quizzes',
  url: memberAdminPage.url(),
  h1: await textOrNull(memberAdminPage.locator('h1')),
  bodySnippet: (await memberAdminPage.locator('body').innerText().catch(() => '')).slice(0, 500).replace(/\s+/g, ' ').trim(),
})

console.log(JSON.stringify(results, null, 2))

await context.close()
await adminContext.close()
await browser.close()
