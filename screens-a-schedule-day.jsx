// screens-a-schedule-day.jsx — Expanded schedule with real time grid

// Shifts for today across all houses
const TODAY_SHIFTS = [
  { house: 'oak', start: 7, end: 15, person: 'Aisha M.', role: 'Lead', status: 'here' },
  { house: 'oak', start: 7, end: 15, person: 'Jay B.', role: 'DSP', status: 'here' },
  { house: 'oak', start: 15, end: 23, person: 'Carmen V.', role: 'DSP', status: 'scheduled' },
  { house: 'oak', start: 23, end: 31, person: 'Brian L.', role: 'Awake OT', status: 'scheduled' },

  { house: 'willow', start: 7, end: 15, person: 'Devon P.', role: 'Mgr', status: 'here' },
  { house: 'willow', start: 15, end: 23, person: 'OPEN', role: 'DSP', status: 'open' },
  { house: 'willow', start: 9, end: 13, person: 'Theo W.', role: 'PT', status: 'scheduled' },

  { house: 'maple', start: 7, end: 15, person: 'Saira K.', role: 'Mgr', status: 'here' },
  { house: 'maple', start: 7.2, end: 15.2, person: 'Marcus L.', role: 'DSP', status: 'late' },
  { house: 'maple', start: 11, end: 19, person: 'Reni T.', role: 'DSP', status: 'scheduled' },
  { house: 'maple', start: 19, end: 27, person: 'Iris H.', role: 'DSP', status: 'scheduled' },

  { house: 'cedar', start: 7, end: 15, person: 'Tomas R.', role: 'Mgr', status: 'here' },
  { house: 'cedar', start: 15, end: 23, person: 'Priya N.', role: 'DSP', status: 'swap' },
];

const HOUR_PX = 56;
const DAY_START = 6;   // 6 AM
const DAY_END = 24;    // midnight (last gridline)

function ScreenA_ScheduleDay({ employee = false }) {
  const [view, setView] = useState('day'); // 'day' | 'week'
  const [houseFilter, setHouseFilter] = useState('all'); // 'all' | house.id
  const week = buildWeek(new Date());
  const [dayIdx, setDayIdx] = useState(() => { const i = week.findIndex(d => d.today); return i >= 0 ? i : 0; });
  const nowFrac = useNowMinute();

  if (view === 'week') return <ScreenA_ScheduleWeek setView={setView} />;

  const visibleHouses = houseFilter === 'all' ? HOUSES : HOUSES.filter(h => h.id === houseFilter);
  const filteredShifts = houseFilter === 'all' ? TODAY_SHIFTS : TODAY_SHIFTS.filter(s => s.house === houseFilter);

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top */}
        <div style={{ padding: '14px 22px 6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Schedule</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>{fmtDayLabel(week[dayIdx].date)} · 14 shifts</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <ViewToggle view={view} setView={setView} />
            <button style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconPlus size={16} sw={2.2} />
            </button>
          </div>
        </div>

        {/* Permission notice */}
        <div style={{ padding: '4px 22px 10px' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconKey size={13} color="var(--a-sage)" sw={1.8} />
            <span style={{ fontSize: 11, color: 'var(--a-ink2)', flex: 1 }}>You see <strong>all 4 houses</strong>. Staff only see their own shifts.</span>
          </div>
        </div>

        {/* Day strip */}
        <DayStrip week={week} dayIdx={dayIdx} setDayIdx={setDayIdx} />

        {/* House filter chips */}
        <HouseFilterChips active={houseFilter} setActive={setHouseFilter} />

        {/* Now-line label */}
        <div style={{ padding: '4px 22px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--a-clay)' }} />
          <span style={{ fontSize: 11, color: 'var(--a-clay)', fontWeight: 600 }}>Now · {fmtNow(nowFrac)}</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {HOUSES.map(h => (
              <span key={h.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: h.color }} />
                <span style={{ fontSize: 9.5, fontWeight: 700, color: h.color, letterSpacing: '0.04em' }}>{h.short}</span>
              </span>
            )).reduce((acc, el, i) => acc.length ? [...acc, <span key={`sep${i}`} style={{ color: 'var(--a-ink3)', fontSize: 10 }}>·</span>, el] : [el], [])}
          </div>
        </div>

        {/* The grid */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 14px 24px' }}>
          <TimeGrid shifts={filteredShifts} houses={visibleHouses} nowFrac={nowFrac} />
        </div>
      </div>
      <TabBar active="sched" />
    </div>
  );
}

function ViewToggle({ view, setView }) {
  return (
    <div style={{ display: 'flex', background: 'var(--a-paper)', borderRadius: 999, padding: 3, border: '1px solid var(--a-line)' }}>
      {['day', 'week'].map(v => (
        <button key={v} onClick={() => setView(v)} style={{
          border: 0,
          background: v === view ? 'var(--a-ink)' : 'transparent',
          color: v === view ? 'var(--a-card)' : 'var(--a-ink2)',
          padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'Geist',
          textTransform: 'capitalize',
        }}>{v}</button>
      ))}
    </div>
  );
}

function DayStrip({ week, dayIdx, setDayIdx }) {
  return (
    <div style={{ padding: '0 22px 12px', display: 'flex', gap: 4 }}>
      {week.map((d, i) => {
        const sel = i === dayIdx;
        return (
          <div key={i} onClick={() => setDayIdx(i)} style={{
            flex: 1, padding: '7px 0', textAlign: 'center', borderRadius: 10, cursor: 'pointer',
            background: sel ? 'var(--a-ink)' : 'transparent',
            color: sel ? 'var(--a-card)' : 'var(--a-ink2)',
            border: sel ? '0' : '1px solid var(--a-line)',
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: '0.04em', opacity: sel ? 0.7 : 1 }}>{d.dow}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{d.num}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── The actual time grid ──────────────────────────────────────────────
function TimeGrid({ shifts, houses = HOUSES, nowFrac = 9.8 }) {
  const hours = [];
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h);

  const nowTop = (nowFrac - DAY_START) * HOUR_PX;
  const single = houses.length === 1;

  return (
    <div style={{ position: 'relative', display: 'flex', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Time column */}
      <div style={{ width: 50, flexShrink: 0, position: 'relative', borderRight: '1px solid var(--a-line)', background: 'var(--a-paper)' }}>
        {hours.map((h, i) => (
          <div key={i} style={{ height: HOUR_PX, position: 'relative' }}>
            <span style={{ position: 'absolute', top: -7, right: 6, fontSize: 10, color: 'var(--a-ink3)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              {fmtHour(h)}
            </span>
          </div>
        ))}
      </div>

      {/* House columns */}
      <div style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${houses.length}, 1fr)` }}>
        {houses.map((h, hi) => (
          <div key={h.id} style={{ position: 'relative', borderRight: hi === houses.length - 1 ? '' : '1px solid var(--a-line)' }}>
            {/* hour gridlines */}
            {hours.map((hr, i) => (
              <div key={i} style={{
                height: HOUR_PX,
                borderBottom: i === hours.length - 1 ? '' : '1px solid var(--a-line)',
                background: i % 2 === 1 ? 'rgba(216, 204, 177, 0.07)' : 'transparent',
              }} />
            ))}

            {/* Shift blocks for this house */}
            {shifts.filter(s => s.house === h.id).map((s, si) => (
              <ShiftBlock key={si} shift={s} houseColor={h.color} expanded={single} />
            ))}
          </div>
        ))}

        {/* Now line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: nowTop, pointerEvents: 'none',
          borderTop: '1.5px solid var(--a-clay)',
          zIndex: 10,
        }}>
          <div style={{ position: 'absolute', left: -6, top: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--a-clay)' }} />
        </div>
      </div>
    </div>
  );
}

function HouseFilterChips({ active, setActive }) {
  return (
    <div style={{ padding: '0 14px 10px', display: 'flex', gap: 5, overflowX: 'auto' }}>
      <FilterChip active={active === 'all'} onClick={() => setActive('all')} label="All" sub="4" />
      {HOUSES.map(h => (
        <FilterChip key={h.id} active={active === h.id} onClick={() => setActive(h.id)} color={h.color} label={h.name.split(' ')[0]} short={h.short} />
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, label, sub, short, color }) {
  const activeColor = color || 'var(--a-ink)';
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
      padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
      background: active ? activeColor : 'var(--a-card)',
      color: active ? '#fff' : 'var(--a-ink2)',
      border: active ? `1px solid ${activeColor}` : '1px solid var(--a-line)',
      fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist',
    }}>
      {short && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', opacity: active ? 0.85 : 0.7 }}>{short}</span>}
      <span style={{ fontWeight: active ? 600 : 500 }}>{label}</span>
      {sub && <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 500 }}>{sub}</span>}
    </button>
  );
}

function fmtHour(h) {
  const wrapped = ((h % 24) + 24) % 24;
  if (wrapped === 0) return '12a';
  if (wrapped === 12) return '12p';
  return wrapped < 12 ? `${wrapped}a` : `${wrapped - 12}p`;
}

function fmtTime(h) {
  const wrapped = ((h % 24) + 24) % 24;
  const hr = Math.floor(wrapped);
  const min = Math.round((wrapped - hr) * 60);
  const m = min < 10 ? `0${min}` : `${min}`;
  if (hr === 0) return `12:${m}a`;
  if (hr === 12) return `12:${m}p`;
  return hr < 12 ? `${hr}:${m}a` : `${hr - 12}:${m}p`;
}

function ShiftBlock({ shift, houseColor, expanded }) {
  const { start, end, person, role, status } = shift;
  const top = (start - DAY_START) * HOUR_PX;
  const height = (end - start) * HOUR_PX;
  const open = status === 'open';
  const late = status === 'late';
  const swap = status === 'swap';
  const dim = status === 'scheduled';

  const bg = open ? 'transparent' : houseColor;
  const border = open ? `1.5px dashed ${houseColor}` : late ? `1.5px solid #a93a25` : 'none';
  const txt = open ? houseColor : '#fff';

  return (
    <div style={{
      position: 'absolute', top: top + 2, left: 2, right: 2, height: height - 4,
      background: bg, border, borderRadius: 6,
      padding: expanded ? '8px 12px' : '4px 6px', color: txt, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 2,
      opacity: dim ? 0.78 : 1,
      boxShadow: !open ? '0 1px 0 rgba(0,0,0,0.04)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span className="tnum" style={{ fontSize: expanded ? 11 : 9, fontWeight: 700, letterSpacing: '0.04em', opacity: open ? 1 : 0.85 }}>
          {fmtTime(start)}–{fmtTime(end)}
        </span>
        {late && <span style={{ fontSize: 8, fontWeight: 700, color: '#a93a25', background: 'rgba(255,255,255,0.9)', padding: '0 4px', borderRadius: 3 }}>LATE</span>}
        {swap && <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.18)', padding: '0 4px', borderRadius: 3 }}>SWAP</span>}
      </div>
      <div style={{ fontSize: expanded ? 14 : 11, fontWeight: 700, lineHeight: 1.1, color: open ? houseColor : '#fff' }}>{person}</div>
      {height > 48 && <div style={{ fontSize: expanded ? 11 : 9, opacity: open ? 0.8 : 0.7, fontWeight: 500 }}>{role}</div>}
    </div>
  );
}

// ── Week view (reused, with finer detail) ─────────────────────────────
function ScreenA_ScheduleWeek({ setView }) {
  const week = buildWeek(new Date());
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekLabel = `${MONTHS[week[0].date.getMonth()]} ${week[0].num} – ${MONTHS[week[6].date.getMonth()]} ${week[6].num}`;
  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Schedule</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>{weekLabel}</div>
          </div>
          <ViewToggle view="week" setView={setView} />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 14px 24px' }}>
          {HOUSES.map(h => (
            <div key={h.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: h.color }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{h.name}</span>
                <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>· {h.branch}</span>
              </div>
              <WeekHouseRow house={h} />
            </div>
          ))}
        </div>
      </div>
      <TabBar active="sched" />
    </div>
  );
}

function WeekHouseRow({ house }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '8px 6px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {days.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--a-ink3)', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(d => (
          <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ background: house.color, color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 3px', borderRadius: 4, textAlign: 'center', lineHeight: 1.2 }}>7a–3p</div>
            <div style={{ background: `${house.color}99`, color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 3px', borderRadius: 4, textAlign: 'center', lineHeight: 1.2 }}>3p–11p</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenA_ScheduleDay, ScreenA_ScheduleWeek, ViewToggle, DayStrip, TimeGrid, ShiftBlock, WeekHouseRow, HouseFilterChips, FilterChip, TODAY_SHIFTS, HOUR_PX, DAY_START, DAY_END, fmtHour, fmtTime });
