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

function toProfile(row) {
  return {
    staffId:   row.id,
    orgId:     row.org_id,
    houseId:   row.house_id,
    houseSlug: row.houses?.slug ?? null,
    role:      row.role,
    name:      row.name,
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
    role:      s.role === 'manager' ? 'House mgr' : 'DSP',
    house:     s.houses?.slug ?? null,
    score:     s.quality_score ?? 85,
    sub:       s.tenure ?? '',
    highlight: s.highlight ?? null,
    tenure:    s.tenure ?? '',
    notes:     s.notes ?? '',
  }))
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

function toDateStr(date) {
  if (typeof date === 'string') return date
  return date.toISOString().split('T')[0]
}
