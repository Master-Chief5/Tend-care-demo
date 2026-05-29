import { supabase } from './supabase'

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
    status: s.status,
  }))
}

// Insert a new shift.
export async function addShift(orgId, houseId, shift) {
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
      status:      'scheduled',
    })
    .select()
    .single()
  if (error) { console.error('addShift:', error.message); return null }
  return data
}

// Fetch staff list for an org.
// Pass houseId to limit to one house; null for all staff in org.
export async function fetchStaff(orgId, houseId) {
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
    score:     s.quality_score ?? 85,
    sub:       s.tenure ?? '',
    highlight: s.highlight ?? null,
    tenure:    s.tenure ?? '',
    notes:     s.notes ?? '',
  }))
}

// Insert a staff record (no auth invite yet — placeholder).
export async function inviteStaff(orgId, houseId, member) {
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
  if (!supabase || !id) return
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) console.error('removeStaff:', error.message)
}

// Fetch tasks for a staff member on a given date.
export async function fetchTasks(staffId, date) {
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
  if (!supabase || !taskId) return
  const { error } = await supabase.from('tasks').update({ done }).eq('id', taskId)
  if (error) console.error('toggleTask:', error.message)
}

// Insert a task for today.
export async function addTask(orgId, staffId, task) {
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
  if (!supabase || !id) return
  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (error) console.error('deleteResource:', error.message)
}

// Fetch trips for a given date (or null for all). houseId=null means all houses.
export async function fetchTrips(orgId, houseId, date) {
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

// Fetch all houses in an org.
export async function fetchHouses(orgId) {
  if (!supabase || !orgId) return []

  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) { console.error('fetchHouses:', error.message); return [] }
  return (data || []).map(h => ({
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
}

// Insert a house.
export async function addHouse(orgId, house) {
  if (!supabase) return null
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
  if (error) { console.error('addHouse:', error.message); return null }
  return data
}

// Update a house.
export async function updateHouse(id, updates) {
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
  if (!supabase || !id) return
  const { error } = await supabase.from('houses').delete().eq('id', id)
  if (error) console.error('deleteHouse:', error.message)
}

// Fetch residents.
export async function fetchResidents(orgId, houseId) {
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

function toDateStr(date) {
  if (typeof date === 'string') return date
  return date.toISOString().split('T')[0]
}
