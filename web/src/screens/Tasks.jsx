import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchQuickTasks, createQuickTask, completeQuickTask, reopenQuickTask, deleteQuickTask,
  fetchStaff,
} from '../lib/db'
import { IconCheck, IconClock, IconX } from '../components/icons'

// "Quick Tasks" screen — assignable one-off tasks with due dates: the
// "waiting for you" queue.
//   • everyone reads + creates tasks; chips filter the queue.
//   • "Assigned to me" narrows to tasks assigned to my staffId.
//   • anyone can complete a task (optimistic); admins can delete.
// Tasks are org-wide (house_id null = "All staff") or house-scoped. Provides
// both the mobile (.phone-screen) and desktop (flex column) layouts in one
// component, switching on `desktop` (mirrors Updates).

function fmtDue(dateLike) {
  if (!dateLike) return ''
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return String(dateLike)
  const today = new Date()
  const sameYear = d.getFullYear() === today.getFullYear()
  return d.toLocaleDateString(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(dateLike) {
  if (!dateLike) return false
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
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

// ── A single task card ───────────────────────────────────────────────────────
function TaskCard({ row, isAdmin, onToggle, onDelete }) {
  const done = row?.status === 'done'
  const overdue = !done && isOverdue(row?.due_at)
  const scopeTag = row?.house_id ? 'My house' : 'All staff'

  const remove = (e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this task? This cannot be undone.')) return
    onDelete(row.id)
    Promise.resolve(deleteQuickTask(row.id)).catch(() => {})
  }

  return (
    <div style={{ ...card, opacity: done ? 0.62 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Checkbox / toggle */}
        <button onClick={() => onToggle(row)} aria-label={done ? 'Reopen task' : 'Mark done'} style={{
          flexShrink: 0, marginTop: 1, width: 24, height: 24, borderRadius: 7, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          background: done ? 'var(--a-sage)' : 'var(--a-card)',
          border: `1.5px solid ${done ? 'var(--a-sage)' : 'var(--a-line)'}`,
        }}>
          {done && <IconCheck size={15} sw={2.5} color="#fff" />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14.5, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1.3, wordBreak: 'break-word',
                textDecoration: done ? 'line-through' : 'none',
              }}>{row?.title || 'Untitled task'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
                background: 'var(--a-paper)', color: 'var(--a-ink3)',
              }}>{scopeTag.toUpperCase()}</span>
              {isAdmin && (
                <button onClick={remove} aria-label="Delete task" style={{
                  background: 'transparent', border: 0, cursor: 'pointer', lineHeight: 1,
                  padding: '2px 4px', color: 'var(--a-ink3)', display: 'inline-flex',
                }}><IconX size={13} /></button>
              )}
            </div>
          </div>

          {row?.notes && (
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.5, marginTop: 5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {row.notes}
            </div>
          )}

          {/* Due date */}
          {row?.due_at && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12 }}>
              <IconClock size={13} sw={1.6} color={overdue ? 'var(--a-clay)' : 'var(--a-ink3)'} />
              <span style={{ color: overdue ? 'var(--a-clay)' : 'var(--a-ink3)', fontWeight: overdue ? 700 : 500 }}>
                {overdue ? `Overdue · ${fmtDue(row.due_at)}` : `Due ${fmtDue(row.due_at)}`}
              </span>
            </div>
          )}

          {/* Footer: assignee + status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row?.assigned_name ? `For ${row.assigned_name}` : 'Unassigned'}
              {row?.created_by_name ? ` · from ${row.created_by_name}` : ''}
            </div>
            {done && (
              <span style={{ fontSize: 11.5, color: 'var(--a-sage)', fontWeight: 600, flexShrink: 0 }}>
                Done{row?.done_by_name ? ` · ${row.done_by_name}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Queue (everyone) ─────────────────────────────────────────────────────────
function Queue({ rows, loading, filter, isAdmin, onToggle, onDelete }) {
  const list = (rows || []).filter(Boolean)

  const empty = filter === 'Done'
    ? { title: 'Nothing completed yet.', sub: undefined }
    : filter === 'Assigned to me'
      ? { title: 'Nothing waiting for you.', sub: 'Tasks assigned to you will show up here.' }
      : { title: 'No open tasks.', sub: 'Create the first one from “New task”.' }

  return (
    <>
      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState icon={<IconCheck size={28} sw={1.5} color="var(--a-ink3)" />} title={empty.title} sub={empty.sub} />
      )}
      {list.map(r => (
        <TaskCard key={r.id} row={r} isAdmin={isAdmin} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </>
  )
}

// ── Compose (everyone) ───────────────────────────────────────────────────────
function Compose({ orgId, houseId, staffName, staffList, onCreated, onCancel }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [assigneeId, setAssigneeId] = useState('')   // '' = use free-text name
  const [assigneeName, setAssigneeName] = useState('')
  const [due, setDue] = useState('')                 // yyyy-mm-dd
  const [scope, setScope] = useState('all')          // 'all' | 'house'
  const [saving, setSaving] = useState(false)

  const hasStaff = Array.isArray(staffList) && staffList.length > 0
  const canSave = title.trim() && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSave || !orgId) return
    setSaving(true)

    const picked = hasStaff && assigneeId
      ? (staffList.find(s => s && String(s.id) === String(assigneeId)) || null)
      : null
    const name = picked ? picked.name : assigneeName.trim()
    const dueAt = due ? new Date(`${due}T00:00:00`).toISOString() : null

    let row = null
    try {
      row = await Promise.resolve(createQuickTask(orgId, {
        houseId: scope === 'house' ? houseId : null,
        title: title.trim(),
        notes: notes.trim(),
        assignedStaffId: picked ? picked.id : null,
        assignedName: name || null,
        dueAt,
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
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing?"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes (optional)"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

        {/* Assignee */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>ASSIGN TO</div>
          {hasStaff ? (
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={inputStyle}>
              <option value="">Anyone / type a name…</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input value={assigneeName} onChange={e => setAssigneeName(e.target.value)} placeholder="Assignee name (optional)"
              style={inputStyle} />
          )}
          {hasStaff && !assigneeId && (
            <input value={assigneeName} onChange={e => setAssigneeName(e.target.value)} placeholder="…or a name"
              style={{ ...inputStyle, marginTop: 8 }} />
          )}
        </div>

        {/* Due date */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>DUE DATE</div>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} style={inputStyle} />
        </div>

        {/* Who sees this */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHO SEES THIS</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
            {segBtn('all', 'All staff', false)}
            {segBtn('house', 'My house', !houseId)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!canSave} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
          }}>{saving ? 'Adding…' : 'Add task'}</button>
          <button type="button" onClick={onCancel} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </form>
  )
}

export function ScreenA_Tasks({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  const tabs = ['Assigned to me', 'All open', 'Done', 'New task']
  const [tab, setTab] = useState('Assigned to me')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState([])

  // The active filter chip is whichever tab isn't the compose form.
  const filter = tab === 'New task' ? 'All open' : tab

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    const opts = { houseId }
    if (filter === 'Assigned to me') { opts.assignedStaffId = staffId; opts.status = 'open' }
    else if (filter === 'Done') { opts.status = 'done' }
    else { opts.status = 'open' }
    return Promise.resolve(fetchQuickTasks(orgId, opts))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, staffId, filter])

  useEffect(() => { load() }, [load])

  // Staff list for the assignee picker (best-effort; falls back to free text).
  useEffect(() => {
    if (!orgId) return
    Promise.resolve(fetchStaff(orgId, houseId)).then(s => setStaffList(s || [])).catch(() => setStaffList([]))
  }, [orgId, houseId])

  const onToggle = useCallback((row) => {
    if (!row || !row.id) return
    const done = row.status === 'done'
    if (done) {
      // Reopen: drop it from the Done view, otherwise flip in place.
      if (filter === 'Done') setRows(prev => (prev || []).filter(x => x && x.id !== row.id))
      else setRows(prev => (prev || []).map(x => x && x.id === row.id ? { ...x, status: 'open', done_at: null, done_by_name: null } : x))
      Promise.resolve(reopenQuickTask(row.id)).catch(() => {})
    } else {
      // Complete: drop it from any open view, otherwise flip in place.
      if (filter !== 'Done') setRows(prev => (prev || []).filter(x => x && x.id !== row.id))
      else setRows(prev => (prev || []).map(x => x && x.id === row.id ? { ...x, status: 'done', done_by_name: staffName } : x))
      Promise.resolve(completeQuickTask(row.id, staffName)).catch(() => {})
    }
  }, [filter, staffName])

  const onDelete = useCallback((id) => {
    setRows(prev => (prev || []).filter(x => x && x.id !== id))
  }, [])

  const onCreated = (row) => {
    setTab('All open')
    // Newly created tasks are open; refetch so the active filter stays accurate.
    if (row) setRows(prev => [row, ...(prev || [])])
    else load()
  }

  const Chips = () => (
    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: desktop ? '0 0 4px' : '0 22px 6px' }}>
      {tabs.map(t => (
        <button key={t} onClick={() => setTab(t)} style={{
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
    if (tab === 'New task') {
      return (
        <Compose orgId={orgId} houseId={houseId} staffName={staffName} staffList={staffList}
          onCreated={onCreated} onCancel={() => setTab('All open')} />
      )
    }
    return (
      <Queue rows={rows} loading={loading} filter={filter} isAdmin={isAdmin} onToggle={onToggle} onDelete={onDelete} />
    )
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: 10 }}>Tasks</div>
          <Chips />
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
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Tasks</div>
      </div>
      <Chips />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
