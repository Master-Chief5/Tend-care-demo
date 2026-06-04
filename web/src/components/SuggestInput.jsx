import { useState, useRef, useEffect } from 'react'

// On-brand autocomplete: a styled suggestion dropdown that matches the app
// (replaces the browser's inconsistent <datalist>). Filters a list of options
// by what's typed; always allows free text.
export function SuggestInput({ value, onChange, options = [], placeholder, style, autoFocus, max = 7, type, inputMode }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc) }
  }, [])

  const q = (value || '').toLowerCase().trim()
  const matches = options.filter(o => o && o.toLowerCase() !== q && (!q || o.toLowerCase().includes(q))).slice(0, max)
  const show = open && matches.length > 0

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <input
        value={value} autoFocus={autoFocus} placeholder={placeholder} autoComplete="off" type={type} inputMode={inputMode}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        style={style}
      />
      {show && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, boxShadow: '0 10px 28px rgba(0,0,0,0.16)', overflow: 'hidden', maxHeight: 210, overflowY: 'auto' }}>
          {matches.map((o, i) => (
            <button key={o} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(o); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: '9px 12px', fontSize: 13.5, fontFamily: 'Geist', color: 'var(--a-ink)', cursor: 'pointer', borderBottom: i < matches.length - 1 ? '1px solid var(--a-line)' : '' }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
