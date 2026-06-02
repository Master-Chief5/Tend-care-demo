import { useState, useEffect } from 'react'
import { fmtDayLabel, getGreeting } from '../lib/utils'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { TabBar } from '../components/ui/TabBar'
import { TendLogo } from '../components/ui/TendLogo'
import { IconChat, IconChev, IconPlus } from '../components/icons'
import { fetchShifts, fetchTrips, fetchStaff } from '../lib/db'

function GreetingHeader({ name, isSupervisor, onAddHouse }) {
  const today = new Date()
  const firstName = name?.split(' ')[0] || 'there'
  return (
    <div style={{ padding: '10px 22px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 2 }}>{fmtDayLabel(today)}</div>
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {getGreeting()},<br /><em style={{ color: 'var(--a-sage)' }}>{firstName}</em>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
        {isSupervisor && onAddHouse && (
          <button onClick={onAddHouse} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--a-ink)', color: 'var(--a-card)',
            border: 0, borderRadius: 999, padding: '6px 12px',
            fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
          }}>
            <IconPlus size={13} sw={2.2} /> Add house
          </button>
        )}
        <TendLogo size={14} />
      </div>
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

function HouseStat({ label, big, sub }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: 'var(--a-ink3)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1, marginTop: 2 }}>{big}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function HouseCard({ house, stats, onHouseClick, onTeamChat }) {
  const [toast, showToast] = useToast()
  const c = house.color
  const staffOn    = stats?.staffOn    ?? 0
  const staffTotal = stats?.staffTotal ?? 0
  const drivesToday = stats?.drivesToday ?? 0

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
      <Toast msg={toast} />
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '12px 14px 14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
          <span className="serif" style={{ fontSize: 17, fontWeight: 500, flex: 1, letterSpacing: '-0.01em' }}>{house.name}</span>
        </div>

        {/* 3-stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 0', borderTop: '1px dashed var(--a-line)', borderBottom: '1px dashed var(--a-line)', marginBottom: 12 }}>
          <HouseStat label="Staff on" big={staffOn} sub={staffTotal > 0 ? `of ${staffTotal}` : null} />
          <HouseStat label="Residents in" big={house.residents || 0} sub={house.residents ? `of ${house.residents}` : null} />
          <HouseStat label="Drives today" big={drivesToday} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onTeamChat ? onTeamChat() : showToast('Team messaging coming soon')}
            style={{ flex: 1, padding: '9px 0', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 12, fontWeight: 500, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconChat size={13} sw={1.8} /> Message
          </button>
          <button
            onClick={() => onHouseClick ? onHouseClick(house.id) : showToast(`Opening ${house.name}…`)}
            style={{ flex: 2, padding: '9px 0', background: c, border: 0, borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            Open house <IconChev size={13} sw={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScreenA_Houses({ user, houses = [], onHouseClick, onTeamChat, onAddHouse }) {
  const [branch, setBranch] = useState('All')
  const [houseStats, setHouseStats] = useState({})
  const isManager  = user?.role === 'manager'
  const isSupervisor = user?.role === 'supervisor'

  const branches = ['All', ...new Set(houses.map(h => h.branch).filter(Boolean))]

  const scopedHouses = isManager
    ? houses.filter(h => h.id === user?.houseSlug)
    : houses
  const visibleHouses = isManager || branches.length <= 1
    ? scopedHouses
    : scopedHouses.filter(h => branch === 'All' || h.branch === branch)

  useEffect(() => {
    if (!user?.orgId || !houses.length) return
    const today = new Date()
    Promise.all([
      fetchShifts(user.orgId, null, today),
      fetchTrips(user.orgId, null, today),
      fetchStaff(user.orgId, null),
    ]).then(([shifts, trips, staff]) => {
      const stats = {}
      for (const h of houses) {
        stats[h.id] = {
          staffOn:    shifts.filter(s => s.house === h.id).length,
          staffTotal: staff.filter(s => s.house === h.id).length,
          drivesToday: trips.filter(t => (t.houses?.slug ?? t.house_id) === h.id).length,
        }
      }
      setHouseStats(stats)
    })
  }, [user?.orgId, houses.length])

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <GreetingHeader name={user?.name} isSupervisor={isSupervisor && visibleHouses.length > 0} onAddHouse={onAddHouse} />
        {!isManager && branches.length > 1 && <BranchTabs branches={branches} active={branch} setActive={setBranch} />}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 24px' }}>
          {visibleHouses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🏠</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginBottom: 8, color: 'var(--a-ink)' }}>No houses yet</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 260, margin: '0 auto 24px' }}>
                {isSupervisor
                  ? 'Add your first group home to get started.'
                  : 'Your supervisor hasn\'t added any houses yet.'}
              </div>
              {isSupervisor && onAddHouse && (
                <button onClick={onAddHouse} style={{
                  background: 'var(--a-ink)', color: 'var(--a-card)',
                  border: 0, borderRadius: 999, padding: '12px 28px',
                  fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                }}>
                  Add your first house →
                </button>
              )}
            </div>
          )}
          {visibleHouses.map(h => (
            <HouseCard key={h.id} house={h} stats={houseStats[h.id]} onHouseClick={onHouseClick} onTeamChat={onTeamChat} />
          ))}
        </div>
      </div>
      <TabBar active="houses" />
    </div>
  )
}
