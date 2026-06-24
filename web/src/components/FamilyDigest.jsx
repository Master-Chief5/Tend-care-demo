import { useState, useEffect, useCallback } from 'react'
import {
  fetchGoals, fetchGoalData, fetchResidentNotes, fetchAppointments,
} from '../lib/db'
import { IconX, IconPrinter } from './icons'

// ── Family update digest ──────────────────────────────────────────────────────
// A stripped, REDACTED per-resident "report card" meant to be shared with a
// resident's guardian/family. It consumes only existing care data (progress
// notes, ISP goal progress, upcoming appointments, general wellbeing) and is
// deliberately scoped to what's appropriate for family eyes:
//   • Progress notes — ONLY the "Progress" category (no Medical/Behavior bodies,
//     which carry clinical/PHI detail not suited for a family-facing summary).
//   • ISP goals — title + how-it's-going trend, NO raw clinical data points.
//   • Upcoming appointments — date + type + provider, NO reason/clinical detail.
//   • Incidents and health logs are intentionally OMITTED entirely.
// It's read-only with a Print/Share (window.print) export and a clear
// "Shared with <guardian>" header. No new backend — reuses the same fetches the
// Progress panel uses. Hearth styling, no emoji.

const pad = (n) => String(n).padStart(2, '0')
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Last 90 days is the default family-update window — a quarter of progress.
function defaultRange() {
  const now = new Date()
  const from = new Date(now); from.setDate(from.getDate() - 90)
  return { from: ds(from), to: ds(now) }
}

function fmtDate(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// A gentle, non-clinical read on how a goal is trending, from its data points.
function goalTrend(points) {
  const nums = (points || [])
    .map(p => Number(p.result ?? p.value))
    .filter(v => Number.isFinite(v))
  if (points && points.length > 0 && nums.length < 2) return 'Being worked on'
  if (nums.length < 2) return 'No recent updates'
  // points come newest-first; compare recent half vs older half.
  const mid = Math.floor(nums.length / 2)
  const recent = nums.slice(0, mid)
  const older = nums.slice(mid)
  const avg = (a) => a.reduce((s, n) => s + n, 0) / a.length
  const dr = avg(recent) - avg(older)
  const span = Math.max(1, Math.abs(avg(older)))
  if (dr > span * 0.08) return 'Improving'
  if (dr < -span * 0.08) return 'Needs encouragement'
  return 'Holding steady'
}
const TREND_TONE = {
  'Improving':            { bg: '#dee6df', fg: '#3f604d' },
  'Holding steady':      { bg: 'var(--a-paper)', fg: 'var(--a-ink2)' },
  'Being worked on':     { bg: 'var(--a-paper)', fg: 'var(--a-ink2)' },
  'Needs encouragement': { bg: '#f5e9d6', fg: '#a47012' },
  'No recent updates':   { bg: 'var(--a-paper)', fg: 'var(--a-ink3)' },
}

const card = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '16px', marginBottom: 14 }
const sectionHead = { fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }
const emptyBox = { background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }

export function FamilyDigest({ user, resident, house, onClose }) {
  const orgId = user?.orgId
  const houseUuid = resident?.house_id
  const residentId = resident?.id
  const residentName = resident?.name || 'Resident'
  const c = house?.color || 'var(--a-sage)'
  const { from, to } = defaultRange()

  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [goals, setGoals] = useState([])
  const [appts, setAppts] = useState([])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const load = useCallback(() => {
    if (!residentId) { setLoading(false); return }
    setLoading(true)

    const pNotes = Promise.resolve(
      fetchResidentNotes(orgId, { houseId: houseUuid, residentId, from, to })
    ).catch(() => [])
    const pGoals = Promise.resolve(fetchGoals(orgId, houseUuid)).catch(() => [])
    const pAppts = Promise.resolve(
      fetchAppointments(orgId, { houseId: houseUuid, residentId, includeCompleted: false })
    ).catch(() => [])

    Promise.all([pNotes, pGoals, pAppts]).then(async ([nts, allGoals, apptRows]) => {
      // Redact notes to the family-appropriate "Progress" category only.
      const progressNotes = (nts || []).filter(n => (n.category || '') === 'Progress')
      setNotes(progressNotes)

      const residentGoals = (allGoals || []).filter(g => g.residentId === residentId)
      const datas = await Promise.all(
        residentGoals.map(g => Promise.resolve(fetchGoalData(orgId, g.id, 60)).catch(() => []))
      )
      const summaries = residentGoals.map((g, i) => {
        const points = (datas[i] || []).filter(d => (!from || d.date >= from) && (!to || d.date <= to))
        return { id: g.id, title: g.title, target: g.target, trend: goalTrend(points), count: points.length }
      })
      setGoals(summaries)

      // Upcoming only (appt_at in the future), soonest-first.
      const nowIso = new Date().toISOString()
      setAppts((apptRows || []).filter(a => (a.appt_at || '') >= nowIso))

      setLoading(false)
    }).catch(() => setLoading(false))
  }, [orgId, houseUuid, residentId, from, to])

  useEffect(() => { load() }, [load])

  const guardian = (resident?.guardian || '').trim()
  const guardianName = guardian ? guardian.split(/[·,|]/)[0].trim() : ''
  const today = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="family-digest" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 260, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={`Family update for ${residentName}`}
        style={{ width: '100%', maxWidth: 560, maxHeight: '94vh', overflowY: 'auto', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0' }}>

        {/* Accent + sticky action bar (hidden in print) */}
        <div style={{ height: 4, background: c }} />
        <div className="fd-actions" style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--a-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 18px 8px', borderBottom: '1px solid var(--a-line)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Family update</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c, color: '#fff', border: 0, borderRadius: 999, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
              <IconPrinter size={14} color="#fff" /> Print / Share
            </button>
            <button onClick={onClose} aria-label="Close" style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 999, padding: 7, color: 'var(--a-ink2)', cursor: 'pointer' }}>
              <IconX size={16} />
            </button>
          </div>
        </div>

        <div className="fd-body" style={{ padding: '18px 18px 36px' }}>
          {/* Report-card header */}
          <div style={{ marginBottom: 16 }}>
            <h1 className="serif" style={{ fontSize: 26, letterSpacing: '-0.01em', margin: 0 }}>{residentName}</h1>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 4 }}>
              Family update{house?.name ? ` · ${house.name}` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 2 }}>
              Prepared {today} · covering {fmtDate(from)} – {fmtDate(to)}
            </div>
            <div style={{ marginTop: 10, padding: '9px 13px', background: `${c}14`, border: `1px solid ${c}44`, borderRadius: 10, fontSize: 12.5, color: 'var(--a-ink2)' }}>
              {guardianName
                ? <>Shared with <strong style={{ color: 'var(--a-ink)' }}>{guardianName}</strong> (guardian / family contact)</>
                : <>Ready to share with this resident's family or guardian.</>}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Preparing update…</div>
          ) : (
            <>
              {/* General wellbeing — a friendly one-line summary */}
              <div style={card}>
                <div style={sectionHead}>General wellbeing</div>
                <div style={{ fontSize: 13.5, color: 'var(--a-ink2)', lineHeight: 1.5 }}>
                  {(() => {
                    const improving = goals.filter(g => g.trend === 'Improving').length
                    const bits = []
                    if (notes.length > 0) bits.push(`${notes.length} progress note${notes.length === 1 ? '' : 's'} recorded`)
                    if (improving > 0) bits.push(`${improving} goal${improving === 1 ? '' : 's'} trending up`)
                    if (appts.length > 0) bits.push(`${appts.length} upcoming appointment${appts.length === 1 ? '' : 's'}`)
                    if (bits.length === 0) return `${residentName} has been settled this period. The care team will share more at the next update.`
                    return `Over the last few months, ${residentName} has had ${bits.join(', ')}. The care team continues to support daily routines and goals.`
                  })()}
                </div>
              </div>

              {/* Recent progress */}
              <div style={card}>
                <div style={sectionHead}>Recent progress</div>
                {notes.length === 0 ? (
                  <div style={emptyBox}>No progress notes to share for this period yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {notes.slice(0, 12).map(n => (
                      <div key={n.id} style={{ borderBottom: '1px dashed var(--a-line)', paddingBottom: 9 }}>
                        <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 3 }} className="tnum">{fmtDate(n.note_date)}</div>
                        <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.45 }}>{n.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Goal progress */}
              <div style={card}>
                <div style={sectionHead}>Goals &amp; how they're going</div>
                {goals.length === 0 ? (
                  <div style={emptyBox}>No active goals recorded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {goals.map(g => {
                      const tone = TREND_TONE[g.trend] || TREND_TONE['Holding steady']
                      return (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: '1px dashed var(--a-line)', paddingBottom: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1.3 }}>{g.title}</div>
                            {g.target && <div style={{ fontSize: 12, color: 'var(--a-ink2)', marginTop: 2 }}>Aim: {g.target}</div>}
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: tone.fg, background: tone.bg, padding: '4px 10px', borderRadius: 999, border: '1px solid var(--a-line)' }}>{g.trend}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming appointments — date/type/provider only */}
              <div style={card}>
                <div style={sectionHead}>Upcoming appointments</div>
                {appts.length === 0 ? (
                  <div style={emptyBox}>No appointments scheduled at this time.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {appts.slice(0, 10).map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, borderBottom: '1px dashed var(--a-line)', paddingBottom: 9 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', textTransform: 'capitalize' }}>{a.type || 'Appointment'}</div>
                          {a.provider && <div style={{ fontSize: 12, color: 'var(--a-ink2)', marginTop: 1 }}>{a.provider}</div>}
                        </div>
                        <div className="tnum" style={{ flexShrink: 0, fontSize: 11.5, color: 'var(--a-ink3)', textAlign: 'right' }}>{fmtDateTime(a.appt_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer note — sets family expectations + redaction nod */}
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', lineHeight: 1.5, padding: '4px 2px 0' }}>
                This update is a summary shared with family. For full clinical records, medical
                detail, or to discuss any concern, please contact the care team directly.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Print: drop the overlay chrome, show only the digest on white. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .family-digest, .family-digest * { visibility: visible !important; }
          .family-digest { position: absolute !important; inset: 0 !important; background: #fff !important; display: block !important; }
          .family-digest > div { max-width: 100% !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; border-radius: 0 !important; }
          .fd-actions { display: none !important; }
        }
      `}</style>
    </div>
  )
}
