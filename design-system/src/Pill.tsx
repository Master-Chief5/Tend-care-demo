import type { CSSProperties, ReactNode, MouseEventHandler } from 'react'

export interface PillProps {
  /** Selected state — fills with the active color. */
  active?: boolean
  /** Fill color when active. Defaults to ink. */
  activeColor?: string
  /** Pill label. */
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  style?: CSSProperties
}

/**
 * A rounded, toggleable chip used for filters and segmented choices (house
 * filters, section tabs, type pickers). Renders as a button; set `active` to
 * show the selected state.
 */
export function Pill({ active = false, activeColor = 'var(--a-ink)', children, onClick, style }: PillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
        fontFamily: 'Geist, system-ui, sans-serif', cursor: 'pointer', whiteSpace: 'nowrap',
        background: active ? activeColor : 'transparent',
        color: active ? 'var(--a-card)' : 'var(--a-ink2)',
        border: active ? '0' : '1px solid var(--a-line)',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
