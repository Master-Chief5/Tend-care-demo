import type { CSSProperties, ReactNode } from 'react'

export interface StatProps {
  /** Small uppercase caption above the value. */
  label: string
  /** The headline figure. */
  value: ReactNode
  /** Optional secondary line below the value. */
  sub?: ReactNode
  style?: CSSProperties
}

/**
 * A single metric block — an uppercase label, a large value, and an optional
 * sub-line. Group several side by side inside a Card for a stat row (staff on
 * shift, residents home, drives today).
 */
export function Stat({ label, value, sub, style }: StatProps) {
  return (
    <div style={{ fontFamily: 'Geist, system-ui, sans-serif', ...style }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 400, color: 'var(--a-ink)', lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub != null && <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
