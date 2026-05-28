export function TendLogo({ size = 14, color = 'var(--a-sage)' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Newsreader', fontWeight: 600, fontStyle: 'italic', fontSize: size + 6, color, letterSpacing: '-0.02em' }}>
      <svg width={size + 4} height={size + 4} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M4 19c4-2 7-7 7-13"/>
        <path d="M4 19c4 0 8-1 12-5"/>
        <path d="M11 6c4 1 7 4 9 8"/>
      </svg>
      tend
    </span>
  )
}
