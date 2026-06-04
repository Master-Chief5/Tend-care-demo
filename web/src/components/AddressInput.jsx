import { useState, useEffect, useRef } from 'react'

// Free address autocomplete backed by OpenStreetMap (Photon geocoder).
// No API key, no billing. Runs client-side in the user's browser; if the
// service is unreachable it silently degrades to a plain text field.
function fmtPlace(p = {}) {
  const parts = []
  if (p.name) parts.push(p.name)
  const street = [p.street, p.housenumber].filter(Boolean).join(' ')
  if (street && street !== p.name) parts.push(street)
  const locality = [p.city || p.town || p.village, p.state].filter(Boolean).join(', ')
  if (locality) parts.push(locality)
  if (!parts.length && p.country) parts.push(p.country)
  return parts.join(', ')
}

export function AddressInput({ value, onChange, placeholder, style }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const skip = useRef(false)   // suppress the fetch triggered by selecting a suggestion
  const timer = useRef(null)
  const wrap = useRef(null)

  useEffect(() => {
    if (skip.current) { skip.current = false; return }
    const q = (value || '').trim()
    if (q.length < 3) { setSuggestions([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`https://photon.komoot.io/api/?limit=5&lang=en&q=${encodeURIComponent(q)}`)
        if (!r.ok) return
        const j = await r.json()
        const list = (j.features || []).map(f => fmtPlace(f.properties)).filter(Boolean)
        setSuggestions([...new Set(list)])
        setOpen(true)
      } catch { /* offline / blocked — free text still works */ }
    }, 320)
    return () => clearTimeout(timer.current)
  }, [value])

  useEffect(() => {
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc) }
  }, [])

  const pick = (s) => { skip.current = true; onChange(s); setSuggestions([]); setOpen(false) }

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { if (suggestions.length) setOpen(true) }}
        placeholder={placeholder}
        autoComplete="off"
        style={style}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, boxShadow: '0 10px 28px rgba(0,0,0,0.16)', overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => pick(s)} style={{
              display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent',
              padding: '10px 12px', fontSize: 13, fontFamily: 'Geist', color: 'var(--a-ink)', cursor: 'pointer',
              borderBottom: i < suggestions.length - 1 ? '1px solid var(--a-line)' : '',
            }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}
