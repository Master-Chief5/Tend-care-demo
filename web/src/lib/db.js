import { supabase, isDemoMode } from './supabase'
import * as demo from './demoStore'

// Returns the staff profile for the authenticated user.
// Uses a SECURITY DEFINER RPC that bypasses RLS — safe for initial login bootstrap.
// Returns the profile object, or null when the user genuinely has no staff row
// yet (a real "needs setup" state). THROWS on a transport error or timeout so
// the caller can tell "no profile" apart from "couldn't reach the server" and
// retry instead of mistakenly routing the user to org setup.
export async function fetchStaffProfile(authUserId, _email) {
  if (!supabase || !authUserId) return null

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('profile timeout')), 6000)
  )
  const { data, error } = await Promise.race([supabase.rpc('get_my_staff_profile'), timeout])
  if (error) { console.error('fetchStaffProfile:', error.message); throw new Error(error.message) }
  if (!data || data.length === 0) return null
  const row = data[0]
  return {
    staffId:   row.staff_id,
    orgId:     row.org_id,
    houseId:   row.house_id,
    houseSlug: row.house_slug ?? null,
    role:      row.role,
    name:      row.staff_name,
  }
}

// Fetch all shifts for an org on a given date.
// Pass houseId to limit to one house (managers/staff); null for all (supervisors).
export async function fetchShifts(orgId, houseId, date) {
  if (isDemoMode) return demo.demoFetchShifts(houseId, date)
  if (!supabase || !orgId) return []
  const dateStr = toDateStr(date)

  let q = supabase
    .from('shifts')
    .select('*, houses(slug, color, name, short)')
    .eq('org_id', orgId)
    .eq('shift_date', dateStr)

  if (houseId) q = q.eq('house_id', houseId)

  const { data, error } = await q
  if (error) { console.error('fetchShifts:', error.message); return [] }

  return (data || []).map(s => ({
    id:     s.id,
    house:  s.houses?.slug,
    start:  Number(s.start_hour),
    end:    Number(s.end_hour),
    person: s.person_name,
    staffId: s.staff_id ?? null,
    role:   s.role,
    note:   s.note ?? null,
    status: s.status,
  }))
}

// Fetch shifts for an entire week (inclusive date range).
export async function fetchShiftsWeek(orgId, houseId, weekStart, weekEnd) {
  if (isDemoMode) return demo.demoFetchShiftsWeek(houseId, weekStart, weekEnd)
  if (!supabase || !orgId) return []
  const startStr = toDateStr(weekStart)
  const endStr = toDateStr(weekEnd)

  let q = supabase
    .from('shifts')
    .select('*, houses(slug, color, name, short)')
    .eq('org_id', orgId)
    .gte('shift_date', startStr)
    .lte('shift_date', endStr)

  if (houseId) q = q.eq('house_id', houseId)

  const { data, error } = await q
  if (error) { console.error('fetchShiftsWeek:', error.message); return [] }

  return (data || []).map(s => ({
    id:     s.id,
    house:  s.houses?.slug,
    date:   s.shift_date,
    start:  Number(s.start_hour),
    end:    Number(s.end_hour),
    person: s.person_name,
    staffId: s.staff_id ?? null,
    role:   s.role,
    note:   s.note ?? null,
    status: s.status,
  }))
}

// Insert a new shift.
export async function addShift(orgId, houseId, shift) {
  if (isDemoMode) return demo.demoAddShift(houseId, shift)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      org_id:      orgId,
      house_id:    houseId,
      person_name: shift.personName,
      staff_id:    shift.staffId || null,
      role:        shift.role,
      start_hour:  shift.startHour,
      end_hour:    shift.endHour,
      shift_date:  shift.date || toDateStr(new Date()),
      note:        shift.note || null,
      status:      'scheduled',
    })
    .select()
    .single()
  if (error) { console.error('addShift:', error.message); return null }
  return data
}

export async function updateShift(id, updates) {
  if (isDemoMode) return demo.demoUpdateShift(id, updates)
  if (!supabase) return null
  const patch = {}
  if (updates.personName !== undefined) patch.person_name = updates.personName
  if (updates.staffId !== undefined)    patch.staff_id = updates.staffId || null
  if (updates.role !== undefined)       patch.role = updates.role
  if (updates.startHour !== undefined)  patch.start_hour = updates.startHour
  if (updates.endHour !== undefined)    patch.end_hour = updates.endHour
  if (updates.date !== undefined)       patch.shift_date = updates.date
  if (updates.note !== undefined)       patch.note = updates.note || null
  if (updates.status !== undefined)     patch.status = updates.status
  const { data, error } = await supabase.from('shifts').update(patch).eq('id', id).select().single()
  if (error) { console.error('updateShift:', error.message); return null }
  return data
}

export async function deleteShift(id) {
  if (isDemoMode) return demo.demoDeleteShift(id)
  if (!supabase) return
  const { error } = await supabase.from('shifts').delete().eq('id', id)
  if (error) console.error('deleteShift:', error.message)
}

// ── Shared house items (cross-role to-do log) ────────────────────────────────
// A house-scoped list both supervisors and workers see. `for_role` says who must
// act ('staff' = the house team, 'supervisor' = the boss); we track who created
// each item (and their role) and who completed it.
export async function fetchItems(orgId, { houseId = null, status = null } = {}) {
  if (isDemoMode) return demo.demoFetchItems({ houseId, status })
  if (!supabase || !orgId) return []
  let q = supabase.from('items').select('*, houses(slug, name, color, short)').eq('org_id', orgId).order('created_at', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) { console.error('fetchItems:', error.message); return [] }
  return data || []
}

export async function addItem(orgId, item) {
  if (isDemoMode) return demo.demoAddItem(orgId, item)
  if (!supabase) return null
  const { data, error } = await supabase.from('items').insert({
    org_id: orgId,
    house_id: item.houseId || null,
    text: item.text,
    kind: item.kind || 'task',
    for_role: item.forRole || 'staff',
    created_by_name: item.createdByName || null,
    created_by_role: item.createdByRole || null,
  }).select('*, houses(slug, name, color, short)').single()
  if (error) { console.error('addItem:', error.message); return null }
  return data
}

export async function completeItem(id, doneByName) {
  if (isDemoMode) return demo.demoCompleteItem(id, doneByName)
  if (!supabase) return null
  const { data, error } = await supabase.from('items')
    .update({ status: 'done', done_by_name: doneByName || null, done_at: new Date().toISOString() })
    .eq('id', id).select('*, houses(slug, name, color, short)').single()
  if (error) { console.error('completeItem:', error.message); return null }
  return data
}

export async function reopenItem(id) {
  if (isDemoMode) return demo.demoReopenItem(id)
  if (!supabase) return null
  const { data, error } = await supabase.from('items')
    .update({ status: 'open', done_by_name: null, done_at: null })
    .eq('id', id).select('*, houses(slug, name, color, short)').single()
  if (error) { console.error('reopenItem:', error.message); return null }
  return data
}

export async function deleteItem(id) {
  if (isDemoMode) return demo.demoDeleteItem(id)
  if (!supabase) return
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) console.error('deleteItem:', error.message)
}

// Fetch staff list for an org.
// Pass houseId to limit to one house; null for all staff in org.
export async function fetchStaff(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchStaff(houseId)
  if (!supabase || !orgId) return []

  let q = supabase
    .from('staff')
    .select('*, houses(slug, name, color)')
    .eq('org_id', orgId)
    .neq('role', 'supervisor')   // supervisors don't appear in the staff list

  if (houseId) q = q.eq('house_id', houseId)

  const { data, error } = await q
  if (error) { console.error('fetchStaff:', error.message); return [] }

  return (data || []).map(s => ({
    id:        s.id,
    name:      s.name,
    email:     s.email ?? '',
    role:      s.role === 'manager' ? 'House mgr' : 'DSP',
    rawRole:   s.role,
    house:     s.houses?.slug ?? null,
    houseId:   s.house_id ?? null,
    houseName: s.houses?.name ?? null,
    houseColor: s.houses?.color ?? null,
    linked:    !!s.auth_user_id,   // true once they've signed in with this email
    sub:       s.tenure ?? '',
    highlight: s.highlight ?? null,
    tenure:    s.tenure ?? '',
    notes:     s.notes ?? '',
    certs:     s.certs ?? [],
  }))
}

// ── Staff live location (on-duty sharing) ───────────────────────────────────
// A staff member shares their location only while "on duty"; supervisors see
// on-duty staff on a live team map. Stored on the staff row (cur_lat/cur_lng/
// last_seen_at/on_duty). Off-duty clears the coordinates.
export async function setStaffDuty(staffId, onDuty) {
  if (isDemoMode) return demo.demoSetStaffDuty(staffId, onDuty)
  if (!supabase || !staffId) return null
  const patch = onDuty
    ? { on_duty: true }
    : { on_duty: false, cur_lat: null, cur_lng: null }
  const { data, error } = await supabase.from('staff').update(patch).eq('id', staffId).select().single()
  if (error) { console.error('setStaffDuty:', error.message); return null }
  return data
}

export async function pingStaffLocation(staffId, coords) {
  if (!coords || coords.lat == null) return
  if (isDemoMode) return demo.demoPingStaffLocation(staffId, coords)
  if (!supabase || !staffId) return
  const { error } = await supabase.from('staff')
    .update({ cur_lat: coords.lat, cur_lng: coords.lng, last_seen_at: new Date().toISOString(), on_duty: true })
    .eq('id', staffId)
  if (error) console.error('pingStaffLocation:', error.message)
}

// How long a location stays on the supervisor's map after the last GPS ping.
// Past this, the dot is hidden so a worker who lost signal (or forgot to go
// off duty) doesn't linger as a stale "ghost" at an old spot.
export const LOCATION_FRESH_MS = 30 * 60 * 1000

// On-duty staff for the supervisor's team map + roster. Returns everyone who is
// on duty (so the roster shows them even before their first GPS fix — lat/lng
// may be null, shown as "locating…"); a STALE located worker (old last_seen) is
// dropped so the map never shows a ghost dot at a place they left long ago.
export async function fetchTeamLocations(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchTeamLocations(houseId)
  if (!supabase || !orgId) return []
  const cutoff = new Date(Date.now() - LOCATION_FRESH_MS).toISOString()
  let q = supabase.from('staff')
    .select('id, name, role, house_id, cur_lat, cur_lng, last_seen_at, on_duty, houses(slug, name, color)')
    .eq('org_id', orgId).eq('on_duty', true)
    .or(`last_seen_at.is.null,last_seen_at.gte.${cutoff}`)
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchTeamLocations:', error.message); return [] }
  return (data || []).map(s => ({
    id: s.id, name: s.name, role: s.role, houseId: s.house_id || null,
    lat: s.cur_lat, lng: s.cur_lng, lastSeen: s.last_seen_at,
    color: s.houses?.color || '#4a6b56', houseName: s.houses?.name || null,
  }))
}

// Insert a staff record (no auth invite yet — placeholder).
export async function inviteStaff(orgId, houseId, member) {
  if (isDemoMode) return demo.demoInviteStaff(houseId, member)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('staff')
    .insert({
      org_id:   orgId,
      house_id: houseId || null,
      name:     member.name,
      email:    member.email || null,
      role:     member.role || 'staff',
    })
    .select()
    .single()
  if (error) { console.error('inviteStaff:', error.message); return null }
  return data
}

// Update a staff member's role or house.
export async function updateStaffMember(id, updates) {
  if (isDemoMode) return demo.demoUpdateStaff(id, updates)
  if (!supabase || !id) return null
  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('updateStaffMember:', error.message); return null }
  return data
}

// Set a staff member's certifications (CPR, First Aid, med-admin, etc.).
export async function setStaffCerts(id, certs) {
  if (isDemoMode) return demo.demoUpdateStaff(id, { certs })
  if (!supabase || !id) return null
  const { error } = await supabase.from('staff').update({ certs }).eq('id', id)
  if (error) console.error('setStaffCerts:', error.message)
}

// Remove a staff member.
export async function removeStaff(id) {
  if (isDemoMode) return demo.demoRemoveStaff(id)
  if (!supabase || !id) return
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) console.error('removeStaff:', error.message)
}

// Fetch tasks for a staff member on a given date.
export async function fetchTasks(staffId, date) {
  if (isDemoMode) return demo.demoFetchTasks(staffId, date)
  if (!supabase || !staffId) return []
  const dateStr = toDateStr(date)

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('staff_id', staffId)
    .eq('task_date', dateStr)
    .order('created_at')

  if (error) { console.error('fetchTasks:', error.message); return [] }
  return data || []
}

// Toggle a task's done state.
export async function toggleTask(taskId, done) {
  if (isDemoMode) return demo.demoToggleTask(taskId, done)
  if (!supabase || !taskId) return
  const { error } = await supabase.from('tasks').update({ done }).eq('id', taskId)
  if (error) console.error('toggleTask:', error.message)
}

// Insert a task for today.
export async function addTask(orgId, staffId, task) {
  if (isDemoMode) return demo.demoAddTask(staffId, task)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      org_id:    orgId,
      staff_id:  staffId,
      task_date: toDateStr(new Date()),
      kind:      task.kind || 'note',
      text:      task.text,
      done:      false,
      urgent:    task.urgent || false,
      created_by_name: task.createdByName || null,
      created_by_role: task.createdByRole || null,
    })
    .select()
    .single()
  if (error) { console.error('addTask:', error.message); return null }
  return data
}

// Fetch resources; houseId=null means all houses in org.
export async function fetchResources(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchResources(houseId)
  if (!supabase || !orgId) return []

  let q = supabase
    .from('resources')
    .select('*, houses(slug, name, color, short)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (houseId) q = q.eq('house_id', houseId)

  const { data, error } = await q
  if (error) { console.error('fetchResources:', error.message); return [] }
  return data || []
}

// Insert a resource item.
export async function addResource(orgId, houseId, item) {
  if (isDemoMode) return demo.demoAddResource(houseId, item)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('resources')
    .insert({
      org_id:   orgId,
      house_id: houseId || null,
      name:     item.name,
      qty:      item.qty || 1,
      unit:     item.unit || 'units',
      cost:     item.cost || null,
      week:     item.week || null,
    })
    .select('*, houses(slug, name, color, short)')
    .single()
  if (error) { console.error('addResource:', error.message); return null }
  return data
}

// Delete a resource by id.
export async function deleteResource(id) {
  if (isDemoMode) return demo.demoDeleteResource(id)
  if (!supabase || !id) return
  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (error) console.error('deleteResource:', error.message)
}

// Delete a trip by id.
export async function deleteTrip(id) {
  if (isDemoMode) return demo.demoDeleteTrip(id)
  if (!supabase || !id) return
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) console.error('deleteTrip:', error.message)
}

// Fetch trips for a given date (or null for all). houseId=null means all houses.
export async function fetchTrips(orgId, houseId, date) {
  if (isDemoMode) return demo.demoFetchTrips(houseId, date)
  if (!supabase || !orgId) return []

  let q = supabase
    .from('trips')
    .select('*, houses(slug, name, color, short)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (houseId) q = q.eq('house_id', houseId)
  if (date) q = q.eq('trip_date', toDateStr(date))

  const { data, error } = await q
  if (error) { console.error('fetchTrips:', error.message); return [] }
  return data || []
}

// Insert a trip.
export async function addTrip(orgId, trip) {
  if (isDemoMode) return demo.demoAddTrip(trip)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('trips')
    .insert({
      org_id:        orgId,
      house_id:      trip.houseId || null,
      driver_name:   trip.driverName,
      resident_name: trip.residentName,
      destination:   trip.destination,
      miles:         trip.miles || 0,
      purpose:       trip.purpose || 'other',
      trip_date:     trip.date || toDateStr(new Date()),
    })
    .select('*, houses(slug, name, color, short)')
    .single()
  if (error) { console.error('addTrip:', error.message); return null }
  return data
}

// Update a trip.
export async function updateTrip(id, updates) {
  if (isDemoMode) return demo.demoUpdateTrip(id, updates)
  if (!supabase || !id) return null
  const { data, error } = await supabase
    .from('trips')
    .update({
      driver_name:   updates.driverName,
      resident_name: updates.residentName,
      destination:   updates.destination,
      miles:         updates.miles || 0,
      purpose:       updates.purpose || 'other',
    })
    .eq('id', id)
    .select('*, houses(slug, name, color, short)')
    .single()
  if (error) { console.error('updateTrip:', error.message); return null }
  return data
}

// ── Live trip tracking (start / end / active) ────────────────────────────────
// Start a trip "now": status=active, started_at, optional start geolocation.
export async function startTrip(orgId, trip) {
  if (isDemoMode) return demo.demoStartTrip(trip)
  if (!supabase) return null
  const { data, error } = await supabase.from('trips').insert({
    org_id: orgId, house_id: trip.houseId || null,
    driver_id: trip.driverId || null,
    driver_name: trip.driverName || 'Unknown', resident_name: trip.residentName,
    destination: trip.destination, purpose: trip.purpose || 'Other', miles: trip.miles || 0,
    trip_date: toDateStr(new Date()), status: 'active', started_at: new Date().toISOString(),
    start_lat: trip.lat ?? null, start_lng: trip.lng ?? null,
    dest_lat: trip.destLat ?? null, dest_lng: trip.destLng ?? null,
  }).select('*, houses(slug, name, color, short)').single()
  if (error) {
    console.error('startTrip:', error.message)
    // A unique-violation here means the DB backstop caught a duplicate active
    // trip for this driver (one device/tab racing another). Signal it distinctly.
    if (error.code === '23505') return { error: 'duplicate' }
    return null
  }
  return data
}

// Live location ping while a trip is active (worker's current position).
export async function pingTrip(id, coords) {
  if (!coords || coords.lat == null) return
  if (isDemoMode) return demo.demoPingTrip(id, coords)
  if (!supabase || !id) return
  const { error } = await supabase.from('trips').update({ cur_lat: coords.lat, cur_lng: coords.lng, last_ping: new Date().toISOString() }).eq('id', id)
  if (error) console.error('pingTrip:', error.message)
}

// Auto-arrival: worker reached the destination — end the trip + stamp arrival.
export async function markArrived(id, coords) {
  if (isDemoMode) return demo.demoMarkArrived(id, coords)
  if (!supabase || !id) return null
  const upd = { status: 'ended', ended_at: new Date().toISOString(), arrived_at: new Date().toISOString() }
  if (coords?.lat != null) { upd.end_lat = coords.lat; upd.end_lng = coords.lng; upd.cur_lat = coords.lat; upd.cur_lng = coords.lng }
  const { data, error } = await supabase.from('trips').update(upd).eq('id', id).select('*, houses(slug, name, color, short)').single()
  if (error) { console.error('markArrived:', error.message); return null }
  return data
}

// End an active trip: status=ended, ended_at, optional miles + end geolocation.
export async function endTrip(id, patch = {}) {
  if (isDemoMode) return demo.demoEndTrip(id, patch)
  if (!supabase || !id) return null
  const upd = { status: 'ended', ended_at: new Date().toISOString() }
  if (patch.miles != null) upd.miles = patch.miles
  if (patch.lat != null) upd.end_lat = patch.lat
  if (patch.lng != null) upd.end_lng = patch.lng
  const { data, error } = await supabase.from('trips').update(upd).eq('id', id).select('*, houses(slug, name, color, short)').single()
  if (error) { console.error('endTrip:', error.message); return null }
  return data
}

// Attach a captured location to a trip after the fact (start/end), so trip
// creation never blocks on the geolocation permission prompt.
export async function setTripLocation(id, which, coords) {
  if (!coords || coords.lat == null) return
  if (isDemoMode) return demo.demoSetTripLocation(id, which, coords)
  if (!supabase || !id) return
  const upd = which === 'end'
    ? { end_lat: coords.lat, end_lng: coords.lng }
    : { start_lat: coords.lat, start_lng: coords.lng }
  const { error } = await supabase.from('trips').update(upd).eq('id', id)
  if (error) console.error('setTripLocation:', error.message)
}

// Patch a trip's destination coordinates (e.g. after geocoding a typed address).
export async function setTripDest(id, coords) {
  if (!coords || coords.lat == null) return
  if (isDemoMode) return demo.demoSetTripDest(id, coords)
  if (!supabase || !id) return
  await supabase.from('trips').update({ dest_lat: coords.lat, dest_lng: coords.lng }).eq('id', id)
}

// Currently-active trips (in progress) — supervisors see all houses.
export async function fetchActiveTrips(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchActiveTrips(houseId)
  if (!supabase || !orgId) return []
  let q = supabase.from('trips').select('*, houses(slug, name, color, short)').eq('org_id', orgId).eq('status', 'active').order('started_at', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchActiveTrips:', error.message); return [] }
  return data || []
}

// ── Vehicles ──────────────────────────────────────────────────────────────
// Fetch vehicles for an org (optionally scoped to one house).
export async function fetchVehicles(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchVehicles(houseId)
  if (!supabase || !orgId) return []
  let q = supabase
    .from('vehicles')
    .select('*, houses(slug, name, color, short)')
    .eq('org_id', orgId)
    .order('name')
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchVehicles:', error.message); return [] }
  return data || []
}

// Insert a vehicle.
export async function addVehicle(orgId, vehicle) {
  if (isDemoMode) return demo.demoAddVehicle(vehicle)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      org_id:       orgId,
      house_id:     vehicle.houseId || null,
      name:         vehicle.name,
      plate:        vehicle.plate || null,
      mileage:      vehicle.mileage || 0,
      last_service: vehicle.lastService || null,
    })
    .select('*, houses(slug, name, color, short)')
    .single()
  if (error) { console.error('addVehicle:', error.message); return null }
  return data
}

// Update a vehicle. (Requires a vehicles_update RLS policy to be in place.)
export async function updateVehicle(id, updates) {
  if (isDemoMode) return demo.demoUpdateVehicle(id, updates)
  if (!supabase || !id) return null
  const patch = {}
  if (updates.name !== undefined)        patch.name         = updates.name
  if (updates.plate !== undefined)       patch.plate        = updates.plate
  if (updates.mileage !== undefined)     patch.mileage      = updates.mileage
  if (updates.lastService !== undefined) patch.last_service = updates.lastService
  const { data, error } = await supabase
    .from('vehicles')
    .update(patch)
    .eq('id', id)
    .select('*, houses(slug, name, color, short)')
    .single()
  if (error) { console.error('updateVehicle:', error.message); return null }
  return data
}

// Delete a vehicle. (Requires a vehicles_delete RLS policy to be in place.)
export async function deleteVehicle(id) {
  if (isDemoMode) return demo.demoDeleteVehicle(id)
  if (!supabase || !id) return
  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) console.error('deleteVehicle:', error.message)
}

// Fetch all houses in an org.
// Tries the get_my_houses SECURITY DEFINER RPC first (bypasses RLS, works even
// when the SELECT policy is missing). Falls back to a direct query for orgs that
// haven't run migration_writes.sql yet.
export async function fetchHouses(orgId) {
  if (isDemoMode) return demo.demoFetchHouses()
  if (!supabase || !orgId) return []

  const normalizeRows = (rows) => (rows || []).map(h => ({
    id:             h.id,
    slug:           h.slug,
    name:           h.name,
    short:          h.short,
    address:        h.address ?? '',
    branch:         h.branch ?? '',
    color:          h.color,
    managerName:    h.manager_name ?? '',
    residentsCount: h.residents_count ?? 0,
  }))

  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_my_houses')
  if (!rpcErr) return normalizeRows(rpcData)

  if (!/function.*get_my_houses.*does not exist/i.test(rpcErr.message)) {
    console.error('fetchHouses (rpc):', rpcErr.message)
  }

  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) { console.error('fetchHouses:', error.message); return [] }
  return normalizeRows(data)
}

// Insert a house. Returns { data, error } so the UI can surface the real reason
// a save failed. Uses the create_house SECURITY DEFINER RPC, which derives the
// caller's org server-side and bypasses RLS — so it works even if the per-table
// INSERT policy wasn't created. Falls back to a direct insert if the RPC is
// missing (older databases that haven't run migration_writes.sql).
export async function addHouse(orgId, house) {
  if (isDemoMode) return { data: demo.demoAddHouse(house), error: null }
  if (!supabase) return { data: null, error: 'Not connected to database' }

  const { data, error } = await supabase.rpc('create_house', {
    p_name:         house.name,
    p_slug:         house.slug || '',
    p_short:        house.short || '',
    p_address:      house.address || '',
    p_branch:       house.branch || '',
    p_color:        house.color || '',
    p_manager_name: house.managerName || '',
  })

  // RPC not deployed yet → fall back to a direct insert so nothing regresses.
  if (error && /function .*create_house.* does not exist/i.test(error.message)) {
    return addHouseDirect(orgId, house)
  }
  if (error) { console.error('addHouse:', error.message); return { data: null, error: error.message } }
  return { data, error: null }
}

// Direct-insert fallback (subject to RLS). Used only when create_house RPC isn't present.
async function addHouseDirect(orgId, house) {
  if (!orgId) return { data: null, error: 'Your account is not linked to an organization yet' }
  const { data, error } = await supabase
    .from('houses')
    .insert({
      org_id:          orgId,
      slug:            house.slug || house.name.toLowerCase().replace(/\s+/g, '-'),
      name:            house.name,
      short:           house.short || house.name.slice(0, 3).toUpperCase(),
      address:         house.address || null,
      branch:          house.branch || null,
      color:           house.color || '#888888',
      manager_name:    house.managerName || null,
      residents_count: 0,
    })
    .select()
    .single()
  if (error) { console.error('addHouseDirect:', error.message); return { data: null, error: error.message } }
  return { data, error: null }
}

// Update a house.
export async function updateHouse(id, updates) {
  if (isDemoMode) return demo.demoUpdateHouse(id, updates)
  if (!supabase || !id) return null
  const dbUpdates = {}
  if (updates.name !== undefined)         dbUpdates.name           = updates.name
  if (updates.address !== undefined)      dbUpdates.address        = updates.address
  if (updates.branch !== undefined)       dbUpdates.branch         = updates.branch
  if (updates.color !== undefined)        dbUpdates.color          = updates.color
  if (updates.managerName !== undefined)  dbUpdates.manager_name   = updates.managerName
  if (updates.short !== undefined)        dbUpdates.short          = updates.short

  const { data, error } = await supabase
    .from('houses')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('updateHouse:', error.message); return null }
  return data
}

// ── House geofence (location pin + radius) ──────────────────────────────────
// Stored on the house. Used to flag on-duty staff who leave the perimeter.
// Read directly (not via the get_my_houses RPC, which doesn't return these).
export async function setHouseGeofence(houseId, { lat, lng, radiusM }) {
  if (isDemoMode) return demo.demoSetHouseGeofence(houseId, { lat, lng, radiusM })
  if (!supabase || !houseId) return null
  const patch = {}
  if (lat != null) patch.lat = lat
  if (lng != null) patch.lng = lng
  if (radiusM != null) patch.geofence_m = Math.round(radiusM)
  const { error } = await supabase.from('houses').update(patch).eq('id', houseId)
  if (error) { console.error('setHouseGeofence:', error.message); return null }
  return true
}
export async function fetchHouseGeofences(orgId) {
  if (isDemoMode) return demo.demoFetchHouseGeofences()
  if (!supabase || !orgId) return []
  const { data, error } = await supabase.from('houses').select('id, name, color, lat, lng, geofence_m').eq('org_id', orgId)
  if (error) { console.error('fetchHouseGeofences:', error.message); return [] }
  return (data || []).map(h => ({ id: h.id, name: h.name, color: h.color, lat: h.lat, lng: h.lng, radiusM: h.geofence_m || 200 }))
}

// Delete a house.
export async function deleteHouse(id) {
  if (isDemoMode) return demo.demoDeleteHouse(id)
  if (!supabase || !id) return
  const { error } = await supabase.from('houses').delete().eq('id', id)
  if (error) console.error('deleteHouse:', error.message)
}

// Fetch residents.
export async function fetchResidents(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchResidents(houseId)
  if (!supabase || !orgId) return []

  let q = supabase
    .from('residents')
    .select('*, houses(slug, name, color)')
    .eq('org_id', orgId)
    .order('name')

  if (houseId) q = q.eq('house_id', houseId)

  const { data, error } = await q
  if (error) { console.error('fetchResidents:', error.message); return [] }
  return data || []
}

// Insert a resident.
export async function addResident(orgId, houseId, resident) {
  if (isDemoMode) return demo.demoAddResident(houseId, resident)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('residents')
    .insert({
      org_id:   orgId,
      house_id: houseId || null,
      name:     resident.name,
      room:     resident.room || null,
      dob:      resident.dob || null,
      status:   resident.status || 'active',
      notes:    resident.notes || null,
      allergies: resident.allergies || null,
      diagnoses: resident.diagnoses || null,
      diet:      resident.diet || null,
      guardian:  resident.guardian || null,
      physician: resident.physician || null,
      flags:     resident.flags || [],
    })
    .select()
    .single()
  if (error) { console.error('addResident:', error.message); return null }
  return data
}

// Update a resident, including the clinical profile fields.
export async function updateResident(id, updates) {
  if (isDemoMode) return demo.demoUpdateResident(id, updates)
  if (!supabase) return null
  const patch = {}
  for (const k of ['name', 'room', 'dob', 'status', 'notes', 'allergies', 'diagnoses', 'diet', 'guardian', 'physician']) {
    if (updates[k] !== undefined) patch[k] = updates[k] || null
  }
  if (updates.flags !== undefined) patch.flags = updates.flags || []
  const { data, error } = await supabase.from('residents').update(patch).eq('id', id).select().single()
  if (error) { console.error('updateResident:', error.message); return null }
  return data
}

export async function deleteResident(id) {
  if (isDemoMode) return demo.demoDeleteResident(id)
  if (!supabase) return
  const { error } = await supabase.from('residents').delete().eq('id', id)
  if (error) console.error('deleteResident:', error.message)
}

// ── Medications (eMAR) ──────────────────────────────────────────────────────
export async function fetchMeds(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchMeds(houseId)
  if (!supabase || !orgId) return []
  let q = supabase.from('meds').select('*, residents(name)').eq('org_id', orgId).eq('active', true)
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchMeds:', error.message); return [] }
  return (data || []).map(m => ({ ...m, prnReason: m.prn_reason, residentName: m.residents?.name || 'Resident' }))
}
export async function addMed(orgId, med) {
  if (isDemoMode) return demo.demoAddMed(med)
  if (!supabase) return null
  const { data, error } = await supabase.from('meds').insert({
    org_id: orgId, house_id: med.houseId || null, resident_id: med.residentId || null,
    name: med.name, dose: med.dose || null, route: med.route || 'Oral',
    times: med.times || [], prn: !!med.prn, prn_reason: med.prnReason || null, prescriber: med.prescriber || null,
  }).select().single()
  if (error) { console.error('addMed:', error.message); return null }
  return data
}
export async function deleteMed(id) {
  if (isDemoMode) return demo.demoDeleteMed(id)
  if (!supabase) return
  const { error } = await supabase.from('meds').update({ active: false }).eq('id', id)
  if (error) console.error('deleteMed:', error.message)
}
export async function fetchMedPass(orgId, houseId, date) {
  const ds = toDateStr(date)
  if (isDemoMode) return demo.demoFetchMedPass(houseId, ds)
  if (!supabase || !orgId) return []
  let medsQ = supabase.from('meds').select('*, residents(name)').eq('org_id', orgId).eq('active', true).eq('prn', false)
  if (houseId) medsQ = medsQ.eq('house_id', houseId)
  const { data: meds, error: e1 } = await medsQ
  if (e1) { console.error('fetchMedPass meds:', e1.message); return [] }
  let admQ = supabase.from('med_administrations').select('*').eq('org_id', orgId).eq('admin_date', ds)
  if (houseId) admQ = admQ.eq('house_id', houseId)
  const { data: adms, error: e2 } = await admQ
  if (e2) console.error('fetchMedPass admins:', e2.message)
  const doses = []
  for (const m of (meds || [])) {
    const rname = m.residents?.name || 'Resident'
    for (const t of (m.times || [])) {
      const a = (adms || []).find(x => x.med_id === m.id && x.slot === t)
      doses.push({ key: `${m.id}|${t}`, medId: m.id, resident: rname, residentId: m.resident_id,
        med: m.name, dose: m.dose, route: m.route, time: t, status: a?.status || 'due', by: a?.recorded_by || null, at: a?.recorded_at || null })
    }
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time) || a.resident.localeCompare(b.resident))
}
export async function recordMed(orgId, houseId, medId, date, slot, status, by) {
  const ds = toDateStr(date)
  if (isDemoMode) return demo.demoRecordMed(medId, ds, slot, status, by)
  if (!supabase) return
  if (status === 'due') {
    const { error } = await supabase.from('med_administrations').delete().match({ med_id: medId, admin_date: ds, slot })
    if (error) console.error('recordMed delete:', error.message)
  } else {
    const { error } = await supabase.from('med_administrations').upsert(
      { org_id: orgId, house_id: houseId || null, med_id: medId, admin_date: ds, slot, status, recorded_by: by, recorded_at: new Date().toISOString() },
      { onConflict: 'med_id,admin_date,slot' })
    if (error) console.error('recordMed upsert:', error.message)
  }
}
export async function fetchPrnMeds(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchPrnMeds(houseId)
  if (!supabase || !orgId) return []
  let q = supabase.from('meds').select('*, residents(name)').eq('org_id', orgId).eq('active', true).eq('prn', true)
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchPrnMeds:', error.message); return [] }
  return (data || []).map(m => ({ ...m, prnReason: m.prn_reason, residentName: m.residents?.name || 'Resident' }))
}
export async function logPrn(orgId, entry) {
  if (isDemoMode) return demo.demoLogPrn(entry)
  if (!supabase) return null
  const { data, error } = await supabase.from('prn_log').insert({
    org_id: orgId, house_id: entry.houseId || null, med_id: entry.medId || null,
    resident: entry.residentName || null, med: entry.medName || null,
    reason: entry.reason || null, effect: entry.effect || null, recorded_by: entry.by || null,
  }).select().single()
  if (error) { console.error('logPrn:', error.message); return null }
  return data
}
export async function fetchPrnLog(orgId, houseId, date) {
  const ds = toDateStr(date)
  if (isDemoMode) return demo.demoFetchPrnLog(houseId, ds)
  if (!supabase || !orgId) return []
  let q = supabase.from('prn_log').select('*').eq('org_id', orgId).eq('log_date', ds)
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchPrnLog:', error.message); return [] }
  return (data || []).map(l => ({ ...l, by: l.recorded_by, at: l.recorded_at, date: l.log_date }))
}

// ── Daily log / Incidents / Drills ───────────────────────────────────────────
export async function fetchDailyLog(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchDailyLog(houseId)
  if (!supabase || !orgId) return []
  let q = supabase.from('daily_log').select('*, residents(name)').eq('org_id', orgId).order('created_at', { ascending: false }).limit(40)
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchDailyLog:', error.message); return [] }
  return (data || []).map(l => ({ id: l.id, category: l.category, text: l.body, by: l.author_name, at: l.created_at, date: l.log_date, resident: l.residents?.name || null }))
}
export async function addDailyLog(orgId, entry) {
  if (isDemoMode) return demo.demoAddDailyLog(entry)
  if (!supabase) return null
  const { data, error } = await supabase.from('daily_log').insert({
    org_id: orgId, house_id: entry.houseId || null, resident_id: entry.residentId || null,
    category: entry.category || 'General', body: entry.text, author_name: entry.by || null,
  }).select().single()
  if (error) { console.error('addDailyLog:', error.message); return null }
  return data
}
export async function deleteDailyLog(id) {
  if (isDemoMode) return demo.demoDeleteDailyLog(id)
  if (supabase) await supabase.from('daily_log').delete().eq('id', id)
}

// ── ISP goals + daily goal data ─────────────────────────────────────────────
export async function fetchGoals(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchGoals(houseId)
  if (!supabase || !orgId) return []
  let q = supabase.from('goals').select('*, residents(name)').eq('org_id', orgId).order('created_at', { ascending: true })
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchGoals:', error.message); return [] }
  return (data || []).map(g => ({ id: g.id, residentId: g.resident_id, resident: g.residents?.name || null, title: g.title, description: g.description, method: g.method, target: g.target, active: g.active }))
}
export async function addGoal(orgId, goal) {
  if (isDemoMode) return demo.demoAddGoal(goal)
  if (!supabase) return null
  const { data, error } = await supabase.from('goals').insert({
    org_id: orgId, house_id: goal.houseId || null, resident_id: goal.residentId || null,
    title: goal.title, description: goal.description || null, method: goal.method || null, target: goal.target || null,
  }).select('*, residents(name)').single()
  if (error) { console.error('addGoal:', error.message); return null }
  return data
}
export async function updateGoal(id, updates) {
  if (isDemoMode) return demo.demoUpdateGoal(id, updates)
  if (!supabase || !id) return null
  const patch = {}
  if (updates.title !== undefined)       patch.title = updates.title
  if (updates.description !== undefined) patch.description = updates.description || null
  if (updates.method !== undefined)      patch.method = updates.method || null
  if (updates.target !== undefined)      patch.target = updates.target || null
  if (updates.active !== undefined)      patch.active = updates.active
  const { error } = await supabase.from('goals').update(patch).eq('id', id)
  if (error) console.error('updateGoal:', error.message)
}
export async function deleteGoal(id) {
  if (isDemoMode) return demo.demoDeleteGoal(id)
  if (supabase) await supabase.from('goals').delete().eq('id', id)
}
export async function recordGoalData(orgId, entry) {
  if (isDemoMode) return demo.demoRecordGoalData(entry)
  if (!supabase) return null
  const { data, error } = await supabase.from('goal_data').insert({
    org_id: orgId, house_id: entry.houseId || null, goal_id: entry.goalId, resident_id: entry.residentId || null,
    log_date: entry.date || toDateStr(new Date()), result: entry.result || null, value: entry.value ?? null,
    note: entry.note || null, recorded_by: entry.by || null,
  }).select().single()
  if (error) { console.error('recordGoalData:', error.message); return null }
  return data
}
// Recent data points for a goal (newest first), for the mini trend.
export async function fetchGoalData(orgId, goalId, limit = 30) {
  if (isDemoMode) return demo.demoFetchGoalData(goalId, limit)
  if (!supabase || !orgId || !goalId) return []
  const { data, error } = await supabase.from('goal_data').select('*').eq('org_id', orgId).eq('goal_id', goalId)
    .order('recorded_at', { ascending: false }).limit(limit)
  if (error) { console.error('fetchGoalData:', error.message); return [] }
  return (data || []).map(d => ({ id: d.id, date: d.log_date, result: d.result, value: d.value, note: d.note, by: d.recorded_by, at: d.recorded_at }))
}

// ── Resident health logs (BM, seizure, sleep, meals, vitals, behavior…) ──────
export async function fetchHealthLogs(orgId, houseId, kind = null, limit = 60) {
  if (isDemoMode) return demo.demoFetchHealthLogs(houseId, kind, limit)
  if (!supabase || !orgId) return []
  let q = supabase.from('health_logs').select('*, residents(name)').eq('org_id', orgId).order('occurred_at', { ascending: false }).limit(limit)
  if (houseId) q = q.eq('house_id', houseId)
  if (kind) q = q.eq('kind', kind)
  const { data, error } = await q
  if (error) { console.error('fetchHealthLogs:', error.message); return [] }
  return (data || []).map(h => ({ id: h.id, residentId: h.resident_id, resident: h.residents?.name || null, kind: h.kind, amount: h.amount, detail: h.detail || {}, note: h.note, date: h.log_date, occurredAt: h.occurred_at, by: h.recorded_by }))
}
export async function addHealthLog(orgId, entry) {
  if (isDemoMode) return demo.demoAddHealthLog(entry)
  if (!supabase) return null
  const { data, error } = await supabase.from('health_logs').insert({
    org_id: orgId, house_id: entry.houseId || null, resident_id: entry.residentId || null,
    kind: entry.kind, amount: entry.amount ?? null, detail: entry.detail || {}, note: entry.note || null,
    occurred_at: entry.occurredAt || new Date().toISOString(), recorded_by: entry.by || null,
  }).select('*, residents(name)').single()
  if (error) { console.error('addHealthLog:', error.message); return null }
  return data
}
export async function deleteHealthLog(id) {
  if (isDemoMode) return demo.demoDeleteHealthLog(id)
  if (supabase) await supabase.from('health_logs').delete().eq('id', id)
}

export async function fetchIncidents(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchIncidents(houseId)
  if (!supabase || !orgId) return []
  let q = supabase.from('incidents').select('*, residents(name)').eq('org_id', orgId).order('created_at', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchIncidents:', error.message); return [] }
  return (data || []).map(i => ({ id: i.id, type: i.type, severity: i.severity, text: i.narrative, actions: i.actions, notified: i.notified, status: i.status, by: i.reported_by, at: i.created_at, date: i.incident_date, resident: i.residents?.name || null, reviewed_by: i.reviewed_by, reviewed_at: i.reviewed_at, reportable: i.reportable, notified_at: i.notified_at, corrective_action: i.corrective_action, follow_up_due: i.follow_up_due }))
}
export async function addIncident(orgId, inc) {
  if (isDemoMode) return demo.demoAddIncident(inc)
  if (!supabase) return null
  const { data, error } = await supabase.from('incidents').insert({
    org_id: orgId, house_id: inc.houseId || null, resident_id: inc.residentId || null,
    type: inc.type || 'Other', severity: inc.severity || 'Minor', narrative: inc.text || '',
    actions: inc.actions || null, notified: inc.notified || null, reported_by: inc.by || null,
    reportable: inc.reportable || false, corrective_action: inc.correctiveAction || null,
    follow_up_due: inc.followUpDue || null,
  }).select().single()
  if (error) { console.error('addIncident:', error.message); return null }
  return data
}
// Update a reportable incident's follow-through (mark agency notified, add a
// corrective action, set/clear the follow-up date, change status).
export async function updateIncident(id, updates) {
  if (isDemoMode) return demo.demoUpdateIncident(id, updates)
  if (!supabase || !id) return null
  const patch = {}
  if (updates.status !== undefined)           patch.status = updates.status
  if (updates.reportable !== undefined)        patch.reportable = updates.reportable
  if (updates.notified !== undefined)          patch.notified = updates.notified
  if (updates.markNotifiedNow)                 patch.notified_at = new Date().toISOString()
  if (updates.correctiveAction !== undefined)  patch.corrective_action = updates.correctiveAction
  if (updates.followUpDue !== undefined)       patch.follow_up_due = updates.followUpDue || null
  const { data, error } = await supabase.from('incidents').update(patch).eq('id', id).select().single()
  if (error) { console.error('updateIncident:', error.message); return null }
  return data
}
export async function reviewIncident(id, by) {
  if (isDemoMode) return demo.demoReviewIncident(id, by)
  if (supabase) await supabase.from('incidents').update({ status: 'reviewed', reviewed_by: by, reviewed_at: new Date().toISOString() }).eq('id', id)
}
export async function deleteIncident(id) {
  if (isDemoMode) return demo.demoDeleteIncident(id)
  if (supabase) await supabase.from('incidents').delete().eq('id', id)
}

export async function fetchDrills(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchDrills(houseId)
  if (!supabase || !orgId) return []
  let q = supabase.from('drills').select('*').eq('org_id', orgId).order('drill_date', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchDrills:', error.message); return [] }
  return (data || []).map(d => ({ id: d.id, type: d.type, date: d.drill_date, evac_time: d.evac_time, notes: d.notes, by: d.logged_by }))
}
export async function addDrill(orgId, d) {
  if (isDemoMode) return demo.demoAddDrill(d)
  if (!supabase) return null
  const { data, error } = await supabase.from('drills').insert({
    org_id: orgId, house_id: d.houseId || null, type: d.type || 'Fire',
    drill_date: d.date || toDateStr(new Date()), evac_time: d.evacTime || null, notes: d.notes || null, logged_by: d.by || null,
  }).select().single()
  if (error) { console.error('addDrill:', error.message); return null }
  return data
}
export async function deleteDrill(id) {
  if (isDemoMode) return demo.demoDeleteDrill(id)
  if (supabase) await supabase.from('drills').delete().eq('id', id)
}

// ── Medication (MAR) alerts ─────────────────────────────────────────────────
// Fetch open med alerts; houseId=null means all houses in org.
export async function fetchMedAlerts(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchMedAlerts(houseId)
  if (!supabase || !orgId) return []
  let q = supabase
    .from('med_alerts')
    .select('*, houses(slug, name, color, short)')
    .eq('org_id', orgId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchMedAlerts:', error.message); return [] }
  return data || []
}

// Insert a med alert.
export async function addMedAlert(orgId, houseId, alert) {
  if (isDemoMode) return demo.demoAddMedAlert(houseId, alert)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('med_alerts')
    .insert({
      org_id:        orgId,
      house_id:      houseId || null,
      resident_name: alert.residentName || null,
      text:          alert.text,
      due_at:        alert.dueAt || null,
    })
    .select('*, houses(slug, name, color, short)')
    .single()
  if (error) { console.error('addMedAlert:', error.message); return null }
  return data
}

// Mark a med alert resolved.
export async function resolveMedAlert(id) {
  if (isDemoMode) return demo.demoResolveMedAlert(id)
  if (!supabase || !id) return
  const { error } = await supabase.from('med_alerts').update({ status: 'resolved' }).eq('id', id)
  if (error) console.error('resolveMedAlert:', error.message)
}

// ── Shift notes ─────────────────────────────────────────────────────────────
// Fetch shift notes; houseId=null means all houses in org.
export async function fetchShiftNotes(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchShiftNotes(houseId)
  if (!supabase || !orgId) return []
  let q = supabase
    .from('shift_notes')
    .select('*, houses(slug, name, color, short)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchShiftNotes:', error.message); return [] }
  return data || []
}

// Insert a shift note.
export async function addShiftNote(orgId, houseId, note) {
  if (isDemoMode) return demo.demoAddShiftNote(houseId, note)
  if (!supabase) return null
  const { data, error } = await supabase
    .from('shift_notes')
    .insert({
      org_id:      orgId,
      house_id:    houseId || null,
      author_name: note.authorName || null,
      text:        note.text,
    })
    .select('*, houses(slug, name, color, short)')
    .single()
  if (error) { console.error('addShiftNote:', error.message); return null }
  return data
}

// Mark a shift note read.
export async function markShiftNoteRead(id) {
  if (isDemoMode) return demo.demoMarkShiftNoteRead(id)
  if (!supabase || !id) return
  const { error } = await supabase.from('shift_notes').update({ read: true }).eq('id', id)
  if (error) console.error('markShiftNoteRead:', error.message)
}

// Build the per-house "Needs attention" rows for the Houses dashboard from real
// data. Returns a map keyed by house slug → [{ kind, text }], where kind is one
// of 'grocery' | 'med' | 'note' | 'drive'. Each house is capped at a few rows so
// cards stay scannable; the UI shows a "+N more" affordance for the rest.
export async function fetchHouseAlerts(orgId) {
  const empty = {}
  if (!orgId) return empty
  const today = toDateStr(new Date())

  const [resources, meds, notes, trips] = await Promise.all([
    fetchResources(orgId, null),
    fetchMedAlerts(orgId, null),
    fetchShiftNotes(orgId, null),
    fetchTrips(orgId, null, today),
  ])

  const map = {}
  const push = (slug, row) => {
    if (!slug) return
    ;(map[slug] ||= []).push(row)
  }

  // Shop — flag low/out supply items per house (qty 0 = out, 1–2 = low).
  const byHouseResources = {}
  for (const r of resources) {
    const slug = r.houses?.slug
    if (!slug) continue
    const q = Number(r.qty)
    const bucket = q <= 0 ? 'out' : q <= 2 ? 'low' : null
    if (!bucket) continue
    ;(byHouseResources[slug] ||= { out: [], low: [] })[bucket].push(r.name)
  }
  const joinNames = (names) => {
    const shown = names.slice(0, 3).join(', ')
    return names.length > 3 ? `${shown} +${names.length - 3} more` : shown
  }
  for (const [slug, b] of Object.entries(byHouseResources)) {
    if (b.out.length) push(slug, { kind: 'grocery', text: `Out: ${joinNames(b.out)}` })
    if (b.low.length) push(slug, { kind: 'grocery', text: `Low: ${joinNames(b.low)}` })
  }

  // Med — one row per open alert.
  for (const m of meds) {
    push(m.houses?.slug, { kind: 'med', text: m.resident_name ? `${m.resident_name} — ${m.text}` : m.text })
  }

  // Note — one row per note, with the time it was left (unread flagged).
  for (const n of notes) {
    const who = n.author_name ? `${n.author_name} ` : ''
    const t = n.created_at ? ` (${fmtClock(n.created_at)})` : ''
    push(n.houses?.slug, { kind: 'note', text: `${who}shift note${t}${n.read ? '' : ' — unread'}` })
  }

  // Drive — one row per trip scheduled today.
  for (const t of trips) {
    const driver = t.driver_name ? ` (${t.driver_name})` : ''
    push(t.houses?.slug, { kind: 'drive', text: `${t.resident_name || 'Resident'} to ${t.destination}${driver}` })
  }

  return map
}

// ── Team chat (messages) ────────────────────────────────────────────────────
// Channels are keyed by house: houseId=null is the org-wide "All staff" channel;
// a houseId scopes to that house's channel. Returned oldest-first for display.
export async function fetchMessages(orgId, { houseId = null } = {}) {
  if (isDemoMode) return demo.demoFetchMessages({ houseId })
  if (!supabase || !orgId) return []
  let q = supabase.from('messages').select('*').eq('org_id', orgId).order('created_at', { ascending: true }).limit(200)
  q = houseId ? q.eq('house_id', houseId) : q.is('house_id', null)
  const { data, error } = await q
  if (error) { console.error('fetchMessages:', error.message); return [] }
  return data || []
}

export async function sendMessage(orgId, msg) {
  if (isDemoMode) return demo.demoSendMessage(orgId, msg)
  if (!supabase || !orgId || !msg?.body?.trim()) return null
  const { data, error } = await supabase.from('messages').insert({
    org_id:          orgId,
    house_id:        msg.houseId || null,
    author_staff_id: msg.authorStaffId || null,
    author_name:     msg.authorName || null,
    author_role:     msg.authorRole || null,
    body:            msg.body.trim(),
  }).select().single()
  if (error) { console.error('sendMessage:', error.message); return null }
  return data
}

// Search organizations by name or slug — callable before the user is authenticated
// (uses the search_organizations SECURITY DEFINER function which grants anon access).
export async function searchOrganizations(query) {
  if (!supabase || !query.trim()) return []
  const { data, error } = await supabase.rpc('search_organizations', { query: query.trim() })
  if (error) { console.error('searchOrganizations:', error.message); return [] }
  return data || []
}

// Create a new organization and register the caller as its supervisor.
// Returns { data, error } so callers can surface the actual DB error message.
export async function createOrgAndSupervisor(orgName, orgSlug, name) {
  if (!supabase) return { data: null, error: 'Not connected to database' }
  const { data, error } = await supabase.rpc('create_org_and_supervisor', {
    p_org_name: orgName,
    p_org_slug: orgSlug,
    p_name:     name,
  })
  if (error) { console.error('createOrgAndSupervisor:', error.message) }
  return { data: error ? null : data, error: error?.message ?? null }
}

// Create or link a staff profile after sign-up.
// Returns { data, error } so callers can surface the actual DB error message.
export async function registerAsStaff(orgId, name) {
  if (!supabase) return { data: null, error: 'Not connected to database' }
  const { data, error } = await supabase.rpc('register_as_staff', { p_org_id: orgId, p_name: name })
  if (error) { console.error('registerAsStaff:', error.message) }
  return { data: error ? null : data, error: error?.message ?? null }
}


// ── Time clock (punches) + timesheets + approvals ───────────────────────────
// Clock in: insert an open punch (clock_in_at defaults now). Returns the row.
export async function clockIn(orgId, { houseId, staffId, staffName, role, shiftId, lat, lng } = {}) {
  if (isDemoMode) return demo.demoClockIn(orgId, { houseId, staffId, staffName, role, shiftId, lat, lng })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase
    .from('time_punches')
    .insert({
      org_id:    orgId,
      house_id:  houseId || null,
      staff_id:  staffId || null,
      staff_name: staffName || null,
      role:      role || null,
      shift_id:  shiftId || null,
      in_lat:    lat ?? null,
      in_lng:    lng ?? null,
    })
    .select()
    .single()
  if (error) { console.error('clockIn:', error.message); return null }
  return data
}

// Clock out: stamp clock_out_at = now, plus optional location & break minutes.
export async function clockOut(punchId, { lat, lng, paidBreakMin, unpaidBreakMin } = {}) {
  if (isDemoMode) return demo.demoClockOut(punchId, { lat, lng, paidBreakMin, unpaidBreakMin })
  if (!supabase || !punchId) return null
  const patch = { clock_out_at: new Date().toISOString() }
  if (lat != null) patch.out_lat = lat
  if (lng != null) patch.out_lng = lng
  if (paidBreakMin != null) patch.paid_break_min = paidBreakMin
  if (unpaidBreakMin != null) patch.unpaid_break_min = unpaidBreakMin
  const { data, error } = await supabase.from('time_punches').update(patch).eq('id', punchId).select().single()
  if (error) { console.error('clockOut:', error.message); return null }
  return data
}

// The caller's currently-open punch (clock_out_at IS NULL) for this staff, or null.
export async function fetchActivePunch(orgId, staffId) {
  if (isDemoMode) return demo.demoFetchActivePunch(orgId, staffId)
  if (!supabase || !orgId || !staffId) return null
  const { data, error } = await supabase
    .from('time_punches')
    .select('*')
    .eq('org_id', orgId)
    .eq('staff_id', staffId)
    .is('clock_out_at', null)
    .order('clock_in_at', { ascending: false })
    .limit(1)
  if (error) { console.error('fetchActivePunch:', error.message); return null }
  return (data && data[0]) || null
}

// Punches in [from, to] by clock_in_at date (inclusive), optionally filtered by
// house/staff, ordered clock_in_at ascending. `from`/`to` are 'YYYY-MM-DD'.
export async function fetchPunches(orgId, { houseId = null, staffId = null, from = null, to = null } = {}) {
  if (isDemoMode) return demo.demoFetchPunches(orgId, { houseId, staffId, from, to })
  if (!supabase || !orgId) return []
  let q = supabase.from('time_punches').select('*').eq('org_id', orgId).order('clock_in_at', { ascending: true })
  if (houseId) q = q.eq('house_id', houseId)
  if (staffId) q = q.eq('staff_id', staffId)
  if (from) q = q.gte('clock_in_at', from)
  if (to) q = q.lte('clock_in_at', to + 'T23:59:59')
  const { data, error } = await q
  if (error) { console.error('fetchPunches:', error.message); return [] }
  return data || []
}

// Everyone currently clocked in (clock_out_at IS NULL), optionally house-scoped.
export async function fetchClockedInNow(orgId, { houseId = null } = {}) {
  if (isDemoMode) return demo.demoFetchClockedInNow(orgId, { houseId })
  if (!supabase || !orgId) return []
  let q = supabase.from('time_punches').select('*').eq('org_id', orgId).is('clock_out_at', null).order('clock_in_at', { ascending: true })
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchClockedInNow:', error.message); return [] }
  return data || []
}

// Submit a timesheet correction (status 'pending'). Returns the row.
export async function requestShiftEdit(orgId, { houseId, staffId, staffName, targetDate, requestedIn, requestedOut, reason } = {}) {
  if (isDemoMode) return demo.demoRequestShiftEdit(orgId, { houseId, staffId, staffName, targetDate, requestedIn, requestedOut, reason })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase
    .from('shift_edit_requests')
    .insert({
      org_id:        orgId,
      house_id:      houseId || null,
      staff_id:      staffId || null,
      staff_name:    staffName || null,
      target_date:   targetDate,
      requested_in:  requestedIn || null,
      requested_out: requestedOut || null,
      reason:        reason || null,
      status:        'pending',
    })
    .select()
    .single()
  if (error) { console.error('requestShiftEdit:', error.message); return null }
  return data
}

// Shift edit requests, newest first, optionally filtered by house & status.
export async function fetchShiftEditRequests(orgId, { houseId = null, status = null } = {}) {
  if (isDemoMode) return demo.demoFetchShiftEditRequests(orgId, { houseId, status })
  if (!supabase || !orgId) return []
  let q = supabase.from('shift_edit_requests').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) { console.error('fetchShiftEditRequests:', error.message); return [] }
  return data || []
}

// Approve/reject a request — stamps status, decider name, and decided_at = now.
export async function reviewShiftEditRequest(id, { status, decidedByName } = {}) {
  if (isDemoMode) return demo.demoReviewShiftEditRequest(id, { status, decidedByName })
  if (!supabase || !id) return null
  const { data, error } = await supabase
    .from('shift_edit_requests')
    .update({ status, decided_by_name: decidedByName || null, decided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('reviewShiftEditRequest:', error.message); return null }
  return data
}

// Count of pending shift edit requests (optionally house-scoped) for badges.
export async function countPendingRequests(orgId, { houseId = null } = {}) {
  if (isDemoMode) return demo.demoCountPendingRequests(orgId, { houseId })
  if (!supabase || !orgId) return 0
  let q = supabase.from('shift_edit_requests').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending')
  if (houseId) q = q.eq('house_id', houseId)
  const { count, error } = await q
  if (error) { console.error('countPendingRequests:', error.message); return 0 }
  return count || 0
}

function toDateStr(date) {
  if (typeof date === 'string') return date
  // Local date (not UTC) so evening entries don't roll to the next day.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Short clock label like "8:14a" / "2:05p" for alert timestamps.
function fmtClock(iso) {
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`
}
