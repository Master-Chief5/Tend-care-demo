import { chromium } from 'playwright-core'
import fs from 'fs'
fs.mkdirSync('/tmp/shots-setup', { recursive: true })
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true, args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const noAnim = () => page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
const shot = async (f) => { await noAnim(); await page.screenshot({ path: `/tmp/shots-setup/${f}.png` }) }

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)

await page.getByText('Lina R.', { exact: false }).first().click()
await page.waitForTimeout(700)

// Go to setup via the CTA
await page.getByRole('button', { name: /Add your first house/i }).click()
await page.waitForTimeout(400)
await shot('setup-screen')

// Check if the "Add house" button is visible/clickable vs the preview chip
const addBtn = page.getByRole('button', { name: /^Add house$/ })
const previewChip = page.locator('[style*="Preview as"], button').filter({ hasText: /preview as/i })
const addBtnBox = await addBtn.first().boundingBox()
const chipBox = await page.locator('.web-tab-bar').first().boundingBox().catch(() => null)

console.log('Add house button box:', addBtnBox)

// Also check the PREVIEW AS chip position
const allAbsolute = await page.evaluate(() => {
  const els = document.querySelectorAll('[style*="position: absolute"], [style*="position:absolute"]')
  return [...els].map(e => ({ tag: e.tagName, text: e.textContent.slice(0,30), rect: e.getBoundingClientRect() }))
})
console.log('Absolute elements:', JSON.stringify(allAbsolute, null, 2))
await shot('setup-annotated')
await browser.close()
