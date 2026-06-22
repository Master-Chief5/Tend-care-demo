// Pure helpers for the Time Clock + Timesheets + Approvals feature.
//
// NO imports, no React — just plain functions over plain data. All timezone
// handling is LOCAL (getFullYear/getMonth/getDate), matching demoStore's `_ds`
// helper, so "today" always means the user's wall-clock day.

// Weekly overtime threshold (hours). Anything worked beyond this in a single
// pay period counts as overtime.
export const OT_WEEKLY_THRESHOLD = 40

// Decimal hours between two ISO timestamps. Returns 0 if either is
// missing/invalid, or if the range is negative.
export function hoursBetween(startISO, endISO) {
  if (!startISO || !endISO) return 0
  const a = new Date(startISO).getTime()
  const b = new Date(endISO).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  const ms = b - a
  if (ms <= 0) return 0
  return ms / 3600000
}

// Worked hours for a single punch. `active` means it's still open (no
// clock_out_at). The end of the window is clock_out_at, or `nowISO` while
// active. Unpaid break minutes are subtracted (never below 0); paid breaks are
// intentionally ignored here because paid breaks count as worked time.
export function punchWorked(punch, nowISO) {
  if (!punch) return { hours: 0, active: false }
  const active = !punch.clock_out_at
  const end = punch.clock_out_at || nowISO
  let hours = hoursBetween(punch.clock_in_at, end)
  const unpaid = Number(punch.unpaid_break_min) || 0
  hours = Math.max(0, hours - unpaid / 60)
  return { hours, active }
}

// Format decimal hours as "H:MM". Rounds to the nearest whole minute first, so
// 8.02h → "8:01". Negative values are prefixed with "-"; 0 → "0:00".
export function fmtHM(hours) {
  const n = Number(hours)
  if (!Number.isFinite(n) || n === 0) return '0:00'
  const sign = n < 0 ? '-' : ''
  const totalMin = Math.round(Math.abs(n) * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${sign}${h}:${String(m).padStart(2, '0')}`
}

// 'YYYY-MM-DD' local date of an ISO timestamp (or Date). Empty string if invalid.
export function dateOf(iso) {
  if (!iso) return ''
  const d = iso instanceof Date ? iso : new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Month names for the period label.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Format a Date as "Mon D" (e.g. "May 17") in local time.
function monthDay(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

// Parse a date-like value (Date, ISO string, or 'YYYY-MM-DD') into a local Date
// anchored at local midnight, so week math never drifts across a DST boundary
// or UTC offset.
function toLocalDate(dateLike) {
  if (dateLike instanceof Date) {
    return new Date(dateLike.getFullYear(), dateLike.getMonth(), dateLike.getDate())
  }
  if (typeof dateLike === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateLike)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    const d = new Date(dateLike)
    if (Number.isFinite(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

// The week (Sunday → Saturday, local time) containing `dateLike`.
// Returns { start:'YYYY-MM-DD', end:'YYYY-MM-DD', label:'May 17 – May 23' }.
export function periodRange(dateLike) {
  const d = toLocalDate(dateLike)
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay()) // back up to Sunday
  const end = new Date(start)
  end.setDate(start.getDate() + 6) // Saturday
  return {
    start: dateOf(start),
    end: dateOf(end),
    label: `${monthDay(start)} – ${monthDay(end)}`,
  }
}

// The pay period 7 days earlier than `range`.
export function shiftPrevPeriod(range) {
  const d = toLocalDate(range?.start)
  d.setDate(d.getDate() - 7)
  return periodRange(d)
}

// The pay period 7 days later than `range`.
export function shiftNextPeriod(range) {
  const d = toLocalDate(range?.start)
  d.setDate(d.getDate() + 7)
  return periodRange(d)
}

// Overtime hours for a week's worked total — everything beyond the threshold.
export function overtimeFor(weekWorkedHours) {
  const n = Number(weekWorkedHours) || 0
  return Math.max(0, n - OT_WEEKLY_THRESHOLD)
}

// List the 7 'YYYY-MM-DD' dates in a period, inclusive, in order.
function daysInRange(range) {
  const out = []
  const start = toLocalDate(range?.start)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    out.push(dateOf(d))
  }
  return out
}

// Build a per-staff timesheet for a pay period.
//
// punches: raw time_punches rows (snake_case). shifts: array of
// { date:'YYYY-MM-DD', start:Number, end:Number, staffId, person }
// (end may exceed 24 for overnight shifts; scheduled hours = end - start).
//
// Returns an array (sorted by staff name) of:
//   { staffId, name, role, houseId,
//     days: [{ date, worked, scheduled, diff, punches:[...] }] (7 entries),
//     totals: { worked, scheduled, diff, overtime, regular, paidPto } }
export function buildTimesheet(punches, shifts, range) {
  const nowISO = new Date().toISOString()
  const dayList = daysInRange(range)
  const safePunches = Array.isArray(punches) ? punches : []
  const safeShifts = Array.isArray(shifts) ? shifts : []

  // Group punches by staff. Key on staff_id when present, else fall back to the
  // staff_name so name-only rows still aggregate.
  const groups = new Map()
  const keyFor = (p) => p.staff_id || `name:${p.staff_name || ''}`
  for (const p of safePunches) {
    if (!p) continue
    const key = keyFor(p)
    let g = groups.get(key)
    if (!g) {
      g = {
        staffId: p.staff_id || null,
        name: p.staff_name || 'Unknown',
        role: p.role || 'staff',
        houseId: p.house_id || null,
        punches: [],
      }
      groups.set(key, g)
    }
    // Prefer a non-empty name/role/house from any of the staff's punches.
    if (!g.name || g.name === 'Unknown') g.name = p.staff_name || g.name
    if (p.role) g.role = p.role
    if (p.house_id) g.houseId = p.house_id
    g.punches.push(p)
  }

  const result = []
  for (const g of groups.values()) {
    // Scheduled hours for this staff, summed per day. Match a shift to the staff
    // by staffId, else by person name.
    const scheduledByDay = {}
    for (const s of safeShifts) {
      if (!s) continue
      const matches = (g.staffId && s.staffId === g.staffId) ||
        (!!s.person && s.person === g.name)
      if (!matches) continue
      const hrs = Math.max(0, (Number(s.end) || 0) - (Number(s.start) || 0))
      scheduledByDay[s.date] = (scheduledByDay[s.date] || 0) + hrs
    }

    const days = dayList.map((date) => {
      const dayPunches = g.punches.filter(p => dateOf(p.clock_in_at) === date)
      const worked = dayPunches.reduce((sum, p) => sum + punchWorked(p, nowISO).hours, 0)
      const scheduled = scheduledByDay[date] || 0
      return { date, worked, scheduled, diff: worked - scheduled, punches: dayPunches }
    })

    const totalWorked = days.reduce((s, d) => s + d.worked, 0)
    const totalScheduled = days.reduce((s, d) => s + d.scheduled, 0)
    const overtime = overtimeFor(totalWorked)
    result.push({
      staffId: g.staffId,
      name: g.name,
      role: g.role,
      houseId: g.houseId,
      days,
      totals: {
        worked: totalWorked,
        scheduled: totalScheduled,
        diff: totalWorked - totalScheduled,
        overtime,
        regular: totalWorked - overtime,
        paidPto: 0,
      },
    })
  }

  result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  return result
}
