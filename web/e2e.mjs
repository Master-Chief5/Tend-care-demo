import { chromium } from 'playwright-core'
import fs from 'fs'
fs.mkdirSync('/tmp/shots', { recursive: true })
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: true, args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()) })
const noAnim = () => page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
const nav = (label) => page.locator('.web-tab-bar button', { hasText: label }).first()
const shot = async (f) => { await noAnim(); await page.screenshot({ path: `/tmp/shots/${f}.png` }) }
const log = (...a) => console.log(...a)

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(500); await noAnim()

// login supervisor
await page.getByText('Lina R.', { exact: false }).first().click()
await page.waitForTimeout(700)
log('logged in')

// ── 1. Add two houses ─────────────────────────────────────────
await page.getByRole('button', { name: /Add your first house/i }).click()
await page.waitForTimeout(400)
// now on the House setup screen — open the form
await page.getByRole('button', { name: /Add house/i }).first().click()
await page.waitForTimeout(300)
await page.getByPlaceholder('House name (e.g. Oak House)').fill('Oak House')
await page.getByPlaceholder('Short code (e.g. OAK)').fill('OAK')
await page.getByPlaceholder('Branch (e.g. North)').fill('North')
await page.getByPlaceholder('Address').fill('142 Oak Lane')
await page.getByPlaceholder('House manager name (optional)').fill('Aisha M.')
await page.getByRole('button', { name: /^Create house$/ }).click()
await page.waitForTimeout(600)
log('house 1 added')

// still on setup screen — add second house
await page.getByRole('button', { name: /Add house/i }).first().click()
await page.waitForTimeout(300)
await page.getByPlaceholder('House name (e.g. Oak House)').fill('Willow Run')
await page.getByPlaceholder('Short code (e.g. OAK)').fill('WLW')
await page.getByPlaceholder('Branch (e.g. North)').fill('North')
await page.getByPlaceholder('Address').fill('318 Willow Ct')
await page.getByPlaceholder('House manager name (optional)').fill('Devon P.')
await page.getByRole('button', { name: /^Create house$/ }).click()
await page.waitForTimeout(600)
log('house 2 added')
await nav('Houses').click(); await page.waitForTimeout(600)
await shot('f1-houses')

// ── 2. Add staff, assign to Oak ───────────────────────────────
await nav('Me').click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: /^Add$/ }).click()
await page.waitForTimeout(400)
await page.getByPlaceholder('Full name').fill('Jay Brooks')
await page.getByPlaceholder('Email').fill('jay@oakhouse.com')
// role select -> DSP default; house select -> first (Oak)
await page.getByRole('button', { name: /Add staff member/ }).click()
await page.waitForTimeout(500)
// add a second staff
await page.getByRole('button', { name: /^Add$/ }).click()
await page.waitForTimeout(400)
await page.getByPlaceholder('Full name').fill('Carmen Vela')
await page.getByPlaceholder('Email').fill('carmen@oakhouse.com')
await page.getByRole('button', { name: /Add staff member/ }).click()
await page.waitForTimeout(500)
log('staff added')
await shot('f2-staff')

// ── 3. Add a shift (strict staff picker) ──────────────────────
await nav('Schedule').click(); await page.waitForTimeout(600)
// open the add-shift modal: the only text-less svg button in the header
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.phone-screen button')]
  const t = btns.find(b => b.textContent.trim() === '' && b.querySelector('svg') && b.getBoundingClientRect().top < 160)
  t?.click()
})
await page.waitForTimeout(500)
if (await page.getByText('Add shift').count()) {
  log('shift modal open')
  const modalSelects = page.locator('select')
  log('selects in modal:', await modalSelects.count())
  // 1st select = staff (choose Jay Brooks), then submit
  await modalSelects.first().selectOption({ index: 1 }).catch(e => log('staff sel err', e.message))
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: /^Add shift$/ }).last().click().catch(e => log('submit err', e.message))
  await page.waitForTimeout(700)
} else {
  log('shift modal did NOT open')
}
await shot('f3-schedule')

// ── 4. Add a trip ─────────────────────────────────────────────
await nav('Driving').click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: /Log trip/ }).click().catch(()=>{})
await page.waitForTimeout(400)
if (await page.getByText('Log a trip').count() || await page.getByPlaceholder('Resident name').count()) {
  await page.getByPlaceholder('Resident name').fill('M. Lee')
  await page.getByPlaceholder(/Destination/).fill('Dr. Patel')
  await page.getByPlaceholder('Driver name').fill('Aisha M.')
  await page.getByPlaceholder('Miles').fill('4.2')
  await page.getByRole('button', { name: /Log trip|Save/ }).last().click()
  await page.waitForTimeout(500)
  log('trip added')
}
// add a vehicle
await page.getByRole('button', { name: /Add vehicle/ }).first().click().catch(()=>{})
await page.waitForTimeout(400)
if (await page.getByPlaceholder(/Vehicle name/).count()) {
  await page.getByPlaceholder(/Vehicle name/).fill("Van #2 · Sienna '22")
  await page.getByPlaceholder('Plate').fill('ABC-1234')
  await page.getByPlaceholder('Mileage').fill('48000')
  await page.getByRole('button', { name: /Add vehicle/ }).last().click()
  await page.waitForTimeout(500)
  log('vehicle added')
}
await shot('f4-driving')

console.log('=== ERRORS (' + errs.length + ') ===')
errs.slice(0, 20).forEach(e => console.log(e))
await browser.close()
console.log('done')
