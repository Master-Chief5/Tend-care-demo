export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--a-ink)', color: 'var(--a-card)',
      padding: '9px 18px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 9999,
      whiteSpace: 'nowrap', pointerEvents: 'none',
    }}>
      {msg}
    </div>
  )
}
