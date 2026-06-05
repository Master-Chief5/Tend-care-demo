import { useState, useEffect, useCallback } from 'react'
import { fetchGoals, addGoal, deleteGoal, recordGoalData, fetchGoalData } from '../lib/db'
import { IconPlus } from './icons'

// Prompt hierarchy used for ISP / habilitation goal data collection.
const LEVELS = [
  { id: 'independent', short: 'Ind',  label: 'Independent',     color: '#3f7050' },
  { id: 'verbal',      short: 'VP',   label: 'Verbal prompt',   color: '#a47012' },
  { id: 'gesture',     short: 'GP',   label: 'Gesture prompt',  color: '#3c5887' },
  { id: 'model',       short: 'Mod',  label: 'Model',           color: '#6c3a55' },
  { id: 'physical',    short: 'PP',   label: 'Physical prompt', color: '#b8552f' },
  { id: 'refused',     short: 'Ref',  label: 'Refused',         color: '#a93a25' },
]
const levelOf = (id) => LEVELS.find(l => l.id === id) || { short: id, label: id, color: 'var(--a-ink3)' }

function GoalCard({ goal, user, houseUuid, houseColor, canEdit, onDelete }) {
  const [data, setData] = useState([])
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    if (!user?.orgId) return
    fetchGoalData(user.orgId, goal.id, 20).then(setData)
  }, [user?.orgId, goal.id])
  useEffect(() => { load() }, [load])

  const log = async (result) => {
    if (busy) return
    setBusy(result)
    const row = await recordGoalData(user.orgId, { houseId: houseUuid, goalId: goal.id, residentId: goal.residentId, result, by: user?.name || 'Staff' })
    setBusy(null)
    if (row) setData(prev => [{ id: row.id, date: row.log_date, result, by: row.recorded_by, at: row.recorded_at }, ...prev])
  }

  // Trend: % independent over the most recent entries.
  const scored = data.filter(d => d.result && d.result !== 'refused')
  const indPct = scored.length ? Math.round((data.filter(d => d.result === 'independent').length / data.length) * 100) : null
  const last = data[0]

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1.3 }}>{goal.title}</div>
          {goal.target && <div style={{ fontSize: 11.5, color: 'var(--a-ink2)', marginTop: 2 }}>🎯 {goal.target}</div>}
          {goal.method && <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 2, lineHeight: 1.35 }}>{goal.method}</div>}
        </div>
        {canEdit && <button onClick={() => onDelete(goal.id)} aria-label="Delete goal" style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>}
      </div>

      {/* Quick data entry — tap the prompt level given this time. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
        {LEVELS.map(l => (
          <button key={l.id} onClick={() => log(l.id)} disabled={!!busy} title={l.label} style={{
            padding: '6px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: 'Geist',
            cursor: busy ? 'default' : 'pointer', background: busy === l.id ? l.color : `${l.color}14`,
            color: busy === l.id ? '#fff' : l.color, border: `1px solid ${l.color}40`, opacity: busy && busy !== l.id ? 0.5 : 1,
          }}>{l.short}</button>
        ))}
      </div>

      {/* Recent trend */}
      {data.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {data.slice(0, 14).reverse().map((d, i) => (
              <span key={i} title={`${levelOf(d.result).label} · ${d.date}`} style={{ width: 7, height: 14, borderRadius: 2, background: levelOf(d.result).color, flexShrink: 0 }} />
            ))}
          </div>
          {indPct != null && <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', whiteSpace: 'nowrap', fontWeight: 600 }}>{indPct}% ind</span>}
        </div>
      )}
      {last && <div style={{ fontSize: 10, color: 'var(--a-ink3)', marginTop: 5 }}>Last: {levelOf(last.result).label} · {last.date === new Date().toISOString().slice(0,10) ? 'today' : last.date}{last.by ? ` · ${last.by}` : ''}</div>}
    </div>
  )
}

function GoalForm({ user, houseUuid, residents, onClose, onSaved }) {
  const [residentId, setResidentId] = useState(residents[0]?.id || '')
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [method, setMethod] = useState('')
  const [saving, setSaving] = useState(false)
  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }

  const save = async (e) => {
    e.preventDefault(); if (!title.trim() || saving) return
    setSaving(true)
    await addGoal(user.orgId, { houseId: houseUuid, residentId: residentId || null, title: title.trim(), target: target.trim(), method: method.trim() })
    setSaving(false); onSaved()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 4 }}>New ISP goal</div>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 14 }}>Staff log prompt level each time they work on this goal.</div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {residents.length > 0 && (
            <div><div style={lbl}>Resident</div>
              <select value={residentId} onChange={e => setResidentId(e.target.value)} style={input}>
                {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div><div style={lbl}>Goal</div><input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Brush teeth with minimal prompting" style={input} /></div>
          <div><div style={lbl}>Target / criteria</div><input value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. Independent 4 of 5 days for 30 days" style={input} /></div>
          <div><div style={lbl}>How to support</div><textarea value={method} onChange={e => setMethod(e.target.value)} rows={2} placeholder="Teaching method / prompting steps…" style={{ ...input, resize: 'vertical' }} /></div>
          <button type="submit" disabled={!title.trim() || saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: title.trim() ? 'pointer' : 'default', opacity: title.trim() ? 1 : 0.5 }}>{saving ? 'Saving…' : 'Add goal'}</button>
        </form>
      </div>
    </div>
  )
}

export function Goals({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [] }) {
  const canEdit = user?.role === 'supervisor' || user?.role === 'manager'
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const reload = useCallback(() => {
    if (!user?.orgId || !houseUuid) { setGoals([]); setLoading(false); return }
    setLoading(true)
    fetchGoals(user.orgId, houseUuid).then(g => { setGoals(g.filter(x => x.active !== false)); setLoading(false) })
  }, [user?.orgId, houseUuid])
  useEffect(() => { reload() }, [reload])

  const del = async (id) => { await deleteGoal(id); reload() }

  // Group goals by resident for a clean per-person layout.
  const byResident = {}
  for (const g of goals) (byResident[g.resident || 'House'] ||= []).push(g)
  const groups = Object.entries(byResident)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ISP goals</span>
        {canEdit && residents.length > 0 && (
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: houseColor, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}><IconPlus size={13} sw={2.2} /> Add goal</button>
        )}
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Loading…</div>}

      {!loading && goals.length === 0 && (
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>No goals yet</div>
          <div style={{ fontSize: 12, color: 'var(--a-ink3)', lineHeight: 1.5 }}>
            {residents.length === 0 ? 'Add a resident first, then set their ISP goals.' : canEdit ? 'Add each resident’s ISP / habilitation goals so staff can log progress every shift.' : 'No goals have been set for this house yet.'}
          </div>
        </div>
      )}

      {!loading && groups.map(([resident, gs]) => (
        <div key={resident} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '6px 2px 8px' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: houseColor }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--a-ink)' }}>{resident}</span>
            <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>· {gs.length} goal{gs.length === 1 ? '' : 's'}</span>
          </div>
          {gs.map(g => <GoalCard key={g.id} goal={g} user={user} houseUuid={houseUuid} houseColor={houseColor} canEdit={canEdit} onDelete={del} />)}
        </div>
      ))}

      {!loading && goals.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 2px 8px', marginTop: 2 }}>
          {LEVELS.map(l => (
            <span key={l.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: 'var(--a-ink3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />{l.label}
            </span>
          ))}
        </div>
      )}

      {showForm && <GoalForm user={user} houseUuid={houseUuid} residents={residents} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload() }} />}
    </>
  )
}
