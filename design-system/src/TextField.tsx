import type { CSSProperties, ChangeEventHandler } from 'react'

export interface TextFieldProps {
  /** Caption shown above the input. */
  label?: string
  value?: string
  placeholder?: string
  /** Render a multi-line textarea instead of a single-line input. */
  multiline?: boolean
  rows?: number
  type?: string
  disabled?: boolean
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
  style?: CSSProperties
}

/**
 * A labeled text input matching the form fields used across intake, incident,
 * and setup sheets. Set `multiline` for a textarea (narratives, notes).
 */
export function TextField({ label, value, placeholder, multiline = false, rows = 3, type = 'text', disabled = false, onChange, style }: TextFieldProps) {
  const field: CSSProperties = {
    background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10,
    padding: '10px 12px', fontSize: 14, fontFamily: 'Geist, system-ui, sans-serif',
    color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  return (
    <label style={{ display: 'block', fontFamily: 'Geist, system-ui, sans-serif' }}>
      {label && <div style={{ fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }}>{label}</div>}
      {multiline
        ? <textarea value={value} placeholder={placeholder} rows={rows} disabled={disabled} onChange={onChange as ChangeEventHandler<HTMLTextAreaElement>} style={{ ...field, resize: 'vertical', ...style }} />
        : <input type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={onChange as ChangeEventHandler<HTMLInputElement>} style={{ ...field, ...style }} />}
    </label>
  )
}
