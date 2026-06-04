import { useState, useEffect } from 'react'
import { ROLES } from '../../data/constants'
import { isDemoMode } from '../../lib/supabase'
import { fetchHouses } from '../../lib/db'
import { ScreenA_HouseDetail } from '../../screens/HouseDetail'
import { ScreenA_MyDay } from '../../screens/Employee'
import { ScreenA_Resources } from '../../screens/Resources'
import { ScreenA_Driving } from '../../screens/Driving'
import { ScreenA_HouseSetup } from '../../screens/HouseSetup'
import { TendLogo } from '../ui/TendLogo'
import { PageTodayDesktop, PageHousesDesktop, PageTeamDesktop, PageStaffDesktop, PageOrientationDesktop } from '../../screens/desktop/Pages'
import { PageScheduleDesktopExpanded } from '../../screens/desktop/Schedule'
import { IconHome, IconBox, IconCal, IconChat, IconCar, IconCart, IconPeople, IconBook, IconArrow, IconPlus } from '../icons'
import { useTripTracking } from '../../hooks/useTripTracking'

function normalizeHouse(h) {
  return {
    id:        h.slug,
    _uuid:     h.id,
    name:      h.name,
    short:     h.short || h.name.slice(0, 4).toUpperCase(),
    color:     h.color || '#888888',
    addr:      h.address || '',
    branch:    h.branch || '',
    manager:   h.managerName || '',
    residents: h.residentsCount || 0,
  }
}

const ALL_TABS = [
  { id: 'today',       label: 'Today',       icon: IconHome,    roles: ['supervisor', 'manager'] },
  { id: 'myday',       label: 'My Day',      icon: IconHome,    roles: ['staff'] },
  { id: 'houses',      label: 'Houses',      icon: IconBox,     roles: ['supervisor', 'manager'] },
  { id: 'setup',       label: 'House setup', icon: IconPlus,    roles: ['supervisor'] },
  { id: 'schedule',    label: 'Schedule',    icon: IconCal,     roles: ['supervisor', 'manager', 'staff'] },
  { id: 'team',        label: 'Team chat',   icon: IconChat,    roles: ['supervisor', 'manager', 'staff'] },
  { id: 'driving',     label: 'Transport',   icon: IconCar,     roles: ['supervisor', 'manager', 'staff'] },
  { id: 'resources',   label: 'Resources',   icon: IconCart,    roles: ['supervisor', 'manager'] },
  { id: 'staff',       label: 'Staff',       icon: IconPeople,  roles: ['supervisor'] },
  { id: 'orientation', label: 'Orientation', icon: IconBook,    roles: ['supervisor'] },
]

function DesktopPage({ tab, onHouseClick, user, houses, refreshHouses, onNavigate }) {
  if (tab === 'today')       return <PageTodayDesktop onHouseClick={onHouseClick} user={user} houses={houses} onNavigate={onNavigate} />
  if (tab === 'myday')       return <div style={{ padding: 24, maxWidth: 480 }}><ScreenA_MyDay user={user} /></div>
  if (tab === 'houses')      return <PageHousesDesktop onHouseClick={onHouseClick} user={user} houses={houses} onNavigate={onNavigate} />
  if (tab === 'setup')       return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 600, margin: '0 auto' }}><ScreenA_HouseSetup user={user} onHousesChanged={refreshHouses} /></div></div>
  if (tab === 'schedule')    return <PageScheduleDesktopExpanded user={user} houses={houses} />
  if (tab === 'team')        return <PageTeamDesktop />
  if (tab === 'driving')     return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 600, margin: '0 auto' }}><ScreenA_Driving user={user} /></div></div>
  if (tab === 'resources')   return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 600, margin: '0 auto' }}><ScreenA_Resources user={user} /></div></div>
  if (tab === 'staff')       return <PageStaffDesktop user={user} houses={houses} />
  if (tab === 'orientation') return <PageOrientationDesktop />
  return <PageTodayDesktop onHouseClick={onHouseClick} user={user} houses={houses} />
}

function DesktopRail({ tab, setTab, user, onLogout, houses }) {
  const u = ROLES.find(r => r.id === user.role) || ROLES.find(r => r.id === user.id) || ROLES[0]
  const role = user.role ?? user.id
  const railTabs = ALL_TABS.filter(t => t.roles.includes(role))

  const branches = [...new Set(houses.map(h => h.branch).filter(Boolean))]

  return (
    <div style={{ width: 240, background: 'var(--a-paper)', borderRight: '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', padding: '20px 16px', flexShrink: 0, height: '100dvh', overflow: 'auto' }}>
      <TendLogo size={16} />
      <div style={{ marginTop: 22 }}>
        {railTabs.map(({ id, icon: Ico, label, count }) => {
          const active = tab === id
          return (
            <div key={id} onClick={() => setTab(id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
              background: active ? 'var(--a-card)' : 'transparent',
              color: active ? 'var(--a-ink)' : 'var(--a-ink2)',
              border: active ? '1px solid var(--a-line)' : '1px solid transparent',
              cursor: 'pointer', marginBottom: 2,
            }}>
              <Ico size={16} sw={1.7} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, flex: 1 }}>{label}</span>
              {count != null && <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', background: 'var(--a-paper)', border: '1px solid var(--a-line)', padding: '0 6px', borderRadius: 999, fontWeight: 500 }}>{count}</span>}
            </div>
          )
        })}
      </div>
      <div style={{ flex: 1 }} />
      {branches.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8, paddingLeft: 10 }}>Branches</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
            {branches.map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 11.5, color: 'var(--a-ink2)', borderRadius: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--a-sage)' }} />
                {b} · {houses.filter(h => h.branch === b).map(h => h.short).join(' + ')}
              </div>
            ))}
          </div>
        </>
      )}
      <div onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'var(--a-card)', borderRadius: 10, border: '1px solid var(--a-line)', cursor: 'pointer' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>{u.initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>Sign out</div>
        </div>
        <IconArrow size={13} color="var(--a-ink3)" />
      </div>
    </div>
  )
}

export function DesktopShell({ user, onLogout }) {
  const defaultTab = (user.role ?? user.id) === 'staff' ? 'myday' : 'today'
  const [tab, setTab] = useState(defaultTab)
  const [houseDetail, setHouseDetail] = useState(null)
  const [houses, setHouses] = useState([])

  useEffect(() => {
    if (!user?.orgId) return
    fetchHouses(user.orgId).then(rows => setHouses(rows.map(normalizeHouse)))
  }, [user?.orgId])

  const refreshHouses = () => {
    if (!user?.orgId) return
    fetchHouses(user.orgId).then(rows => setHouses(rows.map(normalizeHouse)))
  }

  const switchTab = (t) => { setTab(t); setHouseDetail(null) }

  // Manager/staff without a house assignment get scoped to the first house.
  const effUser = (user.role && user.role !== 'supervisor' && !user.houseSlug && houses[0])
    ? { ...user, houseSlug: houses[0].id, houseId: houses[0]._uuid }
    : user

  useTripTracking(effUser)

  return (
    <div className="web-app web-desktop" style={{ display: 'flex', flexDirection: 'row', position: 'relative' }}>
      <DesktopRail tab={tab} setTab={switchTab} user={user} onLogout={onLogout} houses={houses} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--a-bg)', overflow: 'hidden' }}>
        <DesktopPage tab={tab} onHouseClick={(id) => setHouseDetail(id)} user={effUser} houses={houses} refreshHouses={refreshHouses} onNavigate={switchTab} />
      </div>
      {houseDetail && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 40, overflow: 'auto',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setHouseDetail(null) }}
        >
          <div style={{ width: 420, background: 'var(--a-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginBottom: 40 }}>
            <ScreenA_HouseDetail houseId={houseDetail} user={effUser} onBack={() => setHouseDetail(null)} houses={houses} />
          </div>
        </div>
      )}
    </div>
  )
}
