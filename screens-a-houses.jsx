// screens-a-houses.jsx — Direction A · Houses overview

// ── Big greeting block ─────────────────────────────────────────────────
function GreetingHeader({ name = 'Lina', role = 'Supervisor · North + South' }) {
  const dateLabel = fmtDayLabel(new Date());
  const greeting = getGreeting();
  return (
    <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{dateLabel}</div>
        <div className="serif" style={{ fontSize: 32, lineHeight: 1.05, marginTop: 4, color: 'var(--a-ink)', letterSpacing: '-0.02em' }}>
          {greeting}, <em style={{ fontStyle: 'italic', color: 'var(--a-sage)' }}>{name}</em>
        </div>
        <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 6 }}>{role}</div>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--a-clay)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>L</div>
        <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: 999, background: '#d44e3a', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid var(--a-bg)' }}>3</div>
      </div>
    </div>
  );
}

// ── Branch selector ────────────────────────────────────────────────────
function BranchTabs({ active = 'All', setActive = () => {} }) {
  return (
    <div style={{ padding: '0 22px 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
      <div style={{ display: 'flex', background: 'var(--a-paper)', borderRadius: 999, padding: 3, border: '1px solid var(--a-line)' }}>
        {['All', 'North', 'South'].map(b => (
          <button key={b} onClick={() => setActive(b)} style={{
            border: 0,
            background: b === active ? 'var(--a-ink)' : 'transparent',
            color: b === active ? '#fbf6ec' : 'var(--a-ink2)',
            padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'Geist',
          }}>{b}</button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>
        <IconFilter size={14} sw={1.7} />
        Filter
      </button>
    </div>
  );
}

// ── House card ─────────────────────────────────────────────────────────
function HouseCard({ house, urgent = 0, sub = [], staff, present, transports, onHouseClick, onTeamChat }) {
  const [toast, showToast] = useToast();
  const c = house.color;
  return (
    <div style={{
      background: 'var(--a-card)', borderRadius: 18, border: '1px solid var(--a-line)',
      padding: 0, overflow: 'hidden', marginBottom: 14,
    }}>
      <Toast msg={toast} />
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
            <span className="serif" style={{ fontSize: 19, fontWeight: 500, letterSpacing: '-0.01em' }}>{house.name}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{house.addr}</span>
            <span>·</span>
            <span>{house.branch} branch</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {urgent > 0 && (
            <div style={{ background: '#d44e3a', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>{urgent}</div>
          )}
          <button onClick={() => showToast('Opening options…')} style={{ background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink3)', cursor: 'pointer' }}>
            <IconDots size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, padding: '8px 16px 14px', borderBottom: '1px dashed var(--a-line)' }}>
        <Stat label="On shift" big={staff} sub="of 2" />
        <Stat label="Residents in" big={present} sub={`of ${house.residents}`} />
        <Stat label="Today's drives" big={transports} sub="planned" />
      </div>

      <div style={{ padding: '10px 16px 14px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Needs attention</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sub.map((s, i) => <NeedRow key={i} {...s} color={c} />)}
        </div>
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--a-line)' }}>
        <button
          onClick={() => onTeamChat ? onTeamChat() : showToast('Opening team chat…')}
          style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 0, fontSize: 12.5, fontWeight: 500, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', cursor: 'pointer' }}>
          <IconChat size={15} sw={1.7} /> Message
        </button>
        <div style={{ width: 1, background: 'var(--a-line)' }} />
        <button
          onClick={() => onHouseClick ? onHouseClick(house.id) : showToast('Opening house…')}
          style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 0, fontSize: 12.5, fontWeight: 600, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', cursor: 'pointer' }}>
          Open house <IconArrow size={14} sw={2} />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, big, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.04em' }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 22, lineHeight: 1, fontWeight: 500, color: 'var(--a-ink)' }}>
        {big}<span style={{ fontSize: 11, color: 'var(--a-ink3)', marginLeft: 3, fontWeight: 400 }}>{sub}</span>
      </div>
    </div>
  );
}

function NeedRow({ icon: Ico = IconCart, kind, text, color }) {
  const kindMap = {
    grocery: { tag: 'Grocery', bg: '#f5e9d6', tc: '#a47012' },
    med: { tag: 'MAR', bg: '#fadcd7', tc: '#a93a25' },
    maint: { tag: 'Maint.', bg: '#dee6df', tc: '#3f604d' },
    note: { tag: 'Note', bg: '#e7dfe9', tc: '#5a3a6b' },
    drive: { tag: 'Drive', bg: '#dde6f0', tc: '#3c5887' },
  };
  const k = kindMap[kind] || kindMap.grocery;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{ width: 24, height: 24, borderRadius: 8, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.tc, flexShrink: 0 }}>
        <Ico size={14} sw={1.8} />
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 600, color: k.tc, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k.tag}</span>
      <span style={{ fontSize: 12.5, color: 'var(--a-ink2)', flex: 1, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
}

// ── Direction A · Houses overview screen ───────────────────────────────
function ScreenA_Houses({ onHouseClick, onTeamChat }) {
  const [branch, setBranch] = useState('All');

  const allHouseData = [
    { idx: 0, urgent: 3, staff: 2, present: 3, transports: 2, sub: [
      { kind: 'grocery', text: 'Out: oat milk, bananas, dish soap' },
      { kind: 'med', text: 'R. Johnson — 2pm meds need second signoff' },
      { kind: 'drive', text: '1:30pm — M. Lee to dentist (Aisha)' },
    ]},
    { idx: 1, urgent: 1, staff: 1, present: 3, transports: 0, sub: [
      { kind: 'grocery', text: 'Running low: paper towels, chicken' },
      { kind: 'note', text: 'D. Park left a shift note (8:14am)' },
    ]},
    { idx: 2, urgent: 4, staff: 2, present: 4, transports: 3, sub: [
      { kind: 'med', text: 'Refill needed: K. Diaz, levetiracetam' },
      { kind: 'maint', text: 'Dryer making a noise — vendor TBD' },
      { kind: 'grocery', text: 'Shopping run scheduled — Aisha, 4pm' },
    ]},
    { idx: 3, urgent: 0, staff: 2, present: 4, transports: 1, sub: [
      { kind: 'note', text: 'All clear · 2 incident-free weeks' },
    ]},
  ];

  const visibleData = allHouseData.filter(d =>
    branch === 'All' || HOUSES[d.idx].branch === branch
  );

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <GreetingHeader />
        <BranchTabs active={branch} setActive={setBranch} />
        <div style={{ padding: '0 16px', overflowY: 'auto', height: 'calc(100% - 168px)' }}>
          {visibleData.map(({ idx, urgent, staff, present, transports, sub }) => (
            <HouseCard
              key={HOUSES[idx].id}
              house={HOUSES[idx]} urgent={urgent} staff={staff}
              present={present} transports={transports} sub={sub}
              onHouseClick={onHouseClick}
              onTeamChat={onTeamChat}
            />
          ))}
          <div style={{ height: 14 }} />
        </div>
      </div>
      <TabBar active="houses" />
    </div>
  );
}

Object.assign(window, { GreetingHeader, BranchTabs, HouseCard, Stat, NeedRow, ScreenA_Houses });
