import type { CSSProperties } from 'react'

export interface AvatarProps {
  /** Full name — initials are derived from it. */
  name: string
  /** Diameter in px. */
  size?: number
  /** Background fill (e.g. a house color). Defaults to sage. */
  color?: string
  style?: CSSProperties
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * A circular initials avatar for staff and residents. Derives initials from
 * `name`; tint it with a house color to convey assignment.
 */
export function Avatar({ name, size = 32, color = 'var(--a-sage)', style }: AvatarProps) {
  return (
    <div
      aria-label={name}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: color, color: '#fff', display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Geist, system-ui, sans-serif',
        fontWeight: 600, fontSize: Math.round(size * 0.36), letterSpacing: '0.02em',
        ...style,
      }}
    >
      {initials(name)}
    </div>
  )
}
