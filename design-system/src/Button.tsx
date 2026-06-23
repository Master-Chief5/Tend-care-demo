import type { CSSProperties, ReactNode, MouseEventHandler } from 'react'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  /** Visual emphasis. `primary` = solid ink, `accent` = solid clay/house color, `secondary` = outline, `ghost` = text-only. */
  variant?: ButtonVariant
  /** Control height / padding. */
  size?: ButtonSize
  /** Fill color for the `accent` variant — pass a house color (e.g. var(--house-maple)). Defaults to clay. */
  accentColor?: string
  /** Stretch to the full width of the container. */
  block?: boolean
  /** Disable interaction and dim the control. */
  disabled?: boolean
  /** Button label / contents. */
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  style?: CSSProperties
}

const PAD: Record<ButtonSize, string> = { sm: '7px 13px', md: '11px 16px', lg: '13px 20px' }
const FONT: Record<ButtonSize, number> = { sm: 12.5, md: 14, lg: 15 }

/**
 * The primary call-to-action control. Solid `primary`/`accent` for the main
 * action on a screen, `secondary` for a paired alternative, `ghost` for
 * low-emphasis inline actions.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  accentColor = 'var(--a-clay)',
  block = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  style,
}: ButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: PAD[size], borderRadius: 12, fontSize: FONT[size], fontWeight: 600,
    fontFamily: 'Geist, system-ui, sans-serif', cursor: disabled ? 'default' : 'pointer',
    width: block ? '100%' : undefined, boxSizing: 'border-box', lineHeight: 1.1,
    opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s ease', border: 0,
  }
  const skin: CSSProperties =
    variant === 'primary' ? { background: 'var(--a-ink)', color: 'var(--a-card)' }
    : variant === 'accent' ? { background: accentColor, color: '#fff' }
    : variant === 'secondary' ? { background: 'var(--a-card)', color: 'var(--a-ink)', border: '1px solid var(--a-line)' }
    : { background: 'transparent', color: 'var(--a-ink2)' }
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...skin, ...style }}>
      {children}
    </button>
  )
}
