import { useState, useEffect, useRef, useMemo } from 'react'
import {
  fetchClockedInNow, fetchPunches, fetchShifts,
  requestShiftEdit, fetchShiftEditRequests, reviewShiftEditRequest,
} from '../lib/db'
import {
  fmtHM, periodRange, shiftPrevPeriod, shiftNextPeriod,
  overtimeFor, buildTimesheet, punchWorked,
} from '../lib/timesheet'
import { TimeOffPanel } from '../components/TimeOffPanel'

// "Time clock + Timesheets + Approvals" screen. Role-aware:
//   • admins (supervisor/manager): Who's in · Timesheets · Requests
//   • staff: My timesheet · Requests
// Provides both the mobile (.phone-screen) and desktop (flex column) layouts in
// one component, switching on `desktop` (mirrors TeamChat).

function fmtClock(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`
}

function fmtDate(dateLike) {
  if (!dateLike) return ''
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return String(dateLike)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtWeekday(dateLike) {
  if (!dateLike) return ''
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

// Live elapsed "H:MM" since an ISO time (whole minutes, ticks once a minute).
function fmtElapsedHM(fromIso, nowMs) {
  if (!fromIso) return '0:00'
  const start = new Date(fromIso).getTime()
  let s = Math.max(0, Math.floor((nowMs - start) / 1000))
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

// Deterministic-ish color from a name for avatar circles.
const AVATAR_COLORS = ['var(--a-sage)', 'var(--a-clay)', '#3c5887', '#a47012', '#2f9489', '#8a5a9e']
function colorFor(name) {
  const s = String(name || '?')
  let n = 0
  for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[n]
}

function Avatar({ name, size = 34 }) {
  const initial = (String(name || '?').trim()[0] || '?').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: colorFor(name), color: '#fff', fontWeight: 700,
      fontSize: size * 0.42, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{initial}</div>
  )
}

const STATUS_BADGE = {
  pending:  { label: 'Pending',  bg: '#f5e9d6', tc: '#a47012' },
  approved: { label: 'Approved', bg: 'rgba(110,140,110,0.18)', tc: 'var(--a-sage)' },
  rejected: { label: 'Rejected', bg: 'rgba(169,58,37,0.14)', tc: 'var(--a-clay)' },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.pending
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: s.tc, background: s.bg, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.03em' }}>
      {s.label}
    </span>
  )
}

const card = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }
const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
const diffColor = (h) => h > 0.0001 ? 'var(--a-sage)' : h < -0.0001 ? 'var(--a-clay)' : 'var(--a-ink3)'

function EmptyState({ emoji, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
      {emoji && <div style={{ fontSize: 30, marginBottom: 10 }}>{emoji}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

// ── Who's in (admin): live attendance board ──────────────────────────────────
function WhoseIn({ orgId, houseId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    let stop = false
    const load = () => Promise.resolve(fetchClockedInNow(orgId, { houseId }))
      .then(r => { if (!stop) { setRows(r || []); setLoading(false) } })
      .catch(() => { if (!stop) setLoading(false) })
    load()
    const iv = setInterval(load, 5000)
    return () => { stop = true; clearInterval(iv) }
  }, [orgId, houseId])

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const list = rows || []

  return (
    <div>
      <div style={{ ...card, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div className="serif" style={{ fontSize: 34, lineHeight: 1, color: 'var(--a-sage)' }}>{list.length}</div>
        <div style={{ fontSize: 13, color: 'var(--a-ink2)' }}>
          {list.length === 1 ? 'person clocked in now' : 'clocked in now'}
        </div>
      </div>

      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && list.length === 0 && (
        <EmptyState emoji="🌙" title="Nobody is clocked in right now." sub="Live status updates as staff punch in." />
      )}

      {list.map(p => (
        <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={p.staff_name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--a-ink)' }}>{p.staff_name || 'Staff'}</div>
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 1 }}>
              {p.role || 'staff'} · since {fmtClock(p.clock_in_at)}
              {p.in_lat != null && <span> · 📍</span>}
            </div>
          </div>
          <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 700, color: 'var(--a-sage)' }}>
            {fmtElapsedHM(p.clock_in_at, now)}
          </div>
        </div>
      ))}
    </div>
  )
}

// Period grid shared by admin "Timesheets" and staff "My timesheet". When
// `singleStaff` is true the Approve button is hidden.
function PeriodGrid({ orgId, houseId, staffId, singleStaff }) {
  const [range, setRange] = useState(() => periodRange(new Date()))
  const [punches, setPunches] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [approved, setApproved] = useState({})

  useEffect(() => {
    if (!orgId || !range) { setLoading(false); return }
    let stop = false
    setLoading(true)
    const loadPunches = Promise.resolve(
      fetchPunches(orgId, { houseId, staffId: singleStaff ? staffId : undefined, from: range.start, to: range.end })
    ).catch(() => [])

    // Scheduled hours: pull shifts for each of the 7 period days and flatten.
    const days = []
    const startD = range.start ? new Date(range.start) : null
    if (startD && !isNaN(startD.getTime())) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(startD)
        d.setDate(startD.getDate() + i)
        days.push(d)
      }
    }
    const loadShifts = Promise.all(days.map(day =>
      Promise.resolve(fetchShifts(orgId, houseId, day))
        .then(list => (list || []).map(s => ({ ...s, date: day })))
        .catch(() => [])
    )).then(arrs => arrs.flat()).catch(() => [])

    Promise.all([loadPunches, loadShifts]).then(([p, s]) => {
      if (stop) return
      setPunches(p || [])
      setShifts(s || [])
      setLoading(false)
    })
    return () => { stop = true }
  }, [orgId, houseId, staffId, singleStaff, range?.start, range?.end])

  const sheet = useMemo(() => {
    try { return buildTimesheet(punches || [], shifts || [], range) || {} }
    catch { return {} }
  }, [punches, shifts, range])

  // buildTimesheet shape is unknown precisely; normalize to an array of staff.
  const staffRows = useMemo(() => {
    if (Array.isArray(sheet)) return sheet
    if (Array.isArray(sheet?.staff)) return sheet.staff
    if (Array.isArray(sheet?.rows)) return sheet.rows
    if (sheet && typeof sheet === 'object') {
      const vals = Object.values(sheet).filter(v => v && typeof v === 'object' && (v.days || v.staffName || v.staff_name || v.name))
      if (vals.length) return vals
    }
    return []
  }, [sheet])

  const rangeLabel = range?.label || ''

  return (
    <div>
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button onClick={() => setRange(r => shiftPrevPeriod(r) || r)} aria-label="Previous period" style={navBtn}>‹</button>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)', textAlign: 'center', flex: 1 }}>{rangeLabel || 'Pay period'}</div>
        <button onClick={() => setRange(r => shiftNextPeriod(r) || r)} aria-label="Next period" style={navBtn}>›</button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && staffRows.length === 0 && (
        <EmptyState emoji="🗓️" title={singleStaff ? 'No hours logged this period yet.' : 'No timesheet data for this period yet.'}
          sub={singleStaff ? 'Your worked hours will show up here.' : undefined} />
      )}

      {!loading && staffRows.map((row, i) => (
        <StaffSheetCard key={row?.staffId || row?.staff_id || row?.name || i}
          row={row} singleStaff={singleStaff}
          approved={!!approved[row?.staffId || row?.staff_id || i]}
          onApprove={() => setApproved(a => ({ ...a, [row?.staffId || row?.staff_id || i]: true }))} />
      ))}
    </div>
  )
}

const navBtn = {
  width: 32, height: 32, borderRadius: 999, border: '1px solid var(--a-line)', background: 'var(--a-card)',
  color: 'var(--a-ink2)', fontSize: 18, lineHeight: 1, cursor: 'pointer', fontFamily: 'Geist', flexShrink: 0,
}

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n }

function StaffSheetCard({ row, singleStaff, approved, onApprove }) {
  const name = row?.name || row?.staffName || row?.staff_name || 'Staff'
  const role = row?.role || ''
  const days = Array.isArray(row?.days) ? row.days : []

  // Totals: prefer fields buildTimesheet supplies, else derive from days.
  const totalWorked = row?.totalWorked != null ? num(row.totalWorked)
    : row?.worked != null ? num(row.worked)
    : days.reduce((s, d) => s + num(d?.worked), 0)
  const totalScheduled = row?.scheduled != null ? num(row.scheduled)
    : row?.totalScheduled != null ? num(row.totalScheduled)
    : days.reduce((s, d) => s + num(d?.scheduled), 0)
  const overtime = row?.overtime != null ? num(row.overtime)
    : (() => { try { return num(overtimeFor(totalWorked)) } catch { return 0 } })()
  const diff = row?.difference != null ? num(row.difference)
    : row?.diff != null ? num(row.diff)
    : (totalWorked - totalScheduled)

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar name={name} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--a-ink)' }}>{name}</div>
          {role && <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{role}</div>}
        </div>
        {!singleStaff && (
          approved ? (
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a-sage)' }}>Approved ✓</span>
          ) : (
            <button onClick={onApprove} style={{
              padding: '6px 14px', borderRadius: 999, border: 0, background: 'var(--a-sage)', color: '#fff',
              fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', flexShrink: 0,
            }}>Approve</button>
          )
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <Stat label="Total" value={fmtHM(totalWorked)} />
        {!singleStaff && <Stat label="Scheduled" value={fmtHM(totalScheduled)} />}
        <Stat label="Overtime" value={fmtHM(overtime)} color={overtime > 0.0001 ? 'var(--a-clay)' : 'var(--a-ink)'} />
        {!singleStaff && <Stat label="Difference" value={fmtHM(diff)} color={diffColor(diff)} />}
      </div>

      {days.length > 0 && (
        <div style={{ borderTop: '1px solid var(--a-line)', paddingTop: 8 }}>
          <div style={{ display: 'flex', fontSize: 9.5, color: 'var(--a-ink3)', fontWeight: 700, letterSpacing: '0.04em', padding: '0 0 4px' }}>
            <span style={{ flex: 1.4 }}>DAY</span>
            <span style={{ flex: 1, textAlign: 'right' }}>WORKED</span>
            <span style={{ flex: 1, textAlign: 'right' }}>SCHED</span>
            <span style={{ flex: 1, textAlign: 'right' }}>DIFF</span>
          </div>
          {days.map((d, i) => {
            const w = num(d?.worked), sc = num(d?.scheduled)
            const dd = d?.difference != null ? num(d.difference) : d?.diff != null ? num(d.diff) : (w - sc)
            const label = d?.label || (d?.date ? `${fmtWeekday(d.date)} ${fmtDate(d.date)}` : `Day ${i + 1}`)
            return (
              <div key={d?.date || d?.label || i} style={{ display: 'flex', fontSize: 12, padding: '4px 0', color: 'var(--a-ink2)' }}>
                <span style={{ flex: 1.4, color: 'var(--a-ink)' }}>{label}</span>
                <span style={{ flex: 1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtHM(w)}</span>
                <span style={{ flex: 1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtHM(sc)}</span>
                <span style={{ flex: 1, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: diffColor(dd) }}>{fmtHM(dd)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, minWidth: 70, background: 'var(--a-paper)', borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ fontSize: 9.5, color: 'var(--a-ink3)', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 2 }}>{String(label).toUpperCase()}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || 'var(--a-ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

// ── Requests (admin): approvals ───────────────────────────────────────────────
function AdminRequests({ orgId, houseId, user }) {
  const [pending, setPending] = useState([])
  const [decided, setDecided] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.all([
      Promise.resolve(fetchShiftEditRequests(orgId, { houseId, status: 'pending' })).catch(() => []),
      Promise.resolve(fetchShiftEditRequests(orgId, { houseId })).catch(() => []),
    ]).then(([p, all]) => {
      setPending(p || [])
      setDecided((all || []).filter(r => r && r.status && r.status !== 'pending'))
      setLoading(false)
    })
  }

  useEffect(() => { let stop = false; load().finally(() => {}); return () => { stop = true } }, [orgId, houseId])

  const review = async (id, status) => {
    setPending(prev => (prev || []).filter(r => r.id !== id))
    try { await reviewShiftEditRequest(id, { status, decidedByName: user?.name }) } catch { /* ignore */ }
    load()
  }

  return (
    <div>
      {loading && pending.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && (pending || []).length === 0 && (decided || []).length === 0 && (
        <EmptyState emoji="🎉" title="No pending requests." />
      )}

      {(pending || []).map(r => (
        <div key={r.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar name={r.staff_name} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)' }}>{r.staff_name || 'Staff'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>{fmtDate(r.target_date)}</div>
            </div>
            <StatusBadge status="pending" />
          </div>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginBottom: 4 }}>
            {fmtClock(r.requested_in)} → {fmtClock(r.requested_out)}
          </div>
          {r.reason && <div style={{ fontSize: 12.5, color: 'var(--a-ink3)', lineHeight: 1.45, marginBottom: 10 }}>{r.reason}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => review(r.id, 'approved')} style={{
              flex: 1, padding: '9px', borderRadius: 999, border: 0, background: 'var(--a-sage)', color: '#fff',
              fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
            }}>Approve</button>
            <button onClick={() => review(r.id, 'rejected')} style={{
              flex: 1, padding: '9px', borderRadius: 999, background: 'transparent', color: 'var(--a-clay)',
              border: '1px solid var(--a-clay)', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
            }}>Reject</button>
          </div>
        </div>
      ))}

      {(decided || []).length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', margin: '14px 0 8px' }}>DECIDED</div>
          {(decided || []).map(r => (
            <div key={r.id} style={{ ...card, opacity: 0.75 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={r.staff_name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{r.staff_name || 'Staff'}</div>
                  <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{fmtDate(r.target_date)} · {fmtClock(r.requested_in)}–{fmtClock(r.requested_out)}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ── Requests (staff): submit + list own ──────────────────────────────────────
function StaffRequests({ orgId, houseId, staffId, staffName }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(todayStr)
  const [inTime, setInTime] = useState('09:00')
  const [outTime, setOutTime] = useState('17:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [mine, setMine] = useState([])

  const load = () => {
    if (!orgId) return Promise.resolve()
    return Promise.resolve(fetchShiftEditRequests(orgId, { houseId }))
      .then(rows => setMine((rows || []).filter(r => r && (r.staff_id === staffId || r.staff_name === staffName))))
      .catch(() => {})
  }

  useEffect(() => { load() }, [orgId, houseId, staffId, staffName])

  const toISO = (d, t) => {
    try { const iso = new Date(`${d}T${t}`).toISOString(); return iso } catch { return null }
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!orgId || !date || saving) return
    setSaving(true)
    try {
      const row = await requestShiftEdit(orgId, {
        houseId, staffId, staffName,
        targetDate: date,
        requestedIn: toISO(date, inTime),
        requestedOut: toISO(date, outTime),
        reason: reason.trim(),
      })
      setReason('')
      if (row) setMine(prev => [row, ...(prev || [])])
      else load()
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div>
      <form onSubmit={submit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)' }}>Request a timesheet edit</div>
        <label style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, fontSize: 11.5, color: 'var(--a-ink3)' }}>Clock in
            <input type="time" value={inTime} onChange={e => setInTime(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
          <label style={{ flex: 1, fontSize: 11.5, color: 'var(--a-ink3)' }}>Clock out
            <input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
        </div>
        <label style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Reason
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Why does this need to change?"
            style={{ ...inputStyle, marginTop: 4, resize: 'vertical', fontFamily: 'Geist' }} />
        </label>
        <button type="submit" disabled={saving || !orgId} style={{
          background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '11px',
          fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Submitting…' : 'Submit request'}</button>
      </form>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', margin: '4px 0 8px' }}>YOUR REQUESTS</div>
      {(mine || []).length === 0 && (
        <EmptyState title="No requests yet." sub="Submit one above and it’ll show here." />
      )}
      {(mine || []).map(r => (
        <div key={r.id} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{fmtDate(r.target_date)}</div>
            <StatusBadge status={r.status} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--a-ink2)' }}>{fmtClock(r.requested_in)} → {fmtClock(r.requested_out)}</div>
          {r.reason && <div style={{ fontSize: 12, color: 'var(--a-ink3)', lineHeight: 1.45, marginTop: 4 }}>{r.reason}</div>}
        </div>
      ))}
    </div>
  )
}

export function ScreenA_Timesheets({ user, desktop = false, houses = [] }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  // Manager views are scoped to their own house; supervisors see all houses.
  const scopeHouse = role === 'manager' ? houseId : null

  const tabs = isAdmin ? ['Who’s in', 'Timesheets', 'Requests', 'Time off'] : ['My timesheet', 'Requests', 'Time off']
  const [tab, setTab] = useState(tabs[0])

  // Keep tab valid if role changes.
  useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]) }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const Chips = () => (
    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: desktop ? '0 0 4px' : '0 22px 6px' }}>
      {tabs.map(t => (
        <button key={t} onClick={() => setTab(t)} style={{
          flexShrink: 0, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
          cursor: 'pointer', whiteSpace: 'nowrap',
          background: tab === t ? 'var(--a-ink)' : 'var(--a-card)',
          color: tab === t ? 'var(--a-card)' : 'var(--a-ink2)',
          border: `1px solid ${tab === t ? 'var(--a-ink)' : 'var(--a-line)'}`,
        }}>{t}</button>
      ))}
    </div>
  )

  const Body = () => {
    if (tab === 'Time off') return <TimeOffPanel user={user} desktop={desktop} />
    if (isAdmin) {
      if (tab === 'Who’s in') return <WhoseIn orgId={orgId} houseId={scopeHouse} />
      if (tab === 'Timesheets') return <PeriodGrid orgId={orgId} houseId={scopeHouse} staffId={staffId} singleStaff={false} />
      return <AdminRequests orgId={orgId} houseId={scopeHouse} user={user} />
    }
    if (tab === 'My timesheet') return <PeriodGrid orgId={orgId} houseId={null} staffId={staffId} singleStaff={true} />
    return <StaffRequests orgId={orgId} houseId={houseId} staffId={staffId} staffName={staffName} />
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: 10 }}>Time clock</div>
          <Chips />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 28px' }}>
          <Body />
        </div>
      </div>
    )
  }

  return (
    <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 22px 8px' }}>
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Time</div>
      </div>
      <Chips />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
