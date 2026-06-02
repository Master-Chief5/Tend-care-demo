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
  return { houses: [], shifts: [], staff: [], trips: [], vehicles: [], resources: [], residents: [], tasks: [] }
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
function todayStr() { return new Date().toISOString().split('T')[0] }
function asDateStr(d) { return typeof d === 'string' ? d : d.toISOString().split('T')[0] }

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

// ── Shifts ──────────────────────────────────────────────────────────────────
export function demoFetchShifts(houseId, date) {
  const dateStr = asDateStr(date)
  return store.shifts
    .filter(s => s.shift_date === dateStr && (!houseId || s.house_id === houseId))
    .map(s => ({
      id: s.id, house: houseJoin(s.house_id)?.slug ?? s.house_id,
      start: Number(s.start_hour), end: Number(s.end_hour),
      person: s.person_name, role: s.role, status: s.status,
    }))
}

export function demoFetchShiftsWeek(houseId, weekStart, weekEnd) {
  const startStr = asDateStr(weekStart), endStr = asDateStr(weekEnd)
  return store.shifts
    .filter(s => s.shift_date >= startStr && s.shift_date <= endStr && (!houseId || s.house_id === houseId))
    .map(s => ({
      id: s.id, house: houseJoin(s.house_id)?.slug ?? s.house_id, date: s.shift_date,
      start: Number(s.start_hour), end: Number(s.end_hour),
      person: s.person_name, role: s.role, status: s.status,
    }))
}

export function demoAddShift(houseId, shift) {
  const row = {
    id: uid('shift'), house_id: houseId,
    person_name: shift.personName, role: shift.role,
    start_hour: shift.startHour, end_hour: shift.endHour,
    shift_date: shift.date || todayStr(), status: 'scheduled',
  }
  store.shifts.push(row); persist()
  return row
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
      score: s.quality_score ?? 85, sub: s.tenure ?? '',
      highlight: s.highlight ?? null, tenure: s.tenure ?? '', notes: s.notes ?? '',
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

// ── Residents ───────────────────────────────────────────────────────────────
export function demoFetchResidents(houseId) {
  return store.residents
    .filter(r => !houseId || r.house_id === houseId)
    .map(r => ({ ...r, houses: houseJoin(r.house_id) }))
}

export function demoAddResident(houseId, resident) {
  const row = {
    id: uid('resi'), house_id: houseId || null,
    name: resident.name, room: resident.room || null, dob: resident.dob || null,
    status: resident.status || 'active', notes: resident.notes || null,
  }
  store.residents.push(row)
  const h = store.houses.find(x => x.id === houseId)
  if (h) h.residents_count = (h.residents_count ?? 0) + 1
  persist()
  return row
}
