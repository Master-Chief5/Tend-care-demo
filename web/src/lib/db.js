import { supabase, isDemoMode } from './supabase'
import * as demo from './demoStore'

// Returns the staff profile for the authenticated user.
// Uses a SECURITY DEFINER RPC that bypasses RLS — safe for initial login bootstrap.
export async function fetchStaffProfile(authUserId, _email) {
  if (!supabase || !authUserId) return null

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('profile timeout')), 6000)
    )
    const result = await Promise.race([supabase.rpc('get_my_staff_profile'), timeout])
    const { data, error } = result
    if (error) { console.error('fetchStaffProfile:', error.message); return null }
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
  } catch (e) {
    console.error('fetchStaffProfile failed:', e.message)
    return null
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
    })
    .select()
    .single()
  if (error) { console.error('addResident:', error.message); return null }
  return data
}

// Update a resident. (Demo mode keeps the full clinical profile; real-mode
// updates only the columns that exist on the base residents table.)
export async function updateResident(id, updates) {
  if (isDemoMode) return demo.demoUpdateResident(id, updates)
  if (!supabase) return null
  const patch = {}
  for (const k of ['name', 'room', 'dob', 'status', 'notes']) {
    if (updates[k] !== undefined) patch[k] = updates[k] || null
  }
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


function toDateStr(date) {
  if (typeof date === 'string') return date
  return date.toISOString().split('T')[0]
}

// Short clock label like "8:14a" / "2:05p" for alert timestamps.
function fmtClock(iso) {
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`
}
