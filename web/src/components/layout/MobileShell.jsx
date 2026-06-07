import { useState, useEffect } from 'react'
import { ROLES } from '../../data/constants'
import { isDemoMode } from '../../lib/supabase'
import { fetchHouses } from '../../lib/db'
import { ScreenA_Houses } from '../../screens/Houses'
import { ScreenA_HouseDetail } from '../../screens/HouseDetail'
import { ScreenA_ScheduleDay } from '../../screens/ScheduleDay'
import { ScreenA_Chat } from '../../screens/OnboardChat'
import { ScreenA_Driving } from '../../screens/Driving'
import { ScreenA_Resources } from '../../screens/Resources'
import { ScreenA_Staff } from '../../screens/People'
import { ScreenA_MyDay, ScreenA_Me } from '../../screens/Employee'
import { ScreenA_HouseSetup } from '../../screens/HouseSetup'
import { IconHome, IconCal, IconChat, IconCar, IconPeople, IconCheck, IconCart, IconHeart } from '../icons'
import { useTripTracking } from '../../hooks/useTripTracking'
import { useDutyTracking } from '../../hooks/useDutyTracking'
import { GeoStatusBanner } from '../GeoStatusBanner'

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

function pickScreen(role, tab, user, onHouseClick, switchTab, onLogout, houses, refreshHouses, addHouseToState) {
  if (role === 'staff') {
    switch (tab) {
      case 'home':  return <ScreenA_MyDay user={user} />
      case 'house': return <ScreenA_HouseDetail houseId={user.houseSlug} user={user} onBack={() => switchTab('home')} houses={houses} />
      case 'sched': return <ScreenA_ScheduleDay user={user} employee houses={houses} />
      case 'team':  return <ScreenA_Chat user={user} />
      case 'drive': return <ScreenA_Driving user={user} />
      case 'supply': return <ScreenA_Resources user={user} />
      case 'me':    return <ScreenA_Me user={user} onLogout={onLogout} onNavigate={switchTab} />
    }
  }
  switch (tab) {
    case 'home':   return <ScreenA_Houses user={user} houses={houses} onHouseClick={onHouseClick} onTeamChat={() => switchTab('team')} onAddHouse={() => switchTab('setup')} />
    case 'setup':  return <ScreenA_HouseSetup user={user} onHouseAdded={addHouseToState} onHousesChanged={refreshHouses} />
    case 'sched':  return <ScreenA_ScheduleDay user={user} houses={houses} />
    case 'team':   return <ScreenA_Chat user={user} />
    case 'drive':  return <ScreenA_Driving user={user} />
    case 'supply': return <ScreenA_Resources user={user} />
    case 'staff':  return <ScreenA_Staff user={user} onLogout={onLogout} onNavigate={switchTab} />
    case 'me':     return <ScreenA_Me user={user} onLogout={onLogout} onNavigate={switchTab} />
  }
  return <ScreenA_Houses user={user} houses={houses} onHouseClick={onHouseClick} onTeamChat={() => switchTab('team')} onAddHouse={() => switchTab('setup')} />
}

function RoleSwitcher({ role, setRole, open, setOpen }) {
  const current = ROLES.find(r => r.id === role) || ROLES[0]
  return (
    <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 50 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(251, 246, 236, 0.92)',
        border: '1px solid var(--a-line)',
        borderRadius: 999, padding: '4px 4px 4px 10px',
        fontSize: 10.5, fontWeight: 600, color: 'var(--a-ink2)', fontFamily: 'Geist',
        backdropFilter: 'blur(8px)', cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 9, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Preview as</span>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: current.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{current.initial}</div>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 36, right: 0, background: 'var(--a-card)',
          border: '1px solid var(--a-line)', borderRadius: 12, padding: 6, minWidth: 200,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, padding: '6px 10px 4px' }}>Switch view</div>
          {ROLES.map(r => (
            <button key={r.id} onClick={() => { setRole(r.id); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              border: 0, background: r.id === role ? 'var(--a-paper)' : 'transparent',
              borderRadius: 8, width: '100%', textAlign: 'left', cursor: 'pointer',
              fontFamily: 'Geist', marginBottom: 2,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: r.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>{r.initial}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a-ink)' }}>{r.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{r.role}</div>
              </div>
              {r.id === role && <IconCheck size={14} color="var(--a-sage)" sw={2.4} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function MobileShell({ user, onLogout }) {
  const [role, setRole] = useState(user.role ?? user.id)
  const [tab, setTab] = useState('home')
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const [houseDetail, setHouseDetail] = useState(null)
  const [houses, setHouses] = useState([])

  useEffect(() => {
    if (!user?.orgId) return
    fetchHouses(user.orgId).then(rows => setHouses(rows.map(normalizeHouse)))
  }, [user?.orgId])

  const refreshHouses = () => {
    if (!user?.orgId) return
    fetchHouses(user.orgId).then(rows => {
      if (rows.length > 0) setHouses(rows.map(normalizeHouse))
    })
  }

  const addHouseToState = (rawHouse) => {
    setHouses(prev => {
      const n = normalizeHouse(rawHouse)
      if (prev.some(h => h._uuid === n._uuid || h.id === n.id)) return prev
      return [...prev, n]
    })
    refreshHouses()
  }

  const switchTab = (t) => { setTab(t); setHouseDetail(null) }
  const handleRoleChange = (newRole) => { setRole(newRole); setHouseDetail(null); setTab('home') }
  const isStaff = role === 'staff'

  const tabs = isStaff ? [
    { id: 'home',   label: 'My Day',   icon: IconHome },
    { id: 'house',  label: 'Care',     icon: IconHeart },
    { id: 'sched',  label: 'Schedule', icon: IconCal },
    { id: 'team',   label: 'Team',     icon: IconChat },
    { id: 'drive',  label: 'Transport', icon: IconCar },
    { id: 'supply', label: 'Supplies', icon: IconCart },
    { id: 'me',     label: 'Me',       icon: IconPeople },
  ] : [
    { id: 'home',   label: 'Houses',   icon: IconHome },
    { id: 'sched',  label: 'Schedule', icon: IconCal },
    { id: 'team',   label: 'Team',     icon: IconChat },
    { id: 'drive',  label: 'Transport', icon: IconCar },
    { id: 'supply', label: 'Supplies', icon: IconCart },
    { id: 'me',     label: 'Me',       icon: IconPeople },
  ]

  // Demo manager/staff personas carry no house assignment; scope them to the
  // first house so their schedule / resources / to-do aren't blank.
  const effUser = (user.role && user.role !== 'supervisor' && !user.houseSlug && houses[0])
    ? { ...user, houseSlug: houses[0].id, houseId: houses[0]._uuid }
    : user

  // App-level live trip tracking — runs regardless of which tab is open.
  useTripTracking(effUser)
  // App-level on-duty location sharing (staff only; gated by the on-duty toggle).
  useDutyTracking(effUser)

  const screen = houseDetail
    ? <ScreenA_HouseDetail houseId={houseDetail} user={effUser} onBack={() => setHouseDetail(null)} houses={houses} />
    : pickScreen(role, tab, effUser, setHouseDetail, switchTab, onLogout, houses, refreshHouses, addHouseToState)

  return (
    <div className="web-app web-mobile" style={{ display: 'flex', flexDirection: 'column', background: 'var(--a-bg)' }}>
      <GeoStatusBanner />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {screen}
        {isDemoMode && <RoleSwitcher role={role} setRole={handleRoleChange} open={showRoleSwitcher} setOpen={setShowRoleSwitcher} />}
      </div>
      <div className="web-tab-bar" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)} className={tab === t.id && !houseDetail ? 'active' : ''}>
            <t.icon size={22} sw={1.7} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
