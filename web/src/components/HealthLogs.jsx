import { useState, useEffect, useCallback } from 'react'
import { fetchHealthLogs, addHealthLog, deleteHealthLog } from '../lib/db'

// The recurring resident health trackers a group home is expected to keep.
const TRACKERS = [
  { id: 'bm',       label: 'BM',       emoji: '🚽', color: '#a47012' },
  { id: 'seizure',  label: 'Seizure',  emoji: '⚡', color: '#a93a25' },
  { id: 'sleep',    label: 'Sleep',    emoji: '😴', color: '#3c5887' },
  { id: 'meal',     label: 'Meal',     emoji: '🍽️', color: '#3f7050' },
  { id: 'fluid',    label: 'Fluids',   emoji: '💧', color: '#2f9489' },
  { id: 'weight',   label: 'Weight',   emoji: '⚖️', color: '#6c3a55' },
  { id: 'vitals',   label: 'Vitals',   emoji: '❤️', color: '#cf4f3b' },
  { id: 'behavior', label: 'Behavior', emoji: '⚠️', color: '#b8552f' },
]
const trackerOf = (id) => TRACKERS.find(t => t.id === id) || { id, label: id, emoji: '•', color: 'var(--a-ink3)' }

const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }

function Choice({ value, set, choices }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {choices.map(c => (
        <button key={c} type="button" onClick={() => set(c)} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: value === c ? 'var(--a-ink)' : 'transparent', color: value === c ? 'var(--a-card)' : 'var(--a-ink2)', border: value === c ? 0 : '1px solid var(--a-line)' }}>{c}</button>
      ))}
    </div>
  )
}

// One short summary line per entry, built from its structured detail.
function summarize(h) {
  const d = h.detail || {}
  switch (h.kind) {
    case 'bm':       return d.consistency || 'Logged'
    case 'seizure':  return `${h.amount != null ? `${h.amount} min` : ''}${d.type ? ` · ${d.type}` : ''}`.trim() || 'Seizure'
    case 'sleep':    return `${h.amount != null ? `${h.amount} hr` : ''}${d.quality ? ` · ${d.quality}` : ''}`.trim() || 'Sleep'
    case 'meal':     return `${d.meal || 'Meal'}${d.intake ? ` · ate ${d.intake.toLowerCase()}` : ''}`
    case 'fluid':    return h.amount != null ? `${h.amount} oz` : 'Fluids'
    case 'weight':   return h.amount != null ? `${h.amount} lb` : 'Weight'
    case 'vitals':   return [d.temp && `${d.temp}°`, d.bp, d.pulse && `${d.pulse} bpm`, d.o2 && `${d.o2}% O₂`].filter(Boolean).join(' · ') || 'Vitals'
    case 'behavior': return `${d.intensity ? `${d.intensity}: ` : ''}${d.behavior || 'Behavior'}`
    default:         return 'Logged'
  }
}

function LogSheet({ tracker, residentId, residentName, user, houseUuid, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [c1, setC1] = useState('')   // primary choice (consistency / meal / quality / intensity)
  const [c2, setC2] = useState('')   // secondary choice (intake)
  const [text, setText] = useState('')  // seizure type
  const [v, setV] = useState({ temp: '', bp: '', pulse: '', o2: '' })  // vitals
  const [abc, setAbc] = useState({ antecedent: '', behavior: '', consequence: '' })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault(); if (saving) return
    const detail = {}
    let amt = amount ? Number(amount) : null
    if (tracker.id === 'bm') detail.consistency = c1 || 'Normal'
    if (tracker.id === 'seizure') detail.type = text.trim()
    if (tracker.id === 'sleep') detail.quality = c1
    if (tracker.id === 'meal') { detail.meal = c1 || 'Meal'; detail.intake = c2 }
    if (tracker.id === 'vitals') { detail.temp = v.temp; detail.bp = v.bp; detail.pulse = v.pulse; detail.o2 = v.o2; amt = null }
    if (tracker.id === 'behavior') { detail.antecedent = abc.antecedent.trim(); detail.behavior = abc.behavior.trim(); detail.consequence = abc.consequence.trim(); detail.intensity = c1 }
    setSaving(true)
    await addHealthLog(user.orgId, { houseId: houseUuid, residentId, kind: tracker.id, amount: amt, detail, note: note.trim(), by: user?.name || 'Staff' })
    setSaving(false); onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 2 }}>{tracker.emoji} {tracker.label}</div>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 14 }}>{residentName}</div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tracker.id === 'bm' && <div><div style={lbl}>Consistency</div><Choice value={c1} set={setC1} choices={['Normal', 'Loose', 'Hard', 'Small', 'None']} /></div>}

          {tracker.id === 'seizure' && <>
            <div><div style={lbl}>Duration (minutes)</div><input type="number" step="0.5" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 2" style={input} /></div>
            <div><div style={lbl}>Type</div><input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. tonic-clonic, absence" style={input} /></div>
          </>}

          {tracker.id === 'sleep' && <>
            <div><div style={lbl}>Hours slept</div><input type="number" step="0.5" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 7.5" style={input} /></div>
            <div><div style={lbl}>Quality</div><Choice value={c1} set={setC1} choices={['Good', 'Fair', 'Poor', 'Up often']} /></div>
          </>}

          {tracker.id === 'meal' && <>
            <div><div style={lbl}>Meal</div><Choice value={c1} set={setC1} choices={['Breakfast', 'Lunch', 'Dinner', 'Snack']} /></div>
            <div><div style={lbl}>How much eaten</div><Choice value={c2} set={setC2} choices={['All', 'Most', 'Half', 'Some', 'None']} /></div>
          </>}

          {tracker.id === 'fluid' && <div><div style={lbl}>Amount (oz)</div><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 8" style={input} /></div>}

          {tracker.id === 'weight' && <div><div style={lbl}>Weight (lb)</div><input type="number" step="0.1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 165" style={input} /></div>}

          {tracker.id === 'vitals' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={lbl}>Temp (°F)</div><input value={v.temp} onChange={e => setV({ ...v, temp: e.target.value })} placeholder="98.6" style={input} /></div>
              <div><div style={lbl}>Blood pressure</div><input value={v.bp} onChange={e => setV({ ...v, bp: e.target.value })} placeholder="120/80" style={input} /></div>
              <div><div style={lbl}>Pulse</div><input value={v.pulse} onChange={e => setV({ ...v, pulse: e.target.value })} placeholder="72" style={input} /></div>
              <div><div style={lbl}>O₂ sat (%)</div><input value={v.o2} onChange={e => setV({ ...v, o2: e.target.value })} placeholder="98" style={input} /></div>
            </div>
          )}

          {tracker.id === 'behavior' && <>
            <div><div style={lbl}>Antecedent (what came before)</div><input value={abc.antecedent} onChange={e => setAbc({ ...abc, antecedent: e.target.value })} placeholder="e.g. asked to stop activity" style={input} /></div>
            <div><div style={lbl}>Behavior</div><input value={abc.behavior} onChange={e => setAbc({ ...abc, behavior: e.target.value })} placeholder="e.g. yelling, threw cup" style={input} /></div>
            <div><div style={lbl}>Consequence (what staff did)</div><input value={abc.consequence} onChange={e => setAbc({ ...abc, consequence: e.target.value })} placeholder="e.g. redirected, offered break" style={input} /></div>
            <div><div style={lbl}>Intensity</div><Choice value={c1} set={setC1} choices={['Mild', 'Moderate', 'Severe']} /></div>
          </>}

          <div><div style={lbl}>Note (optional)</div><input value={note} onChange={e => setNote(e.target.value)} placeholder="Anything else…" style={input} /></div>
          <button type="submit" disabled={saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>{saving ? 'Saving…' : `Log ${tracker.label.toLowerCase()}`}</button>
        </form>
      </div>
    </div>
  )
}

const fmtWhen = (iso) => {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return sameDay ? t : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${t}`
}

export function HealthLogs({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [] }) {
  const [residentId, setResidentId] = useState(residents[0]?.id || '')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null)   // null = all kinds
  const [sheet, setSheet] = useState(null)      // tracker being logged

  useEffect(() => { if (!residentId && residents[0]) setResidentId(residents[0].id) }, [residents, residentId])

  const reload = useCallback(() => {
    if (!user?.orgId || !houseUuid) { setLogs([]); setLoading(false); return }
    setLoading(true)
    fetchHealthLogs(user.orgId, houseUuid, null, 80).then(rows => { setLogs(rows); setLoading(false) })
  }, [user?.orgId, houseUuid])
  useEffect(() => { reload() }, [reload])

  const del = async (id) => { await deleteHealthLog(id); reload() }

  const resName = residents.find(r => r.id === residentId)?.name || 'resident'
  const visible = logs.filter(l => (!residentId || l.residentId === residentId) && (!filter || l.kind === filter))

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '4px 0 8px' }}>Health tracking</div>

      {residents.length === 0 ? (
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '20px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>
          Add a resident first to start health tracking.
        </div>
      ) : (
        <>
          {residents.length > 1 && (
            <select value={residentId} onChange={e => setResidentId(e.target.value)} style={{ ...input, marginBottom: 10 }}>
              {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}

          {/* Quick-log buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 14 }}>
            {TRACKERS.map(t => (
              <button key={t.id} onClick={() => setSheet(t)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px',
                background: 'var(--a-card)', border: `1px solid ${t.color}33`, borderRadius: 12, cursor: 'pointer', fontFamily: 'Geist',
              }}>
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--a-ink2)' }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Kind filter */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
            <button onClick={() => setFilter(null)} style={chip(filter === null)}>All</button>
            {TRACKERS.map(t => <button key={t.id} onClick={() => setFilter(filter === t.id ? null : t.id)} style={chip(filter === t.id)}>{t.emoji} {t.label}</button>)}
          </div>

          {loading && <div style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Loading…</div>}
          {!loading && visible.length === 0 && (
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '18px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>
              No entries yet for {resName}. Tap a tracker above to log one.
            </div>
          )}
          {!loading && visible.length > 0 && (
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
              {visible.map((h, i) => {
                const t = trackerOf(h.kind)
                return (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < visible.length - 1 ? '1px solid var(--a-line)' : '' }}>
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{t.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--a-ink)', fontWeight: 500 }}>
                        <span style={{ color: t.color, fontWeight: 700 }}>{t.label}</span> · {summarize(h)}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{fmtWhen(h.occurredAt)}{h.by ? ` · ${h.by}` : ''}{h.note ? ` · ${h.note}` : ''}</div>
                    </div>
                    <button onClick={() => del(h.id)} aria-label="Delete" style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, padding: '0 2px', flexShrink: 0 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {sheet && <LogSheet tracker={sheet} residentId={residentId} residentName={resName} user={user} houseUuid={houseUuid} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); reload() }} />}
    </>
  )
}

const chip = (active) => ({ flexShrink: 0, padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: active ? 'var(--a-ink)' : 'var(--a-card)', color: active ? 'var(--a-card)' : 'var(--a-ink2)', border: active ? 0 : '1px solid var(--a-line)', whiteSpace: 'nowrap' })
