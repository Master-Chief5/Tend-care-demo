// tend-web.jsx — Direction A as a responsive website with role switching

const { useState, useEffect } = React;

// ── Viewport detection ────────────────────────────────────────────────
function useIsMobile(bp = 820) {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const fn = e => setMobile(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [bp]);
  return mobile;
}

// ── Roles ─────────────────────────────────────────────────────────────
const ROLES = [
  { id: 'supervisor', name: 'Lina R.', initial: 'L', color: 'var(--a-clay)', role: 'Supervisor' },
  { id: 'manager',    name: 'Devon P.', initial: 'D', color: 'var(--house-willow, #2f9489)', role: 'House Mgr · Willow' },
  { id: 'staff',      name: 'Aisha M.', initial: 'A', color: 'var(--a-sage)', role: 'DSP Lead · Oak' },
];

// ── Mobile shell ──────────────────────────────────────────────────────
function MobileShell() {
  const [role, setRole] = useState('supervisor');
  const [tab, setTab] = useState('home');
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const isSupervisor = role === 'supervisor';
  const isManager = role === 'manager';
  const isStaff = role === 'staff';

  const tabs = isStaff ? [
    { id: 'home', label: 'My Day', icon: IconHome },
    { id: 'sched', label: 'Schedule', icon: IconCal },
    { id: 'team', label: 'Team', icon: IconChat },
    { id: 'drive', label: 'Driving', icon: IconCar },
    { id: 'me', label: 'Me', icon: IconPeople },
  ] : [
    { id: 'home', label: 'Houses', icon: IconHome },
    { id: 'sched', label: 'Schedule', icon: IconCal },
    { id: 'team', label: 'Team', icon: IconChat },
    { id: 'drive', label: 'Driving', icon: IconCar },
    { id: 'me', label: 'Me', icon: IconPeople },
  ];

  const screen = pickScreen(role, tab);

  return (
    <div className="web-app web-mobile" style={{ display: 'flex', flexDirection: 'column', background: 'var(--a-bg)' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {screen}
        <RoleSwitcher role={role} setRole={setRole} open={showRoleSwitcher} setOpen={setShowRoleSwitcher} />
      </div>
      <div className="web-tab-bar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? 'active' : ''}>
            <t.icon size={22} sw={1.7} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function pickScreen(role, tab) {
  if (role === 'staff') {
    switch (tab) {
      case 'home':  return <ScreenA_MyDay />;
      case 'sched': return <ScreenA_MySchedule />;
      case 'team':  return <ScreenA_Chat />;
      case 'drive': return <ScreenA_Driving />;
      case 'me':    return <ScreenA_Me />;
    }
  }
  // supervisor + manager share these
  switch (tab) {
    case 'home':  return <ScreenA_Houses />;
    case 'sched': return <ScreenA_ScheduleDay />;
    case 'team':  return <ScreenA_Chat />;
    case 'drive': return <ScreenA_Driving />;
    case 'me':    return role === 'supervisor' ? <ScreenA_Staff /> : <ScreenA_Me />;
  }
  return <ScreenA_Houses />;
}

// Floating role-switcher pill in the top-right of the mobile screen
function RoleSwitcher({ role, setRole, open, setOpen }) {
  const current = ROLES.find(r => r.id === role);
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
            <button key={r.id} onClick={() => { setRole(r.id); setOpen(false); }} style={{
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
  );
}

// ── Desktop shell ─────────────────────────────────────────────────────
function DesktopShell() {
  const [tab, setTab] = useState('today');
  return (
    <div className="web-app web-desktop" style={{ display: 'flex' }}>
      <DesktopRail tab={tab} setTab={setTab} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--a-bg)', overflow: 'hidden' }}>
        <DesktopPage tab={tab} />
      </div>
    </div>
  );
}

function DesktopRail({ tab, setTab }) {
  const railTabs = [
    { id: 'today', label: 'Today', icon: IconHome },
    { id: 'houses', label: 'Houses', icon: IconBox, count: 4 },
    { id: 'schedule', label: 'Schedule', icon: IconCal },
    { id: 'team', label: 'Team chat', icon: IconChat },
    { id: 'driving', label: 'Driving', icon: IconCar },
    { id: 'resources', label: 'Resources', icon: IconCart },
    { id: 'staff', label: 'Staff', icon: IconPeople, count: 22 },
    { id: 'orientation', label: 'Orientation', icon: IconBook, count: 4 },
  ];
  return (
    <div style={{ width: 240, background: 'var(--a-paper)', borderRight: '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', padding: '20px 16px', flexShrink: 0, height: '100dvh', overflow: 'auto' }}>
      <TendLogo size={16} />
      <div style={{ marginTop: 22 }}>
        {railTabs.map(({ id, icon: Ico, label, count }) => {
          const active = tab === id;
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
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8, paddingLeft: 10 }}>Branches</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
        {[
          { name: 'North · Oak + Willow', n: 2 },
          { name: 'South · Maple + Cedar', n: 2 },
        ].map(b => (
          <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 11.5, color: 'var(--a-ink2)', borderRadius: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--a-sage)' }} />
            {b.name}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'var(--a-card)', borderRadius: 10, border: '1px solid var(--a-line)' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--a-clay)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>L</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Lina R.</div>
          <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>Supervisor</div>
        </div>
        <IconDots size={14} color="var(--a-ink3)" />
      </div>
    </div>
  );
}

// ── Desktop page router ───────────────────────────────────────────────
function DesktopPage({ tab }) {
  if (tab === 'today') return <PageTodayDesktop />;
  if (tab === 'houses') return <PageHousesDesktop />;
  if (tab === 'schedule') return <PageScheduleDesktopExpanded />;
  if (tab === 'team') return <PageTeamDesktop />;
  if (tab === 'driving') return <PageDrivingDesktop />;
  if (tab === 'resources') return <PageResourcesDesktop />;
  if (tab === 'staff') return <PageStaffDesktop />;
  if (tab === 'orientation') return <PageOrientationDesktop />;
  return null;
}

Object.assign(window, { useIsMobile, MobileShell, DesktopShell, DesktopRail, DesktopPage, pickScreen, RoleSwitcher, ROLES });
