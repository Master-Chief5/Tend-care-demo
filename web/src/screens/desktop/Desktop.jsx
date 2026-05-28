// Shared desktop building blocks: DStat, DHouseCard, DDecision + style constants

export const dCard = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '16px 18px' }
export const dBtnSolid = { background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '7px 16px', fontSize: 12.5, fontWeight: 600, fontFamily: 'Geist', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }
export const dBtnGhost = { background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '7px 14px', fontSize: 12, color: 'var(--a-ink2)', fontFamily: 'Geist', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }

export function DStat({ label, value, sub, tone, big }) {
  const toneColor = tone === 'good' ? '#3f7050' : tone === 'warn' ? '#a47012' : tone === 'bad' ? '#a93a25' : 'var(--a-ink3)'
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: big ? 34 : 28, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: toneColor, marginTop: 4 }}>{sub}</div>
    </div>
  )
}

export function DHouseCard({ house, urgent, staff, present, drives, needs, clear, onClick }) {
  return (
    <div onClick={onClick} style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', cursor: onClick ? 'pointer' : 'default' }}>
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
  )
}

export function DDecision({ tag, tone, who, why, cta, onCta, last }) {
  const toneMap = {
    good: { c: '#3f7050', bg: '#dee6df' },
    warn: { c: '#a47012', bg: '#f5e9d6' },
    info: { c: '#3c5887', bg: '#dde6f0' },
  }[tone] || { c: 'var(--a-ink3)', bg: 'var(--a-paper)' }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: last ? '' : '1px dashed var(--a-line)' }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: toneMap.c, background: toneMap.bg, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0, marginTop: 1 }}>{tag}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{who}</div>
        <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 1 }}>{why}</div>
      </div>
      <button onClick={onCta} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: 'Geist', flexShrink: 0, cursor: 'pointer' }}>{cta}</button>
    </div>
  )
}

export function DTopBar({ title, sub, actions, search = true }) {
  return (
    <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid var(--a-line)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
      <div>
        <div className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {search && (
          <div style={{ background: 'var(--a-paper)', borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--a-line)', minWidth: 220 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--a-ink3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>Search…</span>
          </div>
        )}
        {actions}
      </div>
    </div>
  )
}
