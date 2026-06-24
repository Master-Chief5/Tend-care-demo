import { useState, useEffect, useCallback } from 'react'
import {
  fetchBehaviorPlans, createBehaviorPlan, updateBehaviorPlan, deleteBehaviorPlan,
  fetchBehaviorEvents, createBehaviorEvent, deleteBehaviorEvent,
} from '../lib/db'
import { IconPlus } from './icons'

// Intensity scale used on the ABC quick-entry + colours the frequency bars.
const INTENSITY = [
  { id: 'Mild',     color: '#3f7050' },
  { id: 'Moderate', color: '#b9892f' },
  { id: 'Severe',   color: '#b8552f' },
]
const intensityColor = (id) => (INTENSITY.find(i => i.id === id) || { color: 'var(--a-ink3)' }).color

// Common target-behavior labels offered as quick chips when building a plan.
const COMMON_BEHAVIORS = ['Elopement', 'Escalation / aggression', 'Self-injury', 'Property destruction', 'Refusal', 'Verbal outburst']

const dayKey = (iso) => (iso || '').slice(0, 10)
const shortDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Per-target-behavior frequency mini-chart: last ~14 days, one bar per day,
// height scaled to that day's count — mirrors the Goals trend sparkline style.
function FreqChart({ events, behavior, color }) {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  const counts = days.map(dk => events.filter(e => e.behavior === behavior && dayKey(e.occurredAt) === dk).length)
  const max = Math.max(1, ...counts)
  const total = counts.reduce((a, b) => a + b, 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, flex: 1, minWidth: 0, height: 22, overflow: 'hidden' }}>
        {counts.map((n, i) => (
          <span key={i} title={`${shortDate(days[i])} · ${n} time${n === 1 ? '' : 's'}`} style={{
            width: 7, flexShrink: 0, borderRadius: 2,
            height: n === 0 ? 2 : `${Math.round((n / max) * 20) + 2}px`,
            background: n === 0 ? 'var(--a-line)' : color,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', whiteSpace: 'nowrap', fontWeight: 600 }}>{total} / 14d</span>
    </div>
  )
}

// Read-only / inline-editable block for one of the plan's free-text playbook fields.
function PlanField({ label, value, editing, onChange, placeholder }) {
  if (editing) {
    return (
      <div>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
          style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '9px 11px', fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.45 }} />
      </div>
    )
  }
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}

// ABC quick-entry form — any staff in scope can log an occurrence.
function AbcEntry({ user, houseUuid, plan, targetBehaviors, color, onSaved }) {
  const [open, setOpen] = useState(false)
  const [behavior, setBehavior] = useState(targetBehaviors[0] || '')
  const [antecedent, setAntecedent] = useState('')
  const [consequence, setConsequence] = useState('')
  const [intervention, setIntervention] = useState('')
  const [intensity, setIntensity] = useState('Mild')
  const [saving, setSaving] = useState(false)

  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '9px 11px', fontSize: 13.5, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }

  const reset = () => { setBehavior(targetBehaviors[0] || ''); setAntecedent(''); setConsequence(''); setIntervention(''); setIntensity('Mild') }

  const save = async (e) => {
    e.preventDefault()
    if (!behavior.trim() || saving) return
    setSaving(true)
    const row = await createBehaviorEvent(user.orgId, {
      houseId: houseUuid, residentId: plan.residentId, planId: plan.id,
      behavior: behavior.trim(), antecedent: antecedent.trim(), consequence: consequence.trim(),
      intervention: intervention.trim(), intensity, by: user?.name || 'Staff',
    })
    setSaving(false)
    if (row) { reset(); setOpen(false); onSaved(row) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 10, padding: '10px', background: `${color}12`, border: `1px solid ${color}55`, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'Geist', color, cursor: 'pointer' }}>
        <IconPlus size={14} sw={2.2} /> Log ABC data point
      </button>
    )
  }
  return (
    <form onSubmit={save} style={{ marginTop: 10, background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-ink)' }}>New ABC entry</div>
      <div><div style={lbl}>Behavior</div>
        <select value={behavior} onChange={e => setBehavior(e.target.value)} style={input}>
          {targetBehaviors.length === 0 && <option value="">—</option>}
          {targetBehaviors.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div><div style={lbl}>Antecedent — what happened before</div><input value={antecedent} onChange={e => setAntecedent(e.target.value)} placeholder="e.g. Asked to end screen time" style={input} /></div>
      <div><div style={lbl}>Consequence — what happened after</div><input value={consequence} onChange={e => setConsequence(e.target.value)} placeholder="e.g. Calmed with a break" style={input} /></div>
      <div><div style={lbl}>Intervention used</div><input value={intervention} onChange={e => setIntervention(e.target.value)} placeholder="e.g. Offered break card + quiet space" style={input} /></div>
      <div><div style={lbl}>Intensity</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {INTENSITY.map(it => {
            const on = intensity === it.id
            return <button key={it.id} type="button" onClick={() => setIntensity(it.id)} style={{ flex: 1, padding: '7px 0', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: 'Geist', cursor: 'pointer', background: on ? it.color : `${it.color}14`, color: on ? '#fff' : it.color, border: `1px solid ${it.color}40` }}>{it.id}</button>
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button type="button" onClick={() => { reset(); setOpen(false) }} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink2)', cursor: 'pointer' }}>Cancel</button>
        <button type="submit" disabled={!behavior.trim() || saving} style={{ flex: 1, padding: '10px', background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: behavior.trim() ? 'pointer' : 'default', opacity: behavior.trim() ? 1 : 0.5 }}>{saving ? 'Saving…' : 'Log it'}</button>
      </div>
    </form>
  )
}

// One resident's behavior support plan + ABC data.
function PlanCard({ user, houseUuid, plan, color, canEdit, onChanged }) {
  const [events, setEvents] = useState([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showLog, setShowLog] = useState(false)

  // Editable draft of the plan fields.
  const [targets, setTargets] = useState(plan.targetBehaviors || [])
  const [newTarget, setNewTarget] = useState('')
  const [antStrat, setAntStrat] = useState(plan.antecedentStrategies || '')
  const [replacement, setReplacement] = useState(plan.replacementBehaviors || '')
  const [steps, setSteps] = useState(plan.interventionSteps || '')

  const load = useCallback(() => {
    if (!user?.orgId) return
    fetchBehaviorEvents(user.orgId, { residentId: plan.residentId, planId: plan.id, limit: 60 }).then(setEvents)
  }, [user?.orgId, plan.residentId, plan.id])
  useEffect(() => { load() }, [load])

  const startEdit = () => {
    setTargets(plan.targetBehaviors || [])
    setAntStrat(plan.antecedentStrategies || '')
    setReplacement(plan.replacementBehaviors || '')
    setSteps(plan.interventionSteps || '')
    setNewTarget('')
    setEditing(true)
  }
  const toggleTarget = (b) => setTargets(p => p.includes(b) ? p.filter(x => x !== b) : [...p, b])
  const addNewTarget = () => {
    const t = newTarget.trim()
    if (t && !targets.includes(t)) setTargets(p => [...p, t])
    setNewTarget('')
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    await updateBehaviorPlan(plan.id, { targetBehaviors: targets, antecedentStrategies: antStrat, replacementBehaviors: replacement, interventionSteps: steps })
    setSaving(false); setEditing(false); onChanged()
  }
  const removePlan = async () => {
    if (saving) return
    setSaving(true)
    await deleteBehaviorPlan(plan.id)
    setSaving(false); onChanged()
  }
  const delEvent = async (id) => { await deleteBehaviorEvent(id); setEvents(p => p.filter(e => e.id !== id)) }

  const recent = events.slice(0, 6)

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 15px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--a-ink)' }}>{plan.residentName || 'Resident'}</span>
        <span style={{ flex: 1 }} />
        {canEdit && !editing && <button onClick={startEdit} style={{ border: 0, background: 'transparent', color: 'var(--a-sage)', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Edit</button>}
      </div>

      {/* Target behaviors */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Target behaviors</div>
        {editing ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {[...new Set([...COMMON_BEHAVIORS, ...targets])].map(b => {
                const on = targets.includes(b)
                return <button key={b} type="button" onClick={() => toggleTarget(b)} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? `${color}1a` : 'transparent', color: on ? color : 'var(--a-ink3)', border: `1px solid ${on ? `${color}66` : 'var(--a-line)'}` }}>{b}</button>
              })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newTarget} onChange={e => setNewTarget(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewTarget() } }} placeholder="Add another behavior…" style={{ flex: 1, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '8px 11px', fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
              <button type="button" onClick={addNewTarget} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink2)', cursor: 'pointer' }}>Add</button>
            </div>
          </>
        ) : (
          (plan.targetBehaviors || []).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {plan.targetBehaviors.map(b => <span key={b} style={{ fontSize: 11.5, fontWeight: 700, color, background: `${color}14`, padding: '3px 10px', borderRadius: 999, border: `1px solid ${color}33` }}>{b}</span>)}
            </div>
          ) : <div style={{ fontSize: 12, color: 'var(--a-ink3)' }}>No target behaviors set.</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PlanField label="Antecedent strategies" value={editing ? antStrat : plan.antecedentStrategies} editing={editing} onChange={setAntStrat} placeholder="How staff set things up to prevent the behavior…" />
        <PlanField label="Replacement behaviors" value={editing ? replacement : plan.replacementBehaviors} editing={editing} onChange={setReplacement} placeholder="What the resident can do instead…" />
        <PlanField label="Intervention steps" value={editing ? steps : plan.interventionSteps} editing={editing} onChange={setSteps} placeholder="Step-by-step what staff do when it happens…" />
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={removePlan} disabled={saving} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid #e0b4ab', borderRadius: 10, fontSize: 12.5, color: '#a93a25', fontFamily: 'Geist', cursor: 'pointer' }}>Delete plan</button>
          <span style={{ flex: 1 }} />
          <button onClick={() => setEditing(false)} disabled={saving} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink2)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ padding: '10px 18px', background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save plan'}</button>
        </div>
      ) : (<>
        {/* Per-target-behavior frequency mini-charts */}
        {(plan.targetBehaviors || []).length > 0 && (
          <div style={{ marginTop: 14, borderTop: '1px dashed var(--a-line)', paddingTop: 12 }}>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Frequency · last 14 days</div>
            {plan.targetBehaviors.map((b, i) => (
              <div key={b} style={{ marginTop: i === 0 ? 6 : 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)' }}>{b}</div>
                <FreqChart events={events} behavior={b} color={color} />
              </div>
            ))}
          </div>
        )}

        <AbcEntry user={user} houseUuid={houseUuid} plan={plan} targetBehaviors={plan.targetBehaviors || []} color={color}
          onSaved={(row) => setEvents(p => [row, ...p])} />

        {/* Recent ABC log */}
        {recent.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Recent entries</div>
            {recent.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: i < recent.length - 1 ? '1px dashed var(--a-line)' : '' }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: intensityColor(e.intensity), marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a-ink)' }}>{e.behavior}{e.intensity ? ` · ${e.intensity}` : ''}</div>
                  {(e.antecedent || e.consequence || e.intervention) && (
                    <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 2, lineHeight: 1.4 }}>
                      {[e.antecedent && `A: ${e.antecedent}`, e.consequence && `C: ${e.consequence}`, e.intervention && `I: ${e.intervention}`].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--a-ink3)', marginTop: 2 }}>{shortDate(e.occurredAt)}{e.by ? ` · ${e.by}` : ''}</div>
                </div>
                {canEdit && <button onClick={() => delEvent(e.id)} aria-label="Delete entry" style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>}
              </div>
            ))}
          </div>
        )}
      </>)}
    </div>
  )
}

// New-plan modal (managers/supervisors only).
function PlanForm({ user, houseUuid, residents, existingResidentIds, onClose, onSaved }) {
  const available = residents.filter(r => !existingResidentIds.includes(r.id))
  const [residentId, setResidentId] = useState(available[0]?.id || '')
  const [targets, setTargets] = useState([])
  const [newTarget, setNewTarget] = useState('')
  const [antStrat, setAntStrat] = useState('')
  const [replacement, setReplacement] = useState('')
  const [steps, setSteps] = useState('')
  const [saving, setSaving] = useState(false)

  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }

  const toggleTarget = (b) => setTargets(p => p.includes(b) ? p.filter(x => x !== b) : [...p, b])
  const addNewTarget = () => { const t = newTarget.trim(); if (t && !targets.includes(t)) setTargets(p => [...p, t]); setNewTarget('') }

  const save = async (e) => {
    e.preventDefault()
    if (!residentId || saving) return
    setSaving(true)
    const r = residents.find(x => x.id === residentId)
    await createBehaviorPlan(user.orgId, {
      houseId: houseUuid, residentId, residentName: r?.name || null,
      targetBehaviors: targets, antecedentStrategies: antStrat.trim(),
      replacementBehaviors: replacement.trim(), interventionSteps: steps.trim(),
      createdByName: user?.name || null,
    })
    setSaving(false); onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 4 }}>New behavior support plan</div>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 14 }}>Define target behaviors + the staff playbook. Staff log ABC data each time a behavior occurs.</div>
        {available.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--a-ink3)', padding: '12px 0' }}>Every resident in this house already has a plan.</div>
        ) : (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div><div style={lbl}>Resident</div>
              <select value={residentId} onChange={e => setResidentId(e.target.value)} style={input}>
                {available.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div><div style={lbl}>Target behaviors</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {[...new Set([...COMMON_BEHAVIORS, ...targets])].map(b => {
                  const on = targets.includes(b)
                  return <button key={b} type="button" onClick={() => toggleTarget(b)} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? '#dde6f0' : 'transparent', color: on ? '#3c5887' : 'var(--a-ink3)', border: `1px solid ${on ? '#b9c6da' : 'var(--a-line)'}` }}>{b}</button>
                })}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newTarget} onChange={e => setNewTarget(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewTarget() } }} placeholder="Add another behavior…" style={{ ...input, flex: 1 }} />
                <button type="button" onClick={addNewTarget} style={{ padding: '0 16px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink2)', cursor: 'pointer' }}>Add</button>
              </div>
            </div>
            <div><div style={lbl}>Antecedent strategies</div><textarea value={antStrat} onChange={e => setAntStrat(e.target.value)} rows={3} placeholder="How staff set things up to prevent the behavior…" style={{ ...input, resize: 'vertical' }} /></div>
            <div><div style={lbl}>Replacement behaviors</div><textarea value={replacement} onChange={e => setReplacement(e.target.value)} rows={2} placeholder="What the resident can do instead…" style={{ ...input, resize: 'vertical' }} /></div>
            <div><div style={lbl}>Intervention steps</div><textarea value={steps} onChange={e => setSteps(e.target.value)} rows={4} placeholder="Step-by-step what staff do when it happens…" style={{ ...input, resize: 'vertical' }} /></div>
            <button type="submit" disabled={!residentId || saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: residentId ? 'pointer' : 'default', opacity: residentId ? 1 : 0.5 }}>{saving ? 'Saving…' : 'Create plan'}</button>
          </form>
        )}
      </div>
    </div>
  )
}

export function Behavior({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [] }) {
  const canEdit = user?.role === 'supervisor' || user?.role === 'manager'
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const reload = useCallback(() => {
    if (!user?.orgId || !houseUuid) { setPlans([]); setLoading(false); return }
    setLoading(true)
    fetchBehaviorPlans(user.orgId, { houseId: houseUuid }).then(p => { setPlans(p); setLoading(false) })
  }, [user?.orgId, houseUuid])
  useEffect(() => { reload() }, [reload])

  const existingResidentIds = plans.map(p => p.residentId).filter(Boolean)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Behavior support</span>
        {canEdit && residents.length > 0 && (
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: houseColor, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}><IconPlus size={13} sw={2.2} /> New plan</button>
        )}
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Loading…</div>}

      {!loading && plans.length === 0 && (
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>No behavior plans yet</div>
          <div style={{ fontSize: 12, color: 'var(--a-ink3)', lineHeight: 1.5 }}>
            {residents.length === 0 ? 'Add a resident first, then build their behavior support plan.' : canEdit ? 'Create a behavior support plan so staff have a clear playbook and can log ABC data each shift.' : 'No behavior support plans have been set for this house yet.'}
          </div>
        </div>
      )}

      {!loading && plans.map(p => (
        <PlanCard key={p.id} user={user} houseUuid={houseUuid} plan={p} color={houseColor} canEdit={canEdit} onChanged={reload} />
      ))}

      {!loading && plans.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 2px 8px', marginTop: 2 }}>
          {INTENSITY.map(it => (
            <span key={it.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: 'var(--a-ink3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: it.color }} />{it.id}
            </span>
          ))}
        </div>
      )}

      {showForm && <PlanForm user={user} houseUuid={houseUuid} residents={residents} existingResidentIds={existingResidentIds} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload() }} />}
    </>
  )
}
