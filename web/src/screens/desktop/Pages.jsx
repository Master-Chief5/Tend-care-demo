import { useState, useEffect } from 'react'
import { HOUSES, STAFF_LIST, CHAT_DATA } from '../../data/constants'
import { fetchStaff } from '../../lib/db'
import { fmtDayLabel, buildWeek } from '../../lib/utils'
import { getGreeting } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { Toast } from '../../components/ui/Toast'
import { Pill } from '../../components/ui/Pill'
import { StaffCard, RingChart } from '../People'
import { SwapRow, HouseBar, TopItem } from '../Resources'
import { VehicleRow } from '../Driving'
import { DStat, DHouseCard, DDecision, DTopBar, dCard, dBtnSolid, dBtnGhost } from './Desktop'
import {
  IconPlus, IconSearch, IconChev, IconChat, IconArrow,
  IconCar, IconFlag, IconUp, IconDown,
} from '../../components/icons'

// ── Local helpers ─────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 16px 4px' }}>
      {children}
    </div>
  )
}

function Stat({ label, big, sub }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>{big}</div>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>
    </div>
  )
}

function NeedRow({ kind, text, color }) {
  const kindMap = {
    grocery: { dot: '#a47012' }, med: { dot: '#a93a25' },
    drive: { dot: '#3c5887' }, note: { dot: 'var(--a-ink3)' }, maint: { dot: '#a47012' },
  }
  const dot = kindMap[kind]?.dot || color
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--a-ink2)', padding: '2px 0' }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, marginTop: 5, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      <div className="tnum" style={{ fontSize: 17, marginTop: 2, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function CenteredColumn({ children, width = 760, side }) {
  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
      <div style={{
        maxWidth: side ? '100%' : width,
        margin: side ? 0 : '0 auto',
        display: side ? 'grid' : 'block',
        gridTemplateColumns: side ? `minmax(0, ${width}px) minmax(280px, 1fr)` : '',
        gap: 20,
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Today ─────────────────────────────────────────────────────────────

export function PageTodayDesktop({ onHouseClick, user }) {
  const [toast, showToast] = useToast()
  const [branchFilter, setBranchFilter] = useState('All')
  const greeting = getGreeting()
  const dateLabel = fmtDayLabel(new Date())
  const firstName = user?.name?.split(' ')[0] || 'there'
  const isManager = user?.role === 'manager'

  const allHouseCards = [
    { house: HOUSES[0], urgent: 3, staff: 2, present: 3, drives: 2, needs: ['Out: oat milk, bananas', 'R. Johnson MAR 2pm', '1:30p drive to dentist'] },
    { house: HOUSES[1], urgent: 1, staff: 1, present: 3, drives: 0, needs: ['Low: paper towels, chicken', 'Devon shift note (8:14a)'] },
    { house: HOUSES[2], urgent: 4, staff: 2, present: 4, drives: 3, needs: ['Refill: K. Diaz', 'Dryer service', 'Shop run 4p'] },
    { house: HOUSES[3], urgent: 0, staff: 2, present: 4, drives: 1, needs: ['All clear · 2 incident-free wks'] },
  ]
  const visibleCards = isManager
    ? allHouseCards.filter(d => d.house.id === user.houseSlug)
    : allHouseCards.filter(d => branchFilter === 'All' || d.house.branch === branchFilter)

  return (
    <>
      <Toast msg={toast} />
      <DTopBar
        title={<>{greeting}, <em style={{ color: 'var(--a-sage)', fontStyle: 'italic' }}>{firstName}</em></>}
        sub={<>{dateLabel} · {visibleCards.length} {visibleCards.length === 1 ? 'house' : 'houses'} · {isManager ? 'manager view' : <><span style={{ color: 'var(--a-clay)', fontWeight: 600 }}>8 things need you</span></>}</>}
        actions={<button onClick={() => showToast('Opening new item…')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> New</button>}
      />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          <DStat label="Quality of care" value="92" sub="↑ 4 pts · May" tone="good" big />
          <DStat label="Weekly spend" value="$1,034" sub="↓ 6% vs Apr" tone="good" />
          <DStat label="Open shifts (7d)" value="3" sub="Wed Willow, Sat Maple ×2" tone="warn" />
          <DStat label="Onboarding" value="4" sub="2 finishing this week" />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>Houses today</div>
          {!isManager && (
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'North', 'South'].map(b => (
                <button key={b} onClick={() => setBranchFilter(b)} style={{
                  border: b === branchFilter ? '0' : '1px solid var(--a-line)',
                  background: b === branchFilter ? 'var(--a-ink)' : 'transparent',
                  color: b === branchFilter ? 'var(--a-card)' : 'var(--a-ink2)',
                  padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist', cursor: 'pointer',
                }}>{b}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
          {visibleCards.map(({ house, urgent, staff, present, drives, needs }) => (
            <DHouseCard key={house.id} house={house} urgent={urgent} staff={staff} present={present} drives={drives} needs={needs}
              onClick={() => onHouseClick && onHouseClick(house.id)} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16 }}>
          <div style={dCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--a-clay)' }} />
              <span className="serif" style={{ fontSize: 18 }}>Decisions for you</span>
              <span style={{ fontSize: 10, color: 'var(--a-ink3)', background: 'var(--a-paper)', padding: '1px 7px', borderRadius: 999, marginLeft: 'auto' }}>5 open</span>
            </div>
            <DDecision tag="Promote" tone="good" who="Aisha Mendez" why="2.1 yrs · 96 quality · 100% MAR · Lead-ready" cta="Approve" onCta={() => showToast('Approved — Aisha promoted to Lead')} />
            <DDecision tag="Coach" tone="warn" who="Marcus Lewis" why="4 lates in 2 wks · 64 quality · 6mo" cta="Open scorecard" onCta={() => showToast('Opening scorecard…')} />
            <DDecision tag="Hire" tone="info" who="3 candidates · DSP, Willow" why="Devon flagged 2 strong · open 3-11 shift Wed" cta="Review" onCta={() => showToast('Opening candidate review…')} />
            <DDecision tag="Schedule conflict" tone="warn" who="Sat 5/31" why="Maple short 2 DSPs · Priya offered to swap" cta="Approve swap" last onCta={() => showToast('Swap approved')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={dCard}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="serif" style={{ fontSize: 18 }}>Spend trend</span>
                <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>12 weeks</span>
              </div>
              <svg viewBox="0 0 240 80" style={{ width: '100%', height: 70 }}>
                <polyline points="0,46 20,40 40,44 60,32 80,38 100,30 120,34 140,26 160,30 180,22 200,28 220,20 240,24" fill="none" stroke="var(--a-sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="0,46 20,40 40,44 60,32 80,38 100,30 120,34 140,26 160,30 180,22 200,28 220,20 240,24 240,80 0,80" fill="var(--a-sage)" fillOpacity="0.08" stroke="none" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--a-ink3)' }}>
                <span>Mar 1</span><span>Today · $1,034/wk</span>
              </div>
            </div>
            <div style={dCard}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="serif" style={{ fontSize: 18 }}>Cross-house swaps</span>
                <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>2 suggested</span>
              </div>
              <SwapRow from={HOUSES[1]} to={HOUSES[0]} item="Toilet paper · 12 rolls" note="Willow surplus → Oak out" />
              <div style={{ height: 1, background: 'var(--a-line)', margin: '10px 0' }} />
              <SwapRow from={HOUSES[3]} to={HOUSES[2]} item="Laundry pods · 1 box" note="Cedar over-bought" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Houses ─────────────────────────────────────────────────────────────

function HouseCardWide({ house, urgent, staff, present, drives, needs, onOpen }) {
  const c = house.color
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '16px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
              <span className="serif" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>{house.name}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 3 }}>
              {house.addr} · {house.branch} · mgr {house.manager}
            </div>
          </div>
          {urgent > 0 ? (
            <span style={{ background: '#d44e3a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{urgent}</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 600 }}>ALL CLEAR</span>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 18px 14px', borderBottom: '1px dashed var(--a-line)' }}>
        <Stat label="On shift" big={staff} sub="of 2" />
        <Stat label="Residents in" big={present} sub={`of ${house.residents}`} />
        <Stat label="Today's drives" big={drives} sub="planned" />
      </div>
      <div style={{ padding: '12px 18px 14px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Needs attention</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {needs.map((s, i) => <NeedRow key={i} {...s} color={c} />)}
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--a-line)' }}>
        <button style={{ flex: 1, padding: '11px 0', background: 'transparent', border: 0, fontSize: 12.5, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', fontWeight: 500, cursor: 'pointer' }}>
          <IconChat size={14} sw={1.7} /> Message
        </button>
        <div style={{ width: 1, background: 'var(--a-line)' }} />
        <button onClick={onOpen} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: 0, fontSize: 12.5, fontWeight: 600, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', cursor: 'pointer' }}>
          Open house <IconArrow size={14} sw={2} />
        </button>
      </div>
    </div>
  )
}

export function PageHousesDesktop({ onHouseClick, user }) {
  const allHouseData = [
    { house: HOUSES[0], urgent: 3, staff: 2, present: 3, drives: 2, needs: [
      { kind: 'grocery', text: 'Out: oat milk, bananas, dish soap' },
      { kind: 'med', text: 'R. Johnson — 2pm MAR signoff' },
      { kind: 'drive', text: '1:30pm — M. Lee to dentist (Aisha)' },
    ]},
    { house: HOUSES[1], urgent: 1, staff: 1, present: 3, drives: 0, needs: [
      { kind: 'grocery', text: 'Running low: paper towels, chicken' },
      { kind: 'note', text: 'D. Park left a shift note (8:14am)' },
    ]},
    { house: HOUSES[2], urgent: 4, staff: 2, present: 4, drives: 3, needs: [
      { kind: 'med', text: 'Refill: K. Diaz, levetiracetam' },
      { kind: 'maint', text: 'Dryer making a noise — vendor TBD' },
      { kind: 'grocery', text: 'Shopping run scheduled — Aisha, 4pm' },
    ]},
    { house: HOUSES[3], urgent: 0, staff: 2, present: 4, drives: 1, needs: [
      { kind: 'note', text: 'All clear · 2 incident-free weeks' },
    ]},
  ]
  const isManager = user?.role === 'manager'
  const houseData = isManager
    ? allHouseData.filter(d => d.house.id === user.houseSlug)
    : allHouseData
  const subText = isManager
    ? `${houseData.length} house · manager view`
    : `${houseData.length} houses · North + South branches`
  return (
    <>
      <DTopBar title="Houses" sub={subText}
        actions={!isManager && <button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Add house</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          {houseData.map(({ house, urgent, staff, present, drives, needs }) => (
            <HouseCardWide key={house.id} house={house} urgent={urgent} staff={staff} present={present} drives={drives} needs={needs}
              onOpen={() => onHouseClick && onHouseClick(house.id)} />
          ))}
        </div>
      </div>
    </>
  )
}

// ── Team chat ─────────────────────────────────────────────────────────

function ChannelRow({ ch, active, onClick }) {
  const h = HOUSES.find(x => x.id === ch.key)
  const color = h ? h.color : '#6e4d8f'
  const short = h ? h.short : ch.name?.split(' ').map(n => n[0]).join('')
  const last = ch.messages[ch.messages.length - 1]
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', background: active ? 'var(--a-paper)' : 'transparent' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{short}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{ch.name}</span>
          {last && <span style={{ fontSize: 10, color: 'var(--a-ink3)' }}>{last.time}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
          {last ? `${last.from}: ${last.text}` : 'No messages'}
        </div>
      </div>
    </div>
  )
}

function Msg({ who, color, time, text, me }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexDirection: me ? 'row-reverse' : 'row' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{who[0]}</div>
      <div style={{ maxWidth: '70%' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexDirection: me ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{who}</span>
          <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{time}</span>
        </div>
        <div style={{ background: me ? 'var(--a-ink)' : 'var(--a-card)', color: me ? 'var(--a-card)' : 'var(--a-ink)', padding: '10px 14px', borderRadius: 12, border: me ? '0' : '1px solid var(--a-line)', fontSize: 13.5, lineHeight: 1.45 }}>{text}</div>
      </div>
    </div>
  )
}

export function PageTeamDesktop() {
  const [selectedKey, setSelectedKey] = useState('oak')
  const channelKeys = ['oak', 'willow', 'maple', 'cedar', 'carmen', 'marcus']
  const channels = channelKeys.map(k => ({ key: k, ...CHAT_DATA[k] }))
  const dmKeys = ['carmen', 'marcus']
  const ch = CHAT_DATA[selectedKey]
  const h = HOUSES.find(x => x.id === selectedKey)
  const chColor = h ? h.color : (ch.color || '#6e4d8f')

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: 300, borderRight: '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', background: 'var(--a-card)', flexShrink: 0 }}>
        <div style={{ padding: '18px 18px 10px' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>Team chat</div>
          <div style={{ background: 'var(--a-paper)', borderRadius: 999, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--a-line)', marginTop: 10 }}>
            <IconSearch size={13} color="var(--a-ink3)" />
            <input placeholder="Search messages" style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 12.5, fontFamily: 'Geist', color: 'var(--a-ink2)' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
          <SectionLabel>House channels</SectionLabel>
          {channels.filter(c => !dmKeys.includes(c.key)).map(c => (
            <ChannelRow key={c.key} ch={c} active={selectedKey === c.key} onClick={() => setSelectedKey(c.key)} />
          ))}
          <SectionLabel>Direct messages</SectionLabel>
          {channels.filter(c => dmKeys.includes(c.key)).map(c => (
            <ChannelRow key={c.key} ch={c} active={selectedKey === c.key} onClick={() => setSelectedKey(c.key)} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--a-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: chColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>{ch.short}</div>
          <div>
            <div className="serif" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>{ch.name}</div>
            <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{ch.members}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 14px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--a-line)' }} />
            <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Today</span>
            <div style={{ flex: 1, height: 1, background: 'var(--a-line)' }} />
          </div>
          {ch.messages.map((m, i) => (
            <Msg key={i} who={m.from} color={m.from === 'You' ? 'var(--a-clay)' : chColor} time={m.time} text={m.text} me={m.from === 'You'} />
          ))}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--a-line)' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input placeholder={`Message ${ch.name}…`} style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 13.5, fontFamily: 'Geist', color: 'var(--a-ink)' }} />
            <button style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Driving ───────────────────────────────────────────────────────────

export function PageDrivingDesktop() {
  const [toast, showToast] = useToast()
  return (
    <>
      <Toast msg={toast} />
      <DTopBar title="Driving" sub="Logs · mileage · vehicles"
        actions={<button onClick={() => showToast('Opening trip form…')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Start trip</button>} />
      <CenteredColumn width={780} side>
        <div>
          <div style={{ background: 'var(--a-ink)', color: '#fbf6ec', borderRadius: 16, padding: '20px 22px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: '#7dd28a', boxShadow: '0 0 0 4px rgba(125,210,138,0.2)' }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', color: '#7dd28a', textTransform: 'uppercase' }}>Trip in progress</span>
            </div>
            <div className="serif" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>M. Lee to Dr. Patel's office</div>
            <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>Driver: Aisha M. · Van #2 · Oak House</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(251,246,236,0.12)' }}>
              <Mini label="Time" value="0:18" />
              <Mini label="Distance" value="4.2 mi" />
              <Mini label="Purpose" value="Medical" />
              <Mini label="ETA" value="0:09" />
            </div>
          </div>

          <div style={{ ...dCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="serif" style={{ fontSize: 18 }}>Recent trips</span>
              <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>Last 7 days · 34 trips</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 90px 80px', padding: '6px 18px', borderTop: '1px solid var(--a-line)', borderBottom: '1px solid var(--a-line)', background: 'var(--a-paper)', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              <span>When</span><span>Trip</span><span>Driver</span><span>Purpose</span><span style={{ textAlign: 'right' }}>Miles</span>
            </div>
            {[
              ['Today · 9:14a', 'willow', 'Willow → Walmart', 'Devon P.', 'Grocery', '3.8'],
              ['Today · 8:02a', 'maple', 'Maple → Day program', 'Saira K.', 'Program', '6.1'],
              ['Mon · 4:40p', 'oak', 'Oak → Dr. Patel', 'Aisha M.', 'Medical', '4.2'],
              ['Mon · 11:20a', 'oak', 'Oak → Library', 'Jay B.', 'Activity', '1.6'],
              ['Sun · 2:30p', 'cedar', 'Cedar → Park', 'Tomas R.', 'Activity', '5.4'],
              ['Sun · 9:15a', 'maple', 'Maple → Church', 'Reni T.', 'Faith', '2.2'],
            ].map((row, i) => {
              const h = HOUSES.find(x => x.id === row[1])
              return (
                <div key={i} onClick={() => showToast('Opening trip details…')} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 90px 80px', padding: '10px 18px', borderBottom: '1px solid var(--a-line)', fontSize: 12.5, alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ color: 'var(--a-ink3)', fontSize: 11.5 }}>{row[0]}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 3, height: 16, background: h.color, borderRadius: 2 }} />
                    {row[2]}
                  </span>
                  <span style={{ color: 'var(--a-ink2)' }}>{row[3]}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{row[4]}</span>
                  <span className="tnum" style={{ textAlign: 'right', fontWeight: 500 }}>{row[5]}<span style={{ color: 'var(--a-ink3)', fontWeight: 400, fontSize: 10 }}> mi</span></span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={dCard}>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>This pay period</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span className="serif tnum" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em' }}>248.4</span>
              <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>mi · $<span className="tnum" style={{ fontWeight: 600, color: 'var(--a-ink)' }}>166.43</span></span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--a-ink3)' }}>
              <span>34 trips</span><span>·</span><span>6 days remaining</span>
            </div>
            <svg viewBox="0 0 200 40" style={{ width: '100%', height: 40, marginTop: 10 }}>
              <polyline points="0,30 20,28 40,22 60,24 80,18 100,20 120,15 140,17 160,12 180,9 200,11" fill="none" stroke="var(--a-sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,30 20,28 40,22 60,24 80,18 100,20 120,15 140,17 160,12 180,9 200,11 200,40 0,40" fill="var(--a-sage)" fillOpacity="0.08" stroke="none" />
            </svg>
          </div>
          <div style={dCard}>
            <span className="serif" style={{ fontSize: 18 }}>Vehicles</span>
            <div style={{ marginTop: 8 }}>
              <VehicleRow name="Van #1 · Sienna '22" sub="Oak / Willow · 38,402 mi" status="ok" onClick={() => showToast('Van #1 — available')} />
              <VehicleRow name="Van #2 · Sienna '21" sub="Aisha out · 51,108 mi" status="active" onClick={() => showToast('Van #2 — in use by Aisha')} />
              <VehicleRow name="Van #3 · Odyssey '23" sub="Oil due 4/8" status="due" last onClick={() => showToast('Van #3 — service overdue')} />
            </div>
          </div>
        </div>
      </CenteredColumn>
    </>
  )
}

// ── Resources ─────────────────────────────────────────────────────────

export function PageResourcesDesktop() {
  const [dismissed, setDismissed] = useState(false)
  const [toast, showToast] = useToast()
  return (
    <>
      <Toast msg={toast} />
      <DTopBar title="Resources" sub="Spend insights · grocery · cross-house"
        actions={<button onClick={() => showToast('Generating list…')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Generate list</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          <DStat label="Weekly avg" value="$1,034" sub="↓ 6% vs Apr" tone="good" />
          <DStat label="Per resident" value="$64" sub="↓ $4 vs Apr" tone="good" />
          <DStat label="Highest house" value="Maple" sub="$1,250 · ↑ 8%" tone="warn" />
          <DStat label="Lowest house" value="Willow" sub="$840 · steady" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={dCard}>
            <span className="serif" style={{ fontSize: 20 }}>Spend by house · May</span>
            <div style={{ marginTop: 14 }}>
              <HouseBar house={HOUSES[0]} value="$1,180" pct={0.94} />
              <HouseBar house={HOUSES[1]} value="$840"   pct={0.66} />
              <HouseBar house={HOUSES[2]} value="$1,250" pct={1}    />
              <HouseBar house={HOUSES[3]} value="$910"   pct={0.72} last />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--a-ink3)', marginTop: 8 }}>
              <span>0</span><span>$1,250</span>
            </div>
          </div>
          {!dismissed ? (
            <div style={{ background: '#f5e9d6', border: '1px solid #e7d289', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <IconFlag size={14} color="#a47012" sw={2} />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#a47012', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Worth a look</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--a-ink2)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--a-ink)' }}>Maple Run</strong> spent <strong>34% more</strong> on snacks this month vs. last 3 months. Mostly chips and soda.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => showToast('Message sent to Saira K.')} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist', cursor: 'pointer' }}>Send to Saira</button>
                <button onClick={() => setDismissed(true)} style={{ background: 'transparent', color: 'var(--a-ink2)', border: 0, padding: '6px 12px', fontSize: 11.5, fontFamily: 'Geist', cursor: 'pointer' }}>Dismiss</button>
              </div>
            </div>
          ) : (
            <div style={{ ...dCard, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--a-ink3)', fontSize: 13 }}>
              Coach card dismissed
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={dCard}>
            <span className="serif" style={{ fontSize: 20 }}>What you buy most</span>
            <div style={{ marginTop: 8 }}>
              <TopItem rank={1} name="Milk (gallon)"  qty="84 ct"     trend="steady" />
              <TopItem rank={2} name="Bread"          qty="62 loaves" trend="up" />
              <TopItem rank={3} name="Eggs (dozen)"   qty="48 ct"     trend="steady" />
              <TopItem rank={4} name="Chicken breast" qty="44 lb"     trend="up" />
              <TopItem rank={5} name="Paper towels"   qty="38 pk"     trend="down" last />
            </div>
          </div>
          <div style={dCard}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="serif" style={{ fontSize: 20 }}>Cross-house swaps</span>
              <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>save a shop run</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <SwapRow from={HOUSES[1]} to={HOUSES[0]} item="Toilet paper · 12 rolls" note="Willow surplus → Oak out" />
              <div style={{ height: 1, background: 'var(--a-line)', margin: '12px 0' }} />
              <SwapRow from={HOUSES[3]} to={HOUSES[2]} item="Laundry pods · 1 box" note="Cedar overbought last week" />
              <div style={{ height: 1, background: 'var(--a-line)', margin: '12px 0' }} />
              <SwapRow from={HOUSES[0]} to={HOUSES[3]} item="Coffee · 1 bag" note="Oak overbought · Cedar low" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Staff ─────────────────────────────────────────────────────────────

export function PageStaffDesktop({ user }) {
  const [query, setQuery] = useState('')
  const [houseFilter, setHouseFilter] = useState('All')
  const [staffList, setStaffList] = useState(STAFF_LIST)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [toast, showToast] = useToast()

  useEffect(() => {
    if (!user?.orgId) return
    fetchStaff(user.orgId, null).then(data => {
      if (data.length > 0) setStaffList(data)
    })
  }, [user?.orgId])

  const filtered = staffList.filter(s => {
    const matchHouse = houseFilter === 'All' || s.house === houseFilter.toLowerCase()
    const matchQuery = s.name.toLowerCase().includes(query.toLowerCase()) || s.role.toLowerCase().includes(query.toLowerCase())
    return matchHouse && matchQuery
  })

  return (
    <>
      <Toast msg={toast} />
      <DTopBar title="Staff" sub="22 staff · 4 in onboarding"
        actions={<button onClick={() => showToast('Opening hiring flow…')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Hire</button>}
        search={false} />
      <CenteredColumn width={820} side>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, background: 'var(--a-paper)', borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--a-line)' }}>
              <IconSearch size={13} color="var(--a-ink3)" />
              <input placeholder="Search staff…" value={query} onChange={e => setQuery(e.target.value)}
                style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 12.5, fontFamily: 'Geist', color: 'var(--a-ink)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['All', 'Oak', 'Willow', 'Maple', 'Cedar'].map(b => (
              <button key={b} onClick={() => setHouseFilter(b)} style={{
                border: b === houseFilter ? '0' : '1px solid var(--a-line)',
                background: b === houseFilter ? 'var(--a-ink)' : 'transparent',
                color: b === houseFilter ? 'var(--a-card)' : 'var(--a-ink2)',
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontFamily: 'Geist', fontWeight: 500, cursor: 'pointer',
              }}>{b}</button>
            ))}
          </div>
          {filtered.map((s, i) => <StaffCard key={i} {...s} onClick={() => setSelectedStaff(s)} />)}
          {filtered.length === 0 && <div style={{ color: 'var(--a-ink3)', fontSize: 13, paddingTop: 12 }}>No staff match your search.</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedStaff ? (
            <div style={dCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <button onClick={() => setSelectedStaff(null)} style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', padding: 0 }}>
                  <IconChev size={16} sw={2} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <span className="serif" style={{ fontSize: 18 }}>{selectedStaff.name}</span>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: HOUSES.find(h => h.id === selectedStaff.house)?.color ?? '#888', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, margin: '0 auto 8px' }}>{selectedStaff.name.split(' ').map(n => n[0]).join('')}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedStaff.role}</div>
                <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{HOUSES.find(h => h.id === selectedStaff.house)?.name ?? 'All houses'} · {selectedStaff.tenure}</div>
              </div>
              <div style={{ height: 6, background: 'var(--a-paper)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ width: `${selectedStaff.score}%`, height: '100%', background: selectedStaff.score >= 90 ? '#3f7050' : selectedStaff.score >= 80 ? '#a47012' : '#a93a25', borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 12 }}>Quality score: <strong style={{ color: selectedStaff.score >= 90 ? '#3f7050' : '#a47012' }}>{selectedStaff.score}</strong></div>
              <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.5 }}>{selectedStaff.notes}</div>
            </div>
          ) : (
            <div style={dCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="serif" style={{ fontSize: 18 }}>Quality of care</span>
                <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>↑ 4 pts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <RingChart pct={0.92} color="var(--a-sage)" size={60} />
                <div>
                  <div className="serif tnum" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>92</div>
                  <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2 }}>out of 100 · May</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                <Pill color="var(--a-sage)">MAR · 100%</Pill>
                <Pill color="var(--a-sage)">Notes · 96%</Pill>
                <Pill color="var(--a-clay)">Late · 8%</Pill>
                <Pill color="var(--a-sage)">Family ★ 4.7</Pill>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 12 }}>Click a staff card to view their profile.</div>
            </div>
          )}
          <div style={dCard}>
            <span className="serif" style={{ fontSize: 18 }}>Decisions for you</span>
            <div style={{ marginTop: 8 }}>
              <DDecision tag="Promote" tone="good" who="Aisha Mendez" why="Lead-ready" cta="Open" onCta={() => showToast('Opening review…')} />
              <DDecision tag="Coach" tone="warn" who="Marcus Lewis" why="4 lates in 2 wks" cta="Open" last onCta={() => showToast('Opening scorecard…')} />
            </div>
          </div>
        </div>
      </CenteredColumn>
    </>
  )
}

// ── Orientation ───────────────────────────────────────────────────────

function NewHireCard({ name, house, mentor, day, pct, next }) {
  const h = HOUSES.find(x => x.id === house)
  const initials = name.split(' ').map(n => n[0]).join('')
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: h.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{h.name} · mentor {mentor}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="serif tnum" style={{ fontSize: 18, fontWeight: 500, color: 'var(--a-sage)', lineHeight: 1 }}>{Math.round(pct * 100)}%</div>
          <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Day {day}/30</div>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--a-paper)', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--a-sage)' }} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--a-ink2)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--a-clay)', background: '#fadcd7', padding: '2px 6px', borderRadius: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Next</span>
        {next}
      </div>
    </div>
  )
}

function RootWeek({ num, title, items }) {
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--a-paper)', color: 'var(--a-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '1.5px solid var(--a-line)' }}>{num}</div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>Week {num}</div>
          <div className="serif" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>{title}</div>
        </div>
      </div>
      <ul style={{ paddingLeft: 16, margin: '10px 0 0', listStyle: 'none' }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 12, color: 'var(--a-ink2)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--a-ink3)' }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PageOrientationDesktop() {
  return (
    <>
      <DTopBar title="Orientation" sub="4 new hires in their first 30 days"
        actions={<button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Add hire</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <NewHireCard name="Carmen Vela"   house="oak"    mentor="Lina R."   day={6}  pct={0.20} next="Read: Resident profiles" />
          <NewHireCard name="Theo Walker"   house="willow" mentor="Devon P."  day={12} pct={0.42} next="Shadow shift #2" />
          <NewHireCard name="Iris Halloway" house="maple"  mentor="Saira K."  day={3}  pct={0.10} next="House walkthrough" />
          <NewHireCard name="Mateo Ruiz"    house="cedar"  mentor="Tomas R."  day={22} pct={0.78} next="Solo shift signoff" />
        </div>
        <div style={{ marginTop: 24 }}>
          <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>The Roots plan</span>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 4, marginBottom: 14 }}>30 days, four weeks, mentor-led. Self-paced w/ Friday check-ins.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <RootWeek num={1} title="Find your footing" items={['Welcome video', 'Meet your mentor', 'House walkthrough', 'Resident profiles', 'Shadow shift #1']} />
            <RootWeek num={2} title="On the floor" items={['Daily routines', 'Documentation basics', 'Family intros', 'Shadow shift #2', 'Activity planning', 'Mid-week check-in']} />
            <RootWeek num={3} title="Medications & docs" items={['MAR training', 'Med pass observed', 'Incident reporting', 'Quality basics', 'Mock audit']} />
            <RootWeek num={4} title="Solo + sign-off" items={['Solo shift #1', 'Solo shift #2', 'Mentor sign-off', '30-day review']} />
          </div>
        </div>
      </div>
    </>
  )
}
