import { useState } from 'react'
import { HOUSES } from '../data/constants'
import { fmtDayLabel, getGreeting } from '../lib/utils'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { TabBar } from '../components/ui/TabBar'
import { TendLogo } from '../components/ui/TendLogo'
import { IconChat, IconChev } from '../components/icons'

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

function BranchTabs({ branches, active, setActive }) {
  return (
    <div style={{ padding: '0 22px 12px', display: 'flex', gap: 6 }}>
      {branches.map(b => (
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

function HouseCard({ house, onHouseClick, onTeamChat }) {
  const [toast, showToast] = useToast()
  const c = house.color
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
      <Toast msg={toast} />
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
          <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{house.name}</span>
        </div>
        {house.addr && (
          <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginBottom: 2 }}>
            {house.addr}{house.branch ? ` · ${house.branch}` : ''}
          </div>
        )}
        {house.manager && (
          <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginBottom: 6 }}>Manager: {house.manager}</div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            onClick={() => onTeamChat ? onTeamChat() : showToast('Team messaging coming soon')}
            style={{ flex: 1, padding: '8px 0', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 12, fontWeight: 500, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconChat size={13} sw={1.8} /> Message
          </button>
          <button
            onClick={() => onHouseClick ? onHouseClick(house.id) : showToast(`Opening ${house.name}…`)}
            style={{ flex: 1, padding: '8px 0', background: c, border: 0, borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconChev size={13} sw={2} /> Open house
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScreenA_Houses({ user, houses = HOUSES, onHouseClick, onTeamChat }) {
  const [branch, setBranch] = useState('All')
  const isManager = user?.role === 'manager'

  const branches = ['All', ...new Set(houses.map(h => h.branch).filter(Boolean))]

  const scopedHouses = isManager
    ? houses.filter(h => h.id === user?.houseSlug)
    : houses
  const visibleHouses = isManager || branches.length <= 1
    ? scopedHouses
    : scopedHouses.filter(h => branch === 'All' || h.branch === branch)

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <GreetingHeader name={user?.name} />
        {!isManager && branches.length > 1 && <BranchTabs branches={branches} active={branch} setActive={setBranch} />}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 24px' }}>
          {visibleHouses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No houses yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Go to House Setup to create your first house.</div>
            </div>
          )}
          {visibleHouses.map(h => (
            <HouseCard key={h.id} house={h} onHouseClick={onHouseClick} onTeamChat={onTeamChat} />
          ))}
        </div>
      </div>
      <TabBar active="houses" />
    </div>
  )
}
