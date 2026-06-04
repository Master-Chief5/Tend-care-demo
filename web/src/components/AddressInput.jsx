import { useEffect, useRef } from 'react'
import { loadGoogleMaps } from '../lib/maps'

// A text input with Google Places address autocomplete when a Maps key is
// configured; otherwise a plain input. Always editable as free text.
export function AddressInput({ value, onChange, placeholder, style }) {
  const ref = useRef(null)
  useEffect(() => {
    let listener, ac, cancelled = false
    loadGoogleMaps().then((maps) => {
      if (cancelled || !maps?.places || !ref.current) return
      ac = new maps.places.Autocomplete(ref.current, {
        fields: ['formatted_address', 'name', 'geometry'],
      })
      listener = ac.addListener('place_changed', () => {
        const p = ac.getPlace() || {}
        const text = (p.name && p.formatted_address && !p.formatted_address.startsWith(p.name))
          ? `${p.name}, ${p.formatted_address}`
          : (p.formatted_address || p.name || ref.current.value)
        onChange(text)
      })
    })
    return () => { cancelled = true; if (listener) listener.remove?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} style={style} autoComplete="off" />
  )
}
