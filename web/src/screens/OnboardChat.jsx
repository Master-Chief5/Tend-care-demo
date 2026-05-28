import { useState, useRef, useEffect } from 'react'
import { CHAT_DATA } from '../data/constants'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { TabBar } from '../components/ui/TabBar'
import { IconChev, IconCheck, IconPlus } from '../components/icons'

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '16px 0 8px' }}>
      {children}
    </div>
  )
}

export function ChatRow({ channel, onClick }) {
  const last = channel.messages[channel.messages.length - 1]
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px dashed var(--a-line)', cursor: 'pointer' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: channel.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{channel.short}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{channel.name}</span>
          <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{last?.time}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {last ? `${last.from}: ${last.text}` : 'No messages yet'}
        </div>
      </div>
    </div>
  )
}

function ChatThread({ channel, onBack }) {
  const [messages, setMessages] = useState(channel.messages)
  const [msg, setMsg] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = () => {
    if (!msg.trim()) return
    setMessages(prev => [...prev, { from: 'You', time: 'Now', text: msg.trim() }])
    setMsg('')
  }

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 22px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--a-line)', flexShrink: 0 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: 'var(--a-ink2)' }}>
            <IconChev size={20} sw={2} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: channel.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>{channel.short}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{channel.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{channel.members}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {messages.map((m, i) => {
            const isYou = m.from === 'You'
            return (
              <div key={i} style={{ display: 'flex', flexDirection: isYou ? 'row-reverse' : 'row', gap: 8, marginBottom: 10 }}>
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ fontSize: 10, color: 'var(--a-ink3)', marginBottom: 3, textAlign: isYou ? 'right' : 'left' }}>
                    {m.from} · {m.time}
                  </div>
                  <div style={{
                    padding: '8px 12px', borderRadius: isYou ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isYou ? 'var(--a-ink)' : 'var(--a-card)',
                    color: isYou ? 'var(--a-card)' : 'var(--a-ink)',
                    border: isYou ? 'none' : '1px solid var(--a-line)',
                    fontSize: 13.5, lineHeight: 1.4,
                  }}>{m.text}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--a-line)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input
            value={msg} onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Type a message…"
            style={{ flex: 1, padding: '9px 14px', borderRadius: 999, border: '1px solid var(--a-line)', background: 'var(--a-card)', fontFamily: 'Geist', fontSize: 13, outline: 'none', color: 'var(--a-ink)' }}
          />
          <button onClick={send} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '0 16px', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScreenA_Chat() {
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [toast, showToast] = useToast()
  const channels = Object.values(CHAT_DATA)

  if (selectedChannel) return <ChatThread channel={selectedChannel} onBack={() => setSelectedChannel(null)} />

  return (
    <div className="phone-screen">
      <Toast msg={toast} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Team</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>Messages · Channels</div>
          </div>
          <button onClick={() => showToast('Feature coming soon')} style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconPlus size={13} sw={2.2} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          <SectionLabel>House channels</SectionLabel>
          {channels.slice(0, 4).map(ch => <ChatRow key={ch.name} channel={ch} onClick={() => setSelectedChannel(ch)} />)}
          <SectionLabel>Direct messages</SectionLabel>
          {channels.slice(4).map(ch => <ChatRow key={ch.name} channel={ch} onClick={() => setSelectedChannel(ch)} />)}
        </div>
      </div>
      <TabBar active="team" />
    </div>
  )
}

// ── Orientation / onboarding screen ──────────────────────────────────

function Step({ n, title, done, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px dashed var(--a-line)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: done ? 'var(--a-sage)' : 'var(--a-paper)', border: done ? 'none' : '1.5px solid var(--a-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {done ? <IconCheck size={12} sw={2.5} color="#fff" /> : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--a-ink3)' }}>{n}</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: done ? 400 : 500, color: done ? 'var(--a-ink3)' : 'var(--a-ink)', textDecoration: done ? 'line-through' : 'none' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

function WeekSection({ num, title, pct, open, onToggle, children }) {
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--a-ink3)', background: 'var(--a-paper)', border: '1px solid var(--a-line)', padding: '2px 8px', borderRadius: 4 }}>WK {num}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{title}</span>
        <span className="tnum" style={{ fontSize: 11, color: pct === 100 ? 'var(--a-sage)' : 'var(--a-ink3)', fontWeight: 500 }}>{pct}%</span>
        <IconChev size={16} sw={2} color="var(--a-ink3)" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </div>
      {open && <div style={{ padding: '0 14px 10px', borderTop: '1px solid var(--a-line)' }}>{children}</div>}
    </div>
  )
}

export function ScreenA_Orientation() {
  const [openWeek, setOpenWeek] = useState(1)

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Onboarding</div>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>4 staff in orientation</div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          <WeekSection num={1} title="Orientation basics" pct={100} open={openWeek === 1} onToggle={() => setOpenWeek(openWeek === 1 ? null : 1)}>
            <Step n={1} title="Complete HR paperwork" done />
            <Step n={2} title="Review care philosophy & mission" done />
            <Step n={3} title="Meet your house team" done />
            <Step n={4} title="Tour Oak House" done />
          </WeekSection>
          <WeekSection num={2} title="Care procedures" pct={80} open={openWeek === 2} onToggle={() => setOpenWeek(openWeek === 2 ? null : 2)}>
            <Step n={1} title="MAR training — medication administration" done />
            <Step n={2} title="PRN protocol & 2-signature rule" done />
            <Step n={3} title="Incident reporting procedure" done />
            <Step n={4} title="Shift handoff & documentation" sub="Due by end of week" />
          </WeekSection>
          <WeekSection num={3} title="Practical skills" pct={0} open={openWeek === 3} onToggle={() => setOpenWeek(openWeek === 3 ? null : 3)}>
            <Step n={1} title="Shadow experienced DSP for one full shift" />
            <Step n={2} title="Complete first solo morning routine" />
            <Step n={3} title="Log first MAR independently" />
          </WeekSection>
        </div>
      </div>
      <TabBar active="team" />
    </div>
  )
}
