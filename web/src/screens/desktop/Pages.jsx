import { useState, useEffect } from 'react'
import { HOUSES, CHAT_DATA } from '../../data/constants'
import { fetchStaff, fetchTrips, fetchVehicles } from '../../lib/db'
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

export function PageTodayDesktop({ onHouseClick, user, houses = [] }) {
  const [toast, showToast] = useToast()
  const [branchFilter, setBranchFilter] = useState('All')
  const greeting = getGreeting()
  const dateLabel = fmtDayLabel(new Date())
  const firstName = user?.name?.split(' ')[0] || 'there'
  const isManager = user?.role === 'manager'

  const branches = ['All', ...new Set(houses.map(h => h.branch).filter(Boolean))]
  const scopedHouses = isManager ? houses.filter(h => h.id === user?.houseSlug) : houses
  const visibleCards = scopedHouses
    .filter(h => isManager || branchFilter === 'All' || h.branch === branchFilter)
    .map(house => ({ house, urgent: 0, staff: 0, present: 0, drives: 0, needs: [] }))

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
          {!isManager && branches.length > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {branches.map(b => (
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
            {houses.length >= 4 && (
              <div style={dCard}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="serif" style={{ fontSize: 18 }}>Cross-house swaps</span>
                  <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>2 suggested</span>
                </div>
                <SwapRow from={HOUSES[1]} to={HOUSES[0]} item="Toilet paper · 12 rolls" note="Willow surplus → Oak out" />
                <div style={{ height: 1, background: 'var(--a-line)', margin: '10px 0' }} />
                <SwapRow from={HOUSES[3]} to={HOUSES[2]} item="Laundry pods · 1 box" note="Cedar over-bought" />
              </div>
            )}
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

export function PageHousesDesktop({ onHouseClick, user, houses = [] }) {
  const isManager = user?.role === 'manager'
  const houseData = isManager
    ? houses.filter(h => h.id === user?.houseSlug).map(house => ({ house, urgent: 0, staff: 0, present: 0, drives: 0, needs: [] }))
    : houses.map(house => ({ house, urgent: 0, staff: 0, present: 0, drives: 0, needs: [] }))
  const subText = isManager
    ? `${houseData.length} house · manager view`
    : `${houseData.length} house${houseData.length === 1 ? '' : 's'}`
  return (
    <>
      <DTopBar title="Houses" sub={subText}
        actions={!isManager && <button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Add house</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        {houseData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--a-ink3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No houses yet</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>Go to House Setup to create your first house.</div>
          </div>
        )}
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
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>💬</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--a-ink)' }}>Team Chat</div>
      <div style={{ fontSize: 14, color: 'var(--a-ink3)', lineHeight: 1.6, maxWidth: 340 }}>
        End-to-end encrypted messaging is coming soon. Messages will be live and never stored on any server.
      </div>
      <div style={{ fontSize: 12, color: 'var(--a-ink3)', background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '5px 16px', marginTop: 8 }}>
        Coming soon
      </div>
    </div>
  )
}

function PageTeamDesktop_OLD() {
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

export function PageDrivingDesktop({ user }) {
  const [toast, showToast] = useToast()
  const [trips, setTrips] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.orgId) return
    const scopedHouseId = user.role === 'manager' ? user.houseId : null
    setLoading(true)
    Promise.all([
      fetchTrips(user.orgId, scopedHouseId, null),
      fetchVehicles(user.orgId, scopedHouseId),
    ]).then(([tripsData, vehiclesData]) => {
      setTrips(tripsData)
      setVehicles(vehiclesData)
      setLoading(false)
    })
  }, [user?.orgId, user?.houseId, user?.role])

  const totalMiles = trips.reduce((sum, t) => sum + (Number(t.miles) || 0), 0)
  const tripCount = trips.length

  const fmtDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    const diff = Math.floor((today - d) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <Toast msg={toast} />
      <DTopBar title="Driving" sub="Logs · mileage · vehicles"
        actions={<button onClick={() => showToast('Opening trip form…')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Start trip</button>} />
      <CenteredColumn width={780} side>
        <div>
          <div style={{ ...dCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="serif" style={{ fontSize: 18 }}>Recent trips</span>
              <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{tripCount} {tripCount === 1 ? 'trip' : 'trips'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 90px 80px', padding: '6px 18px', borderTop: '1px solid var(--a-line)', borderBottom: '1px solid var(--a-line)', background: 'var(--a-paper)', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              <span>When</span><span>Trip</span><span>Driver</span><span>Purpose</span><span style={{ textAlign: 'right' }}>Miles</span>
            </div>
            {loading && <div style={{ padding: '24px 18px', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>}
            {!loading && trips.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🚐</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No trips yet</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>Start a trip to record a resident transport.</div>
              </div>
            )}
            {!loading && trips.map((t) => {
              const color = t.houses?.color || 'var(--a-ink3)'
              const route = `${t.houses?.name ? t.houses.name + ' → ' : ''}${t.destination}`
              return (
                <div key={t.id} onClick={() => showToast('Opening trip details…')} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 90px 80px', padding: '10px 18px', borderBottom: '1px solid var(--a-line)', fontSize: 12.5, alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ color: 'var(--a-ink3)', fontSize: 11.5 }}>{fmtDate(t.trip_date)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />
                    {route}
                  </span>
                  <span style={{ color: 'var(--a-ink2)' }}>{t.driver_name}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t.purpose}</span>
                  <span className="tnum" style={{ textAlign: 'right', fontWeight: 500 }}>{t.miles}<span style={{ color: 'var(--a-ink3)', fontWeight: 400, fontSize: 10 }}> mi</span></span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={dCard}>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Logged miles</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span className="serif tnum" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em' }}>{totalMiles.toFixed(1)}</span>
              <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>mi</span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--a-ink3)' }}>
              <span>{tripCount} {tripCount === 1 ? 'trip' : 'trips'}</span>
            </div>
            <svg viewBox="0 0 200 40" style={{ width: '100%', height: 40, marginTop: 10 }}>
              <polyline points="0,30 20,28 40,22 60,24 80,18 100,20 120,15 140,17 160,12 180,9 200,11" fill="none" stroke="var(--a-sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,30 20,28 40,22 60,24 80,18 100,20 120,15 140,17 160,12 180,9 200,11 200,40 0,40" fill="var(--a-sage)" fillOpacity="0.08" stroke="none" />
            </svg>
          </div>
          <div style={dCard}>
            <span className="serif" style={{ fontSize: 18 }}>Vehicles</span>
            <div style={{ marginTop: 8 }}>
              {!loading && vehicles.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--a-ink3)', padding: '12px 0' }}>No vehicles yet.</div>
              )}
              {vehicles.map((v, i) => {
                const status = (Number(v.mileage) || 0) > 50000 ? 'due' : 'ok'
                const sub = [
                  v.mileage != null ? `${Number(v.mileage).toLocaleString()} mi` : null,
                  v.plate || null,
                ].filter(Boolean).join(' · ')
                return (
                  <VehicleRow key={v.id} name={v.name} sub={sub} status={status}
                    last={i === vehicles.length - 1}
                    onClick={() => showToast(`${v.name} — ${status === 'due' ? 'service due' : 'available'}`)} />
                )
              })}
            </div>
          </div>
        </div>
      </CenteredColumn>
    </>
  )
}

// ── Resources ─────────────────────────────────────────────────────────

export function PageResourcesDesktop() {
  const [toast, showToast] = useToast()
  return (
    <>
      <Toast msg={toast} />
      <DTopBar title="Resources" sub="Spend insights · grocery · cross-house"
        actions={<button onClick={() => showToast('Generating list…')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Generate list</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--a-ink3)', maxWidth: 320 }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>📦</div>
          <div className="serif" style={{ fontSize: 22, color: 'var(--a-ink)', marginBottom: 8 }}>No supply data yet</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            Add supplies through the mobile app to see spending insights and cross-house swap suggestions here.
          </div>
        </div>
      </div>
    </>
  )
}

// ── Staff ─────────────────────────────────────────────────────────────

export function PageStaffDesktop({ user, houses = [] }) {
  const [query, setQuery] = useState('')
  const [houseFilter, setHouseFilter] = useState('All')
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [toast, showToast] = useToast()

  useEffect(() => {
    if (!user?.orgId) return
    const houseId = user.role === 'manager' ? user.houseId : null
    setLoading(true)
    fetchStaff(user.orgId, houseId).then(data => {
      setStaffList(data)
      setLoading(false)
    })
  }, [user?.orgId, user?.houseId, user?.role])

  const houseFilterTabs = ['All', ...houses.map(h => h.name)]

  const filtered = staffList.filter(s => {
    const matchHouse = houseFilter === 'All' || s.houseName === houseFilter || s.house === houseFilter.toLowerCase()
    const matchQuery = s.name.toLowerCase().includes(query.toLowerCase()) || s.role.toLowerCase().includes(query.toLowerCase())
    return matchHouse && matchQuery
  })

  return (
    <>
      <Toast msg={toast} />
      <DTopBar title="Staff" sub={`${staffList.length} staff member${staffList.length === 1 ? '' : 's'}`}
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {houseFilterTabs.map(b => (
              <button key={b} onClick={() => setHouseFilter(b)} style={{
                border: b === houseFilter ? '0' : '1px solid var(--a-line)',
                background: b === houseFilter ? 'var(--a-ink)' : 'transparent',
                color: b === houseFilter ? 'var(--a-card)' : 'var(--a-ink2)',
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontFamily: 'Geist', fontWeight: 500, cursor: 'pointer',
              }}>{b}</button>
            ))}
          </div>
          {loading && <div style={{ color: 'var(--a-ink3)', fontSize: 13, paddingTop: 12 }}>Loading…</div>}
          {!loading && staffList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No staff yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Hire your first team member to get started.</div>
            </div>
          )}
          {!loading && staffList.length > 0 && filtered.map((s) => <StaffCard key={s.id} {...s} onClick={() => setSelectedStaff(s)} />)}
          {!loading && staffList.length > 0 && filtered.length === 0 && <div style={{ color: 'var(--a-ink3)', fontSize: 13, paddingTop: 12 }}>No staff match your search.</div>}
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
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: selectedStaff.houseColor ?? '#888', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, margin: '0 auto 8px' }}>{selectedStaff.name.split(' ').map(n => n[0]).join('')}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedStaff.role}</div>
                <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{selectedStaff.houseName ?? 'All houses'} · {selectedStaff.tenure}</div>
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
  const h = HOUSES.find(x => x.id === house) || { color: '#888888', name: house }
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
