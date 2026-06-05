export function Toast({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(82px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--a-ink)', color: 'var(--a-card)',
      padding: '9px 18px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 9999,
      maxWidth: 'calc(100% - 32px)', textAlign: 'center', pointerEvents: 'none',
    }}>
      {msg}
    </div>
  )
}
