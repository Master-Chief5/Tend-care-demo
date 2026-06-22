// Multi-role QA sweep (used by the /qa skill). Boots the running app, logs in as
// each demo persona, clicks through every bottom-nav tab, screenshots each, and
// collects page/console errors. Exits 1 if any runtime error fired, 2 if the dev
// server is unreachable.
//
//   cd web && VITE_DEMO_MODE=true npm run dev      # in one shell
//   node web/e2e/qa-sweep.mjs                       # in another
//
// Env: BASE_URL (default http://127.0.0.1:5173), OUT_DIR (default /tmp/qa-sweep),
//      CHROMIUM_PATH (default the web sandbox's pre-provisioned Chromium).
import fs from 'fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173'
const OUT = process.env.OUT_DIR || '/tmp/qa-sweep'
const PINNED = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const IGNORE = /ERR_CERT|favicon|manifest|Failed to load resource/i
fs.mkdirSync(OUT, { recursive: true })

// Use the pre-provisioned Chromium via playwright-core in the sandbox; fall back
// to a full `playwright` install (e.g. local terminal) otherwise.
let chromium, launchOpts
if (fs.existsSync(PINNED)) { chromium = (await import('playwright-core')).chromium; launchOpts = { executablePath: PINNED, args: ['--no-sandbox'] } }
else { chromium = (await import('playwright')).chromium; launchOpts = { args: ['--no-sandbox'] } }

const browser = await chromium.launch(launchOpts)
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const errors = []
let role = 'boot'
page.on('pageerror', e => errors.push(`[${role}] pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`[${role}] console: ${m.text()}`) })
const wait = ms => page.waitForTimeout(ms)
const noAnim = () => page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
} catch {
  console.error(`Could not reach ${BASE}. Start the demo dev server first:\n  cd web && VITE_DEMO_MODE=true npm run dev`)
  await browser.close(); process.exit(2)
}
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' }); await wait(500); await noAnim()

for (const [r, name] of [['supervisor', 'Lina R.'], ['manager', 'Devon P.'], ['staff', 'Aisha M.']]) {
  role = r
  const card = page.getByText(name, { exact: false }).first()
  if (!(await card.count())) { errors.push(`[${r}] demo login card not found — built with VITE_DEMO_MODE=true?`); break }
  await card.click().catch(() => {}); await wait(800); await noAnim()
  const tabs = page.locator('.web-tab-bar button')
  const n = await tabs.count()
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click().catch(() => {}); await wait(450); await noAnim()
    await page.screenshot({ path: `${OUT}/${r}-${i}.png` }).catch(() => {})
  }
  // Sign out so the next persona starts clean (data persists in the demo store).
  // Exact-match the "Me" tab — a substring match would also hit "Time".
  await page.locator('.web-tab-bar button', { hasText: /^Me$/ }).first().click().catch(() => {}); await wait(400)
  await page.getByRole('button', { name: /^Sign out$/ }).first().click().catch(() => {}); await wait(700); await noAnim()
}

await browser.close()
console.log(`Screenshots → ${OUT}`)
if (errors.length) { console.error(`QA sweep FAILED — ${errors.length} error(s):`); errors.forEach(e => console.error('  ' + e)); process.exit(1) }
console.log('QA sweep OK — all roles, all tabs, no runtime errors')
