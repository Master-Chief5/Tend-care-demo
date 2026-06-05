import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchHouses, fetchMessages, sendMessage } from '../lib/db'

// Live team chat backed by the `messages` table. Channels are house-scoped:
//   • "All staff" — org-wide (house_id null), everyone can read/post
//   • one channel per house — supervisors see all houses; a manager/DSP sees
//     their own house channel
// Polls every few seconds (no realtime dependency). Used by both the mobile tab
// and the desktop page; pass `desktop` for the two-pane layout.
function fmtClock(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`
}

export function TeamChat({ user, desktop = false }) {
  const [houses, setHouses] = useState([])
  const [selectedKey, setSelectedKey] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)

  const isSup = user?.role === 'supervisor'

  useEffect(() => {
    if (!user?.orgId) return
    fetchHouses(user.orgId).then(rows => setHouses(rows || []))
  }, [user?.orgId])

  // Channel list depends on role: supervisors get every house, others get their
  // own house plus the org-wide channel.
  const channels = useMemo(() => {
    const base = [{ key: 'all', label: 'All staff', houseId: null }]
    if (isSup) {
      for (const h of houses) base.push({ key: h.id, label: h.name, houseId: h.id })
    } else if (user?.houseId) {
      const h = houses.find(x => x.id === user.houseId)
      base.push({ key: user.houseId, label: h?.name || 'My house', houseId: user.houseId })
    }
    return base
  }, [houses, isSup, user?.houseId])

  // Default channel: a worker's own house if they have one, else "All staff".
  useEffect(() => {
    if (selectedKey && channels.some(c => c.key === selectedKey)) return
    const preferred = (!isSup && user?.houseId) ? user.houseId : 'all'
    setSelectedKey(channels.some(c => c.key === preferred) ? preferred : 'all')
  }, [channels, isSup, user?.houseId, selectedKey])

  const selected = channels.find(c => c.key === selectedKey) || channels[0]

  // Poll the selected channel.
  useEffect(() => {
    if (!user?.orgId || !selected) return
    let stop = false
    setLoading(true)
    const load = () => fetchMessages(user.orgId, { houseId: selected.houseId }).then(m => {
      if (!stop) { setMessages(m || []); setLoading(false) }
    })
    load()
    const iv = setInterval(load, 4000)
    return () => { stop = true; clearInterval(iv) }
  }, [user?.orgId, selected?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the thread pinned to the latest message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, selected?.key])

  const isMine = (m) => (user?.staffId && m.author_staff_id === user.staffId) ||
    (!!m.author_name && m.author_name === user?.name)

  const send = async (e) => {
    e?.preventDefault?.()
    const body = text.trim()
    if (!body || !user?.orgId || !selected) return
    setText('')
    const row = await sendMessage(user.orgId, {
      houseId: selected.houseId, body,
      authorName: user.name, authorRole: user.role, authorStaffId: user.staffId,
    })
    if (row) setMessages(prev => [...prev, row])
  }

  const ChannelChips = () => (
    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: desktop ? '0 0 4px' : '0 22px 6px' }}>
      {channels.map(c => (
        <button key={c.key} onClick={() => setSelectedKey(c.key)} style={{
          flexShrink: 0, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist',
          cursor: 'pointer', whiteSpace: 'nowrap',
          background: selected?.key === c.key ? 'var(--a-ink)' : 'var(--a-card)',
          color: selected?.key === c.key ? 'var(--a-card)' : 'var(--a-ink2)',
          border: `1px solid ${selected?.key === c.key ? 'var(--a-ink)' : 'var(--a-line)'}`,
        }}>{c.label}</button>
      ))}
    </div>
  )

  const Thread = () => (
    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: desktop ? '20px 28px' : '12px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!loading && messages.length === 0 && (
        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--a-ink3)', padding: 40 }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>💬</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No messages yet</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>Start the conversation with {selected?.label}.</div>
        </div>
      )}
      {messages.map(m => {
        const mine = isMine(m)
        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
            {!mine && <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', margin: '0 0 2px 10px', fontWeight: 600 }}>{m.author_name || 'Someone'}</div>}
            <div style={{
              maxWidth: '78%', padding: '8px 12px', borderRadius: 14,
              background: mine ? 'var(--a-sage)' : 'var(--a-card)',
              color: mine ? '#fff' : 'var(--a-ink)',
              border: mine ? '0' : '1px solid var(--a-line)',
              fontSize: 13.5, lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap',
            }}>{m.body}</div>
            <div style={{ fontSize: 9.5, color: 'var(--a-ink3)', margin: '2px 8px 0' }}>{fmtClock(m.created_at)}</div>
          </div>
        )
      })}
    </div>
  )

  const Composer = () => (
    <form onSubmit={send} style={{ padding: desktop ? '14px 24px' : '10px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--a-line)', display: 'flex', gap: 8, background: 'var(--a-bg)' }}>
      <input value={text} onChange={e => setText(e.target.value)} placeholder={`Message ${selected?.label || ''}…`}
        style={{ flex: 1, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '10px 14px', fontSize: 13.5, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
      <button type="submit" disabled={!text.trim()}
        style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '0 18px', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: text.trim() ? 'pointer' : 'default', opacity: text.trim() ? 1 : 0.5 }}>
        Send
      </button>
    </form>
  )

  if (desktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '18px 28px 10px', borderBottom: '1px solid var(--a-line)' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: 10 }}>Team chat</div>
          <ChannelChips />
        </div>
        <Thread />
        <Composer />
      </div>
    )
  }

  return (
    <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 22px 8px' }}>
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Team chat</div>
      </div>
      <ChannelChips />
      <Thread />
      <Composer />
    </div>
  )
}
