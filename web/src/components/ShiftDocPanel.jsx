import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchShiftDocProgress, setShiftDocSection } from '../lib/db'
import { IconCheck } from './icons'

// The documentation a shift must cover, per resident. `target` jumps to the
// matching Care-tab section so the DSP can go do the real work. `q` is the
// one-at-a-time wizard prompt.
const SECTIONS = [
  { id: 'log',      label: 'Daily note / T-log', hint: 'Narrative of the shift',            target: 'log',        q: 'Did you write the daily note / T-log for this shift?' },
  { id: 'health',   label: 'Health tracking',    hint: 'Vitals, BM, seizure, sleep, meals', target: 'health',     q: 'Did you record health tracking (vitals, BM, seizures, sleep, meals)?' },
  { id: 'goals',    label: 'ISP goal data',      hint: 'Habilitation goal data collection', target: 'goals',      q: 'Did you collect ISP / habilitation goal data?' },
  { id: 'meds',     label: 'Med pass',           hint: 'eMAR — given / refused / held',     target: 'meds',       q: 'Did you complete the med pass on the eMAR?' },
  { id: 'incident', label: 'Incident check',     hint: 'Report any incident, or confirm none', target: 'compliance', q: 'Any incident to report this shift — or are you confirming there were none?' },
]
const STATUS_LABEL = { done: 'Done', na: 'N/A', null: 'Not done' }

// Local date as 'YYYY-MM-DD' (do NOT use toISOString — that's UTC).
function todayStr() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Build a clean, self-contained printable report and hand it to the browser's
// print dialog (→ "Save as PDF"). No extra dependencies needed.
function exportPdf({ houseName, dateLabel, byName, list, progress }) {
  const rows = list.map(r => {
    const p = progress[r.id] || {}
    const cells = SECTIONS.map(s => {
      const st = p[s.id] || null
      const color = st === 'done' ? '#2f6b46' : st === 'na' ? '#7a7a7a' : '#a93a25'
      return `<td style="text-align:center;color:${color};font-weight:600">${st === 'done' ? '✓ Done' : st === 'na' ? 'N/A' : '—'}</td>`
    }).join('')
    const covered = SECTIONS.filter(s => p[s.id] === 'done' || p[s.id] === 'na').length
    return `<tr><td style="font-weight:600">${esc(r.name)}${r.room ? ` <span style="color:#888;font-weight:400">· Rm ${esc(r.room)}</span>` : ''}</td>${cells}<td style="text-align:center;color:#555">${covered}/${SECTIONS.length}</td></tr>`
  }).join('')
  const head = SECTIONS.map(s => `<th>${esc(s.label)}</th>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Shift documentation — ${esc(dateLabel)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;margin:40px;font-size:13px}
    h1{font-size:22px;margin:0 0 2px} .sub{color:#666;font-size:13px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #ddd;padding:8px 10px;font-size:12px}
    th{background:#f4f4f1;text-align:center;font-weight:600;color:#333} td:first-child,th:first-child{text-align:left}
    .meta{display:flex;gap:30px;margin:14px 0 4px;font-size:12px;color:#444}
    .sign{margin-top:36px;display:flex;gap:40px} .sign div{flex:1;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#666}
    .foot{margin-top:28px;font-size:10px;color:#999}
    @media print{body{margin:18mm}}
  </style></head><body>
    <h1>Shift Documentation</h1>
    <div class="sub">${esc(houseName || 'House')} · ${esc(dateLabel)}</div>
    <div class="meta"><span><strong>Completed by:</strong> ${esc(byName)}</span><span><strong>Residents:</strong> ${list.length}</span></div>
    <table><thead><tr><th>Resident</th>${head}<th>Covered</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="sign"><div>Staff signature</div><div>Supervisor review</div></div>
    <div class="foot">Generated ${esc(new Date().toLocaleString())} · Tend</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},150)}</script>
  </body></html>`
  const w = window.open('', '_blank')
  if (!w) { alert('Please allow pop-ups to export the PDF.'); return }
  w.document.write(html)
  w.document.close()
}

export function ShiftDocPanel({ user, houseUuid, houseColor = 'var(--a-ink)', houseName, residents = [], onOpenSection }) {
  const orgId = user?.orgId
  const doneByName = user?.name || 'Staff'
  const date = todayStr()
  const list = residents || []

  // progress[residentId][sectionId] = 'done' | 'na'
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  // phase: 'intro' | 'step' | 'review'  ·  idx = current step in the flat list
  const [phase, setPhase] = useState('intro')
  const [idx, setIdx] = useState(0)

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

  // Flat list of every question: one step per (resident, section).
  const steps = useMemo(() => {
    const out = []
    for (const r of list) for (const s of SECTIONS) out.push({ r, s })
    return out
  }, [list])

  // Persist + locally set a section to an explicit status (no toggle).
  const choose = async (r, section, status) => {
    setProgress(prev => ({ ...prev, [r.id]: { ...(prev[r.id] || {}), [section.id]: status } }))
    try {
      await setShiftDocSection(orgId, {
        houseId: houseUuid, date, residentId: r.id, residentName: r.name,
        section: section.id, status, doneByName,
      })
    } catch { reload() }
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
  const allDone = totalItems > 0 && doneItems === totalItems

  const firstUncovered = () => {
    const i = steps.findIndex(({ r, s }) => {
      const st = progress[r.id]?.[s.id]
      return st !== 'done' && st !== 'na'
    })
    return i === -1 ? 0 : i
  }
  const begin = () => { setIdx(firstUncovered()); setPhase('step') }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (list.length === 0) {
    return (
      <div>
        <div style={hdr}>This shift's documentation</div>
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>📝</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Nothing to document yet</div>
          <div style={{ fontSize: 12, color: 'var(--a-ink3)', lineHeight: 1.5 }}>No residents in this house yet — add residents to start documenting.</div>
        </div>
      </div>
    )
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div>
        <div style={hdr}>This shift's documentation</div>
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '20px 18px' }}>
          <div className="serif" style={{ fontSize: 21, marginBottom: 2 }}>{todayLabel()}</div>
          <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginBottom: 16 }}>
            We'll walk through it one question at a time — {list.length} resident{list.length === 1 ? '' : 's'}, {SECTIONS.length} quick checks each.
          </div>

          <ProgressBar pct={pct} color={houseColor} />
          <div style={{ fontSize: 12, color: 'var(--a-ink3)', margin: '7px 0 18px' }}>
            <span style={{ fontWeight: 700, color: 'var(--a-ink)' }}>{doneItems}</span> of {totalItems} done · {fullyDone}/{list.length} resident{list.length === 1 ? '' : 's'} complete
          </div>

          <button onClick={begin} style={primaryBtn(houseColor)}>
            {allDone ? 'Review documentation' : doneItems > 0 ? 'Resume →' : 'Start documenting →'}
          </button>
          {(allDone || doneItems > 0) && (
            <button onClick={() => setPhase('review')} style={ghostBtn}>Skip to review &amp; export PDF</button>
          )}
        </div>
        {loading && <div style={{ padding: '12px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Loading…</div>}
      </div>
    )
  }

  // ── Review / export ────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div>
        <div style={hdr}>Shift documentation · review</div>
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '18px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: allDone ? 'var(--a-sage)' : `${houseColor}22`, color: allDone ? '#fff' : houseColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{allDone ? '✓' : '📝'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 19 }}>{allDone ? 'All documented' : 'Almost there'}</div>
              <div style={{ fontSize: 12, color: 'var(--a-ink3)' }}>{doneItems}/{totalItems} items · {todayLabel()}</div>
            </div>
          </div>
          <ProgressBar pct={pct} color={houseColor} />

          <div style={{ marginTop: 14 }}>
            {list.map(r => {
              const p = progress[r.id] || {}
              const covered = SECTIONS.filter(s => p[s.id] === 'done' || p[s.id] === 'na').length
              return (
                <div key={r.id} style={{ borderTop: '1px solid var(--a-line)', padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: houseColor }} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</span>
                    {r.room && <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>Room {r.room}</span>}
                    <span className="tnum" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: covered === SECTIONS.length ? 'var(--a-sage)' : 'var(--a-ink3)' }}>{covered}/{SECTIONS.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {SECTIONS.map(s => {
                      const st = p[s.id] || null
                      const col = st === 'done' ? { bg: '#dee6df', tc: '#3f604d' } : st === 'na' ? { bg: 'var(--a-paper)', tc: 'var(--a-ink3)' } : { bg: '#fadcd7', tc: '#a93a25' }
                      return <span key={s.id} style={{ fontSize: 10, fontWeight: 600, color: col.tc, background: col.bg, padding: '2px 8px', borderRadius: 999 }}>{s.label}: {STATUS_LABEL[st]}</span>
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={() => exportPdf({ houseName, dateLabel: todayLabel(), byName: doneByName, list, progress })} style={primaryBtn(houseColor)}>⬇ Export PDF</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setIdx(allDone ? 0 : firstUncovered()); setPhase('step') }} style={{ ...ghostBtn, flex: 1, marginTop: 8 }}>{allDone ? 'Edit answers' : 'Finish remaining'}</button>
          <button onClick={() => setPhase('intro')} style={{ ...ghostBtn, flex: 1, marginTop: 8 }}>Back to start</button>
        </div>
      </div>
    )
  }

  // ── Step (one question at a time) ────────────────────────────────────────────
  const total = steps.length
  const cur = steps[Math.min(idx, total - 1)]
  const { r, s } = cur
  const status = progress[r.id]?.[s.id] || null
  const goNext = () => { if (idx + 1 >= total) setPhase('review'); else setIdx(idx + 1) }
  const pick = (st) => { choose(r, s, st); setTimeout(goNext, 200) }

  return (
    <div>
      {/* Progress header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0 10px' }}>
        <button onClick={() => setPhase('review')} style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', padding: 0 }}>Review</button>
        <div style={{ flex: 1 }}><ProgressBar pct={Math.round((idx / total) * 100)} color={houseColor} thin /></div>
        <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)' }}>{idx + 1} / {total}</span>
      </div>

      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '22px 18px', minHeight: 230 }}>
        {/* Resident chip */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `${houseColor}14`, border: `1px solid ${houseColor}40`, borderRadius: 999, padding: '4px 11px', marginBottom: 16 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: houseColor }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-ink)' }}>{r.name}</span>
          {r.room && <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>Rm {r.room}</span>}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: houseColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
        <div className="serif" style={{ fontSize: 21, lineHeight: 1.25, marginBottom: 6 }}>{s.q}</div>
        <div style={{ fontSize: 12.5, color: 'var(--a-ink3)', marginBottom: 18 }}>{s.hint}</div>

        {/* Answers */}
        <button onClick={() => pick('done')} style={choiceBtn(status === 'done', houseColor)}>
          <span style={tickDot(status === 'done', houseColor)}>{status === 'done' && <IconCheck size={13} sw={3} color="#fff" />}</span>
          <span style={{ flex: 1 }}>Yes — done</span>
        </button>
        <button onClick={() => pick('na')} style={choiceBtn(status === 'na', 'var(--a-ink2)')}>
          <span style={tickDot(status === 'na', 'var(--a-ink2)')}>{status === 'na' && <IconCheck size={13} sw={3} color="#fff" />}</span>
          <span style={{ flex: 1 }}>Not applicable today</span>
        </button>

        <button onClick={() => onOpenSection?.(s.target)} style={{ ...ghostBtn, marginTop: 12 }}>Open {s.label} to fill it out →</button>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button onClick={() => idx > 0 && setIdx(idx - 1)} disabled={idx === 0} style={{ ...navBtn, opacity: idx === 0 ? 0.4 : 1, cursor: idx === 0 ? 'default' : 'pointer' }}>← Back</button>
        <button onClick={goNext} style={{ ...navBtn, marginLeft: 'auto' }}>{idx + 1 >= total ? 'Review →' : 'Skip →'}</button>
      </div>
    </div>
  )
}

// ── small presentational helpers ───────────────────────────────────────────────
function ProgressBar({ pct, color, thin }) {
  return (
    <div style={{ height: thin ? 5 : 7, borderRadius: 999, background: 'var(--a-paper)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: color, borderRadius: 999, transition: 'width 0.25s ease' }} />
    </div>
  )
}
const hdr = { fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '4px 0 8px' }
const primaryBtn = (c) => ({ width: '100%', background: c, color: '#fff', border: 0, borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, fontFamily: 'Geist', cursor: 'pointer' })
const ghostBtn = { width: '100%', background: 'transparent', color: 'var(--a-ink2)', border: 0, padding: '10px', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', marginTop: 6 }
const navBtn = { background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }
const choiceBtn = (on, c) => ({ width: '100%', display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', marginBottom: 9, padding: '14px 15px', borderRadius: 12, fontSize: 14.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', color: on ? 'var(--a-ink)' : 'var(--a-ink2)', background: on ? `${c}14` : 'var(--a-card)', border: `1.5px solid ${on ? c : 'var(--a-line)'}` })
const tickDot = (on, c) => ({ width: 24, height: 24, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? c : 'transparent', border: on ? 0 : '1.5px solid var(--a-line)' })
