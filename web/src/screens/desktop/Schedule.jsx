import { useState, useEffect, useCallback } from 'react'
import { HOUSES } from '../../data/constants'
import { buildWeek, fmtDayLabel, fmtNow, fmtTime, expandRepeatDates } from '../../lib/utils'

const WEEKDAYS = [['Su', 0], ['Mo', 1], ['Tu', 2], ['We', 3], ['Th', 4], ['Fr', 5], ['Sa', 6]]
import { useNowMinute } from '../../hooks/useNowMinute'
import { fetchShiftsWeek, addShift, updateShift, deleteShift, fetchStaff, fetchTimeOffRequests } from '../../lib/db'
import { approvedLeaveOn, findOverlap } from '../../lib/scheduleSafety'
import { DTopBar, dBtnGhost, dBtnSolid } from './Desktop'
import { IconChev, IconKey, IconPlus, IconFilter, IconAlert, IconCheck, IconX } from '../../components/icons'
import { SuggestInput } from '../../components/SuggestInput'
import { ScheduleWeekTools, WeekSummaryFooter } from './ScheduleTools'
import { WeekGrid } from './WeekGrid'

const DAY_START = 0
const DAY_END = 24

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d }
const addMonths = (date, n) => { const d = new Date(date); d.setMonth(d.getMonth() + n); return d }

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

// "7:00 AM" style label from a decimal hour — used so AM/PM is always explicit.
function hourLabel(h) {
  const total = Math.round(h * 60)
  let hh = Math.floor(total / 60) % 24
  const mm = total % 60
  const ap = hh < 12 ? 'AM' : 'PM'
  const h12 = hh % 12 || 12
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`
}
const DSK_HOUR_PX = 56

function fmtHourLong(h) {
  const w = ((h % 24) + 24) % 24
  if (w === 0) return '12 AM'
  if (w === 12) return '12 PM'
  return w < 12 ? `${w} AM` : `${w - 12} PM`
}

function ViewToggleDesktop({ view, setView }) {
  return (
    <div style={{ display: 'flex', background: 'var(--a-paper)', borderRadius: 999, padding: 3, border: '1px solid var(--a-line)' }}>
      {['day', 'week', 'month'].map(v => (
        <button key={v} onClick={() => setView(v)} style={{
          border: 0,
          background: v === view ? 'var(--a-ink)' : 'transparent',
          color: v === view ? 'var(--a-card)' : 'var(--a-ink2)',
          padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'Geist', textTransform: 'capitalize',
        }}>{v}</button>
      ))}
    </div>
  )
}

function DskHouseTab({ active, onClick, color, short, label, sub }) {
  const activeColor = color || 'var(--a-ink)'
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
      background: active ? activeColor : 'var(--a-card)',
      color: active ? '#fff' : 'var(--a-ink)',
      border: active ? `1px solid ${activeColor}` : '1px solid var(--a-line)',
      fontFamily: 'Geist', textAlign: 'left',
    }}>
      {short ? (
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: active ? 'rgba(255,255,255,0.18)' : `${color}1f`, color: active ? '#fff' : color, padding: '4px 7px', borderRadius: 4 }}>{short}</span>
      ) : (
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: active ? 'rgba(255,255,255,0.18)' : 'var(--a-paper)', color: active ? '#fff' : 'var(--a-ink2)', padding: '4px 7px', borderRadius: 4 }}>ALL</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 10.5, opacity: active ? 0.85 : 0.6, marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  )
}

// Lane layout so overlapping shifts sit side-by-side instead of stacking.
function layoutShifts(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end)
  const clusters = []
  let cur = null
  for (const s of sorted) {
    if (cur && s.start < cur.maxEnd) { cur.items.push(s); cur.maxEnd = Math.max(cur.maxEnd, s.end) }
    else { cur = { items: [s], maxEnd: s.end }; clusters.push(cur) }
  }
  const out = []
  for (const cl of clusters) {
    const laneEnds = []
    for (const s of cl.items) {
      let lane = laneEnds.findIndex(end => end <= s.start)
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(s.end) } else { laneEnds[lane] = s.end }
      s._lane = lane
    }
    for (const s of cl.items) out.push({ ...s, _lanes: laneEnds.length })
  }
  return out
}

function DskShiftBlock({ shift, houseColor, onClick }) {
  const { start, end, person, role, status } = shift
  const top = (start - DAY_START) * DSK_HOUR_PX
  const height = (end - start) * DSK_HOUR_PX
  const open = status === 'open'
  const late = status === 'late'
  const swap = status === 'swap'
  const here = status === 'here'
  const bg = open ? 'transparent' : houseColor
  const border = open ? `1.5px dashed ${houseColor}` : late ? `1.5px solid #a93a25` : 'none'
  const lanes = shift._lanes || 1
  const lane = shift._lane || 0
  const wPct = 100 / lanes
  return (
    <div onClick={onClick} title="Click to edit" style={{
      position: 'absolute', top: top + 3, left: `calc(${lane * wPct}% + 6px)`, width: `calc(${wPct}% - 12px)`, height: height - 6,
      background: bg, border, borderRadius: 8,
      padding: '8px 12px', color: open ? houseColor : '#fff',
      display: 'flex', flexDirection: 'column', cursor: 'pointer',
      boxShadow: !open ? '0 1px 0 rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.04)' : 'none',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 4 }}>
        <span className="tnum" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', opacity: open ? 1 : 0.92 }}>
          {fmtTime(start)} – {fmtTime(end)}
        </span>
        <span style={{ fontSize: 9, opacity: open ? 0.85 : 0.75, fontWeight: 600 }}>{Math.round((end - start) * 10) / 10}h</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15, color: open ? houseColor : '#fff' }}>{person}</div>
      <div style={{ fontSize: 11, opacity: open ? 0.85 : 0.78, marginTop: 2, fontWeight: 500 }}>{role}</div>
      {shift.note && height > 64 && (
        <div style={{ fontSize: 10.5, opacity: open ? 0.85 : 0.82, marginTop: 4, lineHeight: 1.3, fontStyle: 'italic', overflow: 'hidden' }}>“{shift.note}”</div>
      )}
      {(late || swap || here || open) && (
        <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 4 }}>
          {here && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.22)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block' }} /> CLOCKED IN</span>}
          {late && <span style={{ fontSize: 9, fontWeight: 700, color: '#a93a25', background: 'rgba(255,255,255,0.92)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>LATE · 12m</span>}
          {swap && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.22)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>SWAP REQ</span>}
          {open && <span style={{ fontSize: 9, fontWeight: 700, color: houseColor, background: 'rgba(255,255,255,0.92)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>NEEDS FILL</span>}
        </div>
      )}
    </div>
  )
}

function DesktopTimeGrid({ shifts, houses = [], nowFrac = 9.8, onShiftClick }) {
  const hours = []
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h)
  const nowTop = (nowFrac - DAY_START) * DSK_HOUR_PX
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${houses.length}, 1fr)`, background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)' }}>
        <div style={{ padding: '12px 14px', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Hour</div>
        {houses.map(h => (
          <div key={h.id} style={{ padding: '12px 16px', borderLeft: '1px solid var(--a-line)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: h.color }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{h.branch} branch · mgr {h.manager}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${houses.length}, 1fr)`, position: 'relative' }}>
        <div style={{ background: 'var(--a-paper)', borderRight: '1px solid var(--a-line)' }}>
          {hours.map((h, i) => (
            <div key={i} style={{ height: DSK_HOUR_PX, position: 'relative', borderBottom: i === hours.length - 1 ? '' : '1px solid var(--a-line)' }}>
              <div style={{ position: 'absolute', top: i === 0 ? 4 : -8, right: 10, fontSize: 11, fontWeight: 600, color: 'var(--a-ink2)', background: 'var(--a-paper)', padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}>
                {fmtHourLong(h)}
              </div>
            </div>
          ))}
        </div>
        {houses.map((h) => (
          <div key={h.id} style={{ position: 'relative', borderLeft: '1px solid var(--a-line)' }}>
            {hours.map((hr, i) => (
              <div key={i} style={{
                height: DSK_HOUR_PX,
                borderBottom: i === hours.length - 1 ? '' : '1px solid var(--a-line)',
                background: i % 2 === 1 ? 'rgba(216, 204, 177, 0.06)' : 'transparent',
              }} />
            ))}
            {hours.slice(0, -1).map((hr, i) => (
              <div key={`half${i}`} style={{ position: 'absolute', top: i * DSK_HOUR_PX + DSK_HOUR_PX / 2, left: 0, right: 0, borderTop: '1px dashed var(--a-line)', opacity: 0.5 }} />
            ))}
            {layoutShifts(shifts.filter(s => s.house === h.id)).map((s, si) => (
              <DskShiftBlock key={s.id ?? si} shift={s} houseColor={h.color} onClick={() => onShiftClick?.(s)} />
            ))}
          </div>
        ))}
        <div style={{ position: 'absolute', left: 80, right: 0, top: nowTop, pointerEvents: 'none', borderTop: '1.5px solid var(--a-clay)', zIndex: 10 }}>
          <div style={{ position: 'absolute', left: -34, top: -10, background: 'var(--a-clay)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>
            {fmtNow(nowFrac)}
          </div>
          <div style={{ position: 'absolute', left: -6, top: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--a-clay)' }} />
        </div>
      </div>
    </div>
  )
}

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function ScheduleRow({ house, weekShifts, weekDates, onShiftClick, onMoveShift, timeOff = [] }) {
  const [overDate, setOverDate] = useState(null)   // dateStr being dragged over (this house's row)
  const canDrag = !!onMoveShift
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', borderBottom: '1px solid var(--a-line)', minHeight: 86 }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderRight: '1px solid var(--a-line)' }}>
        <span style={{ width: 6, height: 26, background: house.color, borderRadius: 4 }} />
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{house.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{house.branch}</div>
        </div>
      </div>
      {weekDates.map((d, i) => {
        const dateStr = toDateStr(d.date)
        const dayShifts = weekShifts.filter(s => s.house === house.id && s.date === dateStr)
        const isOver = overDate === dateStr
        const dropProps = canDrag ? {
          onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overDate !== dateStr) setOverDate(dateStr) },
          onDragLeave: () => setOverDate(o => (o === dateStr ? null : o)),
          onDrop: (e) => {
            e.preventDefault(); setOverDate(null)
            try {
              const data = JSON.parse(e.dataTransfer.getData('text/plain'))
              // Only move within the same house (a shift can't change house here).
              if (data && data.house === house.id && data.date !== dateStr) onMoveShift(data.id, dateStr)
            } catch { /* ignore */ }
          },
        } : {}
        return (
          <div key={i} {...dropProps} style={{ padding: '8px 6px', borderLeft: i === 0 ? '' : '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', gap: 4, background: isOver ? `${house.color}1f` : 'transparent', outline: isOver ? `1.5px dashed ${house.color}` : 'none', outlineOffset: -2, transition: 'background 0.12s' }}>
            {dayShifts.length === 0 ? (
              <div style={{ color: 'var(--a-ink3)', fontSize: 11, padding: '4px 4px', opacity: 0.45 }}>—</div>
            ) : dayShifts.map((s, j) => {
              const open = s.status === 'open'
              // Approved-leave conflict: this person is on approved time off this day.
              const offLeave = !open && approvedLeaveOn(timeOff, { staffId: s.staffId, name: s.person, dateStr: dateStr }).length > 0
              return (
                <div key={s.id ?? j} draggable={canDrag}
                  onDragStart={canDrag ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', JSON.stringify({ id: s.id, house: s.house, date: s.date })) } : undefined}
                  onClick={() => onShiftClick?.(s)} title={canDrag ? (offLeave ? 'On approved leave this day · click to edit' : 'Click to edit · drag to move to another day') : 'Click to edit'}
                  style={{ position: 'relative', cursor: canDrag ? 'grab' : 'pointer', background: open ? 'transparent' : house.color, border: open ? `1.5px dashed ${house.color}` : offLeave ? '1.5px solid #a93a25' : 'none', color: open ? house.color : '#fff', borderRadius: 6, padding: '4px 7px', fontSize: 11, fontWeight: open ? 600 : 500 }}>
                  <div style={{ fontSize: 9.5, opacity: open ? 1 : 0.8, fontWeight: 600 }}>{fmtTime(s.start)}–{fmtTime(s.end)}</div>
                  <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{s.person}</div>
                  {offLeave && (
                    <div style={{ marginTop: 2, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', background: '#a93a25', display: 'inline-block', padding: '1px 5px', borderRadius: 3 }}>OFF · ON LEAVE</div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function DayScheduleView({ week, selectedDate, onPickDay, onPrev, onNext, onToday, houseFilter, setHouseFilter, shifts, houses = [], isManager = false, onShiftClick }) {
  const nowFrac = useNowMinute()
  const visibleHouses = houseFilter === 'all' ? houses : houses.filter(h => h.id === houseFilter)
  const filteredShifts = houseFilter === 'all' ? shifts : shifts.filter(s => s.house === houseFilter)
  const selDay = week.find(d => toDateStr(d.date) === selectedDate)?.date || week[0].date

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={onPrev} title="Previous week" style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
        <button onClick={onToday} style={{ ...dBtnGhost, padding: '6px 12px', fontSize: 12 }}>Today</button>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {week.map((d, i) => {
            const sel = toDateStr(d.date) === selectedDate
            return (
              <button key={i} onClick={() => onPickDay(d.date)} style={{
                flex: 1, padding: '10px 6px', textAlign: 'center', borderRadius: 10,
                background: sel ? 'var(--a-ink)' : 'transparent',
                color: sel ? 'var(--a-card)' : 'var(--a-ink)',
                border: sel ? '0' : '1px solid var(--a-line)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', fontFamily: 'Geist',
              }}>
                <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.dow}</span>
                <span className="tnum" style={{ fontSize: 18, fontWeight: 700 }}>{d.num}</span>
                {d.today && !sel && <span style={{ fontSize: 9, color: 'var(--a-clay)', fontWeight: 600 }}>today</span>}
              </button>
            )
          })}
        </div>
        <button onClick={onNext} title="Next week" style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} /></button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
        {!isManager && (
          <DskHouseTab active={houseFilter === 'all'} onClick={() => setHouseFilter('all')} label="All houses" sub={`${shifts.length} shifts`} />
        )}
        {houses.map(h => {
          const count = shifts.filter(s => s.house === h.id).length
          return (
            <DskHouseTab key={h.id} active={houseFilter === h.id} onClick={() => setHouseFilter(h.id)}
              color={h.color} short={h.short} label={h.name} sub={`${count} shifts`} />
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{fmtDayLabel(selDay)}</span>
        <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>
          {`${filteredShifts.length} shifts · `}
          <strong style={{ color: 'var(--a-clay)' }}>{filteredShifts.filter(s => s.status === 'open').length} open</strong>
          {filteredShifts.some(s => s.status === 'late') && <> · 1 late</>}
          {filteredShifts.some(s => s.status === 'swap') && <> · 1 swap</>}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>Scale: 1 hr</span>
      </div>

      <DesktopTimeGrid shifts={filteredShifts} houses={visibleHouses} nowFrac={nowFrac} onShiftClick={onShiftClick} />
    </>
  )
}

function WeekScheduleView({ week, houses = [], shifts = [], onShiftClick, onAddShift, onPrev, onNext, onToday, user, onChanged, timeOff = [] }) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const weekLabel = `${MONTHS[week[0].date.getMonth()]} ${week[0].num} – ${MONTHS[week[6].date.getMonth()]} ${week[6].num}`
  const openCount = shifts.filter(s => s.status === 'open').length
  const weekDates = week.map(d => toDateStr(d.date))
  const isAdmin = user?.role === 'supervisor' || user?.role === 'manager'

  // Coverage: house-days with no shift this week (a real staffing gap for a
  // 24/7 home). Only meaningful once a schedule exists for the week.
  const gaps = []
  if (shifts.length > 0) {
    for (const h of houses) {
      for (let i = 0; i < weekDates.length; i++) {
        if (!shifts.some(s => s.house === h.id && s.date === weekDates[i])) {
          gaps.push({ short: h.short, dow: week[i].dow, num: week[i].num })
        }
      }
    }
  }
  const totalCells = houses.length * 7
  const staffed = totalCells - gaps.length

  // Drag-and-drop: move a shift to a different day (and optionally reassign it
  // to another staffer) — `patch` is { date, staffId?, personName? }.
  const moveShift = async (id, patch) => { await updateShift(id, patch); onChanged?.() }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={onPrev} title="Previous week" style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
        <button onClick={onToday} style={{ ...dBtnGhost, padding: '6px 12px', fontSize: 12 }}>Today</button>
        <button onClick={onNext} title="Next week" style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} /></button>
        <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{weekLabel}</span>
        {openCount > 0 && <span style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Open shifts: <strong style={{ color: 'var(--a-clay)' }}>{openCount}</strong></span>}
        <div style={{ flex: 1 }} />
        {isAdmin && <ScheduleWeekTools user={user} houses={houses} weekDates={weekDates} shifts={shifts} onChanged={onChanged} />}
      </div>
      {isAdmin && shifts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '9px 14px', background: gaps.length ? 'rgba(176,92,60,0.06)' : 'var(--a-card)', border: `1px solid ${gaps.length ? '#e3b6ad' : 'var(--a-line)'}`, borderRadius: 12, fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--a-ink)' }}>Coverage</span>
          <span style={{ color: 'var(--a-ink2)' }}><strong className="tnum">{staffed}</strong>/<span className="tnum">{totalCells}</span> house-days staffed</span>
          {gaps.length > 0 ? (
            <span style={{ color: 'var(--a-clay)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <IconAlert size={14} /> <strong className="tnum">{gaps.length}</strong> gap{gaps.length === 1 ? '' : 's'}
              <span style={{ color: 'var(--a-ink3)', fontWeight: 400 }}> · {gaps.slice(0, 6).map(g => `${g.short} ${g.dow} ${g.num}`).join(', ')}{gaps.length > 6 ? ` +${gaps.length - 6} more` : ''}</span>
            </span>
          ) : (
            <span style={{ color: 'var(--a-sage)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconCheck size={14} /> Every house covered all week</span>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>Drag a shift to move it to another day</span>
        </div>
      )}
      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
        <WeekGrid
          user={user} houses={houses} week={week} shifts={shifts} timeOff={timeOff}
          isAdmin={isAdmin}
          onShiftClick={onShiftClick}
          onAddShift={onAddShift}
          onMoveShift={isAdmin ? moveShift : undefined}
        />
        <WeekSummaryFooter shifts={shifts} weekDates={weekDates} />
      </div>
    </>
  )
}

function MonthScheduleView({ anchorDate, shifts = [], houses = [], onPrev, onNext, onToday, onPickDay }) {
  const grid = buildMonthGrid(anchorDate)
  const colorFor = (slug) => houses.find(h => h.id === slug)?.color || 'var(--a-ink3)'
  const byDate = {}
  for (const s of shifts) (byDate[s.date] ||= []).push(s)
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={onPrev} title="Previous month" style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
        <button onClick={onToday} style={{ ...dBtnGhost, padding: '6px 12px', fontSize: 12 }}>Today</button>
        <button onClick={onNext} title="Next month" style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} /></button>
        <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{grid.label}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>{shifts.length} shifts this month</span>
      </div>
      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)' }}>
          {DOW.map(d => <div key={d} style={{ padding: '9px 0', textAlign: 'center', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{d}</div>)}
        </div>
        {grid.weeks.map((wk, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi === grid.weeks.length - 1 ? '' : '1px solid var(--a-line)' }}>
            {wk.map((cell, ci) => {
              const ds = toDateStr(cell.date)
              const dayShifts = (byDate[ds] || []).slice().sort((a, b) => a.start - b.start)
              return (
                <div key={ci} onClick={() => onPickDay(cell.date)} title="Open this day"
                  style={{ minHeight: 104, borderLeft: ci === 0 ? '' : '1px solid var(--a-line)', padding: '6px 7px', cursor: 'pointer', background: cell.today ? 'rgba(176, 92, 60, 0.06)' : 'transparent', opacity: cell.inMonth ? 1 : 0.4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span className="tnum" style={{ fontSize: 12, fontWeight: cell.today ? 700 : 500, color: cell.today ? '#fff' : 'var(--a-ink2)', background: cell.today ? 'var(--a-clay)' : 'transparent', borderRadius: 999, minWidth: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{cell.num}</span>
                  </div>
                  {dayShifts.slice(0, 3).map((s, si) => {
                    const open = s.status === 'open'
                    return (
                      <div key={s.id ?? si} style={{ display: 'flex', alignItems: 'center', gap: 4, background: open ? 'transparent' : colorFor(s.house), border: open ? `1px dashed ${colorFor(s.house)}` : 'none', color: open ? colorFor(s.house) : '#fff', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600, lineHeight: 1.35, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {fmtTime(s.start)} {s.person}
                      </div>
                    )
                  })}
                  {dayShifts.length > 3 && <div style={{ fontSize: 9.5, color: 'var(--a-ink3)', fontWeight: 600, paddingLeft: 2 }}>+{dayShifts.length - 3} more</div>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

function ShiftModal({ user, houses, defaultHouseUuid, defaultDate, defaultStaffName = '', isManager, editShift, timeOff = [], weekShifts = [], onClose, onSaved, onDeleted }) {
  const hourToTime = (h) => {
    const total = Math.round((Number(h) || 0) * 60)
    const hh = Math.floor(total / 60) % 24, mm = total % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  const initialHouse = editShift
    ? (houses.find(h => h.id === editShift.house)?._uuid || houses[0]?._uuid || '')
    : isManager
      ? (user?.houseId || houses[0]?._uuid || '')
      : (defaultHouseUuid || houses[0]?._uuid || '')

  const [houseUuid, setHouseUuid] = useState(initialHouse)
  const [staff, setStaff] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [personName, setPersonName] = useState(editShift?.person || defaultStaffName || '')
  const [role, setRole] = useState(editShift?.role || 'DSP')
  const [date, setDate] = useState(editShift?.date || defaultDate || toDateStr(new Date()))
  const [startTime, setStartTime] = useState(editShift ? hourToTime(editShift.start) : '07:00')
  const [endTime, setEndTime] = useState(editShift ? hourToTime(editShift.end) : '15:00')
  const [note, setNote] = useState(editShift?.note || '')
  const [repeatDays, setRepeatDays] = useState([])   // weekday indexes; empty = no repeat
  const [weeks, setWeeks] = useState(4)
  const [saving, setSaving] = useState(false)

  const toggleDay = (d) => setRepeatDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  useEffect(() => {
    let cancelled = false
    if (!user?.orgId || !houseUuid) { setStaff([]); return }
    setStaffLoading(true)
    fetchStaff(user.orgId, houseUuid).then(data => {
      if (cancelled) return
      setStaff(data); setStaffLoading(false)
    })
    return () => { cancelled = true }
  }, [user?.orgId, houseUuid])

  const timeToHour = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60 }
  const sH = timeToHour(startTime), eH = timeToHour(endTime)
  const dur = Math.round((eH - sH) * 10) / 10
  const repeatCount = editShift ? 1 : expandRepeatDates(date, repeatDays, weeks).length

  // Scheduler-safety: warn (don't block) on approved leave or a same-day overlap.
  const candidateStaffId = staff.find(s => s.name.trim().toLowerCase() === personName.trim().toLowerCase())?.id || null
  const trimmedName = personName.trim()
  const onLeave = trimmedName ? approvedLeaveOn(timeOff, { staffId: candidateStaffId, name: trimmedName, dateStr: date }) : []
  const overlap = (trimmedName && dur > 0)
    ? findOverlap(weekShifts, { staffId: candidateStaffId, name: trimmedName, dateStr: date, start: sH, end: eH, exceptId: editShift?.id })
    : null

  const submit = async (e) => {
    e.preventDefault()
    if (!personName.trim() || !houseUuid || !user?.orgId || saving) return
    setSaving(true)
    if (editShift) {
      await updateShift(editShift.id, { personName: personName.trim(), role, startHour: sH, endHour: eH, date, note: note.trim() })
    } else {
      const dates = expandRepeatDates(date, repeatDays, weeks)
      for (const d of dates) {
        await addShift(user.orgId, houseUuid, { personName: personName.trim(), role, startHour: sH, endHour: eH, date: d, note: note.trim() })
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

  const fieldStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 11, color: 'var(--a-ink3)', marginBottom: 4, paddingLeft: 2 }
  const canSubmit = !!personName.trim() && !!houseUuid && !saving

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={editShift ? 'Edit shift' : 'Add shift'} style={{ width: 420, maxWidth: 'calc(100vw - 40px)', background: 'var(--a-bg)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '22px 24px 26px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{editShift ? 'Edit shift' : 'Add shift'}</div>
          <button onClick={onClose} aria-label="Close" style={{ border: 0, background: 'transparent', color: 'var(--a-ink3)', cursor: 'pointer', lineHeight: 1, fontFamily: 'Geist', display: 'inline-flex' }}><IconX size={20} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>House</div>
              <select value={houseUuid} onChange={e => setHouseUuid(e.target.value)} disabled={isManager || !!editShift} style={{ ...fieldStyle, opacity: (isManager || editShift) ? 0.7 : 1 }}>
                {houses.map(h => <option key={h._uuid} value={h._uuid}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Day</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
            </div>
          </div>
          <div>
            <div style={labelStyle}>Staff member</div>
            <SuggestInput options={staff.map(s => s.name)} value={personName} onChange={setPersonName}
              placeholder={staffLoading ? 'Loading…' : staff.length ? 'Pick or type a name' : 'Type a name (or add staff first)'}
              style={fieldStyle} />
          </div>
          <div>
            <div style={labelStyle}>Role</div>
            <select value={role} onChange={e => setRole(e.target.value)} style={fieldStyle}>
              {['DSP', 'Lead', 'Mgr', 'PT', 'Awake OT'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Start time</div>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <div style={labelStyle}>End time</div>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={fieldStyle} />
            </div>
          </div>
          {/* Always-clear AM/PM read-back so there's no 24h-vs-12h confusion */}
          <div style={{ fontSize: 12.5, color: dur > 0 ? 'var(--a-ink2)' : 'var(--a-clay)', background: 'var(--a-paper)', borderRadius: 8, padding: '8px 12px' }}>
            {dur > 0
              ? <><strong>{hourLabel(sH)}</strong> → <strong>{hourLabel(eH)}</strong> · {dur}h{eH > 24 ? ' (overnight)' : ''}</>
              : 'End time must be after start time'}
          </div>
          {onLeave.length > 0 && (
            <div style={{ fontSize: 12.5, color: '#a93a25', background: 'rgba(176,92,60,0.08)', border: '1px solid #e3b6ad', borderRadius: 8, padding: '8px 12px', lineHeight: 1.35 }}>
              <strong>On approved leave.</strong> {trimmedName} has approved {onLeave[0].kind} time off on this day. Assigning anyway will double-count them.
            </div>
          )}
          {overlap && (
            <div style={{ fontSize: 12.5, color: '#b9892f', background: 'rgba(185,137,47,0.08)', border: '1px solid #e6d4a8', borderRadius: 8, padding: '8px 12px', lineHeight: 1.35 }}>
              <strong>Already booked</strong> {fmtTime(overlap.start)}–{fmtTime(overlap.end)}{(houses.find(h => h.id === overlap.house)?.name) ? ` at ${houses.find(h => h.id === overlap.house).name}` : ''} this day. This shift overlaps it.
            </div>
          )}
          <div>
            <div style={labelStyle}>Note (optional)</div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Med pass at 8, cover lunch" style={fieldStyle} />
          </div>
          {!editShift && (
            <div>
              <div style={labelStyle}>Repeat</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {WEEKDAYS.map(([lbl, d]) => {
                  const on = repeatDays.includes(d)
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(d)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? 'var(--a-ink)' : 'transparent', color: on ? 'var(--a-card)' : 'var(--a-ink2)', border: on ? 0 : '1px solid var(--a-line)' }}>{lbl}</button>
                  )
                })}
              </div>
              {repeatDays.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5, color: 'var(--a-ink2)' }}>
                  <span>for</span>
                  <input type="number" min={1} max={26} value={weeks} onChange={e => setWeeks(Math.max(1, Math.min(26, Number(e.target.value) || 1)))} style={{ ...fieldStyle, width: 64, padding: '6px 8px' }} />
                  <span>weeks → creates <strong>{repeatCount}</strong> shift{repeatCount === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {editShift && (
              <button type="button" onClick={remove} disabled={saving}
                style={{ ...dBtnGhost, padding: '11px 14px', color: '#a93a25', borderColor: '#e3b6ad' }}>Delete</button>
            )}
            <button type="button" onClick={onClose} style={{ ...dBtnGhost, flex: 1, justifyContent: 'center', padding: '11px' }}>Cancel</button>
            <button type="submit" disabled={!canSubmit || dur <= 0}
              style={{ flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: (canSubmit && dur > 0) ? 'pointer' : 'default', opacity: (canSubmit && dur > 0) ? 1 : 0.5 }}>
              {saving ? 'Saving…' : editShift ? 'Save changes' : repeatCount > 1 ? `Add ${repeatCount} shifts` : 'Add shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PageScheduleDesktopExpanded({ user, houses: housesProp = [] }) {
  const isManager = user?.role === 'manager'
  const houses = isManager ? housesProp.filter(h => h.id === user?.houseSlug) : housesProp

  const [view, setView] = useState('week')
  const [anchorDate, setAnchorDate] = useState(new Date())   // the focused day/week/month
  const [houseFilter, setHouseFilter] = useState(isManager ? (user.houseSlug || 'all') : 'all')
  const [rangeShifts, setRangeShifts] = useState([])
  const [timeOff, setTimeOff] = useState([])   // approved time-off rows for safety checks
  const [modal, setModal] = useState(null) // null | { mode: 'add' } | { mode: 'edit', shift }

  const week = buildWeek(anchorDate)
  const selectedDate = toDateStr(anchorDate)

  // Fetch the shifts that the current view needs: the visible week (day/week
  // views) or the whole visible month grid (month view).
  const [rangeStart, rangeEnd] = view === 'month'
    ? (() => { const g = buildMonthGrid(anchorDate); return [g.first, g.last] })()
    : [week[0].date, week[6].date]
  const rangeKey = `${toDateStr(rangeStart)}:${toDateStr(rangeEnd)}`

  const reload = useCallback(() => {
    if (!user?.orgId) return
    const houseId = isManager ? (user.houseId || null) : null
    fetchShiftsWeek(user.orgId, houseId, rangeStart, rangeEnd).then(setRangeShifts)
    // Approved time-off so the grid can flag staff/days that are on leave.
    fetchTimeOffRequests(user.orgId, { status: 'approved' }).then(setTimeOff).catch(() => setTimeOff([]))
  }, [user?.orgId, user?.houseId, isManager, rangeKey])

  useEffect(() => { reload() }, [reload])

  const dayShifts = rangeShifts.filter(s => s.date === selectedDate)
  const closeAndReload = () => { setModal(null); reload() }

  // Navigation: a week step for day/week, a month step for month; Today resets.
  const step = view === 'month' ? (n) => setAnchorDate(d => addMonths(d, n)) : (n) => setAnchorDate(d => addDays(d, n * 7))
  const nav = { onPrev: () => step(-1), onNext: () => step(1), onToday: () => setAnchorDate(new Date()) }
  const pickDay = (date) => { setAnchorDate(date); setView('day') }

  return (
    <>
      <DTopBar
        title="Schedule"
        sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconKey size={12} sw={2} color="var(--a-sage)" />
          {isManager ? 'Your house schedule' : 'You see all houses · staff see only their own'}
        </span>}
        actions={<>
          <ViewToggleDesktop view={view} setView={setView} />
          <button onClick={() => setModal({ mode: 'add' })} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> New shift</button>
        </>}
      />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        {view === 'day' && (
          <DayScheduleView week={week} selectedDate={selectedDate} onPickDay={setAnchorDate} {...nav}
            houseFilter={houseFilter} setHouseFilter={setHouseFilter} shifts={dayShifts} houses={houses} isManager={isManager}
            onShiftClick={(s) => setModal({ mode: 'edit', shift: s })} />
        )}
        {view === 'week' && (
          <WeekScheduleView week={week} houses={houses} shifts={rangeShifts} {...nav}
            user={user} onChanged={reload} timeOff={timeOff}
            onShiftClick={(s) => setModal({ mode: 'edit', shift: s })}
            onAddShift={(opts) => setModal({ mode: 'add', ...opts })} />
        )}
        {view === 'month' && (
          <MonthScheduleView anchorDate={anchorDate} houses={houses} shifts={rangeShifts} {...nav} onPickDay={pickDay} />
        )}
      </div>

      {modal && (
        <ShiftModal
          user={user}
          houses={houses}
          isManager={isManager}
          editShift={modal.mode === 'edit' ? modal.shift : null}
          defaultHouseUuid={modal.houseUuid || houses.find(h => h.id === houseFilter)?._uuid}
          defaultDate={modal.date || selectedDate}
          defaultStaffName={modal.staffName || ''}
          timeOff={timeOff}
          weekShifts={rangeShifts}
          onClose={() => setModal(null)}
          onSaved={closeAndReload}
          onDeleted={closeAndReload}
        />
      )}
    </>
  )
}
