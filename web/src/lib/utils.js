// Date / time utilities

// Escape a string for safe interpolation into raw HTML (e.g. Leaflet popup /
// divIcon markup). Names, destinations and other user-entered values must pass
// through this before being concatenated into an HTML string.
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const _dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Local-timezone "YYYY-MM-DD" for a Date (or pass-through if already a string).
// Use this for all date keys/"today" comparisons so evening entries in negative
// UTC offsets don't roll to the next calendar day (toISOString() is UTC).
export const localDateStr = (d) => (typeof d === 'string' ? d : _dstr(new Date(d)))

// Expand a repeating shift into concrete date strings.
//   startStr  'YYYY-MM-DD' anchor date
//   weekdays  array of weekday indexes (0=Sun … 6=Sat); empty = no repeat
//   weeks     how many weeks to repeat across (including the start week)
// Returns sorted, de-duplicated date strings on/after the start date.
export function expandRepeatDates(startStr, weekdays = [], weeks = 1) {
  if (!weekdays.length) return [startStr]
  const start = new Date(startStr + 'T00:00:00')
  const sunday = new Date(start)
  sunday.setDate(start.getDate() - start.getDay())   // Sunday of the start week
  const out = new Set()
  for (let w = 0; w < Math.max(1, weeks); w++) {
    for (const wd of weekdays) {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + w * 7 + wd)
      if (d >= start) out.add(_dstr(d))
    }
  }
  return [...out].sort()
}

export function buildWeek(today) {
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return { dow: NAMES[d.getDay()], num: d.getDate(), date: d, today: d.toDateString() === today.toDateString() }
  })
}

export function fmtDayLabel(date) {
  const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${DAYS[date.getDay()]} · ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function fmtNow(frac) {
  const h = Math.floor(frac)
  const m = Math.round((frac - h) * 60)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m < 10 ? '0' + m : m} ${period}`
}

export function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function fmtHour(h) {
  const w = ((h % 24) + 24) % 24
  if (w === 0) return '12a'
  if (w === 12) return '12p'
  return w < 12 ? `${w}a` : `${w - 12}p`
}

export function fmtHourLong(h) {
  const w = ((h % 24) + 24) % 24
  if (w === 0) return '12 AM'
  if (w === 12) return '12 PM'
  return w < 12 ? `${w} AM` : `${w - 12} PM`
}

export function fmtTime(h) {
  const w = ((h % 24) + 24) % 24
  const hr = Math.floor(w)
  const min = Math.round((w - hr) * 60)
  const m = min < 10 ? `0${min}` : `${min}`
  if (hr === 0) return `12:${m}a`
  if (hr === 12) return `12:${m}p`
  return hr < 12 ? `${hr}:${m}a` : `${hr - 12}:${m}p`
}
