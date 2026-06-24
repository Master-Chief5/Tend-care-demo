import { useState, useEffect, useCallback } from 'react'
import { buildWeek, fmtDayLabel, fmtNow, fmtHour, fmtTime, expandRepeatDates } from '../lib/utils'
import { summarizeWeek, fmtHrs } from '../lib/scheduleSummary'

const WEEKDAYS = [['Su', 0], ['Mo', 1], ['Tu', 2], ['We', 3], ['Th', 4], ['Fr', 5], ['Sa', 6]]
import { useNowMinute } from '../hooks/useNowMinute'
import { fetchShiftsWeek, addShift, updateShift, deleteShift, fetchStaff, fetchHouses, claimShift, fetchTimeOffRequests } from '../lib/db'
import { approvedLeaveOn, findOverlap } from '../lib/scheduleSafety'
import { certStatus } from './People'

// Common certs offered as the optional cert-gate on a shift.
const SHIFT_CERTS = ['Medication Administration', 'CPR / First Aid', 'First Aid']

// The candidate staffer's matching cert for `requiredCert` (case-insensitive
// name match), or null if they don't have one tracked at all.
function matchingCert(certs = [], requiredCert) {
  if (!requiredCert) return null
  const want = requiredCert.trim().toLowerCase()
  return (certs || []).find(c => (c.name || '').trim().toLowerCase() === want) || null
}

// "7:00 AM" style label from a decimal hour — so AM/PM is always explicit.
function hourLabel(h) {
  const total = Math.round((Number(h) || 0) * 60)
  const hh = Math.floor(total / 60) % 24, mm = total % 60
  const ap = hh < 12 ? 'AM' : 'PM'
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${ap}`
}
import { TabBar } from '../components/ui/TabBar'
import { IconPlus, IconKey } from '../components/icons'
import { SuggestInput } from '../components/SuggestInput'

const HOUR_PX = 56
const DAY_START = 0
const DAY_END = 24

function ViewToggle({ view, setView }) {
  return (
    <div style={{ display: 'flex', background: 'var(--a-paper)', borderRadius: 999, padding: 3, border: '1px solid var(--a-line)' }}>
      {['day', 'week', 'month'].map(v => (
        <button key={v} onClick={() => setView(v)} style={{
          border: 0,
          background: v === view ? 'var(--a-ink)' : 'transparent',
          color: v === view ? 'var(--a-card)' : 'var(--a-ink2)',
          padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'Geist', textTransform: 'capitalize',
        }}>{v}</button>
      ))}
    </div>
  )
}

function DayStrip({ week, selectedDate, onPick }) {
  return (
    <div style={{ padding: '0 22px 12px', display: 'flex', gap: 4 }}>
      {week.map((d, i) => {
        const sel = toDateStr(d.date) === selectedDate
        return (
          <div key={i} onClick={() => onPick(d.date)} style={{
            flex: 1, padding: '7px 0', textAlign: 'center', borderRadius: 10, cursor: 'pointer',
            background: sel ? 'var(--a-ink)' : 'transparent',
            color: sel ? 'var(--a-card)' : 'var(--a-ink2)',
            border: sel ? '0' : '1px solid var(--a-line)',
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: '0.04em', opacity: sel ? 0.7 : 1 }}>{d.dow}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{d.num}</div>
          </div>
        )
      })}
    </div>
  )
}

function HouseFilterChips({ houses, active, setActive }) {
  return (
    <div style={{ padding: '0 14px 10px', display: 'flex', gap: 5, overflowX: 'auto' }}>
      <FilterChip active={active === 'all'} onClick={() => setActive('all')} label="All" sub={houses.length} />
      {houses.map(h => (
        <FilterChip key={h.id} active={active === h.id} onClick={() => setActive(h.id)} color={h.color} label={h.name.split(' ')[0]} short={h.short} />
      ))}
    </div>
  )
}

function FilterChip({ active, onClick, label, sub, short, color }) {
  const activeColor = color || 'var(--a-ink)'
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
      padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
      background: active ? activeColor : 'var(--a-card)',
      color: active ? '#fff' : 'var(--a-ink2)',
      border: active ? `1px solid ${activeColor}` : '1px solid var(--a-line)',
      fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist',
    }}>
      {short && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', opacity: active ? 0.85 : 0.7 }}>{short}</span>}
      <span style={{ fontWeight: active ? 600 : 500 }}>{label}</span>
      {sub != null && <span style={{ fontSize: 10, opacity: 0.6 }}>{sub}</span>}
    </button>
  )
}

// Greedy lane layout so overlapping shifts sit side-by-side (only where they
// actually overlap) instead of stacking on top of each other.
function layoutShifts(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end)
  // Break into clusters of transitively-overlapping shifts.
  const clusters = []
  let cur = null
  for (const s of sorted) {
    if (cur && s.start < cur.maxEnd) { cur.items.push(s); cur.maxEnd = Math.max(cur.maxEnd, s.end) }
    else { cur = { items: [s], maxEnd: s.end }; clusters.push(cur) }
  }
  const out = []
  for (const cl of clusters) {
    const laneEnds = []  // end time of the last shift placed in each lane
    for (const s of cl.items) {
      let lane = laneEnds.findIndex(end => end <= s.start)
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(s.end) } else { laneEnds[lane] = s.end }
      s._lane = lane
    }
    const lanes = laneEnds.length
    for (const s of cl.items) out.push({ ...s, _lane: s._lane, _lanes: lanes })
  }
  return out
}

function ShiftBlock({ shift, houseColor, expanded, onClick, mine = false }) {
  const { start, end, person, role, status } = shift
  const top = (start - DAY_START) * HOUR_PX
  const height = (end - start) * HOUR_PX
  const open = status === 'open'
  const late = status === 'late'
  const swap = status === 'swap'
  const dim = status === 'scheduled'
  const bg = open ? 'transparent' : houseColor
  const border = open ? `1.5px dashed ${houseColor}` : late ? `1.5px solid #a93a25` : 'none'
  const txt = open ? houseColor : '#fff'
  const lanes = shift._lanes || 1
  const lane = shift._lane || 0
  const wPct = 100 / lanes
  return (
    <div onClick={onClick} style={{
      position: 'absolute', top: top + 2, left: `calc(${lane * wPct}% + 2px)`, width: `calc(${wPct}% - 4px)`, height: Math.max(height - 4, 20),
      background: bg, border, borderRadius: 6, cursor: 'pointer',
      padding: expanded && lanes === 1 ? '8px 12px' : '4px 6px', color: txt, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 2, opacity: dim && !mine ? 0.78 : 1,
      boxShadow: mine ? '0 0 0 2.5px var(--a-bg), 0 0 0 4px var(--a-ink)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span className="tnum" style={{ fontSize: expanded ? 11 : 9, fontWeight: 700, letterSpacing: '0.04em', opacity: open ? 1 : 0.85 }}>
          {fmtTime(start)}–{fmtTime(end)}
        </span>
        {mine && <span style={{ fontSize: 8, fontWeight: 800, color: houseColor, background: '#fff', padding: '0 4px', borderRadius: 3, letterSpacing: '0.06em' }}>YOU</span>}
        {late && <span style={{ fontSize: 8, fontWeight: 700, color: '#a93a25', background: 'rgba(255,255,255,0.9)', padding: '0 4px', borderRadius: 3 }}>LATE</span>}
        {swap && <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.18)', padding: '0 4px', borderRadius: 3 }}>SWAP</span>}
      </div>
      <div style={{ fontSize: expanded ? 14 : 11, fontWeight: 700, lineHeight: 1.1, color: open ? houseColor : '#fff' }}>{mine ? 'You' : person}</div>
      {height > 48 && <div style={{ fontSize: expanded ? 11 : 9, opacity: open ? 0.8 : 0.7, fontWeight: 500 }}>{role}</div>}
      {shift.note && height > 78 && <div style={{ fontSize: expanded ? 10.5 : 9, opacity: 0.78, fontStyle: 'italic', marginTop: 2, lineHeight: 1.25, overflow: 'hidden' }}>“{shift.note}”</div>}
    </div>
  )
}

function TimeGrid({ shifts, houses, nowFrac = 9.8, onShiftClick, isMine }) {
  const hours = []
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h)
  const nowTop = (nowFrac - DAY_START) * HOUR_PX
  const single = houses.length === 1
  return (
    <div style={{ position: 'relative', display: 'flex', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ width: 50, flexShrink: 0, position: 'relative', borderRight: '1px solid var(--a-line)', background: 'var(--a-paper)' }}>
        {hours.map((h, i) => (
          <div key={i} style={{ height: HOUR_PX, position: 'relative' }}>
            <span style={{ position: 'absolute', top: i === 0 ? 3 : -7, right: 6, fontSize: 10, color: 'var(--a-ink3)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              {fmtHour(h)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${houses.length}, 1fr)` }}>
        {houses.map((h, hi) => (
          <div key={h.id} style={{ position: 'relative', borderRight: hi === houses.length - 1 ? '' : '1px solid var(--a-line)' }}>
            {hours.map((hr, i) => (
              <div key={i} style={{ height: HOUR_PX, borderBottom: i === hours.length - 1 ? '' : '1px solid var(--a-line)', background: i % 2 === 1 ? 'rgba(216, 204, 177, 0.07)' : 'transparent' }} />
            ))}
            {layoutShifts(shifts.filter(s => s.house === h.id)).map((s, si) => (
              <ShiftBlock key={s.id ?? si} shift={s} houseColor={h.color} expanded={single} mine={isMine?.(s)} onClick={() => onShiftClick?.(s)} />
            ))}
          </div>
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, top: nowTop, pointerEvents: 'none', borderTop: '1.5px solid var(--a-clay)', zIndex: 10 }}>
          <div style={{ position: 'absolute', left: -6, top: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--a-clay)' }} />
        </div>
      </div>
    </div>
  )
}

function WeekHouseRow({ house, weekDates = [], weekShifts = [] }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '8px 6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {days.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--a-ink3)', fontWeight: 600 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {(weekDates.length === 7 ? weekDates : [0,1,2,3,4,5,6]).map((date, i) => {
          const dayShifts = typeof date === 'string'
            ? weekShifts.filter(s => s.house === house.id && s.date === date)
            : []
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {dayShifts.length === 0 ? (
                <div style={{ background: 'var(--a-paper)', fontSize: 9, padding: '4px 3px', borderRadius: 4, textAlign: 'center', color: 'var(--a-ink3)', lineHeight: 1.2 }}>—</div>
              ) : (
                dayShifts.slice(0, 2).map((s, si) => (
                  <div key={si} style={{ background: house.color, color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 3px', borderRadius: 4, textAlign: 'center', lineHeight: 1.2 }}>
                    {fmtTime(s.start)}–{fmtTime(s.end)}
                  </div>
                ))
              )}
              {dayShifts.length > 2 && <div style={{ fontSize: 8, color: 'var(--a-ink3)', textAlign: 'center' }}>+{dayShifts.length - 2}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScreenA_ScheduleWeek({ setView, houses, week, weekShifts = [], weekDates = [], onPrev, onNext, onToday }) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const weekLabel = `${MONTHS[week[0].date.getMonth()]} ${week[0].num} – ${MONTHS[week[6].date.getMonth()]} ${week[6].num}`
  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 6px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Schedule</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)' }}>{weekLabel}</div>
            <ViewToggle view="week" setView={setView} />
          </div>
        </div>
        <div style={{ padding: '2px 16px 8px' }}><ScheduleNav onPrev={onPrev} onNext={onNext} onToday={onToday} /></div>
        {(() => {
          const wk = summarizeWeek(weekShifts, weekDates)
          return (
            <div style={{ padding: '0 16px 8px' }}>
              <div style={{ display: 'flex', gap: 14, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '8px 14px', fontSize: 11.5, color: 'var(--a-ink2)' }}>
                <span>This week</span>
                <span><strong style={{ color: 'var(--a-ink)' }}>{fmtHrs(wk.total.hours)}</strong> hrs</span>
                <span><strong style={{ color: 'var(--a-ink)' }}>{wk.total.shifts}</strong> shifts</span>
                <span><strong style={{ color: 'var(--a-ink)' }}>{wk.total.staff}</strong> staff</span>
              </div>
            </div>
          )
        })()}
        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 14px 24px' }}>
          {houses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)', fontSize: 13 }}>No houses set up yet.</div>
          )}
          {houses.map(h => (
            <div key={h.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: h.color }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{h.name}</span>
              </div>
              <WeekHouseRow house={h} weekDates={weekDates} weekShifts={weekShifts} />
            </div>
          ))}
        </div>
      </div>
      <TabBar active="sched" />
    </div>
  )
}

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d }
const addMonths = (date, n) => { const d = new Date(date); d.setMonth(d.getMonth() + n); return d }
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// A 6-week (Mon-start) grid for the month containing `anchor`, trimmed of any
// trailing week that's entirely in the next month.
function buildMonthGrid(anchor) {
  const y = anchor.getFullYear(), m = anchor.getMonth()
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7   // 0 = Monday
  const gridStart = new Date(y, m, 1 - startDow)
  const todayStr = toDateStr(new Date())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i)
    return { date: d, num: d.getDate(), inMonth: d.getMonth() === m, today: toDateStr(d) === todayStr }
  })
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  while (weeks.length > 4 && weeks[weeks.length - 1].every(c => !c.inMonth)) weeks.pop()
  return { weeks, first: cells[0].date, last: weeks[weeks.length - 1][6].date, label: `${MONTHS_FULL[m]} ${y}` }
}

// Prev / Today / Next pill row, shared by the day, week and month views.
function ScheduleNav({ onPrev, onNext, onToday }) {
  const btn = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 8, width: 32, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'Geist', color: 'var(--a-ink2)', fontSize: 17, lineHeight: 1 }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button onClick={onPrev} style={btn} aria-label="Previous">‹</button>
      <button onClick={onToday} style={{ ...btn, width: 'auto', padding: '0 12px', fontSize: 12, fontWeight: 600 }}>Today</button>
      <button onClick={onNext} style={btn} aria-label="Next">›</button>
    </div>
  )
}

function ScreenA_ScheduleMonth({ anchorDate, houses, shifts = [], setView, onPrev, onNext, onToday, onPickDay }) {
  const grid = buildMonthGrid(anchorDate)
  const colorFor = (slug) => houses.find(h => h.id === slug)?.color || 'var(--a-ink3)'
  const byDate = {}
  for (const s of shifts) (byDate[s.date] ||= []).push(s)
  const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 6px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Schedule</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)' }}>{grid.label}</div>
            <ViewToggle view="month" setView={setView} />
          </div>
        </div>
        <div style={{ padding: '2px 16px 10px' }}><ScheduleNav onPrev={onPrev} onNext={onNext} onToday={onToday} /></div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 14px 24px' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)' }}>
              {DOW.map((d, i) => <div key={i} style={{ padding: '7px 0', textAlign: 'center', fontSize: 9.5, color: 'var(--a-ink3)', fontWeight: 700 }}>{d}</div>)}
            </div>
            {grid.weeks.map((wk, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi === grid.weeks.length - 1 ? '' : '1px solid var(--a-line)' }}>
                {wk.map((cell, ci) => {
                  const ss = (byDate[toDateStr(cell.date)] || [])
                  return (
                    <div key={ci} onClick={() => onPickDay(cell.date)}
                      style={{ minHeight: 48, borderLeft: ci === 0 ? '' : '1px solid var(--a-line)', padding: '4px 2px 5px', textAlign: 'center', cursor: 'pointer', opacity: cell.inMonth ? 1 : 0.35, background: cell.today ? 'rgba(176, 92, 60, 0.08)' : 'transparent' }}>
                      <div style={{ fontSize: 11.5, fontWeight: cell.today ? 700 : 500, color: cell.today ? 'var(--a-clay)' : 'var(--a-ink2)', fontVariantNumeric: 'tabular-nums' }}>{cell.num}</div>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 3, minHeight: 6 }}>
                        {ss.slice(0, 3).map((s, i) => (
                          <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: s.status === 'open' ? 'transparent' : colorFor(s.house), border: s.status === 'open' ? `1px solid ${colorFor(s.house)}` : 'none' }} />
                        ))}
                        {ss.length > 3 && <span style={{ fontSize: 8, color: 'var(--a-ink3)', fontWeight: 700 }}>+{ss.length - 3}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="sched" />
    </div>
  )
}

function ShiftModal({ user, houses, defaultDate, defaultHouseId, editShift, timeOff = [], weekShifts = [], onClose, onSaved, onDeleted }) {
  const hourToTime = (h) => {
    const total = Math.round((Number(h) || 0) * 60)
    const hh = Math.floor(total / 60) % 24, mm = total % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  const initialHouse = editShift
    ? (houses.find(h => h.slug === editShift.house)?.id || houses[0]?.id || '')
    : (defaultHouseId || user?.houseId || houses[0]?.id || '')

  const [personName, setPersonName] = useState(editShift?.person || '')
  const [role, setRole] = useState(editShift?.role || 'DSP')
  const [date, setDate] = useState(editShift?.date || defaultDate || toDateStr(new Date()))
  const [startTime, setStartTime] = useState(editShift ? hourToTime(editShift.start) : '07:00')
  const [endTime, setEndTime] = useState(editShift ? hourToTime(editShift.end) : '15:00')
  const [houseId, setHouseId] = useState(initialHouse)
  const [note, setNote] = useState(editShift?.note || '')
  const [requiredCert, setRequiredCert] = useState(editShift?.requiredCert || '')
  const [repeatDays, setRepeatDays] = useState([])
  const [weeks, setWeeks] = useState(4)
  const [staff, setStaff] = useState([])
  const [saving, setSaving] = useState(false)

  const toggleDay = (d) => setRepeatDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  useEffect(() => {
    if (!user?.orgId || !houseId) { setStaff([]); return }
    let active = true
    fetchStaff(user.orgId, houseId).then(data => { if (active) setStaff(data) })
    return () => { active = false }
  }, [user?.orgId, houseId])

  const timeToHour = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60 }
  const sH = timeToHour(startTime), eH = timeToHour(endTime)
  const dur = Math.round((eH - sH) * 10) / 10
  const repeatCount = editShift ? 1 : expandRepeatDates(date, repeatDays, weeks).length

  // Scheduler-safety: warn (don't block) if this assignment lands on approved
  // leave or double-books the same person on the same day.
  const candidateStaff = staff.find(s => s.name.trim().toLowerCase() === personName.trim().toLowerCase()) || null
  const candidateStaffId = candidateStaff?.id || null
  const trimmedName = personName.trim()

  // Cert gate: when this shift requires a cert, check the typed candidate's
  // matching cert. Warn (don't block) if it's missing or expired/expiring.
  const certMatch = requiredCert ? matchingCert(candidateStaff?.certs, requiredCert) : null
  const certState = requiredCert ? certStatus(certMatch?.expires) : null
  // rank: 0 valid · 1 no date · 2 expiring · 3 expired. Missing cert entirely also warns.
  const certBlocked = !!requiredCert && !!trimmedName && (!certMatch || certState.rank >= 2)
  const onLeave = trimmedName ? approvedLeaveOn(timeOff, { staffId: candidateStaffId, name: trimmedName, dateStr: date }) : []
  const overlap = (trimmedName && dur > 0)
    ? findOverlap(weekShifts, { staffId: candidateStaffId, name: trimmedName, dateStr: date, start: sH, end: eH, exceptId: editShift?.id })
    : null

  const submit = async (e) => {
    e.preventDefault()
    if (!personName.trim() || !houseId || !user?.orgId || saving || dur <= 0) return
    setSaving(true)
    // Link the shift to a real staff member when the typed name matches one, so
    // that worker's app can reliably flag "your shift".
    const staffId = staff.find(s => s.name.trim().toLowerCase() === personName.trim().toLowerCase())?.id || null
    if (editShift) {
      await updateShift(editShift.id, { personName: personName.trim(), staffId, role, startHour: sH, endHour: eH, date, note: note.trim(), requiredCert: requiredCert || null })
    } else {
      const dates = expandRepeatDates(date, repeatDays, weeks)
      for (const d of dates) {
        await addShift(user.orgId, houseId, { personName: personName.trim(), staffId, role, startHour: sH, endHour: eH, date: d, note: note.trim(), requiredCert: requiredCert || null })
      }
    }
    setSaving(false)
    onSaved()
  }

  const remove = async () => {
    if (!editShift || saving) return
    setSaving(true)
    await deleteShift(editShift.id)
    setSaving(false)
    onDeleted()
  }

  const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }
  const canSave = personName.trim() && !saving && dur > 0

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={editShift ? 'Edit shift' : 'Add shift'} style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="serif" style={{ fontSize: 22 }}>{editShift ? 'Edit shift' : 'Add shift'}</div>
          {editShift && <button type="button" onClick={remove} style={{ border: 0, background: 'transparent', color: '#a93a25', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Delete</button>}
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SuggestInput autoFocus options={staff.map(s => s.name)} value={personName} onChange={setPersonName}
            placeholder={staff.length ? 'Staff member name' : 'Type a name (or add staff first)'}
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          {requiredCert && trimmedName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -4, paddingLeft: 2, fontSize: 11.5, color: 'var(--a-ink3)' }}>
              <span>{requiredCert}:</span>
              {certBlocked
                ? <span style={{ fontSize: 10, fontWeight: 700, color: '#a93a25', background: '#fadcd7', padding: '2px 8px', borderRadius: 999 }}>{certMatch ? `cert ${certState.rank >= 3 ? 'expired' : certState.label.toLowerCase()}` : 'cert missing'}</span>
                : <span style={{ fontSize: 10, fontWeight: 700, color: '#3f604d', background: '#dee6df', padding: '2px 8px', borderRadius: 999 }}>cert valid</span>}
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 4, paddingLeft: 2 }}>Day</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 4, paddingLeft: 2 }}>Start time</div>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 4, paddingLeft: 2 }}>End time</div>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: dur > 0 ? 'var(--a-ink2)' : 'var(--a-clay)', background: 'var(--a-paper)', borderRadius: 8, padding: '8px 12px' }}>
            {dur > 0 ? <><strong>{hourLabel(sH)}</strong> → <strong>{hourLabel(eH)}</strong> · {dur}h</> : 'End time must be after start time'}
          </div>
          {onLeave.length > 0 && (
            <div style={{ fontSize: 12.5, color: '#a93a25', background: 'rgba(176,92,60,0.08)', border: '1px solid #e3b6ad', borderRadius: 8, padding: '8px 12px', lineHeight: 1.35 }}>
              <strong>On approved leave.</strong> {trimmedName} has approved {onLeave[0].kind} time off on this day. Assigning anyway will double-count them.
            </div>
          )}
          {overlap && (
            <div style={{ fontSize: 12.5, color: '#b9892f', background: 'rgba(185,137,47,0.08)', border: '1px solid #e6d4a8', borderRadius: 8, padding: '8px 12px', lineHeight: 1.35 }}>
              <strong>Already booked</strong> {fmtTime(overlap.start)}–{fmtTime(overlap.end)}{(houses.find(h => h.slug === overlap.house || h.id === overlap.house)?.name) ? ` at ${houses.find(h => h.slug === overlap.house || h.id === overlap.house).name}` : ''} this day. This shift overlaps it.
            </div>
          )}
          <select value={role} onChange={e => setRole(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }}>
            {['DSP', 'Lead', 'Mgr', 'PT', 'Awake OT'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <div>
            <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 4, paddingLeft: 2 }}>Required certification (optional)</div>
            <select value={requiredCert} onChange={e => setRequiredCert(e.target.value)}
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }}>
              <option value="">No cert required</option>
              {SHIFT_CERTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {certBlocked && (
            <div style={{ fontSize: 12.5, color: '#a93a25', background: 'rgba(176,92,60,0.08)', border: '1px solid #e3b6ad', borderRadius: 8, padding: '8px 12px', lineHeight: 1.35 }}>
              {!certMatch
                ? <><strong>Missing required cert.</strong> {trimmedName} has no <strong>{requiredCert}</strong> on file. This shift requires it — assign anyway only if you've verified coverage.</>
                : <><strong>{requiredCert} {certState.rank >= 3 ? 'expired' : 'expiring'}.</strong> {trimmedName}’s {requiredCert} is {certState.label.toLowerCase()}. This shift requires an active cert.</>}
            </div>
          )}
          {houses.length > 1 && (
            <select value={houseId} onChange={e => setHouseId(e.target.value)} disabled={!!editShift}
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', opacity: editShift ? 0.7 : 1 }}>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional) — e.g. cover lunch"
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          {!editShift && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 5, paddingLeft: 2 }}>Repeat</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {WEEKDAYS.map(([lbl, d]) => {
                  const on = repeatDays.includes(d)
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? 'var(--a-ink)' : 'var(--a-card)', color: on ? 'var(--a-card)' : 'var(--a-ink2)', border: on ? 0 : '1px solid var(--a-line)' }}>{lbl}</button>
                  )
                })}
              </div>
              {repeatDays.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5, color: 'var(--a-ink2)' }}>
                  <span>for</span>
                  <input type="number" min={1} max={26} value={weeks} onChange={e => setWeeks(Math.max(1, Math.min(26, Number(e.target.value) || 1)))}
                    style={{ ...inputStyle, width: 60, padding: '6px 8px' }} />
                  <span>weeks → <strong>{repeatCount}</strong> shift{repeatCount === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
          )}
          <button type="submit" disabled={!canSave}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5 }}>
            {saving ? 'Saving…' : editShift ? 'Save changes' : repeatCount > 1 ? `Add ${repeatCount} shifts` : 'Add shift'}
          </button>
        </form>
      </div>
    </div>
  )
}

// DSP-facing "Claim shift" sheet for an open (unfilled) shift in their house.
function ClaimSheet({ shift, house, busy, onClaim, onClose }) {
  const color = house?.color || 'var(--a-clay)'
  const dateLabel = fmtDayLabel(new Date(shift.date + 'T12:00:00'))
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
      <div role="dialog" aria-modal="true" aria-label="Claim this shift" onClick={e => e.stopPropagation()} style={{ background: 'var(--a-card)', width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '20px 22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color, border: `1.5px dashed ${color}`, padding: '2px 8px', borderRadius: 999 }}>Open shift</span>
        </div>
        <div className="serif" style={{ fontSize: 24, letterSpacing: '-0.02em', marginTop: 6 }}>Claim this shift?</div>
        <div style={{ marginTop: 12, background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-ink)' }}>{house?.name || shift.role}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 6 }}>{dateLabel} · {hourLabel(shift.start)}–{hourLabel(shift.end)}</div>
          <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 2 }}>{shift.role}{shift.note ? ` · “${shift.note}”` : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} disabled={busy} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid var(--a-line)', background: 'var(--a-card)', color: 'var(--a-ink2)', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Geist' }}>Cancel</button>
          <button onClick={onClaim} disabled={busy} style={{ flex: 2, padding: '13px 0', borderRadius: 12, border: 0, background: 'var(--a-ink)', color: 'var(--a-card)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Geist' }}>{busy ? 'Claiming…' : 'Claim shift'}</button>
        </div>
      </div>
    </div>
  )
}

export function ScreenA_ScheduleDay({ user, employee = false, houses = [] }) {
  const [view, setView] = useState('day')
  const [houseFilter, setHouseFilter] = useState('all')
  const [weekShifts, setWeekShifts] = useState([])   // holds the visible range (week, or month grid)
  const [timeOff, setTimeOff] = useState([])         // approved time-off rows for safety checks
  const [houseList, setHouseList] = useState([])   // real DB houses: { id: UUID, slug, name, color, short }
  const [modal, setModal] = useState(null)         // null | { mode:'add' } | { mode:'edit', shift }
  const [anchorDate, setAnchorDate] = useState(new Date())   // the focused day/week/month
  const nowFrac = useNowMinute()

  const week = buildWeek(anchorDate)
  const selectedDate = toDateStr(anchorDate)
  const weekDates = week.map(d => toDateStr(d.date))

  const isSupervisor = user?.role === 'supervisor'

  // A shift belongs to the signed-in worker if it's linked to their staff row
  // (new shifts) or, as a fallback, the name matches (older/free-text shifts).
  const myStaffId = user?.staffId
  const myName = (user?.name || '').trim().toLowerCase()
  const isMine = (s) => employee && s.status !== 'open'
    && ((myStaffId && s.staffId === myStaffId) || (!!myName && (s.person || '').trim().toLowerCase() === myName))

  // Use the `houses` prop (real DB houses, normalized) instead of the HOUSES constant.
  const displayHouses = isSupervisor ? houses : houses.filter(h => h.id === user?.houseSlug)

  // Picker options use raw DB houses (UUID ids) so addShift inserts a valid house_id.
  const pickerHouses = isSupervisor ? houseList : houseList.filter(h => h.slug === user?.houseSlug)

  // Fetch the shifts the current view needs: the visible week, or — in month
  // view — the whole visible month grid.
  const [rangeStart, rangeEnd] = view === 'month'
    ? (() => { const g = buildMonthGrid(anchorDate); return [g.first, g.last] })()
    : [week[0].date, week[6].date]
  const rangeKey = `${toDateStr(rangeStart)}:${toDateStr(rangeEnd)}`

  const reload = useCallback(() => {
    if (!user?.orgId) return
    const houseId = isSupervisor ? null : (user.houseId || null)
    fetchShiftsWeek(user.orgId, houseId, toDateStr(rangeStart), toDateStr(rangeEnd)).then(setWeekShifts)
    fetchHouses(user.orgId).then(setHouseList)
    // Approved time-off so the assignment flow can warn on leave overlaps.
    fetchTimeOffRequests(user.orgId, { status: 'approved' }).then(setTimeOff).catch(() => setTimeOff([]))
  }, [user?.orgId, user?.houseId, isSupervisor, rangeKey])

  useEffect(() => { reload() }, [reload])

  const closeAndReload = () => { setModal(null); reload() }

  // A DSP (employee) can CLAIM an open shift in their house. Optimistically flip
  // the shift to theirs, then persist + refresh.
  const isStaff = user?.role === 'staff'
  const [claiming, setClaiming] = useState(false)
  const claimOpenShift = async (shift) => {
    if (claiming) return
    setClaiming(true)
    const staffId = user?.staffId || `demo-${user?.role}`
    setWeekShifts(prev => prev.map(s => s.id === shift.id
      ? { ...s, status: 'scheduled', staffId, person: user?.name || s.person } : s))
    setModal(null)
    try { await claimShift(shift.id, { staffId, staffName: user?.name }) } catch { /* ignore */ }
    setClaiming(false)
    reload()
  }
  // When a staffer taps a shift: open the claim sheet for an open shift, else edit.
  const onShiftTap = (s) => {
    if (isStaff && s.status === 'open') setModal({ mode: 'claim', shift: s })
    else setModal({ mode: 'edit', shift: s })
  }

  // Navigation: a week step for day/week, a month step for month; Today resets.
  const step = view === 'month' ? (n) => setAnchorDate(d => addMonths(d, n)) : (n) => setAnchorDate(d => addDays(d, n * 7))
  const nav = { onPrev: () => step(-1), onNext: () => step(1), onToday: () => setAnchorDate(new Date()) }
  const pickDay = (date) => { setAnchorDate(date); setView('day') }

  // Publish gate: a DSP (role 'staff') must only see PUBLISHED shifts — draft
  // (unpublished) shifts aren't final and shouldn't show as if they were.
  // Supervisors/managers always see the full draft. Open shifts stay visible so
  // they remain claimable.
  const publishGate = (s) => !isStaff || s.status === 'open' || !!s.publishedAt || isMine(s)
  const schedulePublished = !isStaff || weekShifts.every(s => s.status === 'open' || !!s.publishedAt)
  const visibleWeekShifts = isStaff ? weekShifts.filter(publishGate) : weekShifts

  if (view === 'week') return <ScreenA_ScheduleWeek setView={setView} houses={displayHouses} week={week} weekShifts={visibleWeekShifts} weekDates={weekDates} {...nav} />
  if (view === 'month') return <ScreenA_ScheduleMonth anchorDate={anchorDate} houses={displayHouses} shifts={visibleWeekShifts} setView={setView} onPickDay={pickDay} {...nav} />

  // Each day shows ONLY its own shifts (filtered from the week by date).
  const dayShifts = visibleWeekShifts.filter(s => s.date === selectedDate)
  const visibleHouses = houseFilter === 'all' ? displayHouses : displayHouses.filter(h => h.id === houseFilter)
  const filteredShifts = houseFilter === 'all' ? dayShifts : dayShifts.filter(s => s.house === houseFilter)

  const canAddShift = user?.role === 'supervisor' || user?.role === 'manager'

  // DSP view: this worker's own shifts in the loaded range, soonest first.
  const todayStr = toDateStr(new Date())
  const myUpcoming = employee
    ? visibleWeekShifts.filter(isMine)
        .filter(s => s.date > todayStr || (s.date === todayStr && s.end >= nowFrac))
        .sort((a, b) => a.date === b.date ? a.start - b.start : a.date.localeCompare(b.date))
    : []
  const myNext = myUpcoming[0]
  const myDayCount = employee ? dayShifts.filter(isMine).length : 0

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 6px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Schedule</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)' }}>
              {fmtDayLabel(anchorDate)} · {dayShifts.length} shifts{employee && myDayCount > 0 && <span style={{ color: 'var(--a-sage)', fontWeight: 600 }}> · {myDayCount} yours</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <ViewToggle view={view} setView={setView} />
              {canAddShift && (
                <button onClick={() => setModal({ mode: 'add' })} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <IconPlus size={16} sw={2.2} />
                </button>
              )}
            </div>
          </div>
        </div>

        {employee && myNext && (
          <div style={{ padding: '4px 22px 10px' }}>
            <div style={{ background: 'var(--a-sage)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85 }}>Your<br />next</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {myNext.date === todayStr ? 'Today' : fmtDayLabel(new Date(myNext.date + 'T12:00:00'))} · {hourLabel(myNext.start)}–{hourLabel(myNext.end)}
                </div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>
                  {(displayHouses.find(h => h.id === myNext.house)?.name) || myNext.role}{myNext.note ? ` · “${myNext.note}”` : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {user?.role === 'supervisor' && (
          <div style={{ padding: '4px 22px 10px' }}>
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconKey size={13} color="var(--a-sage)" sw={1.8} />
              <span style={{ fontSize: 11, color: 'var(--a-ink2)', flex: 1 }}>You see <strong>all houses</strong>. Staff only see their own shifts.</span>
            </div>
          </div>
        )}

        {isStaff && (
          <div style={{ padding: '4px 22px 10px' }}>
            <div style={{ background: 'var(--a-card)', border: `1px solid ${schedulePublished ? 'var(--a-line)' : '#e6d4a8'}`, borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: schedulePublished ? 'var(--a-sage)' : '#b9892f' }} />
              <span style={{ fontSize: 11, color: 'var(--a-ink2)', flex: 1 }}>
                {schedulePublished
                  ? <><strong style={{ color: 'var(--a-sage)' }}>Published.</strong> This week’s schedule is final.</>
                  : <><strong style={{ color: '#b9892f' }}>Schedule not yet published.</strong> Your manager is still finalizing this week — shifts may change.</>}
              </span>
            </div>
          </div>
        )}

        <div style={{ padding: '0 22px 8px' }}><ScheduleNav {...nav} /></div>
        <DayStrip week={week} selectedDate={selectedDate} onPick={setAnchorDate} />
        <HouseFilterChips houses={displayHouses} active={houseFilter} setActive={setHouseFilter} />

        <div style={{ padding: '4px 22px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--a-clay)' }} />
          <span style={{ fontSize: 11, color: 'var(--a-clay)', fontWeight: 600 }}>Now · {fmtNow(nowFrac)}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {visibleHouses.slice(0, 4).map((h, i) => (
              <span key={h.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {i > 0 && <span style={{ color: 'var(--a-ink3)', fontSize: 10 }}>·</span>}
                <span style={{ width: 7, height: 7, borderRadius: 2, background: h.color }} />
                <span style={{ fontSize: 9.5, fontWeight: 700, color: h.color, letterSpacing: '0.04em' }}>{h.short}</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 14px 24px' }}>
          <TimeGrid shifts={filteredShifts} houses={visibleHouses} nowFrac={nowFrac} isMine={isMine} onShiftClick={onShiftTap} />
        </div>
      </div>
      <TabBar active="sched" />

      {modal && modal.mode === 'claim' && (
        <ClaimSheet
          shift={modal.shift}
          house={displayHouses.find(h => h.id === modal.shift.house)}
          busy={claiming}
          onClaim={() => claimOpenShift(modal.shift)}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal.mode !== 'claim' && (
        <ShiftModal
          user={user}
          houses={pickerHouses}
          editShift={modal.mode === 'edit' ? modal.shift : null}
          defaultDate={selectedDate}
          defaultHouseId={houseFilter !== 'all' ? (pickerHouses.find(h => h.id === houseFilter || h.slug === houseFilter)?.id) : undefined}
          timeOff={timeOff}
          weekShifts={weekShifts}
          onClose={() => setModal(null)}
          onSaved={closeAndReload}
          onDeleted={closeAndReload}
        />
      )}
    </div>
  )
}
