// Scheduler-safety helpers shared by the desktop + mobile schedule screens.
// Pure functions, no imports — operate on the normalized shapes that
// fetchShiftsWeek (shifts: { staffId, person, date, start, end, status, house })
// and fetchTimeOffRequests (rows: { staff_id, staff_name, start_date, end_date,
// status }) already return.

const norm = (s) => (s || '').trim().toLowerCase()

// Does this time-off row identify the same person as a shift / candidate?
// Match on staff id first, fall back to name (older free-text shifts).
export function timeOffMatchesPerson(row, { staffId, name } = {}) {
  if (staffId && row.staff_id && row.staff_id === staffId) return true
  if (name && row.staff_name && norm(row.staff_name) === norm(name)) return true
  return false
}

// Approved leave rows (from fetchTimeOffRequests) that cover `dateStr` (YYYY-MM-DD)
// for the given person. Returns the matching rows (empty = clear to schedule).
export function approvedLeaveOn(timeOff, { staffId, name, dateStr } = {}) {
  if (!dateStr || !Array.isArray(timeOff)) return []
  return timeOff.filter(r =>
    r.status === 'approved' &&
    r.start_date <= dateStr && dateStr <= r.end_date &&
    timeOffMatchesPerson(r, { staffId, name }))
}

// First existing shift in `weekShifts` for the same person whose hours overlap
// [start, end) on `dateStr`, excluding `exceptId` (the shift being edited).
// Returns the conflicting shift or null.
export function findOverlap(weekShifts, { staffId, name, dateStr, start, end, exceptId } = {}) {
  if (!Array.isArray(weekShifts) || !dateStr) return null
  for (const s of weekShifts) {
    if (exceptId && s.id === exceptId) continue
    if (s.date !== dateStr) continue
    if (s.status === 'open') continue
    const samePerson = (staffId && s.staffId && s.staffId === staffId) ||
      (name && s.person && norm(s.person) === norm(name))
    if (!samePerson) continue
    // Overlap if one starts before the other ends (and vice-versa).
    if (start < s.end && s.start < end) return s
  }
  return null
}
