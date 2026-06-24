import { useState, useEffect, useCallback } from 'react'
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment } from '../lib/db'
import { IconCal, IconCar, IconCheck, IconPlus } from './icons'

// Per-resident medical appointment tracker, surfaced inside the Health section.
// Upcoming list reuses the Events/Driving card style: date, provider, type, and
// a transport flag. Managers/supervisors can add, mark complete (recording an
// outcome), and remove. DSPs see the list read-only.

const TYPES = [
  { id: 'dental',     label: 'Dental',     color: '#3c5887' },
  { id: 'physical',   label: 'Physical',   color: 'var(--a-sage)' },
  { id: 'psychiatry', label: 'Psychiatry', color: '#6c3a55' },
  { id: 'vision',     label: 'Vision',     color: '#2f9489' },
  { id: 'specialist', label: 'Specialist', color: '#b9892f' },
  { id: 'lab',        label: 'Lab',        color: '#a47012' },
  { id: 'other',      label: 'Other',      color: 'var(--a-ink2)' },
]
const typeOf = (id) => TYPES.find(t => t.id === id) || { id, label: id || 'Other', color: 'var(--a-ink2)' }

const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }
const sectionHead = { fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '4px 0 8px' }

function fmtWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

function ApptForm({ houseColor, residents, defaultResidentId, onSave, onCancel, saving }) {
  const [residentId, setResidentId] = useState(defaultResidentId || residents[0]?.id || '')
  const [type, setType] = useState('dental')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [provider, setProvider] = useState('')
  const [reason, setReason] = useState('')
  const [transport, setTransport] = useState(true)

  const ready = residentId && date && time && provider.trim() && !saving

  const submit = (e) => {
    e.preventDefault()
    if (!ready) return
    let apptAt = null
    try { apptAt = new Date(`${date}T${time}`).toISOString() } catch { apptAt = null }
    onSave({ residentId, type, apptAt, provider: provider.trim(), reason: reason.trim(), transportNeeded: transport })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div><div style={lbl}>Resident</div>
        <select value={residentId} onChange={e => setResidentId(e.target.value)} style={input}>
          {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div><div style={lbl}>Type</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {TYPES.map(t => {
            const on = type === t.id
            return <button key={t.id} type="button" onClick={() => setType(t.id)} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? t.color : 'transparent', color: on ? '#fff' : 'var(--a-ink2)', border: on ? 0 : '1px solid var(--a-line)' }}>{t.label}</button>
          })}
        </div>
      </div>
      <div><div style={lbl}>When</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...input, flex: 1 }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...input, flex: 1 }} />
        </div>
      </div>
      <div><div style={lbl}>Provider</div><input value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Riverside Dental, Dr. Patel" style={input} /></div>
      <div><div style={lbl}>Reason (optional)</div><input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Routine cleaning" style={input} /></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-ink2)', cursor: 'pointer' }}>
        <input type="checkbox" checked={transport} onChange={e => setTransport(e.target.checked)} />
        Transport needed
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>Cancel</button>
        <button type="submit" disabled={!ready} style={{ flex: 2, background: houseColor, color: '#fff', border: 0, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.5 }}>
          {saving ? 'Saving…' : 'Add appointment'}
        </button>
      </div>
    </form>
  )
}

function OutcomeForm({ houseColor, onSave, onCancel, saving }) {
  const [outcome, setOutcome] = useState('')
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(outcome.trim()) }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea value={outcome} onChange={e => setOutcome(e.target.value)} rows={3} placeholder="Visit outcome — findings, follow-up, new orders…" style={{ ...input, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>Cancel</button>
        <button type="submit" disabled={saving} style={{ flex: 2, background: houseColor, color: '#fff', border: 0, borderRadius: 10, padding: '10px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Mark complete'}
        </button>
      </div>
    </form>
  )
}

function ApptCard({ row, residentName, canManage, onComplete, onDelete }) {
  const t = typeOf(row.type)
  const [outcomeMode, setOutcomeMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const isDone = row.status === 'completed'

  const complete = async (outcome) => {
    setSaving(true)
    await Promise.resolve(onComplete(row.id, outcome)).catch(() => {})
    setSaving(false); setOutcomeMode(false)
  }

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, opacity: isDone ? 0.85 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999, color: '#fff', background: t.color, marginBottom: 6 }}>{t.label.toUpperCase()}</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1.3 }}>{residentName || row.resident_name}</div>
          {row.provider && <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 1 }}>{row.provider}</div>}
        </div>
        {canManage && (
          <button onClick={() => onDelete(row.id)} aria-label="Delete appointment" style={{ background: 'transparent', border: 0, cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '2px 4px', color: 'var(--a-ink3)' }}>✕</button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--a-ink2)' }}>
        <IconCal size={15} color="var(--a-ink3)" />
        <span>{fmtWhen(row.appt_at)}</span>
      </div>
      {row.reason && <div style={{ fontSize: 12.5, color: 'var(--a-ink3)', marginTop: 4 }}>{row.reason}</div>}
      {row.transport_needed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#3c5887', marginTop: 6, fontWeight: 600 }}>
          <IconCar size={14} sw={1.8} color="#3c5887" /><span>Transport needed</span>
        </div>
      )}

      {isDone ? (
        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--a-sage)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconCheck size={14} color="var(--a-sage)" /> Completed{row.outcome ? '' : ''}
        </div>
      ) : canManage && (
        outcomeMode
          ? <div style={{ marginTop: 10 }}><OutcomeForm houseColor={t.color} onSave={complete} onCancel={() => setOutcomeMode(false)} saving={saving} /></div>
          : <button onClick={() => setOutcomeMode(true)} style={{ marginTop: 10, width: '100%', padding: '9px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>Mark complete + record outcome</button>
      )}
      {isDone && row.outcome && (
        <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--a-ink2)', lineHeight: 1.4, background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '8px 10px' }}>{row.outcome}</div>
      )}
    </div>
  )
}

export function Appointments({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [], residentId = null }) {
  const orgId = user?.orgId
  const canManage = user?.role !== 'staff'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(() => {
    if (!orgId || !houseUuid) { setRows([]); setLoading(false); return }
    setLoading(true)
    Promise.resolve(fetchAppointments(orgId, { houseId: houseUuid }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseUuid])
  useEffect(() => { reload() }, [reload])

  const nameOf = (rid) => residents.find(r => r.id === rid)?.name || ''

  const visible = (rows || []).filter(r => !residentId || r.resident_id === residentId)
  const upcoming = visible.filter(r => r.status !== 'completed')
  const past = visible.filter(r => r.status === 'completed')

  const add = async (data) => {
    setSaving(true)
    await Promise.resolve(createAppointment(orgId, {
      houseId: houseUuid, residentId: data.residentId, residentName: nameOf(data.residentId),
      apptAt: data.apptAt, provider: data.provider, type: data.type, reason: data.reason,
      transportNeeded: data.transportNeeded, createdByName: user?.name,
    })).catch(() => null)
    setSaving(false); setAdding(false); reload()
  }

  const complete = async (id, outcome) => {
    await Promise.resolve(updateAppointment(id, { status: 'completed', outcome })).catch(() => null)
    reload()
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this appointment?')) return
    await Promise.resolve(deleteAppointment(id)).catch(() => null)
    reload()
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px' }}>
        <span style={sectionHead}>Medical appointments</span>
        {canManage && residents.length > 0 && !adding && (
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: houseColor, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconPlus size={13} sw={2.2} /> Add
          </button>
        )}
      </div>

      {adding && (
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px', marginBottom: 12 }}>
          <ApptForm houseColor={houseColor} residents={residents} defaultResidentId={residentId} onSave={add} onCancel={() => setAdding(false)} saving={saving} />
        </div>
      )}

      {loading && <div style={{ padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Loading…</div>}

      {!loading && upcoming.length === 0 && !adding && (
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '16px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>
          No upcoming appointments.{canManage && residents.length > 0 ? ' Tap “Add” to schedule one.' : ''}
        </div>
      )}

      {upcoming.map(r => (
        <ApptCard key={r.id} row={r} residentName={nameOf(r.resident_id) || r.resident_name} canManage={canManage} onComplete={complete} onDelete={remove} />
      ))}

      {past.length > 0 && (
        <>
          <div style={{ ...sectionHead, marginTop: 12 }}>Completed</div>
          {past.map(r => (
            <ApptCard key={r.id} row={r} residentName={nameOf(r.resident_id) || r.resident_name} canManage={canManage} onComplete={complete} onDelete={remove} />
          ))}
        </>
      )}
    </div>
  )
}
