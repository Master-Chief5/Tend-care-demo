// In-memory demo backend.
//
// When the app runs in demo mode there is no Supabase connection, so every
// data function in db.js delegates here instead. The store starts COMPLETELY
// EMPTY — the demo represents a brand-new account. Whatever you add through the
// app's own UI (houses, shifts, trips, vehicles, staff, supplies…) lives here
// and shows up exactly as it would against a real backend.
//
// State is persisted to localStorage so a page refresh keeps the session's
// data. Houses use id === slug so there is never a UUID/slug mismatch.

const KEY = 'tend-demo-store-v1'

function blank() {
  return { houses: [], shifts: [], staff: [], trips: [], vehicles: [], resources: [], residents: [], tasks: [], medAlerts: [], shiftNotes: [], items: [], meds: [], medAdmins: [], prnLog: [], dailyLog: [], incidents: [], drills: [], goals: [], goalData: [], healthLogs: [], messages: [], punches: [], shiftEditRequests: [], timeOffRequests: [], announcements: [], announcementReads: [], announcementVotes: [], recognitions: [], scheduleTemplates: [], shiftDocProgress: [], residentNotes: [], kbArticles: [], events: [], eventRsvps: [], shiftEvents: [], formTemplates: [], formSubmissions: [], surveys: [], surveyResponses: [], quickTasks: [], contacts: [], tickets: [], appointments: [], residentFunds: [], behaviorPlans: [], behaviorEvents: [], courses: [], courseCompletions: [], smartGroups: [], swapRequests: [] }
}

function load() {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY)
    if (raw) return { ...blank(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return blank()
}

let store = load()
let seq = 0

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* ignore */ }
}

function uid(prefix = 'd') { return `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}` }
function now() { return new Date().toISOString() }
// Local date (not UTC) so "today" matches the user's wall clock.
const _ds = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function todayStr() { return _ds(new Date()) }
function asDateStr(d) { return typeof d === 'string' ? d : _ds(d) }

// Build the `houses(...)` join object the screens expect on trips/resources/etc.
function houseJoin(houseId) {
  const h = store.houses.find(x => x.id === houseId)
  return h ? { slug: h.slug, name: h.name, color: h.color, short: h.short } : null
}

export function demoResetStore() { store = blank(); persist() }

// ── One-time org seed ────────────────────────────────────────────────────────
// The demo store starts empty (a brand-new account), so a first-time visitor
// otherwise lands on "No houses yet" across every screen. Seed a small, realistic
// org ONCE when the store has no houses, building it entirely through the same
// demoAdd*/demoSeed* helpers the UI uses so every shape stays correct.
//
// Guarded on `houses.length`, so it never duplicates and demoResetStore() still
// clears everything — the next houses read simply re-seeds, the same lazy
// behaviour as the time-clock / time-off / announcements seeders further down.
// Staff names match SEED_TC_STAFF so the seeded punches line up with the roster.
const DEMO_ORG = 'demo-org'

export function demoSeedOrg(orgId = DEMO_ORG) {
  if (store.houses.length > 0) return

  // Houses ────────────────────────────────────────────────────────────────────
  const maple = demoAddHouse({ name: 'Maple House', short: 'MAP', color: '#4a6b56', address: '128 Maple Ave',    branch: 'Riverside', managerName: 'Priya Nair' })
  const oak   = demoAddHouse({ name: 'Oak House',   short: 'OAK', color: '#b05c3c', address: '54 Oakdale Rd',     branch: 'Riverside', managerName: 'Marcus Lewis' })
  const birch = demoAddHouse({ name: 'Birch House', short: 'BIR', color: '#5a7a9a', address: '901 Birchwood Ln',  branch: 'Northside', managerName: 'Toni Alvarez' })

  // Staff (names mirror the time-clock seed roster so punches map to real people)
  const staff = [
    demoInviteStaff(maple.id, { name: 'Priya Nair',    email: 'priya@tend.care',  role: 'manager' }),
    demoInviteStaff(maple.id, { name: 'Aisha Mendez',  email: 'aisha@tend.care',  role: 'staff' }),
    demoInviteStaff(maple.id, { name: 'Jay Brooks',    email: 'jay@tend.care',    role: 'staff' }),
    demoInviteStaff(oak.id,   { name: 'Marcus Lewis',  email: 'marcus@tend.care', role: 'manager' }),
    demoInviteStaff(oak.id,   { name: 'Reni Tate',     email: 'reni@tend.care',   role: 'staff' }),
    demoInviteStaff(birch.id, { name: 'Toni Alvarez',  email: 'toni@tend.care',   role: 'manager' }),
    demoInviteStaff(birch.id, { name: 'Sam Okafor',    email: 'sam@tend.care',    role: 'staff' }),
  ]
  const staffId = (name) => (staff.find(s => s.name === name) || {}).id || null

  // Residents — with quick-reference safety flags + allergies (drive the Care tab)
  const robertHayes = demoAddResident(maple.id, { name: 'Robert Hayes',    room: '1', flags: ['Fall risk', 'Diabetic'],           allergies: 'Penicillin',         diagnoses: 'Type 2 diabetes, mild dementia', diet: 'Low sugar' })
  const lindaPark = demoAddResident(maple.id, { name: 'Linda Park',      room: '2', flags: ['Seizure', '1:1 support'],          allergies: 'Latex',              diagnoses: 'Epilepsy',                       diet: 'Regular' })
  const jamesWhitaker = demoAddResident(oak.id,   { name: 'James Whitaker',  room: '1', flags: ['Behavior plan', 'Elopement risk'], allergies: 'Peanuts, tree nuts', diagnoses: 'Autism spectrum disorder',       diet: 'Gluten-free' })
  const mariaGomez = demoAddResident(oak.id,   { name: 'Maria Gomez',     room: '2', flags: ['Allergy'],                         allergies: 'Sulfa drugs',        diagnoses: 'Generalized anxiety',            diet: 'Regular' })
  const danielCho = demoAddResident(birch.id, { name: 'Daniel Cho',      room: '1', flags: ['Fall risk'],                       allergies: '',                   diagnoses: 'Cerebral palsy',                 diet: 'Pureed' })
  const aaliyahJohnson = demoAddResident(birch.id, { name: 'Aaliyah Johnson', room: '2', flags: ['Diet', 'Diabetic'],               allergies: 'Shellfish',          diagnoses: 'Type 1 diabetes',                diet: 'Carb-controlled' })

  // Today's shifts (+ a couple tomorrow so the week view isn't bare).
  const dateFor = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return _ds(d) }
  const shift = (house, who, role, s, e, off = 0, requiredCert = null) =>
    demoAddShift(house.id, { personName: who, staffId: staffId(who), role, startHour: s, endHour: e, date: dateFor(off), requiredCert })
  // Maple morning is a med-pass: it requires an active Medication Administration cert.
  shift(maple, 'Aisha Mendez', 'DSP',     7, 15, 0, 'Medication Administration')
  shift(maple, 'Jay Brooks',   'DSP',    15, 23)
  shift(maple, 'Priya Nair',   'Manager', 9, 17)
  shift(oak,   'Reni Tate',    'DSP',     7, 15)
  shift(oak,   'Marcus Lewis', 'Manager', 9, 17)
  shift(birch, 'Sam Okafor',   'DSP',     7, 15)
  shift(birch, 'Toni Alvarez', 'Manager', 8, 16)
  shift(maple, 'Aisha Mendez', 'DSP',     7, 15, 1)
  shift(oak,   'Reni Tate',    'DSP',     7, 15, 1)
  // The normal seeded shifts read as already published (the week is live).
  const publishedAt = now()
  for (const s of store.shifts) { if (s.status !== 'open') s.published_at = publishedAt }
  // One open overnight to show a coverage gap.
  const open = demoAddShift(oak.id, { personName: '', role: 'DSP', startHour: 23, endHour: 7, date: dateFor(0) })
  demoUpdateShift(open.id, { status: 'open' })
  // An open evening shift at Maple (the demo staff's house) TODAY so the DSP
  // claim flow is visible the moment they open the Schedule (default day view)
  // — unpublished open shifts stay claimable. A second one tomorrow shows the
  // gap persists across the week.
  const mapleOpen = demoAddShift(maple.id, { personName: '', role: 'DSP', startHour: 15, endHour: 23, date: dateFor(0) })
  demoUpdateShift(mapleOpen.id, { status: 'open' })
  const mapleOpen2 = demoAddShift(maple.id, { personName: '', role: 'DSP', startHour: 15, endHour: 23, date: dateFor(1) })
  demoUpdateShift(mapleOpen2.id, { status: 'open' })

  // Staff certifications with varied expiry so the org-wide Compliance dashboard
  // has real data (a couple expired, a couple expiring soon, the rest valid).
  const setCerts = (name, certs) => { const id = staffId(name); if (id) demoUpdateStaff(id, { certs }) }
  setCerts('Aisha Mendez', [{ name: 'CPR / First Aid', expires: dateFor(28) }, { name: 'Medication Administration', expires: dateFor(310) }])
  setCerts('Jay Brooks',   [{ name: 'CPR / First Aid', expires: dateFor(-12) }])
  setCerts('Reni Tate',    [{ name: 'Medication Administration', expires: dateFor(45) }, { name: 'CPR / First Aid', expires: dateFor(260) }])
  setCerts('Sam Okafor',   [{ name: 'CPR / First Aid', expires: dateFor(190) }])
  setCerts('Priya Nair',   [{ name: 'First Aid', expires: dateFor(340) }, { name: 'Medication Administration', expires: dateFor(-3) }])
  setCerts('Marcus Lewis', [{ name: 'CPR / First Aid', expires: dateFor(70) }])

  // A couple of incidents + safety drills (surface on each house's Care tab).
  demoAddIncident({ houseId: maple.id, residentId: robertHayes.id, type: 'Fall',       severity: 'Minor',    text: 'Resident slipped on a wet bathroom floor; no injury observed.',          actions: 'Completed body check, no first aid required, notified on-call nurse.', by: 'Aisha Mendez', occurredAt: `${dateFor(-1)}T09:15` })
  demoAddIncident({ houseId: oak.id,   residentId: null, type: 'Behavioral', severity: 'Moderate', text: 'Escalation during the afternoon transition; redirected per behavior plan.', actions: 'Followed BSP de-escalation, offered a quiet space, 1:1 support for ~20 min.', by: 'Reni Tate' })
  demoAddDrill({ houseId: maple.id, type: 'Fire',    evacTime: '2:45', notes: 'All residents evacuated to the front lawn within the target time.', by: 'Priya Nair',   date: dateFor(-3) })
  demoAddDrill({ houseId: oak.id,   type: 'Tornado', evacTime: '1:30', notes: 'Sheltered in the interior hallway; accounted for all residents.',    by: 'Marcus Lewis', date: dateFor(-1) })

  // Scheduled meds at Maple so the eMAR / med-pass flow has data out of the box
  // (doses match each resident's seeded diagnoses). The morning Maple shift
  // requires a Medication Administration cert — this is the pass it covers.
  demoAddMed({ houseId: maple.id, residentId: robertHayes.id, name: 'Metformin',     dose: '500 mg', route: 'Oral', times: ['08:00', '18:00'], prescriber: 'Dr. Alvarez' })
  demoAddMed({ houseId: maple.id, residentId: robertHayes.id, name: 'Donepezil',     dose: '5 mg',   route: 'Oral', times: ['20:00'],           prescriber: 'Dr. Alvarez' })
  demoAddMed({ houseId: maple.id, residentId: lindaPark.id,   name: 'Levetiracetam', dose: '500 mg', route: 'Oral', times: ['08:00', '20:00'], prescriber: 'Dr. Chen' })
  demoAddMed({ houseId: maple.id, residentId: robertHayes.id, name: 'Acetaminophen', dose: '500 mg', route: 'Oral', prn: true, prnReason: 'Mild pain or fever ≥ 100.4°F', prescriber: 'Dr. Alvarez' })

  // ISP goals so the Goals section isn't empty (staff log prompt level per pass).
  const goalBrush = demoAddGoal({ houseId: maple.id, residentId: robertHayes.id, title: 'Brush teeth with minimal prompting', target: 'Independent 4 of 5 days for 30 days', method: 'Hand-over-hand fading to verbal prompts; chart prompt level each pass.' })
  const goalGreet = demoAddGoal({ houseId: maple.id, residentId: lindaPark.id,   title: 'Initiate a social greeting',          target: '3 peer greetings per day for 2 weeks',  method: 'Model the greeting, then pause for her to initiate; praise any attempt.' })
  // A week of prompt-level data so each goal shows a real (improving) trend +
  // an "independent %" — drives the Goals sparkline and the Progress report.
  const goalTrend = (goal, levels) => levels.forEach((result, i) =>
    demoRecordGoalData({ houseId: maple.id, goalId: goal.id, residentId: goal.resident_id, date: dateFor(-(levels.length - 1 - i)), result, by: 'Aisha Mendez' }))
  goalTrend(goalBrush, ['physical', 'model', 'gesture', 'verbal', 'verbal', 'independent', 'independent'])
  goalTrend(goalGreet, ['model', 'gesture', 'verbal', 'refused', 'verbal', 'independent'])

  // Daily log / shift notes so the Notes section reads as an active house.
  demoAddDailyLog({ houseId: maple.id, residentId: robertHayes.id, category: 'General',  text: 'Cheerful at breakfast, ate most of his meal. Walked the garden loop twice.', by: 'Aisha Mendez' })
  demoAddDailyLog({ houseId: maple.id, residentId: lindaPark.id,   category: 'Behavior', text: 'Calm afternoon — enjoyed the music group and helped set the table.',       by: 'Aisha Mendez' })

  // Health-tracker entries (diagnosis-appropriate) so the Health section demos.
  demoAddHealthLog({ houseId: maple.id, residentId: robertHayes.id, kind: 'vitals', detail: { temp: 98.4, bp: '124/80', pulse: 74, o2: 98, glucose: 118 }, by: 'Aisha Mendez' })
  demoAddHealthLog({ houseId: maple.id, residentId: robertHayes.id, kind: 'meal',   detail: { meal: 'Breakfast', intake: 'Most' }, by: 'Aisha Mendez' })
  demoAddHealthLog({ houseId: maple.id, residentId: lindaPark.id,   kind: 'seizure', amount: 2, detail: { type: 'Brief tonic-clonic', trigger: 'Possible missed sleep', intervention: 'Stayed with her, timed it, cleared the area', postictal: 'Rested ~30 min, oriented after' }, note: 'On-call nurse notified.', by: 'Jay Brooks' })
  demoAddHealthLog({ houseId: maple.id, residentId: lindaPark.id,   kind: 'fluid',  amount: 8, by: 'Aisha Mendez' })

  // Light clinical data for the Oak + Birch residents so no resident profile
  // reads as empty when the supervisor drills in (diagnosis-appropriate).
  demoAddMed({ houseId: oak.id, residentId: jamesWhitaker.id, name: 'Risperidone', dose: '1 mg', route: 'Oral', times: ['08:00', '20:00'], prescriber: 'Dr. Okeke' })
  demoAddGoal({ houseId: oak.id, residentId: jamesWhitaker.id, title: 'Use the break card before escalating', target: 'Independent 3 of 5 days for 30 days', method: 'Prompt the break card at the first early sign; honor the break immediately.' })
  demoAddHealthLog({ houseId: oak.id, residentId: jamesWhitaker.id, kind: 'meal', detail: { meal: 'Lunch', intake: 'Half' }, by: 'Reni Tate' })
  demoAddMed({ houseId: oak.id, residentId: mariaGomez.id, name: 'Sertraline', dose: '50 mg', route: 'Oral', times: ['08:00'], prescriber: 'Dr. Okeke' })
  demoAddGoal({ houseId: oak.id, residentId: mariaGomez.id, title: 'Name a coping skill when anxious', target: 'Uses a skill 4 of 5 prompts', method: 'Review her coping card; praise any naming of a strategy.' })
  demoAddMed({ houseId: birch.id, residentId: danielCho.id, name: 'Baclofen', dose: '10 mg', route: 'Oral', times: ['08:00', '14:00', '20:00'], prescriber: 'Dr. Reyes' })
  demoAddHealthLog({ houseId: birch.id, residentId: danielCho.id, kind: 'vitals', detail: { temp: 98.2, bp: '118/76', pulse: 70, o2: 97 }, by: 'Sam Okafor' })
  demoAddMed({ houseId: birch.id, residentId: aaliyahJohnson.id, name: 'Insulin glargine', dose: '12 units', route: 'Subcutaneous', times: ['21:00'], prescriber: 'Dr. Reyes' })
  demoAddHealthLog({ houseId: birch.id, residentId: aaliyahJohnson.id, kind: 'vitals', detail: { glucose: 132, pulse: 78 }, by: 'Sam Okafor' })

  // A few supplies per house (with cost, so the Resources spend charts render).
  demoAddResource(maple.id, { name: 'Paper towels',       qty: 6, unit: 'rolls',   cost: 12.99 })
  demoAddResource(maple.id, { name: 'Nitrile gloves',     qty: 2, unit: 'boxes',   cost: 18.50 })
  demoAddResource(oak.id,   { name: 'Disinfectant wipes', qty: 4, unit: 'tubs',    cost: 23.99 })
  demoAddResource(oak.id,   { name: 'Hand soap',          qty: 3, unit: 'bottles', cost: 9.75 })
  demoAddResource(birch.id, { name: 'Trash bags',         qty: 1, unit: 'box',     cost: 15.25 })
  demoAddResource(birch.id, { name: 'Briefs (L)',         qty: 2, unit: 'packs',   cost: 31.00 })

  // Team chat — an org-wide conversation so the Team tab isn't empty.
  demoSendMessage(orgId, { houseId: null, authorName: 'Dana Whitfield', authorRole: 'supervisor', body: 'Morning team 👋 Reminder to log this month’s fire & tornado drills by Friday — thanks for keeping everyone safe.' })
  demoSendMessage(orgId, { houseId: null, authorName: 'Priya Nair',     authorRole: 'manager',    body: 'Maple knocked out our fire drill this morning — 2:45 evac, everyone accounted for. ✅' })
  demoSendMessage(orgId, { houseId: null, authorName: 'Aisha Mendez',   authorRole: 'staff',      body: 'Heads up: we were low on nitrile gloves at Maple, so I added a couple boxes to Supplies.' })

  // Reuse the existing lazy seeders so Updates / Activity / Time are populated
  // from the same first load (each is internally guarded against duplicates).
  demoSeedAnnouncements(orgId)
  demoSeedRecognitions(orgId)
  demoSeedTimeclock(orgId)
  demoSeedTimeOff(orgId)
  demoSeedKnowledge(orgId)
  demoSeedEvents(orgId)
  demoSeedForms(orgId)
  demoSeedSurveys(orgId)
  demoSeedQuickTasks(orgId)
  demoSeedContacts(orgId)
  demoSeedTickets(orgId)
  demoSeedAppointments(orgId)
  demoSeedResidentFunds(orgId)
  demoSeedBehaviorPlans(orgId)
  demoSeedCourses(orgId)
  demoSeedSmartGroups(orgId)

  persist()
}

// ── Houses ──────────────────────────────────────────────────────────────────
export function demoFetchHouses() {
  demoSeedOrg()
  return store.houses.map(h => ({
    id: h.id, slug: h.slug, name: h.name, short: h.short,
    address: h.address ?? '', branch: h.branch ?? '', color: h.color,
    managerName: h.manager_name ?? '', residentsCount: h.residents_count ?? 0,
  }))
}

export function demoAddHouse(house) {
  const base = (house.slug || house.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) || 'house'
  let slug = base
  let n = 2
  while (store.houses.some(h => h.slug === slug)) slug = `${base}-${n++}`
  const row = {
    id: slug, slug,
    name: house.name,
    short: house.short || house.name.slice(0, 3).toUpperCase(),
    address: house.address || '',
    branch: house.branch || '',
    color: house.color || '#888888',
    manager_name: house.managerName || '',
    residents_count: 0,
  }
  store.houses.push(row); persist()
  return row
}

export function demoUpdateHouse(id, updates) {
  const h = store.houses.find(x => x.id === id)
  if (!h) return null
  if (updates.name !== undefined)        h.name = updates.name
  if (updates.address !== undefined)     h.address = updates.address
  if (updates.branch !== undefined)      h.branch = updates.branch
  if (updates.color !== undefined)       h.color = updates.color
  if (updates.managerName !== undefined) h.manager_name = updates.managerName
  if (updates.short !== undefined)       h.short = updates.short
  persist()
  return h
}

export function demoDeleteHouse(id) {
  store.houses = store.houses.filter(h => h.id !== id)
  persist()
}

export function demoSetHouseGeofence(id, { lat, lng, radiusM }) {
  const h = store.houses.find(x => x.id === id)
  if (!h) return null
  if (lat != null) h.lat = lat
  if (lng != null) h.lng = lng
  if (radiusM != null) h.geofence_m = Math.round(radiusM)
  persist(); return true
}
export function demoFetchHouseGeofences() {
  return store.houses.map(h => ({ id: h.id, name: h.name, color: h.color, lat: h.lat ?? null, lng: h.lng ?? null, radiusM: h.geofence_m || 200 }))
}

// ── Shifts ──────────────────────────────────────────────────────────────────
export function demoFetchShifts(houseId, date) {
  const dateStr = asDateStr(date)
  return store.shifts
    .filter(s => s.shift_date === dateStr && (!houseId || s.house_id === houseId))
    .map(s => ({
      id: s.id, house: houseJoin(s.house_id)?.slug ?? s.house_id,
      start: Number(s.start_hour), end: Number(s.end_hour),
      person: s.person_name, staffId: s.staff_id ?? null, role: s.role, note: s.note ?? null,
      requiredCert: s.required_cert ?? null, status: s.status,
      publishedAt: s.published_at ?? null,
    }))
}

export function demoFetchShiftsWeek(houseId, weekStart, weekEnd) {
  const startStr = asDateStr(weekStart), endStr = asDateStr(weekEnd)
  return store.shifts
    .filter(s => s.shift_date >= startStr && s.shift_date <= endStr && (!houseId || s.house_id === houseId))
    .map(s => ({
      id: s.id, house: houseJoin(s.house_id)?.slug ?? s.house_id, date: s.shift_date,
      start: Number(s.start_hour), end: Number(s.end_hour),
      person: s.person_name, staffId: s.staff_id ?? null, role: s.role, note: s.note ?? null,
      requiredCert: s.required_cert ?? null, status: s.status,
      publishedAt: s.published_at ?? null,
    }))
}

export function demoAddShift(houseId, shift) {
  const row = {
    id: uid('shift'), house_id: houseId,
    person_name: shift.personName, staff_id: shift.staffId || null, role: shift.role,
    start_hour: shift.startHour, end_hour: shift.endHour,
    shift_date: shift.date || todayStr(), note: shift.note || null,
    required_cert: shift.requiredCert || null, status: 'scheduled',
    published_at: shift.publishedAt ?? null,
  }
  store.shifts.push(row); persist()
  return row
}

export function demoUpdateShift(id, updates) {
  const s = store.shifts.find(x => x.id === id)
  if (!s) return null
  if (updates.personName !== undefined) s.person_name = updates.personName
  if (updates.staffId !== undefined)    s.staff_id = updates.staffId || null
  if (updates.role !== undefined)       s.role = updates.role
  if (updates.startHour !== undefined)  s.start_hour = updates.startHour
  if (updates.endHour !== undefined)    s.end_hour = updates.endHour
  if (updates.date !== undefined)       s.shift_date = updates.date
  if (updates.note !== undefined)       s.note = updates.note || null
  if (updates.requiredCert !== undefined) s.required_cert = updates.requiredCert || null
  if (updates.status !== undefined)     s.status = updates.status
  if (updates.publishedAt !== undefined) s.published_at = updates.publishedAt
  persist()
  return s
}

export function demoDeleteShift(id) {
  store.shifts = store.shifts.filter(s => s.id !== id); persist()
}

// Stamp published_at = now on every non-open shift in the week/house scope.
// Logs an Activity-feed event so the publish shows up. Returns the count published.
export function demoPublishShiftsWeek(orgId, { houseId = null, weekStart, weekEnd } = {}) {
  const startStr = asDateStr(weekStart), endStr = asDateStr(weekEnd)
  const ts = now()
  let n = 0
  for (const s of store.shifts) {
    if (s.shift_date < startStr || s.shift_date > endStr) continue
    if (houseId && s.house_id !== houseId) continue
    if (s.status === 'open') continue
    s.published_at = ts
    n += 1
  }
  store.shiftEvents.push({
    id: uid('shev'), org_id: orgId, house_id: houseId || null, kind: 'shift_published',
    actor: 'Schedule', text: `Schedule published — ${n} shift${n === 1 ? '' : 's'}`, at: ts,
  })
  persist()
  return n
}

// Claim an open shift: assign staff + flip status to the normal 'scheduled'.
// Logs an Activity-feed event. Returns the updated shift row.
// NOTE: shift publish/claim activity events (store.shiftEvents) are demo-only —
// the Supabase path does not write an equivalent activity feed row.
export function demoClaimShift(id, { staffId, staffName } = {}) {
  // Stamp published_at so the claimed shift stays visible to the staffer (the
  // staff publishGate hides shifts with no published_at).
  const s = demoUpdateShift(id, { staffId, personName: staffName, status: 'scheduled', publishedAt: now() })
  if (s) {
    store.shiftEvents.push({
      id: uid('shev'), org_id: null, house_id: s.house_id || null, kind: 'shift_claimed',
      actor: staffName || 'Someone', text: `${staffName || 'Someone'} claimed an open shift on ${s.shift_date}`, at: now(),
    })
    persist()
  }
  return s
}

// ── Shift swap / cover requests ─────────────────────────────────────────────
// A worker asks to be relieved of one of their shifts. They can name a preferred
// coworker to take it, or leave it open for the manager to cover. A manager
// approves (reassign to the coworker, or release to the open/claimable pool) or
// denies (the shift stays with the requester). Demo-only activity events mirror
// the claim/publish plumbing.
export function demoCreateSwapRequest(req = {}) {
  const shift = store.shifts.find(s => s.id === req.shiftId)
  const row = {
    id: uid('swap'), org_id: req.orgId || null, house_id: req.houseId || (shift?.house_id ?? null),
    shift_id: req.shiftId, from_name: req.fromName || null, from_staff_id: req.fromStaffId || null,
    to_name: req.toName || null, to_staff_id: req.toStaffId || null,
    note: req.note || null, status: 'pending', created_at: now(),
    resolved_by: null, resolved_at: null,
  }
  store.swapRequests.unshift(row)
  // Flag the shift so the "SWAP REQ" badge lights up (parity with real mode).
  if (req.shiftId) demoUpdateShift(req.shiftId, { status: 'swap' })
  store.shiftEvents.push({
    id: uid('shev'), org_id: req.orgId || null, house_id: row.house_id, kind: 'swap_requested',
    actor: row.from_name || 'Someone',
    text: `${row.from_name || 'Someone'} requested ${row.to_name ? `${row.to_name} to cover` : 'cover for'} a shift on ${shift?.shift_date || ''}`.trim(),
    at: now(),
  })
  persist()
  return row
}

// Enriched pending+resolved requests for a manager/worker view. Each row carries
// the underlying shift's date/hours/role/house so the UI can render it.
export function demoFetchSwapRequests({ orgId = null, houseId = null, fromStaffId = null, status = null } = {}) {
  demoSeedOrg()
  return store.swapRequests
    .filter(r => (!houseId || r.house_id === houseId) && (!fromStaffId || r.from_staff_id === fromStaffId) && (!status || r.status === status))
    .map(r => {
      const s = store.shifts.find(x => x.id === r.shift_id)
      const h = s ? store.houses.find(x => x.id === s.house_id) : null
      return {
        id: r.id, shiftId: r.shift_id, fromName: r.from_name, fromStaffId: r.from_staff_id,
        toName: r.to_name, toStaffId: r.to_staff_id, note: r.note, status: r.status,
        createdAt: r.created_at, resolvedBy: r.resolved_by, resolvedAt: r.resolved_at,
        houseId: r.house_id, houseName: h?.name || null, houseColor: h?.color || null,
        date: s?.shift_date || null, start: s?.start_hour ?? null, end: s?.end_hour ?? null,
        role: s?.role || null, stillAssignedTo: s?.person_name || null, shiftStatus: s?.status || null,
      }
    })
}

// Manager decision. approve=true reassigns to the named coworker (or releases the
// shift to the open pool when none was named); approve=false leaves it untouched.
export function demoResolveSwapRequest(id, { approve, by } = {}) {
  const r = store.swapRequests.find(x => x.id === id)
  if (!r || r.status !== 'pending') return null
  if (approve) {
    if (r.to_staff_id || r.to_name) demoUpdateShift(r.shift_id, { staffId: r.to_staff_id, personName: r.to_name, status: 'scheduled', publishedAt: now() })
    else demoUpdateShift(r.shift_id, { status: 'open', personName: '', staffId: null })
  } else {
    demoUpdateShift(r.shift_id, { status: 'scheduled' })   // denied → clear the 'swap' flag
  }
  r.status = approve ? 'approved' : 'denied'
  r.resolved_by = by || null
  r.resolved_at = now()
  const shift = store.shifts.find(s => s.id === r.shift_id)
  store.shiftEvents.push({
    id: uid('shev'), org_id: r.org_id, house_id: r.house_id, kind: approve ? 'swap_approved' : 'swap_denied',
    actor: by || 'Manager',
    text: approve
      ? `${by || 'Manager'} approved ${r.from_name || 'a'} swap${r.to_name ? ` — ${r.to_name} now covers ${shift?.shift_date || ''}` : ` — shift on ${shift?.shift_date || ''} reopened`}`.trim()
      : `${by || 'Manager'} denied ${r.from_name || 'a'} swap request`,
    at: now(),
  })
  persist()
  return r
}

// Count of pending swap requests in scope, for the manager's nav badge.
export function demoCountPendingSwaps({ houseId = null } = {}) {
  demoSeedOrg()
  return store.swapRequests.filter(r => r.status === 'pending' && (!houseId || r.house_id === houseId)).length
}

// ── Notifications (demo) ─────────────────────────────────────────────────────
export function demoCreateNotification(orgId, n = {}) {
  store.notifications = store.notifications || []
  const row = {
    id: uid('ntf'), org_id: orgId, house_id: n.houseId || null,
    recipient_staff_id: n.recipientStaffId || null, recipient_role: n.recipientRole || null,
    kind: n.kind, title: n.title, body: n.body || null, link: n.link || null,
    read_at: null, created_at: now(),
  }
  store.notifications.unshift(row); persist(); return row
}
// Mirror the notifications RLS so a DSP doesn't see manager-only rows in demo.
function demoNotifVisible(n, user) {
  if (!user) return true
  const role = user.role, staffId = user.staffId, houseId = user.houseId || user.houseSlug
  if (n.recipient_staff_id) return n.recipient_staff_id === staffId
  if (n.recipient_role && n.recipient_role !== role) return false
  return role === 'supervisor' || n.house_id == null || n.house_id === houseId
}
export function demoFetchNotifications(orgId, user) {
  return (store.notifications || []).filter(n => demoNotifVisible(n, user)).slice(0, 30)
}
export function demoCountUnreadNotifications(orgId, user) {
  return (store.notifications || []).filter(n => !n.read_at && demoNotifVisible(n, user)).length
}
export function demoMarkNotificationRead(id) { const n = (store.notifications || []).find(x => x.id === id); if (n) { n.read_at = now(); persist() } }
export function demoMarkAllNotificationsRead() { (store.notifications || []).forEach(n => { if (!n.read_at) n.read_at = now() }); persist() }

// Count of open shifts in scope, for the schedule nav badge.
export function demoCountOpenShifts(orgId, { houseId = null } = {}) {
  demoSeedOrg()
  return store.shifts.filter(s => s.status === 'open' && (!houseId || s.house_id === houseId)).length
}

// ── Staff ───────────────────────────────────────────────────────────────────
export function demoFetchStaff(houseId) {
  return store.staff
    .filter(s => s.role !== 'supervisor' && (!houseId || s.house_id === houseId))
    .map(s => ({
      id: s.id, name: s.name, email: s.email ?? '',
      role: s.role === 'manager' ? 'House mgr' : 'DSP', rawRole: s.role,
      house: houseJoin(s.house_id)?.slug ?? null,
      houseId: s.house_id ?? null,
      houseName: houseJoin(s.house_id)?.name ?? null,
      houseColor: houseJoin(s.house_id)?.color ?? null,
      linked: !!s.auth_user_id, sub: s.tenure ?? '',
      highlight: s.highlight ?? null, tenure: s.tenure ?? '', notes: s.notes ?? '',
      certs: s.certs ?? [],
    }))
}

export function demoInviteStaff(houseId, member) {
  const row = {
    id: uid('staff'), house_id: houseId || null,
    name: member.name, email: member.email || null,
    role: member.role || 'staff', quality_score: 85,
    tenure: 'New', highlight: null, notes: '',
  }
  store.staff.push(row); persist()
  return row
}

export function demoUpdateStaff(id, updates) {
  const s = store.staff.find(x => x.id === id)
  if (!s) return null
  Object.assign(s, updates); persist()
  return s
}

export function demoRemoveStaff(id) {
  store.staff = store.staff.filter(s => s.id !== id); persist()
}

// ── Staff live location (on-duty sharing) ───────────────────────────────────
export function demoSetStaffDuty(id, onDuty) {
  const s = store.staff.find(x => x.id === id)
  if (!s) return null
  s.on_duty = !!onDuty
  if (!onDuty) { s.cur_lat = null; s.cur_lng = null }
  persist()
  return s
}

export function demoPingStaffLocation(id, coords) {
  const s = store.staff.find(x => x.id === id)
  if (!s || !coords || coords.lat == null) return
  s.cur_lat = coords.lat; s.cur_lng = coords.lng; s.last_seen_at = now(); s.on_duty = true
  persist()
}

export function demoFetchTeamLocations(houseId) {
  const cutoff = Date.now() - 30 * 60 * 1000
  return store.staff
    .filter(s => s.on_duty && (!houseId || s.house_id === houseId)
      && (!s.last_seen_at || new Date(s.last_seen_at).getTime() >= cutoff))
    .map(s => ({
      id: s.id, name: s.name, role: s.role, houseId: s.house_id || null,
      lat: s.cur_lat, lng: s.cur_lng, lastSeen: s.last_seen_at,
      color: houseJoin(s.house_id)?.color || '#4a6b56', houseName: houseJoin(s.house_id)?.name || null,
    }))
}

// ── Tasks ───────────────────────────────────────────────────────────────────
export function demoFetchTasks(staffId, date) {
  const dateStr = asDateStr(date)
  return store.tasks.filter(t => t.staff_id === staffId && t.task_date === dateStr)
}

export function demoAddTask(staffId, task) {
  const row = {
    id: uid('task'), staff_id: staffId, task_date: todayStr(),
    kind: task.kind || 'note', text: task.text, done: false,
    urgent: task.urgent || false, created_at: now(),
    created_by_name: task.createdByName || null, created_by_role: task.createdByRole || null,
  }
  store.tasks.push(row); persist()
  return row
}

export function demoToggleTask(taskId, done) {
  const t = store.tasks.find(x => x.id === taskId)
  if (t) { t.done = done; persist() }
}

// ── Resources ───────────────────────────────────────────────────────────────
export function demoFetchResources(houseId) {
  return store.resources
    .filter(r => !houseId || r.house_id === houseId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(r => ({ ...r, houses: houseJoin(r.house_id) }))
}

export function demoAddResource(houseId, item) {
  const row = {
    id: uid('res'), house_id: houseId || null,
    name: item.name, qty: item.qty || 1, unit: item.unit || 'units',
    cost: item.cost || null, week: item.week || null, created_at: now(),
  }
  store.resources.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoDeleteResource(id) {
  store.resources = store.resources.filter(r => r.id !== id); persist()
}

// ── Trips ───────────────────────────────────────────────────────────────────
export function demoFetchTrips(houseId, date) {
  const dateStr = date ? asDateStr(date) : null
  return store.trips
    .filter(t => (!houseId || t.house_id === houseId) && (!dateStr || t.trip_date === dateStr))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(t => ({ ...t, houses: houseJoin(t.house_id) }))
}

export function demoAddTrip(trip) {
  const row = {
    id: uid('trip'), house_id: trip.houseId || null,
    driver_name: trip.driverName, resident_name: trip.residentName,
    destination: trip.destination, miles: trip.miles || 0,
    purpose: trip.purpose || 'other', trip_date: trip.date || todayStr(), created_at: now(),
  }
  store.trips.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoStartTrip(trip) {
  const row = {
    id: uid('trip'), house_id: trip.houseId || null,
    driver_id: trip.driverId || null,
    driver_name: trip.driverName || 'Unknown', resident_name: trip.residentName,
    destination: trip.destination, miles: trip.miles || 0, purpose: trip.purpose || 'Other',
    trip_date: todayStr(), created_at: now(), status: 'active', started_at: now(),
    start_lat: trip.lat ?? null, start_lng: trip.lng ?? null,
    dest_lat: trip.destLat ?? null, dest_lng: trip.destLng ?? null,
  }
  store.trips.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoEndTrip(id, patch = {}) {
  const t = store.trips.find(x => x.id === id)
  if (!t) return null
  t.status = 'ended'; t.ended_at = now()
  if (patch.miles != null) t.miles = patch.miles
  if (patch.lat != null) t.end_lat = patch.lat
  if (patch.lng != null) t.end_lng = patch.lng
  persist()
  return { ...t, houses: houseJoin(t.house_id) }
}

export function demoSetTripDest(id, coords) {
  const t = store.trips.find(x => x.id === id)
  if (!t || !coords || coords.lat == null) return
  t.dest_lat = coords.lat; t.dest_lng = coords.lng; persist()
}

export function demoPingTrip(id, coords) {
  const t = store.trips.find(x => x.id === id)
  if (!t || !coords || coords.lat == null) return
  t.cur_lat = coords.lat; t.cur_lng = coords.lng; t.last_ping = now(); persist()
}

export function demoMarkArrived(id, coords) {
  const t = store.trips.find(x => x.id === id)
  if (!t) return null
  t.status = 'ended'; t.ended_at = now(); t.arrived_at = now()
  if (coords?.lat != null) { t.end_lat = coords.lat; t.end_lng = coords.lng; t.cur_lat = coords.lat; t.cur_lng = coords.lng }
  persist()
  return { ...t, houses: houseJoin(t.house_id) }
}

export function demoSetTripLocation(id, which, coords) {
  const t = store.trips.find(x => x.id === id)
  if (!t || !coords || coords.lat == null) return
  if (which === 'end') { t.end_lat = coords.lat; t.end_lng = coords.lng }
  else { t.start_lat = coords.lat; t.start_lng = coords.lng }
  persist()
}

export function demoFetchActiveTrips(houseId) {
  return store.trips.filter(t => t.status === 'active' && (!houseId || t.house_id === houseId))
    .map(t => ({ ...t, houses: houseJoin(t.house_id) }))
}

export function demoUpdateTrip(id, updates) {
  const t = store.trips.find(x => x.id === id)
  if (!t) return null
  t.driver_name = updates.driverName
  t.resident_name = updates.residentName
  t.destination = updates.destination
  t.miles = updates.miles || 0
  t.purpose = updates.purpose || 'other'
  persist()
  return { ...t, houses: houseJoin(t.house_id) }
}

export function demoDeleteTrip(id) {
  store.trips = store.trips.filter(t => t.id !== id); persist()
}

// ── Vehicles ────────────────────────────────────────────────────────────────
export function demoFetchVehicles(houseId) {
  return store.vehicles
    .filter(v => !houseId || v.house_id === houseId)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(v => ({ ...v, houses: houseJoin(v.house_id) }))
}

export function demoAddVehicle(vehicle) {
  const row = {
    id: uid('veh'), house_id: vehicle.houseId || null,
    name: vehicle.name, plate: vehicle.plate || null,
    mileage: vehicle.mileage || 0, last_service: vehicle.lastService || null,
  }
  store.vehicles.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoUpdateVehicle(id, updates) {
  const v = store.vehicles.find(x => x.id === id)
  if (!v) return null
  if (updates.name !== undefined)        v.name = updates.name
  if (updates.plate !== undefined)       v.plate = updates.plate
  if (updates.mileage !== undefined)     v.mileage = updates.mileage
  if (updates.lastService !== undefined) v.last_service = updates.lastService
  persist()
  return { ...v, houses: houseJoin(v.house_id) }
}

export function demoDeleteVehicle(id) {
  store.vehicles = store.vehicles.filter(v => v.id !== id); persist()
}

// ── Med alerts ──────────────────────────────────────────────────────────────
export function demoFetchMedAlerts(houseId) {
  return store.medAlerts
    .filter(m => m.status === 'open' && (!houseId || m.house_id === houseId))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(m => ({ ...m, houses: houseJoin(m.house_id) }))
}

export function demoAddMedAlert(houseId, alert) {
  const row = {
    id: uid('med'), house_id: houseId || null,
    resident_name: alert.residentName || null, text: alert.text,
    status: 'open', due_at: alert.dueAt || null, created_at: now(),
  }
  store.medAlerts.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoResolveMedAlert(id) {
  const m = store.medAlerts.find(x => x.id === id)
  if (m) { m.status = 'resolved'; persist() }
}

// ── Shift notes ─────────────────────────────────────────────────────────────
export function demoFetchShiftNotes(houseId) {
  return store.shiftNotes
    .filter(n => !houseId || n.house_id === houseId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(n => ({ ...n, houses: houseJoin(n.house_id) }))
}

export function demoAddShiftNote(houseId, note) {
  const row = {
    id: uid('note'), house_id: houseId || null,
    author_name: note.authorName || null, text: note.text,
    read: false, created_at: now(),
  }
  store.shiftNotes.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoMarkShiftNoteRead(id) {
  const n = store.shiftNotes.find(x => x.id === id)
  if (n) { n.read = true; persist() }
}

// ── Residents ───────────────────────────────────────────────────────────────
export function demoFetchResidents(houseId) {
  return store.residents
    .filter(r => !houseId || r.house_id === houseId)
    .map(r => ({ ...r, houses: houseJoin(r.house_id) }))
}

// ── Shared house items (cross-role to-do log) ────────────────────────────────
export function demoFetchItems({ houseId = null, status = null } = {}) {
  return store.items
    .filter(it => (!houseId || it.house_id === houseId) && (!status || it.status === status))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(it => ({ ...it, houses: houseJoin(it.house_id) }))
}

export function demoAddItem(orgId, item) {
  const row = {
    id: uid('item'), house_id: item.houseId || null,
    text: item.text, kind: item.kind || 'task', for_role: item.forRole || 'staff',
    created_by_name: item.createdByName || null, created_by_role: item.createdByRole || null,
    status: 'open', done_by_name: null, done_at: null, created_at: now(),
  }
  store.items.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoCompleteItem(id, doneByName) {
  const it = store.items.find(x => x.id === id)
  if (!it) return null
  it.status = 'done'; it.done_by_name = doneByName || null; it.done_at = now()
  persist()
  return { ...it, houses: houseJoin(it.house_id) }
}

export function demoReopenItem(id) {
  const it = store.items.find(x => x.id === id)
  if (!it) return null
  it.status = 'open'; it.done_by_name = null; it.done_at = null
  persist()
  return { ...it, houses: houseJoin(it.house_id) }
}

export function demoDeleteItem(id) {
  store.items = store.items.filter(x => x.id !== id); persist()
}

export function demoAddResident(houseId, resident) {
  const row = {
    id: uid('resi'), house_id: houseId || null,
    name: resident.name, room: resident.room || null, dob: resident.dob || null,
    status: resident.status || 'active', notes: resident.notes || null,
    allergies: resident.allergies || '', diagnoses: resident.diagnoses || '',
    diet: resident.diet || '', flags: resident.flags || [],
    guardian: resident.guardian || '', physician: resident.physician || '',
  }
  store.residents.push(row)
  const h = store.houses.find(x => x.id === houseId)
  if (h) h.residents_count = (h.residents_count ?? 0) + 1
  persist()
  return row
}

export function demoUpdateResident(id, updates) {
  const r = store.residents.find(x => x.id === id)
  if (!r) return null
  for (const k of ['name', 'room', 'dob', 'status', 'notes', 'allergies', 'diagnoses', 'diet', 'flags', 'guardian', 'physician']) {
    if (updates[k] !== undefined) r[k] = updates[k]
  }
  persist()
  return { ...r, houses: houseJoin(r.house_id) }
}

// ── Medications (eMAR) ───────────────────────────────────────────────────────
const residentName = (id) => (store.residents.find(r => r.id === id) || {}).name || 'Resident'

export function demoFetchMeds(houseId) {
  return store.meds
    .filter(m => (!houseId || m.house_id === houseId) && m.active !== false)
    .map(m => ({ ...m, residentName: residentName(m.resident_id) }))
}

export function demoAddMed(med) {
  const row = {
    id: uid('med'), house_id: med.houseId || null, resident_id: med.residentId || null,
    name: med.name, dose: med.dose || '', route: med.route || 'Oral',
    times: med.times || [], prn: !!med.prn, prnReason: med.prnReason || '',
    prescriber: med.prescriber || '', active: true, created_at: now(),
  }
  store.meds.push(row); persist()
  return { ...row, residentName: residentName(row.resident_id) }
}

export function demoDeleteMed(id) {
  store.meds = store.meds.filter(m => m.id !== id)
  store.medAdmins = store.medAdmins.filter(a => a.med_id !== id)
  persist()
}

// Today's scheduled doses for a house, merged with what's been recorded.
export function demoFetchMedPass(houseId, dateStr) {
  const doses = []
  for (const m of store.meds.filter(m => m.house_id === houseId && !m.prn && m.active !== false)) {
    for (const t of (m.times || [])) {
      const adm = store.medAdmins.find(a => a.med_id === m.id && a.date === dateStr && a.slot === t)
      doses.push({
        key: `${m.id}|${t}`, medId: m.id, resident: residentName(m.resident_id), residentId: m.resident_id,
        med: m.name, dose: m.dose, route: m.route, time: t,
        status: adm?.status || 'due', by: adm?.by || null, at: adm?.at || null,
      })
    }
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time) || a.resident.localeCompare(b.resident))
}

export function demoRecordMed(medId, dateStr, slot, status, by) {
  const idx = store.medAdmins.findIndex(x => x.med_id === medId && x.date === dateStr && x.slot === slot)
  if (status === 'due') {
    if (idx >= 0) store.medAdmins.splice(idx, 1)
  } else if (idx >= 0) {
    store.medAdmins[idx] = { ...store.medAdmins[idx], status, by, at: now() }
  } else {
    store.medAdmins.push({ id: uid('adm'), med_id: medId, date: dateStr, slot, status, by, at: now() })
  }
  persist()
}

export function demoFetchPrnMeds(houseId) {
  return store.meds
    .filter(m => m.house_id === houseId && m.prn && m.active !== false)
    .map(m => ({ ...m, residentName: residentName(m.resident_id) }))
}

export function demoLogPrn(entry) {
  const row = {
    id: uid('prn'), med_id: entry.medId, house_id: entry.houseId || null,
    resident: residentName(entry.residentId), med: entry.medName || '',
    reason: entry.reason || '', effect: entry.effect || '', by: entry.by || null, at: now(),
    date: todayStr(),
  }
  store.prnLog.unshift(row); persist()
  return row
}

export function demoFetchPrnLog(houseId, dateStr) {
  return store.prnLog.filter(l => l.house_id === houseId && (!dateStr || l.date === dateStr))
}

// ── Daily log (T-Log: routine shift documentation) ──────────────────────────
export function demoAddDailyLog(entry) {
  const row = {
    id: uid('log'), house_id: entry.houseId || null, resident_id: entry.residentId || null,
    resident: entry.residentId ? residentName(entry.residentId) : null,
    category: entry.category || 'General', text: entry.text,
    by: entry.by || null, at: now(), date: todayStr(),
  }
  store.dailyLog.unshift(row); persist()
  return row
}
export function demoFetchDailyLog(houseId, limit = 40) {
  return store.dailyLog.filter(l => !houseId || l.house_id === houseId).slice(0, limit)
}
export function demoDeleteDailyLog(id) {
  store.dailyLog = store.dailyLog.filter(l => l.id !== id); persist()
}
export function demoUpdateDailyLog(id, updates = {}) {
  const l = store.dailyLog.find(x => x.id === id)
  if (!l) return null
  if (updates.category !== undefined) l.category = updates.category
  if (updates.text !== undefined) l.text = updates.text
  if (updates.residentId !== undefined) { l.resident_id = updates.residentId || null; l.resident = updates.residentId ? residentName(updates.residentId) : null }
  persist(); return l
}

// ── Incident reports ─────────────────────────────────────────────────────────
export function demoAddIncident(inc) {
  const row = {
    id: uid('inc'), house_id: inc.houseId || null, resident_id: inc.residentId || null,
    resident: inc.residentId ? residentName(inc.residentId) : null,
    type: inc.type || 'Other', severity: inc.severity || 'Minor', text: inc.text || '',
    actions: inc.actions || '', notified: inc.notified || '',
    status: 'open', by: inc.by || null, at: now(), date: todayStr(),
    reviewed_by: null, reviewed_at: null,
    reportable: inc.reportable || false, notified_at: null,
    corrective_action: inc.correctiveAction || null, follow_up_due: inc.followUpDue || null,
    witnesses: inc.witnesses || null, involved_persons: inc.involvedPersons || null,
    investigation_notes: inc.investigationNotes || null, recommendations: inc.recommendations || null,
    ane_flag: inc.aneFlag || null, investigator: null, investigated_at: null,
    occurred_at: inc.occurredAt || null, photo: inc.photo || null,
  }
  store.incidents.unshift(row); persist()
  return row
}
export function demoFetchIncidents(houseId) {
  return store.incidents.filter(i => !houseId || i.house_id === houseId)
}
export function demoReviewIncident(id, by) {
  const i = store.incidents.find(x => x.id === id)
  if (i) { i.status = 'reviewed'; i.reviewed_by = by; i.reviewed_at = now() }
  persist(); return i
}
export function demoUpdateIncident(id, updates) {
  const i = store.incidents.find(x => x.id === id)
  if (!i) return null
  if (updates.status !== undefined)           i.status = updates.status
  if (updates.reportable !== undefined)        i.reportable = updates.reportable
  if (updates.notified !== undefined)          i.notified = updates.notified
  if (updates.markNotifiedNow)                 i.notified_at = now()
  if (updates.correctiveAction !== undefined)  i.corrective_action = updates.correctiveAction
  if (updates.followUpDue !== undefined)       i.follow_up_due = updates.followUpDue || null
  if (updates.witnesses !== undefined)         i.witnesses = updates.witnesses
  if (updates.involvedPersons !== undefined)   i.involved_persons = updates.involvedPersons
  if (updates.investigationNotes !== undefined) i.investigation_notes = updates.investigationNotes
  if (updates.recommendations !== undefined)   i.recommendations = updates.recommendations
  if (updates.aneFlag !== undefined)           i.ane_flag = updates.aneFlag
  if (updates.investigator !== undefined)      i.investigator = updates.investigator
  if (updates.markInvestigatedNow)             i.investigated_at = now()
  persist(); return i
}
export function demoDeleteIncident(id) {
  store.incidents = store.incidents.filter(i => i.id !== id); persist()
}

// ── ISP goals + daily goal data ─────────────────────────────────────────────
export function demoFetchGoals(houseId) {
  return store.goals.filter(g => !houseId || g.house_id === houseId)
    .map(g => ({ id: g.id, residentId: g.resident_id, resident: g.resident_id ? residentName(g.resident_id) : null, title: g.title, description: g.description, method: g.method, target: g.target, active: g.active }))
}
export function demoAddGoal(goal) {
  const row = {
    id: uid('goal'), house_id: goal.houseId || null, resident_id: goal.residentId || null,
    title: goal.title, description: goal.description || null, method: goal.method || null, target: goal.target || null,
    active: true, created_at: now(),
  }
  store.goals.push(row); persist()
  return { ...row, residentId: row.resident_id, resident: row.resident_id ? residentName(row.resident_id) : null }
}
export function demoUpdateGoal(id, updates) {
  const g = store.goals.find(x => x.id === id)
  if (!g) return null
  if (updates.title !== undefined)       g.title = updates.title
  if (updates.description !== undefined) g.description = updates.description || null
  if (updates.method !== undefined)      g.method = updates.method || null
  if (updates.target !== undefined)      g.target = updates.target || null
  if (updates.active !== undefined)      g.active = updates.active
  persist(); return g
}
export function demoDeleteGoal(id) {
  store.goals = store.goals.filter(g => g.id !== id)
  store.goalData = store.goalData.filter(d => d.goal_id !== id); persist()
}
export function demoRecordGoalData(entry) {
  const row = {
    id: uid('gd'), house_id: entry.houseId || null, goal_id: entry.goalId, resident_id: entry.residentId || null,
    log_date: entry.date || todayStr(), result: entry.result || null, value: entry.value ?? null,
    note: entry.note || null, recorded_by: entry.by || null, recorded_at: now(),
  }
  store.goalData.unshift(row); persist()
  return row
}
export function demoFetchGoalData(goalId, limit = 30) {
  return store.goalData.filter(d => d.goal_id === goalId).slice(0, limit)
    .map(d => ({ id: d.id, date: d.log_date, result: d.result, value: d.value, note: d.note, by: d.recorded_by, at: d.recorded_at }))
}

// ── Resident health logs ────────────────────────────────────────────────────
export function demoFetchHealthLogs(houseId, kind = null, limit = 60) {
  return store.healthLogs
    .filter(h => (!houseId || h.house_id === houseId) && (!kind || h.kind === kind))
    .slice(0, limit)
    .map(h => ({ id: h.id, residentId: h.resident_id, resident: h.resident_id ? residentName(h.resident_id) : null, kind: h.kind, amount: h.amount, detail: h.detail || {}, note: h.note, date: h.log_date, occurredAt: h.occurred_at, by: h.recorded_by }))
}
export function demoAddHealthLog(entry) {
  const row = {
    id: uid('hl'), house_id: entry.houseId || null, resident_id: entry.residentId || null,
    kind: entry.kind, amount: entry.amount ?? null, detail: entry.detail || {}, note: entry.note || null,
    log_date: todayStr(), occurred_at: entry.occurredAt || now(), recorded_by: entry.by || null,
  }
  store.healthLogs.unshift(row); persist()
  return { ...row, residentId: row.resident_id, resident: row.resident_id ? residentName(row.resident_id) : null, occurredAt: row.occurred_at, by: row.recorded_by }
}
export function demoDeleteHealthLog(id) {
  store.healthLogs = store.healthLogs.filter(h => h.id !== id); persist()
}

// ── Behavior support plans (BSP) + structured ABC behavior events ────────────
// A behavior_plans row captures the resident's target behaviors and the staff
// playbook (antecedent strategies, replacement behaviors, intervention steps).
// behavior_events are structured ABC data points (one per occurrence) used to
// drive the per-target-behavior frequency mini-chart.
export function demoSeedBehaviorPlans(orgId) {
  if (store.behaviorPlans.length > 0) return
  const james = store.residents.find(r => r.name === 'James Whitaker')
  if (!james) return
  const plan = {
    id: uid('bsp'), org_id: orgId, house_id: james.house_id, resident_id: james.id,
    resident_name: james.name,
    target_behaviors: ['Elopement', 'Escalation / aggression'],
    antecedent_strategies: 'Keep transitions predictable — give a 5-minute warning before any change. Watch for early signs (pacing, repeated questions about leaving). Offer choices to keep a sense of control.',
    replacement_behaviors: 'Ask for a break using his break card. Walk to the sensory corner. Tell staff "I need space" instead of leaving the building.',
    intervention_steps: '1. Stay calm, lower your voice, give physical space.\n2. Acknowledge the feeling ("I can see you\'re frustrated").\n3. Offer the break card and the quiet space.\n4. If he heads for an exit, do NOT block — walk alongside, keep him safe, radio for a second staff.\n5. Once calm, debrief gently and log the ABC entry.',
    created_by_name: 'Marcus Lewis', created_at: now(), updated_at: now(),
  }
  store.behaviorPlans.push(plan)

  // A handful of seeded ABC data points across the last ~2 weeks so the
  // frequency chart has real bars on first load.
  const ev = (offDays, h, behavior, antecedent, consequence, intervention, intensity) => {
    const d = new Date(); d.setDate(d.getDate() - offDays); d.setHours(h, 0, 0, 0)
    store.behaviorEvents.push({
      id: uid('bev'), org_id: orgId, house_id: james.house_id, resident_id: james.id, plan_id: plan.id,
      occurred_at: d.toISOString(), antecedent, behavior, consequence, intervention, intensity,
      recorded_by: 'Reni Tate', created_at: now(),
    })
  }
  ev(12, 15, 'Escalation / aggression', 'Asked to end screen time', 'Calmed with break', 'Offered break card + quiet space', 'Moderate')
  ev(9, 16, 'Elopement', 'Front door left open during delivery', 'Returned safely', 'Walked alongside, radioed second staff', 'Mild')
  ev(6, 14, 'Escalation / aggression', 'Loud noise from kitchen', 'De-escalated in ~10 min', 'Lowered voice, gave space', 'Moderate')
  ev(3, 17, 'Escalation / aggression', 'Transition to dinner', 'Redirected', 'Gave 5-min warning, offered choice', 'Mild')
  ev(1, 11, 'Elopement', 'Wanted to go to the store', 'Redirected to schedule board', 'Reviewed daily plan together', 'Mild')
  persist()
}

export function demoFetchBehaviorPlans(orgId, houseId = null, residentId = null) {
  demoSeedBehaviorPlans(orgId)
  return store.behaviorPlans
    .filter(p => (!houseId || p.house_id === houseId) && (!residentId || p.resident_id === residentId))
    .map(p => ({ ...p, targetBehaviors: p.target_behaviors || [], residentId: p.resident_id, residentName: p.resident_name, createdByName: p.created_by_name, createdAt: p.created_at, updatedAt: p.updated_at }))
}
export function demoCreateBehaviorPlan(orgId, plan) {
  const row = {
    id: uid('bsp'), org_id: orgId, house_id: plan.houseId || null, resident_id: plan.residentId || null,
    resident_name: plan.residentName || (plan.residentId ? residentName(plan.residentId) : null),
    target_behaviors: plan.targetBehaviors || [], antecedent_strategies: plan.antecedentStrategies || '',
    replacement_behaviors: plan.replacementBehaviors || '', intervention_steps: plan.interventionSteps || '',
    created_by_name: plan.createdByName || null, created_at: now(), updated_at: now(),
  }
  store.behaviorPlans.push(row); persist()
  return { ...row, targetBehaviors: row.target_behaviors, residentId: row.resident_id, residentName: row.resident_name, createdByName: row.created_by_name, createdAt: row.created_at, updatedAt: row.updated_at }
}
export function demoUpdateBehaviorPlan(id, updates) {
  const p = store.behaviorPlans.find(x => x.id === id)
  if (!p) return null
  if (updates.targetBehaviors !== undefined)      p.target_behaviors = updates.targetBehaviors
  if (updates.antecedentStrategies !== undefined) p.antecedent_strategies = updates.antecedentStrategies
  if (updates.replacementBehaviors !== undefined) p.replacement_behaviors = updates.replacementBehaviors
  if (updates.interventionSteps !== undefined)    p.intervention_steps = updates.interventionSteps
  p.updated_at = now(); persist()
  // Mirror demoCreateBehaviorPlan so demo + Supabase return the same shape.
  return { ...p, targetBehaviors: p.target_behaviors, residentId: p.resident_id, residentName: p.resident_name, createdByName: p.created_by_name, createdAt: p.created_at, updatedAt: p.updated_at }
}
export function demoDeleteBehaviorPlan(id) {
  store.behaviorPlans = store.behaviorPlans.filter(p => p.id !== id)
  store.behaviorEvents = store.behaviorEvents.filter(e => e.plan_id !== id); persist()
}

export function demoFetchBehaviorEvents(orgId, { residentId = null, planId = null, limit = 60 } = {}) {
  demoSeedBehaviorPlans(orgId)
  return store.behaviorEvents
    .filter(e => (!residentId || e.resident_id === residentId) && (!planId || e.plan_id === planId))
    .sort((a, b) => (b.occurred_at || '').localeCompare(a.occurred_at || ''))
    .slice(0, limit)
    .map(e => ({ id: e.id, residentId: e.resident_id, planId: e.plan_id, occurredAt: e.occurred_at, antecedent: e.antecedent, behavior: e.behavior, consequence: e.consequence, intervention: e.intervention, intensity: e.intensity, by: e.recorded_by }))
}
export function demoCreateBehaviorEvent(orgId, entry) {
  const row = {
    id: uid('bev'), org_id: orgId, house_id: entry.houseId || null, resident_id: entry.residentId || null,
    plan_id: entry.planId || null, occurred_at: entry.occurredAt || now(),
    antecedent: entry.antecedent || '', behavior: entry.behavior || '', consequence: entry.consequence || '',
    intervention: entry.intervention || '', intensity: entry.intensity || null,
    recorded_by: entry.by || null, created_at: now(),
  }
  store.behaviorEvents.unshift(row); persist()
  return { id: row.id, residentId: row.resident_id, planId: row.plan_id, occurredAt: row.occurred_at, antecedent: row.antecedent, behavior: row.behavior, consequence: row.consequence, intervention: row.intervention, intensity: row.intensity, by: row.recorded_by }
}
export function demoDeleteBehaviorEvent(id) {
  store.behaviorEvents = store.behaviorEvents.filter(e => e.id !== id); persist()
}

// ── Safety drills (fire, tornado, evacuation) ────────────────────────────────
export function demoAddDrill(d) {
  const row = {
    id: uid('drill'), house_id: d.houseId || null, type: d.type || 'Fire',
    date: d.date || todayStr(), evac_time: d.evacTime || '', notes: d.notes || '',
    by: d.by || null, at: now(),
  }
  store.drills.unshift(row); persist()
  return row
}
export function demoFetchDrills(houseId) {
  return store.drills.filter(d => !houseId || d.house_id === houseId)
}
export function demoDeleteDrill(id) {
  store.drills = store.drills.filter(d => d.id !== id); persist()
}

export function demoDeleteResident(id) {
  const r = store.residents.find(x => x.id === id)
  store.residents = store.residents.filter(x => x.id !== id)
  if (r) { const h = store.houses.find(x => x.id === r.house_id); if (h && h.residents_count > 0) h.residents_count -= 1 }
  persist()
}

// ── Team chat (messages) ─────────────────────────────────────────────────────
export function demoFetchMessages({ houseId = null } = {}) {
  const want = houseId || null
  return store.messages
    .filter(m => (m.house_id || null) === want)
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
}

export function demoSendMessage(orgId, msg) {
  if (!msg?.body?.trim()) return null
  const row = {
    id: uid('msg'), org_id: orgId, house_id: msg.houseId || null,
    author_staff_id: msg.authorStaffId || null, author_name: msg.authorName || null,
    author_role: msg.authorRole || null, body: msg.body.trim(), created_at: now(),
  }
  store.messages.push(row); persist()
  return row
}

// ── Time clock (punches + shift edit requests) ───────────────────────────────
// Seed staff used to populate a convincing demo when the store is empty.
const SEED_TC_STAFF = [
  { staff_id: 'seed-staff-1', staff_name: 'Aisha Mendez', role: 'staff' },
  { staff_id: 'seed-staff-2', staff_name: 'Jay Brooks',   role: 'staff' },
  { staff_id: 'seed-staff-3', staff_name: 'Marcus Lewis', role: 'staff' },
  { staff_id: 'seed-staff-4', staff_name: 'Priya Nair',   role: 'staff' },
  { staff_id: 'seed-staff-5', staff_name: 'Reni Tate',    role: 'staff' },
]

// Build a LOCAL-equivalent ISO timestamp at the given y/m/d h:m. Using the
// Date(y, m, d, h, min) ctor keeps it in local time, matching `_ds`.
function _localISO(y, m, d, h, min = 0) {
  return new Date(y, m, d, h, min).toISOString()
}

// Seed realistic punches + pending edit requests for the CURRENT week, but ONLY
// when the store is empty (guarded so it never duplicates). Called at the top of
// every time-clock read so the data exists on first render.
export function demoSeedTimeclock(orgId) {
  if (store.punches.length > 0) return
  const today = new Date()
  const y = today.getFullYear(), mo = today.getMonth(), d = today.getDate()
  const dow = today.getDay()                    // 0 = Sunday
  const sundayDate = d - dow                     // day-of-month of this week's Sunday

  // Each seed staff gets a completed punch most days from Sunday up to today.
  SEED_TC_STAFF.forEach((p, idx) => {
    for (let i = 0; i <= dow; i++) {
      const dayOfMonth = sundayDate + i
      // Skip an occasional day so the timesheet isn't perfectly uniform.
      if ((i + idx) % 5 === 4) continue
      const isToday = i === dow
      // The last two staff are CURRENTLY clocked in (today, no clock_out).
      const activeToday = isToday && idx >= SEED_TC_STAFF.length - 2
      const inHour = 7
      const inMin = (idx % 3) * 5            // small stagger 7:00 / 7:05 / 7:10
      const clockIn = _localISO(y, mo, dayOfMonth, inHour, inMin)
      let clockOut = null
      let unpaidBreak = 30
      if (!activeToday) {
        // ~8h day with a small +/- diff vs the 8h schedule.
        const diffMin = ((idx + i) % 3 - 1) * 12   // -12, 0, or +12 minutes
        const outHour = 15
        clockOut = _localISO(y, mo, dayOfMonth, outHour, inMin + diffMin)
      }
      store.punches.push({
        id: uid('punch'), org_id: orgId, house_id: null,
        staff_id: p.staff_id, staff_name: p.staff_name, role: p.role,
        shift_id: null, clock_in_at: clockIn, clock_out_at: clockOut,
        in_lat: null, in_lng: null, out_lat: null, out_lng: null,
        paid_break_min: 0, unpaid_break_min: clockOut ? unpaidBreak : 0,
        auto_closed: false, note: null, created_at: clockIn,
      })
    }
  })

  // ~3 pending shift edit requests referencing seed staff & dates this week.
  const reqSpecs = [
    { p: SEED_TC_STAFF[0], dayOffset: 1, inH: 7, outH: 15, reason: 'Forgot to clock out — left at 3pm.' },
    { p: SEED_TC_STAFF[2], dayOffset: 2, inH: 6, outH: 14, reason: 'Clocked in late, actually started at 6am.' },
    { p: SEED_TC_STAFF[3], dayOffset: 0, inH: 8, outH: 16, reason: 'Covered an extra hour, please adjust.' },
  ]
  reqSpecs.forEach((r) => {
    const dayOfMonth = Math.min(sundayDate + r.dayOffset, d)
    store.shiftEditRequests.push({
      id: uid('sreq'), org_id: orgId, house_id: null,
      staff_id: r.p.staff_id, staff_name: r.p.staff_name,
      target_date: _ds(new Date(y, mo, dayOfMonth)),
      requested_in: _localISO(y, mo, dayOfMonth, r.inH, 0),
      requested_out: _localISO(y, mo, dayOfMonth, r.outH, 0),
      reason: r.reason, status: 'pending',
      decided_by_name: null, decided_at: null, created_at: now(),
    })
  })

  persist()
}

export function demoClockIn(orgId, { houseId, staffId, staffName, role, shiftId, lat, lng } = {}) {
  const row = {
    id: uid('punch'), org_id: orgId, house_id: houseId || null,
    staff_id: staffId || null, staff_name: staffName || null, role: role || null,
    shift_id: shiftId || null, clock_in_at: now(), clock_out_at: null,
    in_lat: lat ?? null, in_lng: lng ?? null, out_lat: null, out_lng: null,
    paid_break_min: 0, unpaid_break_min: 0, auto_closed: false, note: null, created_at: now(),
  }
  store.punches.push(row); persist()
  return row
}

export function demoClockOut(punchId, { lat, lng, paidBreakMin, unpaidBreakMin } = {}) {
  const p = store.punches.find(x => x.id === punchId)
  if (!p) return null
  p.clock_out_at = now()
  if (lat != null) p.out_lat = lat
  if (lng != null) p.out_lng = lng
  if (paidBreakMin != null) p.paid_break_min = paidBreakMin
  if (unpaidBreakMin != null) p.unpaid_break_min = unpaidBreakMin
  persist()
  return p
}

export function demoFetchActivePunch(orgId, staffId) {
  return store.punches.find(p => p.staff_id === staffId && !p.clock_out_at) || null
}

export function demoFetchPunches(orgId, { houseId = null, staffId = null, from = null, to = null } = {}) {
  demoSeedTimeclock(orgId)
  return store.punches
    .filter(p => {
      if (houseId && p.house_id !== houseId) return false
      if (staffId && p.staff_id !== staffId) return false
      const day = asDateStr(new Date(p.clock_in_at))
      if (from && day < from) return false
      if (to && day > to) return false
      return true
    })
    .sort((a, b) => (a.clock_in_at || '').localeCompare(b.clock_in_at || ''))
}

export function demoFetchClockedInNow(orgId, { houseId = null } = {}) {
  demoSeedTimeclock(orgId)
  return store.punches
    .filter(p => !p.clock_out_at && (!houseId || p.house_id === houseId))
    .sort((a, b) => (a.clock_in_at || '').localeCompare(b.clock_in_at || ''))
}

export function demoRequestShiftEdit(orgId, { houseId, staffId, staffName, targetDate, requestedIn, requestedOut, reason } = {}) {
  const row = {
    id: uid('sreq'), org_id: orgId, house_id: houseId || null,
    staff_id: staffId || null, staff_name: staffName || null,
    target_date: asDateStr(targetDate || new Date()),
    requested_in: requestedIn || null, requested_out: requestedOut || null,
    reason: reason || null, status: 'pending',
    decided_by_name: null, decided_at: null, created_at: now(),
  }
  store.shiftEditRequests.push(row); persist()
  return row
}

export function demoFetchShiftEditRequests(orgId, { houseId = null, status = null } = {}) {
  demoSeedTimeclock(orgId)
  return store.shiftEditRequests
    .filter(r => (!houseId || r.house_id === houseId) && (!status || r.status === status))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export function demoReviewShiftEditRequest(id, { status, decidedByName } = {}) {
  const r = store.shiftEditRequests.find(x => x.id === id)
  if (!r) return null
  if (status) r.status = status
  r.decided_by_name = decidedByName || null
  r.decided_at = now()
  persist()
  return r
}

export function demoCountPendingRequests(orgId, { houseId = null } = {}) {
  demoSeedTimeclock(orgId)
  return store.shiftEditRequests
    .filter(r => r.status === 'pending' && (!houseId || r.house_id === houseId))
    .length
}

// ── Time off + Activity ──────────────────────────────────────────────────────
// Seed ~3 realistic time-off requests for seed staff, but ONLY when the store is
// empty (guarded so it never duplicates). Called at the top of every time-off
// read so the data exists on first render. Dates are relative to today.
export function demoSeedTimeOff(orgId) {
  if (store.timeOffRequests.length > 0) return
  const today = new Date()
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return _ds(d) }

  const specs = [
    // Pending vacation next week (3-day trip).
    { p: SEED_TC_STAFF[0], kind: 'vacation', start: 7, end: 9, hours: 24, reason: 'Family trip out of town.', status: 'pending' },
    // Approved sick day last week.
    { p: SEED_TC_STAFF[1], kind: 'sick', start: -6, end: -6, hours: 8, reason: 'Came down with the flu.', status: 'approved', decidedByName: 'Dana Whitfield' },
    // Pending personal day (a few days out).
    { p: SEED_TC_STAFF[3], kind: 'personal', start: 3, end: 3, hours: 8, reason: 'Personal appointment.', status: 'pending' },
  ]
  specs.forEach((s) => {
    store.timeOffRequests.push({
      id: uid('toff'), org_id: orgId, house_id: null,
      staff_id: s.p.staff_id, staff_name: s.p.staff_name,
      kind: s.kind, start_date: addDays(s.start), end_date: addDays(s.end),
      hours: s.hours, reason: s.reason, status: s.status,
      decided_by_name: s.decidedByName || null,
      decided_at: s.status === 'pending' ? null : now(),
      created_at: now(),
    })
  })

  persist()
}

export function demoRequestTimeOff(orgId, { houseId, staffId, staffName, kind, startDate, endDate, hours, reason } = {}) {
  const row = {
    id: uid('toff'), org_id: orgId, house_id: houseId || null,
    staff_id: staffId || null, staff_name: staffName || null,
    kind: kind || 'vacation',
    start_date: asDateStr(startDate || new Date()),
    end_date: asDateStr(endDate || startDate || new Date()),
    hours: hours ?? null, reason: reason || null, status: 'pending',
    decided_by_name: null, decided_at: null, created_at: now(),
  }
  store.timeOffRequests.push(row); persist()
  return row
}

export function demoFetchTimeOffRequests(orgId, { houseId = null, status = null } = {}) {
  demoSeedTimeOff(orgId)
  return store.timeOffRequests
    .filter(r => (!houseId || r.house_id === houseId) && (!status || r.status === status))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export function demoReviewTimeOffRequest(id, { status, decidedByName } = {}) {
  const r = store.timeOffRequests.find(x => x.id === id)
  if (!r) return null
  if (status) r.status = status
  r.decided_by_name = decidedByName || null
  r.decided_at = now()
  persist()
  return r
}

export function demoCountPendingTimeOff(orgId, { houseId = null } = {}) {
  demoSeedTimeOff(orgId)
  return store.timeOffRequests
    .filter(r => r.status === 'pending' && (!houseId || r.house_id === houseId))
    .length
}

// Unified, newest-first activity feed aggregated from punches, shift edit
// requests and time-off requests. Each event:
// { id, kind, at /* ISO */, actor, text, houseId }. House-filter includes
// org-wide (null house_id) rows. Seeders run first so data exists.
const DEMO_WORK_HOUR_LIMIT_MS = 16 * 60 * 60 * 1000
export function demoFetchActivityFeed({ houseId = null, limit = 40 } = {}) {
  demoSeedTimeclock(store.punches[0]?.org_id || 'demo')
  demoSeedTimeOff(store.timeOffRequests[0]?.org_id || 'demo')

  const events = []
  const inHouse = (rowHouseId) => !houseId || rowHouseId == null || rowHouseId === houseId

  for (const p of store.punches) {
    if (!inHouse(p.house_id)) continue
    const name = p.staff_name || 'Someone'
    events.push({ id: `clockin-${p.id}`, kind: 'clock_in', at: p.clock_in_at, actor: name, text: `${name} clocked in`, houseId: p.house_id || null })
    if (p.clock_out_at) {
      events.push({ id: `clockout-${p.id}`, kind: 'clock_out', at: p.clock_out_at, actor: name, text: `${name} clocked out`, houseId: p.house_id || null })
    }
    const end = p.clock_out_at ? new Date(p.clock_out_at).getTime() : Date.now()
    const span = end - new Date(p.clock_in_at).getTime()
    if (span > DEMO_WORK_HOUR_LIMIT_MS) {
      events.push({ id: `whl-${p.id}`, kind: 'work_hour_limit', at: p.clock_out_at || p.clock_in_at, actor: name, text: `${name} exceeded the daily work-hour limit`, houseId: p.house_id || null })
    }
    if (p.auto_closed) {
      events.push({ id: `auto-${p.id}`, kind: 'auto_clock_out', at: p.clock_out_at || p.clock_in_at, actor: name, text: `${name} was auto clocked out`, houseId: p.house_id || null })
    }
  }

  for (const r of store.shiftEditRequests) {
    if (!inHouse(r.house_id)) continue
    const name = r.staff_name || 'Someone'
    events.push({ id: `shiftedit-${r.id}`, kind: 'shift_edit', at: r.created_at, actor: name, text: `${name} requested a shift edit on ${r.target_date}`, houseId: r.house_id || null })
  }

  for (const r of store.timeOffRequests) {
    if (!inHouse(r.house_id)) continue
    const name = r.staff_name || 'Someone'
    events.push({ id: `timeoff-${r.id}`, kind: 'time_off', at: r.created_at, actor: name, text: `${name} requested ${r.kind} time off`, houseId: r.house_id || null })
  }

  for (const e of store.shiftEvents) {
    if (!inHouse(e.house_id)) continue
    events.push({ id: `shev-${e.id}`, kind: e.kind, at: e.at, actor: e.actor || 'Someone', text: e.text, houseId: e.house_id || null })
  }

  return events
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    .slice(0, limit)
}

// ── Announcements / Updates ──────────────────────────────────────────────────
// Mirrors db.js: returns rows augmented with _read / _myVote / _pollCounts /
// _readCount so the UI needs a single call. `bg` ∈ sage|clay|blue|amber|plain.
export function demoSeedAnnouncements(orgId) {
  if (store.announcements.length > 0) return
  const today = new Date()
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return _ds(d) }

  store.announcements.push({
    id: uid('ann'), org_id: orgId, house_id: null,
    author_staff_id: null, author_name: 'Dana Whitfield', author_role: 'supervisor',
    title: 'Welcome to Tend Updates',
    body: "We've launched a new Updates feed so the whole team stays in the loop — shift news, reminders, and quick polls all in one place. Check back here for the latest.",
    bg: 'sage',
    audience_roles: null,
    poll_question: 'How often should we post shift updates?',
    poll_options: ['Daily', 'A few times a week', 'Only when needed'],
    require_read: false,
    created_at: now(),
  })
  store.announcements.push({
    id: uid('ann'), org_id: orgId, house_id: null,
    author_staff_id: null, author_name: 'Dana Whitfield', author_role: 'supervisor',
    title: 'Monthly house meeting',
    body: `Our monthly all-staff house meeting is scheduled for ${addDays(7)}. Please review the agenda and confirm you've seen this update.`,
    bg: 'amber',
    audience_roles: null,
    poll_question: null,
    poll_options: null,
    require_read: true,
    created_at: now(),
  })

  persist()
}

function _augmentAnnouncement(a, staffId) {
  const opts = a.poll_options || []
  const counts = opts.map(() => 0)
  let myVote = null
  for (const v of store.announcementVotes) {
    if (v.announcement_id !== a.id) continue
    if (v.choice >= 0 && v.choice < counts.length) counts[v.choice] += 1
    if (staffId && v.staff_id === staffId) myVote = v.choice
  }
  let readCount = 0
  let read = false
  for (const r of store.announcementReads) {
    if (r.announcement_id !== a.id) continue
    readCount += 1
    if (staffId && r.staff_id === staffId) read = true
  }
  return { ...a, _read: read, _myVote: myVote, _pollCounts: counts, _readCount: readCount }
}

export function demoCreateAnnouncement(orgId, { houseId, authorStaffId, authorName, authorRole, title, body, bg, audienceRoles, pollQuestion, pollOptions, requireRead, publishAt } = {}) {
  const row = {
    id: uid('ann'), org_id: orgId, house_id: houseId || null,
    author_staff_id: authorStaffId || null, author_name: authorName || null, author_role: authorRole || null,
    title: title || null, body: body || '', bg: bg || 'plain',
    audience_roles: (audienceRoles && audienceRoles.length) ? audienceRoles : null,
    poll_question: pollQuestion || null,
    poll_options: (pollOptions && pollOptions.length) ? pollOptions : null,
    require_read: !!requireRead,
    publish_at: publishAt || null,
    created_at: now(),
  }
  store.announcements.push(row); persist()
  return _augmentAnnouncement(row, authorStaffId || null)
}

export function demoFetchAnnouncements(orgId, { houseId = null, staffId = null, role = null } = {}) {
  demoSeedAnnouncements(orgId)
  const nowMs = Date.now()
  return store.announcements
    .filter(a =>
      (role === 'supervisor' || a.house_id == null || a.house_id === houseId) &&
      (!a.audience_roles || a.audience_roles.length === 0 || a.audience_roles.includes(role)) &&
      // Scheduled posts stay hidden until due — except for their own author.
      (!a.publish_at || new Date(a.publish_at).getTime() <= nowMs || (staffId && a.author_staff_id === staffId))
    )
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(a => _augmentAnnouncement(a, staffId))
}

// Reader names for one announcement (newest first). Used by the "Seen by N"
// expander in the admin announcement card.
export function demoFetchAnnouncementReaders(orgId, announcementId) {
  return store.announcementReads
    .filter(r => r.announcement_id === announcementId)
    .sort((a, b) => (b.read_at || '').localeCompare(a.read_at || ''))
    .map(r => ({ staffId: r.staff_id || null, name: r.staff_name || 'Staff', readAt: r.read_at || null }))
}

export function demoMarkAnnouncementRead(orgId, { announcementId, staffId, staffName } = {}) {
  const exists = store.announcementReads.some(r => r.announcement_id === announcementId && r.staff_id === (staffId || null))
  if (!exists) {
    store.announcementReads.push({
      id: uid('aread'), org_id: orgId, announcement_id: announcementId,
      staff_id: staffId || null, staff_name: staffName || null, read_at: now(),
    })
    persist()
  }
  return true
}

export function demoVoteAnnouncementPoll(orgId, { announcementId, staffId, choice } = {}) {
  const v = store.announcementVotes.find(x => x.announcement_id === announcementId && x.staff_id === (staffId || null))
  if (v) { v.choice = choice }
  else {
    store.announcementVotes.push({
      id: uid('avote'), org_id: orgId, announcement_id: announcementId,
      staff_id: staffId || null, choice,
    })
  }
  persist()
  return true
}

export function demoDeleteAnnouncement(id) {
  store.announcements = store.announcements.filter(a => a.id !== id)
  store.announcementReads = store.announcementReads.filter(r => r.announcement_id !== id)
  store.announcementVotes = store.announcementVotes.filter(v => v.announcement_id !== id)
  persist()
  return true
}

export function demoCountUnreadAnnouncements(orgId, { houseId = null, staffId = null, role = null } = {}) {
  demoSeedAnnouncements(orgId)
  return demoFetchAnnouncements(orgId, { houseId, staffId, role }).filter(r => !r._read).length
}

// ── Recognitions / Kudos ─────────────────────────────────────────────────────
// A peer-recognition feed surfaced alongside Updates. Any role can give kudos to
// a staff member (a short message + a badge). `badge` ∈ star|heart|leaf.
export function demoSeedRecognitions(orgId) {
  if (store.recognitions.length > 0) return
  const maple = store.houses.find(h => h.short === 'MAP')
  const oak = store.houses.find(h => h.short === 'OAK')
  const aisha = store.staff.find(s => s.name === 'Aisha Mendez')
  const reni = store.staff.find(s => s.name === 'Reni Tate')

  store.recognitions.push({
    id: uid('kudo'), org_id: orgId, house_id: maple ? maple.id : null,
    to_staff_id: aisha ? aisha.id : null, to_staff_name: 'Aisha Mendez',
    from_name: 'Priya Nair', from_role: 'manager', badge: 'star',
    message: 'Caught a low glove supply at Maple and restocked before anyone asked. Thank you for staying ahead of things!',
    created_at: now(),
  })
  store.recognitions.push({
    id: uid('kudo'), org_id: orgId, house_id: oak ? oak.id : null,
    to_staff_id: reni ? reni.id : null, to_staff_name: 'Reni Tate',
    from_name: 'Marcus Lewis', from_role: 'manager', badge: 'heart',
    message: 'Handled the afternoon escalation with so much patience and care. The whole house felt calmer afterward.',
    created_at: now(),
  })
  persist()
}

export function demoFetchRecognitions(orgId, { houseId = null, role = null } = {}) {
  demoSeedRecognitions(orgId)
  return store.recognitions
    .filter(r => role === 'supervisor' || r.house_id == null || r.house_id === houseId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(r => ({ ...r }))
}

export function demoCreateRecognition(orgId, { houseId, toStaffId, toStaffName, fromName, fromRole, badge, message } = {}) {
  const row = {
    id: uid('kudo'), org_id: orgId, house_id: houseId || null,
    to_staff_id: toStaffId || null, to_staff_name: toStaffName || null,
    from_name: fromName || null, from_role: fromRole || null,
    badge: badge || 'star', message: message || '',
    created_at: now(),
  }
  store.recognitions.push(row); persist()
  return { ...row }
}

// ── Knowledge base / Handbook ────────────────────────────────────────────────
// A searchable SOP / policy / house-binder library. Org-wide (house_id null) or
// house-scoped articles; everyone reads, supervisors/managers author.
export function demoSeedKnowledge(orgId) {
  if (store.kbArticles.length > 0) return
  const mk = (category, title, body, pinned = false) => store.kbArticles.push({
    id: uid('kb'), org_id: orgId, house_id: null, category, title, body,
    pinned, updated_by_name: 'Dana Whitfield', created_at: now(), updated_at: now(),
  })
  mk('Medications', 'Medication administration policy',
    'Follow the six rights for every pass: right resident, right medication, right dose, right route, right time, right documentation.\n\nSign the eMAR immediately after administering — never in advance. Count controlled medications at every shift change with a second staff witness. Report any missed or refused dose to the on-call nurse and document it before the end of shift.', true)
  mk('Safety', 'Fire & tornado drill procedure',
    'Run a fire drill monthly and a tornado drill quarterly in each home.\n\nFire: sound the alarm, evacuate all residents to the front-lawn meeting point, account for everyone, then log the evacuation time. Tornado: move everyone to the interior hallway away from windows and account for all residents. Record every drill in the app the same day.', true)
  mk('Compliance', 'Incident reporting steps',
    'For any injury, fall, medication error, behavioral event, elopement, or allegation: make sure the resident is safe first, then notify your manager and the on-call nurse.\n\nFile the incident in the app before the end of your shift with what happened, who was involved, the time, and the actions you took. Reportable incidents (abuse, neglect, exploitation, serious injury, death) must also be called in to the supervisor immediately.')
  mk('Operations', 'New resident intake checklist',
    'Within 24 hours of admission: confirm the medication list against the pharmacy, record allergies and diet, complete a baseline body check, set up the eMAR and care-plan goals, and note guardian and physician contacts.\n\nWithin the first week: review the behavior support plan with every staff member on the resident’s schedule.')
  persist()
}

export function demoFetchKbArticles(orgId, { houseId = null, role = null } = {}) {
  demoSeedKnowledge(orgId)
  return store.kbArticles
    .filter(a => role === 'supervisor' || a.house_id == null || a.house_id === houseId)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated_at || '').localeCompare(a.updated_at || ''))
    .map(a => ({ ...a }))
}

export function demoCreateKbArticle(orgId, { houseId, category, title, body, pinned, updatedByName } = {}) {
  const row = {
    id: uid('kb'), org_id: orgId, house_id: houseId || null,
    category: category || null, title: title || '', body: body || '',
    pinned: !!pinned, updated_by_name: updatedByName || null,
    created_at: now(), updated_at: now(),
  }
  store.kbArticles.push(row); persist()
  return { ...row }
}

export function demoUpdateKbArticle(id, updates = {}) {
  const a = store.kbArticles.find(x => x.id === id)
  if (!a) return null
  for (const k of ['category', 'title', 'body', 'pinned']) if (updates[k] !== undefined) a[k] = updates[k]
  a.updated_at = now(); persist()
  return { ...a }
}

export function demoDeleteKbArticle(id) {
  store.kbArticles = store.kbArticles.filter(a => a.id !== id); persist(); return true
}

// ── Events / sign-ups ────────────────────────────────────────────────────────
// Dated trainings / house meetings / appointments with RSVP + capacity.
export function demoSeedEvents(orgId) {
  if (store.events.length > 0) return
  const at = (offDays, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + offDays); d.setHours(h, m, 0, 0); return d.toISOString() }
  const maple = store.houses.find(h => h.short === 'MAP')
  store.events.push({ id: uid('evt'), org_id: orgId, house_id: null, title: 'CPR / First Aid recertification', kind: 'training', event_at: at(5, 10), location: 'Riverside training room', capacity: 8, created_by_name: 'Dana Whitfield', status: 'active', created_at: now() })
  store.events.push({ id: uid('evt'), org_id: orgId, house_id: maple ? maple.id : null, title: 'Maple House monthly meeting', kind: 'meeting', event_at: at(7, 17), location: 'Maple House', capacity: null, created_by_name: 'Priya Nair', status: 'active', created_at: now() })
  store.events.push({ id: uid('evt'), org_id: orgId, house_id: null, title: 'Medication management refresher', kind: 'training', event_at: at(12, 14), location: 'Online', capacity: 12, created_by_name: 'Dana Whitfield', status: 'active', created_at: now() })
  persist()
}

function _augmentEvent(e, staffId) {
  let going = 0, mine = null
  for (const r of store.eventRsvps) {
    if (r.event_id !== e.id) continue
    if (r.status === 'going') going += 1
    if (staffId && r.staff_id === staffId) mine = r.status
  }
  return { ...e, _goingCount: going, _myRsvp: mine, _spotsLeft: e.capacity != null ? Math.max(0, e.capacity - going) : null }
}

export function demoFetchEvents(orgId, { houseId = null, role = null, staffId = null, includeArchived = false } = {}) {
  demoSeedEvents(orgId)
  const nowMs = Date.now()
  return store.events
    .filter(e => role === 'supervisor' || e.house_id == null || e.house_id === houseId)
    .filter(e => {
      const past = e.event_at ? new Date(e.event_at).getTime() < nowMs : false
      return includeArchived ? (past || e.status === 'archived') : (e.status === 'active' && !past)
    })
    .sort((a, b) => includeArchived
      ? (b.event_at || '').localeCompare(a.event_at || '')
      : (a.event_at || '').localeCompare(b.event_at || ''))
    .map(e => _augmentEvent(e, staffId))
}

export function demoCreateEvent(orgId, { houseId, title, kind, eventAt, location, capacity, createdByName } = {}) {
  const row = {
    id: uid('evt'), org_id: orgId, house_id: houseId || null,
    title: title || '', kind: kind || 'meeting', event_at: eventAt || null,
    location: location || null, capacity: capacity != null ? capacity : null,
    created_by_name: createdByName || null, status: 'active', created_at: now(),
  }
  store.events.push(row); persist()
  return _augmentEvent(row, null)
}

export function demoRsvpEvent(orgId, { eventId, staffId, staffName, status } = {}) {
  const r = store.eventRsvps.find(x => x.event_id === eventId && x.staff_id === (staffId || null))
  if (r) { r.status = status }
  else store.eventRsvps.push({ id: uid('rsvp'), event_id: eventId, org_id: orgId, staff_id: staffId || null, staff_name: staffName || null, status })
  persist(); return true
}

export function demoArchiveEvent(id) {
  const e = store.events.find(x => x.id === id); if (e) { e.status = 'archived'; persist() } return true
}
export function demoDeleteEvent(id) {
  store.events = store.events.filter(e => e.id !== id)
  store.eventRsvps = store.eventRsvps.filter(r => r.event_id !== id)
  persist(); return true
}
export function demoCountMyUpcomingEvents(orgId, { houseId = null, role = null, staffId = null } = {}) {
  return demoFetchEvents(orgId, { houseId, role, staffId }).filter(e => e._myRsvp === 'going').length
}

// ── Medical appointments ─────────────────────────────────────────────────────
// Per-resident medical appointments (dental, physical, psychiatry, etc.) with a
// provider, transport flag, and an outcome recorded once completed.
export function demoSeedAppointments(orgId) {
  if (store.appointments.length > 0) return
  const at = (offDays, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + offDays); d.setHours(h, m, 0, 0); return d.toISOString() }
  const oak = store.houses.find(h => h.short === 'OAK')
  const maple = store.houses.find(h => h.short === 'MAP')
  const james = store.residents.find(r => r.name === 'James Whitaker')
  const robert = store.residents.find(r => r.name === 'Robert Hayes')
  if (james) {
    store.appointments.push({
      id: uid('appt'), org_id: orgId, house_id: oak ? oak.id : null,
      resident_id: james.id, resident_name: james.name,
      appt_at: at(3, 10, 30), provider: 'Riverside Dental', type: 'dental',
      reason: 'Routine cleaning & exam', status: 'scheduled', outcome: null,
      transport_needed: true, created_by_name: 'Marcus Lewis', created_at: now(),
    })
  }
  if (robert) {
    store.appointments.push({
      id: uid('appt'), org_id: orgId, house_id: maple ? maple.id : null,
      resident_id: robert.id, resident_name: robert.name,
      appt_at: at(6, 14, 0), provider: 'Dr. Patel — Primary Care', type: 'physical',
      reason: 'Annual physical', status: 'scheduled', outcome: null,
      transport_needed: true, created_by_name: 'Priya Nair', created_at: now(),
    })
  }
  persist()
}

export function demoFetchAppointments(orgId, { houseId = null, residentId = null, includeCompleted = true } = {}) {
  demoSeedAppointments(orgId)
  return store.appointments
    .filter(a => (!houseId || a.house_id === houseId) && (!residentId || a.resident_id === residentId))
    .filter(a => includeCompleted || a.status !== 'completed')
    .sort((a, b) => (a.appt_at || '').localeCompare(b.appt_at || ''))
    .map(a => ({ ...a, houses: houseJoin(a.house_id) }))
}

export function demoCreateAppointment(orgId, { houseId, residentId, residentName, apptAt, provider, type, reason, transportNeeded, createdByName } = {}) {
  const row = {
    id: uid('appt'), org_id: orgId, house_id: houseId || null,
    resident_id: residentId || null, resident_name: residentName || null,
    appt_at: apptAt || null, provider: provider || null, type: type || 'other',
    reason: reason || null, status: 'scheduled', outcome: null,
    transport_needed: !!transportNeeded, created_by_name: createdByName || null, created_at: now(),
  }
  store.appointments.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoUpdateAppointment(id, updates = {}) {
  const a = store.appointments.find(x => x.id === id)
  if (!a) return null
  for (const k of ['status', 'outcome', 'provider', 'type', 'reason', 'appt_at', 'transport_needed']) {
    if (updates[k] !== undefined) a[k] = updates[k]
  }
  persist()
  return { ...a, houses: houseJoin(a.house_id) }
}

export function demoDeleteAppointment(id) {
  store.appointments = store.appointments.filter(a => a.id !== id); persist(); return true
}

// ── Resident personal funds (PNI) ledger ─────────────────────────────────────
// One row per deposit / withdrawal against a resident's personal funds. A
// running balance is the sum of deposits minus withdrawals.
export function demoSeedResidentFunds(orgId) {
  if (store.residentFunds.length > 0) return
  const dt = (offDays) => { const d = new Date(); d.setDate(d.getDate() + offDays); return _ds(d) }
  const oak = store.houses.find(h => h.short === 'OAK')
  const james = store.residents.find(r => r.name === 'James Whitaker')
  if (james) {
    const push = (entry) => store.residentFunds.push({
      id: uid('fund'), org_id: orgId, house_id: oak ? oak.id : null,
      resident_id: james.id, resident_name: james.name, created_at: now(), ...entry,
    })
    push({ entry_date: dt(-21), type: 'deposit',    amount: 120.00, category: 'SSI allowance', note: 'Monthly personal-needs allowance', recorded_by_name: 'Marcus Lewis' })
    push({ entry_date: dt(-14), type: 'withdrawal', amount: 18.50,  category: 'Clothing',      note: 'New socks & undershirts',          recorded_by_name: 'Marcus Lewis' })
    push({ entry_date: dt(-5),  type: 'withdrawal', amount: 12.00,  category: 'Outing',        note: 'Movie ticket & snack',             recorded_by_name: 'Reni Tate' })
  }
  persist()
}

export function demoFetchResidentFunds(orgId, { houseId = null, residentId = null } = {}) {
  demoSeedResidentFunds(orgId)
  return store.residentFunds
    .filter(f => (!houseId || f.house_id === houseId) && (!residentId || f.resident_id === residentId))
    .sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || '') || (b.created_at || '').localeCompare(a.created_at || ''))
    .map(f => ({ ...f, houses: houseJoin(f.house_id) }))
}

export function demoAddResidentFundEntry(orgId, { houseId, residentId, residentName, entryDate, type, amount, category, note, recordedByName } = {}) {
  const row = {
    id: uid('fund'), org_id: orgId, house_id: houseId || null,
    resident_id: residentId || null, resident_name: residentName || null,
    entry_date: entryDate || todayStr(), type: type || 'deposit',
    amount: Number(amount) || 0, category: category || null, note: note || null,
    recorded_by_name: recordedByName || null, created_at: now(),
  }
  store.residentFunds.push(row); persist()
  return { ...row, houses: houseJoin(row.house_id) }
}

export function demoDeleteResidentFundEntry(id) {
  store.residentFunds = store.residentFunds.filter(f => f.id !== id); persist(); return true
}

// Running balance = sum(deposits) − sum(withdrawals) over a list of entries.
export function residentFundsBalance(entries = []) {
  return (entries || []).reduce((bal, f) => bal + (f.type === 'withdrawal' ? -1 : 1) * (Number(f.amount) || 0), 0)
}

// ── Schedule templates / tools ───────────────────────────────────────────────
// A template-shift is a day-of-week pattern object:
//   { dayIndex: 0-6, startHour, endHour, role, personName, staffId, note }
// Templates start empty (no seeder).
export function demoSaveScheduleTemplate(orgId, { houseId, name, shifts, createdByName } = {}) {
  const row = {
    id: uid('tmpl'), org_id: orgId, house_id: houseId || null,
    name, shifts: shifts || [], created_by_name: createdByName || null, created_at: now(),
  }
  store.scheduleTemplates.push(row); persist()
  return row
}

export function demoFetchScheduleTemplates(orgId, { houseId } = {}) {
  return store.scheduleTemplates
    .filter(t => !houseId || !t.house_id || t.house_id === houseId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export function demoDeleteScheduleTemplate(id) {
  store.scheduleTemplates = store.scheduleTemplates.filter(t => t.id !== id); persist()
  return true
}

// Insert one shift per template-shift at weekDates[dayIndex], reusing demoAddShift.
// Skips out-of-range dayIndex or a missing weekDates[dayIndex]. Returns the count.
export function demoApplyShiftsToWeek(orgId, { houseId, weekDates, shifts } = {}) {
  const dates = Array.isArray(weekDates) ? weekDates : []
  const list = Array.isArray(shifts) ? shifts : []
  let inserted = 0
  for (const ts of list) {
    if (!ts) continue
    const di = ts.dayIndex
    if (!Number.isInteger(di) || di < 0 || di > 6) continue
    const date = dates[di]
    if (!date) continue
    demoAddShift(houseId, {
      personName: ts.personName, staffId: ts.staffId || null, role: ts.role,
      startHour: ts.startHour, endHour: ts.endHour, date, note: ts.note || null,
      requiredCert: ts.requiredCert || null,
    })
    inserted += 1
  }
  return inserted
}

// ── Shift documentation ──────────────────────────────────────────────────────
// Per resident per shift-date, which care-doc sections got done. A row only
// exists when 'done' or 'na'; no row means still "to do". No seeder.
export function demoFetchShiftDocProgress({ houseId, date } = {}) {
  return store.shiftDocProgress
    .filter(r => r.house_id === (houseId || null) && r.shift_date === date)
    .map(r => ({
      id: r.id, resident_id: r.resident_id, section: r.section,
      status: r.status, done_by_name: r.done_by_name, updated_at: r.updated_at,
    }))
}

export function demoSetShiftDocSection(orgId, { houseId, date, residentId, residentName, section, status, doneByName } = {}) {
  const match = r =>
    r.house_id === (houseId || null) && r.shift_date === date &&
    r.resident_id === (residentId || null) && r.section === section
  if (status === 'done' || status === 'na') {
    const existing = store.shiftDocProgress.find(match)
    if (existing) {
      existing.status = status
      existing.resident_name = residentName || null
      existing.done_by_name = doneByName || null
      existing.updated_at = now()
    } else {
      store.shiftDocProgress.push({
        id: uid('sdoc'), org_id: orgId, house_id: houseId || null,
        shift_date: date, resident_id: residentId || null, resident_name: residentName || null,
        section, status, done_by_name: doneByName || null, updated_at: now(),
      })
    }
    persist()
    return true
  }
  store.shiftDocProgress = store.shiftDocProgress.filter(r => !match(r))
  persist()
  return true
}

// ── Resident progress notes ──────────────────────────────────────────────────
// Free-text progress / behavior / medical / general notes about a resident.
// Raw material for the progress report. No seeder.
export function demoAddResidentNote(orgId, { houseId, residentId, residentName, category, body, authorName, authorRole, noteDate } = {}) {
  const row = {
    id: uid('rnote'), org_id: orgId, house_id: houseId || null,
    resident_id: residentId || null, resident_name: residentName || null,
    category: category || 'progress', body,
    author_name: authorName || null, author_role: authorRole || null,
    note_date: noteDate || todayStr(), created_at: now(),
  }
  store.residentNotes.unshift(row); persist()
  return row
}

export function demoFetchResidentNotes({ houseId = null, residentId = null, from = null, to = null } = {}) {
  return store.residentNotes
    .filter(n =>
      (!houseId || n.house_id === houseId) &&
      (!residentId || n.resident_id === residentId) &&
      (!from || n.note_date >= from) &&
      (!to || n.note_date <= to)
    )
    .sort((a, b) => (b.note_date || '').localeCompare(a.note_date || ''))
    .map(n => ({ id: n.id, resident_id: n.resident_id, resident_name: n.resident_name, category: n.category, body: n.body, author_name: n.author_name, author_role: n.author_role, note_date: n.note_date, created_at: n.created_at }))
}

export function demoDeleteResidentNote(id) {
  store.residentNotes = store.residentNotes.filter(n => n.id !== id); persist()
  return true
}

// ── Forms (no-code form templates + submissions) ─────────────────────────────
// Templates are org-wide (house_id null) or house-scoped; everyone reads/submits,
// supervisors/managers build & review. Mirrors Knowledge's scoping.
const _houseByShort = (short) => store.houses.find(h => h.short === short) || null

export function demoSeedForms(orgId) {
  if (store.formTemplates.length > 0) return
  const maple = _houseByShort('MAP')
  store.formTemplates.push({
    id: uid('ftpl'), org_id: orgId, house_id: null,
    name: 'Shift handoff checklist',
    description: 'Complete at the end of every shift before handing off.',
    fields: [
      { key: 'meds_passed', label: 'All scheduled medications passed', type: 'checkbox', required: true },
      { key: 'incidents', label: 'Any incidents this shift', type: 'select', options: ['None', 'Minor', 'Reported'], required: true },
      { key: 'notes', label: 'Handoff notes for next shift', type: 'text', required: false },
    ],
    created_by_name: 'Priya Nair', created_at: now(),
  })
  store.formTemplates.push({
    id: uid('ftpl'), org_id: orgId, house_id: maple ? maple.id : null,
    name: 'Vehicle safety check',
    description: 'Walk-around before any resident transport.',
    fields: [
      { key: 'tires', label: 'Tires OK', type: 'checkbox', required: true },
      { key: 'lights', label: 'Lights working', type: 'checkbox', required: true },
      { key: 'mileage', label: 'Starting mileage', type: 'number', required: true },
    ],
    created_by_name: 'Marcus Lewis', created_at: now(),
  })
  // One open submission so the review queue isn't empty.
  const tpl = store.formTemplates[0]
  store.formSubmissions.push({
    id: uid('fsub'), org_id: orgId, house_id: null, template_id: tpl.id,
    answers: { meds_passed: true, incidents: 'None', notes: 'Quiet evening, all residents settled.' },
    submitted_by_name: 'Aisha Mendez', submitted_at: now(), status: 'open', reviewed_by_name: null,
  })
  persist()
}

export function demoFetchFormTemplates(orgId, { houseId = null, role = null } = {}) {
  demoSeedForms(orgId)
  return store.formTemplates
    .filter(t => role === 'supervisor' || t.house_id == null || t.house_id === houseId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(t => ({ ...t }))
}

export function demoCreateFormTemplate(orgId, { houseId, name, description, fields, createdByName } = {}) {
  const row = {
    id: uid('ftpl'), org_id: orgId, house_id: houseId || null,
    name: name || '', description: description || '', fields: Array.isArray(fields) ? fields : [],
    created_by_name: createdByName || null, created_at: now(),
  }
  store.formTemplates.push(row); persist()
  return { ...row }
}

export function demoDeleteFormTemplate(id) {
  store.formTemplates = store.formTemplates.filter(t => t.id !== id)
  store.formSubmissions = store.formSubmissions.filter(s => s.template_id !== id)
  persist(); return true
}

export function demoFetchFormSubmissions(orgId, { templateId = null, houseId = null } = {}) {
  demoSeedForms(orgId)
  return store.formSubmissions
    .filter(s => (!templateId || s.template_id === templateId) && (!houseId || s.house_id === houseId || s.house_id == null))
    .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''))
    .map(s => ({ ...s }))
}

export function demoSubmitForm(orgId, { templateId, houseId, answers, submittedByName } = {}) {
  const row = {
    id: uid('fsub'), org_id: orgId, house_id: houseId || null, template_id: templateId || null,
    answers: answers && typeof answers === 'object' ? answers : {},
    submitted_by_name: submittedByName || null, submitted_at: now(),
    status: 'open', reviewed_by_name: null,
  }
  store.formSubmissions.unshift(row); persist()
  return { ...row }
}

export function demoReviewFormSubmission(id, { reviewedByName } = {}) {
  const s = store.formSubmissions.find(x => x.id === id)
  if (!s) return null
  s.status = 'reviewed'; s.reviewed_by_name = reviewedByName || null
  persist(); return { ...s }
}

// ── Surveys (staff pulse / training feedback) ────────────────────────────────
// Org-wide or house-scoped; rows augmented with _responseCount and _myResponded.
export function demoSeedSurveys(orgId) {
  if (store.surveys.length > 0) return
  store.surveys.push({
    id: uid('svy'), org_id: orgId, house_id: null,
    title: 'Team morale pulse',
    questions: [
      { q: 'How supported do you feel this month?', type: 'rating' },
      { q: 'Do you have the supplies you need?', type: 'yesno' },
      { q: 'Anything we should change?', type: 'text' },
    ],
    anonymous: true, created_by_name: 'Dana Whitfield', status: 'active', created_at: now(),
  })
  persist()
}

// Build per-question tallies from collected answers (keyed by question index).
// Returns a CLONE of the questions array with _tallies / _avg attached; never
// mutates the stored template.
function _surveyTallies(questions, responses) {
  const qs = Array.isArray(questions) ? questions : []
  return qs.map((q, i) => {
    if (!q || typeof q !== 'object') return q
    const type = q.type
    if (type === 'multiple' || type === 'yesno') {
      const tallies = {}
      for (const r of responses) {
        const v = r?.answers ? r.answers[i] : undefined
        if (v == null || String(v).trim() === '') continue
        const key = String(v)
        tallies[key] = (tallies[key] || 0) + 1
      }
      return { ...q, _tallies: tallies }
    }
    if (type === 'rating') {
      const tallies = {}
      let sum = 0, n = 0
      for (const r of responses) {
        const raw = r?.answers ? r.answers[i] : undefined
        const num = Number(raw)
        if (!Number.isFinite(num) || num < 1 || num > 5) continue
        const key = String(Math.round(num))
        tallies[key] = (tallies[key] || 0) + 1
        sum += num; n += 1
      }
      return { ...q, _tallies: tallies, _avg: n > 0 ? sum / n : null }
    }
    return { ...q }
  })
}

function _augmentSurvey(s, staffId) {
  let count = 0, mine = false
  const responses = []
  for (const r of store.surveyResponses) {
    if (r.survey_id !== s.id) continue
    count += 1
    responses.push(r)
    if (staffId && r.staff_id === staffId) mine = true
  }
  return {
    ...s,
    questions: _surveyTallies(s.questions, responses),
    _responseCount: count,
    _myResponded: mine,
  }
}

export function demoFetchSurveys(orgId, { houseId = null, role = null, staffId = null } = {}) {
  demoSeedSurveys(orgId)
  return store.surveys
    .filter(s => role === 'supervisor' || s.house_id == null || s.house_id === houseId)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(s => _augmentSurvey(s, staffId))
}

export function demoCreateSurvey(orgId, { houseId, title, questions, anonymous, createdByName } = {}) {
  const row = {
    id: uid('svy'), org_id: orgId, house_id: houseId || null,
    title: title || '', questions: Array.isArray(questions) ? questions : [],
    anonymous: !!anonymous, created_by_name: createdByName || null,
    status: 'active', created_at: now(),
  }
  store.surveys.push(row); persist()
  return _augmentSurvey(row, null)
}

export function demoSubmitSurveyResponse(orgId, { surveyId, staffId, answers } = {}) {
  // Anonymous surveys must never store who responded. Look up the survey's
  // anonymous flag and force staff_id=null when set. Dedup only applies to
  // non-anonymous responses (which carry a staff_id).
  const svy = store.surveys.find(x => x.id === surveyId)
  const anonymous = !!(svy && svy.anonymous)
  const effectiveStaffId = anonymous ? null : (staffId || null)
  const cleanAnswers = answers && typeof answers === 'object' ? answers : {}
  const existing = anonymous
    ? null
    : store.surveyResponses.find(r => r.survey_id === surveyId && r.staff_id === effectiveStaffId)
  if (existing) {
    existing.answers = cleanAnswers
    existing.submitted_at = now()
  } else {
    store.surveyResponses.push({
      id: uid('sresp'), org_id: orgId, survey_id: surveyId || null, staff_id: effectiveStaffId,
      answers: cleanAnswers, submitted_at: now(),
    })
  }
  persist(); return true
}

export function demoCloseSurvey(id) {
  const s = store.surveys.find(x => x.id === id)
  if (s) { s.status = 'closed'; persist() }
  return true
}

export function demoDeleteSurvey(id) {
  store.surveys = store.surveys.filter(s => s.id !== id)
  store.surveyResponses = store.surveyResponses.filter(r => r.survey_id !== id)
  persist(); return true
}

// ── Courses / Training ───────────────────────────────────────────────────────
// Assignable training courses with sections + an optional quiz. Staff complete
// a course (passing the quiz, if any) and a completion row is recorded — one per
// (course, staff). Org-wide (house_id null) or house-scoped; everyone takes,
// supervisors/managers author and see the roll-up. Mirrors surveys/knowledge.
export function demoSeedCourses(orgId) {
  if (store.courses.length > 0) return
  store.courses.push({
    id: uid('crs'), org_id: orgId, house_id: null,
    title: 'Medication Administration Basics',
    description: 'The core safety rules every staff member must know before passing medications.',
    sections: [
      { title: 'The six rights', body: 'Before every medication pass, confirm the six rights: right resident, right medication, right dose, right route, right time, and right documentation. Never skip a check, even for a routine pass you have done a hundred times.' },
      { title: 'Documentation', body: 'Sign the eMAR immediately after administering — never in advance and never in a batch at the end of shift. If a dose is missed or refused, document it and notify the on-call nurse before the end of your shift.' },
      { title: 'Controlled medications', body: 'Count controlled medications at every shift change with a second staff witness. Both staff sign the count sheet. Any discrepancy is reported to the manager immediately.' },
    ],
    quiz: [
      { q: 'How many "rights" must you confirm before every medication pass?', options: ['Three', 'Five', 'Six', 'Eight'], answer: 2 },
      { q: 'When should you sign the eMAR?', options: ['Before administering', 'Immediately after administering', 'At the end of your shift', 'Only if asked'], answer: 1 },
      { q: 'Controlled medications are counted at shift change with…', options: ['No witness needed', 'A second staff witness', 'The resident present', 'A photo only'], answer: 1 },
    ],
    required: true, assign_roles: [], created_by_name: 'Dana Whitfield', created_at: now(),
  })
  store.courses.push({
    id: uid('crs'), org_id: orgId, house_id: null,
    title: 'Fire Safety',
    description: 'Evacuation procedure and drill expectations for every home.',
    sections: [
      { title: 'If the alarm sounds', body: 'Sound the alarm, evacuate all residents to the front-lawn meeting point, account for everyone, then log the evacuation time. Do not re-enter the building for belongings.' },
      { title: 'Drills', body: 'Run a fire drill monthly in each home and record it in the app the same day. Note the evacuation time and anyone who needed extra assistance.' },
    ],
    quiz: [
      { q: 'Where do residents gather during a fire evacuation?', options: ['The back yard', 'The front-lawn meeting point', 'Their bedrooms', 'The van'], answer: 1 },
      { q: 'How often should a fire drill be run in each home?', options: ['Yearly', 'Quarterly', 'Monthly', 'Only when staff change'], answer: 2 },
    ],
    required: true, assign_roles: [], created_by_name: 'Dana Whitfield', created_at: now(),
  })
  persist()
}

function _augmentCourse(c, staffId) {
  let mine = null, count = 0
  for (const r of store.courseCompletions) {
    if (r.course_id !== c.id) continue
    count += 1
    if (staffId && r.staff_id === staffId) mine = r
  }
  return {
    ...c,
    _myCompleted: !!mine,
    _myScore: mine ? mine.score : null,
    _myCompletedAt: mine ? mine.completed_at : null,
    _completionCount: count,
  }
}

export function demoFetchCourses(orgId, { houseId = null, role = null, staffId = null } = {}) {
  demoSeedCourses(orgId)
  return store.courses
    .filter(c => role === 'supervisor' || c.house_id == null || c.house_id === houseId)
    .sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0) || (b.created_at || '').localeCompare(a.created_at || ''))
    .map(c => _augmentCourse(c, staffId))
}

export function demoCreateCourse(orgId, { houseId, title, description, sections, quiz, required, assignRoles, createdByName } = {}) {
  const row = {
    id: uid('crs'), org_id: orgId, house_id: houseId || null,
    title: title || '', description: description || '',
    sections: Array.isArray(sections) ? sections : [],
    quiz: Array.isArray(quiz) ? quiz : [],
    required: !!required, assign_roles: Array.isArray(assignRoles) ? assignRoles : [],
    created_by_name: createdByName || null, created_at: now(),
  }
  store.courses.push(row); persist()
  return _augmentCourse(row, null)
}

export function demoDeleteCourse(id) {
  store.courses = store.courses.filter(c => c.id !== id)
  store.courseCompletions = store.courseCompletions.filter(r => r.course_id !== id)
  persist(); return true
}

export function demoCompleteCourse(orgId, { courseId, staffId, staffName, score } = {}) {
  const existing = store.courseCompletions.find(r => r.course_id === courseId && r.staff_id === (staffId || null))
  if (existing) {
    existing.score = score == null ? existing.score : score
    existing.completed_at = now()
    persist()
    return { ...existing }
  }
  const row = {
    id: uid('ccmp'), org_id: orgId, course_id: courseId || null,
    staff_id: staffId || null, staff_name: staffName || null,
    score: score == null ? null : score, completed_at: now(),
  }
  store.courseCompletions.push(row); persist()
  return { ...row }
}

export function demoFetchCourseCompletions(orgId, { courseId = null } = {}) {
  return store.courseCompletions
    .filter(r => !courseId || r.course_id === courseId)
    .map(r => ({ ...r }))
}

// ── Quick tasks (assignable one-off tasks with due dates) ────────────────────
export function demoSeedQuickTasks(orgId) {
  if (store.quickTasks.length > 0) return
  const maple = _houseByShort('MAP')
  const oak = _houseByShort('OAK')
  const at = (offDays, h = 17) => { const d = new Date(); d.setDate(d.getDate() + offDays); d.setHours(h, 0, 0, 0); return d.toISOString() }
  store.quickTasks.push({
    id: uid('qtask'), org_id: orgId, house_id: maple ? maple.id : null,
    title: 'Restock first-aid kit', notes: 'Bandages and gloves running low in the office.',
    assigned_staff_id: null, assigned_name: 'Aisha Mendez', due_at: at(1),
    status: 'open', created_by_name: 'Priya Nair', created_at: now(), done_at: null, done_by_name: null,
  })
  store.quickTasks.push({
    id: uid('qtask'), org_id: orgId, house_id: oak ? oak.id : null,
    title: 'Confirm pharmacy delivery window', notes: '',
    assigned_staff_id: null, assigned_name: 'Marcus Lewis', due_at: at(2, 12),
    status: 'open', created_by_name: 'Marcus Lewis', created_at: now(), done_at: null, done_by_name: null,
  })
  persist()
}

export function demoFetchQuickTasks(orgId, { houseId = null, assignedStaffId = null, status = null } = {}) {
  demoSeedQuickTasks(orgId)
  return store.quickTasks
    .filter(t => (!houseId || t.house_id === houseId || t.house_id == null) &&
      (!assignedStaffId || t.assigned_staff_id === assignedStaffId) &&
      (!status || t.status === status))
    .sort((a, b) => (a.due_at || '￿').localeCompare(b.due_at || '￿') || (b.created_at || '').localeCompare(a.created_at || ''))
    .map(t => ({ ...t }))
}

export function demoCreateQuickTask(orgId, { houseId, title, notes, assignedStaffId, assignedName, dueAt, createdByName } = {}) {
  const row = {
    id: uid('qtask'), org_id: orgId, house_id: houseId || null,
    title: title || '', notes: notes || '', assigned_staff_id: assignedStaffId || null,
    assigned_name: assignedName || null, due_at: dueAt || null, status: 'open',
    created_by_name: createdByName || null, created_at: now(), done_at: null, done_by_name: null,
  }
  store.quickTasks.push(row); persist()
  // Notify the assignee that a task was given to them (activity feed event).
  if (row.assigned_name) {
    demoAddTaskEvent(orgId, {
      houseId: row.house_id, kind: 'task_assigned', actor: row.created_by_name || 'Someone',
      text: `${row.created_by_name || 'Someone'} assigned ${row.assigned_name} a task — ${row.title || 'Untitled task'}`,
      forName: row.assigned_name,
    })
  }
  return { ...row }
}

export function demoCompleteQuickTask(id, doneByName) {
  const t = store.quickTasks.find(x => x.id === id)
  if (!t) return null
  t.status = 'done'; t.done_at = now(); t.done_by_name = doneByName || null
  persist()
  // Notify the task's creator that it was completed (activity feed event).
  if (t.created_by_name) {
    demoAddTaskEvent(t.org_id, {
      houseId: t.house_id, kind: 'task_completed', actor: doneByName || 'Someone',
      text: `${doneByName || 'Someone'} completed a task — ${t.title || 'Untitled task'}`,
      forName: t.created_by_name,
    })
  }
  return { ...t }
}

export function demoReopenQuickTask(id) {
  const t = store.quickTasks.find(x => x.id === id)
  if (!t) return null
  t.status = 'open'; t.done_at = null; t.done_by_name = null
  persist(); return { ...t }
}

export function demoDeleteQuickTask(id) {
  store.quickTasks = store.quickTasks.filter(t => t.id !== id); persist(); return true
}

// ── Directory (external contacts) ────────────────────────────────────────────
export function demoSeedContacts(orgId) {
  if (store.contacts.length > 0) return
  const maple = _houseByShort('MAP')
  const mk = (name, kind, orgName, phone, email, notes, houseId = null) => store.contacts.push({
    id: uid('cnt'), org_id: orgId, house_id: houseId, name, kind, org_name: orgName,
    phone, email, notes, created_at: now(),
  })
  mk('Riverside Pharmacy', 'pharmacy', 'Riverside Pharmacy', '555-0142', 'rx@riversidepharmacy.example', 'Delivery before noon weekdays.')
  mk('Dr. Helen Voss', 'physician', 'Northside Family Medicine', '555-0178', 'hvoss@northsidemed.example', 'Primary care for several residents.')
  mk('Andre Bell', 'case_manager', 'County DD Services', '555-0193', 'abell@countydds.example', 'Case manager — ISP reviews.', maple ? maple.id : null)
  mk('Crisis & On-call Line', 'emergency', 'Regional Crisis Network', '555-0911', '', 'Available 24/7 for behavioral crises.')
  persist()
}

export function demoFetchContacts(orgId, { houseId = null, role = null } = {}) {
  demoSeedContacts(orgId)
  return store.contacts
    .filter(c => role === 'supervisor' || c.house_id == null || c.house_id === houseId)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(c => ({ ...c }))
}

export function demoCreateContact(orgId, { houseId, name, kind, orgName, phone, email, notes } = {}) {
  const row = {
    id: uid('cnt'), org_id: orgId, house_id: houseId || null,
    name: name || '', kind: kind || 'other', org_name: orgName || '',
    phone: phone || '', email: email || '', notes: notes || '', created_at: now(),
  }
  store.contacts.push(row); persist()
  return { ...row }
}

export function demoUpdateContact(id, updates = {}) {
  const c = store.contacts.find(x => x.id === id)
  if (!c) return null
  if (updates.name !== undefined)    c.name = updates.name
  if (updates.kind !== undefined)    c.kind = updates.kind
  if (updates.orgName !== undefined) c.org_name = updates.orgName
  if (updates.phone !== undefined)   c.phone = updates.phone
  if (updates.email !== undefined)   c.email = updates.email
  if (updates.notes !== undefined)   c.notes = updates.notes
  persist(); return { ...c }
}

export function demoDeleteContact(id) {
  store.contacts = store.contacts.filter(c => c.id !== id); persist(); return true
}

// ── Help Desk (internal ticketing) ───────────────────────────────────────────
export function demoSeedTickets(orgId) {
  if (store.tickets.length > 0) return
  const maple = _houseByShort('MAP')
  store.tickets.push({
    id: uid('tkt'), org_id: orgId, house_id: maple ? maple.id : null,
    topic: 'maintenance', subject: 'Kitchen faucet leaking', body: 'Slow drip under the sink at Maple; bucket in place for now.',
    status: 'open', priority: 'med', created_by_name: 'Aisha Mendez', created_by_staff_id: null,
    assigned_to_name: null, created_at: now(), updated_at: now(),
  })
  store.tickets.push({
    id: uid('tkt'), org_id: orgId, house_id: null,
    topic: 'it', subject: 'Tablet won’t hold a charge', body: 'The shared documentation tablet dies within an hour.',
    status: 'in_progress', priority: 'low', created_by_name: 'Marcus Lewis', created_by_staff_id: null,
    assigned_to_name: 'Dana Whitfield', created_at: now(), updated_at: now(),
  })
  persist()
}

export function demoFetchTickets(orgId, { houseId = null, role = null, staffId = null } = {}) {
  demoSeedTickets(orgId)
  return store.tickets
    .filter(t => role === 'supervisor' || t.house_id == null || t.house_id === houseId ||
      (staffId && t.created_by_staff_id === staffId))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .map(t => ({ ...t }))
}

export function demoCreateTicket(orgId, { houseId, topic, subject, body, priority, createdByName, createdByStaffId } = {}) {
  const row = {
    id: uid('tkt'), org_id: orgId, house_id: houseId || null,
    topic: topic || 'other', subject: subject || '', body: body || '',
    status: 'open', priority: priority || 'med',
    created_by_name: createdByName || null, created_by_staff_id: createdByStaffId || null,
    assigned_to_name: null, created_at: now(), updated_at: now(),
  }
  store.tickets.unshift(row); persist()
  return { ...row }
}

export function demoUpdateTicket(id, { status, assignedToName } = {}) {
  const t = store.tickets.find(x => x.id === id)
  if (!t) return null
  if (status !== undefined) t.status = status
  if (assignedToName !== undefined) t.assigned_to_name = assignedToName || null
  t.updated_at = now()
  persist(); return { ...t }
}

// ── Smart groups (reusable saved audiences) ──────────────────────────────────
// A saved audience definition that expands to a set of staff via house + roles
// + an optional required cert. A convenience layer over the existing ad-hoc
// targeting in Updates — picking a group pre-fills the audience scope.
//   { id, org_id, name, house_id (null = org-wide), roles text[],
//     required_cert (null), created_by_name, created_at }
// `roles` use the staff rawRole values ('manager' | 'staff'); an empty array
// means "any role".
export function demoSeedSmartGroups(orgId) {
  if (store.smartGroups.length > 0) return
  const maple = _houseByShort('MAP')
  const mk = (name, houseId, roles, requiredCert, createdByName) => store.smartGroups.push({
    id: uid('sg'), org_id: orgId, house_id: houseId, name,
    roles: roles || [], required_cert: requiredCert || null,
    created_by_name: createdByName || null, created_at: now(),
  })
  mk('All DSPs', null, ['staff'], null, 'Dana Whitfield')
  mk('Maple House team', maple ? maple.id : null, [], null, 'Priya Nair')
  mk('Med-certified staff', null, [], 'Medication Administration', 'Dana Whitfield')
  persist()
}

export function demoFetchSmartGroups(orgId) {
  demoSeedSmartGroups(orgId)
  return store.smartGroups
    .filter(g => g.org_id === orgId || !orgId)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(g => ({
      id: g.id, orgId: g.org_id, houseId: g.house_id || null, name: g.name,
      roles: Array.isArray(g.roles) ? g.roles : [], requiredCert: g.required_cert || null,
      createdByName: g.created_by_name || null, createdAt: g.created_at,
    }))
}

export function demoCreateSmartGroup(orgId, { houseId, name, roles, requiredCert, createdByName } = {}) {
  const row = {
    id: uid('sg'), org_id: orgId, house_id: houseId || null,
    name: name || '', roles: Array.isArray(roles) ? roles : [],
    required_cert: requiredCert || null, created_by_name: createdByName || null, created_at: now(),
  }
  store.smartGroups.push(row); persist()
  return {
    id: row.id, orgId: row.org_id, houseId: row.house_id, name: row.name,
    roles: row.roles, requiredCert: row.required_cert,
    createdByName: row.created_by_name, createdAt: row.created_at,
  }
}

export function demoDeleteSmartGroup(id) {
  store.smartGroups = store.smartGroups.filter(g => g.id !== id); persist(); return true
}

// Expand a saved group to the set of matching staff ids, via house + roles +
// required cert. A staff member matches when: (no house filter, or their house
// matches), (no role filter, or their rawRole is in the group's roles), and
// (no cert filter, or they hold a non-expired cert by that name).
export function demoResolveSmartGroup(orgId, groupId) {
  const g = store.smartGroups.find(x => x.id === groupId)
  if (!g) return []
  const roles = Array.isArray(g.roles) ? g.roles : []
  const cert = g.required_cert || null
  const today = todayStr()
  return store.staff
    .filter(s => s.role !== 'supervisor')
    .filter(s => !g.house_id || s.house_id === g.house_id)
    .filter(s => roles.length === 0 || roles.includes(s.role))
    .filter(s => {
      if (!cert) return true
      return (s.certs || []).some(c => c && c.name === cert && (!c.expires || c.expires >= today))
    })
    .map(s => s.id)
}

// ── Task notifications (activity feed events for quick tasks) ─────────────────
// Reuse the shiftEvents activity-feed plumbing so an assigned/completed task
// surfaces in the same unified feed as schedule events. `forName` is the person
// the event is addressed to (assignee on create, creator on complete).
export function demoAddTaskEvent(orgId, { houseId, kind, actor, text, forName } = {}) {
  store.shiftEvents.push({
    id: uid('shev'), org_id: orgId || null, house_id: houseId || null, kind: kind || 'task',
    actor: actor || 'Someone', text: text || '', for_name: forName || null, at: now(),
  })
  persist()
}

// Count of open quick tasks whose due_at is in the past (org-wide or, optionally,
// scoped to a house and/or a specific assignee). Powers the Overdue chip + count
// and the Home/MyDay "N tasks overdue" surfacing.
export function demoCountOverdueQuickTasks(orgId, { houseId = null, assignedStaffId = null } = {}) {
  demoSeedQuickTasks(orgId)
  const sod = new Date(); sod.setHours(0, 0, 0, 0); const sodMs = sod.getTime()  // start of today
  return store.quickTasks.filter(t =>
    t.status === 'open' && t.due_at && new Date(t.due_at).getTime() < sodMs &&
    (!houseId || t.house_id === houseId || t.house_id == null) &&
    (!assignedStaffId || t.assigned_staff_id === assignedStaffId)
  ).length
}
