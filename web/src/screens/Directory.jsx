import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchContacts, createContact, updateContact, deleteContact,
} from '../lib/db'
import { IconSearch, IconPeople } from '../components/icons'

// "Directory" screen — a searchable list of EXTERNAL work contacts: the numbers
// DSPs reach for on shift (pharmacy, physicians, case managers, guardians,
// vendors, emergency).
//   • everyone reads; search (name/org/kind) + kind filter chips; tap-to-call
//     phone and mailto email on every card.
//   • admins (supervisor/manager): Directory · Add contact, plus edit/delete.
// Contacts are org-wide (house_id null = "All houses") or house-scoped. Provides
// both the mobile (.phone-screen) and desktop (flex column) layouts in one
// component, switching on `desktop` (mirrors Updates).

// Kind metadata: label + a colored pill (statuses: good=sage, warn=#b9892f,
// bad=clay, info=#3c5887).
const KINDS = [
  { value: 'pharmacy',     label: 'Pharmacy',     color: '#3c5887' },
  { value: 'physician',    label: 'Physician',    color: 'var(--a-sage)' },
  { value: 'guardian',     label: 'Guardian',     color: '#b9892f' },
  { value: 'case_manager', label: 'Case manager', color: '#3c5887' },
  { value: 'vendor',       label: 'Vendor',       color: 'var(--a-ink2)' },
  { value: 'emergency',    label: 'Emergency',    color: 'var(--a-clay)' },
  { value: 'other',        label: 'Other',        color: 'var(--a-ink3)' },
]
const KIND_BY = Object.fromEntries(KINDS.map(k => [k.value, k]))
const kindMeta = (v) => KIND_BY[v] || { value: v || 'other', label: v ? String(v) : 'Other', color: 'var(--a-ink3)' }

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

// ── Inline SVGs (no emoji) ───────────────────────────────────────────────────
function IconPhone({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2.1Z" />
    </svg>
  )
}
function IconMail({ size = 15, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )
}

// ── A single contact card ────────────────────────────────────────────────────
function ContactCard({ row, isAdmin, onEdit, onDelete }) {
  const meta = kindMeta(row?.kind)
  const scopeTag = row?.house_id ? 'My house' : 'All houses'

  const remove = () => {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    onDelete(row.id)
    Promise.resolve(deleteContact(row.id)).catch(() => {})
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
            background: meta.color, color: '#fff',
          }}>{meta.label.toUpperCase()}</span>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
            background: 'var(--a-paper)', color: 'var(--a-ink3)',
          }}>{scopeTag.toUpperCase()}</span>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => onEdit(row)} style={{
              background: 'transparent', border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: 'Geist', padding: '2px 6px', color: 'var(--a-ink3)',
            }}>Edit</button>
            <button onClick={remove} aria-label="Delete contact" style={{
              background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1,
              padding: '2px 4px', color: 'var(--a-ink3)',
            }}>✕</button>
          </div>
        )}
      </div>

      <div className="serif" style={{ fontSize: 17, lineHeight: 1.25, color: 'var(--a-ink)', marginBottom: row?.org_name ? 2 : 8 }}>
        {row?.name || 'Unnamed contact'}
      </div>
      {row?.org_name && (
        <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginBottom: 8 }}>{row.org_name}</div>
      )}

      {/* Tap-to-call / mailto actions */}
      {(row?.phone || row?.email) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: row?.notes ? 10 : 0 }}>
          {row?.phone && (
            <a href={`tel:${String(row.phone).replace(/[^+\d]/g, '')}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none',
              background: 'var(--a-sage)', color: '#fff', borderRadius: 999, padding: '8px 14px',
              fontSize: 13, fontWeight: 600, fontFamily: 'Geist',
            }}>
              <IconPhone size={14} color="#fff" />{row.phone}
            </a>
          )}
          {row?.email && (
            <a href={`mailto:${row.email}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none',
              background: 'var(--a-card)', color: 'var(--a-ink)', border: '1px solid var(--a-line)',
              borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'Geist',
            }}>
              <IconMail size={14} color="var(--a-ink2)" />{row.email}
            </a>
          )}
        </div>
      )}

      {row?.notes && (
        <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {row.notes}
        </div>
      )}
    </div>
  )
}

// ── Directory list (everyone) ────────────────────────────────────────────────
function List({ rows, loading, isAdmin, onEdit, onDelete }) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('All')

  const kinds = useMemo(() => {
    const set = []
    for (const r of (rows || [])) {
      const k = (r?.kind || '').trim()
      if (k && !set.includes(k)) set.push(k)
    }
    return ['All', ...set]
  }, [rows])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (rows || []).filter(Boolean).filter(r => {
      if (kind !== 'All' && (r?.kind || '').trim() !== kind) return false
      if (!q) return true
      const hay = `${r?.name || ''} ${r?.org_name || ''} ${kindMeta(r?.kind).label} ${r?.notes || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query, kind])

  return (
    <>
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--a-ink3)', display: 'flex' }}>
          <IconSearch size={17} sw={1.5} />
        </span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, org, or type…"
          style={{ ...inputStyle, paddingLeft: 36 }} />
      </div>

      {/* Kind filter chips */}
      {kinds.length > 1 && (
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 6, marginBottom: 4 }}>
          {kinds.map(k => {
            const label = k === 'All' ? 'All' : kindMeta(k).label
            return (
              <button key={k} onClick={() => setKind(k)} style={{
                flexShrink: 0, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
                cursor: 'pointer', whiteSpace: 'nowrap',
                background: kind === k ? 'var(--a-ink)' : 'var(--a-card)',
                color: kind === k ? 'var(--a-card)' : 'var(--a-ink2)',
                border: `1px solid ${kind === k ? 'var(--a-ink)' : 'var(--a-line)'}`,
              }}>{label}</button>
            )
          })}
        </div>
      )}

      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState icon={<IconPeople size={30} sw={1.4} color="var(--a-ink3)" />}
          title={query || kind !== 'All' ? 'No contacts match.' : 'The directory is empty.'}
          sub={isAdmin && !query && kind === 'All' ? 'Add the first contact from “Add contact”.' : undefined} />
      )}
      {list.map(r => (
        <ContactCard key={r.id} row={r} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  )
}

// ── Compose / Edit (admins only) ─────────────────────────────────────────────
function Compose({ orgId, houseId, editing, onSaved, onCancel }) {
  const isEdit = !!editing
  const [name, setName] = useState(editing?.name || '')
  const [kind, setKind] = useState(editing?.kind || 'pharmacy')
  const [orgName, setOrgName] = useState(editing?.org_name || '')
  const [phone, setPhone] = useState(editing?.phone || '')
  const [email, setEmail] = useState(editing?.email || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [scope, setScope] = useState(editing ? (editing.house_id ? 'house' : 'all') : 'all') // 'all' | 'house'
  const [saving, setSaving] = useState(false)

  const canSave = name.trim() && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSave || !orgId) return
    setSaving(true)
    let row = null
    try {
      if (isEdit) {
        row = await Promise.resolve(updateContact(editing.id, {
          name: name.trim(), kind, orgName: orgName.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim(),
        })).catch(() => null)
      } else {
        row = await Promise.resolve(createContact(orgId, {
          houseId: scope === 'house' ? houseId : null,
          name: name.trim(),
          kind,
          orgName: orgName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim(),
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
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Contact name (e.g. Dr. Patel)"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />

        {/* Kind */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>TYPE</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {KINDS.map(k => {
              const on = kind === k.value
              return (
                <button key={k.value} type="button" onClick={() => setKind(k.value)} style={{
                  padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                  background: on ? k.color : 'var(--a-card)',
                  color: on ? '#fff' : 'var(--a-ink2)',
                  border: `1px solid ${on ? k.color : 'var(--a-line)'}`,
                }}>{k.label}</button>
              )
            })}
          </div>
        </div>

        <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Organization (e.g. Walgreens #482)"
          style={inputStyle} />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" inputMode="tel"
          style={inputStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" inputMode="email"
          style={inputStyle} />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Notes (hours, after-hours line, fax, who to ask for…)"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

        {/* Who sees this */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHO SEES THIS</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4, opacity: isEdit ? 0.6 : 1 }}>
            {segBtn('all', 'All houses', isEdit)}
            {segBtn('house', 'My house', isEdit || !houseId)}
          </div>
          {isEdit && (
            <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 6 }}>Audience can’t be changed when editing.</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={!canSave} style={{
            flex: 1, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5,
          }}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add contact'}</button>
          <button type="button" onClick={onCancel} style={{
            background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999,
            padding: '12px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Cancel</button>
        </div>
      </div>
    </form>
  )
}

export function ScreenA_Directory({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  const tabs = isAdmin ? ['Directory', 'Add contact'] : ['Directory']
  const [tab, setTab] = useState('Directory')
  const [editing, setEditing] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.resolve(fetchContacts(orgId, { houseId, role }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, role])

  useEffect(() => { load() }, [load])

  // Keep tab valid if role changes.
  useEffect(() => { if (!tabs.includes(tab)) setTab('Directory') }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (row) => {
    setEditing(row)
    setTab('Add contact')
  }

  const onSaved = (row, wasEdit, editId) => {
    setEditing(null)
    setTab('Directory')
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
    if (t !== 'Add contact') setEditing(null)
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
    if (isAdmin && tab === 'Add contact') {
      return (
        <Compose orgId={orgId} houseId={houseId} editing={editing}
          onSaved={onSaved} onCancel={() => { setEditing(null); setTab('Directory') }} />
      )
    }
    return (
      <List rows={rows} loading={loading} isAdmin={isAdmin} onEdit={startEdit} onDelete={onDelete} />
    )
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: isAdmin ? 10 : 0 }}>Directory</div>
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
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Directory</div>
      </div>
      {isAdmin && <Chips />}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
