import { useState, useEffect } from 'react'
import { fetchPunches } from '../../lib/db'
import { punchWorked, fmtHM } from '../../lib/timesheet'
import { IconAward } from '../../components/icons'

// Staff ranking — an honest, activity-based leaderboard computed from the real
// time-clock data (worked hours + shifts in a date range). Ranks by hours, then
// shifts. Supervisors see the whole org; managers their own house.

const pad = (n) => String(n).padStart(2, '0')
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function rangeFor(preset) {
  const now = new Date(); const to = ds(now)
  switch (preset) {
    case '30d': { const f = new Date(now); f.setDate(f.getDate() - 30); return { from: ds(f), to } }
    case 'quarter': { const q = Math.floor(now.getMonth() / 3) * 3; return { from: ds(new Date(now.getFullYear(), q, 1)), to } }
    case 'month':
    default: return { from: ds(new Date(now.getFullYear(), now.getMonth(), 1)), to }
  }
}
const PRESETS = [
  { id: 'month', label: 'This month' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'quarter', label: 'This quarter' },
]
// Podium accent colours for the top three ranks (gold / silver / bronze).
const PODIUM = ['#a47012', '#6f7785', '#9a6334']
const AV = ['var(--a-sage)', 'var(--a-clay)', '#3c5887', '#a47012', '#2f9489', '#8a5a9e']
const colorFor = (s) => { let n = 0; const t = String(s || '?'); for (let i = 0; i < t.length; i++) n = (n + t.charCodeAt(i)) % AV.length; return AV[n] }

export function StaffRanking({ user }) {
  const orgId = user?.orgId
  const scope = user?.role === 'manager' ? (user?.houseId || null) : null
  const [preset, setPreset] = useState('month')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const { from, to } = rangeFor(preset)

  useEffect(() => {
    if (!orgId) { setRows([]); setLoading(false); return }
    let stop = false
    setLoading(true)
    Promise.resolve(fetchPunches(orgId, { houseId: scope, from, to })).then(punches => {
      if (stop) return
      const now = new Date().toISOString()
      const map = new Map()
      for (const p of (punches || [])) {
        const key = p.staff_id || `name:${p.staff_name || ''}`
        let g = map.get(key)
        if (!g) { g = { name: p.staff_name || 'Staff', role: p.role || 'staff', hours: 0, shifts: 0 }; map.set(key, g) }
        g.hours += punchWorked(p, now).hours
        g.shifts += 1
        if (p.role) g.role = p.role
      }
      const arr = [...map.values()].sort((a, b) => b.hours - a.hours || b.shifts - a.shifts)
      setRows(arr); setLoading(false)
    }).catch(() => { if (!stop) { setRows([]); setLoading(false) } })
    return () => { stop = true }
  }, [orgId, scope, from, to])

  const max = rows[0]?.hours || 1

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => setPreset(p.id)} style={{
            border: p.id === preset ? 0 : '1px solid var(--a-line)',
            background: p.id === preset ? 'var(--a-ink)' : 'transparent',
            color: p.id === preset ? 'var(--a-card)' : 'var(--a-ink2)',
            padding: '6px 14px', borderRadius: 999, fontSize: 12, fontFamily: 'Geist', fontWeight: 500, cursor: 'pointer',
          }}>{p.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>Ranked by hours worked</span>
      </div>

      {loading && <div style={{ color: 'var(--a-ink3)', fontSize: 13, paddingTop: 12 }}>Loading…</div>}

      {!loading && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--a-ink3)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IconAward size={32} color="var(--a-ink3)" sw={1.6} /></div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No clock-ins this period yet</div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>Rankings build from time-clock punches as staff work shifts.</div>
        </div>
      )}

      {!loading && rows.map((r, i) => (
        <div key={(r.name || '') + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, marginBottom: 8 }}>
          {i < 3 ? (
            <div title={`Rank ${i + 1}`} style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${PODIUM[i]}22`, color: PODIUM[i], fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums', border: `1px solid ${PODIUM[i]}55` }}>
              {i + 1}
            </div>
          ) : (
            <div style={{ width: 26, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--a-ink3)', fontVariantNumeric: 'tabular-nums' }}>
              {i + 1}
            </div>
          )}
          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: colorFor(r.name), color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(r.name || '?').trim()[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)' }}>{r.name}</div>
            <div style={{ height: 5, background: 'var(--a-paper)', borderRadius: 999, marginTop: 5, overflow: 'hidden', maxWidth: 260 }}>
              <div style={{ width: `${Math.max(4, (r.hours / max) * 100)}%`, height: '100%', background: 'var(--a-sage)', borderRadius: 999 }} />
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--a-ink)' }}>{fmtHM(r.hours)} hrs</div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{r.shifts} shift{r.shifts === 1 ? '' : 's'} · {r.role}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
