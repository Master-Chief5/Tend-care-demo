import { useState, useEffect, useCallback } from 'react'
import {
  fetchSurveys, createSurvey, submitSurveyResponse, closeSurvey, deleteSurvey,
} from '../lib/db'
import { IconCheck, IconStar, IconBook } from '../components/icons'

// "Surveys" screen — staff pulse + training-feedback surveys.
//   • everyone: Active / Closed chips; take an active survey (one response each).
//   • admins (supervisor/manager): a "New survey" builder, plus per-survey
//     results (response count + simple tallies for non-anonymous) and
//     Close / Delete.
// Surveys are org-wide (house_id null = "All staff") or house-scoped. Provides
// both the mobile (.phone-screen) and desktop (flex column) layouts in one
// component, switching on `desktop` (mirrors Updates / Knowledge).

const QUESTION_TYPES = [
  { value: 'multiple', label: 'Multiple choice' },
  { value: 'rating', label: 'Rating (1–5)' },
  { value: 'yesno', label: 'Yes / No' },
  { value: 'text', label: 'Short text' },
]
const TYPE_LABEL = { multiple: 'Multiple choice', rating: 'Rating', yesno: 'Yes / No', text: 'Text' }

function fmtDate(dateLike) {
  if (!dateLike) return ''
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return String(dateLike)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const card = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }
const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
      {icon && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--a-ink3)' }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

function questionsOf(row) {
  return Array.isArray(row?.questions) ? row.questions.filter(Boolean) : []
}

// ── Take a survey (everyone) ─────────────────────────────────────────────────
function TakeSurvey({ row, staffId, onSubmitted, onCancel }) {
  const questions = questionsOf(row)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)

  const setAnswer = (i, v) => setAnswers(prev => ({ ...prev, [i]: v }))

  const allAnswered = questions.every((_, i) => {
    const a = answers[i]
    return a != null && String(a).trim() !== ''
  })
  const canSubmit = allAnswered && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSubmit) return
    setSaving(true)
    let ok = null
    try {
      ok = await Promise.resolve(submitSurveyResponse(row.orgId || undefined, {
        surveyId: row.id, staffId, answers,
      })).catch(() => null)
    } catch { ok = null }
    setSaving(false)
    onSubmitted(ok)
  }

  return (
    <form onSubmit={submit}>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className="serif" style={{ fontSize: 18, lineHeight: 1.2, color: 'var(--a-ink)' }}>{row?.title || 'Survey'}</div>
          {row?.anonymous && (
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 4 }}>Responses are anonymous.</div>
          )}
        </div>

        {questions.map((q, i) => (
          <div key={i}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)', marginBottom: 8 }}>
              {i + 1}. {q?.q || 'Question'}
            </div>

            {q?.type === 'multiple' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(Array.isArray(q.options) ? q.options : []).filter(o => String(o).trim() !== '').map((opt, oi) => {
                  const on = answers[i] === opt
                  return (
                    <button key={oi} type="button" onClick={() => setAnswer(i, opt)} style={{
                      textAlign: 'left', padding: '9px 12px', borderRadius: 10, fontSize: 13, fontFamily: 'Geist', cursor: 'pointer',
                      background: on ? 'var(--a-ink)' : 'var(--a-paper)',
                      color: on ? 'var(--a-card)' : 'var(--a-ink)',
                      border: `1px solid ${on ? 'var(--a-ink)' : 'var(--a-line)'}`,
                    }}>{opt}</button>
                  )
                })}
              </div>
            )}

            {q?.type === 'rating' && (
              <div style={{ display: 'flex', gap: 7 }}>
                {[1, 2, 3, 4, 5].map(n => {
                  const on = Number(answers[i]) >= n
                  return (
                    <button key={n} type="button" onClick={() => setAnswer(i, n)} aria-label={`${n} star`} style={{
                      width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', background: 'var(--a-paper)', border: `1px solid ${on ? 'var(--a-clay)' : 'var(--a-line)'}`,
                    }}>
                      <IconStar size={18} sw={1.5} color={on ? 'var(--a-clay)' : 'var(--a-ink3)'} style={on ? { fill: 'var(--a-clay)' } : undefined} />
                    </button>
                  )
                })}
              </div>
            )}

            {q?.type === 'yesno' && (
              <div style={{ display: 'flex', gap: 8 }}>
                {['Yes', 'No'].map(v => {
                  const on = answers[i] === v
                  return (
                    <button key={v} type="button" onClick={() => setAnswer(i, v)} style={{
                      flex: 1, padding: '10px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                      background: on ? 'var(--a-ink)' : 'var(--a-paper)',
                      color: on ? 'var(--a-card)' : 'var(--a-ink)',
                      border: `1px solid ${on ? 'var(--a-ink)' : 'var(--a-line)'}`,
                    }}>{v}</button>
                  )
                })}
              </div>
            )}

            {q?.type === 'text' && (
              <textarea value={answers[i] || ''} onChange={e => setAnswer(i, e.target.value)} rows={3} placeholder="Your answer…"
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!canSubmit} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5,
          }}>{saving ? 'Submitting…' : 'Submit response'}</button>
          <button type="button" onClick={onCancel} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </form>
  )
}

// ── Per-survey results (admins only) ─────────────────────────────────────────
function Results({ row }) {
  const questions = questionsOf(row)
  const count = Number(row?._responseCount) || 0

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--a-line)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: row?.anonymous ? 0 : 10 }}>
        {count} {count === 1 ? 'response' : 'responses'}
        {row?.anonymous ? ' · anonymous' : ''}
      </div>
      {!row?.anonymous && count > 0 && questions.map((q, i) => {
        const tallies = (q?._tallies && typeof q._tallies === 'object') ? q._tallies : null
        const isRating = q?.type === 'rating'
        const avg = (isRating && q?._avg != null) ? Number(q._avg) : null
        // Ratings show fixed 1–5 rows in order; other types show their own keys.
        const entries = isRating
          ? [1, 2, 3, 4, 5].map(n => [String(n), Number((tallies || {})[String(n)]) || 0])
          : (tallies ? Object.entries(tallies) : [])
        const total = entries.reduce((s, [, v]) => s + (Number(v) || 0), 0)
        const hasData = tallies && total > 0
        return (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a-ink)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ minWidth: 0 }}>
                {i + 1}. {q?.q || 'Question'}
                <span style={{ fontWeight: 500, color: 'var(--a-ink3)' }}> · {TYPE_LABEL[q?.type] || q?.type}</span>
              </span>
              {avg != null && (
                <span style={{ flexShrink: 0, fontWeight: 700, color: 'var(--a-clay)', fontVariantNumeric: 'tabular-nums' }}>
                  {avg.toFixed(1)} / 5
                </span>
              )}
            </div>
            {hasData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {entries.map(([k, v]) => {
                  const n = Number(v) || 0
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0
                  const label = isRating ? `${k} ★` : k
                  return (
                    <div key={k} style={{
                      position: 'relative', overflow: 'hidden',
                      background: 'var(--a-paper)', border: '1px solid var(--a-line)',
                      borderRadius: 8, padding: '7px 10px',
                    }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'rgba(0,0,0,0.05)' }} />
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                        <span style={{ color: 'var(--a-ink2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                        <span style={{ color: 'var(--a-ink3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{n} · {pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--a-ink3)' }}>Free-text responses collected.</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── A single survey card ─────────────────────────────────────────────────────
function SurveyCard({ row, isAdmin, onTake, onClose, onDelete }) {
  const questions = questionsOf(row)
  const scopeTag = row?.house_id ? 'My house' : 'All staff'
  const closed = row?.status === 'closed'
  const responded = !!row?._myResponded

  const remove = () => {
    if (!window.confirm('Delete this survey? This cannot be undone.')) return
    onDelete(row.id)
    Promise.resolve(deleteSurvey(row.id)).catch(() => {})
  }

  const close = () => {
    onClose(row.id)
    Promise.resolve(closeSurvey(row.id)).catch(() => {})
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
            background: 'var(--a-paper)', color: 'var(--a-ink3)',
          }}>{scopeTag.toUpperCase()}</span>
          {row?.anonymous && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
              background: 'var(--a-paper)', color: 'var(--a-ink2)',
            }}>ANONYMOUS</span>
          )}
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            color: closed ? 'var(--a-clay)' : 'var(--a-sage)',
          }}>{closed ? 'Closed' : 'Active'}</span>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {!closed && (
              <button onClick={close} style={{
                background: 'transparent', border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                fontFamily: 'Geist', padding: '2px 6px', color: 'var(--a-ink3)',
              }}>Close</button>
            )}
            <button onClick={remove} aria-label="Delete survey" style={{
              background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1,
              padding: '2px 4px', color: 'var(--a-ink3)',
            }}>✕</button>
          </div>
        )}
      </div>

      <div className="serif" style={{ fontSize: 17, lineHeight: 1.25, color: 'var(--a-ink)', marginBottom: 6 }}>
        {row?.title || 'Untitled survey'}
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>
        {questions.length} {questions.length === 1 ? 'question' : 'questions'}
        {row?.created_by_name ? ` · by ${row.created_by_name}` : ''} · {fmtDate(row?.created_at)}
      </div>

      {/* Take CTA (everyone, active only) */}
      {!closed && (
        responded ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--a-sage)' }}>
            <IconCheck size={15} sw={2} color="var(--a-sage)" />
            Responded
          </div>
        ) : (
          <button onClick={() => onTake(row)} style={{
            display: 'block', width: '100%', marginTop: 12,
            background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999,
            padding: '11px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Take survey</button>
        )
      )}

      {/* Results (admins) */}
      {isAdmin && <Results row={row} />}
    </div>
  )
}

// ── List (everyone) ──────────────────────────────────────────────────────────
function SurveyList({ rows, loading, isAdmin, onTake, onClose, onDelete }) {
  const [filter, setFilter] = useState('Active') // 'Active' | 'Closed'

  const list = (rows || []).filter(Boolean).filter(r =>
    filter === 'Active' ? r?.status !== 'closed' : r?.status === 'closed'
  )

  return (
    <>
      <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
        {['Active', 'Closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flexShrink: 0, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: filter === f ? 'var(--a-ink)' : 'var(--a-card)',
            color: filter === f ? 'var(--a-card)' : 'var(--a-ink2)',
            border: `1px solid ${filter === f ? 'var(--a-ink)' : 'var(--a-line)'}`,
          }}>{f}</button>
        ))}
      </div>

      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState icon={<IconBook size={30} sw={1.4} color="var(--a-ink3)" />}
          title={filter === 'Active' ? 'No active surveys.' : 'No closed surveys.'}
          sub={isAdmin && filter === 'Active' ? 'Create one from “New survey”.' : undefined} />
      )}
      {list.map(r => (
        <SurveyCard key={r.id} row={r} isAdmin={isAdmin} onTake={onTake} onClose={onClose} onDelete={onDelete} />
      ))}
    </>
  )
}

// ── Builder (admins only) ────────────────────────────────────────────────────
function Builder({ orgId, houseId, staffName, onCreated, onCancel }) {
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('all') // 'all' | 'house'
  const [anonymous, setAnonymous] = useState(false)
  const [questions, setQuestions] = useState([])
  const [saving, setSaving] = useState(false)

  const addQuestion = (type) => setQuestions(prev => [...prev, {
    q: '', type, options: type === 'multiple' ? ['', ''] : undefined,
  }])
  const removeQuestion = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i))
  const setQ = (i, patch) => setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  const setOpt = (i, oi, v) => setQuestions(prev => prev.map((q, idx) =>
    idx === i ? { ...q, options: (q.options || []).map((o, j) => j === oi ? v : o) } : q))
  const addOpt = (i) => setQuestions(prev => prev.map((q, idx) =>
    idx === i ? { ...q, options: (q.options || []).length >= 6 ? q.options : [...(q.options || []), ''] } : q))
  const removeOpt = (i, oi) => setQuestions(prev => prev.map((q, idx) =>
    idx === i ? { ...q, options: (q.options || []).length <= 2 ? q.options : (q.options || []).filter((_, j) => j !== oi) } : q))

  const cleanQuestions = questions
    .map(q => {
      const base = { q: (q.q || '').trim(), type: q.type }
      if (q.type === 'multiple') base.options = (q.options || []).map(o => o.trim()).filter(Boolean)
      return base
    })
    .filter(q => q.q && (q.type !== 'multiple' || (q.options && q.options.length >= 2)))

  const canSave = title.trim() && cleanQuestions.length > 0 && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSave || !orgId) return
    setSaving(true)
    let row = null
    try {
      row = await Promise.resolve(createSurvey(orgId, {
        houseId: scope === 'house' ? houseId : null,
        title: title.trim(),
        questions: cleanQuestions,
        anonymous,
        createdByName: staffName,
      })).catch(() => null)
    } catch { row = null }
    setSaving(false)
    onCreated(row)
  }

  const segBtn = (val, label, disabled) => {
    const active = scope === val
    return (
      <button type="button" disabled={disabled} onClick={() => !disabled && setScope(val)} style={{
        flex: 1, padding: '8px', borderRadius: 8, border: 0, fontSize: 13, fontWeight: 600, fontFamily: 'Geist',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
        background: active ? 'var(--a-card)' : 'transparent',
        color: active ? 'var(--a-ink)' : 'var(--a-ink2)',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
      }}>{label}</button>
    )
  }

  return (
    <form onSubmit={submit}>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Survey title (e.g. Monthly pulse)"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />

        {/* Who sees this */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHO SEES THIS</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
            {segBtn('all', 'All staff', false)}
            {segBtn('house', 'My house', !houseId)}
          </div>
        </div>

        {/* Anonymous */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} />
          Anonymous responses
        </label>

        {/* Questions */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>QUESTIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', flex: 1, paddingTop: 2 }}>
                    {(TYPE_LABEL[q.type] || q.type).toUpperCase()}
                  </span>
                  <button type="button" onClick={() => removeQuestion(i)} aria-label="Remove question" style={{
                    background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '2px 4px', color: 'var(--a-ink3)',
                  }}>✕</button>
                </div>
                <input value={q.q} onChange={e => setQ(i, { q: e.target.value })} placeholder="Question text"
                  style={inputStyle} />
                {q.type === 'multiple' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                    {(q.options || []).map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input value={opt} onChange={e => setOpt(i, oi, e.target.value)} placeholder={`Option ${oi + 1}`}
                          style={inputStyle} />
                        {(q.options || []).length > 2 && (
                          <button type="button" onClick={() => removeOpt(i, oi)} aria-label="Remove option" style={{
                            flexShrink: 0, width: 30, height: 30, borderRadius: 999, border: '1px solid var(--a-line)',
                            background: 'var(--a-card)', color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, fontFamily: 'Geist',
                          }}>−</button>
                        )}
                      </div>
                    ))}
                    {(q.options || []).length < 6 && (
                      <button type="button" onClick={() => addOpt(i)} style={{
                        alignSelf: 'flex-start', padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
                        cursor: 'pointer', background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
                      }}>+ Add option</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add-question buttons */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: questions.length ? 10 : 0 }}>
            {QUESTION_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => addQuestion(t.value)} style={{
                padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
              }}>+ {t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!canSave} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
          }}>{saving ? 'Creating…' : 'Publish survey'}</button>
          <button type="button" onClick={onCancel} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </form>
  )
}

export function ScreenA_Surveys({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  const tabs = isAdmin ? ['Surveys', 'New survey'] : ['Surveys']
  const [tab, setTab] = useState('Surveys')
  const [taking, setTaking] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.resolve(fetchSurveys(orgId, { houseId, role, staffId }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, role, staffId])

  useEffect(() => { load() }, [load])

  // Keep tab valid if role changes.
  useEffect(() => { if (!tabs.includes(tab)) setTab('Surveys') }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const onCreated = (row) => {
    setTab('Surveys')
    if (row) setRows(prev => [row, ...(prev || [])])
    else load()
  }

  const onTake = (row) => setTaking(row)

  const onSubmitted = (ok) => {
    const id = taking?.id
    setTaking(null)
    if (ok && id) {
      setRows(prev => (prev || []).map(x => x && x.id === id
        ? { ...x, _myResponded: true, _responseCount: (Number(x._responseCount) || 0) + 1 } : x))
    } else {
      load()
    }
  }

  const onClose = useCallback((id) => {
    setRows(prev => (prev || []).map(x => x && x.id === id ? { ...x, status: 'closed' } : x))
  }, [])

  const onDelete = useCallback((id) => {
    setRows(prev => (prev || []).filter(x => x && x.id !== id))
  }, [])

  const goTab = (t) => {
    setTaking(null)
    setTab(t)
  }

  const Chips = () => (
    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: desktop ? '0 0 4px' : '0 22px 6px' }}>
      {tabs.map(t => (
        <button key={t} onClick={() => goTab(t)} style={{
          flexShrink: 0, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
          cursor: 'pointer', whiteSpace: 'nowrap',
          background: tab === t ? 'var(--a-ink)' : 'var(--a-card)',
          color: tab === t ? 'var(--a-card)' : 'var(--a-ink2)',
          border: `1px solid ${tab === t ? 'var(--a-ink)' : 'var(--a-line)'}`,
        }}>{t}</button>
      ))}
    </div>
  )

  const Body = () => {
    if (taking) {
      return (
        <TakeSurvey row={{ ...taking, orgId }} staffId={staffId}
          onSubmitted={onSubmitted} onCancel={() => setTaking(null)} />
      )
    }
    if (isAdmin && tab === 'New survey') {
      return (
        <Builder orgId={orgId} houseId={houseId} staffName={staffName}
          onCreated={onCreated} onCancel={() => setTab('Surveys')} />
      )
    }
    return (
      <SurveyList rows={rows} loading={loading} isAdmin={isAdmin}
        onTake={onTake} onClose={onClose} onDelete={onDelete} />
    )
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: isAdmin ? 10 : 0 }}>Surveys</div>
          {isAdmin && <Chips />}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 28px' }}>
          <Body />
        </div>
      </div>
    )
  }

  return (
    <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 22px 8px' }}>
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Surveys</div>
      </div>
      {isAdmin && <Chips />}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
