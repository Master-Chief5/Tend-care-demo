import type { CSSProperties, ReactNode } from 'react'

export interface CardProps {
  /** Card contents. */
  children?: ReactNode
  /** Inner padding. */
  padding?: number | string
  /** Corner radius. */
  radius?: number
  /** Optional accent color for a top edge stripe (e.g. a house color). */
  accent?: string
  style?: CSSProperties
}

/**
 * The standard surface container — a cream panel with a hairline border, used
 * to group related content (a resident, a stat row, a form). Optionally shows a
 * colored top stripe to tie the card to a house.
 */
export function Card({ children, padding = '14px 16px', radius = 14, accent, style }: CardProps) {
  return (
    <div
      style={{
        background: 'var(--a-card)',
        border: '1px solid var(--a-line)',
        borderTop: accent ? `3px solid ${accent}` : '1px solid var(--a-line)',
        borderRadius: radius,
        padding,
        fontFamily: 'Geist, system-ui, sans-serif',
        color: 'var(--a-ink)',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
