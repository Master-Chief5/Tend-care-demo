import { useEffect, useRef, useState } from 'react'
import { loadLeaflet, addBasemap } from '../lib/leaflet'
import { fetchTeamLocations } from '../lib/db'

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

export function TeamMap({ user }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const Lref = useRef(null)
  const [people, setPeople] = useState([])
  const peopleRef = useRef(people)
  peopleRef.current = people

  const houseScope = user?.role === 'manager' ? user.houseId : null

  useEffect(() => {
    if (!user?.orgId) return
    let stop = false
    const load = () => fetchTeamLocations(user.orgId, houseScope).then(p => { if (!stop) setPeople(p || []) })
    load()
    const iv = setInterval(load, 10000)
    const onChange = () => load()
    window.addEventListener('tend-duty-changed', onChange)
    return () => { stop = true; clearInterval(iv); window.removeEventListener('tend-duty-changed', onChange) }
  }, [user?.orgId, houseScope])

  const located = people.filter(p => p.lat != null)

  function draw() {
    const L = Lref.current, map = mapRef.current, layer = layerRef.current
    if (!L || !map || !layer) return
    map.invalidateSize()
    layer.clearLayers()
    const pts = []
    for (const p of peopleRef.current) {
      if (p.lat == null) continue
      L.circleMarker([p.lat, p.lng], { radius: 14, color: p.color, weight: 0, fillColor: p.color, fillOpacity: 0.16, interactive: false }).addTo(layer)
      L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 3, fillColor: p.color, fillOpacity: 1 })
        .bindPopup(`<strong>${p.name}</strong>${p.houseName ? ` · ${p.houseName}` : ''}<br/>Updated ${ago(p.lastSeen) || 'just now'}`).addTo(layer)
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
    if (pts.length === 1) map.setView(pts[0], 15)
    else if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 16 })
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
      // Re-measure a few times — the map often mounts before its flex container
      // has its final height, which is what leaves it blank/grey.
      ;[120, 350, 800].forEach(d => setTimeout(() => { if (!cancelled) { map.invalidateSize(); draw() } }, d))
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
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < people.length - 1 ? '1px solid var(--a-line)' : '' }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: p.lat != null ? p.color : 'var(--a-line)', flexShrink: 0, boxShadow: p.lat != null ? `0 0 0 3px ${p.color}22` : 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{p.name}{p.houseName ? <span style={{ fontWeight: 400, color: 'var(--a-ink3)' }}> · {p.houseName}</span> : ''}</div>
                <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{p.lat != null ? `On the map · updated ${seen || 'just now'}` : 'On duty · locating…'}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
