// screens-a-people.jsx — Staff / Quality of care, Orientation, Team chat

// ── Staff & Quality of care screen ─────────────────────────────────────
function ScreenA_Staff() {
  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Team</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>22 staff · 4 in onboarding</div>
          </div>
          <button style={{ background: 'transparent', border: '1px solid var(--a-line)', color: 'var(--a-ink2)', borderRadius: 999, padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist' }}>
            <IconPlus size={13} sw={2.2} /> Hire
          </button>
        </div>

        {/* Quality of care card */}
        <div style={{ margin: '6px 22px 14px', background: 'var(--a-card)', borderRadius: 16, border: '1px solid var(--a-line)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px dashed var(--a-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Quality of care · May</div>
              <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>↑ 4 pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span className="serif tnum" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em' }}>92</span>
              <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>/ 100</span>
              <div style={{ flex: 1 }} />
              <RingChart pct={0.92} color="var(--a-sage)" />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Pill color="var(--a-sage)">MAR · 100%</Pill>
              <Pill color="var(--a-sage)">Notes · 96%</Pill>
              <Pill color="var(--a-clay)">Late · 8%</Pill>
              <Pill color="var(--a-sage)">Family ★ 4.7</Pill>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 22px 8px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flex: 1, background: 'var(--a-paper)', borderRadius: 999, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--a-line)' }}>
            <IconSearch size={13} color="var(--a-ink3)" />
            <input placeholder="Search staff" style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 12.5, fontFamily: 'Geist', color: 'var(--a-ink2)' }} />
          </div>
          <button style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '6px 10px', fontSize: 11.5, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconFilter size={12} sw={1.8} /> Flags
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          <StaffCard name="Aisha Mendez" role="DSP · Lead" house="oak" score={96} sub="2.1 yrs · On track for promo" highlight="promo" />
          <StaffCard name="Jay Brooks" role="DSP" house="oak" score={88} sub="2.0 yrs · MAR perfect 90d" />
          <StaffCard name="Devon Park" role="House mgr" house="willow" score={94} sub="3.4 yrs · Family ★ 5.0" />
          <StaffCard name="Saira Khan" role="House mgr" house="maple" score={89} sub="1.2 yrs" />
          <StaffCard name="Marcus Lewis" role="DSP" house="maple" score={64} sub="0.5 yrs · 4 late in 2wk" highlight="concern" />
          <StaffCard name="Carmen Vela" role="DSP" house="oak" score={82} sub="6 mo · Orientation 80%" highlight="orient" />
          <StaffCard name="Priya Nair" role="DSP" house="cedar" score={91} sub="1.8 yrs" />
        </div>
      </div>
      <TabBar active="me" />
    </div>
  );
}

function RingChart({ pct = 0.9, color = 'var(--a-sage)', size = 40 }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--a-line)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function StaffCard({ name, role, house, score, sub, highlight }) {
  const h = HOUSES.find(x => x.id === house);
  const initials = name.split(' ').map(n => n[0]).join('');
  const scoreColor = score >= 90 ? '#3f7050' : score >= 80 ? '#a47012' : '#a93a25';
  const flagMap = {
    promo: { tag: 'Promote', tc: '#3f7050', bg: '#dee6df' },
    concern: { tag: 'Concern', tc: '#a93a25', bg: '#fadcd7' },
    orient: { tag: 'In orientation', tc: '#5a3a6b', bg: '#e7dfe9' },
  };
  const flag = highlight ? flagMap[highlight] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, marginBottom: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: h.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</span>
          {flag && <span style={{ fontSize: 9, fontWeight: 600, color: flag.tc, background: flag.bg, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{flag.tag}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 1 }}>{role} · {h.name.split(' ')[0]} · {sub}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="serif tnum" style={{ fontSize: 18, fontWeight: 500, color: scoreColor, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>Quality</div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenA_Staff, RingChart, StaffCard });
