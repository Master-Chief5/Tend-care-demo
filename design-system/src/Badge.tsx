import type { CSSProperties, ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad' | 'solid'

export interface BadgeProps {
  /** Color intent. `good`/`warn`/`bad` use the status tints; `solid` is a filled emphasis tag. */
  tone?: BadgeTone
  /** Badge text. */
  children?: ReactNode
  style?: CSSProperties
}

const TONES: Record<BadgeTone, CSSProperties> = {
  neutral: { background: 'var(--a-paper)', color: 'var(--a-ink2)', border: '1px solid var(--a-line)' },
  good: { background: 'var(--status-good-bg)', color: 'var(--status-good-tc)' },
  warn: { background: 'var(--status-warn-bg)', color: 'var(--status-warn-tc)' },
  bad: { background: 'var(--status-bad-bg)', color: 'var(--status-bad-tc)' },
  solid: { background: 'var(--a-clay)', color: '#fff', letterSpacing: '0.04em' },
}

/**
 * A small, high-density status tag — incident severity, "REPORTABLE", a
 * resident flag. Sits inline with text and never wraps its own content.
 */
export function Badge({ tone = 'neutral', children, style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 9.5, fontWeight: 700, fontFamily: 'Geist, system-ui, sans-serif',
        padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap', lineHeight: 1.4,
        ...TONES[tone], ...style,
      }}
    >
      {children}
    </span>
  )
}
