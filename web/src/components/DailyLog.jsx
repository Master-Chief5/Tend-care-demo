import { useState, useEffect, useCallback } from 'react'
import { fetchDailyLog, addDailyLog, deleteDailyLog, updateDailyLog } from '../lib/db'
import { IconPlus } from './icons'

const CATEGORIES = ['General', 'Meal', 'Activity', 'Mood', 'Sleep', 'Behavior', 'Medical', 'Outing']
const CAT_COLOR = {
  General: { bg: 'var(--a-paper)', tc: 'var(--a-ink3)' },
  Meal:    { bg: '#f5e9d6', tc: '#a47012' },
  Activity:{ bg: '#dde6f0', tc: '#3c5887' },
  Mood:    { bg: '#e7dfe9', tc: '#5a3a6b' },
  Sleep:   { bg: '#dee6ea', tc: '#3f5560' },
  Behavior:{ bg: '#fadcd7', tc: '#a93a25' },
  Medical: { bg: '#fadcd7', tc: '#a93a25' },
  Outing:  { bg: '#dee6df', tc: '#3f604d' },
}
const fmtWhen = (iso, date) => {
  const d = new Date(iso); const n = new Date(); const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  const t = isNaN(d) ? '' : `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
  return date === today ? t : `${date} · ${t}`
}

export function DailyLog({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [] }) {
  const [log, setLog] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [residentId, setResidentId] = useState('')
  const [category, setCategory] = useState('General')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  // Per-row overflow menu + inline edit state.
  const [menuId, setMenuId] = useState(null)
  const [editId, setEditId] = useState(null)
  const [eCategory, setECategory] = useState('General')
  const [eText, setEText] = useState('')
  const [eResidentId, setEResidentId] = useState('')
  const [eSaving, setESaving] = useState(false)
  const [eErr, setEErr] = useState(null)

  const reload = useCallback(() => {
    if (!user?.orgId || !houseUuid) { setLog([]); return }
    fetchDailyLog(user.orgId, houseUuid).then(setLog)
  }, [user?.orgId, houseUuid])
  useEffect(() => { reload() }, [reload])
  // Close the overflow menu when clicking anywhere else.
  useEffect(() => {
    if (!menuId) return
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuId])

  const isAdmin = user?.role === 'supervisor' || user?.role === 'manager'
  const canManage = (l) => isAdmin || (l.by && l.by === user?.name)
  const startEdit = (l) => {
    setMenuId(null); setEErr(null); setEditId(l.id)
    setECategory(l.category || 'General'); setEText(l.text || '')
    // fetch only returns the resident's name, so resolve its id for the picker.
    const match = residents.find(r => r.name === l.resident)
    setEResidentId(match ? match.id : '')
  }
  const saveEdit = async (id) => {
    if (!eText.trim() || eSaving) return
    setESaving(true); setEErr(null)
    const res = await updateDailyLog(id, { category: eCategory, text: eText.trim(), residentId: eResidentId || null })
    setESaving(false)
    if (!res) { setEErr("Couldn't save the change — nothing was updated. Try again."); return }
    setEditId(null); reload()
  }
  const removeEntry = async (id) => {
    setMenuId(null)
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    await deleteDailyLog(id); reload()
  }

  const add = async (e) => {
    e.preventDefault(); if (!text.trim() || saving) return
    setSaving(true); setErr(null)
    const saved = await addDailyLog(user.orgId, { houseId: houseUuid, residentId: residentId || null, category, text: text.trim(), by: user?.name || 'Staff' })
    setSaving(false)
    // Only clear/close on a real save — don't pretend a dropped log was recorded.
    if (!saved) { setErr("This note didn't save — nothing was recorded. Check your home assignment or connection and try again."); return }
    setText(''); setResidentId(''); setCategory('General'); setShowAdd(false); reload()
  }
  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Daily log</span>
        <button onClick={() => setShowAdd(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: houseColor, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
          <IconPlus size={13} sw={2.2} /> Add note
        </button>
      </div>

      {showAdd && (
        <form onSubmit={add} style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {residents.length > 0 && (
            <select value={residentId} onChange={e => setResidentId(e.target.value)} style={input}>
              <option value="">House-wide</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {CATEGORIES.map(cat => {
              const on = category === cat; const c = CAT_COLOR[cat]
              return <button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? c.bg : 'transparent', color: on ? c.tc : 'var(--a-ink3)', border: `1px solid ${on ? c.tc + '55' : 'var(--a-line)'}` }}>{cat}</button>
            })}
          </div>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="What happened this shift? (e.g. Ate full lunch, calm mood, joined group walk)" rows={3} style={{ ...input, resize: 'vertical' }} />
          {err && <div style={{ fontSize: 11.5, color: 'var(--a-clay)', lineHeight: 1.45 }}>{err}</div>}
          <button type="submit" disabled={!text.trim() || saving} style={{ background: houseColor, color: '#fff', border: 0, borderRadius: 10, padding: '10px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: text.trim() ? 'pointer' : 'default', opacity: text.trim() ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </form>
      )}

      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
        {log.length === 0 && <div style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>No notes yet — tap “Add note” to start the shift log.</div>}
        {log.map((l, i) => {
          const c = CAT_COLOR[l.category] || CAT_COLOR.General
          const rowBorder = i < log.length - 1 ? '1px solid var(--a-line)' : ''
          if (editId === l.id) {
            return (
              <div key={l.id} style={{ padding: 12, borderBottom: rowBorder, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--a-paper)' }}>
                {residents.length > 0 && (
                  <select value={eResidentId} onChange={e => setEResidentId(e.target.value)} style={input}>
                    <option value="">House-wide</option>
                    {residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {CATEGORIES.map(cat => {
                    const on = eCategory === cat; const cc = CAT_COLOR[cat]
                    return <button key={cat} type="button" onClick={() => setECategory(cat)} style={{ padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? cc.bg : 'transparent', color: on ? cc.tc : 'var(--a-ink3)', border: `1px solid ${on ? cc.tc + '55' : 'var(--a-line)'}` }}>{cat}</button>
                  })}
                </div>
                <textarea autoFocus value={eText} onChange={e => setEText(e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
                {eErr && <div style={{ fontSize: 11.5, color: 'var(--a-clay)', lineHeight: 1.45 }}>{eErr}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setEditId(null)} style={{ flex: '0 0 auto', background: 'transparent', color: 'var(--a-ink3)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Cancel</button>
                  <button type="button" onClick={() => saveEdit(l.id)} disabled={!eText.trim() || eSaving} style={{ flex: 1, background: houseColor, color: '#fff', border: 0, borderRadius: 10, padding: '10px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: eText.trim() ? 'pointer' : 'default', opacity: eText.trim() ? 1 : 0.5 }}>{eSaving ? 'Saving…' : 'Save changes'}</button>
                </div>
              </div>
            )
          }
          return (
            <div key={l.id} style={{ padding: '11px 14px', borderBottom: rowBorder }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: c.tc, background: c.bg, padding: '1px 6px', borderRadius: 3 }}>{l.category}</span>
                {l.resident && <span style={{ fontSize: 11.5, fontWeight: 600 }}>{l.resident}</span>}
                {canManage(l) && (
                  <div style={{ marginLeft: 'auto', position: 'relative' }}>
                    <button type="button" aria-label="Note actions" onClick={(e) => { e.stopPropagation(); setMenuId(menuId === l.id ? null : l.id) }} style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 17, lineHeight: 1, fontWeight: 700, cursor: 'pointer', padding: '0 4px', borderRadius: 6 }}>⋯</button>
                    {menuId === l.id && (
                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 20, minWidth: 130 }}>
                        <button type="button" onClick={() => startEdit(l)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, padding: '9px 14px', fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink)', cursor: 'pointer' }}>Edit</button>
                        <button type="button" onClick={() => removeEntry(l.id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 0, borderTop: '1px solid var(--a-line)', padding: '9px 14px', fontSize: 13, fontFamily: 'Geist', color: 'var(--a-clay)', cursor: 'pointer' }}>Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.4 }}>{l.text}</div>
              <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 3 }}>{l.by || 'someone'} · {fmtWhen(l.at, l.date)}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}
