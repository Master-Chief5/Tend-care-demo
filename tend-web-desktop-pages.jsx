// tend-web-desktop-pages.jsx — desktop page bodies for each tab

// shared header for desktop pages
function DTopBar({ title, sub, actions, search = true }) {
  return (
    <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--a-line)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
      <div>
        <div className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {search && (
          <div style={{ background: 'var(--a-paper)', borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--a-line)', minWidth: 220 }}>
            <IconSearch size={14} color="var(--a-ink3)" />
            <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>Search…</span>
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}

// ── Today (supervisor dashboard, sans its own rail) ───────────────────
function PageTodayDesktop() {
  return (
    <>
      <DTopBar
        title={<>Good morning, <em style={{ color: 'var(--a-sage)', fontStyle: 'italic' }}>Lina</em></>}
        sub={<>Tuesday · May 27 · 4 houses · 22 staff · <span style={{ color: 'var(--a-clay)', fontWeight: 600 }}>8 things need you</span></>}
        actions={<button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> New</button>}
      />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          <DStat label="Quality of care" value="92" sub="↑ 4 pts · May" tone="good" big />
          <DStat label="Weekly spend" value="$1,034" sub="↓ 6% vs Apr" tone="good" />
          <DStat label="Open shifts (7d)" value="3" sub="Wed Willow, Sat Maple ×2" tone="warn" />
          <DStat label="Onboarding" value="4" sub="2 finishing this week" />
        </div>

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
          <DHouseCard house={HOUSES[0]} urgent={3} staff={2} present={3} drives={2}
            needs={['Out: oat milk, bananas', 'R. Johnson MAR 2pm', '1:30p drive to dentist']} />
          <DHouseCard house={HOUSES[1]} urgent={1} staff={1} present={3} drives={0}
            needs={['Low: paper towels, chicken', 'Devon shift note (8:14a)']} />
          <DHouseCard house={HOUSES[2]} urgent={4} staff={2} present={4} drives={3}
            needs={['Refill: K. Diaz', 'Dryer service', 'Shop run 4p']} />
          <DHouseCard house={HOUSES[3]} urgent={0} staff={2} present={4} drives={1}
            needs={['All clear · 2 incident-free wks']} clear />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16 }}>
          <div style={dCard}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={dCard}>
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
            <div style={dCard}>
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
    </>
  );
}

// ── Houses page ───────────────────────────────────────────────────────
function PageHousesDesktop() {
  const houseData = [
    { house: HOUSES[0], urgent: 3, staff: 2, present: 3, drives: 2, needs: [
      { kind: 'grocery', text: 'Out: oat milk, bananas, dish soap' },
      { kind: 'med', text: 'R. Johnson — 2pm MAR signoff' },
      { kind: 'drive', text: '1:30pm — M. Lee to dentist (Aisha)' },
    ]},
    { house: HOUSES[1], urgent: 1, staff: 1, present: 3, drives: 0, needs: [
      { kind: 'grocery', text: 'Running low: paper towels, chicken' },
      { kind: 'note', text: 'D. Park left a shift note (8:14am)' },
    ]},
    { house: HOUSES[2], urgent: 4, staff: 2, present: 4, drives: 3, needs: [
      { kind: 'med', text: 'Refill: K. Diaz, levetiracetam' },
      { kind: 'maint', text: 'Dryer making a noise — vendor TBD' },
      { kind: 'grocery', text: 'Shopping run scheduled — Aisha, 4pm' },
    ]},
    { house: HOUSES[3], urgent: 0, staff: 2, present: 4, drives: 1, needs: [
      { kind: 'note', text: 'All clear · 2 incident-free weeks' },
    ]},
  ];
  return (
    <>
      <DTopBar title="Houses" sub="4 houses · North + South branches"
        actions={<button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Add house</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          {houseData.map(({ house, urgent, staff, present, drives, needs }) => (
            <HouseCardWide key={house.id} house={house} urgent={urgent} staff={staff} present={present} drives={drives} needs={needs} />
          ))}
        </div>
      </div>
    </>
  );
}

function HouseCardWide({ house, urgent, staff, present, drives, needs }) {
  const c = house.color;
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '16px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
              <span className="serif" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>{house.name}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 3 }}>
              {house.addr} · {house.branch} · mgr {house.manager}
            </div>
          </div>
          {urgent > 0 ? (
            <span style={{ background: '#d44e3a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{urgent}</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 600 }}>ALL CLEAR</span>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 18px 14px', borderBottom: '1px dashed var(--a-line)' }}>
        <Stat label="On shift" big={staff} sub="of 2" />
        <Stat label="Residents in" big={present} sub={`of ${house.residents}`} />
        <Stat label="Today's drives" big={drives} sub="planned" />
      </div>
      <div style={{ padding: '12px 18px 14px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Needs attention</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {needs.map((s, i) => <NeedRow key={i} {...s} color={c} />)}
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--a-line)' }}>
        <button style={{ flex: 1, padding: '11px 0', background: 'transparent', border: 0, fontSize: 12.5, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', fontWeight: 500, cursor: 'pointer' }}>
          <IconChat size={14} sw={1.7} /> Message
        </button>
        <div style={{ width: 1, background: 'var(--a-line)' }} />
        <button style={{ flex: 1, padding: '11px 0', background: 'transparent', border: 0, fontSize: 12.5, fontWeight: 600, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', cursor: 'pointer' }}>
          Open house <IconArrow size={14} sw={2} />
        </button>
      </div>
    </div>
  );
}

// ── Schedule page (desktop = full grid) ───────────────────────────────
function PageScheduleDesktop() {
  const days = ['Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30', 'Sat 31', 'Sun 1'];
  return (
    <>
      <DTopBar title="Schedule" sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconKey size={12} sw={2} color="var(--a-sage)" /> You see all 4 houses · Staff only see their own shifts.</span>}
        actions={<>
          <button style={dBtnGhost}><IconEye size={13} sw={1.7} /> All branches</button>
          <button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> New shift</button>
        </>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
          <span className="serif" style={{ fontSize: 20, letterSpacing: '-0.01em' }}>May 26 – Jun 1</span>
          <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} /></button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Open shifts: <strong style={{ color: 'var(--a-clay)' }}>3</strong></span>
        </div>

        {/* week grid */}
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)' }}>
            <div style={{ padding: '10px 14px', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>House</div>
            {days.map((d, i) => {
              const [day, num] = d.split(' ');
              return (
                <div key={d} style={{ padding: '10px 0', textAlign: 'center', borderLeft: '1px solid var(--a-line)' }}>
                  <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{day}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: i === 1 ? 'var(--a-clay)' : 'var(--a-ink)' }}>{num}</div>
                </div>
              );
            })}
          </div>
          {/* House rows */}
          {HOUSES.map(h => (
            <ScheduleRow key={h.id} house={h} />
          ))}
        </div>
      </div>
    </>
  );
}

function ScheduleRow({ house }) {
  // For each day, give a couple of shift bars. Mock data.
  const dayShifts = [
    [['7a–3p', 'Aisha M.'], ['3p–11p', 'Carmen V.']],
    [['7a–3p', 'Aisha M.'], ['7a–3p', 'Jay B.'], ['3p–11p', 'Carmen V.']],
    [['7a–3p', 'Aisha M.'], ['3p–11p', 'OPEN']],
    [['7a–3p', 'Aisha M.'], ['3p–11p', 'Carmen V.']],
    [['7a–3p', 'Aisha M.'], ['3p–11p', 'Carmen V.']],
    [['7a–3p', 'Jay B.'], ['3p–11p', 'Aisha M.']],
    [['7a–3p', 'Jay B.'], ['3p–11p', 'Aisha M.']],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', borderBottom: '1px solid var(--a-line)', minHeight: 86 }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderRight: '1px solid var(--a-line)' }}>
        <span style={{ width: 6, height: 26, background: house.color, borderRadius: 4 }} />
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{house.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{house.branch}</div>
        </div>
      </div>
      {dayShifts.map((shifts, i) => (
        <div key={i} style={{ padding: '8px 6px', borderLeft: i === 0 ? '' : '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {shifts.map((s, j) => {
            const open = s[1] === 'OPEN';
            return (
              <div key={j} style={{
                background: open ? 'transparent' : house.color,
                border: open ? `1.5px dashed ${house.color}` : 'none',
                color: open ? house.color : '#fff',
                borderRadius: 6, padding: '4px 7px', fontSize: 11, fontWeight: open ? 600 : 500,
              }}>
                <div style={{ fontSize: 9.5, opacity: open ? 1 : 0.8, fontWeight: 600 }}>{s[0]}</div>
                <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{s[1]}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Driving / Resources / Staff / Orientation / Team — desktop versions
// Use a centered "phone-style" content column + a side panel where useful.

function CenteredColumn({ children, width = 760, side }) {
  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
      <div style={{ maxWidth: side ? '100%' : width, margin: side ? 0 : '0 auto', display: side ? 'grid' : 'block', gridTemplateColumns: side ? `minmax(0, ${width}px) minmax(280px, 1fr)` : '', gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

function PageDrivingDesktop() {
  return (
    <>
      <DTopBar title="Driving" sub="Logs · mileage · vehicles"
        actions={<button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Start trip</button>} />
      <CenteredColumn width={780} side>
        {/* main column */}
        <div>
          {/* Active trip */}
          <div style={{ background: 'var(--a-ink)', color: '#fbf6ec', borderRadius: 16, padding: '20px 22px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: '#7dd28a', boxShadow: '0 0 0 4px rgba(125,210,138,0.2)' }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', color: '#7dd28a', textTransform: 'uppercase' }}>Trip in progress</span>
            </div>
            <div className="serif" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>M. Lee → Dr. Patel's office</div>
            <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>Driver: Aisha M. · Van #2 · Oak House</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(251,246,236,0.12)' }}>
              <Mini label="Time" value="0:18" />
              <Mini label="Distance" value="4.2 mi" />
              <Mini label="Purpose" value="Medical" />
              <Mini label="ETA" value="0:09" />
            </div>
          </div>

          {/* Recent trips wide */}
          <div style={{ ...dCard, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="serif" style={{ fontSize: 18 }}>Recent trips</span>
              <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>Last 7 days · 34 trips</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 90px 80px', padding: '6px 18px', borderTop: '1px solid var(--a-line)', borderBottom: '1px solid var(--a-line)', background: 'var(--a-paper)', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              <span>When</span><span>Trip</span><span>Driver</span><span>Purpose</span><span style={{ textAlign: 'right' }}>Miles</span>
            </div>
            {[
              ['Today · 9:14a', 'willow', 'Willow → Walmart', 'Devon P.', 'Grocery', '3.8'],
              ['Today · 8:02a', 'maple', 'Maple → Day program', 'Saira K.', 'Program', '6.1'],
              ['Mon · 4:40p', 'oak', 'Oak → Dr. Patel', 'Aisha M.', 'Medical', '4.2'],
              ['Mon · 11:20a', 'oak', 'Oak → Library', 'Jay B.', 'Activity', '1.6'],
              ['Sun · 2:30p', 'cedar', 'Cedar → Park', 'Tomas R.', 'Activity', '5.4'],
              ['Sun · 9:15a', 'maple', 'Maple → Church', 'Reni T.', 'Faith', '2.2'],
            ].map((row, i) => {
              const h = HOUSES.find(x => x.id === row[1]);
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 90px 80px', padding: '10px 18px', borderBottom: '1px solid var(--a-line)', fontSize: 12.5, alignItems: 'center' }}>
                  <span style={{ color: 'var(--a-ink3)', fontSize: 11.5 }}>{row[0]}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 3, height: 16, background: h.color, borderRadius: 2 }} />
                    {row[2]}
                  </span>
                  <span style={{ color: 'var(--a-ink2)' }}>{row[3]}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{row[4]}</span>
                  <span className="tnum" style={{ textAlign: 'right', fontWeight: 500 }}>{row[5]}<span style={{ color: 'var(--a-ink3)', fontWeight: 400, fontSize: 10 }}> mi</span></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={dCard}>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>This pay period</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span className="serif tnum" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em' }}>248.4</span>
              <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>mi · ${'\u200a'}<span className="tnum" style={{ fontWeight: 600, color: 'var(--a-ink)' }}>166.43</span></span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: 'var(--a-ink3)' }}>
              <span>34 trips</span><span>·</span><span>6 days remaining</span>
            </div>
            <svg viewBox="0 0 200 40" style={{ width: '100%', height: 40, marginTop: 10 }}>
              <polyline points="0,30 20,28 40,22 60,24 80,18 100,20 120,15 140,17 160,12 180,9 200,11" fill="none" stroke="var(--a-sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,30 20,28 40,22 60,24 80,18 100,20 120,15 140,17 160,12 180,9 200,11 200,40 0,40" fill="var(--a-sage)" fillOpacity="0.08" stroke="none" />
            </svg>
          </div>

          <div style={dCard}>
            <span className="serif" style={{ fontSize: 18 }}>Vehicles</span>
            <div style={{ marginTop: 8 }}>
              <VehicleRow name="Van #1 · Sienna '22" sub="Oak / Willow · 38,402 mi" status="ok" />
              <VehicleRow name="Van #2 · Sienna '21" sub="Aisha out · 51,108 mi" status="active" />
              <VehicleRow name="Van #3 · Odyssey '23" sub="Oil due 4/8" status="due" last />
            </div>
          </div>
        </div>
      </CenteredColumn>
    </>
  );
}

function PageResourcesDesktop() {
  return (
    <>
      <DTopBar title="Resources" sub="Spend insights · grocery · cross-house"
        actions={<button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Generate list</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          <DStat label="Weekly avg" value="$1,034" sub="↓ 6% vs Apr" tone="good" />
          <DStat label="Per resident" value="$64" sub="↓ $4 vs Apr" tone="good" />
          <DStat label="Highest house" value="Maple" sub="$1,250 · ↑ 8%" tone="warn" />
          <DStat label="Lowest house" value="Willow" sub="$840 · steady" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={dCard}>
            <span className="serif" style={{ fontSize: 20 }}>Spend by house · May</span>
            <div style={{ marginTop: 14 }}>
              <HouseBar house={HOUSES[0]} value="$1,180" pct={0.94} />
              <HouseBar house={HOUSES[1]} value="$840" pct={0.66} />
              <HouseBar house={HOUSES[2]} value="$1,250" pct={1} />
              <HouseBar house={HOUSES[3]} value="$910" pct={0.72} last />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--a-ink3)', marginTop: 8 }}>
              <span>0</span><span>$1,250</span>
            </div>
          </div>
          <div style={{ background: '#f5e9d6', border: '1px solid #e7d289', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <IconFlag size={14} color="#a47012" sw={2} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#a47012', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Worth a look</span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--a-ink2)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--a-ink)' }}>Maple Run</strong> spent <strong>34% more</strong> on snacks this month vs. last 3 months. Mostly chips and soda.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist' }}>Send to Saira</button>
              <button style={{ background: 'transparent', color: 'var(--a-ink2)', border: 0, padding: '6px 12px', fontSize: 11.5, fontFamily: 'Geist' }}>Dismiss</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={dCard}>
            <span className="serif" style={{ fontSize: 20 }}>What you buy most</span>
            <div style={{ marginTop: 8 }}>
              <TopItem rank={1} name="Milk (gallon)" qty="84 ct" trend="steady" />
              <TopItem rank={2} name="Bread" qty="62 loaves" trend="up" />
              <TopItem rank={3} name="Eggs (dozen)" qty="48 ct" trend="steady" />
              <TopItem rank={4} name="Chicken breast" qty="44 lb" trend="up" />
              <TopItem rank={5} name="Paper towels" qty="38 pk" trend="down" last />
            </div>
          </div>
          <div style={dCard}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className="serif" style={{ fontSize: 20 }}>Cross-house swaps</span>
              <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>save a shop run</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <SwapRow from={HOUSES[1]} to={HOUSES[0]} item="Toilet paper · 12 rolls" note="Willow surplus → Oak out" />
              <div style={{ height: 1, background: 'var(--a-line)', margin: '12px 0' }} />
              <SwapRow from={HOUSES[3]} to={HOUSES[2]} item="Laundry pods · 1 box" note="Cedar overbought last week" />
              <div style={{ height: 1, background: 'var(--a-line)', margin: '12px 0' }} />
              <SwapRow from={HOUSES[0]} to={HOUSES[3]} item="Coffee · 1 bag" note="Oak overbought · Cedar low" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PageStaffDesktop() {
  return (
    <>
      <DTopBar title="Staff" sub="22 staff · 4 in onboarding"
        actions={<button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Hire</button>} />
      <CenteredColumn width={820} side>
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['All', 'Oak', 'Willow', 'Maple', 'Cedar'].map((b, i) => (
              <button key={b} style={{
                border: i === 0 ? '0' : '1px solid var(--a-line)',
                background: i === 0 ? 'var(--a-ink)' : 'transparent',
                color: i === 0 ? 'var(--a-card)' : 'var(--a-ink2)',
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontFamily: 'Geist', fontWeight: 500,
              }}>{b}</button>
            ))}
          </div>

          <StaffCard name="Aisha Mendez" role="DSP · Lead" house="oak" score={96} sub="2.1 yrs · On track for promo" highlight="promo" />
          <StaffCard name="Jay Brooks" role="DSP" house="oak" score={88} sub="2.0 yrs · MAR perfect 90d" />
          <StaffCard name="Devon Park" role="House mgr" house="willow" score={94} sub="3.4 yrs · Family ★ 5.0" />
          <StaffCard name="Saira Khan" role="House mgr" house="maple" score={89} sub="1.2 yrs" />
          <StaffCard name="Marcus Lewis" role="DSP" house="maple" score={64} sub="0.5 yrs · 4 late in 2wk" highlight="concern" />
          <StaffCard name="Carmen Vela" role="DSP" house="oak" score={82} sub="6 mo · Orientation 80%" highlight="orient" />
          <StaffCard name="Priya Nair" role="DSP" house="cedar" score={91} sub="1.8 yrs" />
          <StaffCard name="Reni Tate" role="DSP" house="maple" score={87} sub="1.5 yrs" />
          <StaffCard name="Tomas Reed" role="House mgr" house="cedar" score={93} sub="4.0 yrs" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={dCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="serif" style={{ fontSize: 18 }}>Quality of care</span>
              <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>↑ 4 pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <RingChart pct={0.92} color="var(--a-sage)" size={60} />
              <div>
                <div className="serif tnum" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.02em' }}>92</div>
                <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2 }}>out of 100 · May</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              <Pill color="var(--a-sage)">MAR · 100%</Pill>
              <Pill color="var(--a-sage)">Notes · 96%</Pill>
              <Pill color="var(--a-clay)">Late · 8%</Pill>
              <Pill color="var(--a-sage)">Family ★ 4.7</Pill>
            </div>
          </div>

          <div style={dCard}>
            <span className="serif" style={{ fontSize: 18 }}>Decisions for you</span>
            <div style={{ marginTop: 8 }}>
              <DDecision tag="Promote" tone="good" who="Aisha Mendez" why="Lead-ready" cta="Open" />
              <DDecision tag="Coach" tone="warn" who="Marcus Lewis" why="4 lates in 2 wks" cta="Open" last />
            </div>
          </div>
        </div>
      </CenteredColumn>
    </>
  );
}

function PageOrientationDesktop() {
  return (
    <>
      <DTopBar title="Orientation" sub="4 new hires in their first 30 days"
        actions={<button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Add hire</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          <NewHireCard name="Carmen Vela" house="oak" mentor="Lina R." day={6} pct={0.20} next="Read: Resident profiles" />
          <NewHireCard name="Theo Walker" house="willow" mentor="Devon P." day={12} pct={0.42} next="Shadow shift #2" />
          <NewHireCard name="Iris Halloway" house="maple" mentor="Saira K." day={3} pct={0.10} next="House walkthrough" />
          <NewHireCard name="Mateo Ruiz" house="cedar" mentor="Tomas R." day={22} pct={0.78} next="Solo shift signoff" />
        </div>

        <div style={{ marginTop: 24 }}>
          <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>The Roots plan</span>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 4, marginBottom: 14 }}>30 days, four weeks, mentor-led. Self-paced w/ Friday check-ins.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <RootWeek num={1} title="Find your footing" items={['Welcome video', 'Meet your mentor', 'House walkthrough', 'Resident profiles', 'Shadow shift #1']} />
            <RootWeek num={2} title="On the floor" items={['Daily routines', 'Documentation basics', 'Family intros', 'Shadow shift #2', 'Activity planning', 'Mid-week check-in']} />
            <RootWeek num={3} title="Medications & docs" items={['MAR training', 'Med pass observed', 'Incident reporting', 'Quality basics', 'Mock audit']} />
            <RootWeek num={4} title="Solo + sign-off" items={['Solo shift #1', 'Solo shift #2', 'Mentor sign-off', '30-day review']} />
          </div>
        </div>
      </div>
    </>
  );
}

function NewHireCard({ name, house, mentor, day, pct, next }) {
  const h = HOUSES.find(x => x.id === house);
  const initials = name.split(' ').map(n => n[0]).join('');
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: h.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{h.name} · mentor {mentor}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="serif tnum" style={{ fontSize: 18, fontWeight: 500, color: 'var(--a-sage)', lineHeight: 1 }}>{Math.round(pct * 100)}%</div>
          <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Day {day}/30</div>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--a-paper)', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--a-sage)' }} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--a-ink2)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--a-clay)', background: '#fadcd7', padding: '2px 6px', borderRadius: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Next</span>
        {next}
      </div>
    </div>
  );
}

function RootWeek({ num, title, items }) {
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--a-paper)', color: 'var(--a-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '1.5px solid var(--a-line)' }}>{num}</div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>Week {num}</div>
          <div className="serif" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>{title}</div>
        </div>
      </div>
      <ul style={{ paddingLeft: 16, margin: '10px 0 0', listStyle: 'none' }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 12, color: 'var(--a-ink2)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--a-ink3)' }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageTeamDesktop() {
  // Two-pane: channel list + open conversation
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: 320, borderRight: '1px solid var(--a-line)', display: 'flex', flexDirection: 'column', background: 'var(--a-card)', flexShrink: 0 }}>
        <div style={{ padding: '18px 18px 10px' }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>Team chat</div>
          <div style={{ background: 'var(--a-paper)', borderRadius: 999, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--a-line)', marginTop: 10 }}>
            <IconSearch size={13} color="var(--a-ink3)" />
            <input placeholder="Search messages" style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 12.5, fontFamily: 'Geist', color: 'var(--a-ink2)' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
          <SectionLabel>House channels</SectionLabel>
          <ChatRow house="oak" lastFrom="Aisha" preview="Got the oat milk + bananas, heading back" time="3m" unread={2} />
          <ChatRow house="willow" lastFrom="Devon" preview="Need a fill-in for Wed 3-11" time="22m" unread={1} />
          <ChatRow house="maple" lastFrom="Saira" preview="Dryer guy coming Thu morning" time="1h" />
          <ChatRow house="cedar" lastFrom="Tomas" preview="All set for the week" time="3h" />
          <SectionLabel>Direct messages</SectionLabel>
          <ChatRow dm name="Carmen Vela" preview="Hey Lina, where do I park on Mon?" time="Sun" unread={1} />
          <ChatRow dm name="Marcus Lewis" preview="Sorry about being late again" time="Sat" />
        </div>
      </div>

      {/* conversation */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--a-bg)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--a-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 26, height: 26, borderRadius: 6, background: HOUSES[0].color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>{HOUSES[0].short}</span>
          <div>
            <div className="serif" style={{ fontSize: 18, letterSpacing: '-0.01em' }}># Oak House</div>
            <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>4 members · Aisha, Jay, Carmen, Lina</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          <DayDivider label="Today" />
          <Msg who="Aisha M." color={HOUSES[0].color} time="8:12 AM" text="Morning all — R. Johnson had a rough night, going to call mom around 9." />
          <Msg who="Lina (you)" color="var(--a-clay)" time="8:15 AM" me text="Thx Aisha. Note in the chart? I'll loop in Dr. Patel if needed." />
          <Msg who="Aisha M." color={HOUSES[0].color} time="8:16 AM" text="Note's in. Will keep you posted." />
          <Msg who="Aisha M." color={HOUSES[0].color} time="9:08 AM" text="Mom called back — she's coming for lunch. Also we're out of oat milk + bananas, adding to grocery." attachment="grocery" />
          <Msg who="Lina (you)" color="var(--a-clay)" time="9:11 AM" me text="🙏" />
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--a-line)' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <input placeholder="Message #Oak House…" style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 13.5, fontFamily: 'Geist', color: 'var(--a-ink)' }} />
            <button style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'Geist' }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 14px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--a-line)' }} />
      <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--a-line)' }} />
    </div>
  );
}

function Msg({ who, color, time, text, me, attachment }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexDirection: me ? 'row-reverse' : 'row' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{who[0]}</div>
      <div style={{ maxWidth: '70%' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexDirection: me ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{who}</span>
          <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{time}</span>
        </div>
        <div style={{
          background: me ? 'var(--a-ink)' : 'var(--a-card)',
          color: me ? 'var(--a-card)' : 'var(--a-ink)',
          padding: '10px 14px', borderRadius: 12,
          border: me ? '0' : '1px solid var(--a-line)',
          fontSize: 13.5, lineHeight: 1.45,
        }}>{text}</div>
        {attachment === 'grocery' && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5e9d6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a47012' }}>
              <IconCart size={16} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Oak grocery list updated</div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>+2 items · oat milk, bananas</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── shared inline styles ──────────────────────────────────────────────
const dCard = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '16px 18px' };
const dBtnSolid = { background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' };
const dBtnGhost = { background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '7px 14px', fontSize: 12, color: 'var(--a-ink2)', fontFamily: 'Geist', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' };

Object.assign(window, {
  DTopBar, PageTodayDesktop, PageHousesDesktop, HouseCardWide, PageScheduleDesktop, ScheduleRow,
  PageDrivingDesktop, PageResourcesDesktop, PageStaffDesktop, PageOrientationDesktop,
  NewHireCard, RootWeek, PageTeamDesktop, DayDivider, Msg, CenteredColumn,
  dCard, dBtnSolid, dBtnGhost,
});
