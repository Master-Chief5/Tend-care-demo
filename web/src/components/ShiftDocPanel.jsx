import { useState, useEffect, useCallback } from 'react'
import { fetchShiftDocProgress, setShiftDocSection } from '../lib/db'
import { IconCheck } from './icons'

// The documentation a shift must cover, per resident. `target` jumps to the
// matching Care-tab section so the DSP can go do the real work.
const SECTIONS = [
  { id: 'log',      label: 'Daily note / T-log', hint: 'Narrative of the shift',               target: 'log' },
  { id: 'health',   label: 'Health tracking',    hint: 'Vitals, BM, seizure, sleep, meals',    target: 'health' },
  { id: 'goals',    label: 'ISP goal data',      hint: 'Habilitation goal data collection',    target: 'goals' },
  { id: 'meds',     label: 'Med pass',           hint: 'eMAR — given / refused / held',         target: 'meds' },
  { id: 'incident', label: 'Incident check',     hint: 'Report any incident, or confirm none',  target: 'compliance' },
]

// Local date as 'YYYY-MM-DD' (do NOT use toISOString — that's UTC).
function todayStr() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function ShiftDocPanel({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [], onOpenSection }) {
  const orgId = user?.orgId
  const doneByName = user?.name || 'Staff'
  const date = todayStr()
  const list = residents || []

  // progress[residentId][sectionId] = 'done' | 'na'
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    if (!orgId || !houseUuid) { setProgress({}); setLoading(false); return }
    setLoading(true)
    fetchShiftDocProgress(orgId, { houseId: houseUuid, date }).then(rows => {
      const map = {}
      for (const row of (rows || [])) {
        if (!row || !row.resident_id || !row.section) continue
        ;(map[row.resident_id] ||= {})[row.section] = row.status
      }
      setProgress(map)
      setLoading(false)
    }).catch(() => { setProgress({}); setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, houseUuid, date])
  useEffect(() => { reload() }, [reload, list.length])

  // Toggle a section to a target status, or clear it if it's already there.
  const setSection = async (r, section, status) => {
    const current = progress[r.id]?.[section.id] || null
    const next = current === status ? null : status
    // optimistic
    setProgress(prev => {
      const copy = { ...prev, [r.id]: { ...(prev[r.id] || {}) } }
      if (next) copy[r.id][section.id] = next
      else delete copy[r.id][section.id]
      return copy
    })
    try {
      await setShiftDocSection(orgId, {
        houseId: houseUuid, date, residentId: r.id, residentName: r.name,
        section: section.id, status: next, doneByName,
      })
    } catch {
      reload() // re-sync on failure
    }
  }

  // Counts — a section counts as covered when 'done' OR 'na'.
  const totalItems = list.length * SECTIONS.length
  let doneItems = 0
  let fullyDone = 0
  for (const r of list) {
    const p = progress[r.id] || {}
    const covered = SECTIONS.filter(s => p[s.id] === 'done' || p[s.id] === 'na').length
    doneItems += covered
    if (covered === SECTIONS.length) fullyDone += 1
  }
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '4px 0 8px' }}>This shift's documentation</div>

      {list.length === 0 ? (
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>📝</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Nothing to document yet</div>
          <div style={{ fontSize: 12, color: 'var(--a-ink3)', lineHeight: 1.5 }}>No residents in this house yet — add residents to start documenting.</div>
        </div>
      ) : (
        <>
          {/* Header summary */}
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
            <div className="serif" style={{ fontSize: 18, marginBottom: 2 }}>{todayLabel()}</div>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--a-ink)' }}>{fullyDone}</span> of {list.length} resident{list.length === 1 ? '' : 's'} fully documented
              <span style={{ color: 'var(--a-ink3)', marginLeft: 8 }}>{doneItems}/{totalItems} items</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--a-paper)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: houseColor, borderRadius: 999, transition: 'width 0.2s ease' }} />
            </div>
          </div>

          {loading && <div style={{ padding: '12px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Loading…</div>}

          {/* Per-resident cards */}
          {list.map(r => {
            const p = progress[r.id] || {}
            const covered = SECTIONS.filter(s => p[s.id] === 'done' || p[s.id] === 'na').length
            const complete = covered === SECTIONS.length
            return (
              <div key={r.id} style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: houseColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--a-ink)' }}>{r.name}</span>
                    {r.room && <span style={{ fontSize: 11, color: 'var(--a-ink3)', marginLeft: 6 }}>Room {r.room}</span>}
                  </div>
                  {complete ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: 'var(--a-sage)', background: 'var(--a-paper)', padding: '2px 8px', borderRadius: 999 }}>
                      <IconCheck size={11} sw={3} /> Documented
                    </span>
                  ) : (
                    <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)' }}>{covered}/{SECTIONS.length}</span>
                  )}
                </div>

                {SECTIONS.map((s, i) => {
                  const status = p[s.id] || null
                  const isDone = status === 'done'
                  const isNa = status === 'na'
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i === 0 ? '1px solid var(--a-line)' : '1px solid var(--a-line)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isNa ? 'var(--a-ink3)' : 'var(--a-ink)', textDecoration: isNa ? 'line-through' : 'none' }}>{s.label}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{s.hint}</div>
                      </div>

                      {/* Open the real module */}
                      <button onClick={() => onOpenSection?.(s.target)} style={{ background: 'transparent', border: 0, color: houseColor, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>Open</button>

                      {/* N/A pill */}
                      <button onClick={() => setSection(r, s, 'na')} aria-pressed={isNa} style={{
                        flexShrink: 0, padding: '4px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, fontFamily: 'Geist', cursor: 'pointer',
                        background: isNa ? 'var(--a-ink2)' : 'transparent', color: isNa ? 'var(--a-card)' : 'var(--a-ink3)',
                        border: isNa ? 0 : '1px solid var(--a-line)',
                      }}>N/A</button>

                      {/* Round done checkbox */}
                      <button onClick={() => setSection(r, s, 'done')} aria-pressed={isDone} aria-label={`Mark ${s.label} done`} style={{
                        flexShrink: 0, width: 26, height: 26, borderRadius: 999, padding: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDone ? houseColor : 'transparent',
                        border: isDone ? 0 : '1.5px solid var(--a-line)',
                        color: '#fff',
                      }}>{isDone && <IconCheck size={14} sw={3} color="#fff" />}</button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
