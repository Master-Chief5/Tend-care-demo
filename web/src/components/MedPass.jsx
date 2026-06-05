import { useState, useEffect, useCallback } from 'react'
import { fetchMedPass, fetchMeds, addMed, deleteMed, recordMed, fetchPrnMeds, logPrn, fetchPrnLog } from '../lib/db'
import { IconPlus, IconCheck } from './icons'

// 24h "HH:MM" -> "8:00 AM"
function fmt(t) {
  const [h, m] = (t || '').split(':').map(Number)
  if (isNaN(h)) return t
  const ap = h < 12 ? 'AM' : 'PM'
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${ap}`
}

const TIME_PRESETS = [
  { label: 'Morning', t: '08:00' }, { label: 'Noon', t: '12:00' },
  { label: 'Afternoon', t: '15:00' }, { label: 'Evening', t: '18:00' },
  { label: 'Bedtime', t: '21:00' },
]
const ROUTES = ['Oral', 'Topical', 'Injection', 'Inhaled', 'Other']
const STATUS = {
  given:    { label: 'Given',   bg: '#dee6df', tc: '#3f604d' },
  some:     { label: 'Some',    bg: '#e7eddf', tc: '#5a7042' },
  prompted: { label: 'Prompt',  bg: '#dde6f0', tc: '#3c5887' },
  refused:  { label: 'Refused', bg: '#fadcd7', tc: '#a93a25' },
  held:     { label: 'Held',    bg: '#f5e9d6', tc: '#a47012' },
}

function AddMedForm({ residents, houseUuid, user, onClose, onSaved }) {
  const [residentId, setResidentId] = useState(residents[0]?.id || '')
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [route, setRoute] = useState('Oral')
  const [times, setTimes] = useState([])
  const [prn, setPrn] = useState(false)
  const [prnReason, setPrnReason] = useState('')
  const [prescriber, setPrescriber] = useState('')
  const [saving, setSaving] = useState(false)
  const toggle = (t) => setTimes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t].sort())
  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }
  const valid = name.trim() && residentId && (prn || times.length > 0)
  const save = async (e) => {
    e.preventDefault(); if (!valid || saving) return
    setSaving(true)
    await addMed(user.orgId, { houseId: houseUuid, residentId, name: name.trim(), dose: dose.trim(), route, times: prn ? [] : times, prn, prnReason: prnReason.trim(), prescriber: prescriber.trim() })
    setSaving(false); onSaved()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 14 }}>Add medication</div>
        {residents.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--a-ink3)', padding: '8px 0 16px' }}>Add a resident first — medications attach to a resident.</div>
        ) : (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><div style={lbl}>Resident</div>
              <select value={residentId} onChange={e => setResidentId(e.target.value)} style={input}>
                {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <div><div style={lbl}>Medication</div><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Levetiracetam" style={input} /></div>
              <div><div style={lbl}>Dose</div><input value={dose} onChange={e => setDose(e.target.value)} placeholder="500 mg" style={input} /></div>
            </div>
            <div><div style={lbl}>Route</div>
              <select value={route} onChange={e => setRoute(e.target.value)} style={input}>{ROUTES.map(r => <option key={r}>{r}</option>)}</select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-ink2)', padding: '2px 0' }}>
              <input type="checkbox" checked={prn} onChange={e => setPrn(e.target.checked)} /> PRN (as needed)
            </label>
            {prn ? (
              <div><div style={lbl}>When to give (reason)</div><input value={prnReason} onChange={e => setPrnReason(e.target.value)} placeholder="e.g. for agitation, max every 6h" style={input} /></div>
            ) : (
              <div><div style={lbl}>Scheduled times</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TIME_PRESETS.map(p => {
                    const on = times.includes(p.t)
                    return <button key={p.t} type="button" onClick={() => toggle(p.t)} style={{ padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? 'var(--a-ink)' : 'transparent', color: on ? 'var(--a-card)' : 'var(--a-ink2)', border: on ? 0 : '1px solid var(--a-line)' }}>{p.label} · {fmt(p.t)}</button>
                  })}
                </div>
              </div>
            )}
            <div><div style={lbl}>Prescriber (optional)</div><input value={prescriber} onChange={e => setPrescriber(e.target.value)} placeholder="Dr. name" style={input} /></div>
            <button type="submit" disabled={!valid || saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: valid ? 'pointer' : 'default', opacity: valid ? 1 : 0.5 }}>
              {saving ? 'Saving…' : 'Add medication'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export function MedPass({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [], canAdd = true }) {
  const [doses, setDoses] = useState([])
  const [prnMeds, setPrnMeds] = useState([])
  const [prnLog, setPrnLog] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [prnFor, setPrnFor] = useState(null)   // med being logged
  const today = new Date()

  const reload = useCallback(() => {
    if (!user?.orgId || !houseUuid) { setDoses([]); setPrnMeds([]); setPrnLog([]); return }
    fetchMedPass(user.orgId, houseUuid, today).then(setDoses)
    fetchPrnMeds(user.orgId, houseUuid).then(setPrnMeds)
    fetchPrnLog(user.orgId, houseUuid, today).then(setPrnLog)
  }, [user?.orgId, houseUuid])
  useEffect(() => { reload() }, [reload])

  const record = async (d, status) => {
    await recordMed(user.orgId, houseUuid, d.medId, today, d.time, d.status === status ? 'due' : status, user?.name || 'Staff')
    reload()
  }
  const doneCount = doses.filter(d => d.status !== 'due').length

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Med pass · today{doses.length > 0 && <span style={{ color: doneCount === doses.length ? 'var(--a-sage)' : 'var(--a-clay)', marginLeft: 6 }}>{doneCount}/{doses.length} done</span>}
        </span>
        {canAdd && (
          <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: houseColor, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconPlus size={13} sw={2.2} /> Add medication
          </button>
        )}
      </div>

      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: prnMeds.length ? 10 : 14 }}>
        {doses.length === 0 && (
          <div style={{ padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>No scheduled meds today.{canAdd ? ' Tap “Add medication”.' : ''}</div>
        )}
        {doses.map((d, i) => (
          <div key={d.key} style={{ padding: '10px 14px', borderBottom: i < doses.length - 1 ? '1px solid var(--a-line)' : '' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink2)', minWidth: 62 }}>{fmt(d.time)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.resident}</div>
                <div style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>{d.med}{d.dose ? ` · ${d.dose}` : ''}{d.route ? ` · ${d.route}` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {Object.entries(STATUS).map(([k, v]) => {
                const on = d.status === k
                return <button key={k} onClick={() => record(d, k)} style={{ flex: '1 1 28%', padding: '6px 4px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? v.bg : 'transparent', color: on ? v.tc : 'var(--a-ink3)', border: `1px solid ${on ? v.tc + '55' : 'var(--a-line)'}`, whiteSpace: 'nowrap' }}>{on && <IconCheck size={10} sw={3} style={{ marginRight: 3 }} />}{v.label}</button>
              })}
            </div>
            {d.status !== 'due' && d.by && <div style={{ fontSize: 10, color: 'var(--a-ink3)', marginTop: 4 }}>{STATUS[d.status].label} by {d.by}</div>}
          </div>
        ))}
      </div>

      {prnMeds.length > 0 && (
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--a-line)' }}>PRN · as needed</div>
          {prnMeds.map(m => {
            const count = prnLog.filter(l => l.med_id === m.id).length
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--a-line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.residentName} · {m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{m.dose ? `${m.dose} · ` : ''}{m.prnReason || 'as needed'}{count > 0 ? ` · given ${count}× today` : ''}</div>
                </div>
                <button onClick={() => setPrnFor(m)} style={{ background: houseColor, color: '#fff', border: 0, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Log given</button>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && canAdd && <AddMedForm residents={residents} houseUuid={houseUuid} user={user} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); reload() }} />}
      {prnFor && <PrnLogForm med={prnFor} user={user} houseUuid={houseUuid} onClose={() => setPrnFor(null)} onSaved={() => { setPrnFor(null); reload() }} />}
    </>
  )
}

function PrnLogForm({ med, user, houseUuid, onClose, onSaved }) {
  const [reason, setReason] = useState('')
  const [effect, setEffect] = useState('')
  const [saving, setSaving] = useState(false)
  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const save = async (e) => {
    e.preventDefault(); if (!reason.trim() || saving) return
    setSaving(true)
    await logPrn(user.orgId, { medId: med.id, houseId: houseUuid, residentId: med.resident_id, residentName: med.residentName, medName: med.name, reason: reason.trim(), effect: effect.trim(), by: user?.name || 'Staff' })
    setSaving(false); onSaved()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 21, marginBottom: 4 }}>Log PRN — {med.name}</div>
        <div style={{ fontSize: 12.5, color: 'var(--a-ink3)', marginBottom: 14 }}>{med.residentName}{med.dose ? ` · ${med.dose}` : ''}</div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason given (e.g. agitation)" style={input} />
          <input value={effect} onChange={e => setEffect(e.target.value)} placeholder="Effect / follow-up (optional)" style={input} />
          <button type="submit" disabled={!reason.trim() || saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: reason.trim() ? 'pointer' : 'default', opacity: reason.trim() ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Log dose'}
          </button>
        </form>
      </div>
    </div>
  )
}
