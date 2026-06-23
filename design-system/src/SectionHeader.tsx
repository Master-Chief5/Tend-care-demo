import type { CSSProperties, ReactNode, MouseEventHandler } from 'react'

export interface SectionHeaderProps {
  /** The uppercase section label. */
  label: ReactNode
  /** Optional right-aligned action label (e.g. "Add resident"). */
  action?: string
  /** Color for the action label. Defaults to the clay accent. */
  actionColor?: string
  onAction?: MouseEventHandler<HTMLButtonElement>
  style?: CSSProperties
}

/**
 * The small uppercase caption that introduces a list or section, with an
 * optional inline action on the right. Used above residents, incidents,
 * supplies, and most grouped lists.
 */
export function SectionHeader({ label, action, actionColor = 'var(--a-clay)', onAction, style }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px', fontFamily: 'Geist, system-ui, sans-serif', ...style }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      {action && (
        <button type="button" onClick={onAction} style={{ background: 'transparent', border: 0, color: actionColor, fontSize: 12, fontWeight: 600, fontFamily: 'Geist, system-ui, sans-serif', cursor: 'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}
