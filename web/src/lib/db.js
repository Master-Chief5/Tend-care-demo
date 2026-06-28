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
    requiredCert: s.required_cert ?? null,
    status: s.status,
    publishedAt: s.published_at ?? null,
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
    requiredCert: s.required_cert ?? null,
    status: s.status,
    publishedAt: s.published_at ?? null,
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
      required_cert: shift.requiredCert || null,
      status:      'scheduled',
      published_at: shift.publishedAt ?? null,
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
  if (updates.requiredCert !== undefined) patch.required_cert = updates.requiredCert || null
  if (updates.status !== undefined)     patch.status = updates.status
  if (updates.publishedAt !== undefined) patch.published_at = updates.publishedAt
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

// Publish a week: stamp published_at = now on every non-open shift in the
// week/house scope. Returns the count published.
export async function publishShiftsWeek(orgId, { houseId = null, weekStart, weekEnd } = {}) {
  if (isDemoMode) return demo.demoPublishShiftsWeek(orgId, { houseId, weekStart, weekEnd })
  if (!supabase || !orgId) return 0
  let q = supabase
    .from('shifts')
    .update({ published_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .neq('status', 'open')
    .gte('shift_date', toDateStr(weekStart))
    .lte('shift_date', toDateStr(weekEnd))
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q.select('id')
  if (error) { console.error('publishShiftsWeek:', error.message); return 0 }
  return (data || []).length
}

// Claim an open shift: assign the staffer and flip status to 'scheduled'.
// Returns the updated shift.
export async function claimShift(shiftId, { staffId, staffName } = {}) {
  if (isDemoMode) return demo.demoClaimShift(shiftId, { staffId, staffName })
  // Stamp published_at so the claimed shift stays visible to the staffer (the
  // staff publishGate hides shifts with no published_at).
  return updateShift(shiftId, { staffId, personName: staffName, status: 'scheduled', publishedAt: new Date().toISOString() })
}

// ── Shift swap / cover requests ──────────────────────────────────────────────
// A worker asks to be relieved of a shift (optionally naming a coworker to take
// it); a manager approves (reassign / open) or denies. Backed by the demo store
// or the swap_requests table (house-scoped RLS) in real mode.
export async function createSwapRequest(req = {}) {
  if (isDemoMode) return demo.demoCreateSwapRequest(req)
  if (!supabase || !req.orgId) return null
  const { data, error } = await supabase.from('swap_requests').insert({
    org_id: req.orgId, house_id: req.houseId || null, shift_id: req.shiftId,
    from_staff_id: req.fromStaffId || null, from_name: req.fromName || null,
    to_staff_id: req.toStaffId || null, to_name: req.toName || null,
    note: req.note || null, status: 'pending',
  }).select().single()
  if (error) { console.error('createSwapRequest:', error.message); return null }
  return data
}
export async function fetchSwapRequests(opts = {}) {
  if (isDemoMode) return demo.demoFetchSwapRequests(opts)
  if (!supabase || !opts.orgId) return []
  let q = supabase.from('swap_requests')
    .select('*, houses(name, color), shifts(shift_date, start_hour, end_hour, role, person_name, status)')
    .eq('org_id', opts.orgId)
  if (opts.houseId) q = q.eq('house_id', opts.houseId)
  if (opts.fromStaffId) q = q.eq('from_staff_id', opts.fromStaffId)
  if (opts.status) q = q.eq('status', opts.status)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) { console.error('fetchSwapRequests:', error.message); return [] }
  return (data || []).map(r => ({
    id: r.id, shiftId: r.shift_id, fromName: r.from_name, fromStaffId: r.from_staff_id,
    toName: r.to_name, toStaffId: r.to_staff_id, note: r.note, status: r.status,
    createdAt: r.created_at, resolvedBy: r.resolved_by, resolvedAt: r.resolved_at,
    houseId: r.house_id, houseName: r.houses?.name || null, houseColor: r.houses?.color || null,
    date: r.shifts?.shift_date || null, start: r.shifts?.start_hour ?? null, end: r.shifts?.end_hour ?? null,
    role: r.shifts?.role || null, stillAssignedTo: r.shifts?.person_name || null, shiftStatus: r.shifts?.status || null,
  }))
}
export async function resolveSwapRequest(id, { approve, by } = {}) {
  if (isDemoMode) return demo.demoResolveSwapRequest(id, { approve, by })
  if (!supabase || !id) return null
  const { data: r } = await supabase.from('swap_requests').select('*').eq('id', id).single()
  if (!r || r.status !== 'pending') return null
  if (approve) {
    // Reassign the shift to the named coworker, or release it to the open pool.
    if (r.to_staff_id || r.to_name) await updateShift(r.shift_id, { staffId: r.to_staff_id, personName: r.to_name, status: 'scheduled', publishedAt: new Date().toISOString() })
    else await updateShift(r.shift_id, { status: 'open', personName: '', staffId: null })
  }
  const { data, error } = await supabase.from('swap_requests')
    .update({ status: approve ? 'approved' : 'denied', resolved_by: by || null, resolved_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) { console.error('resolveSwapRequest:', error.message); return null }
  return data
}
export async function countPendingSwaps({ orgId = null, houseId = null } = {}) {
  if (isDemoMode) return demo.demoCountPendingSwaps({ houseId })
  if (!supabase || !orgId) return 0
  let q = supabase.from('swap_requests').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending')
  if (houseId) q = q.eq('house_id', houseId)
  const { count, error } = await q
  if (error) { console.error('countPendingSwaps:', error.message); return 0 }
  return count || 0
}

// Count of open (unfilled) shifts in scope, for the schedule nav badge.
export async function countOpenShifts(orgId, { houseId = null } = {}) {
  if (isDemoMode) return demo.demoCountOpenShifts(orgId, { houseId })
  if (!supabase || !orgId) return 0
  let q = supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'open')
  if (houseId) q = q.eq('house_id', houseId)
  const { count, error } = await q
  if (error) { console.error('countOpenShifts:', error.message); return 0 }
  return count || 0
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

// ── Behavior support plans (BSP) + structured ABC behavior events ────────────
export async function fetchBehaviorPlans(orgId, { houseId = null, residentId = null } = {}) {
  if (isDemoMode) return demo.demoFetchBehaviorPlans(orgId, houseId, residentId)
  if (!supabase || !orgId) return []
  let q = supabase.from('behavior_plans').select('*').eq('org_id', orgId).order('created_at', { ascending: true })
  if (houseId) q = q.eq('house_id', houseId)
  if (residentId) q = q.eq('resident_id', residentId)
  const { data, error } = await q
  if (error) { console.error('fetchBehaviorPlans:', error.message); return [] }
  return (data || []).map(p => ({
    id: p.id, houseId: p.house_id, residentId: p.resident_id, residentName: p.resident_name,
    targetBehaviors: p.target_behaviors || [], antecedentStrategies: p.antecedent_strategies,
    replacementBehaviors: p.replacement_behaviors, interventionSteps: p.intervention_steps,
    createdByName: p.created_by_name, createdAt: p.created_at, updatedAt: p.updated_at,
  }))
}
export async function createBehaviorPlan(orgId, plan) {
  if (isDemoMode) return demo.demoCreateBehaviorPlan(orgId, plan)
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('behavior_plans').insert({
    org_id: orgId, house_id: plan.houseId || null, resident_id: plan.residentId || null,
    resident_name: plan.residentName || null, target_behaviors: plan.targetBehaviors || [],
    antecedent_strategies: plan.antecedentStrategies || null, replacement_behaviors: plan.replacementBehaviors || null,
    intervention_steps: plan.interventionSteps || null, created_by_name: plan.createdByName || null,
  }).select().single()
  if (error) { console.error('createBehaviorPlan:', error.message); return null }
  return {
    id: data.id, houseId: data.house_id, residentId: data.resident_id, residentName: data.resident_name,
    targetBehaviors: data.target_behaviors || [], antecedentStrategies: data.antecedent_strategies,
    replacementBehaviors: data.replacement_behaviors, interventionSteps: data.intervention_steps,
    createdByName: data.created_by_name, createdAt: data.created_at, updatedAt: data.updated_at,
  }
}
export async function updateBehaviorPlan(id, updates) {
  if (isDemoMode) return demo.demoUpdateBehaviorPlan(id, updates)
  if (!supabase || !id) return null
  const patch = { updated_at: new Date().toISOString() }
  if (updates.targetBehaviors !== undefined)      patch.target_behaviors = updates.targetBehaviors
  if (updates.antecedentStrategies !== undefined) patch.antecedent_strategies = updates.antecedentStrategies || null
  if (updates.replacementBehaviors !== undefined) patch.replacement_behaviors = updates.replacementBehaviors || null
  if (updates.interventionSteps !== undefined)    patch.intervention_steps = updates.interventionSteps || null
  const { data, error } = await supabase.from('behavior_plans').update(patch).eq('id', id).select().single()
  if (error) { console.error('updateBehaviorPlan:', error.message); return null }
  // Mirror createBehaviorPlan / demoUpdateBehaviorPlan so callers get the same shape.
  return {
    id: data.id, houseId: data.house_id, residentId: data.resident_id, residentName: data.resident_name,
    targetBehaviors: data.target_behaviors || [], antecedentStrategies: data.antecedent_strategies,
    replacementBehaviors: data.replacement_behaviors, interventionSteps: data.intervention_steps,
    createdByName: data.created_by_name, createdAt: data.created_at, updatedAt: data.updated_at,
  }
}
export async function deleteBehaviorPlan(id) {
  if (isDemoMode) return demo.demoDeleteBehaviorPlan(id)
  if (supabase) await supabase.from('behavior_plans').delete().eq('id', id)
}

// Structured ABC data points (one per occurrence), newest-first.
export async function fetchBehaviorEvents(orgId, { residentId = null, planId = null, limit = 60 } = {}) {
  if (isDemoMode) return demo.demoFetchBehaviorEvents(orgId, { residentId, planId, limit })
  if (!supabase || !orgId) return []
  let q = supabase.from('behavior_events').select('*').eq('org_id', orgId).order('occurred_at', { ascending: false }).limit(limit)
  if (residentId) q = q.eq('resident_id', residentId)
  if (planId) q = q.eq('plan_id', planId)
  const { data, error } = await q
  if (error) { console.error('fetchBehaviorEvents:', error.message); return [] }
  return (data || []).map(e => ({ id: e.id, residentId: e.resident_id, planId: e.plan_id, occurredAt: e.occurred_at, antecedent: e.antecedent, behavior: e.behavior, consequence: e.consequence, intervention: e.intervention, intensity: e.intensity, by: e.recorded_by }))
}
export async function createBehaviorEvent(orgId, entry) {
  if (isDemoMode) return demo.demoCreateBehaviorEvent(orgId, entry)
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('behavior_events').insert({
    org_id: orgId, house_id: entry.houseId || null, resident_id: entry.residentId || null, plan_id: entry.planId || null,
    occurred_at: entry.occurredAt || new Date().toISOString(), antecedent: entry.antecedent || null,
    behavior: entry.behavior || null, consequence: entry.consequence || null, intervention: entry.intervention || null,
    intensity: entry.intensity || null, recorded_by: entry.by || null,
  }).select().single()
  if (error) { console.error('createBehaviorEvent:', error.message); return null }
  return { id: data.id, residentId: data.resident_id, planId: data.plan_id, occurredAt: data.occurred_at, antecedent: data.antecedent, behavior: data.behavior, consequence: data.consequence, intervention: data.intervention, intensity: data.intensity, by: data.recorded_by }
}
export async function deleteBehaviorEvent(id) {
  if (isDemoMode) return demo.demoDeleteBehaviorEvent(id)
  if (supabase) await supabase.from('behavior_events').delete().eq('id', id)
}

export async function fetchIncidents(orgId, houseId) {
  if (isDemoMode) return demo.demoFetchIncidents(houseId)
  if (!supabase || !orgId) return []
  let q = supabase.from('incidents').select('*, residents(name)').eq('org_id', orgId).order('created_at', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  const { data, error } = await q
  if (error) { console.error('fetchIncidents:', error.message); return [] }
  return (data || []).map(i => ({ id: i.id, type: i.type, severity: i.severity, text: i.narrative, actions: i.actions, notified: i.notified, status: i.status, by: i.reported_by, at: i.created_at, date: i.incident_date, resident: i.residents?.name || null, reviewed_by: i.reviewed_by, reviewed_at: i.reviewed_at, reportable: i.reportable, notified_at: i.notified_at, corrective_action: i.corrective_action, follow_up_due: i.follow_up_due, witnesses: i.witnesses, involved_persons: i.involved_persons, investigation_notes: i.investigation_notes, recommendations: i.recommendations, ane_flag: i.ane_flag, investigator: i.investigator, investigated_at: i.investigated_at, occurred_at: i.occurred_at, photo: i.photo }))
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
    witnesses: inc.witnesses || null, involved_persons: inc.involvedPersons || null,
    investigation_notes: inc.investigationNotes || null, recommendations: inc.recommendations || null,
    ane_flag: inc.aneFlag || null,
    occurred_at: inc.occurredAt || null, photo: inc.photo || null,
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
  if (updates.witnesses !== undefined)         patch.witnesses = updates.witnesses
  if (updates.involvedPersons !== undefined)   patch.involved_persons = updates.involvedPersons
  if (updates.investigationNotes !== undefined) patch.investigation_notes = updates.investigationNotes
  if (updates.recommendations !== undefined)   patch.recommendations = updates.recommendations
  if (updates.aneFlag !== undefined)           patch.ane_flag = updates.aneFlag
  if (updates.investigator !== undefined)      patch.investigator = updates.investigator
  if (updates.markInvestigatedNow)             patch.investigated_at = new Date().toISOString()
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

// Fetch OPEN incidents (not yet reviewed/resolved) with their house slug so the
// dashboards can surface them as "Needs attention" rows. Returns a lightweight
// shape: { slug, resident, type, severity, text }. Mode-aware so it works in both
// the demo store and Supabase backends.
async function fetchOpenIncidentsForAlerts(orgId) {
  if (isDemoMode) {
    const rows = await demo.demoFetchIncidents(null)
    return (rows || [])
      .filter(i => i.status === 'open')
      .map(i => ({ slug: i.house_id || null, resident: i.resident || null, type: i.type, severity: i.severity, text: i.text }))
  }
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('incidents')
    .select('type, severity, narrative, status, residents(name), houses(slug)')
    .eq('org_id', orgId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchOpenIncidentsForAlerts:', error.message); return [] }
  return (data || []).map(i => ({ slug: i.houses?.slug || null, resident: i.residents?.name || null, type: i.type, severity: i.severity, text: i.narrative }))
}

// Build the per-house "Needs attention" rows for the Houses dashboard from real
// data. Returns a map keyed by house slug → [{ kind, text }], where kind is one
// of 'incident' | 'grocery' | 'med' | 'note' | 'drive' | 'appt'. Each house is
// capped at a few rows so cards stay scannable; the UI shows a "+N more"
// affordance for the rest.
export async function fetchHouseAlerts(orgId) {
  const empty = {}
  if (!orgId) return empty
  const today = toDateStr(new Date())

  const [resources, meds, notes, trips, appts, incidents] = await Promise.all([
    fetchResources(orgId, null),
    fetchMedAlerts(orgId, null),
    fetchShiftNotes(orgId, null),
    fetchTrips(orgId, null, today),
    fetchAppointments(orgId, { includeCompleted: false }),
    fetchOpenIncidentsForAlerts(orgId),
  ])

  const map = {}
  const push = (slug, row) => {
    if (!slug) return
    ;(map[slug] ||= []).push(row)
  }

  // Incident — open (un-reviewed) incidents lead the list so they're never
  // crowded out by routine supplies/appointments. Label carries resident/type/severity.
  for (const i of incidents) {
    const who = i.resident ? `${i.resident} — ` : ''
    const sev = i.severity ? ` · ${i.severity}` : ''
    push(i.slug, { kind: 'incident', text: `${who}${i.type || 'Incident'}${sev}` })
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

  // Appt — upcoming medical appointments within the next 7 days (transport flagged).
  const weekMs = Date.now() + 7 * 86400000
  for (const a of appts) {
    if (!a.appt_at) continue
    const ms = new Date(a.appt_at).getTime()
    if (isNaN(ms) || ms > weekMs) continue
    const when = fmtClock(a.appt_at)
    const tx = a.transport_needed ? ' · transport needed' : ''
    const prov = a.provider ? ` — ${a.provider}` : ''
    push(a.houses?.slug, { kind: 'appt', text: `${a.resident_name || 'Resident'}${prov} (${when})${tx}` })
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
// Pass houseId so the new staffer is assigned to their group home — without it
// auth_house_id() is null and every house-scoped write fails RLS. Safe to re-call
// for an existing house-less account: it fills in the missing house (an existing
// assignment is kept). Returns { data, error } so callers can surface the reason.
export async function registerAsStaff(orgId, name, houseId = null) {
  if (!supabase) return { data: null, error: 'Not connected to database' }
  const { data, error } = await supabase.rpc('register_as_staff', { p_org_id: orgId, p_name: name, p_house_id: houseId || null })
  if (error) { console.error('registerAsStaff:', error.message) }
  return { data: error ? null : data, error: error?.message ?? null }
}

// List the houses in an org for the sign-up house picker. Callable before the
// user is authenticated (uses the list_org_houses SECURITY DEFINER function,
// granted to anon). Returns [{ id, name, slug }].
export async function listOrgHouses(orgId) {
  if (!supabase || !orgId) return []
  const { data, error } = await supabase.rpc('list_org_houses', { p_org_id: orgId })
  if (error) { console.error('listOrgHouses:', error.message); return [] }
  return data || []
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

// ── Time off + Activity ──────────────────────────────────────────────────────
// Submit a time-off request (status 'pending'). Returns the row.
export async function requestTimeOff(orgId, { houseId, staffId, staffName, kind, startDate, endDate, hours, reason } = {}) {
  if (isDemoMode) return demo.demoRequestTimeOff(orgId, { houseId, staffId, staffName, kind, startDate, endDate, hours, reason })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase
    .from('time_off_requests')
    .insert({
      org_id:     orgId,
      house_id:   houseId || null,
      staff_id:   staffId || null,
      staff_name: staffName || null,
      kind:       kind || 'vacation',
      start_date: startDate,
      end_date:   endDate,
      hours:      hours ?? null,
      reason:     reason || null,
      status:     'pending',
    })
    .select()
    .single()
  if (error) { console.error('requestTimeOff:', error.message); return null }
  return data
}

// Time-off requests, newest first, optionally filtered by house & status.
export async function fetchTimeOffRequests(orgId, { houseId = null, status = null } = {}) {
  if (isDemoMode) return demo.demoFetchTimeOffRequests(orgId, { houseId, status })
  if (!supabase || !orgId) return []
  let q = supabase.from('time_off_requests').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) { console.error('fetchTimeOffRequests:', error.message); return [] }
  return data || []
}

// Approve/reject a time-off request — stamps status, decider name, decided_at = now.
export async function reviewTimeOffRequest(id, { status, decidedByName } = {}) {
  if (isDemoMode) return demo.demoReviewTimeOffRequest(id, { status, decidedByName })
  if (!supabase || !id) return null
  const { data, error } = await supabase
    .from('time_off_requests')
    .update({ status, decided_by_name: decidedByName || null, decided_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('reviewTimeOffRequest:', error.message); return null }
  return data
}

// Count of pending time-off requests (optionally house-scoped) for badges.
export async function countPendingTimeOff(orgId, { houseId = null } = {}) {
  if (isDemoMode) return demo.demoCountPendingTimeOff(orgId, { houseId })
  if (!supabase || !orgId) return 0
  let q = supabase.from('time_off_requests').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending')
  if (houseId) q = q.eq('house_id', houseId)
  const { count, error } = await q
  if (error) { console.error('countPendingTimeOff:', error.message); return 0 }
  return count || 0
}

// Unified, newest-first activity feed aggregated from existing data (no new
// table). Each event: { id, kind, at /* ISO */, actor, text, houseId }, where
// kind ∈ 'clock_in' | 'clock_out' | 'shift_edit' | 'time_off' |
// 'work_hour_limit' | 'auto_clock_out'. House-filter includes org-wide
// (null house_id) rows. Errors are handled per source so one bad table doesn't
// sink the feed.
const WORK_HOUR_LIMIT_MS = 16 * 60 * 60 * 1000
export async function fetchActivityFeed(orgId, { houseId = null, limit = 40 } = {}) {
  if (isDemoMode) return demo.demoFetchActivityFeed({ houseId, limit })
  if (!supabase || !orgId) return []

  const events = []
  const inHouse = (rowHouseId) => !houseId || rowHouseId == null || rowHouseId === houseId

  // time_punches → clock_in / clock_out (+ work_hour_limit / auto_clock_out)
  try {
    let q = supabase.from('time_punches').select('*').eq('org_id', orgId).order('clock_in_at', { ascending: false }).limit(limit)
    const { data, error } = await q
    if (error) throw error
    for (const p of (data || [])) {
      if (!inHouse(p.house_id)) continue
      const name = p.staff_name || 'Someone'
      events.push({ id: `clockin-${p.id}`, kind: 'clock_in', at: p.clock_in_at, actor: name, text: `${name} clocked in`, houseId: p.house_id || null })
      if (p.clock_out_at) {
        events.push({ id: `clockout-${p.id}`, kind: 'clock_out', at: p.clock_out_at, actor: name, text: `${name} clocked out`, houseId: p.house_id || null })
      }
      const end = p.clock_out_at ? new Date(p.clock_out_at).getTime() : Date.now()
      const span = end - new Date(p.clock_in_at).getTime()
      if (span > WORK_HOUR_LIMIT_MS) {
        events.push({ id: `whl-${p.id}`, kind: 'work_hour_limit', at: p.clock_out_at || p.clock_in_at, actor: name, text: `${name} exceeded the daily work-hour limit`, houseId: p.house_id || null })
      }
      if (p.auto_closed) {
        events.push({ id: `auto-${p.id}`, kind: 'auto_clock_out', at: p.clock_out_at || p.clock_in_at, actor: name, text: `${name} was auto clocked out`, houseId: p.house_id || null })
      }
    }
  } catch (e) { console.error('fetchActivityFeed punches:', e.message) }

  // shift_edit_requests → shift_edit
  try {
    let q = supabase.from('shift_edit_requests').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(limit)
    const { data, error } = await q
    if (error) throw error
    for (const r of (data || [])) {
      if (!inHouse(r.house_id)) continue
      const name = r.staff_name || 'Someone'
      events.push({ id: `shiftedit-${r.id}`, kind: 'shift_edit', at: r.created_at, actor: name, text: `${name} requested a shift edit on ${r.target_date}`, houseId: r.house_id || null })
    }
  } catch (e) { console.error('fetchActivityFeed shiftEdits:', e.message) }

  // time_off_requests → time_off
  try {
    let q = supabase.from('time_off_requests').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(limit)
    const { data, error } = await q
    if (error) throw error
    for (const r of (data || [])) {
      if (!inHouse(r.house_id)) continue
      const name = r.staff_name || 'Someone'
      events.push({ id: `timeoff-${r.id}`, kind: 'time_off', at: r.created_at, actor: name, text: `${name} requested ${r.kind} time off`, houseId: r.house_id || null })
    }
  } catch (e) { console.error('fetchActivityFeed timeOff:', e.message) }

  return events
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    .slice(0, limit)
}

// ── Announcements / Updates ──────────────────────────────────────────────────
// A lightweight org/house updates feed with optional polls + read receipts.
// Rows are returned AUGMENTED so the UI needs a single call:
//   _read       (bool)  — did this staffId read it
//   _myVote     (int|null) — this staffId's poll choice
//   _pollCounts (int[])  — vote tallies, same length as poll_options
//   _readCount  (int)    — total distinct readers
// `bg` is one of: 'sage' | 'clay' | 'blue' | 'amber' | 'plain'.

// Create an announcement. Returns the inserted row, augmented with zeroed
// engagement fields (_read=false, _myVote=null, _pollCounts=zeros, _readCount=0).
export async function createAnnouncement(orgId, { houseId, authorStaffId, authorName, authorRole, title, body, bg, audienceRoles, pollQuestion, pollOptions, requireRead, publishAt } = {}) {
  if (isDemoMode) return demo.demoCreateAnnouncement(orgId, { houseId, authorStaffId, authorName, authorRole, title, body, bg, audienceRoles, pollQuestion, pollOptions, requireRead, publishAt })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      org_id:          orgId,
      house_id:        houseId || null,
      author_staff_id: authorStaffId || null,
      author_name:     authorName || null,
      author_role:     authorRole || null,
      title:           title || null,
      body:            body || '',
      bg:              bg || 'plain',
      audience_roles:  (audienceRoles && audienceRoles.length) ? audienceRoles : null,
      poll_question:   pollQuestion || null,
      poll_options:    (pollOptions && pollOptions.length) ? pollOptions : null,
      require_read:    !!requireRead,
      publish_at:      publishAt || null,
    })
    .select()
    .single()
  if (error) { console.error('createAnnouncement:', error.message); return null }
  return {
    ...data,
    _read: false,
    _myVote: null,
    _pollCounts: (data.poll_options || []).map(() => 0),
    _readCount: 0,
  }
}

// Announcements visible to this staff, newest first, each augmented with
// engagement fields. RLS auto-applies house + audience filtering.
export async function fetchAnnouncements(orgId, { houseId = null, staffId = null, role = null } = {}) {
  if (isDemoMode) return demo.demoFetchAnnouncements(orgId, { houseId, staffId, role })
  if (!supabase || !orgId) return []

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) { console.error('fetchAnnouncements:', error.message); return [] }

  // Scheduled posts (future publish_at) stay hidden until due — except for
  // their own author, who sees them with a "Scheduled" pill.
  const nowMs = Date.now()
  const rows = (data || []).filter(r =>
    !r.publish_at || new Date(r.publish_at).getTime() <= nowMs || (staffId && r.author_staff_id === staffId)
  )
  if (rows.length === 0) return []
  const ids = rows.map(r => r.id)

  // Read receipts → _readCount per id, _read for this staff.
  const readCount = {}
  const readByMe = {}
  try {
    const { data: reads, error: rErr } = await supabase
      .from('announcement_reads')
      .select('announcement_id, staff_id')
      .in('announcement_id', ids)
    if (rErr) throw rErr
    for (const r of (reads || [])) {
      readCount[r.announcement_id] = (readCount[r.announcement_id] || 0) + 1
      if (staffId && r.staff_id === staffId) readByMe[r.announcement_id] = true
    }
  } catch (e) { console.error('fetchAnnouncements reads:', e.message) }

  // Poll votes → _pollCounts per id, _myVote for this staff.
  const voteCounts = {}
  const myVote = {}
  try {
    const { data: votes, error: vErr } = await supabase
      .from('announcement_poll_votes')
      .select('announcement_id, staff_id, choice')
      .in('announcement_id', ids)
    if (vErr) throw vErr
    for (const v of (votes || [])) {
      ;(voteCounts[v.announcement_id] || (voteCounts[v.announcement_id] = [])).push(v.choice)
      if (staffId && v.staff_id === staffId) myVote[v.announcement_id] = v.choice
    }
  } catch (e) { console.error('fetchAnnouncements votes:', e.message) }

  return rows.map(r => {
    const opts = r.poll_options || []
    const counts = opts.map(() => 0)
    for (const c of (voteCounts[r.id] || [])) {
      if (c >= 0 && c < counts.length) counts[c] += 1
    }
    return {
      ...r,
      _read:       !!readByMe[r.id],
      _myVote:     myVote[r.id] ?? null,
      _pollCounts: counts,
      _readCount:  readCount[r.id] || 0,
    }
  })
}

// Mark an announcement read by this staff (idempotent). Returns true.
export async function markAnnouncementRead(orgId, { announcementId, staffId, staffName } = {}) {
  if (isDemoMode) return demo.demoMarkAnnouncementRead(orgId, { announcementId, staffId, staffName })
  if (!supabase || !orgId || !announcementId) return false
  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      { org_id: orgId, announcement_id: announcementId, staff_id: staffId || null, staff_name: staffName || null },
      { onConflict: 'announcement_id,staff_id', ignoreDuplicates: true }
    )
  if (error) { console.error('markAnnouncementRead:', error.message); return false }
  return true
}

// Cast or change this staff's poll vote. Returns true.
export async function voteAnnouncementPoll(orgId, { announcementId, staffId, choice } = {}) {
  if (isDemoMode) return demo.demoVoteAnnouncementPoll(orgId, { announcementId, staffId, choice })
  if (!supabase || !orgId || !announcementId) return false
  const { error } = await supabase
    .from('announcement_poll_votes')
    .upsert(
      { org_id: orgId, announcement_id: announcementId, staff_id: staffId || null, choice },
      { onConflict: 'announcement_id,staff_id' }
    )
  if (error) { console.error('voteAnnouncementPoll:', error.message); return false }
  return true
}

// Delete an announcement (reads/votes cascade). Returns true.
export async function deleteAnnouncement(id) {
  if (isDemoMode) return demo.demoDeleteAnnouncement(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) { console.error('deleteAnnouncement:', error.message); return false }
  return true
}

// Reader names for one announcement (newest first). For the admin "Seen by N"
// expander. Returns [{ staffId, name, readAt }].
export async function fetchAnnouncementReaders(orgId, announcementId) {
  if (isDemoMode) return demo.demoFetchAnnouncementReaders(orgId, announcementId)
  if (!supabase || !announcementId) return []
  const { data, error } = await supabase
    .from('announcement_reads')
    .select('staff_id, staff_name, read_at')
    .eq('announcement_id', announcementId)
    .order('read_at', { ascending: false })
  if (error) { console.error('fetchAnnouncementReaders:', error.message); return [] }
  return (data || []).map(r => ({ staffId: r.staff_id || null, name: r.staff_name || 'Staff', readAt: r.read_at || null }))
}

// Count of visible announcements this staff hasn't read yet (for badges).
export async function countUnreadAnnouncements(orgId, { houseId = null, staffId = null, role = null } = {}) {
  if (isDemoMode) return demo.demoCountUnreadAnnouncements(orgId, { houseId, staffId, role })
  const rows = await fetchAnnouncements(orgId, { houseId, staffId, role })
  return rows.filter(r => !r._read).length
}

// ── Recognitions / Kudos ─────────────────────────────────────────────────────
// A peer-recognition feed surfaced alongside Updates. Any role can give kudos.
// Returns rows newest-first. RLS scopes by house + role.
export async function fetchRecognitions(orgId, { houseId = null, role = null } = {}) {
  if (isDemoMode) return demo.demoFetchRecognitions(orgId, { houseId, role })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('recognitions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) { console.error('fetchRecognitions:', error.message); return [] }
  return data || []
}

// Give kudos to a staff member. Returns the inserted row.
export async function createRecognition(orgId, { houseId, toStaffId, toStaffName, fromName, fromRole, badge, message } = {}) {
  if (isDemoMode) return demo.demoCreateRecognition(orgId, { houseId, toStaffId, toStaffName, fromName, fromRole, badge, message })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase
    .from('recognitions')
    .insert({
      org_id:        orgId,
      house_id:      houseId || null,
      to_staff_id:   toStaffId || null,
      to_staff_name: toStaffName || null,
      from_name:     fromName || null,
      from_role:     fromRole || null,
      badge:         badge || 'star',
      message:       message || '',
    })
    .select()
    .single()
  if (error) { console.error('createRecognition:', error.message); return null }
  return data
}

// ── Knowledge base / Handbook ────────────────────────────────────────────────
// A searchable SOP / policy / house-binder library. Returned sorted pinned-first
// then newest. house_id null = org-wide; RLS scopes by house + role.
export async function fetchKbArticles(orgId, { houseId = null, role = null } = {}) {
  if (isDemoMode) return demo.demoFetchKbArticles(orgId, { houseId, role })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('kb_articles').select('*').eq('org_id', orgId)
    .order('pinned', { ascending: false }).order('updated_at', { ascending: false }).limit(200)
  if (error) { console.error('fetchKbArticles:', error.message); return [] }
  return data || []
}

export async function createKbArticle(orgId, { houseId, category, title, body, pinned, updatedByName } = {}) {
  if (isDemoMode) return demo.demoCreateKbArticle(orgId, { houseId, category, title, body, pinned, updatedByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('kb_articles').insert({
    org_id: orgId, house_id: houseId || null, category: category || null,
    title: title || '', body: body || '', pinned: !!pinned, updated_by_name: updatedByName || null,
  }).select().single()
  if (error) { console.error('createKbArticle:', error.message); return null }
  return data
}

export async function updateKbArticle(id, { category, title, body, pinned } = {}) {
  if (isDemoMode) return demo.demoUpdateKbArticle(id, { category, title, body, pinned })
  if (!supabase || !id) return null
  const patch = { updated_at: new Date().toISOString() }
  if (category !== undefined) patch.category = category
  if (title !== undefined) patch.title = title
  if (body !== undefined) patch.body = body
  if (pinned !== undefined) patch.pinned = pinned
  const { data, error } = await supabase.from('kb_articles').update(patch).eq('id', id).select().single()
  if (error) { console.error('updateKbArticle:', error.message); return null }
  return data
}

export async function deleteKbArticle(id) {
  if (isDemoMode) return demo.demoDeleteKbArticle(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('kb_articles').delete().eq('id', id)
  if (error) { console.error('deleteKbArticle:', error.message); return false }
  return true
}

// ── Events / sign-ups ────────────────────────────────────────────────────────
// Dated trainings / house meetings / appointments with RSVP + capacity. Rows are
// returned AUGMENTED: _goingCount (int), _myRsvp ('going'|'declined'|null),
// _spotsLeft (int|null). Upcoming sorted soonest-first; past/archived newest-first.
export async function fetchEvents(orgId, { houseId = null, role = null, staffId = null, includeArchived = false } = {}) {
  if (isDemoMode) return demo.demoFetchEvents(orgId, { houseId, role, staffId, includeArchived })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('events').select('*').eq('org_id', orgId)
    .order('event_at', { ascending: !includeArchived }).limit(200)
  if (error) { console.error('fetchEvents:', error.message); return [] }
  const nowMs = Date.now()
  const rows = (data || []).filter(e => {
    const past = e.event_at ? new Date(e.event_at).getTime() < nowMs : false
    return includeArchived ? (past || e.status === 'archived') : (e.status === 'active' && !past)
  })
  if (rows.length === 0) return []
  const ids = rows.map(r => r.id)
  const going = {}, mine = {}
  try {
    const { data: rsvps, error: rErr } = await supabase
      .from('event_rsvps').select('event_id, staff_id, status').in('event_id', ids)
    if (rErr) throw rErr
    for (const r of (rsvps || [])) {
      if (r.status === 'going') going[r.event_id] = (going[r.event_id] || 0) + 1
      if (staffId && r.staff_id === staffId) mine[r.event_id] = r.status
    }
  } catch (e) { console.error('fetchEvents rsvps:', e.message) }
  return rows.map(e => ({
    ...e,
    _goingCount: going[e.id] || 0,
    _myRsvp: mine[e.id] ?? null,
    _spotsLeft: e.capacity != null ? Math.max(0, e.capacity - (going[e.id] || 0)) : null,
  }))
}

export async function createEvent(orgId, { houseId, title, kind, eventAt, location, capacity, createdByName } = {}) {
  if (isDemoMode) return demo.demoCreateEvent(orgId, { houseId, title, kind, eventAt, location, capacity, createdByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('events').insert({
    org_id: orgId, house_id: houseId || null, title: title || '', kind: kind || 'meeting',
    event_at: eventAt || null, location: location || null,
    capacity: capacity != null ? capacity : null, created_by_name: createdByName || null, status: 'active',
  }).select().single()
  if (error) { console.error('createEvent:', error.message); return null }
  return { ...data, _goingCount: 0, _myRsvp: null, _spotsLeft: data.capacity != null ? data.capacity : null }
}

export async function rsvpEvent(orgId, { eventId, staffId, staffName, status } = {}) {
  if (isDemoMode) return demo.demoRsvpEvent(orgId, { eventId, staffId, staffName, status })
  if (!supabase || !orgId || !eventId) return false
  const { error } = await supabase.from('event_rsvps').upsert(
    { org_id: orgId, event_id: eventId, staff_id: staffId || null, staff_name: staffName || null, status },
    { onConflict: 'event_id,staff_id' })
  if (error) { console.error('rsvpEvent:', error.message); return false }
  return true
}

export async function archiveEvent(id) {
  if (isDemoMode) return demo.demoArchiveEvent(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('events').update({ status: 'archived' }).eq('id', id)
  if (error) { console.error('archiveEvent:', error.message); return false }
  return true
}

export async function deleteEvent(id) {
  if (isDemoMode) return demo.demoDeleteEvent(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) { console.error('deleteEvent:', error.message); return false }
  return true
}

export async function countMyUpcomingEvents(orgId, { houseId = null, role = null, staffId = null } = {}) {
  if (isDemoMode) return demo.demoCountMyUpcomingEvents(orgId, { houseId, role, staffId })
  const rows = await fetchEvents(orgId, { houseId, role, staffId })
  return rows.filter(e => e._myRsvp === 'going').length
}

// ── Medical appointments ─────────────────────────────────────────────────────
// Per-resident medical appointments (dental, physical, psychiatry, etc.) with a
// provider, transport flag, and an outcome recorded once the visit completes.
// Returned soonest-first; rows carry the houses(...) join for the slug.
export async function fetchAppointments(orgId, { houseId = null, residentId = null, includeCompleted = true } = {}) {
  if (isDemoMode) return demo.demoFetchAppointments(orgId, { houseId, residentId, includeCompleted })
  if (!supabase || !orgId) return []
  let q = supabase.from('appointments').select('*, houses(slug, name, color, short)').eq('org_id', orgId)
  if (houseId) q = q.eq('house_id', houseId)
  if (residentId) q = q.eq('resident_id', residentId)
  if (!includeCompleted) q = q.neq('status', 'completed')
  const { data, error } = await q.order('appt_at', { ascending: true }).limit(200)
  if (error) { console.error('fetchAppointments:', error.message); return [] }
  return data || []
}

export async function createAppointment(orgId, { houseId, residentId, residentName, apptAt, provider, type, reason, transportNeeded, createdByName } = {}) {
  if (isDemoMode) return demo.demoCreateAppointment(orgId, { houseId, residentId, residentName, apptAt, provider, type, reason, transportNeeded, createdByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('appointments').insert({
    org_id: orgId, house_id: houseId || null, resident_id: residentId || null, resident_name: residentName || null,
    appt_at: apptAt || null, provider: provider || null, type: type || 'other', reason: reason || null,
    status: 'scheduled', transport_needed: !!transportNeeded, created_by_name: createdByName || null,
  }).select('*, houses(slug, name, color, short)').single()
  if (error) { console.error('createAppointment:', error.message); return null }
  return data
}

export async function updateAppointment(id, { status, outcome, provider, type, reason, apptAt, transportNeeded } = {}) {
  if (isDemoMode) return demo.demoUpdateAppointment(id, {
    status, outcome, provider, type, reason,
    ...(apptAt !== undefined ? { appt_at: apptAt } : {}),
    ...(transportNeeded !== undefined ? { transport_needed: transportNeeded } : {}),
  })
  if (!supabase || !id) return null
  const patch = {}
  if (status !== undefined) patch.status = status
  if (outcome !== undefined) patch.outcome = outcome
  if (provider !== undefined) patch.provider = provider
  if (type !== undefined) patch.type = type
  if (reason !== undefined) patch.reason = reason
  if (apptAt !== undefined) patch.appt_at = apptAt
  if (transportNeeded !== undefined) patch.transport_needed = transportNeeded
  const { data, error } = await supabase.from('appointments').update(patch).eq('id', id)
    .select('*, houses(slug, name, color, short)').single()
  if (error) { console.error('updateAppointment:', error.message); return null }
  return data
}

export async function deleteAppointment(id) {
  if (isDemoMode) return demo.demoDeleteAppointment(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) { console.error('deleteAppointment:', error.message); return false }
  return true
}

// ── Resident personal funds (PNI) ledger ─────────────────────────────────────
// Regulatory deposit/withdrawal ledger per resident. Running balance is the sum
// of deposits minus withdrawals. Returned newest-first; rows carry houses(...).
export async function fetchResidentFunds(orgId, { houseId = null, residentId = null } = {}) {
  if (isDemoMode) return demo.demoFetchResidentFunds(orgId, { houseId, residentId })
  if (!supabase || !orgId) return []
  let q = supabase.from('resident_funds').select('*, houses(slug, name, color, short)').eq('org_id', orgId)
  if (houseId) q = q.eq('house_id', houseId)
  if (residentId) q = q.eq('resident_id', residentId)
  const { data, error } = await q.order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(500)
  if (error) { console.error('fetchResidentFunds:', error.message); return [] }
  return data || []
}

export async function addResidentFundEntry(orgId, { houseId, residentId, residentName, entryDate, type, amount, category, note, recordedByName } = {}) {
  if (isDemoMode) return demo.demoAddResidentFundEntry(orgId, { houseId, residentId, residentName, entryDate, type, amount, category, note, recordedByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('resident_funds').insert({
    org_id: orgId, house_id: houseId || null, resident_id: residentId || null, resident_name: residentName || null,
    entry_date: entryDate || toDateStr(new Date()), type: type || 'deposit', amount: Number(amount) || 0,
    category: category || null, note: note || null, recorded_by_name: recordedByName || null,
  }).select('*, houses(slug, name, color, short)').single()
  if (error) { console.error('addResidentFundEntry:', error.message); return null }
  return data
}

export async function deleteResidentFundEntry(id) {
  if (isDemoMode) return demo.demoDeleteResidentFundEntry(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('resident_funds').delete().eq('id', id)
  if (error) { console.error('deleteResidentFundEntry:', error.message); return false }
  return true
}

// Running balance helper (deposits − withdrawals), shared by demo + Supabase.
export function residentFundsBalance(entries = []) {
  return demo.residentFundsBalance(entries)
}

// ── Forms (no-code form templates + submissions) ─────────────────────────────
// Templates are org-wide (house_id null) or house-scoped; everyone reads/submits,
// supervisors/managers build & review. RLS scopes by house + role.
export async function fetchFormTemplates(orgId, { houseId = null, role = null } = {}) {
  if (isDemoMode) return demo.demoFetchFormTemplates(orgId, { houseId, role })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('form_templates').select('*').eq('org_id', orgId)
    .order('created_at', { ascending: false }).limit(200)
  if (error) { console.error('fetchFormTemplates:', error.message); return [] }
  return data || []
}

export async function createFormTemplate(orgId, { houseId, name, description, fields, createdByName } = {}) {
  if (isDemoMode) return demo.demoCreateFormTemplate(orgId, { houseId, name, description, fields, createdByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('form_templates').insert({
    org_id: orgId, house_id: houseId || null, name: name || '', description: description || '',
    fields: Array.isArray(fields) ? fields : [], created_by_name: createdByName || null,
  }).select().single()
  if (error) { console.error('createFormTemplate:', error.message); return null }
  return data
}

export async function deleteFormTemplate(id) {
  if (isDemoMode) return demo.demoDeleteFormTemplate(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('form_templates').delete().eq('id', id)
  if (error) { console.error('deleteFormTemplate:', error.message); return false }
  return true
}

export async function fetchFormSubmissions(orgId, { templateId = null, houseId = null } = {}) {
  if (isDemoMode) return demo.demoFetchFormSubmissions(orgId, { templateId, houseId })
  if (!supabase || !orgId) return []
  let q = supabase.from('form_submissions').select('*').eq('org_id', orgId)
  if (templateId) q = q.eq('template_id', templateId)
  const { data, error } = await q.order('submitted_at', { ascending: false }).limit(300)
  if (error) { console.error('fetchFormSubmissions:', error.message); return [] }
  return data || []
}

export async function submitForm(orgId, { templateId, houseId, answers, submittedByName } = {}) {
  if (isDemoMode) return demo.demoSubmitForm(orgId, { templateId, houseId, answers, submittedByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('form_submissions').insert({
    org_id: orgId, house_id: houseId || null, template_id: templateId || null,
    answers: answers && typeof answers === 'object' ? answers : {},
    submitted_by_name: submittedByName || null, status: 'open',
  }).select().single()
  if (error) { console.error('submitForm:', error.message); return null }
  return data
}

export async function reviewFormSubmission(id, { reviewedByName } = {}) {
  if (isDemoMode) return demo.demoReviewFormSubmission(id, { reviewedByName })
  if (!supabase || !id) return null
  const { data, error } = await supabase.from('form_submissions')
    .update({ status: 'reviewed', reviewed_by_name: reviewedByName || null })
    .eq('id', id).select().single()
  if (error) { console.error('reviewFormSubmission:', error.message); return null }
  return data
}

// ── Surveys (staff pulse / training feedback) ────────────────────────────────
// Org-wide or house-scoped. Returned AUGMENTED: _responseCount (int),
// _myResponded (bool). RLS scopes by house + role; responses org-readable.

// Build per-question tallies from a survey's collected answers (keyed by
// question index). Returns a CLONE of the questions with _tallies / _avg
// attached; never mutates the stored template.
function _surveyTalliesFromAnswers(questions, answersList) {
  const qs = Array.isArray(questions) ? questions : []
  return qs.map((q, i) => {
    if (!q || typeof q !== 'object') return q
    const type = q.type
    if (type === 'multiple' || type === 'yesno') {
      const tallies = {}
      for (const ans of answersList) {
        const v = ans ? ans[i] : undefined
        if (v == null || String(v).trim() === '') continue
        const key = String(v)
        tallies[key] = (tallies[key] || 0) + 1
      }
      return { ...q, _tallies: tallies }
    }
    if (type === 'rating') {
      const tallies = {}
      let sum = 0, n = 0
      for (const ans of answersList) {
        const num = Number(ans ? ans[i] : undefined)
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

export async function fetchSurveys(orgId, { houseId = null, role = null, staffId = null } = {}) {
  if (isDemoMode) return demo.demoFetchSurveys(orgId, { houseId, role, staffId })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('surveys').select('*').eq('org_id', orgId)
    .order('created_at', { ascending: false }).limit(200)
  if (error) { console.error('fetchSurveys:', error.message); return [] }
  const rows = data || []
  if (rows.length === 0) return []
  const ids = rows.map(r => r.id)
  const count = {}, mine = {}, answersBySurvey = {}
  try {
    const { data: resps, error: rErr } = await supabase
      .from('survey_responses').select('survey_id, staff_id, answers').in('survey_id', ids)
    if (rErr) throw rErr
    for (const r of (resps || [])) {
      count[r.survey_id] = (count[r.survey_id] || 0) + 1
      if (staffId && r.staff_id === staffId) mine[r.survey_id] = true
      if (!answersBySurvey[r.survey_id]) answersBySurvey[r.survey_id] = []
      answersBySurvey[r.survey_id].push(r.answers && typeof r.answers === 'object' ? r.answers : {})
    }
  } catch (e) { console.error('fetchSurveys responses:', e.message) }
  return rows.map(s => ({
    ...s,
    questions: _surveyTalliesFromAnswers(s.questions, answersBySurvey[s.id] || []),
    _responseCount: count[s.id] || 0,
    _myResponded: !!mine[s.id],
  }))
}

export async function createSurvey(orgId, { houseId, title, questions, anonymous, createdByName } = {}) {
  if (isDemoMode) return demo.demoCreateSurvey(orgId, { houseId, title, questions, anonymous, createdByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('surveys').insert({
    org_id: orgId, house_id: houseId || null, title: title || '',
    questions: Array.isArray(questions) ? questions : [], anonymous: !!anonymous,
    created_by_name: createdByName || null, status: 'active',
  }).select().single()
  if (error) { console.error('createSurvey:', error.message); return null }
  return { ...data, _responseCount: 0, _myResponded: false }
}

export async function submitSurveyResponse(orgId, { surveyId, staffId, answers } = {}) {
  if (isDemoMode) return demo.demoSubmitSurveyResponse(orgId, { surveyId, staffId, answers })
  if (!supabase || !orgId || !surveyId) return false
  // Anonymous surveys must never store who responded. Look up the survey's
  // anonymous flag and force staff_id=null when set. Dedup (onConflict) only
  // applies to non-anonymous responses (which carry a staff_id).
  let anonymous = false
  const { data: svy } = await supabase.from('surveys').select('anonymous').eq('id', surveyId).single()
  if (svy && svy.anonymous) anonymous = true
  const effectiveStaffId = anonymous ? null : (staffId || null)
  const payload = { org_id: orgId, survey_id: surveyId, staff_id: effectiveStaffId,
    answers: answers && typeof answers === 'object' ? answers : {} }
  if (anonymous) {
    const { error } = await supabase.from('survey_responses').insert(payload)
    if (error) { console.error('submitSurveyResponse:', error.message); return false }
    return true
  }
  const { error } = await supabase.from('survey_responses').upsert(payload, { onConflict: 'survey_id,staff_id' })
  if (error) { console.error('submitSurveyResponse:', error.message); return false }
  return true
}

export async function closeSurvey(id) {
  if (isDemoMode) return demo.demoCloseSurvey(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('surveys').update({ status: 'closed' }).eq('id', id)
  if (error) { console.error('closeSurvey:', error.message); return false }
  return true
}

export async function deleteSurvey(id) {
  if (isDemoMode) return demo.demoDeleteSurvey(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('surveys').delete().eq('id', id)
  if (error) { console.error('deleteSurvey:', error.message); return false }
  return true
}

// ── Courses / Training ───────────────────────────────────────────────────────
// Assignable training courses with sections + an optional quiz. Rows are returned
// AUGMENTED with _myCompleted (bool), _myScore (int|null), _myCompletedAt, and
// _completionCount (int). house_id null = org-wide. Completions are one per
// (course, staff). Mirrors surveys/knowledge.
export async function fetchCourses(orgId, { houseId = null, role = null, staffId = null } = {}) {
  if (isDemoMode) return demo.demoFetchCourses(orgId, { houseId, role, staffId })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('courses').select('*').eq('org_id', orgId)
    .order('required', { ascending: false }).order('created_at', { ascending: false }).limit(200)
  if (error) { console.error('fetchCourses:', error.message); return [] }
  const rows = data || []
  if (rows.length === 0) return []
  const ids = rows.map(r => r.id)
  const count = {}, mine = {}
  try {
    const { data: comps, error: cErr } = await supabase
      .from('course_completions').select('course_id, staff_id, score, completed_at').in('course_id', ids)
    if (cErr) throw cErr
    for (const r of (comps || [])) {
      count[r.course_id] = (count[r.course_id] || 0) + 1
      if (staffId && r.staff_id === staffId) mine[r.course_id] = r
    }
  } catch (e) { console.error('fetchCourses completions:', e.message) }
  return rows.map(c => ({
    ...c,
    _myCompleted: !!mine[c.id],
    _myScore: mine[c.id] ? mine[c.id].score : null,
    _myCompletedAt: mine[c.id] ? mine[c.id].completed_at : null,
    _completionCount: count[c.id] || 0,
  }))
}

export async function createCourse(orgId, { houseId, title, description, sections, quiz, required, assignRoles, createdByName } = {}) {
  if (isDemoMode) return demo.demoCreateCourse(orgId, { houseId, title, description, sections, quiz, required, assignRoles, createdByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('courses').insert({
    org_id: orgId, house_id: houseId || null, title: title || '', description: description || '',
    sections: Array.isArray(sections) ? sections : [], quiz: Array.isArray(quiz) ? quiz : [],
    required: !!required, assign_roles: Array.isArray(assignRoles) ? assignRoles : [],
    created_by_name: createdByName || null,
  }).select().single()
  if (error) { console.error('createCourse:', error.message); return null }
  return { ...data, _myCompleted: false, _myScore: null, _myCompletedAt: null, _completionCount: 0 }
}

export async function deleteCourse(id) {
  if (isDemoMode) return demo.demoDeleteCourse(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) { console.error('deleteCourse:', error.message); return false }
  return true
}

export async function completeCourse(orgId, { courseId, staffId, staffName, score } = {}) {
  if (isDemoMode) return demo.demoCompleteCourse(orgId, { courseId, staffId, staffName, score })
  if (!supabase || !orgId || !courseId) return null
  const { data, error } = await supabase.from('course_completions').upsert(
    { org_id: orgId, course_id: courseId, staff_id: staffId || null,
      staff_name: staffName || null, score: score == null ? null : score,
      completed_at: new Date().toISOString() },
    { onConflict: 'course_id,staff_id' }).select().single()
  if (error) { console.error('completeCourse:', error.message); return null }
  return data
}

export async function fetchCourseCompletions(orgId, { courseId = null } = {}) {
  if (isDemoMode) return demo.demoFetchCourseCompletions(orgId, { courseId })
  if (!supabase || !orgId) return []
  let q = supabase.from('course_completions').select('*').eq('org_id', orgId)
  if (courseId) q = q.eq('course_id', courseId)
  const { data, error } = await q.limit(1000)
  if (error) { console.error('fetchCourseCompletions:', error.message); return [] }
  return data || []
}

// ── Quick tasks (assignable one-off tasks with due dates) ────────────────────
export async function fetchQuickTasks(orgId, { houseId = null, assignedStaffId = null, status = null } = {}) {
  if (isDemoMode) return demo.demoFetchQuickTasks(orgId, { houseId, assignedStaffId, status })
  if (!supabase || !orgId) return []
  let q = supabase.from('quick_tasks').select('*').eq('org_id', orgId)
  // Match the demo: scope to the house but include org-wide (null-house) rows.
  if (houseId) q = q.or('house_id.eq.' + houseId + ',house_id.is.null')
  if (assignedStaffId) q = q.eq('assigned_staff_id', assignedStaffId)
  if (status) q = q.eq('status', status)
  const { data, error } = await q.order('due_at', { ascending: true }).limit(300)
  if (error) { console.error('fetchQuickTasks:', error.message); return [] }
  return data || []
}

export async function createQuickTask(orgId, { houseId, title, notes, assignedStaffId, assignedName, dueAt, createdByName } = {}) {
  if (isDemoMode) return demo.demoCreateQuickTask(orgId, { houseId, title, notes, assignedStaffId, assignedName, dueAt, createdByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('quick_tasks').insert({
    org_id: orgId, house_id: houseId || null, title: title || '', notes: notes || null,
    assigned_staff_id: assignedStaffId || null, assigned_name: assignedName || null,
    due_at: dueAt || null, status: 'open', created_by_name: createdByName || null,
  }).select().single()
  if (error) { console.error('createQuickTask:', error.message); return null }
  return data
}

export async function completeQuickTask(id, doneByName) {
  if (isDemoMode) return demo.demoCompleteQuickTask(id, doneByName)
  if (!supabase || !id) return null
  const { data, error } = await supabase.from('quick_tasks')
    .update({ status: 'done', done_at: new Date().toISOString(), done_by_name: doneByName || null })
    .eq('id', id).select().single()
  if (error) { console.error('completeQuickTask:', error.message); return null }
  return data
}

export async function reopenQuickTask(id) {
  if (isDemoMode) return demo.demoReopenQuickTask(id)
  if (!supabase || !id) return null
  const { data, error } = await supabase.from('quick_tasks')
    .update({ status: 'open', done_at: null, done_by_name: null })
    .eq('id', id).select().single()
  if (error) { console.error('reopenQuickTask:', error.message); return null }
  return data
}

export async function deleteQuickTask(id) {
  if (isDemoMode) return demo.demoDeleteQuickTask(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('quick_tasks').delete().eq('id', id)
  if (error) { console.error('deleteQuickTask:', error.message); return false }
  return true
}

// Count of open quick tasks past their due date (org-wide or scoped to a house
// and/or assignee). Powers the Overdue chip + count and the Home/MyDay surfacing.
export async function countOverdueQuickTasks(orgId, { houseId = null, assignedStaffId = null } = {}) {
  if (isDemoMode) return demo.demoCountOverdueQuickTasks(orgId, { houseId, assignedStaffId })
  if (!supabase || !orgId) return 0
  let q = supabase.from('quick_tasks').select('id', { count: 'exact', head: true })
    .eq('org_id', orgId).eq('status', 'open').lt('due_at', new Date().toISOString())
  // Match the demo: scope to the house but include org-wide (null-house) rows.
  if (houseId) q = q.or('house_id.eq.' + houseId + ',house_id.is.null')
  if (assignedStaffId) q = q.eq('assigned_staff_id', assignedStaffId)
  const { count, error } = await q
  if (error) { console.error('countOverdueQuickTasks:', error.message); return 0 }
  return count || 0
}

// ── Smart groups (reusable saved audiences) ──────────────────────────────────
// A saved audience definition that expands to a set of staff via house + roles
// + an optional required cert. A convenience layer over the existing ad-hoc
// targeting in Updates — picking a group pre-fills the audience scope.
export async function fetchSmartGroups(orgId) {
  if (isDemoMode) return demo.demoFetchSmartGroups(orgId)
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('smart_groups').select('*').eq('org_id', orgId)
    .order('name', { ascending: true }).limit(200)
  if (error) { console.error('fetchSmartGroups:', error.message); return [] }
  return (data || []).map(g => ({
    id: g.id, orgId: g.org_id, houseId: g.house_id ?? null, name: g.name,
    roles: Array.isArray(g.roles) ? g.roles : [], requiredCert: g.required_cert ?? null,
    createdByName: g.created_by_name ?? null, createdAt: g.created_at,
  }))
}

export async function createSmartGroup(orgId, { houseId, name, roles, requiredCert, createdByName } = {}) {
  if (isDemoMode) return demo.demoCreateSmartGroup(orgId, { houseId, name, roles, requiredCert, createdByName })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('smart_groups').insert({
    org_id: orgId, house_id: houseId || null, name: name || '',
    roles: Array.isArray(roles) ? roles : [], required_cert: requiredCert || null,
    created_by_name: createdByName || null,
  }).select().single()
  if (error) { console.error('createSmartGroup:', error.message); return null }
  return {
    id: data.id, orgId: data.org_id, houseId: data.house_id ?? null, name: data.name,
    roles: Array.isArray(data.roles) ? data.roles : [], requiredCert: data.required_cert ?? null,
    createdByName: data.created_by_name ?? null, createdAt: data.created_at,
  }
}

export async function deleteSmartGroup(id) {
  if (isDemoMode) return demo.demoDeleteSmartGroup(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('smart_groups').delete().eq('id', id)
  if (error) { console.error('deleteSmartGroup:', error.message); return false }
  return true
}

// Expand a saved group to the set of matching staff ids, via house + roles +
// required cert. Mirrors demoResolveSmartGroup — re-uses fetchStaff so the
// matching logic stays in one place (rawRole + certs).
export async function resolveSmartGroup(orgId, groupId) {
  if (isDemoMode) return demo.demoResolveSmartGroup(orgId, groupId)
  if (!supabase || !orgId || !groupId) return []
  const { data, error } = await supabase.from('smart_groups').select('*').eq('id', groupId).single()
  if (error || !data) { if (error) console.error('resolveSmartGroup:', error.message); return [] }
  const roles = Array.isArray(data.roles) ? data.roles : []
  const cert = data.required_cert || null
  const today = toDateStr(new Date())
  const staff = await fetchStaff(orgId, data.house_id || null)
  return (staff || [])
    .filter(s => roles.length === 0 || roles.includes(s.rawRole))
    .filter(s => {
      if (!cert) return true
      return (s.certs || []).some(c => c && c.name === cert && (!c.expires || c.expires >= today))
    })
    .map(s => s.id)
}

// ── Directory (external contacts) ────────────────────────────────────────────
export async function fetchContacts(orgId, { houseId = null, role = null } = {}) {
  if (isDemoMode) return demo.demoFetchContacts(orgId, { houseId, role })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('contacts').select('*').eq('org_id', orgId)
    .order('name', { ascending: true }).limit(500)
  if (error) { console.error('fetchContacts:', error.message); return [] }
  return data || []
}

export async function createContact(orgId, { houseId, name, kind, orgName, phone, email, notes } = {}) {
  if (isDemoMode) return demo.demoCreateContact(orgId, { houseId, name, kind, orgName, phone, email, notes })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('contacts').insert({
    org_id: orgId, house_id: houseId || null, name: name || '', kind: kind || 'other',
    org_name: orgName || null, phone: phone || null, email: email || null, notes: notes || null,
  }).select().single()
  if (error) { console.error('createContact:', error.message); return null }
  return data
}

export async function updateContact(id, { name, kind, orgName, phone, email, notes } = {}) {
  if (isDemoMode) return demo.demoUpdateContact(id, { name, kind, orgName, phone, email, notes })
  if (!supabase || !id) return null
  const patch = {}
  if (name !== undefined)    patch.name = name
  if (kind !== undefined)    patch.kind = kind
  if (orgName !== undefined) patch.org_name = orgName
  if (phone !== undefined)   patch.phone = phone
  if (email !== undefined)   patch.email = email
  if (notes !== undefined)   patch.notes = notes
  const { data, error } = await supabase.from('contacts').update(patch).eq('id', id).select().single()
  if (error) { console.error('updateContact:', error.message); return null }
  return data
}

export async function deleteContact(id) {
  if (isDemoMode) return demo.demoDeleteContact(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) { console.error('deleteContact:', error.message); return false }
  return true
}

// ── Help Desk (internal ticketing) ───────────────────────────────────────────
export async function fetchTickets(orgId, { houseId = null, role = null, staffId = null } = {}) {
  if (isDemoMode) return demo.demoFetchTickets(orgId, { houseId, role, staffId })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('tickets').select('*').eq('org_id', orgId)
    .order('created_at', { ascending: false }).limit(300)
  if (error) { console.error('fetchTickets:', error.message); return [] }
  return data || []
}

export async function createTicket(orgId, { houseId, topic, subject, body, priority, createdByName, createdByStaffId } = {}) {
  if (isDemoMode) return demo.demoCreateTicket(orgId, { houseId, topic, subject, body, priority, createdByName, createdByStaffId })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase.from('tickets').insert({
    org_id: orgId, house_id: houseId || null, topic: topic || 'other', subject: subject || '',
    body: body || null, status: 'open', priority: priority || 'med',
    created_by_name: createdByName || null, created_by_staff_id: createdByStaffId || null,
  }).select().single()
  if (error) { console.error('createTicket:', error.message); return null }
  return data
}

export async function updateTicket(id, { status, assignedToName } = {}) {
  if (isDemoMode) return demo.demoUpdateTicket(id, { status, assignedToName })
  if (!supabase || !id) return null
  const patch = { updated_at: new Date().toISOString() }
  if (status !== undefined) patch.status = status
  if (assignedToName !== undefined) patch.assigned_to_name = assignedToName || null
  const { data, error } = await supabase.from('tickets').update(patch).eq('id', id).select().single()
  if (error) { console.error('updateTicket:', error.message); return null }
  return data
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

// ── Schedule templates / tools ───────────────────────────────────────────────
// A "template shift" is a day-of-week pattern object:
//   { dayIndex: 0-6, startHour, endHour, role, personName, staffId, note }
// where dayIndex is the POSITION within the displayed week. These power
// save/apply week templates AND copy-a-week (the UI builds the `shifts` array
// from a source week before calling applyShiftsToWeek).

// Save a week template. `shifts` is the template-shift array (stored as-is in
// the jsonb column). Returns the inserted row, or null.
export async function saveScheduleTemplate(orgId, { houseId, name, shifts, createdByName } = {}) {
  if (isDemoMode) return demo.demoSaveScheduleTemplate(orgId, { houseId, name, shifts, createdByName })
  if (!supabase) return null
  const { data, error } = await supabase
    .from('schedule_templates')
    .insert({
      org_id:          orgId,
      house_id:        houseId || null,
      name,
      shifts:          shifts || [],
      created_by_name: createdByName || null,
    })
    .select()
    .single()
  if (error) { console.error('saveScheduleTemplate:', error.message); return null }
  return data
}

// Fetch week templates, newest-first. RLS house-filters; when houseId is passed
// we also return org-wide (house_id IS NULL) plus that house's templates.
export async function fetchScheduleTemplates(orgId, { houseId } = {}) {
  if (isDemoMode) return demo.demoFetchScheduleTemplates(orgId, { houseId })
  if (!supabase || !orgId) return []
  let q = supabase
    .from('schedule_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (houseId) q = q.or(`house_id.is.null,house_id.eq.${houseId}`)
  const { data, error } = await q
  if (error) { console.error('fetchScheduleTemplates:', error.message); return [] }
  return data || []
}

// Delete a template. Returns true on success.
export async function deleteScheduleTemplate(id) {
  if (isDemoMode) return demo.demoDeleteScheduleTemplate(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('schedule_templates').delete().eq('id', id)
  if (error) { console.error('deleteScheduleTemplate:', error.message); return false }
  return true
}

// Insert one shift per template-shift at weekDates[dayIndex], via the SAME
// insert addShift uses. `weekDates` is 7 'YYYY-MM-DD' strings. Skips any shift
// whose dayIndex is out of 0-6 or whose weekDates[dayIndex] is missing. Powers
// BOTH "apply template" and "copy week". Returns the count inserted.
export async function applyShiftsToWeek(orgId, { houseId, weekDates, shifts } = {}) {
  if (isDemoMode) return demo.demoApplyShiftsToWeek(orgId, { houseId, weekDates, shifts })
  if (!supabase) return 0
  const dates = Array.isArray(weekDates) ? weekDates : []
  const list = Array.isArray(shifts) ? shifts : []
  let inserted = 0
  for (const ts of list) {
    if (!ts) continue
    const di = ts.dayIndex
    if (!Number.isInteger(di) || di < 0 || di > 6) continue
    const date = dates[di]
    if (!date) continue
    const { error } = await supabase
      .from('shifts')
      .insert({
        org_id:      orgId,
        house_id:    houseId,
        person_name: ts.personName,
        staff_id:    ts.staffId || null,
        role:        ts.role,
        start_hour:  ts.startHour,
        end_hour:    ts.endHour,
        shift_date:  date,
        note:        ts.note || null,
        required_cert: ts.requiredCert || null,
        status:      'scheduled',
      })
    if (error) { console.error('applyShiftsToWeek:', error.message); continue }
    inserted += 1
  }
  return inserted
}

// ── Shift documentation ──────────────────────────────────────────────────────
// Tracks, per resident per shift-date, which care-documentation sections got
// done (so a shift can show "did this get done"). A row only exists when a
// section is 'done' or 'na'; the absence of a row means it's still "to do".
// Valid `section` values: 'log' | 'health' | 'goals' | 'meds' | 'incident'.

// Rows for one house + shift-date. Returns the rows that exist (done/na):
//   { id, resident_id, section, status, done_by_name, updated_at }
export async function fetchShiftDocProgress(orgId, { houseId, date } = {}) {
  if (isDemoMode) return demo.demoFetchShiftDocProgress({ houseId, date })
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('shift_doc_progress')
    .select('id, resident_id, section, status, done_by_name, updated_at')
    .eq('org_id', orgId)
    .eq('house_id', houseId)
    .eq('shift_date', date)
  if (error) { console.error('fetchShiftDocProgress:', error.message); return [] }
  return data || []
}

// Mark/un-mark a section for one resident on one shift-date.
//   status 'done' | 'na' → upsert the row (status + done_by_name + updated_at)
//   status falsy / 'todo' / 'clear' → delete the matching row (un-mark)
// Returns true on success, false on error.
export async function setShiftDocSection(orgId, { houseId, date, residentId, residentName, section, status, doneByName } = {}) {
  if (isDemoMode) return demo.demoSetShiftDocSection(orgId, { houseId, date, residentId, residentName, section, status, doneByName })
  if (!supabase || !orgId) return false
  if (status === 'done' || status === 'na') {
    const { error } = await supabase
      .from('shift_doc_progress')
      .upsert({
        org_id:        orgId,
        house_id:      houseId || null,
        shift_date:    date,
        resident_id:   residentId || null,
        resident_name: residentName || null,
        section,
        status,
        done_by_name:  doneByName || null,
        updated_at:    new Date().toISOString(),
      }, { onConflict: 'house_id,shift_date,resident_id,section' })
    if (error) { console.error('setShiftDocSection:', error.message); return false }
    return true
  }
  const { error } = await supabase
    .from('shift_doc_progress')
    .delete()
    .eq('house_id', houseId)
    .eq('shift_date', date)
    .eq('resident_id', residentId)
    .eq('section', section)
  if (error) { console.error('setShiftDocSection:', error.message); return false }
  return true
}

// ── Resident progress notes ──────────────────────────────────────────────────
// Free-text progress / behavior / medical / general notes about a resident,
// written by staff over time. These are the raw material for a resident's
// progress report (see lib/progressReport.js). House-scoped; DSPs write their
// own house. Valid `category` values: 'progress' | 'behavior' | 'medical' | 'general'.

// Insert a resident note. note_date defaults to today when noteDate is falsy.
// Returns the inserted row, or null.
export async function addResidentNote(orgId, { houseId, residentId, residentName, category, body, authorName, authorRole, noteDate } = {}) {
  if (isDemoMode) return demo.demoAddResidentNote(orgId, { houseId, residentId, residentName, category, body, authorName, authorRole, noteDate })
  if (!supabase || !orgId) return null
  const { data, error } = await supabase
    .from('resident_notes')
    .insert({
      org_id:        orgId,
      house_id:      houseId || null,
      resident_id:   residentId || null,
      resident_name: residentName || null,
      category:      category || 'progress',
      body,
      author_name:   authorName || null,
      author_role:   authorRole || null,
      note_date:     noteDate || toDateStr(new Date()),
    })
    .select()
    .single()
  if (error) { console.error('addResidentNote:', error.message); return null }
  return data
}

// Resident notes, NEWEST-first. Optionally scoped by house/resident and a
// note_date range (from/to inclusive, 'YYYY-MM-DD'). Returns raw row shape:
//   { id, resident_id, resident_name, category, body, author_name, author_role, note_date, created_at }
export async function fetchResidentNotes(orgId, { houseId = null, residentId = null, from = null, to = null } = {}) {
  if (isDemoMode) return demo.demoFetchResidentNotes({ houseId, residentId, from, to })
  if (!supabase || !orgId) return []
  let q = supabase.from('resident_notes').select('*').eq('org_id', orgId).order('note_date', { ascending: false })
  if (houseId) q = q.eq('house_id', houseId)
  if (residentId) q = q.eq('resident_id', residentId)
  if (from) q = q.gte('note_date', from)
  if (to) q = q.lte('note_date', to)
  const { data, error } = await q
  if (error) { console.error('fetchResidentNotes:', error.message); return [] }
  return (data || []).map(n => ({ id: n.id, resident_id: n.resident_id, resident_name: n.resident_name, category: n.category, body: n.body, author_name: n.author_name, author_role: n.author_role, note_date: n.note_date, created_at: n.created_at }))
}

// Delete a resident note. Returns true on success, false on error.
export async function deleteResidentNote(id) {
  if (isDemoMode) return demo.demoDeleteResidentNote(id)
  if (!supabase || !id) return false
  const { error } = await supabase.from('resident_notes').delete().eq('id', id)
  if (error) { console.error('deleteResidentNote:', error.message); return false }
  return true
}
