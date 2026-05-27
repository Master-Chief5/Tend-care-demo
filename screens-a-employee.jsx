// screens-a-employee.jsx — Staff-view screens: My Day, My Schedule, Me

// ── My Day (staff home screen) ─────────────────────────────────────────
function ScreenA_MyDay() {
  const house = HOUSES[0]; // Oak House — Aisha's house

  const tasks = [
    { kind: 'med',     text: 'R. Johnson — 2pm meds, need second signoff', done: false, urgent: true },
    { kind: ‘drive’,   text: "M. Lee → Dr. Patel’s office · 1:30pm", done: false },
    { kind: 'grocery', text: 'Grocery run to Whole Foods · 4pm', done: false },
    { kind: 'note',    text: 'Write end-of-shift note', done: false },
    { kind: 'grocery', text: 'Checked in with Ruth Johnson', done: true },
  ];

  const kindMap = {
    med:     { tag: 'MAR',    bg: '#fadcd7', tc: '#a93a25', ico: IconCheck },
    drive:   { tag: 'Drive',  bg: '#dde6f0', tc: '#3c5887', ico: IconCar },
    grocery: { tag: 'Grocery',bg: '#f5e9d6', tc: '#a47012', ico: IconCart },
    note:    { tag: 'Note',   bg: '#e7dfe9', tc: '#5a3a6b', ico: IconBook },
  };

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Greeting */}
        <div style={{ padding: '14px 22px 6px' }}>
          <div style={{ fontSize: 12, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>Tuesday · May 27</div>
          <div className="serif" style={{ fontSize: 30, lineHeight: 1.05, marginTop: 4, letterSpacing: '-0.02em' }}>
            Good morning, <em style={{ fontStyle: 'italic', color: 'var(--a-sage)' }}>Aisha</em>
          </div>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 4 }}>DSP Lead · {house.name}</div>
        </div>

        {/* Current shift card */}
        <div style={{ margin: '10px 22px 4px', background: 'var(--a-ink)', borderRadius: 16, padding: '14px 18px', color: '#fbf6ec' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: '#7dd28a', boxShadow: '0 0 0 4px rgba(125,210,138,0.2)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', color: '#7dd28a', textTransform: 'uppercase' }}>On shift now</span>
          </div>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1.1 }}>7:00 AM – 3:00 PM</div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>{house.name} · {house.addr}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(251,246,236,0.12)' }}>
            <div>
              <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Elapsed</div>
              <div className="tnum" style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>2h 48m</div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Remaining</div>
              <div className="tnum" style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>5h 12m</div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>With you</div>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>Jay B.</div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Today's tasks</div>
            <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{tasks.filter(t => t.done).length}/{tasks.length} done</div>
          </div>

          {tasks.map((t, i) => {
            const k = kindMap[t.kind] || kindMap.note;
            const Ico = k.ico;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--a-card)', border: t.urgent ? `1px solid ${k.tc}44` : '1px solid var(--a-line)', borderRadius: 10, marginBottom: 6, opacity: t.done ? 0.5 : 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: t.done ? 'var(--a-paper)' : k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.done ? 'var(--a-ink3)' : k.tc, flexShrink: 0, marginTop: 1 }}>
                  {t.done ? <IconCheck size={14} sw={2.2} color="var(--a-ink3)" /> : <Ico size={14} sw={1.8} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: t.done ? 'var(--a-ink3)' : 'var(--a-ink)', textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.35 }}>{t.text}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: t.done ? 'var(--a-ink3)' : k.tc, background: t.done ? 'var(--a-paper)' : k.bg, padding: '1px 6px', borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k.tag}</span>
                    {t.urgent && !t.done && <span style={{ fontSize: 9, fontWeight: 700, color: '#a93a25', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Urgent</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TabBar active="houses" />
    </div>
  );
}

// ── My Schedule (staff schedule view) ─────────────────────────────────
function ScreenA_MySchedule() {
  const house = HOUSES[0];
  const c = house.color;

  const upcomingShifts = [
    { day: 'Today',  date: 'Tue May 27', time: '7:00 AM – 3:00 PM', status: 'active', note: '2h 48m remaining' },
    { day: 'Tomorrow', date: 'Wed May 28', time: '7:00 AM – 3:00 PM', status: 'scheduled' },
    { day: 'Thursday', date: 'Thu May 29', time: 'OFF',              status: 'off' },
    { day: 'Friday',   date: 'Fri May 30', time: '7:00 AM – 3:00 PM', status: 'scheduled' },
    { day: 'Saturday', date: 'Sat May 31', time: '3:00 PM – 11:00 PM', status: 'swap', note: 'Swap with Carmen V.' },
    { day: 'Sunday',   date: 'Sun Jun 1',  time: 'OFF',              status: 'off' },
    { day: 'Monday',   date: 'Mon Jun 2',  time: '7:00 AM – 3:00 PM', status: 'scheduled' },
  ];

  const statusMap = {
    active:    { tag: 'On now',   bg: '#dee6df', tc: '#3f604d' },
    scheduled: { tag: 'Upcoming', bg: 'var(--a-paper)', tc: 'var(--a-ink3)' },
    off:       { tag: 'Day off',  bg: 'var(--a-paper)', tc: 'var(--a-ink3)' },
    swap:      { tag: 'Swap req', bg: '#e7dfe9', tc: '#5a3a6b' },
  };

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>My Schedule</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>May 26 – Jun 1 · {house.name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '7px 12px', fontSize: 11.5, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Geist' }}>
              <IconKey size={12} sw={2} color="var(--a-sage)" /> My shifts
            </button>
          </div>
        </div>

        {/* Pay period summary */}
        <div style={{ margin: '4px 22px 14px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>This period</div>
            <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 2 }}>72<span style={{ fontSize: 12, color: 'var(--a-ink3)', fontWeight: 400, marginLeft: 3 }}>hrs</span></div>
          </div>
          <div style={{ width: 1, background: 'var(--a-line)' }} />
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Open shifts</div>
            <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 2, color: 'var(--a-clay)' }}>1</div>
          </div>
          <div style={{ width: 1, background: 'var(--a-line)' }} />
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>OT risk</div>
            <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 2, color: 'var(--a-sage)' }}>Low</div>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 22px 24px' }}>
          {upcomingShifts.map((s, i) => {
            const st = statusMap[s.status];
            const isOff = s.status === 'off';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, marginBottom: 6, opacity: isOff ? 0.6 : 1 }}>
                <div style={{ width: 3, height: 36, background: isOff ? 'var(--a-line)' : c, borderRadius: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.status === 'active' ? 'var(--a-sage)' : 'var(--a-ink)' }}>{s.day}</span>
                    <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{s.date}</span>
                  </div>
                  <div style={{ fontSize: 13, color: isOff ? 'var(--a-ink3)' : 'var(--a-ink)', fontWeight: isOff ? 400 : 500, marginTop: 2 }}>{s.time}</div>
                  {s.note && <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 2 }}>{s.note}</div>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: st.tc, background: st.bg, padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>{st.tag}</span>
              </div>
            );
          })}
        </div>
      </div>
      <TabBar active="sched" />
    </div>
  );
}

// ── Me (staff / manager profile screen) ───────────────────────────────
function ScreenA_Me() {
  const house = HOUSES[0];

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Me</div>
          <button style={{ background: 'transparent', border: '1px solid var(--a-line)', color: 'var(--a-ink2)', borderRadius: 999, padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist' }}>
            <IconDots size={13} /> Settings
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          {/* Profile card */}
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 18, padding: '20px 18px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: house.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, margin: '0 auto 12px', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>AM</div>
            <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>Aisha Mendez</div>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 4 }}>DSP Lead · {house.name}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              <Pill color="var(--a-sage)">2.1 yrs</Pill>
              <Pill color="var(--a-sage)">Lead track</Pill>
              <Pill color="var(--a-sage)">MAR · 100%</Pill>
            </div>
          </div>

          {/* Quality score */}
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Quality of care · May</div>
              <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>↑ 3 pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <RingChart pct={0.96} color="var(--a-sage)" size={52} />
              <div>
                <div className="serif tnum" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>96</div>
                <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2 }}>out of 100</div>
              </div>
              <div style={{ flex: 1 }}>
                <ScoreRow label="Notes filed" pct={1.0} />
                <ScoreRow label="On-time" pct={0.97} />
                <ScoreRow label="MAR" pct={1.0} />
                <ScoreRow label="Fam. rating" text="★ 4.9" />
              </div>
            </div>
          </div>

          {/* Promotion track */}
          <div style={{ background: '#dee6df', border: '1px solid #9fc4a8', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <IconUp size={14} color="#3f7050" sw={2.4} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#3f7050', letterSpacing: '0.08em', textTransform: 'uppercase' }}>On track for promotion</span>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.45 }}>
              Lina R. flagged you for Lead promotion. Score needs to stay above 92 for 30 more days.
            </div>
            <div style={{ fontSize: 11, color: '#3f7050', marginTop: 8, fontWeight: 500 }}>24 of 30 days complete · 6 remaining</div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.5)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: '80%', height: '100%', background: '#3f7050', borderRadius: 999 }} />
            </div>
          </div>

          {/* Pay & hours */}
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
            <div className="serif" style={{ fontSize: 18, marginBottom: 10 }}>Pay period</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Hours worked</div>
                <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 4 }}>38.5<span style={{ fontSize: 11, color: 'var(--a-ink3)', fontWeight: 400, marginLeft: 3 }}>hr</span></div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Mileage</div>
                <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 4 }}>62.1<span style={{ fontSize: 11, color: 'var(--a-ink3)', fontWeight: 400, marginLeft: 3 }}>mi</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TabBar active="me" />
    </div>
  );
}

function ScoreRow({ label, pct, text }) {
  const val = text || `${Math.round(pct * 100)}%`;
  const good = !pct || pct >= 0.9;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 10.5, color: 'var(--a-ink3)', flex: 1 }}>{label}</span>
      <span className="tnum" style={{ fontSize: 12, fontWeight: 600, color: good ? '#3f7050' : '#a47012' }}>{val}</span>
    </div>
  );
}

Object.assign(window, { ScreenA_MyDay, ScreenA_MySchedule, ScreenA_Me, ScoreRow });
