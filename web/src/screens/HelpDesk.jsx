import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchTickets, createTicket, updateTicket,
} from '../lib/db'
import { IconChat, IconCheck, IconFlag } from '../components/icons'

// "Help Desk" screen — an internal ticketing module (HR, payroll, IT,
// maintenance, scheduling, urgent on-shift issues).
//   • staff: see their OWN tickets + a "New ticket" form.
//   • admins (supervisor/manager): see ALL tickets, filter by status, change
//     status (Open → In progress → Resolved) and set who it's assigned to.
// Color follows status discipline (good=sage, warn=amber, bad=clay, info=blue).
// Provides both the mobile (.phone-screen) and desktop (flex column) layouts in
// one component, switching on `desktop` (mirrors Updates / Knowledge).

const TOPICS = [
  { value: 'hr', label: 'HR' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'it', label: 'IT' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'other', label: 'Other' },
]
const TOPIC_LABEL = TOPICS.reduce((m, t) => { m[t.value] = t.label; return m }, {})

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Medium' },
  { value: 'high', label: 'High' },
]
const PRIORITY_LABEL = { low: 'Low', med: 'Medium', high: 'High' }

const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' }
const STATUS_ORDER = ['open', 'in_progress', 'resolved']
const NEXT_STATUS = { open: 'in_progress', in_progress: 'resolved', resolved: 'open' }
const NEXT_STATUS_LABEL = { open: 'Start', in_progress: 'Resolve', resolved: 'Reopen' }

// Admin filter chips → status value (null = all).
const FILTERS = [
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

function fmtDate(dateLike) {
  if (!dateLike) return ''
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return String(dateLike)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const card = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }
const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }

// status / priority → pill color (status discipline).
function statusPill(status) {
  if (status === 'resolved') return { bg: 'var(--a-sage)', fg: '#fff' }       // good
  if (status === 'in_progress') return { bg: '#3c5887', fg: '#fff' }          // info
  return { bg: '#b9892f', fg: '#fff' }                                        // warn (open)
}
function priorityPill(priority) {
  if (priority === 'high') return { bg: 'var(--a-clay)', fg: '#fff' }         // bad
  if (priority === 'med') return { bg: 'var(--a-paper)', fg: 'var(--a-ink2)' }
  return { bg: 'var(--a-paper)', fg: 'var(--a-ink3)' }
}

function Pill({ children, bg, fg }) {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
      background: bg, color: fg,
    }}>{String(children).toUpperCase()}</span>
  )
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
      {icon && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--a-ink3)' }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

// ── A single ticket card ─────────────────────────────────────────────────────
function TicketCard({ row, isAdmin, onChange }) {
  const [open, setOpen] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignVal, setAssignVal] = useState(row?.assigned_to_name || '')
  const sp = statusPill(row?.status)
  const pp = priorityPill(row?.priority)

  const advance = (e) => {
    e.stopPropagation()
    const next = NEXT_STATUS[row?.status] || 'open'
    onChange({ ...row, status: next })
    Promise.resolve(updateTicket(row.id, { status: next })).catch(() => {})
  }

  const saveAssign = (e) => {
    e?.stopPropagation?.()
    const name = assignVal.trim()
    setAssigning(false)
    if (name === (row?.assigned_to_name || '')) return
    onChange({ ...row, assigned_to_name: name || null })
    Promise.resolve(updateTicket(row.id, { assignedToName: name || null })).catch(() => {})
  }

  return (
    <div style={{ ...card, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 7 }}>
        <Pill bg="var(--a-paper)" fg="var(--a-ink2)">{TOPIC_LABEL[row?.topic] || 'Other'}</Pill>
        <Pill bg={pp.bg} fg={pp.fg}>{PRIORITY_LABEL[row?.priority] || 'Medium'}</Pill>
        <Pill bg={sp.bg} fg={sp.fg}>{STATUS_LABEL[row?.status] || 'Open'}</Pill>
      </div>

      <div className="serif" style={{ fontSize: 17, lineHeight: 1.25, color: 'var(--a-ink)', marginBottom: row?.body ? 6 : 0 }}>
        {row?.subject || 'Untitled ticket'}
      </div>

      {row?.body && (
        <div style={open
          ? { fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
          : { fontSize: 13.5, color: 'var(--a-ink2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
        }>
          {row.body}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 10 }}>
        {row?.created_by_name || 'Staff'} · {fmtDate(row?.created_at)}
        {row?.assigned_to_name ? ` · Assigned to ${row.assigned_to_name}` : ''}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          <button onClick={advance} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '8px 14px',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>
            {row?.status === 'resolved'
              ? <IconFlag size={13} sw={1.6} color="var(--a-card)" />
              : <IconCheck size={13} sw={2} color="var(--a-card)" />}
            {NEXT_STATUS_LABEL[row?.status] || 'Start'}
          </button>

          {assigning ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 160 }}>
              <input value={assignVal} onChange={e => setAssignVal(e.target.value)} autoFocus
                placeholder="Assign to…" style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} />
              <button onClick={saveAssign} style={{
                flexShrink: 0, background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
                borderRadius: 999, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
              }}>Save</button>
            </div>
          ) : (
            <button onClick={() => { setAssignVal(row?.assigned_to_name || ''); setAssigning(true) }} style={{
              background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
              borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
            }}>{row?.assigned_to_name ? 'Reassign' : 'Assign'}</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Ticket list ──────────────────────────────────────────────────────────────
function TicketList({ rows, loading, isAdmin, filter, onChange, emptyTitle, emptySub }) {
  const list = useMemo(() => {
    const all = (rows || []).filter(Boolean)
    if (!filter) return all
    return all.filter(r => r?.status === filter)
  }, [rows, filter])

  return (
    <>
      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState icon={<IconChat size={30} sw={1.4} color="var(--a-ink3)" />}
          title={emptyTitle} sub={emptySub} />
      )}
      {list.map(r => (
        <TicketCard key={r.id} row={r} isAdmin={isAdmin} onChange={onChange} />
      ))}
    </>
  )
}

// ── New ticket (staff + admins) ──────────────────────────────────────────────
function Compose({ orgId, houseId, staffId, staffName, onCreated, onCancel }) {
  const [topic, setTopic] = useState('it')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('med')
  const [saving, setSaving] = useState(false)

  const canSave = subject.trim() && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSave || !orgId) return
    setSaving(true)
    let row = null
    try {
      row = await Promise.resolve(createTicket(orgId, {
        houseId: houseId || null,
        topic,
        subject: subject.trim(),
        body: body.trim(),
        priority,
        createdByName: staffName,
        createdByStaffId: staffId,
      })).catch(() => null)
    } catch { row = null }
    setSaving(false)
    onCreated(row)
  }

  return (
    <form onSubmit={submit}>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Topic */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>TOPIC</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {TOPICS.map(t => {
              const on = topic === t.value
              return (
                <button key={t.value} type="button" onClick={() => setTopic(t.value)} style={{
                  padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                  background: on ? 'var(--a-ink)' : 'var(--a-card)',
                  color: on ? 'var(--a-card)' : 'var(--a-ink2)',
                  border: `1px solid ${on ? 'var(--a-ink)' : 'var(--a-line)'}`,
                }}>{t.label}</button>
              )
            })}
          </div>
        </div>

        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />

        <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="Describe the issue…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

        {/* Priority */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>PRIORITY</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
            {PRIORITIES.map(p => {
              const active = priority === p.value
              return (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 0, fontSize: 13, fontWeight: 600, fontFamily: 'Geist',
                  cursor: 'pointer',
                  background: active ? 'var(--a-card)' : 'transparent',
                  color: active ? (p.value === 'high' ? 'var(--a-clay)' : 'var(--a-ink)') : 'var(--a-ink2)',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}>{p.label}</button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!canSave} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
          }}>{saving ? 'Submitting…' : 'Submit ticket'}</button>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{
              background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
              padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
            }}>Cancel</button>
          )}
        </div>
      </div>
    </form>
  )
}

export function ScreenA_HelpDesk({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  // Admins: status-filter chips over ALL tickets. Staff: My tickets · New ticket.
  const tabs = isAdmin ? ['All', ...FILTERS.map(f => f.label)] : ['My tickets', 'New ticket']
  const [tab, setTab] = useState(isAdmin ? 'All' : 'My tickets')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.resolve(fetchTickets(orgId, { houseId, role, staffId }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, role, staffId])

  useEffect(() => { load() }, [load])

  // Keep tab valid if role changes.
  useEffect(() => { setTab(isAdmin ? 'All' : 'My tickets') }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = useCallback((next) => {
    setRows(prev => (prev || []).map(x => x && x.id === next.id ? next : x))
  }, [])

  const onCreated = (row) => {
    setTab('My tickets')
    if (row) setRows(prev => [row, ...(prev || [])])
    else load()
  }

  // Staff only ever see their own tickets (belt-and-suspenders over the query).
  const myRows = useMemo(
    () => (rows || []).filter(r => r && r.created_by_staff_id === staffId),
    [rows, staffId],
  )

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
    if (!isAdmin && tab === 'New ticket') {
      return (
        <Compose orgId={orgId} houseId={houseId} staffId={staffId} staffName={staffName}
          onCreated={onCreated} onCancel={() => setTab('My tickets')} />
      )
    }
    if (!isAdmin) {
      return (
        <TicketList rows={myRows} loading={loading} isAdmin={false} filter={null} onChange={onChange}
          emptyTitle="No tickets yet."
          emptySub="Open one from “New ticket” — HR, payroll, IT, maintenance, scheduling." />
      )
    }
    // Admin: 'All' → no filter; otherwise map chip label → status.
    const f = FILTERS.find(x => x.label === tab)
    const filter = f ? f.value : null
    return (
      <TicketList rows={rows} loading={loading} isAdmin={true} filter={filter} onChange={onChange}
        emptyTitle={filter ? `No ${STATUS_LABEL[filter].toLowerCase()} tickets.` : 'No tickets yet.'}
        emptySub={filter ? undefined : 'Tickets from your team will show up here.'} />
    )
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: 10 }}>Help Desk</div>
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
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Help Desk</div>
      </div>
      <Chips />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
