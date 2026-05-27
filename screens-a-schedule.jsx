// screens-a-schedule.jsx — Schedule with permission tags, Driving log

// ── Schedule screen ─────────────────────────────────────────────────────
function ScreenA_Schedule() {
  // mini-week of shifts. each shift has house + person + time
  const week = ['Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30', 'Sat 31', 'Sun 1'];
  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Schedule</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '6px 10px', fontSize: 11.5, color: 'var(--a-ink2)', display: 'inline-flex', gap: 4, alignItems: 'center', fontFamily: 'Geist' }}>
              <IconEye size={13} sw={1.8} /> All branches
            </button>
            <button style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconPlus size={16} sw={2.2} />
            </button>
          </div>
        </div>

        {/* Permission notice */}
        <div style={{ padding: '4px 22px 14px' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconKey size={14} color="var(--a-sage)" sw={1.8} />
            <span style={{ fontSize: 11.5, color: 'var(--a-ink2)', flex: 1 }}>You see <strong>all 4 houses</strong>. Staff only see their own shifts.</span>
            <IconChev size={14} color="var(--a-ink3)" />
          </div>
        </div>

        {/* Week ribbon */}
        <div style={{ padding: '0 22px 14px', display: 'flex', gap: 6 }}>
          {week.map((d, i) => {
            const sel = i === 1;
            const [day, num] = d.split(' ');
            return (
              <div key={d} style={{
                flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 10,
                background: sel ? 'var(--a-ink)' : 'transparent',
                color: sel ? 'var(--a-card)' : 'var(--a-ink2)',
                border: sel ? '0' : '1px solid var(--a-line)',
              }}>
                <div style={{ fontSize: 9.5, letterSpacing: '0.04em' }}>{day}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}>{num}</div>
              </div>
            );
          })}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 22px 24px' }}>
          {/* By house */}
          {HOUSES.map(h => (
            <div key={h.id} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: h.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink)', letterSpacing: '-0.005em' }}>{h.name}</span>
                <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>· {h.branch}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--a-ink3)', background: 'var(--a-paper)', padding: '1px 6px', borderRadius: 999, letterSpacing: '0.04em' }}>{h.id === 'oak' ? '3 shifts' : h.id === 'willow' ? '2 shifts' : h.id === 'maple' ? '3 shifts' : '2 shifts'}</span>
              </div>
              {h.id === 'oak' && <>
                <ShiftRow color={h.color} time="7a–3p" person="Aisha Mendez" role="Lead" status="here" />
                <ShiftRow color={h.color} time="7a–3p" person="Jay Brooks" role="DSP" status="here" />
                <ShiftRow color={h.color} time="3p–11p" person="Carmen Vela" role="DSP" status="scheduled" />
              </>}
              {h.id === 'willow' && <>
                <ShiftRow color={h.color} time="7a–3p" person="Devon Park" role="Lead" status="here" />
                <ShiftRow color={h.color} time="3p–11p" person="OPEN" role="DSP" status="open" />
              </>}
              {h.id === 'maple' && <>
                <ShiftRow color={h.color} time="7a–3p" person="Saira Khan" role="Lead" status="here" />
                <ShiftRow color={h.color} time="7a–3p" person="Marcus L." role="DSP" status="late" />
                <ShiftRow color={h.color} time="3p–11p" person="Reni T." role="DSP" status="scheduled" />
              </>}
              {h.id === 'cedar' && <>
                <ShiftRow color={h.color} time="7a–3p" person="Tomas Reed" role="Lead" status="here" />
                <ShiftRow color={h.color} time="3p–11p" person="Priya N." role="DSP" status="swap" />
              </>}
            </div>
          ))}
        </div>
      </div>
      <TabBar active="sched" />
    </div>
  );
}

function ShiftRow({ color, time, person, role, status }) {
  const stMap = {
    here: { tag: 'Clocked in', bg: '#dee6df', tc: '#3f604d' },
    scheduled: { tag: 'Scheduled', bg: 'var(--a-paper)', tc: 'var(--a-ink3)' },
    open: { tag: 'Open — needs fill', bg: '#f5e9d6', tc: '#a47012' },
    late: { tag: 'Late · 12 min', bg: '#fadcd7', tc: '#a93a25' },
    swap: { tag: 'Swap requested', bg: '#e7dfe9', tc: '#5a3a6b' },
  };
  const s = stMap[status];
  const open = person === 'OPEN';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, marginBottom: 6 }}>
      <div style={{ width: 3, height: 30, background: color, borderRadius: 4 }} />
      <div style={{ fontSize: 11, color: 'var(--a-ink2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 44 }}>{time}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: open ? 600 : 500, color: open ? 'var(--a-clay)' : 'var(--a-ink)' }}>{person}</div>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{role}</div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: s.tc, background: s.bg, padding: '2px 7px', borderRadius: 999 }}>{s.tag}</span>
    </div>
  );
}

Object.assign(window, { ScreenA_Schedule, ShiftRow });
