import { useEffect, useRef, useState } from 'react'
import { loadLeaflet, reverseGeocode, addBasemap, makePin } from '../lib/leaflet'

// Interactive map: pan/zoom, tap or drag the pin to choose a place; reverse-
// geocodes to an address. Free (Leaflet + OpenStreetMap). Degrades to a message
// if the map library can't load.
//
// Geofence mode (pass `geofence`): also draws a radius circle around the pin and
// shows a radius slider; onPick is called with (address, coords, radiusM).
export function MapPicker({ onClose, onPick, geofence = false, initialCoords = null, initialRadius = 200, title, confirmLabel, color = '#b8552f' }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const [coords, setCoords] = useState(initialCoords)
  const [radius, setRadius] = useState(initialRadius)
  const [addr, setAddr] = useState('')
  const [looking, setLooking] = useState(false)
  const [failed, setFailed] = useState(false)
  const radiusRef = useRef(radius); radiusRef.current = radius

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled) return
      if (!L || !elRef.current) { setFailed(true); return }
      try {
        const start = initialCoords ? [initialCoords.lat, initialCoords.lng] : [40.7128, -74.006]
        const map = L.map(elRef.current, { zoomControl: true }).setView(start, initialCoords ? 16 : 12)
        mapRef.current = map
        addBasemap(L, map)
        const marker = L.marker(start, { draggable: true, icon: makePin(L, color) }).addTo(map)
        markerRef.current = marker
        if (geofence) circleRef.current = L.circle(start, { radius: radiusRef.current, color, weight: 2, fillColor: color, fillOpacity: 0.12 }).addTo(map)

        const choose = async (latlng) => {
          setCoords(latlng)
          circleRef.current?.setLatLng(latlng)
          if (geofence) return // skip address lookup for geofence
          setLooking(true)
          const a = await reverseGeocode(latlng.lat, latlng.lng)
          if (!cancelled) { setAddr(a); setLooking(false) }
        }
        if (initialCoords) choose(initialCoords)
        map.on('click', (e) => { marker.setLatLng(e.latlng); choose(e.latlng) })
        marker.on('drag', () => circleRef.current?.setLatLng(marker.getLatLng()))
        marker.on('dragend', () => choose(marker.getLatLng()))

        if (!initialCoords) navigator.geolocation?.getCurrentPosition(
          (p) => { if (cancelled) return; const ll = [p.coords.latitude, p.coords.longitude]; map.setView(ll, geofence ? 16 : 15); marker.setLatLng(ll); choose({ lat: ll[0], lng: ll[1] }) },
          () => {}, { timeout: 6000 })
        setTimeout(() => { if (!cancelled && mapRef.current) mapRef.current.invalidateSize() }, 250)
      } catch { setFailed(true) }
    })
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; circleRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live radius preview.
  useEffect(() => { circleRef.current?.setRadius(radius) }, [radius])

  const confirm = () => {
    const a = addr || (coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : '')
    onPick(a, coords, radius)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '16px 16px 28px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="serif" style={{ fontSize: 20 }}>{title || (geofence ? 'Set house location' : 'Pick destination')}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4 }}>×</button>
        </div>
        {failed ? (
          <div style={{ padding: '28px 12px', textAlign: 'center', fontSize: 13, color: 'var(--a-ink3)', lineHeight: 1.5 }}>
            {geofence ? 'Map couldn’t load right now — please close and try again.' : 'Map couldn’t load right now. You can type the address instead.'}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 8 }}>Tap the map or drag the pin{geofence ? ', then size the radius below.' : ' to set the spot.'}</div>
            <div ref={elRef} style={{ width: '100%', height: '44vh', minHeight: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--a-line)' }} />
            {geofence ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
                <span style={{ fontSize: 12, color: 'var(--a-ink2)' }}>Radius</span>
                <input type="range" min={50} max={1000} step={25} value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ flex: 1, accentColor: color }} />
                <span className="tnum" style={{ fontSize: 12.5, fontWeight: 600, width: 56, textAlign: 'right' }}>{radius} m</span>
              </div>
            ) : (
              <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '11px 13px', margin: '12px 0', fontSize: 13.5, color: 'var(--a-ink)', minHeight: 20 }}>
                {looking ? 'Finding address…' : (addr || 'Move the pin to choose a place')}
              </div>
            )}
            <button disabled={!coords} onClick={confirm}
              style={{ width: '100%', background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: coords ? 'pointer' : 'default', opacity: coords ? 1 : 0.5 }}>
              {confirmLabel || (geofence ? 'Save geofence' : 'Use this location')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
