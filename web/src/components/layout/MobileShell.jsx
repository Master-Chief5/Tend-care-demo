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
import { ScreenA_Timesheets } from '../../screens/Timesheets'
import { ScreenA_Activity } from '../../screens/Activity'
import { ScreenA_Updates } from '../../screens/Updates'
import { ScreenA_Knowledge } from '../../screens/Knowledge'
import { ScreenA_Events } from '../../screens/Events'
import { ScreenA_Forms } from '../../screens/Forms'
import { ScreenA_Surveys } from '../../screens/Surveys'
import { ScreenA_Courses } from '../../screens/Courses'
import { ScreenA_Tasks } from '../../screens/Tasks'
import { ScreenA_Directory } from '../../screens/Directory'
import { ScreenA_HelpDesk } from '../../screens/HelpDesk'
import { ScreenA_Home } from '../../screens/Home'
import { ScreenA_CareHub } from '../../screens/CareHub'
import { ResidentProfile } from '../../screens/ResidentProfile'
import { PageOrientationDesktop, PageComplianceDesktop } from '../../screens/desktop/Pages'
import { IconHome, IconCal, IconChat, IconCar, IconPeople, IconCheck, IconCart, IconHeart, IconClock, IconActivity, IconMegaphone, IconBook, IconStar, IconDots, IconChev, IconClipboard, IconChart, IconPhone, IconHelp, IconAward } from '../icons'
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

function pickScreen(role, tab, user, onHouseClick, switchTab, onLogout, houses, refreshHouses, addHouseToState, onOpenResident) {
  if (role === 'staff') {
    switch (tab) {
      case 'home':  return <ScreenA_MyDay user={user} />
      case 'care':  return <ScreenA_CareHub user={user} houses={houses} onOpenResident={onOpenResident} />
      case 'house': return <ScreenA_HouseDetail houseId={user.houseSlug} user={user} onBack={() => switchTab('home')} houses={houses} />
      case 'sched': return <ScreenA_ScheduleDay user={user} employee houses={houses} />
      case 'time':  return <ScreenA_Timesheets user={user} houses={houses} />
      case 'updates': return <ScreenA_Updates user={user} />
      case 'team':  return <ScreenA_Chat user={user} />
      case 'drive': return <ScreenA_Driving user={user} />
      case 'supply': return <ScreenA_Resources user={user} />
      case 'handbook': return <ScreenA_Knowledge user={user} />
      case 'events': return <ScreenA_Events user={user} />
      case 'forms': return <ScreenA_Forms user={user} />
      case 'surveys': return <ScreenA_Surveys user={user} />
      case 'courses': return <ScreenA_Courses user={user} />
      case 'tasks': return <ScreenA_Tasks user={user} />
      case 'directory': return <ScreenA_Directory user={user} />
      case 'helpdesk': return <ScreenA_HelpDesk user={user} />
      case 'more':  return <MoreMenu onNavigate={switchTab} role={role} />
      case 'me':    return <ScreenA_Me user={user} onLogout={onLogout} onNavigate={switchTab} />
    }
  }
  switch (tab) {
    case 'home':   return <ScreenA_Home user={user} houses={houses} onNavigate={switchTab} onHouseClick={onHouseClick} />
    case 'care':   return <ScreenA_CareHub user={user} houses={houses} onOpenResident={onOpenResident} />
    case 'houses': return <ScreenA_Houses user={user} houses={houses} onHouseClick={onHouseClick} onTeamChat={() => switchTab('team')} onAddHouse={() => switchTab('setup')} />
    case 'setup':  return <ScreenA_HouseSetup user={user} onHouseAdded={addHouseToState} onHousesChanged={refreshHouses} />
    case 'sched':  return <ScreenA_ScheduleDay user={user} houses={houses} />
    case 'time':   return <ScreenA_Timesheets user={user} houses={houses} />
    case 'updates': return <ScreenA_Updates user={user} />
    case 'activity': return <ScreenA_Activity user={user} />
    case 'team':   return <ScreenA_Chat user={user} />
    case 'drive':  return <ScreenA_Driving user={user} />
    case 'supply': return <ScreenA_Resources user={user} />
    case 'handbook': return <ScreenA_Knowledge user={user} />
    case 'events': return <ScreenA_Events user={user} />
    case 'forms': return <ScreenA_Forms user={user} />
    case 'surveys': return <ScreenA_Surveys user={user} />
    case 'courses': return <ScreenA_Courses user={user} />
    case 'tasks': return <ScreenA_Tasks user={user} />
    case 'directory': return <ScreenA_Directory user={user} />
    case 'helpdesk': return <ScreenA_HelpDesk user={user} />
    case 'compliance': return <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column' }}><PageComplianceDesktop user={user} houses={houses} /></div>
    case 'orientation': return <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column' }}><PageOrientationDesktop onNavigate={switchTab} /></div>
    case 'more':   return <MoreMenu onNavigate={switchTab} role={role} />
    case 'staff':  return <ScreenA_Staff user={user} onLogout={onLogout} onNavigate={switchTab} />
    case 'me':     return <ScreenA_Me user={user} onLogout={onLogout} onNavigate={switchTab} />
  }
  return <ScreenA_Home user={user} houses={houses} onNavigate={switchTab} onHouseClick={onHouseClick} />
}

// Overflow menu for secondary modules, keeping the bottom bar uncluttered.
// Every module demoted from the old 10-tab bar lives here so nothing is lost.
// Built per-role: supervisor sees house setup / staff / houses admin too.
function MoreMenu({ onNavigate, role = 'supervisor' }) {
  const isStaff = role === 'staff'
  const isSupervisor = role === 'supervisor'
  const items = [
    // Staff get a direct entry to their assigned home (the 'house' screen is
    // otherwise unreachable from the mobile tab bar).
    ...(isStaff ? [
      { id: 'house', label: 'My house', icon: IconHome, sub: 'Your assigned home' },
    ] : []),
    { id: 'updates',  label: 'Updates',  icon: IconMegaphone, sub: 'Announcements & shoutouts' },
    { id: 'team',     label: 'Team',     icon: IconChat,      sub: 'Messages & house channels' },
    { id: 'drive',    label: 'Transport', icon: IconCar,      sub: 'Trips, mileage & vehicles' },
    { id: 'supply',   label: 'Supplies', icon: IconCart,      sub: 'House inventory & shopping' },
    // Supervisor/manager-only operational views.
    ...(!isStaff ? [
      { id: 'houses',   label: 'Houses',   icon: IconHome,     sub: 'Every house at a glance' },
      { id: 'activity', label: 'Activity', icon: IconActivity, sub: 'Live map & on-shift status' },
      { id: 'compliance', label: 'Compliance', icon: IconCheck, sub: 'Certifications & license expiry' },
    ] : []),
    ...(isSupervisor ? [
      { id: 'staff',    label: 'Staff',    icon: IconPeople,   sub: 'Roster, roles & certifications' },
      { id: 'setup',    label: 'Add house', icon: IconHome,    sub: 'Create & configure a house' },
      { id: 'orientation', label: 'Orientation', icon: IconBook, sub: 'New-hire onboarding' },
    ] : []),
    { id: 'handbook', label: 'Handbook', icon: IconBook, sub: 'Policies, SOPs & house binders' },
    { id: 'events',   label: 'Events',   icon: IconStar, sub: 'Trainings & house meetings' },
    { id: 'forms',    label: 'Forms',    icon: IconClipboard, sub: 'Checklists, audits & walkthroughs' },
    { id: 'surveys',  label: 'Surveys',  icon: IconChart, sub: 'Staff pulse & training feedback' },
    { id: 'courses',  label: 'Training', icon: IconAward, sub: 'Courses & completion tracking' },
    { id: 'tasks',    label: 'Tasks',    icon: IconCheck, sub: 'Assignable one-off tasks' },
    { id: 'directory', label: 'Directory', icon: IconPhone, sub: 'Pharmacy, physicians & contacts' },
    { id: 'helpdesk', label: 'Help Desk', icon: IconHelp, sub: 'HR, payroll, IT & maintenance' },
    { id: 'me',       label: 'Me',       icon: IconPeople, sub: 'Profile, on-duty & sign out' },
  ]
  return (
    <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 22px 8px' }}>
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>More</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 24px' }}>
        {items.map(it => (
          <button key={it.id} onClick={() => onNavigate(it.id)} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
            background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12,
            padding: '14px 16px', marginBottom: 10, cursor: 'pointer', fontFamily: 'Geist',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--a-paper)', border: '1px solid var(--a-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <it.icon size={18} color="var(--a-ink2)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--a-ink)' }}>{it.label}</div>
              <div style={{ fontSize: 12, color: 'var(--a-ink3)' }}>{it.sub}</div>
            </div>
            <IconChev size={16} color="var(--a-ink3)" />
          </button>
        ))}
      </div>
    </div>
  )
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
  // Resident drill-in opened from the Care hub (mirrors houseDetail). Holds the
  // full resident row so ResidentProfile can render without a re-fetch.
  const [residentDetail, setResidentDetail] = useState(null)
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

  const switchTab = (t) => { setTab(t); setHouseDetail(null); setResidentDetail(null) }
  const handleRoleChange = (newRole) => { setRole(newRole); setHouseDetail(null); setResidentDetail(null); setTab('home') }

  // Five primary tabs for every role: Home · Schedule · Care · Time · More.
  // The Home and Care targets differ by role inside pickScreen (staff Home →
  // My Day; supervisor/manager Home → dashboard); every demoted module stays
  // reachable through the expanded MoreMenu. Care drills into a resident
  // profile via the residentDetail nav state below.
  const tabs = [
    { id: 'home',  label: 'Home',     icon: IconHome },
    { id: 'sched', label: 'Schedule', icon: IconCal },
    { id: 'care',  label: 'Care',     icon: IconHeart },
    { id: 'time',  label: 'Time',     icon: IconClock },
    { id: 'more',  label: 'More',     icon: IconDots },
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

  const screen = residentDetail
    ? <ResidentProfile resident={residentDetail} user={effUser} houses={houses} onBack={() => setResidentDetail(null)} />
    : houseDetail
    ? <ScreenA_HouseDetail houseId={houseDetail} user={effUser} onBack={() => setHouseDetail(null)} houses={houses} />
    : pickScreen(role, tab, effUser, setHouseDetail, switchTab, onLogout, houses, refreshHouses, addHouseToState, setResidentDetail)

  return (
    <div className="web-app web-mobile" style={{
      display: 'flex', flexDirection: 'column', background: 'var(--a-bg)',
      // The "PREVIEW AS" persona chip (RoleSwitcher) is a fixed top-right overlay
      // shown only in demo mode. Expose its width as a CSS var so screen headers
      // can reserve right-side space and keep top-right actions from sliding under
      // it. Zero when the chip isn't rendered, so non-demo layout is untouched.
      '--chip-clear': isDemoMode ? '116px' : '0px',
    }}>
      <GeoStatusBanner />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {screen}
        {isDemoMode && <RoleSwitcher role={role} setRole={handleRoleChange} open={showRoleSwitcher} setOpen={setShowRoleSwitcher} />}
      </div>
      <div className="web-tab-bar" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {tabs.map(t => {
          const isActive = tab === t.id && !houseDetail && !residentDetail
          return (
          <button key={t.id} onClick={() => switchTab(t.id)} className={isActive ? 'active' : ''}
            aria-label={t.label} aria-current={isActive ? 'page' : undefined}>
            <t.icon size={22} sw={1.7} />
            <span>{t.label}</span>
          </button>
          )
        })}
      </div>
    </div>
  )
}
