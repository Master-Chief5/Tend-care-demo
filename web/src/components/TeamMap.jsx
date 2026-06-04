import { useEffect, useRef, useState } from 'react'
import { loadLeaflet, addBasemap } from '../lib/leaflet'
import { fetchTeamLocations } from '../lib/db'

// Supervisor's live team map: a dot per on-duty staff member (colored by house)
// with their name, refreshed on a short poll. Renders nothing when no one is on
// duty / sharing, so it never shows an empty map.
function ago(iso) {
  if (!iso) return ''
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)} hr ago`
}

export function TeamMap({ user }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const Lref = useRef(null)
  const [people, setPeople] = useState([])
  const peopleRef = useRef(people)
  peopleRef.current = people

  const houseScope = user?.role === 'manager' ? user.houseId : null

  // Poll team locations.
  useEffect(() => {
    if (!user?.orgId) return
    let stop = false
    const load = () => fetchTeamLocations(user.orgId, houseScope).then(p => { if (!stop) setPeople(p) })
    load()
    const iv = setInterval(load, 12000)
    return () => { stop = true; clearInterval(iv) }
  }, [user?.orgId, houseScope])

  function draw() {
    const L = Lref.current, map = mapRef.current, layer = layerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()
    const pts = []
    for (const p of peopleRef.current) {
      if (p.lat == null) continue
      L.circleMarker([p.lat, p.lng], { radius: 14, color: p.color, weight: 0, fillColor: p.color, fillOpacity: 0.16, interactive: false }).addTo(layer)
      L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 3, fillColor: p.color, fillOpacity: 1 })
        .bindPopup(`<strong>${p.name}</strong>${p.houseName ? ` · ${p.houseName}` : ''}<br/>Updated ${ago(p.lastSeen)}`).addTo(layer)
      L.marker([p.lat, p.lng], {
        interactive: false,
        icon: L.divIcon({
          className: 'team-label',
          html: `<span style="background:var(--a-card);border:1px solid var(--a-line);border-radius:6px;padding:1px 6px;font:600 11px Geist,sans-serif;color:var(--a-ink);white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.12)">${p.name.split(' ')[0]}</span>`,
          iconSize: [0, 0], iconAnchor: [-10, 8],
        }),
      }).addTo(layer)
      pts.push([p.lat, p.lng])
    }
    if (pts.length === 1) map.setView(pts[0], 14)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 })
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

  useEffect(() => { draw() }, [people])

  if (people.length === 0) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 8px 2px' }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: '#4caf50', boxShadow: '0 0 0 3px rgba(76,175,80,0.22)' }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--a-ink2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Team on duty · {people.length}
        </span>
      </div>
      <div ref={elRef} style={{ width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--a-line)', background: 'var(--a-paper)' }} />
    </div>
  )
}
