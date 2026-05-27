// desktop.jsx — Desktop supervisor view (Direction A)

function DesktopSupervisor() {
  return (
    <div className="desktop" style={{ fontFamily: 'Geist' }}>
      {/* Left rail */}
      <div style={{ width: 240, background: 'var(--a-paper)', borderRight: '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', padding: '20px 16px' }}>
        <TendLogo size={16} />
        <div style={{ marginTop: 22 }}>
          {[
            { ico: IconHome, label: 'Today', active: true, count: 8 },
            { ico: IconBox, label: 'Houses', count: 4 },
            { ico: IconCal, label: 'Schedule' },
            { ico: IconChat, label: 'Team' },
            { ico: IconCar, label: 'Driving' },
            { ico: IconCart, label: 'Resources' },
            { ico: IconPeople, label: 'Staff', count: 22 },
            { ico: IconHeart, label: 'Quality' },
            { ico: IconBook, label: 'Onboarding', count: 4 },
          ].map(({ ico: Ico, label, active, count }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
              background: active ? 'var(--a-card)' : 'transparent',
              color: active ? 'var(--a-ink)' : 'var(--a-ink2)',
              border: active ? '1px solid var(--a-line)' : '1px solid transparent',
              cursor: 'pointer', marginBottom: 2,
            }}>
              <Ico size={16} sw={1.7} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, flex: 1 }}>{label}</span>
              {count && <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', background: 'var(--a-paper)', border: '1px solid var(--a-line)', padding: '0 6px', borderRadius: 999, fontWeight: 500 }}>{count}</span>}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* House quick switcher */}
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

        {/* User card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'var(--a-card)', borderRadius: 10, border: '1px solid var(--a-line)' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--a-clay)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>L</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Lina R.</div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>Supervisor</div>
          </div>
          <IconDots size={14} color="var(--a-ink3)" />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ padding: '18px 28px 12px', borderBottom: '1px solid var(--a-line)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Tuesday · May 27</div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', marginTop: 2, lineHeight: 1.1 }}>Good morning, <em style={{ color: 'var(--a-sage)', fontStyle: 'italic' }}>Lina</em></div>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 4 }}>4 houses · 22 staff · <span style={{ color: 'var(--a-clay)', fontWeight: 600 }}>8 things need you</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ background: 'var(--a-paper)', borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--a-line)', minWidth: 240 }}>
              <IconSearch size={14} color="var(--a-ink3)" />
              <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>Search staff, items, residents…</span>
            </div>
            <button style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconPlus size={13} sw={2.4} /> New
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 32px' }}>
          {/* Top stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
            <DStat label="Quality of care" value="92" sub="↑ 4 pts · May" tone="good" big />
            <DStat label="Weekly spend" value="$1,034" sub="↓ 6% vs Apr" tone="good" />
            <DStat label="Open shifts (7d)" value="3" sub="Wed Willow, Sat Maple ×2" tone="warn" />
            <DStat label="Onboarding" value="4" sub="2 finishing this week" />
          </div>

          {/* Houses grid */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>Houses today</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'North', 'South'].map((b, i) => (
                <button key={b} style={{
                  border: i === 0 ? '0' : '1px solid var(--a-line)',
                  background: i === 0 ? 'var(--a-ink)' : 'transparent',
                  color: i === 0 ? 'var(--a-card)' : 'var(--a-ink2)',
                  padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist',
                }}>{b}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <DHouseCard house={HOUSES[0]} urgent={3} staff={2} present={3} drives={2}
              needs={['Out: oat milk, bananas', 'R. Johnson MAR 2pm', '1:30p drive to dentist']} />
            <DHouseCard house={HOUSES[1]} urgent={1} staff={1} present={3} drives={0}
              needs={['Low: paper towels, chicken', 'Devon shift note (8:14a)']} />
            <DHouseCard house={HOUSES[2]} urgent={4} staff={2} present={4} drives={3}
              needs={['Refill: K. Diaz', 'Dryer service', 'Shop run 4p']} />
            <DHouseCard house={HOUSES[3]} urgent={0} staff={2} present={4} drives={1}
              needs={['All clear · 2 incident-free wks']} clear />
          </div>

          {/* Two-column lower */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            {/* Decisions queue */}
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--a-clay)' }} />
                <span className="serif" style={{ fontSize: 18 }}>Decisions for you</span>
                <span style={{ fontSize: 10, color: 'var(--a-ink3)', background: 'var(--a-paper)', padding: '1px 7px', borderRadius: 999, marginLeft: 'auto' }}>5 open</span>
              </div>
              <DDecision tag="Promote" tone="good" who="Aisha Mendez"
                why="2.1 yrs · 96 quality · 100% MAR · Lead-ready" cta="Approve" />
              <DDecision tag="Coach" tone="warn" who="Marcus Lewis"
                why="4 lates in 2 wks · 64 quality · 6mo · last note: tardy w/o notice" cta="Open scorecard" />
              <DDecision tag="Hire" tone="info" who="3 candidates · DSP, Willow"
                why="Devon flagged 2 strong · open 3-11 shift unfilled Wed" cta="Review" />
              <DDecision tag="Schedule conflict" tone="warn" who="Sat 5/31"
                why="Maple short 2 DSPs · Priya offered to swap from Cedar" cta="Approve swap" last />
            </div>

            {/* Right column: recent activity + resources */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '16px 18px' }}>
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

              <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="serif" style={{ fontSize: 18 }}>Cross-house swaps</span>
                  <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>2 suggested</span>
                </div>
                <SwapRow from={HOUSES[1]} to={HOUSES[0]} item="Toilet paper · 12 rolls" note="Willow surplus → Oak out" />
                <div style={{ height: 1, background: 'var(--a-line)', margin: '10px 0' }} />
                <SwapRow from={HOUSES[3]} to={HOUSES[2]} item="Laundry pods · 1 box" note="Cedar over-bought" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DStat({ label, value, sub, tone, big }) {
  const toneColor = tone === 'good' ? '#3f7050' : tone === 'warn' ? '#a47012' : tone === 'bad' ? '#a93a25' : 'var(--a-ink3)';
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: big ? 34 : 28, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: toneColor, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function DHouseCard({ house, urgent, staff, present, drives, needs, clear }) {
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ height: 4, background: house.color }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: house.color, letterSpacing: '0.1em', background: `${house.color}1a`, padding: '2px 6px', borderRadius: 3 }}>{house.short}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{house.name}</span>
          </div>
          {urgent > 0 ? (
            <span style={{ background: '#d44e3a', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>{urgent}</span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--a-sage)', fontWeight: 600 }}>OK</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: 'var(--a-ink2)' }}>
          <span><span style={{ fontWeight: 600 }}>{staff}</span>/2 staff</span>
          <span><span style={{ fontWeight: 600 }}>{present}</span>/{house.residents} in</span>
          <span><span style={{ fontWeight: 600 }}>{drives}</span> drives</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--a-line)' }}>
          {needs.map((n, i) => (
            <div key={i} style={{ fontSize: 11.5, color: 'var(--a-ink2)', padding: '2px 0', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ color: house.color, fontWeight: 600 }}>·</span>
              <span style={{ flex: 1 }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DDecision({ tag, tone, who, why, cta, last }) {
  const toneMap = {
    good: { c: '#3f7050', bg: '#dee6df' },
    warn: { c: '#a47012', bg: '#f5e9d6' },
    info: { c: '#3c5887', bg: '#dde6f0' },
  }[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: last ? '' : '1px dashed var(--a-line)' }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: toneMap.c, background: toneMap.bg, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0, marginTop: 1 }}>{tag}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{who}</div>
        <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 1 }}>{why}</div>
      </div>
      <button style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: 'Geist', flexShrink: 0 }}>{cta}</button>
    </div>
  );
}

Object.assign(window, { DesktopSupervisor, DStat, DHouseCard, DDecision });
