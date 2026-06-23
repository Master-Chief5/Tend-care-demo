import type { CSSProperties, ReactNode } from 'react'

export type BannerTone = 'good' | 'warn' | 'bad' | 'info'

export interface BannerProps {
  /** Intent — drives the background, border, and text color. */
  tone?: BannerTone
  /** Leading icon/emoji. */
  icon?: ReactNode
  /** Banner message. */
  children?: ReactNode
  style?: CSSProperties
}

const TONES: Record<BannerTone, { bg: string; bd: string; tc: string }> = {
  good: { bg: 'var(--status-good-bg)', bd: '#9fc0ab', tc: 'var(--status-good-tc)' },
  warn: { bg: 'var(--status-warn-bg)', bd: '#e6c98f', tc: 'var(--status-warn-tc)' },
  bad: { bg: 'var(--status-bad-bg)', bd: '#e0b4ab', tc: 'var(--status-bad-tc)' },
  info: { bg: 'var(--a-paper)', bd: 'var(--a-line)', tc: 'var(--a-ink2)' },
}

/**
 * A full-width inline alert that calls out something needing attention — a
 * reportable incident awaiting notification, an overdue fire drill, a success
 * confirmation. Pair with a short message and an optional leading icon.
 */
export function Banner({ tone = 'info', icon, children, style }: BannerProps) {
  const t = TONES[tone]
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 12,
        padding: '10px 14px', fontFamily: 'Geist, system-ui, sans-serif',
        ...style,
      }}
    >
      {icon != null && <span key="icon" style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>}
      <span key="msg" style={{ fontSize: 12.5, color: t.tc, fontWeight: 600, lineHeight: 1.4 }}>{children}</span>
    </div>
  )
}
