// screens-a-rest.jsx — Resource analyzer, Schedule, Driving, Staff/Quality, Orientation, Chat

// ── Resource analyzer ───────────────────────────────────────────────────
function ScreenA_Resources() {
  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink2)' }}><IconChev size={20} sw={2} style={{ transform: 'rotate(180deg)' }} /></button>
          <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>Resources</span>
        </div>
        <div style={{ padding: '4px 22px 14px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Spend insights</div>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 4 }}>Last 12 weeks · all houses</div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 22px 24px' }}>
          {/* Top stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <BigStat label="Weekly avg" value="$1,034" sub="↓ 6% vs Apr" tone="good" />
            <BigStat label="Per resident" value="$64" sub="↓ $4 vs Apr" tone="good" />
          </div>

          {/* House comparison bar chart */}
          <SectionHeader title="Spend by house · this month" />
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
            <HouseBar house={HOUSES[0]} value="$1,180" pct={0.94} />
            <HouseBar house={HOUSES[1]} value="$840" pct={0.66} />
            <HouseBar house={HOUSES[2]} value="$1,250" pct={1} />
            <HouseBar house={HOUSES[3]} value="$910" pct={0.72} last />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--a-ink3)', marginTop: 8 }}>
              <span>0</span>
              <span>$1,250</span>
            </div>
          </div>

          {/* Top items */}
          <SectionHeader title="What you buy most" sub="across all houses" />
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '6px 14px', marginBottom: 14 }}>
            <TopItem rank={1} name="Milk (gallon)" qty="84 ct" trend="steady" />
            <TopItem rank={2} name="Bread" qty="62 loaves" trend="up" />
            <TopItem rank={3} name="Eggs (dozen)" qty="48 ct" trend="steady" />
            <TopItem rank={4} name="Chicken breast" qty="44 lb" trend="up" />
            <TopItem rank={5} name="Paper towels" qty="38 pk" trend="down" last />
          </div>

          {/* Cross-house borrow */}
          <SectionHeader title="Cross-house swaps" sub="save a shopping run" />
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
            <SwapRow from={HOUSES[1]} to={HOUSES[0]} item="Toilet paper · 12 rolls" note="Willow has 24 surplus; Oak is out" />
            <div style={{ height: 1, background: 'var(--a-line)', margin: '10px 0' }} />
            <SwapRow from={HOUSES[3]} to={HOUSES[2]} item="Laundry pods · 1 box" note="Cedar overbought last week" />
          </div>

          {/* Coach moment */}
          <div style={{ background: '#f5e9d6', border: '1px solid #e7d289', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <IconFlag size={14} color="#a47012" sw={2} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#a47012', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Worth a look</span>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--a-ink2)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--a-ink)' }}>Maple Run</strong> spent <strong>34% more</strong> on snacks this month vs. last 3 months. Mostly chips and soda. Want to flag to Saira?
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist' }}>Send to Saira</button>
              <button style={{ background: 'transparent', color: 'var(--a-ink2)', border: 0, padding: '6px 12px', fontSize: 11.5, fontFamily: 'Geist' }}>Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, sub, tone }) {
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 4, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11, color: tone === 'good' ? '#3f7050' : tone === 'bad' ? '#a93a25' : 'var(--a-ink3)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '12px 0 8px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--a-ink2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{sub}</div>}
    </div>
  );
}

function HouseBar({ house, value, pct, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: last ? '' : '1px dashed var(--a-line)' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: house.color, letterSpacing: '0.06em', width: 40 }}>{house.short}</span>
      <div style={{ flex: 1, height: 8, background: 'var(--a-paper)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: house.color, borderRadius: 999 }} />
      </div>
      <span className="tnum" style={{ fontSize: 12, fontWeight: 500, width: 56, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function TopItem({ rank, name, qty, trend, last }) {
  const trendIco = trend === 'up' ? <IconUp size={12} sw={2.4} color="#a93a25" /> : trend === 'down' ? <IconDown size={12} sw={2.4} color="#3f7050" /> : <span style={{ fontSize: 14, color: 'var(--a-ink3)' }}>—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: last ? '' : '1px dashed var(--a-line)' }}>
      <span style={{ fontSize: 11, color: 'var(--a-ink3)', width: 14, fontWeight: 600 }}>{rank}</span>
      <span style={{ fontSize: 13.5, color: 'var(--a-ink)', flex: 1, fontWeight: 500 }}>{name}</span>
      <span className="tnum" style={{ fontSize: 12, color: 'var(--a-ink2)' }}>{qty}</span>
      <div style={{ width: 16, display: 'flex', justifyContent: 'center' }}>{trendIco}</div>
    </div>
  );
}

function SwapRow({ from, to, item, note }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: from.color, letterSpacing: '0.06em' }}>{from.short}</span>
        <IconArrow size={12} sw={2} color="var(--a-ink3)" />
        <span style={{ fontSize: 10, fontWeight: 700, color: to.color, letterSpacing: '0.06em' }}>{to.short}</span>
        <span style={{ fontSize: 13, color: 'var(--a-ink)', fontWeight: 500 }}>{item}</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginLeft: 0 }}>{note}</div>
    </div>
  );
}

Object.assign(window, { ScreenA_Resources, BigStat, SectionHeader, HouseBar, TopItem, SwapRow });
