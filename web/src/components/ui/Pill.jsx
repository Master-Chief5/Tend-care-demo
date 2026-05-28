export function Pill({ color = 'var(--a-sage)', children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 999,
      background: 'var(--a-paper)', color,
      fontSize: 11, fontWeight: 600,
      border: '1px solid var(--a-line)',
    }}>
      {children}
    </span>
  )
}
