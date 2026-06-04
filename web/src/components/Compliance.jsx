import { useState, useEffect, useCallback } from 'react'
import { fetchIncidents, addIncident, reviewIncident, deleteIncident, fetchDrills, addDrill, deleteDrill } from '../lib/db'
import { IconPlus, IconCheck } from './icons'

const INCIDENT_TYPES = ['Injury', 'Fall', 'Med error', 'Behavioral', 'Restraint', 'Elopement', 'Property', 'Other']
const SEVERITY = { Minor: { bg: '#dee6df', tc: '#3f604d' }, Moderate: { bg: '#f5e9d6', tc: '#a47012' }, Serious: { bg: '#fadcd7', tc: '#a93a25' } }
const DRILL_TYPES = ['Fire', 'Tornado', 'Evacuation', 'Lockdown']
const FIRE_INTERVAL_DAYS = 90

const fmtDate = (d) => { const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000)

function IncidentForm({ user, houseUuid, residents, onClose, onSaved }) {
  const [type, setType] = useState('Injury')
  const [residentId, setResidentId] = useState('')
  const [severity, setSeverity] = useState('Minor')
  const [text, setText] = useState('')
  const [actions, setActions] = useState('')
  const [notified, setNotified] = useState('')
  const [saving, setSaving] = useState(false)
  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }
  const save = async (e) => {
    e.preventDefault(); if (!text.trim() || saving) return
    setSaving(true)
    await addIncident(user.orgId, { houseId: houseUuid, residentId: residentId || null, type, severity, text: text.trim(), actions: actions.trim(), notified: notified.trim(), by: user?.name || 'Staff' })
    setSaving(false); onSaved()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 14 }}>Report incident</div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><div style={lbl}>Type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {INCIDENT_TYPES.map(t => <button key={t} type="button" onClick={() => setType(t)} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: type === t ? 'var(--a-ink)' : 'transparent', color: type === t ? 'var(--a-card)' : 'var(--a-ink2)', border: type === t ? 0 : '1px solid var(--a-line)' }}>{t}</button>)}
            </div>
          </div>
          {residents.length > 0 && (
            <div><div style={lbl}>Resident</div>
              <select value={residentId} onChange={e => setResidentId(e.target.value)} style={input}>
                <option value="">Not resident-specific</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div><div style={lbl}>Severity</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.keys(SEVERITY).map(s => <button key={s} type="button" onClick={() => setSeverity(s)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: severity === s ? SEVERITY[s].bg : 'transparent', color: severity === s ? SEVERITY[s].tc : 'var(--a-ink3)', border: `1px solid ${severity === s ? SEVERITY[s].tc + '55' : 'var(--a-line)'}` }}>{s}</button>)}
            </div>
          </div>
          <div><div style={lbl}>What happened</div><textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Describe the incident…" style={{ ...input, resize: 'vertical' }} /></div>
          <div><div style={lbl}>Actions taken</div><input value={actions} onChange={e => setActions(e.target.value)} placeholder="e.g. First aid, area cleared" style={input} /></div>
          <div><div style={lbl}>Who was notified</div><input value={notified} onChange={e => setNotified(e.target.value)} placeholder="e.g. Nurse, on-call mgr, guardian" style={input} /></div>
          <button type="submit" disabled={!text.trim() || saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: text.trim() ? 'pointer' : 'default', opacity: text.trim() ? 1 : 0.5 }}>{saving ? 'Saving…' : 'File report'}</button>
        </form>
      </div>
    </div>
  )
}

function DrillForm({ user, houseUuid, onClose, onSaved }) {
  const [type, setType] = useState('Fire')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [evacTime, setEvacTime] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }
  const save = async (e) => {
    e.preventDefault(); if (saving) return
    setSaving(true)
    await addDrill(user.orgId, { houseId: houseUuid, type, date, evacTime: evacTime.trim(), notes: notes.trim(), by: user?.name || 'Staff' })
    setSaving(false); onSaved()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 14 }}>Log safety drill</div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><div style={lbl}>Type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DRILL_TYPES.map(t => <button key={t} type="button" onClick={() => setType(t)} style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: type === t ? 'var(--a-ink)' : 'transparent', color: type === t ? 'var(--a-card)' : 'var(--a-ink2)', border: type === t ? 0 : '1px solid var(--a-line)' }}>{t}</button>)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><div style={lbl}>Date</div><input type="date" value={date} onChange={e => setDate(e.target.value)} style={input} /></div>
            <div><div style={lbl}>Evacuation time</div><input value={evacTime} onChange={e => setEvacTime(e.target.value)} placeholder="e.g. 2m 15s" style={input} /></div>
          </div>
          <div><div style={lbl}>Notes</div><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Issues, who participated…" style={input} /></div>
          <button type="submit" disabled={saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Log drill'}</button>
        </form>
      </div>
    </div>
  )
}

export function Compliance({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [] }) {
  const isSup = user?.role === 'supervisor' || user?.role === 'manager'
  const [incidents, setIncidents] = useState([])
  const [drills, setDrills] = useState([])
  const [showIncident, setShowIncident] = useState(false)
  const [showDrill, setShowDrill] = useState(false)

  const reload = useCallback(() => {
    if (!user?.orgId || !houseUuid) { setIncidents([]); setDrills([]); return }
    fetchIncidents(user.orgId, houseUuid).then(setIncidents)
    fetchDrills(user.orgId, houseUuid).then(setDrills)
  }, [user?.orgId, houseUuid])
  useEffect(() => { reload() }, [reload])

  const review = async (id) => { await reviewIncident(id, user?.name || 'Supervisor'); reload() }
  const delInc = async (id) => { await deleteIncident(id); reload() }
  const delDrill = async (id) => { await deleteDrill(id); reload() }

  const lastFire = drills.filter(d => d.type === 'Fire')[0]
  const fireDue = lastFire ? daysSince(lastFire.date) >= FIRE_INTERVAL_DAYS : true
  const openCount = incidents.filter(i => i.status === 'open').length

  const sectionHdr = (label, onAdd, addLabel) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: houseColor, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}><IconPlus size={13} sw={2.2} /> {addLabel}</button>
    </div>
  )

  return (
    <>
      {sectionHdr(<>Incidents{openCount > 0 && <span style={{ color: '#a93a25', marginLeft: 6 }}>{openCount} open</span>}</>, () => setShowIncident(true), 'Report')}
      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
        {incidents.length === 0 && <div style={{ padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>No incidents logged.</div>}
        {incidents.map((it, i) => {
          const sv = SEVERITY[it.severity] || SEVERITY.Minor
          return (
            <div key={it.id} style={{ padding: '11px 14px', borderBottom: i < incidents.length - 1 ? '1px solid var(--a-line)' : '' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--a-ink)', background: 'var(--a-paper)', padding: '1px 6px', borderRadius: 3, border: '1px solid var(--a-line)' }}>{it.type}</span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: sv.tc, background: sv.bg, padding: '1px 6px', borderRadius: 3 }}>{it.severity}</span>
                {it.resident && <span style={{ fontSize: 11.5, fontWeight: 600 }}>{it.resident}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color: it.status === 'reviewed' ? '#3f604d' : '#a93a25', background: it.status === 'reviewed' ? '#dee6df' : '#fadcd7', padding: '1px 7px', borderRadius: 999 }}>{it.status === 'reviewed' ? 'REVIEWED' : 'OPEN'}</span>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.4 }}>{it.text}</div>
              {it.actions && <div style={{ fontSize: 11.5, color: 'var(--a-ink2)', marginTop: 3 }}>Actions: {it.actions}</div>}
              {it.notified && <div style={{ fontSize: 11.5, color: 'var(--a-ink2)' }}>Notified: {it.notified}</div>}
              <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 3 }}>by {it.by || 'someone'} · {fmtDate(it.date)}{it.reviewed_by ? ` · reviewed by ${it.reviewed_by}` : ''}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                {isSup && it.status === 'open' && <button onClick={() => review(it.id)} style={{ background: 'transparent', border: 0, color: 'var(--a-sage)', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><IconCheck size={12} sw={2.5} /> Mark reviewed</button>}
                <button onClick={() => delInc(it.id)} style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 12, fontFamily: 'Geist', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {sectionHdr('Safety drills', () => setShowDrill(true), 'Log drill')}
      <div style={{ fontSize: 11.5, color: fireDue ? '#a93a25' : 'var(--a-ink3)', marginBottom: 8, fontWeight: fireDue ? 600 : 400 }}>
        {lastFire ? `Last fire drill ${fmtDate(lastFire.date)} (${daysSince(lastFire.date)}d ago).` : 'No fire drill logged yet.'} {fireDue && '⚠ Fire drill due (every 90 days).'}
      </div>
      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
        {drills.length === 0 && <div style={{ padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>No drills logged.</div>}
        {drills.map((d, i) => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < drills.length - 1 ? '1px solid var(--a-line)' : '' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{d.type} drill</div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{fmtDate(d.date)}{d.evac_time ? ` · evac ${d.evac_time}` : ''}{d.notes ? ` · ${d.notes}` : ''} · by {d.by || 'staff'}</div>
            </div>
            <button onClick={() => delDrill(d.id)} aria-label="Delete" style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>×</button>
          </div>
        ))}
      </div>

      {showIncident && <IncidentForm user={user} houseUuid={houseUuid} residents={residents} onClose={() => setShowIncident(false)} onSaved={() => { setShowIncident(false); reload() }} />}
      {showDrill && <DrillForm user={user} houseUuid={houseUuid} onClose={() => setShowDrill(false)} onSaved={() => { setShowDrill(false); reload() }} />}
    </>
  )
}
