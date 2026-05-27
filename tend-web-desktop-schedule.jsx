// tend-web-desktop-schedule.jsx — Expanded desktop schedule with real time grid

const DSK_HOUR_PX = 56;

function PageScheduleDesktopExpanded() {
  const [view, setView] = useState('day');
  const [dayIdx, setDayIdx] = useState(1); // Tuesday selected
  const [houseFilter, setHouseFilter] = useState('all');

  return (
    <>
      <DTopBar
        title="Schedule"
        sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconKey size={12} sw={2} color="var(--a-sage)" /> You see all 4 houses · staff see only their own
        </span>}
        actions={<>
          <ViewToggleDesktop view={view} setView={setView} />
          <button style={dBtnGhost}><IconFilter size={13} sw={1.8} /> Filter</button>
          <button style={dBtnSolid}><IconPlus size={13} sw={2.4} /> New shift</button>
        </>}
      />

      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        {view === 'day' ? (
          <DayScheduleView dayIdx={dayIdx} setDayIdx={setDayIdx} houseFilter={houseFilter} setHouseFilter={setHouseFilter} />
        ) : (
          <WeekScheduleView />
        )}
      </div>
    </>
  );
}

function ViewToggleDesktop({ view, setView }) {
  return (
    <div style={{ display: 'flex', background: 'var(--a-paper)', borderRadius: 999, padding: 3, border: '1px solid var(--a-line)' }}>
      {['day', 'week'].map(v => (
        <button key={v} onClick={() => setView(v)} style={{
          border: 0,
          background: v === view ? 'var(--a-ink)' : 'transparent',
          color: v === view ? 'var(--a-card)' : 'var(--a-ink2)',
          padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Geist',
          textTransform: 'capitalize',
        }}>{v}</button>
      ))}
    </div>
  );
}

function DayScheduleView({ dayIdx, setDayIdx, houseFilter, setHouseFilter }) {
  const week = [
    { dow: 'Mon', num: 26, label: 'May 26' },
    { dow: 'Tue', num: 27, label: 'May 27 · today' },
    { dow: 'Wed', num: 28, label: 'May 28' },
    { dow: 'Thu', num: 29, label: 'May 29' },
    { dow: 'Fri', num: 30, label: 'May 30' },
    { dow: 'Sat', num: 31, label: 'May 31' },
    { dow: 'Sun', num: 1, label: 'Jun 1' },
  ];

  const visibleHouses = houseFilter === 'all' ? HOUSES : HOUSES.filter(h => h.id === houseFilter);
  const filteredShifts = houseFilter === 'all' ? TODAY_SHIFTS : TODAY_SHIFTS.filter(s => s.house === houseFilter);

  return (
    <>
      {/* Day picker row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {week.map((d, i) => {
            const sel = i === dayIdx;
            const today = i === 1;
            return (
              <button key={i} onClick={() => setDayIdx(i)} style={{
                flex: 1, padding: '10px 6px', textAlign: 'center', borderRadius: 10,
                background: sel ? 'var(--a-ink)' : 'transparent',
                color: sel ? 'var(--a-card)' : 'var(--a-ink)',
                border: sel ? '0' : '1px solid var(--a-line)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', fontFamily: 'Geist',
              }}>
                <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{d.dow}</span>
                <span className="tnum" style={{ fontSize: 18, fontWeight: 700 }}>{d.num}</span>
                {today && !sel && <span style={{ fontSize: 9, color: 'var(--a-clay)', fontWeight: 600 }}>today</span>}
              </button>
            );
          })}
        </div>
        <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} /></button>
      </div>

      {/* House tabs row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
        <DskHouseTab active={houseFilter === 'all'} onClick={() => setHouseFilter('all')}
          label="All houses" count={14} sub="14 shifts" />
        {HOUSES.map(h => {
          const count = TODAY_SHIFTS.filter(s => s.house === h.id).length;
          return (
            <DskHouseTab key={h.id} active={houseFilter === h.id} onClick={() => setHouseFilter(h.id)}
              color={h.color} short={h.short} label={h.name} count={count} sub={`${count} shifts`} />
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{week[dayIdx].label}</span>
        <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>
          {houseFilter === 'all' ? '14 shifts · 7 staff on now · ' : `${filteredShifts.length} shifts · `}
          <strong style={{ color: 'var(--a-clay)' }}>{filteredShifts.filter(s => s.status === 'open').length} open</strong>
          {filteredShifts.some(s => s.status === 'late') && <> · 1 late</>}
          {filteredShifts.some(s => s.status === 'swap') && <> · 1 swap</>}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>Scale: 1 hr</span>
      </div>

      {/* The big grid */}
      <DesktopTimeGrid shifts={filteredShifts} houses={visibleHouses} />
    </>
  );
}

function DskHouseTab({ active, onClick, color, short, label, count, sub }) {
  const activeColor = color || 'var(--a-ink)';
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
      background: active ? activeColor : 'var(--a-card)',
      color: active ? '#fff' : 'var(--a-ink)',
      border: active ? `1px solid ${activeColor}` : '1px solid var(--a-line)',
      fontFamily: 'Geist', textAlign: 'left',
    }}>
      {short ? (
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: active ? 'rgba(255,255,255,0.18)' : `${color}1f`, color: active ? '#fff' : color, padding: '4px 7px', borderRadius: 4 }}>{short}</span>
      ) : (
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', background: active ? 'rgba(255,255,255,0.18)' : 'var(--a-paper)', color: active ? '#fff' : 'var(--a-ink2)', padding: '4px 7px', borderRadius: 4 }}>ALL</span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 10.5, opacity: active ? 0.85 : 0.6, marginTop: 1 }}>{sub}</div>
      </div>
    </button>
  );
}

// ── The big desktop day-view time grid ────────────────────────────────
function DesktopTimeGrid({ shifts, houses = HOUSES }) {
  const hours = [];
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h);
  const nowTop = (9.8 - DAY_START) * DSK_HOUR_PX;

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header row with houses */}
      <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${houses.length}, 1fr)`, background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)' }}>
        <div style={{ padding: '12px 14px', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Hour</div>
        {houses.map(h => (
          <div key={h.id} style={{ padding: '12px 16px', borderLeft: '1px solid var(--a-line)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: h.color }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</div>
              <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{h.branch} branch · mgr {h.manager}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${houses.length}, 1fr)`, position: 'relative' }}>
        {/* Hour column */}
        <div style={{ background: 'var(--a-paper)', borderRight: '1px solid var(--a-line)' }}>
          {hours.map((h, i) => (
            <div key={i} style={{ height: DSK_HOUR_PX, position: 'relative', borderBottom: i === hours.length - 1 ? '' : '1px solid var(--a-line)' }}>
              <div style={{ position: 'absolute', top: -8, right: 10, fontSize: 11, fontWeight: 600, color: 'var(--a-ink2)', background: 'var(--a-paper)', padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}>
                {fmtHourLong(h)}
              </div>
            </div>
          ))}
        </div>

        {/* House columns */}
        {houses.map((h, hi) => (
          <div key={h.id} style={{ position: 'relative', borderLeft: '1px solid var(--a-line)' }}>
            {/* gridlines */}
            {hours.map((hr, i) => (
              <div key={i} style={{
                height: DSK_HOUR_PX,
                borderBottom: i === hours.length - 1 ? '' : '1px solid var(--a-line)',
                background: i % 2 === 1 ? 'rgba(216, 204, 177, 0.06)' : 'transparent',
              }} />
            ))}
            {/* half-hour ticks */}
            {hours.slice(0, -1).map((hr, i) => (
              <div key={`half${i}`} style={{ position: 'absolute', top: i * DSK_HOUR_PX + DSK_HOUR_PX / 2, left: 0, right: 0, borderTop: '1px dashed var(--a-line)', opacity: 0.5 }} />
            ))}
            {/* shifts */}
            {shifts.filter(s => s.house === h.id).map((s, si) => (
              <DskShiftBlock key={si} shift={s} houseColor={h.color} />
            ))}
          </div>
        ))}

        {/* Now line - overlay across house columns */}
        <div style={{
          position: 'absolute', left: 80, right: 0, top: nowTop, pointerEvents: 'none',
          borderTop: '1.5px solid var(--a-clay)', zIndex: 10,
        }}>
          <div style={{ position: 'absolute', left: -34, top: -10, background: 'var(--a-clay)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>
            9:48a
          </div>
          <div style={{ position: 'absolute', left: -6, top: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--a-clay)' }} />
        </div>
      </div>
    </div>
  );
}

function fmtHourLong(h) {
  const wrapped = ((h % 24) + 24) % 24;
  if (wrapped === 0) return '12 AM';
  if (wrapped === 12) return '12 PM';
  return wrapped < 12 ? `${wrapped} AM` : `${wrapped - 12} PM`;
}

function DskShiftBlock({ shift, houseColor }) {
  const { start, end, person, role, status } = shift;
  const top = (start - DAY_START) * DSK_HOUR_PX;
  const height = (end - start) * DSK_HOUR_PX;
  const open = status === 'open';
  const late = status === 'late';
  const swap = status === 'swap';
  const here = status === 'here';

  const bg = open ? 'transparent' : houseColor;
  const border = open ? `1.5px dashed ${houseColor}` : late ? `1.5px solid #a93a25` : 'none';

  return (
    <div style={{
      position: 'absolute', top: top + 3, left: 6, right: 6, height: height - 6,
      background: bg, border, borderRadius: 8,
      padding: '8px 12px', color: open ? houseColor : '#fff',
      display: 'flex', flexDirection: 'column',
      cursor: 'pointer',
      boxShadow: !open ? '0 1px 0 rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.04)' : 'none',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 4 }}>
        <span className="tnum" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', opacity: open ? 1 : 0.92 }}>
          {fmtTime(start)} – {fmtTime(end)}
        </span>
        <span style={{ fontSize: 9, opacity: open ? 0.85 : 0.75, fontWeight: 600 }}>{Math.round((end - start) * 10) / 10}h</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15, color: open ? houseColor : '#fff' }}>{person}</div>
      <div style={{ fontSize: 11, opacity: open ? 0.85 : 0.78, marginTop: 2, fontWeight: 500 }}>{role}</div>

      {/* status tag */}
      {(late || swap || here || open) && (
        <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 4 }}>
          {here && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.22)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>● CLOCKED IN</span>}
          {late && <span style={{ fontSize: 9, fontWeight: 700, color: '#a93a25', background: 'rgba(255,255,255,0.92)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>LATE · 12m</span>}
          {swap && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.22)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>SWAP REQ</span>}
          {open && <span style={{ fontSize: 9, fontWeight: 700, color: houseColor, background: 'rgba(255,255,255,0.92)', padding: '2px 7px', borderRadius: 3, letterSpacing: '0.06em' }}>NEEDS FILL</span>}
        </div>
      )}
    </div>
  );
}

// ── Week view (compact, same data) ────────────────────────────────────
function WeekScheduleView() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
        <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>May 26 – Jun 1</span>
        <button style={{ ...dBtnGhost, padding: '6px 8px' }}><IconChev size={14} sw={2} /></button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Open shifts: <strong style={{ color: 'var(--a-clay)' }}>3</strong></span>
      </div>

      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', background: 'var(--a-paper)', borderBottom: '1px solid var(--a-line)' }}>
          <div style={{ padding: '10px 14px', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>House</div>
          {['Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30', 'Sat 31', 'Sun 1'].map((d, i) => {
            const [day, num] = d.split(' ');
            return (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', borderLeft: '1px solid var(--a-line)' }}>
                <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{day}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: i === 1 ? 'var(--a-clay)' : 'var(--a-ink)' }}>{num}</div>
              </div>
            );
          })}
        </div>
        {HOUSES.map(h => (
          <ScheduleRow key={h.id} house={h} />
        ))}
      </div>
    </>
  );
}

Object.assign(window, { PageScheduleDesktopExpanded, ViewToggleDesktop, DayScheduleView, DskHouseTab, DesktopTimeGrid, fmtHourLong, DskShiftBlock, WeekScheduleView, DSK_HOUR_PX });
