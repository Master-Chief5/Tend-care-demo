import { useEffect, useRef, useState } from 'react'
import { loadLeaflet, addBasemap, makePin, fetchRoute } from '../lib/leaflet'
import { escapeHtml } from '../lib/utils'

// Live map of in-progress trips: a dot for each worker's current location, a pin
// for the destination, and a road-following route between them (free OSRM). The
// route updates live as the worker drives; the previous route stays on screen
// while the next one loads (no flicker), and a "Loading route…" badge shows only
// on the very first fetch.
export function LiveTripsMap({ trips = [] }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const Lref = useRef(null)
  const tripsRef = useRef(trips)
  tripsRef.current = trips
  const routeCache = useRef(new Map())   // key -> route | null(pending) | false(failed)
  const lastRoute = useRef(new Map())    // tripId -> last good route coords
  const fitted = useRef(false)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)

  // Fine key (~110 m) so the route tracks the worker's movement.
  const routeKey = (a, b) => `${a.lat.toFixed(3)},${a.lng.toFixed(3)}>${b.lat.toFixed(3)},${b.lng.toFixed(3)}`

  function ensureRoute(from, to) {
    const key = routeKey(from, to)
    if (routeCache.current.has(key)) return
    routeCache.current.set(key, null)
    fetchRoute(from, to).then(res => { routeCache.current.set(key, res || false); draw() })
  }

  function drawRoute(L, layer, coords, color, pts) {
    L.polyline(coords, { color: '#fff', weight: 7, opacity: 0.7, lineCap: 'round', lineJoin: 'round' }).addTo(layer)
    L.polyline(coords, { color, weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(layer)
    coords.forEach(p => pts.push(p))
  }

  function draw() {
    const L = Lref.current, map = mapRef.current, layer = layerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()
    const pts = []
    let firstLoad = false
    for (const t of tripsRef.current) {
      const color = t.houses?.color || '#b8552f'
      const hasCur = t.cur_lat != null
      const hasDest = t.dest_lat != null
      const recent = t.started_at && (Date.now() - new Date(t.started_at).getTime() < 45000)
      let routeDrawn = false

      if (hasCur && hasDest) {
        const from = { lat: t.cur_lat, lng: t.cur_lng }, to = { lat: t.dest_lat, lng: t.dest_lng }
        const route = routeCache.current.get(routeKey(from, to))
        if (route && route.coords) {
          drawRoute(L, layer, route.coords, color, pts)
          lastRoute.current.set(t.id, route.coords)
          routeDrawn = true
        } else {
          ensureRoute(from, to)
          const lr = lastRoute.current.get(t.id)
          if (lr) {
            // Keep the last good route on screen while the next one loads.
            drawRoute(L, layer, lr, color, pts)
            routeDrawn = true
          } else {
            // First load — straight line under the "Loading route…" badge.
            L.polyline([[t.cur_lat, t.cur_lng], [t.dest_lat, t.dest_lng]], { color, weight: 3, dashArray: '2,7', lineCap: 'round', opacity: 0.7 }).addTo(layer)
          }
        }
      }

      if (hasCur) {
        L.circleMarker([t.cur_lat, t.cur_lng], { radius: 15, color, weight: 0, fillColor: color, fillOpacity: 0.18, interactive: false }).addTo(layer)
        L.circleMarker([t.cur_lat, t.cur_lng], { radius: 8, color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 })
          .bindPopup(`${escapeHtml(t.driver_name || 'Worker')} → ${escapeHtml(t.destination || '')}`).addTo(layer)
        pts.push([t.cur_lat, t.cur_lng])
      }
      if (hasDest) {
        L.marker([t.dest_lat, t.dest_lng], { icon: makePin(L, color) }).bindPopup(`Destination: ${escapeHtml(t.destination || '')}`).addTo(layer)
        pts.push([t.dest_lat, t.dest_lng])
      }

      // A freshly-started trip without its route drawn yet (waiting on a GPS fix,
      // the destination geocode, or the route fetch) shows "Loading route…" — so
      // the whole resolve window reads as loading, never a silent pin.
      if (recent && !routeDrawn && (hasCur || hasDest)) firstLoad = true
    }
    // Fit once; afterwards just keep the worker in view by panning, so the map
    // doesn't jarringly re-zoom on every position update.
    if (pts.length === 1) { if (!fitted.current) map.setView(pts[0], 14); else map.panTo(pts[0], { animate: true }) }
    else if (pts.length > 1) { if (!fitted.current) map.fitBounds(pts, { padding: [28, 28], maxZoom: 15 }) }
    if (pts.length) fitted.current = true

    if (loadingRef.current !== firstLoad) { loadingRef.current = firstLoad; setLoading(firstLoad) }
  }

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || !L || !elRef.current || mapRef.current) return
      Lref.current = L
      const map = L.map(elRef.current, { attributionControl: false, zoomControl: false, renderer: L.svg({ padding: 2 }) }).setView([40, -74], 11)
      mapRef.current = map
      addBasemap(L, map, { attribution: false })
      layerRef.current = L.layerGroup().addTo(map)
      map.whenReady(() => { map.invalidateSize(); draw() })
      ;[200, 600].forEach(d => setTimeout(() => { if (!cancelled && mapRef.current) { mapRef.current.invalidateSize(); draw() } }, d))
    })
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { draw() }, [trips])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={elRef} style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--a-line)', background: 'var(--a-paper)' }} />
      {loading && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 500, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(251,246,236,0.94)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '5px 11px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, border: '2px solid var(--a-line)', borderTopColor: 'var(--a-sage)', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink2)' }}>Loading route…</span>
        </div>
      )}
    </div>
  )
}
