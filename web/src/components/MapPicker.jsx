import { useEffect, useRef, useState } from 'react'
import { loadLeaflet, reverseGeocode, addBasemap, makePin } from '../lib/leaflet'

// Interactive map: pan/zoom, tap or drag the pin to choose a place; reverse-
// geocodes to an address. Free (Leaflet + OpenStreetMap). Degrades to a message
// if the map library can't load.
export function MapPicker({ onClose, onPick }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [coords, setCoords] = useState(null)
  const [addr, setAddr] = useState('')
  const [looking, setLooking] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled) return
      if (!L || !elRef.current) { setFailed(true); return }
      const start = [40.7128, -74.006]
      const map = L.map(elRef.current, { zoomControl: true }).setView(start, 12)
      mapRef.current = map
      addBasemap(L, map)
      const marker = L.marker(start, { draggable: true, icon: makePin(L, '#b8552f') }).addTo(map)
      markerRef.current = marker

      const choose = async (latlng) => {
        setCoords(latlng); setLooking(true)
        const a = await reverseGeocode(latlng.lat, latlng.lng)
        if (!cancelled) { setAddr(a); setLooking(false) }
      }
      choose({ lat: start[0], lng: start[1] })
      map.on('click', (e) => { marker.setLatLng(e.latlng); choose(e.latlng) })
      marker.on('dragend', () => choose(marker.getLatLng()))

      navigator.geolocation?.getCurrentPosition(
        (p) => { const ll = [p.coords.latitude, p.coords.longitude]; map.setView(ll, 15); marker.setLatLng(ll); choose({ lat: ll[0], lng: ll[1] }) },
        () => {}, { timeout: 6000 })
      setTimeout(() => map.invalidateSize(), 250)
    })
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '16px 16px 28px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="serif" style={{ fontSize: 20 }}>Pick destination</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4 }}>×</button>
        </div>
        {failed ? (
          <div style={{ padding: '28px 12px', textAlign: 'center', fontSize: 13, color: 'var(--a-ink3)', lineHeight: 1.5 }}>
            Map couldn't load right now. You can type the address instead.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 8 }}>Tap the map or drag the pin to set the spot.</div>
            <div ref={elRef} style={{ width: '100%', height: '46vh', minHeight: 240, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--a-line)' }} />
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '11px 13px', margin: '12px 0', fontSize: 13.5, color: 'var(--a-ink)', minHeight: 20 }}>
              {looking ? 'Finding address…' : (addr || 'Move the pin to choose a place')}
            </div>
            <button disabled={!coords} onClick={() => onPick(addr || (coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : ''), coords)}
              style={{ width: '100%', background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: coords ? 'pointer' : 'default', opacity: coords ? 1 : 0.5 }}>
              Use this location
            </button>
          </>
        )}
      </div>
    </div>
  )
}
