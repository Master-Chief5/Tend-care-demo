import type { CSSProperties } from 'react'

export interface ProgressBarProps {
  /** Completion 0–100. Values outside the range are clamped. */
  pct: number
  /** Fill color. Defaults to sage; pass a house color to theme it. */
  color?: string
  /** Bar thickness in px. */
  height?: number
  style?: CSSProperties
}

/**
 * A slim horizontal completion bar — shift-documentation progress, goal
 * tracking, onboarding steps. Track uses the paper tone; the fill animates on
 * width change.
 */
export function ProgressBar({ pct, color = 'var(--a-sage)', height = 7, style }: ProgressBarProps) {
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div style={{ height, borderRadius: 999, background: 'var(--a-paper)', overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 999, transition: 'width 0.25s ease' }} />
    </div>
  )
}
