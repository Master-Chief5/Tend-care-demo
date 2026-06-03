import { useState, useEffect, useCallback } from 'react'
import { buildWeek, fmtDayLabel, fmtNow, fmtHour, fmtTime, expandRepeatDates } from '../lib/utils'

const WEEKDAYS = [['Su', 0], ['Mo', 1], ['Tu', 2], ['We', 3], ['Th', 4], ['Fr', 5], ['Sa', 6]]
import { useNowMinute } from '../hooks/useNowMinute'
import { fetchShiftsWeek, addShift, updateShift, deleteShift, fetchStaff, fetchHouses } from '../lib/db'

// "7:00 AM" style label from a decimal hour — so AM/PM is always explicit.
function hourLabel(h) {
  const total = Math.round((Number(h) || 0) * 60)
  const hh = Math.floor(total / 60) % 24, mm = total % 60
  const ap = hh < 12 ? 'AM' : 'PM'
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${ap}`
}
import { TabBar } from '../components/ui/TabBar'
import { IconPlus, IconKey } from '../components/icons'

const HOUR_PX = 56
const DAY_START = 0
const DAY_END = 24

function ViewToggle({ view, setView }) {
  return (
    <div style={{ display: 'flex', background: 'var(--a-paper)', borderRadius: 999, padding: 3, border: '1px solid var(--a-line)' }}>
      {['day', 'week'].map(v => (
        <button key={v} onClick={() => setView(v)} style={{
          border: 0,
          background: v === view ? 'var(--a-ink)' : 'transparent',
          color: v === view ? 'var(--a-card)' : 'var(--a-ink2)',
          padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'Geist', textTransform: 'capitalize',
        }}>{v}</button>
      ))}
    </div>
  )
}

function DayStrip({ week, dayIdx, setDayIdx }) {
  return (
    <div style={{ padding: '0 22px 12px', display: 'flex', gap: 4 }}>
      {week.map((d, i) => {
        const sel = i === dayIdx
        return (
          <div key={i} onClick={() => setDayIdx(i)} style={{
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

function ShiftBlock({ shift, houseColor, expanded, onClick }) {
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
  return (
    <div onClick={onClick} style={{
      position: 'absolute', top: top + 2, left: 2, right: 2, height: Math.max(height - 4, 20),
      background: bg, border, borderRadius: 6, cursor: 'pointer',
      padding: expanded ? '8px 12px' : '4px 6px', color: txt, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 2, opacity: dim ? 0.78 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span className="tnum" style={{ fontSize: expanded ? 11 : 9, fontWeight: 700, letterSpacing: '0.04em', opacity: open ? 1 : 0.85 }}>
          {fmtTime(start)}–{fmtTime(end)}
        </span>
        {late && <span style={{ fontSize: 8, fontWeight: 700, color: '#a93a25', background: 'rgba(255,255,255,0.9)', padding: '0 4px', borderRadius: 3 }}>LATE</span>}
        {swap && <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.18)', padding: '0 4px', borderRadius: 3 }}>SWAP</span>}
      </div>
      <div style={{ fontSize: expanded ? 14 : 11, fontWeight: 700, lineHeight: 1.1, color: open ? houseColor : '#fff' }}>{person}</div>
      {height > 48 && <div style={{ fontSize: expanded ? 11 : 9, opacity: open ? 0.8 : 0.7, fontWeight: 500 }}>{role}</div>}
      {shift.note && height > 78 && <div style={{ fontSize: expanded ? 10.5 : 9, opacity: 0.78, fontStyle: 'italic', marginTop: 2, lineHeight: 1.25, overflow: 'hidden' }}>“{shift.note}”</div>}
    </div>
  )
}

function TimeGrid({ shifts, houses, nowFrac = 9.8, onShiftClick }) {
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
            {shifts.filter(s => s.house === h.id).map((s, si) => (
              <ShiftBlock key={s.id ?? si} shift={s} houseColor={h.color} expanded={single} onClick={() => onShiftClick?.(s)} />
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

function ScreenA_ScheduleWeek({ setView, houses, weekShifts = [], weekDates = [] }) {
  const week = buildWeek(new Date())
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

const toDateStr = (d) => d.toISOString().split('T')[0]

function ShiftModal({ user, houses, defaultDate, editShift, onClose, onSaved, onDeleted }) {
  const hourToTime = (h) => {
    const total = Math.round((Number(h) || 0) * 60)
    const hh = Math.floor(total / 60) % 24, mm = total % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  const initialHouse = editShift
    ? (houses.find(h => h.slug === editShift.house)?.id || houses[0]?.id || '')
    : (user?.houseId || houses[0]?.id || '')

  const [personName, setPersonName] = useState(editShift?.person || '')
  const [role, setRole] = useState(editShift?.role || 'DSP')
  const [date, setDate] = useState(editShift?.date || defaultDate || toDateStr(new Date()))
  const [startTime, setStartTime] = useState(editShift ? hourToTime(editShift.start) : '07:00')
  const [endTime, setEndTime] = useState(editShift ? hourToTime(editShift.end) : '15:00')
  const [houseId, setHouseId] = useState(initialHouse)
  const [note, setNote] = useState(editShift?.note || '')
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

  const submit = async (e) => {
    e.preventDefault()
    if (!personName.trim() || !houseId || !user?.orgId || saving || dur <= 0) return
    setSaving(true)
    if (editShift) {
      await updateShift(editShift.id, { personName: personName.trim(), role, startHour: sH, endHour: eH, date, note: note.trim() })
    } else {
      const dates = expandRepeatDates(date, repeatDays, weeks)
      for (const d of dates) {
        await addShift(user.orgId, houseId, { personName: personName.trim(), role, startHour: sH, endHour: eH, date: d, note: note.trim() })
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="serif" style={{ fontSize: 22 }}>{editShift ? 'Edit shift' : 'Add shift'}</div>
          {editShift && <button type="button" onClick={remove} style={{ border: 0, background: 'transparent', color: '#a93a25', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Delete</button>}
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input list="mob-staff-options" autoFocus value={personName} onChange={e => setPersonName(e.target.value)}
            placeholder={staff.length ? 'Staff member name' : 'Type a name (or add staff first)'}
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          <datalist id="mob-staff-options">
            {staff.map(s => <option key={s.id} value={s.name} />)}
          </datalist>
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
          <select value={role} onChange={e => setRole(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }}>
            {['DSP', 'Lead', 'Mgr', 'PT', 'Awake OT'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
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

export function ScreenA_ScheduleDay({ user, employee = false, houses = [] }) {
  const [view, setView] = useState('day')
  const [houseFilter, setHouseFilter] = useState('all')
  const [weekShifts, setWeekShifts] = useState([])
  const [houseList, setHouseList] = useState([])   // real DB houses: { id: UUID, slug, name, color, short }
  const [modal, setModal] = useState(null)         // null | { mode:'add' } | { mode:'edit', shift }
  const week = buildWeek(new Date())
  const [dayIdx, setDayIdx] = useState(() => { const i = week.findIndex(d => d.today); return i >= 0 ? i : 0 })
  const nowFrac = useNowMinute()

  const isSupervisor = user?.role === 'supervisor'

  // Use the `houses` prop (real DB houses, normalized) instead of the HOUSES constant.
  const displayHouses = isSupervisor ? houses : houses.filter(h => h.id === user?.houseSlug)

  // Picker options use raw DB houses (UUID ids) so addShift inserts a valid house_id.
  const pickerHouses = isSupervisor ? houseList : houseList.filter(h => h.slug === user?.houseSlug)

  const weekDates = week.map(d => toDateStr(d.date))

  const reload = useCallback(() => {
    if (!user?.orgId) return
    const houseId = isSupervisor ? null : (user.houseId || null)
    const w = buildWeek(new Date())
    fetchShiftsWeek(user.orgId, houseId, toDateStr(w[0].date), toDateStr(w[6].date)).then(setWeekShifts)
    fetchHouses(user.orgId).then(setHouseList)
  }, [user?.orgId, user?.houseId, isSupervisor])

  useEffect(() => { reload() }, [reload])

  const closeAndReload = () => { setModal(null); reload() }

  if (view === 'week') return <ScreenA_ScheduleWeek setView={setView} houses={displayHouses} weekShifts={weekShifts} weekDates={weekDates} />

  // Each day shows ONLY its own shifts (filtered from the week by date).
  const selectedDate = weekDates[dayIdx]
  const dayShifts = weekShifts.filter(s => s.date === selectedDate)
  const visibleHouses = houseFilter === 'all' ? displayHouses : displayHouses.filter(h => h.id === houseFilter)
  const filteredShifts = houseFilter === 'all' ? dayShifts : dayShifts.filter(s => s.house === houseFilter)

  const canAddShift = user?.role === 'supervisor' || user?.role === 'manager'

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 6px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Schedule</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)' }}>{fmtDayLabel(week[dayIdx].date)} · {dayShifts.length} shifts</div>
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

        {user?.role === 'supervisor' && (
          <div style={{ padding: '4px 22px 10px' }}>
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconKey size={13} color="var(--a-sage)" sw={1.8} />
              <span style={{ fontSize: 11, color: 'var(--a-ink2)', flex: 1 }}>You see <strong>all houses</strong>. Staff only see their own shifts.</span>
            </div>
          </div>
        )}

        <DayStrip week={week} dayIdx={dayIdx} setDayIdx={setDayIdx} />
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
          <TimeGrid shifts={filteredShifts} houses={visibleHouses} nowFrac={nowFrac} onShiftClick={(s) => setModal({ mode: 'edit', shift: s })} />
        </div>
      </div>
      <TabBar active="sched" />

      {modal && (
        <ShiftModal
          user={user}
          houses={pickerHouses}
          editShift={modal.mode === 'edit' ? modal.shift : null}
          defaultDate={selectedDate}
          onClose={() => setModal(null)}
          onSaved={closeAndReload}
          onDeleted={closeAndReload}
        />
      )}
    </div>
  )
}
