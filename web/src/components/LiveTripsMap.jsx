import { useEffect, useRef } from 'react'
import { loadLeaflet, addBasemap, makePin } from '../lib/leaflet'

// Live map of in-progress trips: a dot for each worker's current location, a pin
// for the destination, and a dashed line between. Free (Leaflet + OSM tiles).
export function LiveTripsMap({ trips = [] }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const Lref = useRef(null)
  const tripsRef = useRef(trips)
  tripsRef.current = trips

  function draw() {
    const L = Lref.current, map = mapRef.current, layer = layerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()
    const pts = []
    for (const t of tripsRef.current) {
      const color = t.houses?.color || '#b8552f'
      if (t.cur_lat != null) {
        // Soft halo under the worker dot so it reads as a "live" location.
        L.circleMarker([t.cur_lat, t.cur_lng], { radius: 15, color, weight: 0, fillColor: color, fillOpacity: 0.18, interactive: false }).addTo(layer)
        L.circleMarker([t.cur_lat, t.cur_lng], { radius: 8, color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 })
          .bindPopup(`${t.driver_name || 'Worker'} → ${t.destination || ''}`).addTo(layer)
        pts.push([t.cur_lat, t.cur_lng])
      }
      if (t.dest_lat != null) {
        L.marker([t.dest_lat, t.dest_lng], { icon: makePin(L, color) }).bindPopup(`Destination: ${t.destination || ''}`).addTo(layer)
        pts.push([t.dest_lat, t.dest_lng])
        if (t.cur_lat != null) L.polyline([[t.cur_lat, t.cur_lng], [t.dest_lat, t.dest_lng]], { color, weight: 3, dashArray: '2,7', lineCap: 'round', opacity: 0.7 }).addTo(layer)
      }
    }
    if (pts.length === 1) map.setView(pts[0], 14)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [28, 28], maxZoom: 15 })
  }

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || !L || !elRef.current || mapRef.current) return
      Lref.current = L
      const map = L.map(elRef.current, { attributionControl: false, zoomControl: false }).setView([40, -74], 11)
      mapRef.current = map
      addBasemap(L, map, { attribution: false })
      layerRef.current = L.layerGroup().addTo(map)
      setTimeout(() => { map.invalidateSize(); draw() }, 200)
    })
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { draw() }, [trips])

  return <div ref={elRef} style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--a-line)', background: 'var(--a-paper)' }} />
}
