import { useState, useEffect, useRef } from 'react'
import { ROLES } from '../../data/constants'
import { isDemoMode } from '../../lib/supabase'
import { fetchHouses } from '../../lib/db'
import { NotificationBell } from '../NotificationBell'
import { ScreenA_HouseDetail } from '../../screens/HouseDetail'
import { ScreenA_MyDay, ScreenA_Me } from '../../screens/Employee'
import { ScreenA_Resources } from '../../screens/Resources'
import { ScreenA_Driving } from '../../screens/Driving'
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
import { TendLogo } from '../ui/TendLogo'
import { PageTodayDesktop, PageHousesDesktop, PageTeamDesktop, PageStaffDesktop, PageOrientationDesktop, PageComplianceDesktop } from '../../screens/desktop/Pages'
import { PageScheduleDesktopExpanded } from '../../screens/desktop/Schedule'
import { countPendingRequests, countPendingTimeOff, countUnreadAnnouncements, countOpenShifts } from '../../lib/db'
import { IconHome, IconBox, IconCal, IconChat, IconCar, IconCart, IconPeople, IconBook, IconArrow, IconPlus, IconHeart, IconClock, IconActivity, IconMegaphone, IconStar, IconClipboard, IconChart, IconCheck, IconPhone, IconHelp, IconAward, IconFlag, IconLeaf, IconChev } from '../icons'
import { OnDutyCard } from '../OnDutyCard'
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

// Every nav destination carries a `group` so the desktop rail can render the
// flat list as three labelled sections (Overview / Care / Org) — routing targets
// are unchanged, only the visual grouping is new. Keep EVERY tab present for the
// roles that had it: dropping one silently hides a whole module for that role.
const ALL_TABS = [
  // ── Overview ──
  { id: 'today',       label: 'Today',       icon: IconHome,    roles: ['supervisor', 'manager'],          group: 'overview' },
  { id: 'myday',       label: 'My Day',      icon: IconHome,    roles: ['staff'],                          group: 'overview' },
  { id: 'schedule',    label: 'Schedule',    icon: IconCal,     roles: ['supervisor', 'manager', 'staff'], group: 'overview' },
  { id: 'timeclock',   label: 'Time clock',  icon: IconClock,   roles: ['supervisor', 'manager', 'staff'], group: 'overview' },
  { id: 'activity',    label: 'Activity',    icon: IconActivity, roles: ['supervisor', 'manager'],         group: 'overview' },

  // ── Care ──
  { id: 'care',        label: 'Care hub',    icon: IconHeart,   roles: ['supervisor', 'manager', 'staff'], group: 'care' },
  { id: 'houses',      label: 'Houses',      icon: IconBox,     roles: ['supervisor', 'manager'],          group: 'care' },
  { id: 'compliance',  label: 'Compliance',  icon: IconFlag,    roles: ['supervisor', 'manager'],          group: 'care' },

  // ── Org ──
  { id: 'staff',       label: 'Staff',       icon: IconPeople,  roles: ['supervisor'],                     group: 'org' },
  { id: 'setup',       label: 'House setup', icon: IconPlus,    roles: ['supervisor'],                     group: 'org' },
  { id: 'updates',     label: 'Updates',     icon: IconMegaphone, roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'events',      label: 'Events',      icon: IconStar,    roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'knowledge',   label: 'Handbook',    icon: IconBook,    roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'forms',       label: 'Forms',       icon: IconClipboard, roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'surveys',     label: 'Surveys',     icon: IconChart,   roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'courses',     label: 'Training',    icon: IconAward,   roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'tasks',       label: 'Tasks',       icon: IconCheck,   roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'directory',   label: 'Directory',   icon: IconPhone,   roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'helpdesk',    label: 'Help Desk',   icon: IconHelp,    roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'team',        label: 'Team chat',   icon: IconChat,    roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'driving',     label: 'Transport',   icon: IconCar,     roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'resources',   label: 'Resources',   icon: IconCart,    roles: ['supervisor', 'manager', 'staff'], group: 'org' },
  { id: 'orientation', label: 'Orientation', icon: IconLeaf,    roles: ['supervisor'],                     group: 'org' },
]

// Group order + display labels for the grouped rail. A group is hidden when it
// has no items for the active role.
const NAV_GROUPS = [
  { id: 'overview', label: 'Overview' },
  { id: 'care',     label: 'Care' },
  { id: 'org',      label: 'Org' },
]

function DesktopPage({ tab, onHouseClick, user, houses, refreshHouses, onNavigate, onOpenResident, onOpenHouseSection, onLogout }) {
  if (tab === 'today')       return <PageTodayDesktop onHouseClick={onHouseClick} user={user} houses={houses} onNavigate={onNavigate} />
  if (tab === 'profile')     return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 480, margin: '0 auto' }}><ScreenA_Me user={user} onLogout={onLogout} onNavigate={(t) => onNavigate(t === 'sched' ? 'schedule' : t === 'drive' ? 'driving' : t)} /></div></div>
  if (tab === 'myday')       return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 480, margin: '0 auto' }}><ScreenA_MyDay user={user} /></div></div>
  if (tab === 'care')        return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 760, margin: '0 auto' }}><ScreenA_CareHub user={user} houses={houses} onOpenResident={onOpenResident} onOpenHouseSection={onOpenHouseSection} scopeHouseId={user.role === 'manager' ? (user.houseId || null) : undefined} /></div></div>
  if (tab === 'houses')      return <PageHousesDesktop onHouseClick={onHouseClick} user={user} houses={houses} onNavigate={onNavigate} />
  if (tab === 'setup')       return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 600, margin: '0 auto' }}><ScreenA_HouseSetup user={user} onHousesChanged={refreshHouses} /></div></div>
  if (tab === 'schedule')    return <PageScheduleDesktopExpanded user={user} houses={houses} />
  if (tab === 'timeclock')   return <ScreenA_Timesheets user={user} desktop houses={houses} />
  if (tab === 'activity')    return <ScreenA_Activity user={user} desktop />
  if (tab === 'updates')     return <ScreenA_Updates user={user} desktop />
  if (tab === 'knowledge')   return <ScreenA_Knowledge user={user} desktop />
  if (tab === 'events')      return <ScreenA_Events user={user} desktop />
  if (tab === 'forms')       return <ScreenA_Forms user={user} desktop />
  if (tab === 'surveys')     return <ScreenA_Surveys user={user} desktop />
  if (tab === 'courses')     return <ScreenA_Courses user={user} desktop />
  if (tab === 'tasks')       return <ScreenA_Tasks user={user} desktop />
  if (tab === 'directory')   return <ScreenA_Directory user={user} desktop />
  if (tab === 'helpdesk')    return <ScreenA_HelpDesk user={user} desktop />
  if (tab === 'team')        return <PageTeamDesktop user={user} />
  if (tab === 'driving')     return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 600, margin: '0 auto' }}><ScreenA_Driving user={user} /></div></div>
  if (tab === 'resources')   return <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}><div style={{ maxWidth: 600, margin: '0 auto' }}><ScreenA_Resources user={user} /></div></div>
  if (tab === 'staff')       return <PageStaffDesktop user={user} houses={houses} />
  if (tab === 'compliance')  return <PageComplianceDesktop user={user} houses={houses} onHouseClick={onHouseClick} />
  if (tab === 'orientation') return <PageOrientationDesktop onNavigate={onNavigate} />
  return <PageTodayDesktop onHouseClick={onHouseClick} user={user} houses={houses} onNavigate={onNavigate} />
}

function DesktopRail({ tab, setTab, user, onLogout, houses, counts = {}, onNotificationOpen }) {
  const u = ROLES.find(r => r.id === user.role) || ROLES.find(r => r.id === user.id) || ROLES[0]
  const role = user.role ?? user.id
  // Show the ACTUAL signed-in person, not the demo persona for their role.
  const displayName = user.name || u.name
  const initial = (displayName || '?').trim().charAt(0).toUpperCase() || '?'

  // Account menu: a popover anchored to the avatar. Consolidates the lone
  // sign-out action plus the otherwise-unreachable Profile + on-duty toggle into
  // one dropdown (desktop has no Me screen). Closes on outside click / Escape.
  const [acctOpen, setAcctOpen] = useState(false)
  const acctRef = useRef(null)
  useEffect(() => {
    if (!acctOpen) return
    const onDown = (e) => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setAcctOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [acctOpen])
  const railTabs = ALL_TABS.filter(t => t.roles.includes(role))
    .map(t => counts[t.id] ? { ...t, count: counts[t.id] } : t)

  // Resolve the flat, role-filtered tabs into their labelled groups, preserving
  // NAV_GROUPS order. Groups with no items for this role are dropped.
  const groups = NAV_GROUPS
    .map(g => ({ ...g, items: railTabs.filter(t => t.group === g.id) }))
    .filter(g => g.items.length > 0)

  const branches = [...new Set(houses.map(h => h.branch).filter(Boolean))]

  const renderItem = ({ id, icon: Ico, label, count }) => {
    const active = tab === id
    return (
      <button type="button" key={id} onClick={() => setTab(id)} aria-current={active ? 'page' : undefined} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
        background: active ? 'var(--a-card)' : 'transparent',
        color: active ? 'var(--a-ink)' : 'var(--a-ink2)',
        border: active ? '1px solid var(--a-line)' : '1px solid transparent',
        cursor: 'pointer', marginBottom: 2,
        font: 'inherit', textAlign: 'left', width: '100%',
      }}>
        <Ico size={16} sw={1.7} color={active ? 'var(--a-sage)' : undefined} />
        <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, flex: 1 }}>{label}</span>
        {count != null && <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', background: 'var(--a-paper)', border: '1px solid var(--a-line)', padding: '0 6px', borderRadius: 999, fontWeight: 500 }}>{count}</span>}
      </button>
    )
  }

  return (
    <div style={{ width: 240, background: 'var(--a-paper)', borderRight: '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', padding: '20px 16px', flexShrink: 0, height: '100dvh', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <TendLogo size={16} />
        <NotificationBell user={user} onOpen={onNotificationOpen} />
      </div>
      <div style={{ marginTop: 22 }}>
        {groups.map((g, i) => (
          <div key={g.id} style={{ marginBottom: i < groups.length - 1 ? 18 : 0 }}>
            <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6, paddingLeft: 10 }}>{g.label}</div>
            {g.items.map(renderItem)}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 16 }} />
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
      <div ref={acctRef} style={{ position: 'relative' }}>
        {acctOpen && (
          <div role="menu" style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
            background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12,
            padding: 8, boxShadow: '0 12px 34px rgba(0,0,0,0.16)', zIndex: 60,
          }}>
            {/* Manager/staff can share their location on shift; this toggle is the
                desktop's only home for the otherwise-unreachable OnDutyCard. */}
            {role !== 'supervisor' && user.staffId && <OnDutyCard user={user} />}
            <button type="button" role="menuitem" onClick={() => { setAcctOpen(false); setTab('profile') }} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8,
              background: 'transparent', border: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left',
              width: '100%', color: 'var(--a-ink)', marginBottom: 2,
            }}>
              <IconPeople size={16} sw={1.7} color="var(--a-ink2)" />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Profile</span>
            </button>
            <button type="button" role="menuitem" onClick={() => { setAcctOpen(false); onLogout() }} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8,
              background: 'transparent', border: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left',
              width: '100%', color: 'var(--a-ink)',
            }}>
              <IconArrow size={16} color="var(--a-ink2)" />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Sign out</span>
            </button>
          </div>
        )}
        <button type="button" onClick={() => setAcctOpen(o => !o)} aria-haspopup="menu" aria-expanded={acctOpen} aria-label="Account menu" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'var(--a-card)', borderRadius: 10, border: '1px solid var(--a-line)', cursor: 'pointer', font: 'inherit', textAlign: 'left', width: '100%', color: 'var(--a-ink)' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{u.role}</div>
          </div>
          <IconChev size={14} color="var(--a-ink3)" />
        </button>
      </div>
    </div>
  )
}

export function DesktopShell({ user, onLogout }) {
  const defaultTab = (user.role ?? user.id) === 'staff' ? 'myday' : 'today'
  const [tab, setTab] = useState(defaultTab)
  const [houseDetail, setHouseDetail] = useState(null)
  const [residentDetail, setResidentDetail] = useState(null)
  const [houses, setHouses] = useState([])

  useEffect(() => {
    if (!user?.orgId) return
    fetchHouses(user.orgId).then(rows => setHouses(rows.map(normalizeHouse)))
  }, [user?.orgId])

  const refreshHouses = () => {
    if (!user?.orgId) return
    fetchHouses(user.orgId).then(rows => setHouses(rows.map(normalizeHouse)))
  }

  const switchTab = (t) => { setTab(t); setHouseDetail(null); setResidentDetail(null) }

  // Manager/staff without a house assignment get scoped to the first house.
  const effUser = (user.role && user.role !== 'supervisor' && !user.houseSlug && houses[0])
    ? { ...user, houseSlug: houses[0].id, houseId: houses[0]._uuid }
    : user

  const role = user.role ?? user.id

  // A house employee (manager or DSP) only ever sees their OWN house anywhere in
  // the desktop — sidebar branches, schedule, residents, timesheets. Only a
  // supervisor spans every house. Match the user's house by id OR slug so it
  // holds in both the demo (house id === slug) and real Supabase (house id is a
  // UUID; user carries house_id + house_slug) shapes. In real mode fetchHouses
  // is already RLS-scoped to the user's houses; this also scopes the demo, which
  // has no row-level security.
  const myHouseKeys = [effUser.houseId, effUser.houseSlug].filter(Boolean)
  const visibleHouses = role === 'supervisor'
    ? houses
    : houses.filter(h => myHouseKeys.includes(h.id) || myHouseKeys.includes(h._uuid))

  // Pending shift-edit requests, surfaced as a badge on the Time clock tab for
  // approvers. Polls lightly; managers are scoped to their house.
  const [pendingReqs, setPendingReqs] = useState(0)
  useEffect(() => {
    if (!effUser?.orgId || (role !== 'supervisor' && role !== 'manager')) { setPendingReqs(0); return }
    let stop = false
    const scope = { houseId: role === 'manager' ? effUser.houseId : null }
    const load = () => Promise.all([
      Promise.resolve(countPendingRequests(effUser.orgId, scope)).catch(() => 0),
      Promise.resolve(countPendingTimeOff(effUser.orgId, scope)).catch(() => 0),
    ]).then(([a, b]) => { if (!stop) setPendingReqs((a || 0) + (b || 0)) })
    load()
    const iv = setInterval(load, 15000)
    return () => { stop = true; clearInterval(iv) }
  }, [effUser?.orgId, effUser?.houseId, role])

  // Unread announcements, surfaced as a badge on the Updates tab (all roles).
  const [unreadUpdates, setUnreadUpdates] = useState(0)
  useEffect(() => {
    if (!effUser?.orgId) { setUnreadUpdates(0); return }
    let stop = false
    const staffId = effUser.staffId || `demo-${role}`
    const load = () => Promise.resolve(
      countUnreadAnnouncements(effUser.orgId, { houseId: effUser.houseId || null, staffId, role })
    ).then(n => { if (!stop) setUnreadUpdates(n || 0) }).catch(() => {})
    load()
    const iv = setInterval(load, 20000)
    return () => { stop = true; clearInterval(iv) }
  }, [effUser?.orgId, effUser?.houseId, effUser?.staffId, role])

  // Open (unfilled) shifts, surfaced as a badge on the Schedule tab (all roles —
  // staff see how many shifts are claimable). Supervisors org-wide; others house-scoped.
  const [openShifts, setOpenShifts] = useState(0)
  useEffect(() => {
    if (!effUser?.orgId) { setOpenShifts(0); return }
    let stop = false
    const scope = { houseId: role === 'supervisor' ? null : (effUser.houseId || null) }
    const load = () => Promise.resolve(countOpenShifts(effUser.orgId, scope)).catch(() => 0)
      .then(n => { if (!stop) setOpenShifts(n || 0) })
    load()
    const iv = setInterval(load, 15000)
    return () => { stop = true; clearInterval(iv) }
  }, [effUser?.orgId, effUser?.houseId, role])

  useTripTracking(effUser)
  useDutyTracking(effUser)

  // Close the HouseDetail / Resident overlay modals on Escape.
  useEffect(() => {
    if (!houseDetail && !residentDetail) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (residentDetail) setResidentDetail(null)
      else if (houseDetail) setHouseDetail(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [houseDetail, residentDetail])

  return (
    <div className="web-app web-desktop" style={{ display: 'flex', flexDirection: 'row', position: 'relative' }}>
      <GeoStatusBanner />
      <DesktopRail tab={tab} setTab={switchTab} user={user} onLogout={onLogout} houses={visibleHouses} counts={{ timeclock: pendingReqs, updates: unreadUpdates, schedule: openShifts }}
        onNotificationOpen={(n) => {
          if (n.link === 'schedule') { switchTab('schedule'); return }
          if (n.link === 'compliance') {
            const slug = effUser.houseSlug || visibleHouses[0]?.id
            if (slug) { setResidentDetail(null); setHouseDetail({ id: slug, section: 'compliance' }) }
          }
        }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--a-bg)', overflow: 'hidden' }}>
        <DesktopPage tab={tab} onHouseClick={(id) => setHouseDetail(id)} user={effUser} houses={visibleHouses} refreshHouses={refreshHouses} onNavigate={switchTab} onOpenResident={(r) => setResidentDetail(r)} onOpenHouseSection={(houseId, section) => { setResidentDetail(null); setHouseDetail({ id: houseId, section }) }} onLogout={onLogout} />
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
          <div role="dialog" aria-modal="true" aria-label="House detail" style={{ width: 420, background: 'var(--a-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginBottom: 40 }}>
            <ScreenA_HouseDetail key={`${typeof houseDetail === 'object' ? houseDetail.id : houseDetail}:${typeof houseDetail === 'object' ? (houseDetail.section || '') : ''}`} houseId={typeof houseDetail === 'object' ? houseDetail.id : houseDetail} initialSection={typeof houseDetail === 'object' ? houseDetail.section : undefined} user={effUser} onBack={() => setHouseDetail(null)} houses={visibleHouses} />
          </div>
        </div>
      )}
      {residentDetail && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 40, overflow: 'auto',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setResidentDetail(null) }}
        >
          <div role="dialog" aria-modal="true" aria-label="Resident profile" style={{ width: 420, background: 'var(--a-bg)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginBottom: 40 }}>
            <ResidentProfile resident={residentDetail} user={effUser} onBack={() => setResidentDetail(null)} houses={visibleHouses} />
          </div>
        </div>
      )}
    </div>
  )
}
