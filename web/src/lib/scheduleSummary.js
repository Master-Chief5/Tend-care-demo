// Pure schedule-summary helpers (no imports, no React, no side effects).
//
// These power the weekly hour / shift / staff SUMMARIES shown on the schedule
// screen. They are tolerant of empty / null inputs and never throw, so the UI
// can call them on partially-loaded data.

// Decimal hours for a single shift row `{ start, end }`. `end` may exceed 24 for
// an overnight shift; hours = max(0, end - start). Non-numbers collapse to 0.
export function shiftHours(s) {
  if (!s) return 0
  const start = Number(s.start)
  const end = Number(s.end)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.max(0, end - start)
}

// Identity key for "distinct staff": prefer staffId, else the person's name.
function staffKey(s) {
  if (s.staffId != null && s.staffId !== '') return `id:${s.staffId}`
  const name = s.person ?? s.person_name
  return name ? `name:${name}` : null
}

// Summarize one day's shifts → `{ hours, count, staff }`.
//   • hours = sum of shiftHours
//   • count = number of shifts (includes "open" shifts)
//   • staff = number of DISTINCT staff, EXCLUDING shifts whose status === 'open'
export function summarizeDay(dayShifts) {
  const list = Array.isArray(dayShifts) ? dayShifts : []
  let hours = 0
  const staff = new Set()
  for (const s of list) {
    if (!s) continue
    hours += shiftHours(s)
    if (s.status === 'open') continue
    const key = staffKey(s)
    if (key) staff.add(key)
  }
  return { hours, count: list.length, staff: staff.size }
}

// Summarize a whole week → `{ perDay, total }`.
//   • perDay — 7 entries aligned to `weekDates`, each `{ date, hours, count }`
//   • total  — `{ hours, shifts, staff }`; staff = distinct staff across the week
// Shift shape: `{ house, date, start, end, person, staffId, status }`
// (`date` is 'YYYY-MM-DD', `start`/`end` are numbers).
export function summarizeWeek(weekShifts, weekDates) {
  const shifts = Array.isArray(weekShifts) ? weekShifts : []
  const dates = Array.isArray(weekDates) ? weekDates : []

  const perDay = dates.map(date => {
    const day = shifts.filter(s => s && s.date === date)
    const { hours, count } = summarizeDay(day)
    return { date, hours, count }
  })

  let totalHours = 0
  let totalShifts = 0
  const weekStaff = new Set()
  for (const s of shifts) {
    if (!s) continue
    totalHours += shiftHours(s)
    totalShifts += 1
    if (s.status === 'open') continue
    const key = staffKey(s)
    if (key) weekStaff.add(key)
  }

  return { perDay, total: { hours: totalHours, shifts: totalShifts, staff: weekStaff.size } }
}

// Compact hours label: "0", "7.5", "40" — strips a trailing ".0".
export function fmtHrs(h) {
  const n = Number(h)
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}
