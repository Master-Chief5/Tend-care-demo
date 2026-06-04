// Loads Leaflet (free, open-source map library) + its CSS from a CDN on demand.
// Uses OpenStreetMap tiles — no API key, no billing. Resolves null if blocked.
let _p = null

export function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.L) return Promise.resolve(window.L)
  if (_p) return _p
  _p = new Promise((resolve) => {
    try {
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.setAttribute('data-leaflet', '1')
        document.head.appendChild(link)
      }
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.async = true
      s.onload = () => {
        const L = window.L
        if (L?.Icon?.Default) {
          // Point the default marker at the CDN images (bundlers break the paths).
          delete L.Icon.Default.prototype._getIconUrl
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          })
        }
        resolve(L || null)
      }
      s.onerror = () => resolve(null)
      document.head.appendChild(s)
    } catch { resolve(null) }
  })
  return _p
}

// Forward-geocode an address string to { lat, lng } via the free Photon service.
export async function forwardGeocode(q) {
  if (!q || !q.trim()) return null
  try {
    const r = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(q)}`)
    if (!r.ok) return null
    const j = await r.json()
    const c = j.features?.[0]?.geometry?.coordinates // [lng, lat]
    return Array.isArray(c) ? { lat: c[1], lng: c[0] } : null
  } catch { return null }
}

// Reverse-geocode a point to a readable address via the free Photon service.
export async function reverseGeocode(lat, lng) {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  try {
    const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`)
    if (!r.ok) return fallback
    const j = await r.json()
    const p = j.features?.[0]?.properties || {}
    const parts = []
    if (p.name) parts.push(p.name)
    const street = [p.street, p.housenumber].filter(Boolean).join(' ')
    if (street && street !== p.name) parts.push(street)
    const locality = [p.city || p.town || p.village, p.state].filter(Boolean).join(', ')
    if (locality) parts.push(locality)
    return parts.join(', ') || fallback
  } catch { return fallback }
}
