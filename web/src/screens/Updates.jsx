import { useState, useEffect, useCallback, useRef } from 'react'
import {
  createAnnouncement, fetchAnnouncements,
  markAnnouncementRead, voteAnnouncementPoll, deleteAnnouncement,
} from '../lib/db'

// "Updates / Announcements" screen — a calm, plain compose + feed (no AI).
// Role-aware:
//   • admins (supervisor/manager): Feed · Post
//   • staff: Feed only
// Announcements have a colored header band, optional poll, optional read receipts,
// and an audience scope. Provides both the mobile (.phone-screen) and desktop
// (flex column) layouts in one component, switching on `desktop` (mirrors Timesheets).

function fmtDate(dateLike) {
  if (!dateLike) return ''
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return String(dateLike)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Background palette for the header band. Colored bands use white text; below the
// band the body sits on a normal card.
const BG = {
  plain: { background: 'var(--a-card)', color: 'var(--a-ink)' },
  sage:  { background: 'var(--a-sage)', color: '#fff' },
  clay:  { background: 'var(--a-clay)', color: '#fff' },
  blue:  { background: '#3c5887', color: '#fff' },
  amber: { background: '#b9892f', color: '#fff' },
}
const BG_KEYS = ['plain', 'sage', 'clay', 'blue', 'amber']

const ROLE_LABEL = { supervisor: 'Supervisors', manager: 'Managers', staff: 'DSPs' }
const AUDIENCE_OPTIONS = [
  { label: 'Supervisors', value: 'supervisor' },
  { label: 'Managers', value: 'manager' },
  { label: 'DSPs', value: 'staff' },
]

const card = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }
const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }

function EmptyState({ emoji, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
      {emoji && <div style={{ fontSize: 30, marginBottom: 10 }}>{emoji}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

// ── A single announcement card ───────────────────────────────────────────────
function AnnouncementCard({ row, staffId, staffName, isAdmin, onChange, onDelete }) {
  const bg = BG[row?.bg] || BG.plain
  const onColor = bg.color === '#fff'
  const options = Array.isArray(row?.poll_options) ? row.poll_options.filter(o => o != null && String(o).trim() !== '') : []
  const hasPoll = options.length > 0
  const counts = Array.isArray(row?._pollCounts) && row._pollCounts.length === options.length
    ? row._pollCounts
    : options.map(() => 0)
  const totalVotes = counts.reduce((s, c) => s + (Number(c) || 0), 0)
  const myVote = row?._myVote == null ? null : Number(row._myVote)
  const voted = myVote != null

  const audRoles = Array.isArray(row?.audience_roles) ? row.audience_roles : []
  const scopeTag = row?.house_id ? 'House' : 'All staff'

  const vote = (choice) => {
    if (voted) return
    onChange({ ...row, _myVote: choice, _pollCounts: counts.map((c, i) => (Number(c) || 0) + (i === choice ? 1 : 0)) })
    Promise.resolve(voteAnnouncementPoll(row.orgId || undefined, { announcementId: row.id, staffId, choice })).catch(() => {})
  }

  const markRead = () => {
    onChange({ ...row, _read: true, _readCount: (Number(row?._readCount) || 0) + 1 })
    Promise.resolve(markAnnouncementRead(row.orgId || undefined, { announcementId: row.id, staffId, staffName })).catch(() => {})
  }

  const remove = () => {
    if (!window.confirm('Delete this update? This cannot be undone.')) return
    onDelete(row.id)
    Promise.resolve(deleteAnnouncement(row.id)).catch(() => {})
  }

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      {/* Header band */}
      <div style={{ ...bg, padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: row?.title ? 5 : 0 }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
                background: onColor ? 'rgba(255,255,255,0.22)' : 'var(--a-paper)',
                color: onColor ? '#fff' : 'var(--a-ink2)',
              }}>{scopeTag.toUpperCase()}</span>
              {audRoles.map(r => (
                <span key={r} style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 999,
                  background: onColor ? 'rgba(255,255,255,0.22)' : 'var(--a-paper)',
                  color: onColor ? '#fff' : 'var(--a-ink2)',
                }}>{(ROLE_LABEL[r] || r).toUpperCase()}</span>
              ))}
            </div>
            {row?.title && (
              <div className="serif" style={{ fontSize: 18, lineHeight: 1.2, color: bg.color }}>{row.title}</div>
            )}
          </div>
          {isAdmin && (
            <button onClick={remove} aria-label="Delete update" style={{
              flexShrink: 0, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1,
              padding: '2px 4px', color: onColor ? 'rgba(255,255,255,0.85)' : 'var(--a-ink3)',
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Body + meta */}
      <div style={{ padding: '13px 16px' }}>
        {row?.body && (
          <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {row.body}
          </div>
        )}

        {/* Poll */}
        {hasPoll && (
          <div style={{ marginTop: row?.body ? 12 : 0 }}>
            {row?.poll_question && (
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a-ink)', marginBottom: 6 }}>{row.poll_question}</div>
            )}
            {options.map((opt, i) => {
              const c = Number(counts[i]) || 0
              const pct = totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0
              const mine = myVote === i
              if (!voted) {
                return (
                  <button key={i} onClick={() => vote(i)} style={{
                    display: 'block', width: '100%', textAlign: 'left', marginBottom: 6,
                    background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 10,
                    padding: '9px 12px', fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink)', cursor: 'pointer',
                  }}>{opt}</button>
                )
              }
              return (
                <div key={i} style={{
                  position: 'relative', overflow: 'hidden', marginBottom: 6,
                  background: 'var(--a-paper)', border: `1px solid ${mine ? 'var(--a-sage)' : 'var(--a-line)'}`,
                  borderRadius: 10, padding: '9px 12px',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, width: `${pct}%`,
                    background: mine ? 'rgba(110,140,110,0.22)' : 'rgba(0,0,0,0.05)',
                  }} />
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--a-ink)', fontWeight: mine ? 700 : 500 }}>
                      {mine && '✓ '}{opt}
                    </span>
                    <span style={{ color: 'var(--a-ink3)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  </div>
                </div>
              )
            })}
            <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2 }}>
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </div>
          </div>
        )}

        {/* Read receipt CTA */}
        {row?.require_read && !row?._read && (
          <button onClick={markRead} style={{
            display: 'block', width: '100%', marginTop: 12,
            background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999,
            padding: '11px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>Mark as read</button>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
          <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row?.author_name || 'Staff'}{row?.author_role ? ` · ${row.author_role}` : ''} · {fmtDate(row?.created_at)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {row?.require_read && row?._read && <span style={{ color: 'var(--a-sage)', fontWeight: 600 }}>Read ✓</span>}
            <span>👁 {Number(row?._readCount) || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Feed (everyone) ──────────────────────────────────────────────────────────
function Feed({ orgId, houseId, staffId, staffName, role, isAdmin, rows, setRows, loading }) {
  // Auto-mark non-require_read unread cards read once each.
  const autoMarked = useRef(new Set())
  useEffect(() => {
    for (const r of (rows || [])) {
      if (!r || !r.id) continue
      if (r.require_read) continue
      if (r._read) continue
      if (autoMarked.current.has(r.id)) continue
      autoMarked.current.add(r.id)
      Promise.resolve(markAnnouncementRead(orgId, { announcementId: r.id, staffId, staffName })).catch(() => {})
      setRows(prev => (prev || []).map(x => x && x.id === r.id ? { ...x, _read: true, _readCount: (Number(x._readCount) || 0) + 1 } : x))
    }
  }, [rows, orgId, staffId, staffName, setRows])

  const updateRow = useCallback((next) => {
    setRows(prev => (prev || []).map(x => x && x.id === next.id ? next : x))
  }, [setRows])

  const removeRow = useCallback((id) => {
    setRows(prev => (prev || []).filter(x => x && x.id !== id))
  }, [setRows])

  const list = (rows || []).filter(Boolean)

  return (
    <>
      {loading && list.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>
      )}
      {!loading && list.length === 0 && (
        <EmptyState emoji="📣" title="No updates yet."
          sub={isAdmin ? 'No updates yet — post the first one.' : undefined} />
      )}
      {list.map(r => (
        <AnnouncementCard key={r.id} row={{ ...r, orgId }} staffId={staffId} staffName={staffName}
          isAdmin={isAdmin} onChange={updateRow} onDelete={removeRow} />
      ))}
    </>
  )
}

// ── Post (admins only) ────────────────────────────────────────────────────────
function Compose({ orgId, houseId, staffId, staffName, role, onPosted }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [bg, setBg] = useState('plain')
  const [audience, setAudience] = useState('all') // 'all' | 'house'
  const [audienceRoles, setAudienceRoles] = useState([])
  const [pollOn, setPollOn] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [requireRead, setRequireRead] = useState(false)
  const [saving, setSaving] = useState(false)

  const toggleRole = (val) => setAudienceRoles(prev =>
    prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val])

  const setOption = (i, v) => setPollOptions(prev => prev.map((o, idx) => idx === i ? v : o))
  const addOption = () => setPollOptions(prev => prev.length >= 4 ? prev : [...prev, ''])
  const removeOption = (i) => setPollOptions(prev => prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i))

  const cleanOptions = pollOptions.map(o => o.trim()).filter(Boolean)
  const pollValid = pollOn && pollQuestion.trim() && cleanOptions.length >= 2
  const canPost = body.trim() && !saving

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canPost || !orgId) return
    setSaving(true)
    const payload = {
      houseId: audience === 'house' ? houseId : null,
      authorStaffId: staffId,
      authorName: staffName,
      authorRole: role,
      title: title.trim(),
      body: body.trim(),
      bg,
      audienceRoles,
      pollQuestion: pollValid ? pollQuestion.trim() : null,
      pollOptions: pollValid ? cleanOptions : null,
      requireRead,
    }
    let row = null
    try { row = await Promise.resolve(createAnnouncement(orgId, payload)).catch(() => null) } catch { row = null }
    setSaving(false)
    onPosted(row)
  }

  const swatch = (key) => {
    const sel = bg === key
    return (
      <button key={key} type="button" onClick={() => setBg(key)} aria-label={key} title={key} style={{
        width: 34, height: 34, borderRadius: 999, cursor: 'pointer', flexShrink: 0,
        ...BG[key],
        border: key === 'plain' ? `1px solid var(--a-line)` : 0,
        boxShadow: sel ? '0 0 0 2px var(--a-bg), 0 0 0 4px var(--a-ink)' : 'none',
      }} />
    )
  }

  const segBtn = (val, label, disabled) => {
    const active = audience === val
    return (
      <button type="button" disabled={disabled} onClick={() => !disabled && setAudience(val)} style={{
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
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Write an update for the team…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

        {/* Background swatches */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>BACKGROUND</div>
          <div style={{ display: 'flex', gap: 9 }}>{BG_KEYS.map(swatch)}</div>
        </div>

        {/* Audience scope */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.04em', marginBottom: 7 }}>WHO SEES THIS</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
            {segBtn('all', 'All staff', false)}
            {segBtn('house', 'My house', !houseId)}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 9 }}>
            {AUDIENCE_OPTIONS.map(o => {
              const on = audienceRoles.includes(o.value)
              return (
                <button key={o.value} type="button" onClick={() => toggleRole(o.value)} style={{
                  padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                  background: on ? 'var(--a-ink)' : 'var(--a-card)',
                  color: on ? 'var(--a-card)' : 'var(--a-ink2)',
                  border: `1px solid ${on ? 'var(--a-ink)' : 'var(--a-line)'}`,
                }}>{o.label}</button>
              )
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 6 }}>
            {audienceRoles.length === 0 ? 'Everyone in scope can see this.' : 'Only selected roles will see this.'}
          </div>
        </div>

        {/* Poll */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-ink)', cursor: 'pointer' }}>
            <input type="checkbox" checked={pollOn} onChange={e => setPollOn(e.target.checked)} />
            Add a poll
          </label>
          {pollOn && (
            <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Poll question"
                style={inputStyle} />
              {pollOptions.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={opt} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                    style={inputStyle} />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} aria-label="Remove option" style={{
                      flexShrink: 0, width: 30, height: 30, borderRadius: 999, border: '1px solid var(--a-line)',
                      background: 'var(--a-card)', color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, fontFamily: 'Geist',
                    }}>−</button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <button type="button" onClick={addOption} style={{
                  alignSelf: 'flex-start', padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
                  cursor: 'pointer', background: 'var(--a-card)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)',
                }}>+ Add option</button>
              )}
            </div>
          )}
        </div>

        {/* Require read */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--a-ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={requireRead} onChange={e => setRequireRead(e.target.checked)} />
          Require read confirmation
        </label>

        <button type="submit" disabled={!canPost} style={{
          background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '12px',
          fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canPost ? 'pointer' : 'default', opacity: canPost ? 1 : 0.5,
        }}>{saving ? 'Posting…' : 'Post update'}</button>
      </div>
    </form>
  )
}

export function ScreenA_Updates({ user, desktop = false }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null
  const role = user?.role
  const isAdmin = role === 'supervisor' || role === 'manager'

  const tabs = isAdmin ? ['Feed', 'Post'] : ['Feed']
  const [tab, setTab] = useState('Feed')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!orgId) { setLoading(false); return Promise.resolve() }
    setLoading(true)
    return Promise.resolve(fetchAnnouncements(orgId, { houseId, staffId, role }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseId, staffId, role])

  useEffect(() => { load() }, [load])

  // Keep tab valid if role changes.
  useEffect(() => { if (!tabs.includes(tab)) setTab('Feed') }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPosted = (row) => {
    setTab('Feed')
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
    if (isAdmin && tab === 'Post') {
      return <Compose orgId={orgId} houseId={houseId} staffId={staffId} staffName={staffName} role={role} onPosted={onPosted} />
    }
    return (
      <Feed orgId={orgId} houseId={houseId} staffId={staffId} staffName={staffName} role={role}
        isAdmin={isAdmin} rows={rows} setRows={setRows} loading={loading} />
    )
  }

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: isAdmin ? 10 : 0 }}>Updates</div>
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
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Updates</div>
      </div>
      {isAdmin && <Chips />}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        <Body />
      </div>
    </div>
  )
}
