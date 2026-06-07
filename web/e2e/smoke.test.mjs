// Headless smoke test (run by CI). Boots the built app in demo mode, logs in,
// and clicks through every bottom-nav tab, failing the build if any page error
// or console error fires. Catches the "it crashes / white-screens on a tab"
// class of regression before merge.
//
// Run locally:  BASE_URL=http://127.0.0.1:5173 node e2e/smoke.test.mjs
// (with `VITE_DEMO_MODE=true npm run dev` running)
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173'
const IGNORE = /ERR_CERT|favicon|manifest|Failed to load resource/i

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push('console: ' + m.text()) })

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const lina = page.getByText('Lina R.', { exact: false }).first()
  if (!(await lina.count())) {
    console.error('FAIL: demo login not found — was the app built with VITE_DEMO_MODE=true?')
    process.exit(1)
  }
  await lina.click()
  await page.waitForTimeout(800)

  const tabs = page.locator('.web-tab-bar button')
  const n = await tabs.count()
  if (n === 0) { console.error('FAIL: no navigation tabs rendered after login'); process.exit(1) }
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click().catch(() => {})
    await page.waitForTimeout(450)
  }
} catch (e) {
  errors.push('exception: ' + (e?.message || e))
} finally {
  await browser.close()
}

if (errors.length) {
  console.error(`Smoke FAILED with ${errors.length} error(s):`)
  errors.forEach(e => console.error('  ' + e))
  process.exit(1)
}
console.log('Smoke OK — no runtime errors across the app shell + all tabs')
