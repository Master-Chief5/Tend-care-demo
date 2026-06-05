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
  return { houses: [], shifts: [], staff: [], trips: [], vehicles: [], resources: [], residents: [], tasks: [], medAlerts: [], shiftNotes: [], items: [], meds: [], medAdmins: [], prnLog: [], dailyLog: [], incidents: [], drills: [], goals: [], goalData: [], healthLogs: [], settings: {} }
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

// ── Houses ──────────────────────────────────────────────────────────────────
export function demoFetchHouses() {
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
export function demoFetchSupplyBudget() { return store.settings?.supply_budget ?? null }
export function demoSetSupplyBudget(amount) { store.settings = { ...(store.settings || {}), supply_budget: amount }; persist(); return amount }

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
      person: s.person_name, staffId: s.staff_id ?? null, role: s.role, note: s.note ?? null, status: s.status,
    }))
}

export function demoFetchShiftsWeek(houseId, weekStart, weekEnd) {
  const startStr = asDateStr(weekStart), endStr = asDateStr(weekEnd)
  return store.shifts
    .filter(s => s.shift_date >= startStr && s.shift_date <= endStr && (!houseId || s.house_id === houseId))
    .map(s => ({
      id: s.id, house: houseJoin(s.house_id)?.slug ?? s.house_id, date: s.shift_date,
      start: Number(s.start_hour), end: Number(s.end_hour),
      person: s.person_name, staffId: s.staff_id ?? null, role: s.role, note: s.note ?? null, status: s.status,
    }))
}

export function demoAddShift(houseId, shift) {
  const row = {
    id: uid('shift'), house_id: houseId,
    person_name: shift.personName, staff_id: shift.staffId || null, role: shift.role,
    start_hour: shift.startHour, end_hour: shift.endHour,
    shift_date: shift.date || todayStr(), note: shift.note || null, status: 'scheduled',
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
  if (updates.status !== undefined)     s.status = updates.status
  persist()
  return s
}

export function demoDeleteShift(id) {
  store.shifts = store.shifts.filter(s => s.id !== id); persist()
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
