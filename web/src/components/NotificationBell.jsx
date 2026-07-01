import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchNotifications, countUnreadNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/db'

function BellIcon({ size = 19, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// In-app notification inbox — a bell with an unread badge that opens a panel of
// the recipient's notifications (filing an incident, a pending swap, etc.). Reads
// are recipient-scoped by RLS (real) / demoNotifVisible (demo).
export function NotificationBell({ user, style, onOpen }) {
  const orgId = user?.orgId
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  const loadCount = useCallback(() => {
    if (!orgId) return
    Promise.resolve(countUnreadNotifications(orgId, user)).then(n => setUnread(Number(n) || 0)).catch(() => {})
  }, [orgId, user])
  const loadList = useCallback(() => {
    if (!orgId) return
    Promise.resolve(fetchNotifications(orgId, { user })).then(rows => setItems(rows || [])).catch(() => {})
  }, [orgId, user])

  useEffect(() => {
    if (!orgId) return
    loadCount()
    const iv = setInterval(loadCount, 20000)
    return () => clearInterval(iv)
  }, [orgId, loadCount])

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  if (!orgId) return null

  const toggle = () => { const n = !open; setOpen(n); if (n) loadList() }
  const onItem = async (it) => {
    if (!it.read_at) { await markNotificationRead(it.id); setItems(p => p.map(x => x.id === it.id ? { ...x, read_at: new Date().toISOString() } : x)); loadCount() }
    if (onOpen) { onOpen(it); setOpen(false) }
  }
  const markAll = async () => { await markAllNotificationsRead(orgId); setItems(p => p.map(x => ({ ...x, read_at: x.read_at || new Date().toISOString() }))); setUnread(0) }

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button onClick={toggle} aria-label="Notifications" style={{
        width: 40, height: 40, borderRadius: 999, border: '1px solid var(--a-line)', background: 'var(--a-card)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <BellIcon color="var(--a-ink)" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999,
            background: 'var(--a-clay)', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: 'Geist',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300, maxHeight: 380, overflowY: 'auto',
          background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
          zIndex: 500,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--a-line)' }}>
            <span className="serif" style={{ fontSize: 16 }}>Notifications</span>
            {unread > 0 && <button onClick={markAll} style={{ background: 'transparent', border: 0, color: 'var(--a-sage)', fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--a-ink3)', fontSize: 12.5 }}>You're all caught up.</div>
          ) : items.map(it => (
            <button key={it.id} onClick={() => onItem(it)} style={{
              width: '100%', textAlign: 'left', display: 'flex', gap: 9, padding: '11px 14px', border: 0, borderBottom: '1px solid var(--a-line)',
              background: it.read_at ? 'transparent' : 'rgba(110,140,110,0.08)', cursor: 'pointer', fontFamily: 'Geist',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, marginTop: 5, flexShrink: 0, background: it.read_at ? 'transparent' : 'var(--a-clay)' }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{it.title}</span>
                {it.body && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--a-ink2)', marginTop: 1, lineHeight: 1.4 }}>{it.body}</span>}
                <span style={{ display: 'block', fontSize: 10, color: 'var(--a-ink3)', marginTop: 2 }}>{timeAgo(it.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
