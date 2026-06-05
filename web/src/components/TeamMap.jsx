import { useEffect, useRef, useState } from 'react'
import { loadLeaflet, addBasemap } from '../lib/leaflet'
import { fetchTeamLocations, fetchHouseGeofences } from '../lib/db'
import { escapeHtml } from '../lib/utils'

// Supervisor's live team view: a roster of everyone on duty plus a map of those
// whose phone has reported a location. Renders nothing when no one is on duty.
function ago(iso) {
  if (!iso) return null
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)} hr ago`
}
// Haversine distance in metres.
function distM(a, b) {
  const R = 6371000, t = (x) => x * Math.PI / 180
  const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function TeamMap({ user }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const Lref = useRef(null)
  const [people, setPeople] = useState([])
  const [geos, setGeos] = useState([])
  const geosRef = useRef(geos)
  geosRef.current = geos
  const peopleRef = useRef(people)
  peopleRef.current = people

  const houseScope = user?.role === 'manager' ? user.houseId : null

  useEffect(() => {
    if (!user?.orgId) return
    let stop = false
    const load = () => fetchTeamLocations(user.orgId, houseScope).then(p => { if (!stop) setPeople(p || []) })
    load()
    fetchHouseGeofences(user.orgId).then(g => { if (!stop) setGeos((g || []).filter(x => x.lat != null)) })
    const iv = setInterval(load, 10000)
    const onChange = () => load()
    window.addEventListener('tend-duty-changed', onChange)
    return () => { stop = true; clearInterval(iv); window.removeEventListener('tend-duty-changed', onChange) }
  }, [user?.orgId, houseScope])

  // Is this person outside their house's geofence? null = unknown (no pin/fix).
  const geoFor = (p) => geos.find(g => g.id === p.houseId)
  const outsideOf = (p) => {
    if (p.lat == null) return null
    const g = geoFor(p)
    if (!g || g.lat == null) return null
    return distM({ lat: p.lat, lng: p.lng }, { lat: g.lat, lng: g.lng }) > (g.radiusM || 200)
  }
  const located = people.filter(p => p.lat != null)
  const outside = people.filter(p => outsideOf(p) === true)

  function draw() {
    const L = Lref.current, map = mapRef.current, layer = layerRef.current
    if (!L || !map || !layer) return
    map.invalidateSize()
    layer.clearLayers()
    const pts = []
    // Geofence perimeter circles for houses that have on-duty staff.
    const activeHouses = new Set(peopleRef.current.map(p => p.houseId))
    for (const g of geosRef.current) {
      if (!activeHouses.has(g.id) || g.lat == null) continue
      L.circle([g.lat, g.lng], { radius: g.radiusM || 200, color: g.color, weight: 1.5, opacity: 0.6, fillColor: g.color, fillOpacity: 0.06, interactive: false }).addTo(layer)
      pts.push([g.lat, g.lng])
    }
    for (const p of peopleRef.current) {
      if (p.lat == null) continue
      const isOut = outsideOf(p) === true
      const dotColor = isOut ? '#c0392b' : p.color
      L.circleMarker([p.lat, p.lng], { radius: 14, color: dotColor, weight: 0, fillColor: dotColor, fillOpacity: 0.16, interactive: false }).addTo(layer)
      L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 3, fillColor: dotColor, fillOpacity: 1 })
        .bindPopup(`<strong>${escapeHtml(p.name)}</strong>${p.houseName ? ` · ${escapeHtml(p.houseName)}` : ''}<br/>${isOut ? '⚠ Outside perimeter<br/>' : ''}Updated ${ago(p.lastSeen) || 'just now'}`).addTo(layer)
      L.marker([p.lat, p.lng], {
        interactive: false,
        icon: L.divIcon({
          className: 'team-label',
          html: `<span style="background:var(--a-card);border:1px solid var(--a-line);border-radius:6px;padding:1px 6px;font:600 11px Geist,sans-serif;color:var(--a-ink);white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.12)">${escapeHtml(p.name.split(' ')[0])}</span>`,
          iconSize: [0, 0], iconAnchor: [-10, 8],
        }),
      }).addTo(layer)
      pts.push([p.lat, p.lng])
    }
    // De-dupe near-identical points (e.g. one device testing two accounts) so
    // fitBounds doesn't collapse to a zero-size box.
    const uniq = pts.filter((p, i) => i === pts.findIndex(q => Math.abs(q[0] - p[0]) < 1e-5 && Math.abs(q[1] - p[1]) < 1e-5))
    if (uniq.length === 1) map.setView(uniq[0], 15)
    else if (uniq.length > 1) map.fitBounds(uniq, { padding: [30, 30], maxZoom: 16 })
  }

  useEffect(() => {
    let cancelled = false
    let tries = 0
    let ro = null
    const init = (L) => {
      if (cancelled || !L || !elRef.current || mapRef.current) return
      Lref.current = L
      const map = L.map(elRef.current, { attributionControl: false, zoomControl: false, renderer: L.svg({ padding: 2 }) }).setView([40, -74], 11)
      mapRef.current = map
      addBasemap(L, map, { attribution: false })
      layerRef.current = L.layerGroup().addTo(map)
      map.whenReady(() => { map.invalidateSize(); draw() })
      // Re-measure as the container settles (mounts before flex height is final).
      ;[100, 300, 600, 1200].forEach(d => setTimeout(() => { if (!cancelled && mapRef.current) { map.invalidateSize(); draw() } }, d))
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => { if (mapRef.current) mapRef.current.invalidateSize() })
        ro.observe(elRef.current)
      }
    }
    const attempt = () => loadLeaflet().then((L) => {
      if (cancelled) return
      if (L) return init(L)
      // CDN slow/blocked on this load — retry a couple of times before giving up.
      if (tries++ < 3) setTimeout(attempt, 1500)
    })
    attempt()
    return () => { cancelled = true; if (ro) ro.disconnect(); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { draw() }, [people, geos])

  if (people.length === 0) return null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 8px 2px' }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: '#4caf50', boxShadow: '0 0 0 3px rgba(76,175,80,0.22)' }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--a-ink2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Team on duty · {people.length}
        </span>
      </div>

      {outside.length > 0 && (
        <div style={{ background: '#fadcd7', border: '1px solid #e0b4ab', borderRadius: 12, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 12, color: '#a93a25', fontWeight: 600, lineHeight: 1.4 }}>
            {outside.map(p => p.name.split(' ')[0]).join(', ')} {outside.length === 1 ? 'is' : 'are'} outside the house perimeter.
          </span>
        </div>
      )}

      {/* Map (only useful once someone has reported a location) */}
      <div ref={elRef} style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--a-line)', background: 'var(--a-paper)', display: located.length ? 'block' : 'none' }} />
      {located.length === 0 && (
        <div style={{ background: 'var(--a-card)', border: '1px dashed var(--a-line)', borderRadius: 12, padding: '14px', textAlign: 'center', fontSize: 12, color: 'var(--a-ink3)', lineHeight: 1.5 }}>
          Waiting for a location fix… on-duty staff appear on the map once their phone shares GPS (they may need to allow location).
        </div>
      )}

      {/* Roster — always shown, so the team is visible even with no map pin yet */}
      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
        {people.map((p, i) => {
          const seen = ago(p.lastSeen)
          const isOut = outsideOf(p) === true
          const dot = isOut ? '#c0392b' : (p.lat != null ? p.color : 'var(--a-line)')
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < people.length - 1 ? '1px solid var(--a-line)' : '' }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: dot, flexShrink: 0, boxShadow: p.lat != null ? `0 0 0 3px ${dot}22` : 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{p.name}{p.houseName ? <span style={{ fontWeight: 400, color: 'var(--a-ink3)' }}> · {p.houseName}</span> : ''}</div>
                <div style={{ fontSize: 10.5, color: isOut ? '#a93a25' : 'var(--a-ink3)', marginTop: 1, fontWeight: isOut ? 600 : 400 }}>{isOut ? '⚠ Outside perimeter' : p.lat != null ? `On the map · updated ${seen || 'just now'}` : 'On duty · locating…'}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
