import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchActivityFeed } from '../lib/db'
import { IconClock, IconEdit, IconLeaf, IconAlert, IconActivity } from '../components/icons'

// Calm, read-only activity feed (like Connecteam's "Activity Log"). Role-aware:
//   • admins (supervisor/manager): scoped feed for their house / all houses
//   • staff: their own-scope feed
// Events come grouped by local day with day headers ("Today" / "Yesterday" / "Mon Jun 16").
// Provides both the mobile (.phone-screen) and desktop (flex column) layouts in one
// component, switching on `desktop` (mirrors Timesheets / TeamChat).

function fmtClock(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`
}

// Local YYYY-MM-DD key for grouping.
function dayKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function dayLabel(d) {
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (dayKey(d) === dayKey(today)) return 'Today'
  if (dayKey(d) === dayKey(yest)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const KIND_ICON = {
  clock_in:        IconClock,
  clock_out:       IconClock,
  shift_edit:      IconEdit,
  time_off:        IconLeaf,
  work_hour_limit: IconAlert,
  auto_clock_out:  IconClock,
}

function EmptyState({ emoji, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
      {emoji && <div style={{ fontSize: 30, marginBottom: 10 }}>{emoji}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

function EventRow({ ev }) {
  const Icon = KIND_ICON[ev?.kind] || IconActivity
  const text = ev?.text || (ev?.actor ? `${ev.actor}` : 'Activity')
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '10px 0' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'var(--a-paper)', border: '1px solid var(--a-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--a-ink2)',
      }}><Icon size={15} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.4, wordBreak: 'break-word' }}>{text}</div>
        {ev?.actor && ev?.text && (
          <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 1 }}>{ev.actor}</div>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', flexShrink: 0, paddingTop: 1, fontVariantNumeric: 'tabular-nums' }}>
        {fmtClock(ev?.at)}
      </div>
    </div>
  )
}

export function ScreenA_Activity({ user, desktop = false }) {
  const orgId = user?.orgId
  const houseId = user?.houseId || null
  const role = user?.role
  const scopeHouse = role === 'manager' ? houseId : null

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.resolve(fetchActivityFeed(orgId, { houseId: scopeHouse, limit: 50 }))
      .then(rows => { setEvents(rows || []); setLoading(false) })
      .catch(() => { setEvents([]); setLoading(false) })
  }, [orgId, scopeHouse])

  useEffect(() => { load() }, [load])

  // Group by local day, newest day first, newest event first within a day.
  const groups = useMemo(() => {
    const sorted = (events || [])
      .filter(e => e && e.at)
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const map = new Map()
    for (const ev of sorted) {
      const d = new Date(ev.at)
      if (isNaN(d.getTime())) continue
      const key = dayKey(d)
      if (!map.has(key)) map.set(key, { key, date: d, label: dayLabel(d), items: [] })
      map.get(key).items.push(ev)
    }
    return Array.from(map.values())
  }, [events])

  const Feed = () => (
    <>
      {loading && (events || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && groups.length === 0 && (
        <EmptyState emoji={<IconLeaf size={26} color="var(--a-ink3)" />} title="No recent activity." />
      )}

      {groups.map(g => (
        <div key={g.key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', margin: '0 0 4px' }}>
            {g.label.toUpperCase()}
          </div>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '2px 16px' }}>
            {g.items.map((ev, i) => (
              <div key={ev.id || i} style={i > 0 ? { borderTop: '1px solid var(--a-line)' } : undefined}>
                <EventRow ev={ev} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )

  const RefreshBtn = () => (
    <button onClick={() => load()} aria-label="Refresh" style={{
      padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
      background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
    }}>Refresh</button>
  )

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--a-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>Activity</div>
          <RefreshBtn />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 28px' }}>
          <Feed />
        </div>
      </div>
    )
  }

  return (
    <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px calc(22px + var(--chip-clear, 0px)) 8px 22px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Activity</div>
        <RefreshBtn />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Feed />
      </div>
    </div>
  )
}
