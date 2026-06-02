import { chromium } from 'playwright-core'
import fs from 'fs'
fs.mkdirSync('/tmp/shots-debug', { recursive: true })
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true, args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ERR: ' + m.text()) })
const noAnim = () => page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
const shot = async (f) => { await noAnim(); await page.screenshot({ path: `/tmp/shots-debug/${f}.png` }) }
const log = (...a) => console.log(...a)

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await shot('1-login')
log('page title:', await page.title())
log('visible text snippets:', await page.locator('body').innerText().then(t => t.slice(0,300)))

// Login as supervisor
const linaBtn = page.getByText('Lina R.', { exact: false }).first()
log('lina btn visible:', await linaBtn.isVisible().catch(() => false))
await linaBtn.click()
await page.waitForTimeout(700)
await shot('2-after-login')
log('after login text:', await page.locator('body').innerText().then(t => t.slice(0,300)))

// Try clicking "Add your first house"
const addFirstBtn = page.getByRole('button', { name: /Add your first house/i })
log('add first house btn count:', await addFirstBtn.count())
if (await addFirstBtn.count() > 0) {
  await addFirstBtn.first().click()
  await page.waitForTimeout(500)
  await shot('3-after-add-first-click')
  log('after click text:', await page.locator('body').innerText().then(t => t.slice(0,400)))
} else {
  log('button NOT found — looking for all buttons:')
  const btns = await page.locator('button').allTextContents()
  log('buttons:', btns.join(' | '))
}

// Look for the Add house form button
const addHouseBtn = page.getByRole('button', { name: /Add house/i })
log('add house btn count:', await addHouseBtn.count())
const allBtns = await page.locator('button').allTextContents()
log('all buttons:', allBtns.join(' | '))
await shot('4-setup-screen')

await browser.close()
log('=== ERRORS ===')
errs.forEach(e => log(e))
