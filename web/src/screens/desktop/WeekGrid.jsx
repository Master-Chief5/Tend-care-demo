import { useState, useEffect } from 'react'
import { fetchStaff } from '../../lib/db'
import { approvedLeaveOn } from '../../lib/scheduleSafety'
import { certStatus } from '../People'
import { fmtTime } from '../../lib/utils'
import { IconPlus, IconAlert, IconPeople } from '../../components/icons'

// ── Connecteam-style STAFF × DAYS week grid (Hearth look) ───────────────────
// A sticky left staff column + Mon–Sun day columns. Staff rows are grouped
// under per-house bands themed by each house's accent color. Shifts are placed
// in the [staff][weekday] cell as blocks (time + role) carrying status tags.
// Open shifts collect into a dedicated red "Open shifts" lane at the bottom.
// Reuses scheduleSafety (approved-leave overlay) + certStatus (cert flag).

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const STAFF_COL = 220
const GRID_COLS = `${STAFF_COL}px repeat(7, 1fr)`
const MIN_W = 1040

// "9:00–17:00" 24h label so the block reads like the mockup.
function hhmm(h) {
  const total = Math.round((((h % 24) + 24) % 24) * 60)
  const hh = Math.floor(total / 60), mm = total % 60
  return `${hh}:${String(mm).padStart(2, '0')}`
}
function timeRange(start, end) { return `${hhmm(start)}–${hhmm(end)}` }

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return ((parts[0][0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

function shiftHours(s) {
  const a = Number(s.start), b = Number(s.end)
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a) : 0
}
const fmtH = (h) => `${Math.round(h * 10) / 10}h`

// Status → tinted tag (good / warn / bad), matching the shell.css status pairs.
function StatusTag({ status }) {
  if (status === 'here') {
    return (
      <span style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#dee6df', color: '#3f604d', alignSelf: 'flex-start' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} /> Clocked in
      </span>
    )
  }
  if (status === 'swap') {
    return <span style={{ marginTop: 4, display: 'inline-flex', fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#f5e9d6', color: '#8a5e0f', alignSelf: 'flex-start' }}>Swap req</span>
  }
  if (status === 'late') {
    return <span style={{ marginTop: 4, display: 'inline-flex', fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#fadcd7', color: '#a93a25', alignSelf: 'flex-start' }}>Late</span>
  }
  return null
}

// A single placed shift block (house-tinted, status-tagged, cert-flagged).
function ShiftBlock({ shift, houseColor, certFlag, offLeave, onClick, draggable, onDragStart }) {
  const fill = `color-mix(in srgb, ${houseColor} 14%, var(--a-card))`
  return (
    <button type="button" draggable={draggable} onDragStart={onDragStart} onClick={onClick}
      title={offLeave ? 'On approved leave this day · click to edit' : 'Click to edit'}
      style={{
        width: '100%', display: 'block', textAlign: 'left', cursor: draggable ? 'grab' : 'pointer',
        borderRadius: 8, padding: '6px 8px', background: fill,
        borderLeft: `3px solid ${houseColor}`,
        borderTop: '1px solid var(--a-line)', borderRight: '1px solid var(--a-line)',
        borderBottom: offLeave ? '1.5px solid #a93a25' : '1px solid var(--a-line)',
        fontFamily: 'Geist',
      }}>
      <div className="tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-ink)', lineHeight: 1.15 }}>{timeRange(shift.start, shift.end)}</div>
      <div style={{ fontSize: 12, color: 'var(--a-ink2)', marginTop: 1 }}>{shift.role || 'DSP'}</div>
      <StatusTag status={shift.status} />
      {certFlag && (
        <span style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: certFlag.bg, color: certFlag.tc, alignSelf: 'flex-start' }}>
          <IconAlert size={11} sw={2} color={certFlag.tc} /> {certFlag.label}
        </span>
      )}
      {offLeave && (
        <span style={{ marginTop: 4, display: 'inline-flex', fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', padding: '1px 5px', borderRadius: 3, background: '#a93a25', color: '#fff', alignSelf: 'flex-start' }}>OFF · ON LEAVE</span>
      )}
    </button>
  )
}

// requiredCert flag for an assigned staffer: missing cert = hard flag (rank 3);
// otherwise certStatus by expiry (rank 3 expired / rank 2 expiring) drives the chip.
function certFlagFor(shift, staff) {
  if (!shift.requiredCert) return null
  const certs = staff?.certs || []
  const match = certs.find(c => c.name === shift.requiredCert)
  if (!match) return { bg: '#fadcd7', tc: '#a93a25', label: 'Cert missing' }
  const st = certStatus(match.expires)
  if (st.rank >= 2) return { bg: st.bg, tc: st.tc, label: shift.requiredCert.split('/')[0].trim() + ' ' + st.label.toLowerCase() }
  return null
}

export function WeekGrid({ user, houses = [], week, shifts = [], timeOff = [], isAdmin, onShiftClick, onAddShift, onMoveShift }) {
  const [staff, setStaff] = useState([])
  const weekDates = week.map(d => toDateStr(d.date))

  // Pull the staff roster for the visible scope: any house employee (manager or
  // DSP) is limited to their own house; only a supervisor sees every house's
  // roster. Otherwise out-of-scope staff leak in as "Unassigned" rows.
  useEffect(() => {
    let cancelled = false
    if (!user?.orgId) { setStaff([]); return }
    const houseId = user?.role === 'supervisor' ? null : (user.houseId || user.houseSlug || null)
    fetchStaff(user.orgId, houseId).then(rows => { if (!cancelled) setStaff(rows || []) })
    return () => { cancelled = true }
  }, [user?.orgId, user?.houseId, user?.role])

  const houseBySlug = {}
  for (const h of houses) houseBySlug[h.id] = h
  const houseByUuid = {}
  for (const h of houses) if (h._uuid) houseByUuid[h._uuid] = h

  // Group staff under their house (in the order `houses` are given). Staff with
  // no house fall into a trailing "Unassigned staff" group.
  const groups = houses.map(h => ({
    house: h,
    staff: staff.filter(s => s.houseId === h._uuid || s.house === h.id),
  })).filter(g => g.staff.length > 0)
  const grouped = new Set(groups.flatMap(g => g.staff.map(s => s.id)))
  const looseStaff = staff.filter(s => !grouped.has(s.id))

  // Resolve the house color for a given shift (by slug) for chip tinting.
  const colorForShift = (s) => houseBySlug[s.house]?.color || 'var(--a-sage)'

  // Find a staffer's shifts on a given date (by staffId, else by name match).
  const cellShifts = (st, dateStr) => shifts.filter(s =>
    s.status !== 'open' && s.date === dateStr &&
    ((s.staffId && s.staffId === st.id) || (!s.staffId && s.person && s.person.trim().toLowerCase() === st.name.trim().toLowerCase()))
  )

  // Per-staff weekly totals (hours + shift count).
  const staffWeek = (st) => {
    let hours = 0, count = 0
    for (const ds of weekDates) for (const s of cellShifts(st, ds)) { hours += shiftHours(s); count++ }
    return { hours, count }
  }

  // Open (unassigned) shifts → bottom alert lane, keyed by date column.
  const openShifts = shifts.filter(s => s.status === 'open')
  const openByDate = {}
  for (const s of openShifts) (openByDate[s.date] ||= []).push(s)
  const openHours = openShifts.reduce((a, s) => a + shiftHours(s), 0)

  const todayStr = toDateStr(new Date())

  // ── DnD state: which staff-row/day cell is the active drop target ──────────
  const [dropKey, setDropKey] = useState(null)
  const canDrag = !!onMoveShift

  const headerCell = (d, i) => {
    const today = toDateStr(d.date) === todayStr
    // Per-day total hours across all (incl. open) shifts that column.
    const ds = toDateStr(d.date)
    const dayHours = shifts.filter(s => s.date === ds).reduce((a, s) => a + shiftHours(s), 0)
    return (
      <div key={i} style={{ padding: '10px 12px', borderLeft: '1px solid var(--a-line)', background: today ? '#dee6df' : 'transparent' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: today ? '#3f604d' : 'var(--a-ink3)' }}>{d.dow}{today ? ' · Today' : ''}</div>
        <div className="serif tnum" style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.1, marginTop: 2 }}>{d.num}</div>
        <div className="tnum" style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2 }}>{fmtH(dayHours)}</div>
      </div>
    )
  }

  function StaffRow({ st, house }) {
    const color = house?.color || st.houseColor || 'var(--a-sage)'
    const wk = staffWeek(st)
    return (
      <>
        <div style={{ position: 'sticky', left: 0, zIndex: 4, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--a-line)', background: 'var(--a-card)' }}>
          <span className="avatar" aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0, background: color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 13, fontWeight: 600 }}>{initials(st.name)}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</div>
            <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 1 }}>{st.role}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="tnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink2)' }}>{fmtH(wk.hours)}</div>
            <div style={{ fontSize: 12, color: 'var(--a-ink3)' }}>{wk.count} shift{wk.count === 1 ? '' : 's'}</div>
          </div>
        </div>
        {week.map((d, i) => {
          const ds = toDateStr(d.date)
          const today = ds === todayStr
          const items = cellShifts(st, ds)
          const offLeave = approvedLeaveOn(timeOff, { staffId: st.id, name: st.name, dateStr: ds }).length > 0
          const key = `${st.id}|${ds}`
          const isOver = dropKey === key
          const dropProps = canDrag ? {
            onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropKey !== key) setDropKey(key) },
            onDragLeave: () => setDropKey(k => (k === key ? null : k)),
            onDrop: (e) => {
              e.preventDefault(); setDropKey(null)
              try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                if (data && (data.staffId === st.id || data.person === st.name)) {
                  if (data.date !== ds) onMoveShift(data.id, { date: ds })
                } else if (data) {
                  // Reassign to this staffer (and move the day if needed).
                  onMoveShift(data.id, { date: ds, staffId: st.id, personName: st.name })
                }
              } catch { /* ignore */ }
            },
          } : {}
          return (
            <div key={i} {...dropProps}
              style={{ borderLeft: '1px solid var(--a-line)', borderBottom: '1px solid var(--a-line)', padding: 6, minHeight: 64, display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', background: isOver ? `color-mix(in srgb, ${color} 12%, transparent)` : today ? 'rgba(74,107,86,0.05)' : 'transparent', outline: isOver ? `1.5px dashed ${color}` : 'none', outlineOffset: -2 }}>
              {items.length === 0 ? (
                isAdmin ? (
                  <button type="button" className="cell-add-btn" onClick={() => onAddShift?.({ date: ds, houseUuid: house?._uuid, staffName: st.name })}
                    aria-label={`Add shift for ${st.name} on ${d.dow} ${d.num}`}
                    style={{ margin: 'auto', width: 26, height: 26, borderRadius: 8, border: '1px dashed var(--a-line)', background: 'transparent', color: 'var(--a-ink3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isOver ? 1 : 0 }}>
                    <IconPlus size={14} sw={2} />
                  </button>
                ) : <div style={{ margin: 'auto', color: 'var(--a-ink3)', opacity: 0.4, fontSize: 12 }}>—</div>
              ) : items.map((s, j) => (
                <ShiftBlock key={s.id ?? j} shift={s} houseColor={color}
                  certFlag={certFlagFor(s, st)} offLeave={offLeave}
                  draggable={canDrag}
                  onDragStart={canDrag ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', JSON.stringify({ id: s.id, staffId: s.staffId, person: s.person, date: s.date })) } : undefined}
                  onClick={() => onShiftClick?.(s)} />
              ))}
            </div>
          )
        })}
      </>
    )
  }

  function HouseBand({ house, staffList }) {
    const hrs = staffList.reduce((a, st) => a + staffWeek(st).hours, 0)
    return (
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--a-bg)', borderTop: '1px solid var(--a-line)', borderBottom: '1px solid var(--a-line)' }}>
        <span style={{ width: 8, height: 18, borderRadius: 3, background: house.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--a-ink)' }}>{house.name}</span>
        <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>· {house.branch ? `${house.branch} · ` : ''}{staffList.length} staff · {fmtH(hrs)}</span>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div role="grid" aria-label="Week schedule by staff and day" style={{ display: 'grid', gridTemplateColumns: GRID_COLS, minWidth: MIN_W }}>

          {/* header row */}
          <div style={{ position: 'sticky', left: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--a-ink3)' }}>
            <IconPeople size={15} sw={1.6} /> Staff · {groups.length} house{groups.length === 1 ? '' : 's'}
          </div>
          {week.map((d, i) => (
            <div key={i} style={{ background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)' }}>{headerCell(d, i)}</div>
          ))}

          {/* per-house groups */}
          {groups.map(g => (
            <div key={g.house.id} style={{ display: 'contents' }}>
              <HouseBand house={g.house} staffList={g.staff} />
              {g.staff.map(st => <StaffRow key={st.id} st={st} house={g.house} />)}
            </div>
          ))}

          {looseStaff.length > 0 && (
            <div style={{ display: 'contents' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--a-bg)', borderTop: '1px solid var(--a-line)', borderBottom: '1px solid var(--a-line)' }}>
                <span style={{ width: 8, height: 18, borderRadius: 3, background: 'var(--a-ink3)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Unassigned staff</span>
                <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>· {looseStaff.length} staff</span>
              </div>
              {looseStaff.map(st => <StaffRow key={st.id} st={st} house={null} />)}
            </div>
          )}

          {/* ── OPEN-SHIFTS LANE (red/alert) ── */}
          {openShifts.length > 0 && (
            <div style={{ display: 'contents' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#fadcd7', borderTop: '1px solid var(--a-line)', borderBottom: '1px solid #e0b4ab' }}>
                <IconAlert size={15} sw={1.6} color="#a93a25" />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a93a25' }}>Open shifts · needs fill</span>
                <span style={{ fontSize: 12, color: '#a93a25', opacity: 0.85 }}>{openShifts.length} unfilled</span>
              </div>
              <div style={{ position: 'sticky', left: 0, zIndex: 4, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--a-line)', background: '#fadcd7' }}>
                <span className="avatar" aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0, background: 'var(--a-clay)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                  <IconPeople size={17} sw={1.7} color="#fff" />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#a93a25', lineHeight: 1.2 }}>Unassigned</div>
                  <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 1 }}>Needs fill</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div className="tnum" style={{ fontSize: 13, fontWeight: 600, color: '#a93a25' }}>{fmtH(openHours)}</div>
                  <div style={{ fontSize: 12, color: '#a93a25' }}>{openShifts.length} open</div>
                </div>
              </div>
              {week.map((d, i) => {
                const ds = toDateStr(d.date)
                const items = openByDate[ds] || []
                const today = ds === todayStr
                return (
                  <div key={i} style={{ borderLeft: '1px solid var(--a-line)', borderBottom: '1px solid var(--a-line)', padding: 6, minHeight: 64, display: 'flex', flexDirection: 'column', gap: 6, background: items.length ? 'rgba(169,58,37,0.05)' : today ? 'rgba(74,107,86,0.05)' : 'transparent' }}>
                    {items.map((s, j) => {
                      const clay = 'var(--a-clay)'
                      return (
                        <button key={s.id ?? j} type="button" onClick={() => onShiftClick?.(s)}
                          aria-label={`Open ${s.role || 'shift'}, ${timeRange(s.start, s.end)} on ${d.dow} ${d.num} — needs fill`}
                          style={{ width: '100%', display: 'block', textAlign: 'left', cursor: 'pointer', borderRadius: 8, padding: '6px 8px', background: 'transparent', border: '1.5px dashed var(--a-clay)', borderLeft: '3px dashed var(--a-clay)', fontFamily: 'Geist' }}>
                          <div className="tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-clay-text)', lineHeight: 1.15 }}>{timeRange(s.start, s.end)}</div>
                          <div style={{ fontSize: 12, color: 'var(--a-clay-text)', marginTop: 1 }}>{s.role || 'DSP'}{houseBySlug[s.house] ? ` · ${houseBySlug[s.house].name.replace(/ House| Run| Ridge/, '')}` : ''}</div>
                          <span style={{ marginTop: 4, display: 'inline-flex', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: clay, color: '#fff', alignSelf: 'flex-start' }}>Needs fill</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}
