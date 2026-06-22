import { useState, useEffect } from 'react'
import { requestTimeOff, fetchTimeOffRequests, reviewTimeOffRequest } from '../lib/db'

// Role-aware time-off panel embedded as a chip-panel inside the Time screen.
// Renders only its inner content (no .phone-screen, no title) — just a <div> root.
//   • staff: a request form + a list of their own requests
//   • admins (supervisor/manager): a pending approval queue + a "Decided" list
// Style mirrors Timesheets.jsx (Avatar / EmptyState / StatusBadge / card / inputStyle).

// ── small helpers (kept local, mirroring Timesheets.jsx) ─────────────────────
function fmtDate(dateLike) {
  if (!dateLike) return ''
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return String(dateLike)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtRange(start, end) {
  const a = fmtDate(start)
  const b = fmtDate(end)
  if (!a && !b) return ''
  if (!b || a === b) return a
  return `${a} – ${b}`
}

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

const KINDS = {
  vacation: { label: 'Vacation', color: 'var(--a-sage)' },
  sick:     { label: 'Sick',     color: 'var(--a-clay)' },
  personal: { label: 'Personal', color: '#3c5887' },
  unpaid:   { label: 'Unpaid',   color: 'var(--a-ink3)' },
}
const KIND_ORDER = ['vacation', 'sick', 'personal', 'unpaid']

const card = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }
const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }

function EmptyState({ emoji, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
      {emoji && <div style={{ fontSize: 30, marginBottom: 10 }}>{emoji}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

function KindTag({ kind }) {
  const k = KINDS[kind] || { label: kind || 'Time off', color: 'var(--a-ink3)' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: k.color, letterSpacing: '0.02em' }}>{k.label}</span>
  )
}

// ── Staff: request form + own requests ───────────────────────────────────────
function StaffTimeOff({ orgId, houseId, staffId, staffName, pad }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [kind, setKind] = useState('vacation')
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [hours, setHours] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [mine, setMine] = useState([])

  const load = () => {
    if (!orgId) return Promise.resolve()
    return Promise.resolve(fetchTimeOffRequests(orgId, { houseId }))
      .then(rows => setMine((rows || []).filter(r => r && (r.staff_id === staffId || r.staff_name === staffName))))
      .catch(() => {})
  }

  useEffect(() => { load() }, [orgId, houseId, staffId, staffName]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!orgId || !startDate || saving) return
    setSaving(true)
    try {
      const h = hours === '' ? null : Number(hours)
      const row = await Promise.resolve(requestTimeOff(orgId, {
        houseId, staffId, staffName,
        kind,
        startDate,
        endDate: endDate || startDate,
        hours: (h != null && !isNaN(h)) ? h : null,
        reason: reason.trim(),
      })).catch(() => null)
      setReason('')
      setHours('')
      if (row) setMine(prev => [row, ...(prev || [])])
      else load()
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div>
      <form onSubmit={submit} style={{ ...card, padding: pad, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)' }}>Request time off</div>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {KIND_ORDER.map(k => {
            const active = kind === k
            return (
              <button key={k} type="button" onClick={() => setKind(k)} style={{
                flexShrink: 0, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
                cursor: 'pointer', whiteSpace: 'nowrap',
                background: active ? 'var(--a-ink)' : 'var(--a-card)',
                color: active ? 'var(--a-card)' : 'var(--a-ink2)',
                border: `1px solid ${active ? 'var(--a-ink)' : 'var(--a-line)'}`,
              }}>{KINDS[k].label}</button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, fontSize: 11.5, color: 'var(--a-ink3)' }}>Start
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
          <label style={{ flex: 1, fontSize: 11.5, color: 'var(--a-ink3)' }}>End
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
          </label>
        </div>

        <label style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Hours (optional)
          <input type="number" min="0" step="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 8"
            style={{ ...inputStyle, marginTop: 4 }} />
        </label>

        <label style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Reason
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Anything your supervisor should know?"
            style={{ ...inputStyle, marginTop: 4, resize: 'vertical', fontFamily: 'Geist' }} />
        </label>

        <button type="submit" disabled={saving || !orgId} style={{
          background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '11px',
          fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
        }}>{saving ? 'Submitting…' : 'Submit request'}</button>
      </form>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', margin: '4px 0 8px' }}>YOUR REQUESTS</div>
      {(mine || []).length === 0 && (
        <EmptyState title="No time-off requests." sub="Submit one above and it’ll show here." />
      )}
      {(mine || []).map(r => (
        <div key={r.id} style={{ ...card, padding: pad }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <KindTag kind={r.kind} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{fmtRange(r.start_date, r.end_date)}</span>
            </div>
            <StatusBadge status={r.status} />
          </div>
          {r.hours != null && <div style={{ fontSize: 12, color: 'var(--a-ink3)' }}>{r.hours} hrs</div>}
          {r.reason && <div style={{ fontSize: 12, color: 'var(--a-ink3)', lineHeight: 1.45, marginTop: 4 }}>{r.reason}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Admin: pending queue + decided list ──────────────────────────────────────
function AdminTimeOff({ orgId, scopeHouse, user, pad }) {
  const [pending, setPending] = useState([])
  const [decided, setDecided] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.all([
      Promise.resolve(fetchTimeOffRequests(orgId, { houseId: scopeHouse, status: 'pending' })).catch(() => []),
      Promise.resolve(fetchTimeOffRequests(orgId, { houseId: scopeHouse })).catch(() => []),
    ]).then(([p, all]) => {
      setPending(p || [])
      setDecided((all || []).filter(r => r && r.status && r.status !== 'pending'))
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [orgId, scopeHouse]) // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (id, status) => {
    setPending(prev => (prev || []).filter(r => r.id !== id))
    try { await Promise.resolve(reviewTimeOffRequest(id, { status, decidedByName: user?.name })).catch(() => null) } catch { /* ignore */ }
    load()
  }

  return (
    <div>
      {loading && (pending || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && (pending || []).length === 0 && (decided || []).length === 0 && (
        <EmptyState emoji="🎉" title="No time-off requests." />
      )}

      {!loading && (pending || []).length === 0 && (decided || []).length > 0 && (
        <EmptyState emoji="🎉" title="No pending time-off. 🎉" />
      )}

      {(pending || []).map(r => (
        <div key={r.id} style={{ ...card, padding: pad }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar name={r.staff_name} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)' }}>{r.staff_name || 'Staff'}</div>
              <div style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>
                <KindTag kind={r.kind} /> · {fmtRange(r.start_date, r.end_date)}
                {r.hours != null && <span> · {r.hours} hrs</span>}
              </div>
            </div>
            <StatusBadge status="pending" />
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
            <div key={r.id} style={{ ...card, padding: pad, opacity: 0.75 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={r.staff_name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{r.staff_name || 'Staff'}</div>
                  <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>
                    <KindTag kind={r.kind} /> · {fmtRange(r.start_date, r.end_date)}
                  </div>
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

export function TimeOffPanel({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'
  const scopeHouse = role === 'manager' ? houseId : null

  // desktop only tweaks padding.
  const pad = desktop ? '16px 18px' : '14px 16px'

  return (
    <div>
      {isAdmin
        ? <AdminTimeOff orgId={orgId} scopeHouse={scopeHouse} user={user} pad={pad} />
        : <StaffTimeOff orgId={orgId} houseId={houseId} staffId={staffId} staffName={staffName} pad={pad} />}
    </div>
  )
}
