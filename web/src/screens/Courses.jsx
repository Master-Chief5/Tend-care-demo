import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchCourses, createCourse, deleteCourse, completeCourse,
  fetchCourseCompletions, fetchStaff,
} from '../lib/db'
import { IconCheck, IconBook, IconAward, IconX } from '../components/icons'

// "Training" screen — assignable courses with completion tracking (the largest
// missing Connecteam module).
//   • everyone: assigned / required courses with a Completed badge or "Start".
//     Taking a course renders its sections, then a quiz (reusing the Surveys
//     multiple-choice UI); passing records a completion.
//   • admins (supervisor/manager): a "New course" builder + a completion
//     dashboard — % complete per required course and who hasn't finished.
// Courses are org-wide (house_id null = "All staff") or house-scoped. Provides
// both the mobile (.phone-screen) and desktop (flex column) layouts in one
// component, switching on `desktop` (mirrors Surveys / Knowledge).

const PASS_PCT = 70  // quiz pass threshold

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

function sectionsOf(row) { return Array.isArray(row?.sections) ? row.sections.filter(Boolean) : [] }
function quizOf(row) { return Array.isArray(row?.quiz) ? row.quiz.filter(Boolean) : [] }

// ── Take a course (everyone) ─────────────────────────────────────────────────
// Walk the sections, then (if present) the quiz. Passing → record completion.
function TakeCourse({ row, orgId, staffId, staffName, onCompleted, onCancel }) {
  const sections = sectionsOf(row)
  const quiz = quizOf(row)
  // step: 0..sections.length-1 = section pages; sections.length = quiz; final = result
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)   // { score, passed } | null
  const [saving, setSaving] = useState(false)

  const onQuizStep = step === sections.length
  const setAnswer = (i, v) => setAnswers(prev => ({ ...prev, [i]: v }))

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => Math.max(0, s - 1))

  const gradeAndFinish = async () => {
    let score = 100
    if (quiz.length > 0) {
      let correct = 0
      quiz.forEach((q, i) => { if (Number(answers[i]) === Number(q.answer)) correct += 1 })
      score = Math.round((correct / quiz.length) * 100)
    }
    const passed = quiz.length === 0 || score >= PASS_PCT
    setResult({ score, passed })
    if (passed) {
      setSaving(true)
      try {
        await Promise.resolve(completeCourse(orgId, { courseId: row.id, staffId, staffName, score }))
      } catch { /* ignore */ }
      setSaving(false)
    }
  }

  const allQuizAnswered = quiz.every((_, i) => answers[i] != null)

  // ── Result screen ──
  if (result) {
    return (
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center', padding: '28px 20px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: result.passed ? 'rgba(122,143,107,0.14)' : 'rgba(176,106,86,0.14)',
        }}>
          {result.passed
            ? <IconAward size={26} sw={1.6} color="var(--a-sage)" />
            : <IconX size={24} sw={2} color="var(--a-clay)" />}
        </div>
        <div>
          <div className="serif" style={{ fontSize: 20, color: 'var(--a-ink)', marginBottom: 4 }}>
            {result.passed ? 'Course complete' : 'Not quite there'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.5 }}>
            {quiz.length > 0
              ? <>You scored <b>{result.score}%</b>{result.passed ? '. Nice work — this is recorded as completed.' : `. You need ${PASS_PCT}% to pass — review the material and try again.`}</>
              : 'Marked as completed.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          {!result.passed && (
            <button onClick={() => { setResult(null); setAnswers({}); setStep(0) }} style={{
              flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
              fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
            }}>Try again</button>
          )}
          <button onClick={() => onCompleted(result.passed, result.score)} style={{
            flex: 1, background: result.passed ? 'var(--a-ink)' : 'var(--a-card)',
            color: result.passed ? 'var(--a-card)' : 'var(--a-ink2)',
            border: result.passed ? 0 : '1px solid var(--a-line)', borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Done</button>
        </div>
      </div>
    )
  }

  // ── Quiz step ──
  if (onQuizStep) {
    return (
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 4 }}>QUIZ</div>
          <div className="serif" style={{ fontSize: 18, lineHeight: 1.2, color: 'var(--a-ink)' }}>{row?.title || 'Course'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 4 }}>Pass with {PASS_PCT}% or higher.</div>
        </div>

        {quiz.map((q, i) => (
          <div key={i}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)', marginBottom: 8 }}>
              {i + 1}. {q?.q || 'Question'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Array.isArray(q.options) ? q.options : []).filter(o => String(o).trim() !== '').map((opt, oi) => {
                const on = Number(answers[i]) === oi
                return (
                  <button key={oi} type="button" onClick={() => setAnswer(i, oi)} style={{
                    textAlign: 'left', padding: '9px 12px', borderRadius: 10, fontSize: 13, fontFamily: 'Geist', cursor: 'pointer',
                    background: on ? 'var(--a-ink)' : 'var(--a-paper)',
                    color: on ? 'var(--a-card)' : 'var(--a-ink)',
                    border: `1px solid ${on ? 'var(--a-ink)' : 'var(--a-line)'}`,
                  }}>{opt}</button>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={back} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Back</button>
          <button type="button" disabled={!allQuizAnswered || saving} onClick={gradeAndFinish} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist',
            cursor: (allQuizAnswered && !saving) ? 'pointer' : 'default', opacity: (allQuizAnswered && !saving) ? 1 : 0.5,
          }}>{saving ? 'Saving…' : 'Submit quiz'}</button>
        </div>
      </div>
    )
  }

  // ── Section step ──
  const sec = sections[step] || {}
  const total = sections.length + (quiz.length > 0 ? 1 : 0)
  const lastSection = step === sections.length - 1
  const finishLabel = quiz.length > 0 ? 'Continue to quiz' : 'Mark complete'
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 4 }}>
          {total > 1 ? `STEP ${step + 1} OF ${total}` : row?.title?.toUpperCase()}
        </div>
        <div className="serif" style={{ fontSize: 18, lineHeight: 1.25, color: 'var(--a-ink)' }}>
          {sec.title || row?.title || 'Course'}
        </div>
      </div>
      <div style={{ fontSize: 14, color: 'var(--a-ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {sec.body || row?.description || ''}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {step > 0 ? (
          <button type="button" onClick={back} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Back</button>
        ) : (
          <button type="button" onClick={onCancel} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Cancel</button>
        )}
        <button type="button" disabled={saving} onClick={lastSection && quiz.length === 0 ? gradeAndFinish : next} style={{
          flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
          fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1,
        }}>{lastSection ? (saving ? 'Saving…' : finishLabel) : 'Next'}</button>
      </div>
    </div>
  )
}

// ── A single course card (everyone) ──────────────────────────────────────────
function CourseCard({ row, isAdmin, onStart, onDelete }) {
  const sections = sectionsOf(row)
  const quiz = quizOf(row)
  const scopeTag = row?.house_id ? 'My house' : 'All staff'
  const completed = !!row?._myCompleted

  const remove = () => {
    if (!window.confirm('Delete this course? Completions will be removed too.')) return
    onDelete(row.id)
    Promise.resolve(deleteCourse(row.id)).catch(() => {})
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
            background: 'var(--a-paper)', color: 'var(--a-ink3)',
          }}>{scopeTag.toUpperCase()}</span>
          {row?.required && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
              background: 'var(--a-paper)', color: 'var(--a-clay)',
            }}>REQUIRED</span>
          )}
        </div>
        {isAdmin && (
          <button onClick={remove} aria-label="Delete course" style={{
            background: 'transparent', border: 0, cursor: 'pointer', lineHeight: 1,
            padding: '2px 4px', color: 'var(--a-ink3)', display: 'inline-flex', flexShrink: 0,
          }}><IconX size={13} /></button>
        )}
      </div>

      <div className="serif" style={{ fontSize: 17, lineHeight: 1.25, color: 'var(--a-ink)', marginBottom: 4 }}>
        {row?.title || 'Untitled course'}
      </div>
      {row?.description && (
        <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.5, marginBottom: 6 }}>{row.description}</div>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>
        {sections.length} {sections.length === 1 ? 'lesson' : 'lessons'}
        {quiz.length > 0 ? ` · ${quiz.length}-question quiz` : ''}
        {row?.created_by_name ? ` · by ${row.created_by_name}` : ''}
      </div>

      {completed ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--a-sage)' }}>
          <IconCheck size={15} sw={2} color="var(--a-sage)" />
          Completed{row?._myScore != null ? ` · ${row._myScore}%` : ''}{row?._myCompletedAt ? ` · ${fmtDate(row._myCompletedAt)}` : ''}
        </div>
      ) : (
        <button onClick={() => onStart(row)} style={{
          display: 'block', width: '100%', marginTop: 12,
          background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999,
          padding: '11px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
        }}>Start course</button>
      )}
    </div>
  )
}

// ── Course list (everyone) ───────────────────────────────────────────────────
function CourseList({ rows, loading, isAdmin, onStart, onDelete }) {
  const [filter, setFilter] = useState('All') // All | Required | To do | Done

  const list = (rows || []).filter(Boolean).filter(r => {
    if (filter === 'Required') return !!r?.required
    if (filter === 'To do') return !r?._myCompleted
    if (filter === 'Done') return !!r?._myCompleted
    return true
  })

  const filters = isAdmin ? ['All', 'Required'] : ['All', 'Required', 'To do', 'Done']

  return (
    <>
      <div style={{ display: 'flex', gap: 7, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
        {filters.map(f => (
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
        <EmptyState icon={<IconAward size={30} sw={1.4} color="var(--a-ink3)" />}
          title={filter === 'Done' ? 'Nothing completed yet.' : filter === 'To do' ? 'All caught up.' : 'No courses yet.'}
          sub={isAdmin && filter !== 'Done' ? 'Create one from “New course”.' : undefined} />
      )}
      {list.map(r => (
        <CourseCard key={r.id} row={r} isAdmin={isAdmin} onStart={onStart} onDelete={onDelete} />
      ))}
    </>
  )
}

// ── Completion dashboard (admins) ────────────────────────────────────────────
// Per required course: % complete + who hasn't finished. Roster = non-supervisor
// staff matching the course's house + assign_roles.
function Dashboard({ rows, orgId, role, houseId }) {
  const [staffList, setStaffList] = useState([])
  const [comps, setComps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const hid = role === 'manager' ? houseId : null
    Promise.all([
      Promise.resolve(fetchStaff(orgId, hid)).catch(() => []),
      Promise.resolve(fetchCourseCompletions(orgId, {})).catch(() => []),
    ]).then(([staff, c]) => {
      setStaffList(staff || []); setComps(c || []); setLoading(false)
    }).catch(() => { setLoading(false) })
  }, [orgId, role, houseId])

  // Completed staff ids per course.
  const doneByCourse = useMemo(() => {
    const m = {}
    for (const r of comps) {
      if (!m[r.course_id]) m[r.course_id] = new Set()
      if (r.staff_id) m[r.course_id].add(r.staff_id)
    }
    return m
  }, [comps])

  const courses = (rows || []).filter(Boolean).filter(c => c.required)

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
  }
  if (courses.length === 0) {
    return <EmptyState icon={<IconAward size={30} sw={1.4} color="var(--a-ink3)" />}
      title="No required courses yet."
      sub="Mark a course as required to track who has completed it." />
  }

  return (
    <>
      {courses.map(c => {
        // Eligible roster for THIS course.
        const roles = Array.isArray(c.assign_roles) ? c.assign_roles.filter(Boolean) : []
        const eligible = (staffList || []).filter(s => {
          if (c.house_id && s.houseId && s.houseId !== c.house_id) return false
          if (roles.length > 0 && !roles.includes(s.rawRole)) return false
          return true
        })
        const done = doneByCourse[c.id] || new Set()
        const total = eligible.length
        const doneCount = eligible.filter(s => done.has(s.id)).length
        const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
        const nonCompleters = eligible.filter(s => !done.has(s.id))
        const allDone = total > 0 && doneCount === total

        return (
          <div key={c.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div className="serif" style={{ fontSize: 16, lineHeight: 1.25, color: 'var(--a-ink)', minWidth: 0 }}>
                {c.title || 'Untitled course'}
              </div>
              <div style={{
                flexShrink: 0, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: allDone ? 'var(--a-sage)' : pct >= 50 ? 'var(--a-ink2)' : 'var(--a-clay)',
              }}>{doneCount}/{total} · {pct}%</div>
            </div>

            {/* progress bar */}
            <div style={{ height: 8, borderRadius: 999, background: 'var(--a-paper)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: allDone ? 'var(--a-sage)' : 'var(--a-ink)' }} />
            </div>

            {total === 0 ? (
              <div style={{ fontSize: 12.5, color: 'var(--a-ink3)' }}>No eligible staff for this course yet.</div>
            ) : allDone ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--a-sage)' }}>
                <IconCheck size={14} sw={2} color="var(--a-sage)" /> Everyone has completed this.
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 6 }}>
                  NOT YET COMPLETED ({nonCompleters.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {nonCompleters.map(s => (
                    <span key={s.id} style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 999,
                      background: 'var(--a-paper)', border: '1px solid var(--a-line)', color: 'var(--a-ink2)',
                    }}>{s.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// ── New course builder (admins) ──────────────────────────────────────────────
function Builder({ orgId, houseId, staffName, onCreated, onCancel }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState('all') // 'all' | 'house'
  const [required, setRequired] = useState(true)
  const [sections, setSections] = useState([{ title: '', body: '' }])
  const [quiz, setQuiz] = useState([])
  const [saving, setSaving] = useState(false)

  const addSection = () => setSections(prev => [...prev, { title: '', body: '' }])
  const removeSection = (i) => setSections(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i))
  const setSec = (i, patch) => setSections(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))

  const addQuestion = () => setQuiz(prev => [...prev, { q: '', options: ['', ''], answer: 0 }])
  const removeQuestion = (i) => setQuiz(prev => prev.filter((_, idx) => idx !== i))
  const setQ = (i, patch) => setQuiz(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q))
  const setOpt = (i, oi, v) => setQuiz(prev => prev.map((q, idx) =>
    idx === i ? { ...q, options: (q.options || []).map((o, j) => j === oi ? v : o) } : q))
  const addOpt = (i) => setQuiz(prev => prev.map((q, idx) =>
    idx === i ? { ...q, options: (q.options || []).length >= 6 ? q.options : [...(q.options || []), ''] } : q))
  const removeOpt = (i, oi) => setQuiz(prev => prev.map((q, idx) => {
    if (idx !== i) return q
    const opts = q.options || []
    if (opts.length <= 2) return q
    const newOpts = opts.filter((_, j) => j !== oi)
    let ans = Number(q.answer) || 0
    if (oi === ans) ans = 0
    else if (oi < ans) ans -= 1
    return { ...q, options: newOpts, answer: ans }
  }))

  const cleanSections = sections
    .map(s => ({ title: (s.title || '').trim(), body: (s.body || '').trim() }))
    .filter(s => s.title || s.body)

  const cleanQuiz = quiz
    .map(q => {
      const options = (q.options || []).map(o => (o || '').trim()).filter(Boolean)
      let answer = Number(q.answer) || 0
      if (answer >= options.length) answer = 0
      return { q: (q.q || '').trim(), options, answer }
    })
    .filter(q => q.q && q.options.length >= 2)

  const canSave = title.trim() && cleanSections.length > 0 && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSave || !orgId) return
    setSaving(true)
    let row = null
    try {
      row = await Promise.resolve(createCourse(orgId, {
        houseId: scope === 'house' ? houseId : null,
        title: title.trim(),
        description: description.trim(),
        sections: cleanSections,
        quiz: cleanQuiz,
        required,
        assignRoles: [],
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
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course title (e.g. Medication Administration Basics)"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Short description (optional)"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

        {/* Who sees this */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHO SEES THIS</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
            {segBtn('all', 'All staff', false)}
            {segBtn('house', 'My house', !houseId)}
          </div>
        </div>

        {/* Required */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
          Required (tracked in the completion dashboard)
        </label>

        {/* Lessons */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>LESSONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sections.map((s, i) => (
              <div key={i} style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', flex: 1 }}>
                    LESSON {i + 1}
                  </span>
                  {sections.length > 1 && (
                    <button type="button" onClick={() => removeSection(i)} aria-label="Remove lesson" style={{
                      background: 'transparent', border: 0, cursor: 'pointer', lineHeight: 1, padding: '2px 4px', color: 'var(--a-ink3)', display: 'inline-flex',
                    }}><IconX size={13} /></button>
                  )}
                </div>
                <input value={s.title} onChange={e => setSec(i, { title: e.target.value })} placeholder="Lesson title"
                  style={inputStyle} />
                <textarea value={s.body} onChange={e => setSec(i, { body: e.target.value })} rows={4} placeholder="Lesson content…"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, marginTop: 8 }} />
              </div>
            ))}
          </div>
          <button type="button" onClick={addSection} style={{
            marginTop: 10, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
            cursor: 'pointer', background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
          }}>+ Add lesson</button>
        </div>

        {/* Quiz */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>
            QUIZ <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional · pass at {PASS_PCT}%)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quiz.map((q, i) => (
              <div key={i} style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', flex: 1 }}>
                    QUESTION {i + 1}
                  </span>
                  <button type="button" onClick={() => removeQuestion(i)} aria-label="Remove question" style={{
                    background: 'transparent', border: 0, cursor: 'pointer', lineHeight: 1, padding: '2px 4px', color: 'var(--a-ink3)', display: 'inline-flex',
                  }}><IconX size={13} /></button>
                </div>
                <input value={q.q} onChange={e => setQ(i, { q: e.target.value })} placeholder="Question text"
                  style={inputStyle} />
                <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', margin: '8px 0 6px' }}>Tap the circle to mark the correct answer.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(q.options || []).map((opt, oi) => {
                    const correct = Number(q.answer) === oi
                    return (
                      <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button type="button" onClick={() => setQ(i, { answer: oi })} aria-label="Mark correct" style={{
                          flexShrink: 0, width: 22, height: 22, borderRadius: 999, cursor: 'pointer', padding: 0,
                          border: `2px solid ${correct ? 'var(--a-sage)' : 'var(--a-line)'}`,
                          background: correct ? 'var(--a-sage)' : 'var(--a-card)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{correct && <IconCheck size={12} sw={2.5} color="#fff" />}</button>
                        <input value={opt} onChange={e => setOpt(i, oi, e.target.value)} placeholder={`Option ${oi + 1}`}
                          style={inputStyle} />
                        {(q.options || []).length > 2 && (
                          <button type="button" onClick={() => removeOpt(i, oi)} aria-label="Remove option" style={{
                            flexShrink: 0, width: 30, height: 30, borderRadius: 999, border: '1px solid var(--a-line)',
                            background: 'var(--a-card)', color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, fontFamily: 'Geist',
                          }}>−</button>
                        )}
                      </div>
                    )
                  })}
                  {(q.options || []).length < 6 && (
                    <button type="button" onClick={() => addOpt(i)} style={{
                      alignSelf: 'flex-start', padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
                      cursor: 'pointer', background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
                    }}>+ Add option</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addQuestion} style={{
            marginTop: quiz.length ? 10 : 0, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
            cursor: 'pointer', background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
          }}>+ Add question</button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!canSave} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
          }}>{saving ? 'Publishing…' : 'Publish course'}</button>
          <button type="button" onClick={onCancel} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </form>
  )
}

export function ScreenA_Courses({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  const tabs = isAdmin ? ['Courses', 'New course', 'Progress'] : ['Courses']
  const [tab, setTab] = useState('Courses')
  const [taking, setTaking] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.resolve(fetchCourses(orgId, { houseId, role, staffId }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, role, staffId])

  useEffect(() => { load() }, [load])

  // Keep tab valid if role changes.
  useEffect(() => { if (!tabs.includes(tab)) setTab('Courses') }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const onCreated = (row) => {
    setTab('Courses')
    if (row) setRows(prev => [row, ...(prev || [])])
    else load()
  }

  const onStart = (row) => setTaking(row)

  const onCompleted = (passed, score) => {
    const id = taking?.id
    setTaking(null)
    if (passed && id) {
      setRows(prev => (prev || []).map(x => x && x.id === id
        ? { ...x, _myCompleted: true, _myScore: score, _myCompletedAt: new Date().toISOString(), _completionCount: (Number(x._completionCount) || 0) + (x._myCompleted ? 0 : 1) } : x))
    }
  }

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
        <TakeCourse row={taking} orgId={orgId} staffId={staffId} staffName={staffName}
          onCompleted={onCompleted} onCancel={() => setTaking(null)} />
      )
    }
    if (isAdmin && tab === 'New course') {
      return (
        <Builder orgId={orgId} houseId={houseId} staffName={staffName}
          onCreated={onCreated} onCancel={() => setTab('Courses')} />
      )
    }
    if (isAdmin && tab === 'Progress') {
      return <Dashboard rows={rows} orgId={orgId} role={role} houseId={houseId} />
    }
    return (
      <CourseList rows={rows} loading={loading} isAdmin={isAdmin}
        onStart={onStart} onDelete={onDelete} />
    )
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: isAdmin ? 10 : 0 }}>Training</div>
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
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Training</div>
      </div>
      {isAdmin && <Chips />}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
