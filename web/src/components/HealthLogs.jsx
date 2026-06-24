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

// Clinical normal ranges for vitals. Values outside [lo, hi] are flagged in the UI.
const VITAL_RANGES = {
  temp:      { lo: 97,  hi: 99.5, label: 'Temp',     unit: '°F' },
  pulse:     { lo: 60,  hi: 100,  label: 'Pulse',    unit: 'bpm' },
  resp:      { lo: 12,  hi: 20,   label: 'Resp',     unit: '/min' },
  o2:        { lo: 95,  hi: 100,  label: 'O₂',       unit: '%', loOnly: true },
  systolic:  { lo: 90,  hi: 140,  label: 'Systolic', unit: '' },
  diastolic: { lo: 60,  hi: 90,   label: 'Diastolic',unit: '' },
  glucose:   { lo: 70,  hi: 140,  label: 'Glucose',  unit: 'mg/dL' },
}
// Returns null if in range / not numeric, else 'high' | 'low'.
function flagVital(key, raw) {
  const r = VITAL_RANGES[key]
  if (!r || raw == null || raw === '') return null
  const n = Number(raw)
  if (!isFinite(n)) return null
  if (n < r.lo) return 'low'
  if (!r.loOnly && n > r.hi) return 'high'
  return null
}
// Parse a "120/80" string into { systolic, diastolic } numbers.
function parseBp(bp) {
  if (!bp) return {}
  const m = String(bp).match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)
  return m ? { systolic: m[1], diastolic: m[2] } : {}
}
const CLAY = 'var(--a-clay)'
// A vital value coloured clay with a small high/low tag when out of range.
function VitalSpan({ vkey, value, suffix = '' }) {
  const flag = flagVital(vkey, value)
  if (value == null || value === '') return null
  return (
    <span style={{ color: flag ? CLAY : 'inherit', fontWeight: flag ? 700 : 'inherit' }}>
      {value}{suffix}
      {flag && <span style={{ fontSize: 9, fontWeight: 700, color: CLAY, marginLeft: 2, textTransform: 'uppercase' }}>{flag === 'high' ? '↑hi' : '↓lo'}</span>}
    </span>
  )
}

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
    case 'seizure':  return [h.amount != null ? `${h.amount} min` : '', d.type, d.trigger && `trigger: ${d.trigger}`, d.intervention && `did: ${d.intervention}`, d.postictal && `after: ${d.postictal}`].filter(Boolean).join(' · ') || 'Seizure'
    case 'sleep':    return `${h.amount != null ? `${h.amount} hr` : ''}${d.quality ? ` · ${d.quality}` : ''}`.trim() || 'Sleep'
    case 'meal':     return `${d.meal || 'Meal'}${d.intake ? ` · ate ${d.intake.toLowerCase()}` : ''}`
    case 'fluid':    return h.amount != null ? `${h.amount} oz` : 'Fluids'
    case 'weight':   return h.amount != null ? `${h.amount} lb` : 'Weight'
    case 'vitals':   return [d.temp && `${d.temp}°`, d.bp, d.pulse && `${d.pulse} bpm`, d.resp && `${d.resp}/min`, d.o2 && `${d.o2}% O₂`, d.glucose && `${d.glucose} mg/dL`].filter(Boolean).join(' · ') || 'Vitals'
    case 'behavior': return `${d.intensity ? `${d.intensity}: ` : ''}${d.behavior || 'Behavior'}`
    default:         return 'Logged'
  }
}

// Vitals summary with out-of-range values flagged clay (used in the log feed).
function VitalsSummary({ detail }) {
  const d = detail || {}
  const bp = parseBp(d.bp)
  const parts = []
  if (d.temp) parts.push(<VitalSpan key="t" vkey="temp" value={d.temp} suffix="°" />)
  if (d.bp) parts.push(
    <span key="bp">
      <VitalSpan vkey="systolic" value={bp.systolic} />/<VitalSpan vkey="diastolic" value={bp.diastolic} />
    </span>
  )
  if (d.pulse) parts.push(<VitalSpan key="p" vkey="pulse" value={d.pulse} suffix=" bpm" />)
  if (d.resp) parts.push(<VitalSpan key="r" vkey="resp" value={d.resp} suffix="/min" />)
  if (d.o2) parts.push(<VitalSpan key="o" vkey="o2" value={d.o2} suffix="% O₂" />)
  if (d.glucose) parts.push(<VitalSpan key="g" vkey="glucose" value={d.glucose} suffix=" mg/dL" />)
  if (parts.length === 0) return <>Vitals</>
  return <>{parts.flatMap((p, i) => i === 0 ? [p] : [<span key={`s${i}`}> · </span>, p])}</>
}

function LogSheet({ tracker, residentId, residentName, user, houseUuid, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [c1, setC1] = useState('')   // primary choice (consistency / meal / quality / intensity)
  const [c2, setC2] = useState('')   // secondary choice (intake)
  const [text, setText] = useState('')  // seizure type
  const [sz, setSz] = useState({ trigger: '', intervention: '', postictal: '' })  // seizure extras
  const [v, setV] = useState({ temp: '', bp: '', pulse: '', resp: '', o2: '', glucose: '' })  // vitals
  const [abc, setAbc] = useState({ antecedent: '', behavior: '', consequence: '' })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault(); if (saving) return
    const detail = {}
    let amt = amount ? Number(amount) : null
    if (tracker.id === 'bm') detail.consistency = c1 || 'Normal'
    if (tracker.id === 'seizure') { detail.type = text.trim(); detail.trigger = sz.trigger.trim(); detail.intervention = sz.intervention.trim(); detail.postictal = sz.postictal.trim() }
    if (tracker.id === 'sleep') detail.quality = c1
    if (tracker.id === 'meal') { detail.meal = c1 || 'Meal'; detail.intake = c2 }
    if (tracker.id === 'vitals') { detail.temp = v.temp; detail.bp = v.bp; detail.pulse = v.pulse; detail.resp = v.resp; detail.o2 = v.o2; detail.glucose = v.glucose; amt = null }
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
            <div><div style={lbl}>Trigger (if known)</div><input value={sz.trigger} onChange={e => setSz({ ...sz, trigger: e.target.value })} placeholder="e.g. missed med, flashing lights, fever" style={input} /></div>
            <div><div style={lbl}>Intervention</div><input value={sz.intervention} onChange={e => setSz({ ...sz, intervention: e.target.value })} placeholder="e.g. positioned on side, rescue med, timed" style={input} /></div>
            <div><div style={lbl}>Post-state (postictal)</div><input value={sz.postictal} onChange={e => setSz({ ...sz, postictal: e.target.value })} placeholder="e.g. confused 10 min, slept, fully recovered" style={input} /></div>
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
              <div><div style={lbl}>Temp (°F){flagVital('temp', v.temp) && <span style={{ color: CLAY, fontWeight: 700, marginLeft: 4 }}>{flagVital('temp', v.temp)}</span>}</div><input value={v.temp} onChange={e => setV({ ...v, temp: e.target.value })} placeholder="98.6" style={{ ...input, ...(flagVital('temp', v.temp) ? { borderColor: CLAY } : {}) }} /></div>
              <div><div style={lbl}>Blood pressure{(flagVital('systolic', parseBp(v.bp).systolic) || flagVital('diastolic', parseBp(v.bp).diastolic)) && <span style={{ color: CLAY, fontWeight: 700, marginLeft: 4 }}>out of range</span>}</div><input value={v.bp} onChange={e => setV({ ...v, bp: e.target.value })} placeholder="120/80" style={{ ...input, ...((flagVital('systolic', parseBp(v.bp).systolic) || flagVital('diastolic', parseBp(v.bp).diastolic)) ? { borderColor: CLAY } : {}) }} /></div>
              <div><div style={lbl}>Pulse{flagVital('pulse', v.pulse) && <span style={{ color: CLAY, fontWeight: 700, marginLeft: 4 }}>{flagVital('pulse', v.pulse)}</span>}</div><input value={v.pulse} onChange={e => setV({ ...v, pulse: e.target.value })} placeholder="72" style={{ ...input, ...(flagVital('pulse', v.pulse) ? { borderColor: CLAY } : {}) }} /></div>
              <div><div style={lbl}>Resp (/min){flagVital('resp', v.resp) && <span style={{ color: CLAY, fontWeight: 700, marginLeft: 4 }}>{flagVital('resp', v.resp)}</span>}</div><input value={v.resp} onChange={e => setV({ ...v, resp: e.target.value })} placeholder="16" style={{ ...input, ...(flagVital('resp', v.resp) ? { borderColor: CLAY } : {}) }} /></div>
              <div><div style={lbl}>O₂ sat (%){flagVital('o2', v.o2) && <span style={{ color: CLAY, fontWeight: 700, marginLeft: 4 }}>low</span>}</div><input value={v.o2} onChange={e => setV({ ...v, o2: e.target.value })} placeholder="98" style={{ ...input, ...(flagVital('o2', v.o2) ? { borderColor: CLAY } : {}) }} /></div>
              <div><div style={lbl}>Glucose (mg/dL){flagVital('glucose', v.glucose) && <span style={{ color: CLAY, fontWeight: 700, marginLeft: 4 }}>{flagVital('glucose', v.glucose)}</span>}</div><input value={v.glucose} onChange={e => setV({ ...v, glucose: e.target.value })} placeholder="100" style={{ ...input, ...(flagVital('glucose', v.glucose) ? { borderColor: CLAY } : {}) }} /></div>
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

// Pull a numeric value for a given vital key out of a health-log detail JSON.
function vitalValue(h, key) {
  const d = h.detail || {}
  if (key === 'systolic' || key === 'diastolic') {
    const bp = parseBp(d.bp)
    const raw = bp[key]
    return raw != null && raw !== '' && isFinite(Number(raw)) ? Number(raw) : null
  }
  const raw = d[key]
  return raw != null && raw !== '' && isFinite(Number(raw)) ? Number(raw) : null
}
// One-vital sparkline over the most recent entries (reuses the Goals trend style).
const TREND_VITALS = [
  { key: 'temp', label: 'Temp' }, { key: 'pulse', label: 'Pulse' },
  { key: 'resp', label: 'Resp' }, { key: 'o2', label: 'O₂' },
  { key: 'systolic', label: 'Systolic' }, { key: 'diastolic', label: 'Diastolic' },
  { key: 'glucose', label: 'Glucose' },
]
function VitalTrend({ vitalsLogs, houseColor }) {
  const [vkey, setVkey] = useState('temp')
  const r = VITAL_RANGES[vkey]
  // Oldest → newest, last 14 with a value for this vital.
  const pts = vitalsLogs
    .map(h => ({ v: vitalValue(h, vkey), at: h.occurredAt }))
    .filter(p => p.v != null)
    .slice(0, 14)
    .reverse()
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Vital trend</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {TREND_VITALS.map(t => (
          <button key={t.key} type="button" onClick={() => setVkey(t.key)} style={{
            padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
            background: vkey === t.key ? 'var(--a-ink)' : 'transparent', color: vkey === t.key ? 'var(--a-card)' : 'var(--a-ink2)',
            border: vkey === t.key ? 0 : '1px solid var(--a-line)',
          }}>{t.label}</button>
        ))}
      </div>
      {pts.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--a-ink3)' }}>No {r.label.toLowerCase()} readings logged yet.</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
            {(() => {
              const vals = pts.map(p => p.v)
              const min = Math.min(...vals, r.lo), max = Math.max(...vals, r.hi)
              const span = max - min || 1
              return pts.map((p, i) => {
                const h = 6 + ((p.v - min) / span) * 38
                const oor = flagVital(vkey, p.v)
                return <span key={i} title={`${p.v}${r.unit} · ${fmtWhen(p.at)}`} style={{ flex: 1, minWidth: 4, maxWidth: 16, height: h, borderRadius: 2, background: oor ? CLAY : houseColor }} />
              })
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--a-ink3)', marginTop: 6 }}>
            <span>{pts.length} reading{pts.length === 1 ? '' : 's'}</span>
            <span>normal {r.lo}{r.loOnly ? '+' : `–${r.hi}`} {r.unit}</span>
            <span>latest <strong style={{ color: flagVital(vkey, pts[pts.length - 1].v) ? CLAY : 'var(--a-ink2)' }}>{pts[pts.length - 1].v}{r.unit}</strong></span>
          </div>
        </>
      )}
    </div>
  )
}

// Per-resident seizure frequency rollup (this week / this month + avg duration).
function SeizureRollup({ seizureLogs }) {
  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30)
  const at = (h) => new Date(h.occurredAt || h.date || 0)
  const week = seizureLogs.filter(h => at(h) >= weekAgo).length
  const month = seizureLogs.filter(h => at(h) >= monthAgo).length
  const durs = seizureLogs.map(h => h.amount).filter(a => a != null && isFinite(Number(a))).map(Number)
  const avgDur = durs.length ? (durs.reduce((s, d) => s + d, 0) / durs.length) : null
  // Weekly frequency bar: counts over the last 6 weeks (oldest → newest).
  const weeks = []
  for (let w = 5; w >= 0; w--) {
    const hi = new Date(now); hi.setDate(hi.getDate() - w * 7)
    const lo = new Date(hi); lo.setDate(lo.getDate() - 7)
    weeks.push(seizureLogs.filter(h => { const d = at(h); return d > lo && d <= hi }).length)
  }
  const maxW = Math.max(...weeks, 1)
  if (seizureLogs.length === 0) return null
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>⚡ Seizure frequency</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={statPill}>This week <strong style={{ color: week > 0 ? CLAY : 'var(--a-ink)' }}>{week}</strong></span>
        <span style={statPill}>This month <strong style={{ color: 'var(--a-ink)' }}>{month}</strong></span>
        {avgDur != null && <span style={statPill}>Avg duration <strong style={{ color: 'var(--a-ink)' }}>{avgDur.toFixed(1)} min</strong></span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
        {weeks.map((c, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span title={`${c} seizure${c === 1 ? '' : 's'}`} style={{ width: '100%', maxWidth: 22, height: 6 + (c / maxW) * 28, background: c > 0 ? '#a93a25' : 'var(--a-line)', borderRadius: 2 }} />
            <span style={{ fontSize: 9, color: 'var(--a-ink3)' }}>{i === 5 ? 'now' : `-${5 - i + 1}w`}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
const statPill = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', background: 'var(--a-paper)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)' }

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
  const residentLogs = logs.filter(l => !residentId || l.residentId === residentId)
  const vitalsLogs = residentLogs.filter(l => l.kind === 'vitals')
  const seizureLogs = residentLogs.filter(l => l.kind === 'seizure')

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

          {!loading && (filter === null || filter === 'vitals') && vitalsLogs.length > 0 && <VitalTrend vitalsLogs={vitalsLogs} houseColor={houseColor} />}
          {!loading && (filter === null || filter === 'seizure') && <SeizureRollup seizureLogs={seizureLogs} />}

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
                        <span style={{ color: t.color, fontWeight: 700 }}>{t.label}</span> · {h.kind === 'vitals' ? <VitalsSummary detail={h.detail} /> : summarize(h)}
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
