import { useState } from 'react'
import { HOUSES } from '../data/constants'
import { buildWeek, fmtDayLabel, getGreeting } from '../lib/utils'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { Pill } from '../components/ui/Pill'
import { TabBar } from '../components/ui/TabBar'
import { TendLogo } from '../components/ui/TendLogo'
import { IconPlus, IconChat, IconDots, IconChev } from '../components/icons'

const allHouseData = [
  { idx: 0, urgent: 3, staffOn: 2, residentsIn: 3, drives: 2, needs: [
    { kind: 'grocery', text: 'Out: oat milk, bananas, dish soap' },
    { kind: 'med',     text: 'R. Johnson — 2pm meds need second signoff' },
    { kind: 'drive',   text: '1:30pm — M. Lee to dentist (Aisha)' },
  ]},
  { idx: 1, urgent: 1, staffOn: 1, residentsIn: 3, drives: 0, needs: [
    { kind: 'grocery', text: 'Low: paper towels, chicken breast' },
    { kind: 'note',    text: 'Devon shift note (8:14a) — unread' },
  ]},
  { idx: 2, urgent: 4, staffOn: 2, residentsIn: 4, drives: 3, needs: [
    { kind: 'med',   text: 'Refill due: K. Diaz — Metformin' },
    { kind: 'maint', text: 'Dryer service — scheduled 4pm' },
    { kind: 'drive', text: 'Shop run 4pm — Saira' },
  ]},
  { idx: 3, urgent: 0, staffOn: 2, residentsIn: 4, drives: 1, needs: [
    { kind: 'note', text: 'All clear · 2 incident-free weeks' },
  ]},
]

function GreetingHeader({ name }) {
  const today = new Date()
  const firstName = name?.split(' ')[0] || 'there'
  return (
    <div style={{ padding: '10px 22px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 2 }}>{fmtDayLabel(today)}</div>
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {getGreeting()},<br /><em style={{ color: 'var(--a-sage)' }}>{firstName}</em>
        </div>
      </div>
      <TendLogo size={14} />
    </div>
  )
}

function BranchTabs({ active, setActive }) {
  return (
    <div style={{ padding: '0 22px 12px', display: 'flex', gap: 6 }}>
      {['All', 'North', 'South'].map(b => (
        <button key={b} onClick={() => setActive(b)} style={{
          border: active === b ? 0 : '1px solid var(--a-line)',
          background: active === b ? 'var(--a-ink)' : 'transparent',
          color: active === b ? 'var(--a-card)' : 'var(--a-ink2)',
          padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
          fontFamily: 'Geist', cursor: 'pointer',
        }}>{b}</button>
      ))}
    </div>
  )
}

function NeedRow({ kind, text, color }) {
  const kindMap = {
    grocery: { label: 'Shop',    bg: '#f5e9d6', tc: '#a47012' },
    med:     { label: 'Med',     bg: '#fadcd7', tc: '#a93a25' },
    drive:   { label: 'Drive',   bg: '#dde6f0', tc: '#3c5887' },
    maint:   { label: 'Maint',   bg: '#e7dfe9', tc: '#5a3a6b' },
    note:    { label: 'Note',    bg: 'var(--a-paper)', tc: 'var(--a-ink3)' },
  }
  const k = kindMap[kind] || { label: kind, bg: 'var(--a-paper)', tc: 'var(--a-ink3)' }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px dashed var(--a-line)' }}>
      <span style={{ fontSize: 9.5, fontWeight: 600, color: k.tc, background: k.bg, padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 1 }}>{k.label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--a-ink2)', lineHeight: 1.4 }}>{text}</span>
    </div>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function HouseCard({ data, house, onHouseClick, onTeamChat }) {
  const [toast, showToast] = useToast()
  const c = house.color
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
      <Toast msg={toast} />
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
          <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{house.name}</span>
          {data.urgent > 0 ? (
            <span style={{ background: '#d44e3a', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{data.urgent}</span>
          ) : (
            <Pill color="var(--a-sage)">All clear</Pill>
          )}
          <button onClick={() => showToast(`${house.name} options`)} style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: 'var(--a-ink3)' }}>
            <IconDots size={16} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <Stat label="Staff on" value={data.staffOn} sub={`of 2`} />
          <Stat label="Residents in" value={data.residentsIn} sub={`of ${house.residents}`} />
          <Stat label="Drives today" value={data.drives} />
        </div>
        <div style={{ borderTop: '1px dashed var(--a-line)', paddingTop: 8 }}>
          {data.needs.slice(0, 2).map((n, i) => <NeedRow key={i} {...n} color={c} />)}
          {data.needs.length > 2 && <div style={{ fontSize: 11, color: 'var(--a-ink3)', paddingTop: 4 }}>+{data.needs.length - 2} more</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => onTeamChat ? onTeamChat() : showToast(`Opening ${house.name} chat…`)} style={{ flex: 1, padding: '8px 0', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 12, fontWeight: 500, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconChat size={13} sw={1.8} /> Message
          </button>
          <button onClick={() => onHouseClick ? onHouseClick(house.id) : showToast(`Opening ${house.name}…`)} style={{ flex: 1, padding: '8px 0', background: c, border: 0, borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconChev size={13} sw={2} /> Open house
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScreenA_Houses({ user, onHouseClick, onTeamChat }) {
  const [branch, setBranch] = useState('All')
  const isManager = user?.role === 'manager'

  // Managers see only their own house; supervisors see all (filterable by branch).
  const scopedData = isManager
    ? allHouseData.filter(d => HOUSES[d.idx].id === user.houseSlug)
    : allHouseData
  const visibleData = isManager
    ? scopedData
    : scopedData.filter(d => branch === 'All' || HOUSES[d.idx].branch === branch)

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <GreetingHeader name={user?.name} />
        {!isManager && <BranchTabs active={branch} setActive={setBranch} />}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 24px' }}>
          {visibleData.map(d => (
            <HouseCard key={d.idx} data={d} house={HOUSES[d.idx]} onHouseClick={onHouseClick} onTeamChat={onTeamChat} />
          ))}
        </div>
      </div>
      <TabBar active="houses" />
    </div>
  )
}
