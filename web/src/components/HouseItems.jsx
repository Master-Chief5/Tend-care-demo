import { useState, useEffect, useCallback } from 'react'
import { fetchItems, addItem, completeItem, reopenItem, deleteItem } from '../lib/db'
import { IconPlus, IconCheck } from './icons'
import { COMMON_SUPPLIES, COMMON_TASKS } from '../data/suggestions'
import { SuggestInput } from './SuggestInput'

// Shared, house-scoped to-do log. Supervisors and workers see the same list.
// Supervisors log items for the team; workers can flag things back to the
// supervisor (e.g. restock). Each item shows who made it and who completed it.
const KIND = {
  task:   { label: 'Task',   bg: '#e7dfe9', tc: '#5a3a6b' },
  supply: { label: 'Supply', bg: '#f5e9d6', tc: '#a47012' },
  note:   { label: 'Note',   bg: 'var(--a-paper)', tc: 'var(--a-ink3)' },
}
const roleLabel = (r) => r === 'supervisor' ? 'supervisor' : r === 'manager' ? 'manager' : 'worker'

export function HouseItems({ user, houseUuid, houseColor = 'var(--a-ink)' }) {
  const isSup = user?.role === 'supervisor' || user?.role === 'manager'
  const [items, setItems] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [text, setText] = useState('')
  const [kind, setKind] = useState('task')
  // Default direction: a supervisor logs FOR the team; a worker flags FOR the supervisor.
  const [forRole, setForRole] = useState(isSup ? 'staff' : 'supervisor')
  const [saving, setSaving] = useState(false)

  const reload = useCallback(() => {
    if (!user?.orgId || !houseUuid) { setItems([]); return }
    fetchItems(user.orgId, { houseId: houseUuid }).then(setItems)
  }, [user?.orgId, houseUuid])
  useEffect(() => { reload() }, [reload])

  const add = async (e) => {
    e.preventDefault()
    if (!text.trim() || saving) return
    setSaving(true)
    await addItem(user.orgId, {
      houseId: houseUuid, text: text.trim(), kind, forRole,
      createdByName: user?.name, createdByRole: user?.role,
    })
    setSaving(false); setText(''); setShowAdd(false); reload()
  }
  const toggle = async (it) => {
    if (it.status === 'done') await reopenItem(it.id)
    else await completeItem(it.id, user?.name || 'Someone')
    reload()
  }
  const remove = async (it) => { await deleteItem(it.id); reload() }

  const open = items.filter(i => i.status === 'open')
  const done = items.filter(i => i.status === 'done').slice(0, 4)

  const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 8px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Shared to-do</span>
        <button onClick={() => setShowAdd(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: houseColor, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
          <IconPlus size={13} sw={2.2} /> Log item
        </button>
      </div>

      {showAdd && (
        <form onSubmit={add} style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SuggestInput autoFocus options={kind === 'supply' ? COMMON_SUPPLIES : kind === 'task' ? COMMON_TASKS : []} value={text} onChange={setText} placeholder={kind === 'supply' ? 'Supply needed (e.g. Paper towels)' : 'What needs doing? (e.g. Restock paper towels)'} style={inputStyle} />
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(KIND).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setKind(k)} style={{ padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: kind === k ? v.bg : 'transparent', color: kind === k ? v.tc : 'var(--a-ink3)', border: `1px solid ${kind === k ? v.tc + '55' : 'var(--a-line)'}` }}>{v.label}</button>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginBottom: 4 }}>Who needs to do this?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ id: 'staff', label: 'The team' }, { id: 'supervisor', label: 'Supervisor' }].map(o => (
                <button key={o.id} type="button" onClick={() => setForRole(o.id)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: forRole === o.id ? 'var(--a-ink)' : 'transparent', color: forRole === o.id ? 'var(--a-card)' : 'var(--a-ink2)', border: forRole === o.id ? 0 : '1px solid var(--a-line)' }}>{o.label}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={!text.trim() || saving} style={{ background: houseColor, color: '#fff', border: 0, borderRadius: 10, padding: '10px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: text.trim() ? 'pointer' : 'default', opacity: text.trim() ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Log item'}
          </button>
        </form>
      )}

      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
        {open.length === 0 && done.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Nothing logged yet</div>
        )}
        {open.map((it, i) => {
          const k = KIND[it.kind] || KIND.task
          const forSup = it.for_role === 'supervisor'
          return (
            <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderBottom: (i < open.length - 1 || done.length) ? '1px solid var(--a-line)' : '' }}>
              <button onClick={() => toggle(it)} aria-label="Complete" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: '2px solid var(--a-line)', background: 'transparent', cursor: 'pointer', padding: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: k.tc, background: k.bg, padding: '1px 6px', borderRadius: 3 }}>{k.label}</span>
                  {forSup && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8a6d1e', background: '#f5e9d6', padding: '1px 6px', borderRadius: 3 }}>For supervisor</span>}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.35 }}>{it.text}</div>
                <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 2 }}>by {it.created_by_name || 'someone'} · {roleLabel(it.created_by_role)}</div>
              </div>
              <button onClick={() => remove(it)} aria-label="Delete" style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
            </div>
          )
        })}
        {done.map((it, i) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', borderBottom: i < done.length - 1 ? '1px solid var(--a-line)' : '', opacity: 0.6 }}>
            <button onClick={() => toggle(it)} aria-label="Reopen" style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: '2px solid var(--a-sage)', background: 'var(--a-sage)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={12} sw={2.5} color="#fff" />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.35, textDecoration: 'line-through' }}>{it.text}</div>
              <div style={{ fontSize: 10.5, color: 'var(--a-sage)', fontWeight: 600, marginTop: 2 }}>✓ done by {it.done_by_name || 'someone'}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
