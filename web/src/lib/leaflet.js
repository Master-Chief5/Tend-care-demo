// Loads Leaflet (free, open-source map library) + its CSS from a CDN on demand.
// Uses CARTO Voyager tiles (free, no API key) with a warm tone to match Tend.
// Resolves null if blocked.
let _p = null

// Warm, low-key basemap. CARTO Voyager is a clean light style; the warm filter
// (applied via the .tend-map class in globals.css) tints it toward Tend's cream
// palette so colored pins and routes stay the focus.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '© OpenStreetMap · © CARTO'

// Add the Tend basemap to a map. Tags the map container so the warm CSS filter
// applies. Pass { attribution: false } to hide the credit (small embeds).
export function addBasemap(L, map, { attribution = true } = {}) {
  const el = map.getContainer()
  if (el) el.classList.add('tend-map')
  return L.tileLayer(TILE_URL, {
    maxZoom: 20,
    detectRetina: true,
    subdomains: 'abcd',
    attribution: attribution ? TILE_ATTR : '',
  }).addTo(map)
}

// A clean teardrop pin in a given color (white border + inner dot). Replaces
// the generic blue Leaflet default so destinations read as on-brand.
export function makePin(L, color = '#b8552f') {
  const html =
    `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M15 39c0-1-9-12.5-11.4-19A12 12 0 1 1 26.4 20C24 26.5 15 38 15 39z" fill="${color}" stroke="#fff" stroke-width="2.2"/>` +
    `<circle cx="15" cy="14" r="5.2" fill="#fff"/></svg>`
  return L.divIcon({
    html,
    className: 'tend-pin',
    iconSize: [30, 40],
    iconAnchor: [15, 39],
    popupAnchor: [0, -34],
  })
}

export function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.L) return Promise.resolve(window.L)
  if (_p) return _p
  const p = new Promise((resolve) => {
    try {
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.setAttribute('data-leaflet', '1')
        document.head.appendChild(link)
      }
      const onReady = () => {
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
      // Reuse a script tag from a prior (failed/slow) attempt rather than piling
      // up duplicates.
      let s = document.querySelector('script[data-leaflet]')
      if (window.L) return onReady()
      if (!s) {
        s = document.createElement('script')
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        s.async = true
        s.setAttribute('data-leaflet', '1')
        document.head.appendChild(s)
      }
      s.addEventListener('load', onReady)
      s.addEventListener('error', () => resolve(null))
    } catch { resolve(null) }
  })
  // Cache only a SUCCESSFUL load. On failure, clear the cache so the next map
  // that mounts retries — otherwise one slow/failed CDN fetch leaves every map
  // blank for the rest of the session.
  _p = p.then((L) => { if (!L) _p = null; return L })
  return _p
}

// Forward-geocode an address to { lat, lng } via free Photon. Pass `near`
// ({lat,lng}) to bias results nearby — important so a vague address doesn't
// resolve to another country (which would break arrival geofencing).
export async function forwardGeocode(q, near) {
  if (!q || !q.trim()) return null
  try {
    let url = `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(q)}`
    if (near && near.lat != null) url += `&lat=${near.lat}&lon=${near.lng}`
    const r = await fetch(url)
    if (!r.ok) return null
    const j = await r.json()
    const c = j.features?.[0]?.geometry?.coordinates // [lng, lat]
    return Array.isArray(c) ? { lat: c[1], lng: c[0] } : null
  } catch { return null }
}

// Road-following route between two points via the free OSRM demo server (no API
// key). Returns { coords: [[lat,lng],…], distanceM, durationS } following actual
// roads — the "Google Maps route" look — or null if unavailable (caller falls
// back to a straight line).
export async function fetchRoute(from, to) {
  if (!from || !to || from.lat == null || to.lat == null) return null
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    const r = await fetch(url)
    if (!r.ok) return null
    const j = await r.json()
    const route = j.routes?.[0]
    const line = route?.geometry?.coordinates // [[lng,lat],…]
    if (!Array.isArray(line) || line.length < 2) return null
    return { coords: line.map(c => [c[1], c[0]]), distanceM: route.distance, durationS: route.duration }
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
