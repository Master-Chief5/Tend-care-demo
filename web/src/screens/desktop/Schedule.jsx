import { useState, useEffect } from 'react'
import { HOUSES } from '../../data/constants'
import { buildWeek, fmtDayLabel, fmtNow, fmtTime } from '../../lib/utils'
import { useNowMinute } from '../../hooks/useNowMinute'
import { fetchShifts, fetchShiftsWeek, addShift, fetchStaff } from '../../lib/db'
import { DTopBar, dBtnGhost, dBtnSolid } from './Desktop'
import { IconChev, IconKey, IconPlus, IconFilter } from '../../components/icons'

const DAY_START = 6
const DAY_END = 24
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
      {['day', 'week'].map(v => (
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

function DskShiftBlock({ shift, houseColor }) {
  const { start, end, person, role, status } = shift
  const top = (start - DAY_START) * DSK_HOUR_PX
  const height = (end - start) * DSK_HOUR_PX
  const open = status === 'open'
  const late = status === 'late'
  const swap = status === 'swap'
  const here = status === 'here'
  const bg = open ? 'transparent' : houseColor
  const border = open ? `1.5px dashed ${houseColor}` : late ? `1.5px solid #a93a25` : 'none'
  return (
    <div style={{
      position: 'absolute', top: top + 3, left: 6, right: 6, height: height - 6,
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
      {(late || swap || here || open) && (
        <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 4 }}>
          {here && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.22)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>● CLOCKED IN</span>}
          {late && <span style={{ fontSize: 9, fontWeight: 700, color: '#a93a25', background: 'rgba(255,255,255,0.92)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>LATE · 12m</span>}
          {swap && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.22)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>SWAP REQ</span>}
          {open && <span style={{ fontSize: 9, fontWeight: 700, color: houseColor, background: 'rgba(255,255,255,0.92)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>NEEDS FILL</span>}
        </div>
      )}
    </div>
  )
}

function DesktopTimeGrid({ shifts, houses = HOUSES, nowFrac = 9.8 }) {
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
              <div style={{ position: 'absolute', top: -8, right: 10, fontSize: 11, fontWeight: 600, color: 'var(--a-ink2)', background: 'var(--a-paper)', padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}>
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
            {shifts.filter(s => s.house === h.id).map((s, si) => (
              <DskShiftBlock key={si} shift={s} houseColor={h.color} />
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

const toDateStr = (d) => d.toISOString().split('T')[0]

function ScheduleRow({ house, weekShifts, weekDates }) {
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
        return (
          <div key={i} style={{ padding: '8px 6px', borderLeft: i === 0 ? '' : '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {dayShifts.length === 0 ? (
              <div style={{ color: 'var(--a-ink3)', fontSize: 11, padding: '4px 4px', opacity: 0.45 }}>—</div>
            ) : dayShifts.map((s, j) => {
              const open = s.status === 'open'
              return (
                <div key={j} style={{ background: open ? 'transparent' : house.color, border: open ? `1.5px dashed ${house.color}` : 'none', color: open ? house.color : '#fff', borderRadius: 6, padding: '4px 7px', fontSize: 11, fontWeight: open ? 600 : 500 }}>
                  <div style={{ fontSize: 9.5, opacity: open ? 1 : 0.8, fontWeight: 600 }}>{fmtTime(s.start)}–{fmtTime(s.end)}</div>
                  <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{s.person}</div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function DayScheduleView({ dayIdx, setDayIdx, houseFilter, setHouseFilter, shifts, houses = HOUSES, isManager = false }) {
  const week = buildWeek(new Date())
  const nowFrac = useNowMinute()
  const visibleHouses = houseFilter === 'all' ? houses : houses.filter(h => h.id === houseFilter)
  const filteredShifts = houseFilter === 'all' ? shifts : shifts.filter(s => s.house === houseFilter)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {week.map((d, i) => {
            const sel = i === dayIdx
            return (
              <button key={i} onClick={() => setDayIdx(i)} style={{
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
        <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} /></button>
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
        <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{fmtDayLabel(week[dayIdx].date)}</span>
        <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>
          {`${filteredShifts.length} shifts · `}
          <strong style={{ color: 'var(--a-clay)' }}>{filteredShifts.filter(s => s.status === 'open').length} open</strong>
          {filteredShifts.some(s => s.status === 'late') && <> · 1 late</>}
          {filteredShifts.some(s => s.status === 'swap') && <> · 1 swap</>}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>Scale: 1 hr</span>
      </div>

      <DesktopTimeGrid shifts={filteredShifts} houses={visibleHouses} nowFrac={nowFrac} />
    </>
  )
}

function WeekScheduleView({ houses = HOUSES, shifts = [] }) {
  const week = buildWeek(new Date())
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const weekLabel = `${MONTHS[week[0].date.getMonth()]} ${week[0].num} – ${MONTHS[week[6].date.getMonth()]} ${week[6].num}`
  const openCount = shifts.filter(s => s.status === 'open').length
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
        <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{weekLabel}</span>
        <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} /></button>
        <div style={{ flex: 1 }} />
        {openCount > 0 && <span style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Open shifts: <strong style={{ color: 'var(--a-clay)' }}>{openCount}</strong></span>}
      </div>
      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)' }}>
          <div style={{ padding: '10px 14px', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>House</div>
          {week.map((d, i) => (
            <div key={i} style={{ padding: '10px 0', textAlign: 'center', borderLeft: '1px solid var(--a-line)' }}>
              <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.dow}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: d.today ? 'var(--a-clay)' : 'var(--a-ink)' }}>{d.num}</div>
            </div>
          ))}
        </div>
        {houses.map(h => <ScheduleRow key={h.id} house={h} weekShifts={shifts} weekDates={week} />)}
      </div>
    </>
  )
}

function AddShiftModal({ user, houses, defaultHouseUuid, isManager, onClose, onAdded }) {
  const initialHouse = isManager
    ? (user?.houseId || houses[0]?._uuid || '')
    : (defaultHouseUuid || houses[0]?._uuid || '')
  const [houseUuid, setHouseUuid] = useState(initialHouse)
  const [staff, setStaff] = useState([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [personName, setPersonName] = useState('')
  const [role, setRole] = useState('DSP')
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('15:00')
  const [saving, setSaving] = useState(false)

  // Refetch the staff list whenever the selected house changes — the user may
  // only pick a real current employee of that house.
  useEffect(() => {
    let cancelled = false
    if (!user?.orgId || !houseUuid) { setStaff([]); return }
    setStaffLoading(true)
    fetchStaff(user.orgId, houseUuid).then(data => {
      if (cancelled) return
      setStaff(data)
      setPersonName(prev => (data.some(s => s.name === prev) ? prev : (data[0]?.name ?? '')))
      setStaffLoading(false)
    })
    return () => { cancelled = true }
  }, [user?.orgId, houseUuid])

  const timeToHour = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60 }

  const submit = async (e) => {
    e.preventDefault()
    if (!personName || !houseUuid || !user?.orgId || saving) return
    setSaving(true)
    const shift = await addShift(user.orgId, houseUuid, {
      personName,
      role,
      startHour: timeToHour(startTime),
      endHour: timeToHour(endTime),
    })
    setSaving(false)
    if (shift) onAdded(shift, houseUuid)
  }

  const fieldStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 11, color: 'var(--a-ink3)', marginBottom: 4, paddingLeft: 2 }
  const canSubmit = !!personName && !!houseUuid && !saving

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 420, maxWidth: 'calc(100vw - 40px)', background: 'var(--a-bg)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '22px 24px 26px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>Add shift</div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', color: 'var(--a-ink3)', fontSize: 20, cursor: 'pointer', lineHeight: 1, fontFamily: 'Geist' }}>×</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={labelStyle}>House</div>
            <select value={houseUuid} onChange={e => setHouseUuid(e.target.value)} disabled={isManager} style={{ ...fieldStyle, opacity: isManager ? 0.7 : 1 }}>
              {houses.map(h => <option key={h._uuid} value={h._uuid}>{h.name}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Staff member</div>
            <select value={personName} onChange={e => setPersonName(e.target.value)} disabled={staffLoading || staff.length === 0} style={fieldStyle}>
              {staffLoading
                ? <option value="">Loading…</option>
                : staff.length === 0
                  ? <option value="">No staff in this house</option>
                  : staff.map(s => <option key={s.id} value={s.name}>{s.name}{s.role ? ` · ${s.role}` : ''}</option>)}
            </select>
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
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ ...dBtnGhost, flex: 1, justifyContent: 'center', padding: '11px' }}>Cancel</button>
            <button type="submit" disabled={!canSubmit}
              style={{ flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5 }}>
              {saving ? 'Saving…' : 'Add shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PageScheduleDesktopExpanded({ user, houses: housesProp = HOUSES }) {
  const isManager = user?.role === 'manager'
  const houses = isManager ? housesProp.filter(h => h.id === user?.houseSlug) : housesProp

  const [view, setView] = useState('day')
  const [dayIdx, setDayIdx] = useState(() => {
    const w = buildWeek(new Date())
    const i = w.findIndex(d => d.today)
    return i >= 0 ? i : 0
  })
  const [houseFilter, setHouseFilter] = useState(isManager ? (user.houseSlug || 'all') : 'all')
  const [shifts, setShifts] = useState([])
  const [weekShifts, setWeekShifts] = useState([])
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (!user?.orgId) return
    const houseId = isManager ? (user.houseId || null) : null
    fetchShifts(user.orgId, houseId, new Date()).then(data => {
      if (data.length > 0) setShifts(data)
    })
    const week = buildWeek(new Date())
    fetchShiftsWeek(user.orgId, houseId, week[0].date, week[6].date).then(data => {
      setWeekShifts(data)
    })
  }, [user?.orgId, user?.houseId, isManager])

  // The grid renders shifts by `s.house === h.id`, where h.id is the house slug.
  // addShift returns a raw DB row keyed by house UUID, so map it back to the slug.
  const handleShiftAdded = (shift, houseUuid) => {
    const slug = houses.find(h => h._uuid === houseUuid)?.id ?? houseUuid
    const todayStr = toDateStr(new Date())
    const rowDate = shift.shift_date || todayStr
    const normalized = {
      id: shift.id,
      house: slug,
      start: Number(shift.start_hour),
      end: Number(shift.end_hour),
      person: shift.person_name,
      role: shift.role,
      status: shift.status || 'scheduled',
      date: rowDate,
    }
    if (rowDate === todayStr) setShifts(prev => [...prev, normalized])
    setWeekShifts(prev => [...prev, normalized])
    setShowAdd(false)
  }

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
          <button style={dBtnGhost}><IconFilter size={13} sw={1.8} /> Filter</button>
          <button onClick={() => setShowAdd(true)} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> New shift</button>
        </>}
      />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        {view === 'day'
          ? <DayScheduleView dayIdx={dayIdx} setDayIdx={setDayIdx} houseFilter={houseFilter} setHouseFilter={setHouseFilter} shifts={shifts} houses={houses} isManager={isManager} />
          : <WeekScheduleView houses={houses} shifts={weekShifts} />}
      </div>

      {showAdd && (
        <AddShiftModal
          user={user}
          houses={houses}
          isManager={isManager}
          defaultHouseUuid={houses.find(h => h.id === houseFilter)?._uuid}
          onClose={() => setShowAdd(false)}
          onAdded={handleShiftAdded}
        />
      )}
    </>
  )
}
