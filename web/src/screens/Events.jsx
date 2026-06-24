import { useState, useEffect, useCallback } from 'react'
import {
  fetchEvents, createEvent, rsvpEvent, archiveEvent, deleteEvent,
} from '../lib/db'
import { IconStar, IconCal, IconCheck } from '../components/icons'

// "Events" screen — trainings, house meetings, appointments with sign-ups.
// Role-aware:
//   • admins (supervisor/manager): Upcoming · Past · New event
//   • staff: Upcoming · Past
// Each event has a colored "kind" pill, a date/time line, an optional location,
// a capacity/attendance line, and RSVP buttons (optimistic). Provides both the
// mobile (.phone-screen) and desktop (flex column) layouts in one component,
// switching on `desktop` (mirrors Updates).

// Colors for each "kind" pill.
const KIND = {
  training:    { label: 'Training',    color: '#3c5887' },
  meeting:     { label: 'Meeting',     color: 'var(--a-sage)' },
  appointment: { label: 'Appointment', color: '#b9892f' },
  social:      { label: 'Social',      color: 'var(--a-clay)' },
}
const KIND_KEYS = ['training', 'meeting', 'appointment', 'social']

function fmtWhen(dateLike) {
  if (!dateLike) return ''
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return String(dateLike)
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

const card = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }
const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
      {icon && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

// ── A single event card ──────────────────────────────────────────────────────
function EventCard({ row, staffId, staffName, orgId, isAdmin, isPast, onChange, onArchive, onDelete }) {
  const k = KIND[row?.kind] || { label: row?.kind || 'Event', color: 'var(--a-ink2)' }
  const goingCount = Number(row?._goingCount) || 0
  const capacity = row?.capacity == null ? null : Number(row.capacity)
  const spotsLeft = row?._spotsLeft == null ? null : Number(row._spotsLeft)
  const myRsvp = row?._myRsvp || null
  const isGoing = myRsvp === 'going'
  const isDeclined = myRsvp === 'declined'
  const isFull = capacity != null && spotsLeft != null && spotsLeft <= 0 && !isGoing

  const setRsvp = (status) => {
    if (isPast) return
    if (myRsvp === status) return
    if (status === 'going' && isFull) return
    // Optimistic local update (mirrors Updates poll vote).
    const wasGoing = myRsvp === 'going'
    let nextGoing = goingCount
    if (status === 'going' && !wasGoing) nextGoing = goingCount + 1
    if (status === 'declined' && wasGoing) nextGoing = Math.max(0, goingCount - 1)
    const nextSpots = capacity == null ? null : Math.max(0, capacity - nextGoing)
    onChange({ ...row, _myRsvp: status, _goingCount: nextGoing, _spotsLeft: nextSpots })
    Promise.resolve(rsvpEvent(orgId, { eventId: row.id, staffId, staffName, status })).catch(() => {})
  }

  const remove = () => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return
    onDelete(row.id)
    Promise.resolve(deleteEvent(row.id)).catch(() => {})
  }

  const archive = () => {
    onArchive(row.id)
    Promise.resolve(archiveEvent(row.id)).catch(() => {})
  }

  const attendance = capacity != null
    ? `${goingCount} going · ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`
    : `${goingCount} going`

  const rsvpBtn = (status, label) => {
    const active = myRsvp === status
    const disabled = isPast || (status === 'going' && isFull)
    let bg = 'var(--a-card)', col = 'var(--a-ink2)', bd = 'var(--a-line)'
    if (active && status === 'going') { bg = 'var(--a-sage)'; col = '#fff'; bd = 'var(--a-sage)' }
    else if (active && status === 'declined') { bg = 'var(--a-paper)'; col = 'var(--a-ink3)'; bd = 'var(--a-line)' }
    return (
      <button type="button" disabled={disabled} onClick={() => setRsvp(status)} style={{
        flex: 1, padding: '9px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: 'Geist',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        background: bg, color: col, border: `1px solid ${bd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        {active && status === 'going' && <IconCheck size={14} color="#fff" />}
        {label}
      </button>
    )
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
            padding: '2px 8px', borderRadius: 999, color: '#fff', background: k.color, marginBottom: 6,
          }}>{k.label.toUpperCase()}</span>
          {row?.title && (
            <div className="serif" style={{ fontSize: 17, lineHeight: 1.2, color: 'var(--a-ink)' }}>{row.title}</div>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {!isPast && row?.status !== 'archived' && (
              <button onClick={archive} aria-label="Archive event" title="Archive" style={{
                background: 'transparent', border: 0, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                padding: '2px 6px', color: 'var(--a-ink3)', fontFamily: 'Geist',
              }}>Archive</button>
            )}
            <button onClick={remove} aria-label="Delete event" style={{
              background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1,
              padding: '2px 4px', color: 'var(--a-ink3)',
            }}>✕</button>
          </div>
        )}
      </div>

      {/* When */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, color: 'var(--a-ink2)' }}>
        <IconCal size={15} color="var(--a-ink3)" />
        <span>{fmtWhen(row?.event_at)}</span>
      </div>

      {/* Location */}
      {row?.location && (
        <div style={{ fontSize: 12.5, color: 'var(--a-ink3)', marginTop: 4 }}>{row.location}</div>
      )}

      {/* Attendance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--a-ink3)', marginTop: 6 }}>
        <IconStar size={14} color="var(--a-ink3)" />
        <span>{attendance}</span>
      </div>

      {/* RSVP */}
      {!isPast && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {rsvpBtn('going', "I'm going")}
          {rsvpBtn('declined', "Can't go")}
        </div>
      )}
      {!isPast && isFull && !isGoing && (
        <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 6, textAlign: 'center' }}>This event is full.</div>
      )}
      {isPast && isGoing && (
        <div style={{ fontSize: 11.5, color: 'var(--a-sage)', fontWeight: 600, marginTop: 10 }}>You attended ✓</div>
      )}
      {isPast && isDeclined && (
        <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 10 }}>You didn't attend.</div>
      )}
    </div>
  )
}

// ── List (everyone) ──────────────────────────────────────────────────────────
function EventList({ orgId, staffId, staffName, isAdmin, isPast, rows, setRows, loading }) {
  const updateRow = useCallback((next) => {
    setRows(prev => (prev || []).map(x => x && x.id === next.id ? next : x))
  }, [setRows])

  const removeRow = useCallback((id) => {
    setRows(prev => (prev || []).filter(x => x && x.id !== id))
  }, [setRows])

  const list = (rows || []).filter(Boolean)

  return (
    <>
      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState icon={<IconCal size={30} color="var(--a-ink3)" />}
          title={isPast ? 'No past events.' : 'No upcoming events.'}
          sub={!isPast && isAdmin ? 'Create one from “New event”.' : undefined} />
      )}
      {list.map(r => (
        <EventCard key={r.id} row={r} orgId={orgId} staffId={staffId} staffName={staffName}
          isAdmin={isAdmin} isPast={isPast} onChange={updateRow} onArchive={removeRow} onDelete={removeRow} />
      ))}
    </>
  )
}

// ── New event (admins only) ──────────────────────────────────────────────────
function EventForm({ orgId, houseId, staffName, onCreated }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('training')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [scope, setScope] = useState('all') // 'all' | 'house'
  const [saving, setSaving] = useState(false)

  const canPost = title.trim() && date && time && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canPost || !orgId) return
    setSaving(true)
    let eventAt = null
    try { eventAt = new Date(`${date}T${time}`).toISOString() } catch { eventAt = null }
    const payload = {
      houseId: scope === 'house' ? houseId : null,
      title: title.trim(),
      kind,
      eventAt,
      location: location.trim(),
      capacity: capacity ? Number(capacity) : null,
      createdByName: staffName,
    }
    let row = null
    try { row = await Promise.resolve(createEvent(orgId, payload)).catch(() => null) } catch { row = null }
    setSaving(false)
    onCreated(row)
  }

  const kindBtn = (key) => {
    const active = kind === key
    return (
      <button key={key} type="button" onClick={() => setKind(key)} style={{
        flex: 1, padding: '8px', borderRadius: 8, border: 0, fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist',
        cursor: 'pointer', whiteSpace: 'nowrap',
        background: active ? 'var(--a-card)' : 'transparent',
        color: active ? 'var(--a-ink)' : 'var(--a-ink2)',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
      }}>{KIND[key].label}</button>
    )
  }

  const scopeBtn = (val, label, disabled) => {
    const active = scope === val
    return (
      <button type="button" disabled={disabled} onClick={() => !disabled && setScope(val)} style={{
        flex: 1, padding: '8px', borderRadius: 8, border: 0, fontSize: 13, fontWeight: 600, fontFamily: 'Geist',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
        background: active ? 'var(--a-card)' : 'transparent',
        color: active ? 'var(--a-ink)' : 'var(--a-ink2)',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
      }}>{label}</button>
    )
  }

  return (
    <form onSubmit={submit}>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />

        {/* Kind */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>KIND</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
            {KIND_KEYS.map(kindBtn)}
          </div>
        </div>

        {/* When */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHEN</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
        </div>

        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)"
          style={inputStyle} />

        <input type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)}
          placeholder="Capacity (optional — blank = no limit)" style={inputStyle} />

        {/* Who sees this */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHO SEES THIS</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
            {scopeBtn('all', 'All staff', false)}
            {scopeBtn('house', 'My house', !houseId)}
          </div>
        </div>

        <button type="submit" disabled={!canPost} style={{
          background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
          fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canPost ? 'pointer' : 'default', opacity: canPost ? 1 : 0.5,
        }}>{saving ? 'Creating…' : 'Create event'}</button>
      </div>
    </form>
  )
}

export function ScreenA_Events({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  const tabs = isAdmin ? ['Upcoming', 'Past', 'New event'] : ['Upcoming', 'Past']
  const [tab, setTab] = useState('Upcoming')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const isPast = tab === 'Past'

  const load = useCallback((which) => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    if (which === 'New event') { return Promise.resolve() }
    setLoading(true)
    const opts = which === 'Past'
      ? { houseId, role, staffId, includeArchived: true }
      : { houseId, role, staffId }
    return Promise.resolve(fetchEvents(orgId, opts))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, role, staffId])

  useEffect(() => { load(tab) }, [load, tab])

  // Keep tab valid if role changes.
  useEffect(() => { if (!tabs.includes(tab)) setTab('Upcoming') }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const onCreated = (row) => {
    setTab('Upcoming')
    if (row) setRows(prev => [row, ...(prev || [])])
    else load('Upcoming')
  }

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
    if (isAdmin && tab === 'New event') {
      return <EventForm orgId={orgId} houseId={houseId} staffName={staffName} onCreated={onCreated} />
    }
    return (
      <EventList orgId={orgId} staffId={staffId} staffName={staffName}
        isAdmin={isAdmin} isPast={isPast} rows={rows} setRows={setRows} loading={loading} />
    )
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: 10 }}>Events</div>
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
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Events</div>
      </div>
      <Chips />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
