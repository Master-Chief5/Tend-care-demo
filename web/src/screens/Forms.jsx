import { useState, useEffect, useCallback } from 'react'
import {
  fetchFormTemplates, createFormTemplate, deleteFormTemplate,
  fetchFormSubmissions, submitForm, reviewFormSubmission,
} from '../lib/db'
import { IconBook, IconCheck, IconPlus } from '../components/icons'

// "Forms" screen — a no-code Forms module (shift checklists, safety
// walkthroughs, audits).
//   • everyone: a list of available form templates; tapping one opens a fill
//     view that renders the template.fields and submits answers.
//   • admins (supervisor/manager): Forms · Build · Submissions, where Build is a
//     simple form-builder and Submissions is a review queue.
// Templates are org-wide (house_id null = "All staff") or house-scoped. Provides
// both the mobile (.phone-screen) and desktop (flex column) layouts in one
// component, switching on `desktop` (mirrors Knowledge / Updates).

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Dropdown' },
]
const FIELD_TYPE_LABEL = { text: 'Text', number: 'Number', checkbox: 'Checkbox', select: 'Dropdown' }

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

function fieldsOf(tpl) {
  return Array.isArray(tpl?.fields) ? tpl.fields.filter(Boolean) : []
}

function keyOf(field, i) {
  return field?.key || `f${i}`
}

// ── Fill view: renders one template's fields and submits answers ─────────────
function FillForm({ orgId, houseId, staffName, template, onSubmitted, onCancel }) {
  const fields = fieldsOf(template)
  const [answers, setAnswers] = useState(() => {
    const init = {}
    fields.forEach((f, i) => { init[keyOf(f, i)] = f?.type === 'checkbox' ? false : '' })
    return init
  })
  const [saving, setSaving] = useState(false)

  const setAnswer = (k, v) => setAnswers(prev => ({ ...prev, [k]: v }))

  const missingRequired = fields.some((f, i) => {
    if (!f?.required) return false
    const v = answers[keyOf(f, i)]
    if (f?.type === 'checkbox') return v !== true
    return v == null || String(v).trim() === ''
  })
  const canSubmit = !missingRequired && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSubmit || !orgId) return
    setSaving(true)
    let row = null
    try {
      row = await Promise.resolve(submitForm(orgId, {
        templateId: template.id,
        houseId: template?.house_id || houseId || null,
        answers,
        submittedByName: staffName,
      })).catch(() => null)
    } catch { row = null }
    setSaving(false)
    onSubmitted(row)
  }

  const renderField = (f, i) => {
    const k = keyOf(f, i)
    const label = f?.label || `Field ${i + 1}`
    const opts = Array.isArray(f?.options) ? f.options.filter(o => o != null && String(o).trim() !== '') : []
    if (f?.type === 'checkbox') {
      return (
        <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--a-ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!answers[k]} onChange={e => setAnswer(k, e.target.checked)} />
          {label}{f?.required && <span style={{ color: 'var(--a-clay)' }}> *</span>}
        </label>
      )
    }
    return (
      <div key={k}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a-ink2)', marginBottom: 6 }}>
          {label}{f?.required && <span style={{ color: 'var(--a-clay)' }}> *</span>}
        </div>
        {f?.type === 'select' ? (
          <select value={answers[k] || ''} onChange={e => setAnswer(k, e.target.value)}
            style={{ ...inputStyle, appearance: 'auto' }}>
            <option value="">Select…</option>
            {opts.map((o, oi) => <option key={oi} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={f?.type === 'number' ? 'number' : 'text'} value={answers[k] || ''}
            onChange={e => setAnswer(k, e.target.value)} placeholder={f?.type === 'number' ? '0' : 'Type a response…'}
            style={inputStyle} />
        )}
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="serif" style={{ fontSize: 18, lineHeight: 1.25, color: 'var(--a-ink)' }}>{template?.name || 'Form'}</div>
          {template?.description && (
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.5, marginTop: 5 }}>{template.description}</div>
          )}
        </div>

        {fields.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--a-ink3)' }}>This form has no fields yet.</div>
          : fields.map(renderField)}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!canSubmit} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5,
          }}>{saving ? 'Submitting…' : 'Submit form'}</button>
          <button type="button" onClick={onCancel} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </form>
  )
}

// ── Forms list (everyone) ────────────────────────────────────────────────────
function FormsList({ rows, loading, onOpen }) {
  const list = (rows || []).filter(Boolean)
  return (
    <>
      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState icon={<IconBook size={30} sw={1.4} color="var(--a-ink3)" />}
          title="No forms yet." sub="Checklists and audits will appear here once they’re built." />
      )}
      {list.map(tpl => {
        const scopeTag = tpl?.house_id ? 'My house' : 'All staff'
        const count = fieldsOf(tpl).length
        return (
          <div key={tpl.id} style={{ ...card, cursor: 'pointer' }} onClick={() => onOpen(tpl)}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
                background: 'var(--a-paper)', color: 'var(--a-ink3)',
              }}>{scopeTag.toUpperCase()}</span>
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
                background: 'var(--a-paper)', color: 'var(--a-ink2)',
              }}>{count} {count === 1 ? 'FIELD' : 'FIELDS'}</span>
            </div>
            <div className="serif" style={{ fontSize: 17, lineHeight: 1.25, color: 'var(--a-ink)', marginBottom: 6 }}>
              {tpl?.name || 'Untitled form'}
            </div>
            {tpl?.description && (
              <div style={{ fontSize: 13.5, color: 'var(--a-ink2)', lineHeight: 1.5 }}>{tpl.description}</div>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 10 }}>
              Tap to fill out
            </div>
          </div>
        )
      })}
    </>
  )
}

// ── Build (admins only): a simple form-builder ───────────────────────────────
function Build({ orgId, houseId, staffName, onBuilt }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState('all') // 'all' | 'house'
  const [fields, setFields] = useState([])
  const [draftType, setDraftType] = useState('text')
  const [draftLabel, setDraftLabel] = useState('')
  const [draftOptions, setDraftOptions] = useState('')
  const [draftRequired, setDraftRequired] = useState(false)
  const [saving, setSaving] = useState(false)

  const addField = () => {
    const label = draftLabel.trim()
    if (!label) return
    const opts = draftType === 'select'
      ? draftOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined
    const key = `f${Date.now()}_${fields.length}`
    setFields(prev => [...prev, { key, label, type: draftType, options: opts, required: draftRequired }])
    setDraftLabel('')
    setDraftOptions('')
    setDraftRequired(false)
  }

  const removeField = (i) => setFields(prev => prev.filter((_, idx) => idx !== i))

  const canSave = name.trim() && fields.length > 0 && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSave || !orgId) return
    setSaving(true)
    let row = null
    try {
      row = await Promise.resolve(createFormTemplate(orgId, {
        houseId: scope === 'house' ? houseId : null,
        name: name.trim(),
        description: description.trim(),
        fields,
        createdByName: staffName,
      })).catch(() => null)
    } catch { row = null }
    setSaving(false)
    onBuilt(row)
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
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Form name (e.g. Morning shift checklist)"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="What is this form for? (optional)" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

        {/* Who uses this */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHO USES THIS</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
            {segBtn('all', 'All staff', false)}
            {segBtn('house', 'My house', !houseId)}
          </div>
        </div>

        {/* Existing fields */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>FIELDS</div>
          {fields.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--a-ink3)' }}>No fields yet — add at least one below.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {fields.map((f, i) => (
                <div key={f.key || i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: 'var(--a-paper)',
                  border: '1px solid var(--a-line)', borderRadius: 10, padding: '8px 12px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>
                      {f.label}{f.required && <span style={{ color: 'var(--a-clay)' }}> *</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>
                      {FIELD_TYPE_LABEL[f.type] || f.type}
                      {f.type === 'select' && Array.isArray(f.options) && f.options.length ? ` · ${f.options.join(', ')}` : ''}
                    </div>
                  </div>
                  <button type="button" onClick={() => removeField(i)} aria-label="Remove field" style={{
                    flexShrink: 0, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1,
                    padding: '2px 4px', color: 'var(--a-ink3)',
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add a field */}
        <div style={{ borderTop: '1px solid var(--a-line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em' }}>ADD A FIELD</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {FIELD_TYPES.map(t => {
              const on = draftType === t.value
              return (
                <button key={t.value} type="button" onClick={() => setDraftType(t.value)} style={{
                  padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                  background: on ? 'var(--a-ink)' : 'var(--a-card)',
                  color: on ? 'var(--a-card)' : 'var(--a-ink2)',
                  border: `1px solid ${on ? 'var(--a-ink)' : 'var(--a-line)'}`,
                }}>{t.label}</button>
              )
            })}
          </div>
          <input value={draftLabel} onChange={e => setDraftLabel(e.target.value)} placeholder="Field label (e.g. Kitchen cleaned)"
            style={inputStyle} />
          {draftType === 'select' && (
            <input value={draftOptions} onChange={e => setDraftOptions(e.target.value)} placeholder="Options, comma separated (e.g. Pass, Fail, N/A)"
              style={inputStyle} />
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-ink)', cursor: 'pointer' }}>
            <input type="checkbox" checked={draftRequired} onChange={e => setDraftRequired(e.target.checked)} />
            Required
          </label>
          <button type="button" onClick={addField} disabled={!draftLabel.trim()} style={{
            alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: 'Geist',
            cursor: draftLabel.trim() ? 'pointer' : 'default', opacity: draftLabel.trim() ? 1 : 0.5,
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
          }}><IconPlus size={15} sw={1.8} /> Add field</button>
        </div>

        <button type="submit" disabled={!canSave} style={{
          background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
          fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
        }}>{saving ? 'Saving…' : 'Create form'}</button>
      </div>
    </form>
  )
}

// ── Submissions review queue (admins only) ───────────────────────────────────
function Submissions({ orgId, houseId, templates, rows, setRows, loading }) {
  const tplName = useCallback((id) => {
    const t = (templates || []).find(x => x && x.id === id)
    return t?.name || 'Form'
  }, [templates])

  const markReviewed = (row, reviewedByName) => {
    setRows(prev => (prev || []).map(x => x && x.id === row.id
      ? { ...x, status: 'reviewed', reviewed_by_name: reviewedByName } : x))
    Promise.resolve(reviewFormSubmission(row.id, { reviewedByName })).catch(() => {})
  }

  const list = (rows || []).filter(Boolean)

  return (
    <SubmissionsInner orgId={orgId} list={list} loading={loading} tplName={tplName} onReview={markReviewed} />
  )
}

function SubmissionsInner({ list, loading, tplName, onReview }) {
  return (
    <>
      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState icon={<IconCheck size={30} sw={1.4} color="var(--a-ink3)" />}
          title="No submissions yet." sub="Completed forms will land here for review." />
      )}
      {list.map(row => (
        <SubmissionCard key={row.id} row={row} tplName={tplName} onReview={onReview} />
      ))}
    </>
  )
}

function SubmissionCard({ row, tplName, onReview }) {
  const reviewed = row?.status === 'reviewed'
  const answers = row?.answers && typeof row.answers === 'object' ? row.answers : {}
  const entries = Object.entries(answers)

  const fmtVal = (v) => {
    if (v === true) return 'Yes'
    if (v === false) return 'No'
    if (v == null || String(v).trim() === '') return '—'
    return String(v)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: 16, lineHeight: 1.25, color: 'var(--a-ink)' }}>{tplName(row?.template_id)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 3 }}>
            {row?.submitted_by_name || 'Staff'} · {fmtDate(row?.submitted_at)}
          </div>
        </div>
        <span style={{
          flexShrink: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 999,
          background: 'var(--a-paper)', color: reviewed ? 'var(--a-sage)' : '#b9892f',
        }}>{reviewed ? 'REVIEWED' : 'OPEN'}</span>
      </div>

      {entries.length > 0 && (
        <div style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', marginBottom: reviewed ? 10 : 12 }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '3px 0' }}>
              <span style={{ color: 'var(--a-ink3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
              <span style={{ color: 'var(--a-ink)', fontWeight: 500, textAlign: 'right' }}>{fmtVal(v)}</span>
            </div>
          ))}
        </div>
      )}

      {reviewed ? (
        <div style={{ fontSize: 11.5, color: 'var(--a-sage)', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
          <IconCheck size={14} sw={2} color="var(--a-sage)" /> Reviewed{row?.reviewed_by_name ? ` by ${row.reviewed_by_name}` : ''}
        </div>
      ) : (
        <button onClick={() => onReview(row, 'You')} style={{
          display: 'block', width: '100%', background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999,
          padding: '11px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
        }}>Mark reviewed</button>
      )}
    </div>
  )
}

export function ScreenA_Forms({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  const tabs = isAdmin ? ['Forms', 'Build', 'Submissions'] : ['Forms']
  const [tab, setTab] = useState('Forms')
  const [open, setOpen] = useState(null) // template being filled
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState([])
  const [subsLoading, setSubsLoading] = useState(true)

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.resolve(fetchFormTemplates(orgId, { houseId, role }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, role])

  const loadSubs = useCallback(() => {
    if (!orgId || !isAdmin) { setSubsLoading(false); return Promise.resolve() }
    setSubsLoading(true)
    return Promise.resolve(fetchFormSubmissions(orgId, { houseId }))
      .then(r => { setSubs(r || []); setSubsLoading(false) })
      .catch(() => { setSubs([]); setSubsLoading(false) })
  }, [orgId, houseId, isAdmin])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadSubs() }, [loadSubs])

  // Keep tab valid if role changes.
  useEffect(() => { if (!tabs.includes(tab)) setTab('Forms') }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const onBuilt = (row) => {
    setTab('Forms')
    if (row) setRows(prev => [row, ...(prev || [])])
    else load()
  }

  const onSubmitted = () => {
    setOpen(null)
    setTab('Forms')
    if (isAdmin) loadSubs()
  }

  const goTab = (t) => {
    setOpen(null)
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
    if (open) {
      return (
        <FillForm orgId={orgId} houseId={houseId} staffName={staffName} template={open}
          onSubmitted={onSubmitted} onCancel={() => setOpen(null)} />
      )
    }
    if (isAdmin && tab === 'Build') {
      return <Build orgId={orgId} houseId={houseId} staffName={staffName} onBuilt={onBuilt} />
    }
    if (isAdmin && tab === 'Submissions') {
      return (
        <Submissions orgId={orgId} houseId={houseId} templates={rows} rows={subs} setRows={setSubs} loading={subsLoading} />
      )
    }
    return <FormsList rows={rows} loading={loading} onOpen={setOpen} />
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: isAdmin ? 10 : 0 }}>Forms</div>
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
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Forms</div>
      </div>
      {isAdmin && <Chips />}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
