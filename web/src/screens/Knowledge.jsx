import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchKbArticles, createKbArticle, updateKbArticle, deleteKbArticle,
} from '../lib/db'
import { IconSearch, IconStar, IconBook } from '../components/icons'

// "Handbook" screen — a searchable SOP / policy / house-binder library.
//   • everyone reads; search + category filter chips.
//   • admins (supervisor/manager): Library · New article, plus edit/delete.
// Articles are org-wide (house_id null = "All staff") or house-scoped. Provides
// both the mobile (.phone-screen) and desktop (flex column) layouts in one
// component, switching on `desktop` (mirrors Updates).

const CATEGORY_SUGGESTIONS = ['Health & Safety', 'Medications', 'Safety', 'Compliance', 'Operations']

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

// ── A single article card ────────────────────────────────────────────────────
function ArticleCard({ row, isAdmin, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const scopeTag = row?.house_id ? 'My house' : 'All staff'

  const remove = (e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this article? This cannot be undone.')) return
    onDelete(row.id)
    Promise.resolve(deleteKbArticle(row.id)).catch(() => {})
  }

  const edit = (e) => {
    e.stopPropagation()
    onEdit(row)
  }

  return (
    <div style={{ ...card, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {row?.category && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
              background: 'var(--a-paper)', color: 'var(--a-ink2)',
            }}>{String(row.category).toUpperCase()}</span>
          )}
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
            background: 'var(--a-paper)', color: 'var(--a-ink3)',
          }}>{scopeTag.toUpperCase()}</span>
          {row?.pinned && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: 'var(--a-clay)' }}>
              <IconStar size={13} sw={1.5} color="var(--a-clay)" style={{ fill: 'var(--a-clay)' }} />
              Pinned
            </span>
          )}
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={edit} style={{
              background: 'transparent', border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: 'Geist', padding: '2px 6px', color: 'var(--a-ink3)',
            }}>Edit</button>
            <button onClick={remove} aria-label="Delete article" style={{
              background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1,
              padding: '2px 4px', color: 'var(--a-ink3)',
            }}>✕</button>
          </div>
        )}
      </div>

      <div className="serif" style={{ fontSize: 17, lineHeight: 1.25, color: 'var(--a-ink)', marginBottom: 6 }}>
        {row?.title || 'Untitled'}
      </div>

      {row?.body && (
        <div style={open
          ? { fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
          : { fontSize: 13.5, color: 'var(--a-ink2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
        }>
          {row.body}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 10 }}>
        Updated by {row?.updated_by_name || 'Staff'} · {fmtDate(row?.updated_at || row?.created_at)}
      </div>
    </div>
  )
}

// ── Library (everyone) ───────────────────────────────────────────────────────
function Library({ rows, loading, isAdmin, onEdit, onDelete }) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')

  const categories = useMemo(() => {
    const set = []
    for (const r of (rows || [])) {
      const c = (r?.category || '').trim()
      if (c && !set.includes(c)) set.push(c)
    }
    return ['All', ...set]
  }, [rows])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (rows || []).filter(Boolean).filter(r => {
      if (cat !== 'All' && (r?.category || '').trim() !== cat) return false
      if (!q) return true
      const hay = `${r?.title || ''} ${r?.body || ''} ${r?.category || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query, cat])

  return (
    <>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-ink3)', display: 'flex' }}>
          <IconSearch size={17} sw={1.5} />
        </span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the handbook…"
          style={{ ...inputStyle, paddingLeft: 36 }} />
      </div>

      {/* Category filter chips */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 6, marginBottom: 4 }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              flexShrink: 0, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: cat === c ? 'var(--a-ink)' : 'var(--a-card)',
              color: cat === c ? 'var(--a-card)' : 'var(--a-ink2)',
              border: `1px solid ${cat === c ? 'var(--a-ink)' : 'var(--a-line)'}`,
            }}>{c}</button>
          ))}
        </div>
      )}

      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState icon={<IconBook size={30} sw={1.4} color="var(--a-ink3)" />}
          title={query || cat !== 'All' ? 'No articles match.' : 'The handbook is empty.'}
          sub={isAdmin && !query && cat === 'All' ? 'Add the first article from “New article”.' : undefined} />
      )}
      {list.map(r => (
        <ArticleCard key={r.id} row={r} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  )
}

// ── Compose / Edit (admins only) ─────────────────────────────────────────────
function Compose({ orgId, houseId, staffName, editing, onSaved, onCancel }) {
  const isEdit = !!editing
  const [title, setTitle] = useState(editing?.title || '')
  const [category, setCategory] = useState(editing?.category || '')
  const [body, setBody] = useState(editing?.body || '')
  const [scope, setScope] = useState(editing ? (editing.house_id ? 'house' : 'all') : 'all') // 'all' | 'house'
  const [pinned, setPinned] = useState(!!editing?.pinned)
  const [saving, setSaving] = useState(false)

  const canSave = title.trim() && body.trim() && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSave || !orgId) return
    setSaving(true)
    let row = null
    try {
      if (isEdit) {
        row = await Promise.resolve(updateKbArticle(editing.id, {
          category: category.trim(), title: title.trim(), body: body.trim(), pinned,
        })).catch(() => null)
      } else {
        row = await Promise.resolve(createKbArticle(orgId, {
          houseId: scope === 'house' ? houseId : null,
          category: category.trim(),
          title: title.trim(),
          body: body.trim(),
          pinned,
          updatedByName: staffName,
        })).catch(() => null)
      }
    } catch { row = null }
    setSaving(false)
    onSaved(row, isEdit, editing?.id)
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
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Article title"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />

        {/* Category */}
        <div>
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g. Medications)"
            style={inputStyle} />
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
            {CATEGORY_SUGGESTIONS.map(c => {
              const on = category.trim() === c
              return (
                <button key={c} type="button" onClick={() => setCategory(c)} style={{
                  padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                  background: on ? 'var(--a-ink)' : 'var(--a-card)',
                  color: on ? 'var(--a-card)' : 'var(--a-ink2)',
                  border: `1px solid ${on ? 'var(--a-ink)' : 'var(--a-line)'}`,
                }}>{c}</button>
              )
            })}
          </div>
        </div>

        <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Write the policy, SOP, or house note…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

        {/* Who sees this */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHO SEES THIS</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4, opacity: isEdit ? 0.6 : 1 }}>
            {segBtn('all', 'All staff', isEdit)}
            {segBtn('house', 'My house', isEdit || !houseId)}
          </div>
          {isEdit && (
            <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 6 }}>Audience can’t be changed when editing.</div>
          )}
        </div>

        {/* Pin */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
          Pin to top
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!canSave} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
          }}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Publish article'}</button>
          <button type="button" onClick={onCancel} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </form>
  )
}

export function ScreenA_Knowledge({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  const tabs = isAdmin ? ['Library', 'New article'] : ['Library']
  const [tab, setTab] = useState('Library')
  const [editing, setEditing] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.resolve(fetchKbArticles(orgId, { houseId, role }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, role])

  useEffect(() => { load() }, [load])

  // Keep tab valid if role changes.
  useEffect(() => { if (!tabs.includes(tab)) setTab('Library') }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (row) => {
    setEditing(row)
    setTab('New article')
  }

  const onSaved = (row, wasEdit, editId) => {
    setEditing(null)
    setTab('Library')
    if (row) {
      if (wasEdit) setRows(prev => (prev || []).map(x => x && x.id === editId ? row : x))
      else setRows(prev => [row, ...(prev || [])])
    } else {
      load()
    }
  }

  const onDelete = useCallback((id) => {
    setRows(prev => (prev || []).filter(x => x && x.id !== id))
  }, [])

  const goTab = (t) => {
    if (t !== 'New article') setEditing(null)
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
    if (isAdmin && tab === 'New article') {
      return (
        <Compose orgId={orgId} houseId={houseId} staffName={staffName} editing={editing}
          onSaved={onSaved} onCancel={() => { setEditing(null); setTab('Library') }} />
      )
    }
    return (
      <Library rows={rows} loading={loading} isAdmin={isAdmin} onEdit={startEdit} onDelete={onDelete} />
    )
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: isAdmin ? 10 : 0 }}>Handbook</div>
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
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Handbook</div>
      </div>
      {isAdmin && <Chips />}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
