import { useState, useEffect } from 'react'
import { buildWeek, fmtDayLabel, fmtNow, fmtHour, fmtTime } from '../lib/utils'
import { useNowMinute } from '../hooks/useNowMinute'
import { fetchShifts, fetchShiftsWeek, addShift, fetchStaff, fetchHouses } from '../lib/db'
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

function ShiftBlock({ shift, houseColor, expanded }) {
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
    <div style={{
      position: 'absolute', top: top + 2, left: 2, right: 2, height: Math.max(height - 4, 20),
      background: bg, border, borderRadius: 6,
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
    </div>
  )
}

function TimeGrid({ shifts, houses, nowFrac = 9.8 }) {
  const hours = []
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h)
  const nowTop = (nowFrac - DAY_START) * HOUR_PX
  const single = houses.length === 1
  return (
    <div style={{ position: 'relative', display: 'flex', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ width: 50, flexShrink: 0, position: 'relative', borderRight: '1px solid var(--a-line)', background: 'var(--a-paper)' }}>
        {hours.map((h, i) => (
          <div key={i} style={{ height: HOUR_PX, position: 'relative' }}>
            <span style={{ position: 'absolute', top: -7, right: 6, fontSize: 10, color: 'var(--a-ink3)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
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
              <ShiftBlock key={si} shift={s} houseColor={h.color} expanded={single} />
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

function AddShiftModal({ user, houses, onClose, onAdded }) {
  const [personName, setPersonName] = useState('')
  const [role, setRole] = useState('DSP')
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('15:00')
  const [houseId, setHouseId] = useState(user?.houseId || (houses[0]?.id ?? ''))
  const [staff, setStaff] = useState([])
  const [saving, setSaving] = useState(false)

  // Strict staff list scoped to the selected house — only real current employees.
  useEffect(() => {
    if (!user?.orgId || !houseId) { setStaff([]); return }
    let active = true
    fetchStaff(user.orgId, houseId).then(data => { if (active) setStaff(data) })
    return () => { active = false }
  }, [user?.orgId, houseId])

  // Reset the chosen person when the house (and therefore the staff list) changes.
  useEffect(() => { setPersonName('') }, [houseId])

  const timeToHour = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60 }

  const submit = async (e) => {
    e.preventDefault()
    if (!personName.trim() || !houseId || !user?.orgId) return
    setSaving(true)
    const shift = await addShift(user.orgId, houseId, {
      personName: personName.trim(),
      role,
      startHour: timeToHour(startTime),
      endHour: timeToHour(endTime),
    })
    setSaving(false)
    if (shift) onAdded(shift, houseId)
  }

  const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 16 }}>Add shift</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select autoFocus value={personName} onChange={e => setPersonName(e.target.value)} style={inputStyle}>
            <option value="" disabled>Select staff member</option>
            {staff.length === 0
              ? <option value="" disabled>No staff in this house — add staff first</option>
              : staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
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
          <select value={role} onChange={e => setRole(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }}>
            {['DSP', 'Lead', 'Mgr', 'PT', 'Awake OT'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {houses.length > 1 && (
            <select value={houseId} onChange={e => setHouseId(e.target.value)}
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }}>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <button type="submit" disabled={!personName.trim() || saving}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: personName.trim() ? 'pointer' : 'default', opacity: personName.trim() ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Add shift'}
          </button>
        </form>
      </div>
    </div>
  )
}

const toDateStr = (d) => d.toISOString().split('T')[0]

export function ScreenA_ScheduleDay({ user, employee = false, houses = [] }) {
  const [view, setView] = useState('day')
  const [houseFilter, setHouseFilter] = useState('all')
  const [shifts, setShifts] = useState([])
  const [weekShifts, setWeekShifts] = useState([])
  const [houseList, setHouseList] = useState([])   // real DB houses: { id: UUID, slug, name, color, short }
  const [showAddShift, setShowAddShift] = useState(false)
  const week = buildWeek(new Date())
  const [dayIdx, setDayIdx] = useState(() => { const i = week.findIndex(d => d.today); return i >= 0 ? i : 0 })
  const nowFrac = useNowMinute()

  const isSupervisor = user?.role === 'supervisor'

  // Use the `houses` prop (real DB houses, normalized) instead of the HOUSES constant.
  const displayHouses = isSupervisor ? houses : houses.filter(h => h.id === user?.houseSlug)

  // Picker options use raw DB houses (UUID ids) so addShift inserts a valid house_id.
  const pickerHouses = isSupervisor ? houseList : houseList.filter(h => h.slug === user?.houseSlug)

  const weekDates = week.map(d => toDateStr(d.date))

  useEffect(() => {
    if (!user?.orgId) return
    const houseId = isSupervisor ? null : (user.houseId || null)
    fetchShifts(user.orgId, houseId, new Date()).then(data => {
      if (data.length > 0) setShifts(data)
    })
    fetchShiftsWeek(user.orgId, houseId, weekDates[0], weekDates[6]).then(data => {
      setWeekShifts(data)
    })
    fetchHouses(user.orgId).then(setHouseList)
  }, [user?.orgId, user?.houseId, user?.role])

  const handleShiftAdded = (shift, houseId) => {
    // houseId is a real UUID; map it back to the slug the grid uses to render.
    const slug = houseList.find(h => h.id === houseId)?.slug ?? houseId
    setShifts(prev => [...prev, {
      id: shift.id,
      house: slug,
      start: Number(shift.start_hour),
      end: Number(shift.end_hour),
      person: shift.person_name,
      role: shift.role,
      status: 'scheduled',
    }])
    setShowAddShift(false)
  }

  if (view === 'week') return <ScreenA_ScheduleWeek setView={setView} houses={displayHouses} weekShifts={weekShifts} weekDates={weekDates} />

  const visibleHouses = houseFilter === 'all' ? displayHouses : displayHouses.filter(h => h.id === houseFilter)
  const filteredShifts = houseFilter === 'all' ? shifts : shifts.filter(s => s.house === houseFilter)

  const canAddShift = user?.role === 'supervisor' || user?.role === 'manager'

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 6px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Schedule</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)' }}>{fmtDayLabel(week[dayIdx].date)} · {shifts.length} shifts</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <ViewToggle view={view} setView={setView} />
              {canAddShift && (
                <button onClick={() => setShowAddShift(true)} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
          <TimeGrid shifts={filteredShifts} houses={visibleHouses} nowFrac={nowFrac} />
        </div>
      </div>
      <TabBar active="sched" />

      {showAddShift && (
        <AddShiftModal
          user={user}
          houses={pickerHouses}
          onClose={() => setShowAddShift(false)}
          onAdded={handleShiftAdded}
        />
      )}
    </div>
  )
}
