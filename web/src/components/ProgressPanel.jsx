import { useState, useEffect, useCallback } from 'react'
import {
  fetchGoals, fetchGoalData, fetchHealthLogs, fetchIncidents, fetchDailyLog,
  addResidentNote, fetchResidentNotes, deleteResidentNote,
} from '../lib/db'
import { IconX, IconPrinter, IconAlert } from './icons'

// Resident progress notes persist via db.js (Supabase in prod, the in-memory
// demo store in demo). The report builders below are kept local to this panel —
// they aggregate the existing care-module data into a date-ranged report.

// ── Report builders ──────────────────────────────────────────────────────────
function inRange(dateStr, from, to) {
  if (!dateStr) return false
  if (from && dateStr < from) return false
  if (to && dateStr > to) return false
  return true
}

function summarizeHealth(logs) {
  const byKind = {}
  for (const h of (logs || [])) byKind[h.kind] = (byKind[h.kind] || 0) + 1
  const total = (logs || []).length
  return { byKind, total }
}

function recurringIncidentThemes(incidents) {
  const counts = {}
  for (const i of (incidents || [])) {
    const t = i.type || 'Other'
    counts[t] = (counts[t] || 0) + 1
  }
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count, recurring: count >= 2 }))
    .sort((a, b) => b.count - a.count)
}

function buildProgressReport({ residentName, residentId, from, to, notes, goals, goalDataByGoal, healthLogs, incidents, dailyLog }) {
  // Goals: attach the in-range data points for this resident.
  const goalSummaries = (goals || []).map(g => {
    const all = (goalDataByGoal && goalDataByGoal[g.id]) || []
    const points = all.filter(d => inRange(d.date, from, to))
    return {
      id: g.id, title: g.title, target: g.target,
      count: points.length,
      lastResult: points[0]?.result ?? points[0]?.value ?? null,
      points,
    }
  })

  const rHealth = (healthLogs || []).filter(h =>
    (!residentId || h.residentId === residentId) && inRange(h.date, from, to))
  const health = summarizeHealth(rHealth)

  const rIncidents = (incidents || []).filter(i =>
    (!residentName || i.resident === residentName) && inRange(i.date, from, to))
  const incidentSection = {
    total: rIncidents.length,
    themes: recurringIncidentThemes(rIncidents),
    items: rIncidents,
  }

  const dailyHighlights = (dailyLog || []).filter(l =>
    (!residentName || l.resident === residentName) && inRange(l.date, from, to))

  return {
    residentName, residentId, from, to,
    notes: notes || [],
    goals: goalSummaries,
    health,
    incidents: incidentSection,
    dailyHighlights,
  }
}

// ── Range presets ────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0')
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function rangeFor(preset) {
  const now = new Date()
  const to = ds(now)
  switch (preset) {
    case '30d': {
      const f = new Date(now); f.setDate(f.getDate() - 30)
      return { from: ds(f), to }
    }
    case 'month':
      return { from: ds(new Date(now.getFullYear(), now.getMonth(), 1)), to }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      return { from: ds(new Date(now.getFullYear(), q, 1)), to }
    }
    case 'year':
      return { from: ds(new Date(now.getFullYear(), 0, 1)), to }
    case 'all':
    default:
      return { from: null, to: null }
  }
}
const PRESETS = [
  { id: '30d', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
]

const NOTE_CATEGORIES = ['Progress', 'Behavior', 'Medical', 'General']
const CAT_COLOR = {
  Progress: { bg: '#dee6df', tc: '#3f604d' },
  Behavior: { bg: '#fadcd7', tc: '#a93a25' },
  Medical:  { bg: '#fadcd7', tc: '#a93a25' },
  General:  { bg: 'var(--a-paper)', tc: 'var(--a-ink3)' },
}

const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
const card = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px', marginBottom: 12 }
const sectionHead = { fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }
const emptyBox = { background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px 14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }

const chipBase = (active, color) => ({
  flexShrink: 0, padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
  fontFamily: 'Geist', cursor: 'pointer', whiteSpace: 'nowrap',
  background: active ? (color || 'var(--a-ink)') : 'transparent',
  color: active ? '#fff' : 'var(--a-ink2)',
  border: active ? 0 : '1px solid var(--a-line)',
})

const statChip = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999,
  fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', background: 'var(--a-paper)',
  color: color || 'var(--a-ink2)', border: '1px solid var(--a-line)',
})

export function ProgressPanel({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [] }) {
  const orgId = user?.orgId
  const list = residents || []

  const [selectedResidentId, setSelectedResidentId] = useState(list[0]?.id || '')
  const [preset, setPreset] = useState('30d')

  // notes
  const [notes, setNotes] = useState([])
  const [noteCategory, setNoteCategory] = useState('Progress')
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)

  // report
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedResidentId && list[0]) setSelectedResidentId(list[0].id)
  }, [list, selectedResidentId])

  const resident = list.find(r => r.id === selectedResidentId) || null
  const residentName = resident?.name || ''
  const { from, to } = rangeFor(preset)
  const activeLabel = PRESETS.find(p => p.id === preset)?.label || ''

  const reload = useCallback(() => {
    if (!selectedResidentId) { setNotes([]); setReport(null); return }
    setLoading(true)
    const rName = (residents || []).find(r => r.id === selectedResidentId)?.name || ''

    const pNotes = Promise.resolve(
      fetchResidentNotes(orgId, { houseId: houseUuid, residentId: selectedResidentId, from, to })
    ).catch(() => [])
    const pGoals = Promise.resolve(fetchGoals(orgId, houseUuid)).catch(() => [])
    const pHealth = Promise.resolve(fetchHealthLogs(orgId, houseUuid, null, 200)).catch(() => [])
    const pIncidents = Promise.resolve(fetchIncidents(orgId, houseUuid)).catch(() => [])
    const pDaily = Promise.resolve(fetchDailyLog(orgId, houseUuid)).catch(() => [])

    Promise.all([pNotes, pGoals, pHealth, pIncidents, pDaily]).then(async ([nts, allGoals, health, incidents, daily]) => {
      setNotes(nts || [])
      const residentGoals = (allGoals || []).filter(g => g.residentId === selectedResidentId)
      const datas = await Promise.all(
        residentGoals.map(g =>
          Promise.resolve(fetchGoalData(orgId, g.id, 200)).catch(() => [])
        )
      )
      const goalDataByGoal = {}
      residentGoals.forEach((g, i) => { goalDataByGoal[g.id] = datas[i] || [] })

      const built = buildProgressReport({
        residentName: rName, residentId: selectedResidentId, from, to,
        notes: nts || [], goals: residentGoals, goalDataByGoal,
        healthLogs: health || [], incidents: incidents || [], dailyLog: daily || [],
      })
      setReport(built)
      setLoading(false)
    }).catch(() => { setReport(null); setLoading(false) })
  }, [orgId, houseUuid, selectedResidentId, from, to, residents])

  useEffect(() => { reload() }, [reload])

  const add = async (e) => {
    e.preventDefault()
    if (!noteBody.trim() || saving || !selectedResidentId) return
    setSaving(true)
    await Promise.resolve(addResidentNote(orgId, {
      houseId: houseUuid, residentId: selectedResidentId, residentName,
      category: noteCategory, body: noteBody.trim(),
      authorName: user?.name, authorRole: user?.role,
    })).catch(() => null)
    setSaving(false); setNoteBody('')
    reload()
  }

  const del = async (id) => {
    if (!window.confirm('Delete this note?')) return
    await Promise.resolve(deleteResidentNote(id)).catch(() => null)
    reload()
  }

  // ── Empty state: no residents ──────────────────────────────────────────────
  if (list.length === 0) {
    return (
      <div>
        <div style={sectionHead}>Progress &amp; reports</div>
        <div style={emptyBox}>Add residents to this house to track progress.</div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '4px 0 10px' }}>
        <span className="serif" style={{ fontSize: 20, color: 'var(--a-ink)' }}>Progress &amp; reports</span>
        <button onClick={() => window.print()} style={{ ...chipBase(false), display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconPrinter size={14} /> Print</button>
      </div>

      <select value={selectedResidentId} onChange={e => setSelectedResidentId(e.target.value)} style={{ ...input, marginBottom: 10 }}>
        {list.map(r => <option key={r.id} value={r.id}>{r.name}{r.room ? ` · Rm ${r.room}` : ''}</option>)}
      </select>

      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2, marginBottom: 6 }}>
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => setPreset(p.id)} style={chipBase(preset === p.id, houseColor)}>{p.label}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--a-ink3)', margin: '0 2px 12px' }}>
        <span className="tnum">{from || '—'}</span> → <span className="tnum">{to || 'today'}</span> · {activeLabel}
      </div>

      {/* ── Progress notes ── */}
      <div style={card}>
        <div style={sectionHead}>Progress notes</div>
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {NOTE_CATEGORIES.map(cat => {
              const on = noteCategory === cat; const c = CAT_COLOR[cat]
              return (
                <button key={cat} type="button" onClick={() => setNoteCategory(cat)} style={{
                  padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                  background: on ? c.bg : 'transparent', color: on ? c.tc : 'var(--a-ink3)',
                  border: `1px solid ${on ? c.tc + '55' : 'var(--a-line)'}`,
                }}>{cat}</button>
              )
            })}
          </div>
          <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} rows={3} placeholder={`Add a ${noteCategory.toLowerCase()} note for ${residentName || 'this resident'}…`} style={{ ...input, resize: 'vertical' }} />
          <button type="submit" disabled={!noteBody.trim() || saving} style={{ background: houseColor, color: '#fff', border: 0, borderRadius: 10, padding: '10px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: noteBody.trim() ? 'pointer' : 'default', opacity: noteBody.trim() ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </form>

        {(notes || []).length === 0 ? (
          <div style={emptyBox}>No notes for {residentName || 'this resident'} in this range yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(notes || []).map(n => {
              const c = CAT_COLOR[n.category] || CAT_COLOR.General
              return (
                <div key={n.id} style={{ border: '1px solid var(--a-line)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: c.tc, background: c.bg, padding: '1px 6px', borderRadius: 3 }}>{n.category}</span>
                    <span className="tnum" style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{n.note_date}</span>
                    {n.author_name && <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>· {n.author_name}</span>}
                    <button onClick={() => del(n.id)} aria-label="Delete note" style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: 1, padding: '0 2px' }}><IconX size={16} /></button>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.4 }}>{n.body}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Generated report ── */}
      {loading && <div style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Building report…</div>}

      {!loading && report && (
        <>
          {/* ISP goal progress */}
          <div style={card}>
            <div style={sectionHead}>ISP goal progress</div>
            {(report.goals || []).length === 0 ? (
              <div style={emptyBox}>No goal data in this range.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {report.goals.map(g => (
                  <div key={g.id} style={{ borderBottom: '1px solid var(--a-line)', paddingBottom: 8 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1.3 }}>{g.title}</div>
                    {g.target && <div style={{ fontSize: 11.5, color: 'var(--a-ink2)', marginTop: 2 }}>🎯 {g.target}</div>}
                    <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 3 }}>
                      <span className="tnum">{g.count}</span> data point{g.count === 1 ? '' : 's'} in range
                      {g.lastResult != null && <> · last: <strong style={{ color: 'var(--a-ink2)' }}>{String(g.lastResult)}</strong></>}
                    </div>
                    {g.count === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 4 }}>No goal data in this range.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {g.points.slice(0, 14).map((d, i) => (
                          <span key={d.id || i} title={d.date} style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Geist', color: houseColor, background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '2px 8px' }}>
                            {String(d.result ?? d.value ?? '—')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Health summary */}
          <div style={card}>
            <div style={sectionHead}>Health summary</div>
            {(!report.health || report.health.total === 0) ? (
              <div style={emptyBox}>No health entries.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {Object.entries(report.health.byKind).map(([kind, count]) => (
                  <span key={kind} style={statChip()}>
                    {kind} <span className="tnum" style={{ color: 'var(--a-ink3)' }}>×{count}</span>
                  </span>
                ))}
                <span style={statChip(houseColor)}>Total <span className="tnum">{report.health.total}</span></span>
              </div>
            )}
          </div>

          {/* Incidents & recurring themes */}
          <div style={card}>
            <div style={sectionHead}>Incidents &amp; recurring themes</div>
            {(!report.incidents || report.incidents.total === 0) ? (
              <div style={emptyBox}>No incidents in this range — 🎉</div>
            ) : (
              <>
                <div style={{ fontSize: 11.5, color: 'var(--a-ink2)', marginBottom: 8 }}>
                  <span className="tnum" style={{ fontWeight: 700 }}>{report.incidents.total}</span> incident{report.incidents.total === 1 ? '' : 's'} in range
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {report.incidents.themes.map(t => (
                    <span key={t.type} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999,
                      fontSize: 11.5, fontWeight: 700, fontFamily: 'Geist',
                      background: t.recurring ? 'var(--a-clay)' : 'var(--a-paper)',
                      color: t.recurring ? '#fff' : 'var(--a-ink2)',
                      border: t.recurring ? 0 : '1px solid var(--a-line)',
                    }}>
                      {t.type} <span className="tnum">×{t.count}</span>
                      {t.recurring && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, opacity: 0.95 }}><IconAlert size={12} color="#fff" /> recurring</span>}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {report.incidents.items.map(i => (
                    <div key={i.id} style={{ fontSize: 12, color: 'var(--a-ink2)', lineHeight: 1.4 }}>
                      <span className="tnum" style={{ color: 'var(--a-ink3)' }}>{i.date}</span> · <strong>{i.type}</strong>
                      {i.severity ? ` · ${i.severity}` : ''}{i.text ? ` · ${i.text}` : ''}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Daily-log highlights */}
          <div style={card}>
            <div style={sectionHead}>Daily-log highlights</div>
            {(report.dailyHighlights || []).length === 0 ? (
              <div style={emptyBox}>No daily-log entries in this range.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {report.dailyHighlights.map(l => (
                  <div key={l.id} style={{ fontSize: 12.5, color: 'var(--a-ink2)', lineHeight: 1.4 }}>
                    <span className="tnum" style={{ color: 'var(--a-ink3)' }}>{l.date}</span>
                    {l.category ? <> · <strong>{l.category}</strong></> : ''}
                    {l.text ? ` · ${l.text}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
