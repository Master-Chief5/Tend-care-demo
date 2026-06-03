import { chromium } from 'playwright-core'
import fs from 'fs'
fs.mkdirSync('/tmp/shots-fix', { recursive: true })
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true, args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const noAnim = () => page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
const shot = async (f) => { await noAnim(); await page.screenshot({ path: `/tmp/shots-fix/${f}.png` }) }

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.getByText('Lina R.', { exact: false }).first().click()
await page.waitForTimeout(700)

// Check setup screen
await page.getByRole('button', { name: /Add your first house/i }).click()
await page.waitForTimeout(400)
await shot('setup-fixed')

// Check button positions
const chipBox = await page.evaluate(() => {
  const chip = document.querySelector('[style*="position: absolute"]')
  return chip ? chip.getBoundingClientRect() : null
})
console.log('PREVIEW AS chip:', chipBox)

const addBtn = page.getByRole('button', { name: /Add house/i }).first()
const addBtnBox = await addBtn.boundingBox()
console.log('Add house button:', addBtnBox)

const overlap = chipBox && addBtnBox && 
  chipBox.top < addBtnBox.bottom && chipBox.bottom > addBtnBox.top &&
  chipBox.left < addBtnBox.right && chipBox.right > addBtnBox.left
console.log('OVERLAP?', overlap)

// Navigate to Driving and check
await page.getByRole('button', { name: /Add house/i }).first().click()
await page.waitForTimeout(300)
await page.getByPlaceholder('House name').fill('Oak House')
await page.getByPlaceholder('Short code').fill('OAK')
await page.getByRole('button', { name: /Create house/ }).click()
await page.waitForTimeout(500)

await page.locator('.web-tab-bar button', { hasText: 'Driving' }).first().click()
await page.waitForTimeout(600)
await shot('driving-fixed')

const logBtn = page.getByRole('button', { name: /Log trip/ })
const logBtnBox = await logBtn.boundingBox()
console.log('Log trip button:', logBtnBox)
const overlapDrive = chipBox && logBtnBox &&
  chipBox.top < logBtnBox.bottom && chipBox.bottom > logBtnBox.top &&
  chipBox.left < logBtnBox.right && chipBox.right > logBtnBox.left
console.log('Driving overlap?', overlapDrive)

await shot('houses-fixed')

await browser.close()
