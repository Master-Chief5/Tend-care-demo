import { useEffect, useRef } from 'react'
import { fetchActiveTrips, pingTrip, markArrived } from '../lib/db'

// App-level live trip tracking. Runs regardless of which tab is open, so a
// worker's location keeps reporting (and arrival auto-detects) during a drive
// even if they navigate away from Transport. The Driving screen records which
// trips this device started in localStorage ('tend-my-trips') and dispatches a
// 'tend-trips-changed' event; this hook watches GPS for those trips only.
const KEY = 'tend-my-trips'
const ARRIVE_M = 130
const readMy = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() } }
const writeMy = (set) => { try { localStorage.setItem(KEY, JSON.stringify([...set])) } catch { /* ignore */ } }
const distM = (a, b) => {
  const R = 6371000, t = (x) => x * Math.PI / 180
  const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function useTripTracking(user, onArrived) {
  const active = useRef([])      // my active trips (with coords)
  const watchId = useRef(null)
  const onArrivedRef = useRef(onArrived)
  onArrivedRef.current = onArrived

  useEffect(() => {
    if (!user?.orgId || typeof navigator === 'undefined' || !navigator.geolocation) return
    let stopped = false
    const houseScope = user.role === 'manager' ? user.houseId : null

    const stopWatch = () => { if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null } }

    const onPos = (pos) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      for (const tr of active.current) {
        pingTrip(tr.id, c)
        if (tr.dest_lat != null && distM(c, { lat: tr.dest_lat, lng: tr.dest_lng }) < ARRIVE_M) {
          const my = readMy(); my.delete(tr.id); writeMy(my)
          active.current = active.current.filter(x => x.id !== tr.id)
          markArrived(tr.id, c).then(u => {
            if (u) onArrivedRef.current?.(u)
            else { const m = readMy(); m.add(tr.id); writeMy(m) } // retry next refresh
          })
        }
      }
    }

    const refresh = async () => {
      const my = readMy()
      if (my.size === 0) { active.current = []; stopWatch(); return }
      const rows = await fetchActiveTrips(user.orgId, houseScope)
      if (stopped) return
      active.current = (rows || []).filter(r => my.has(r.id))
      if (active.current.length > 0 && watchId.current == null) {
        watchId.current = navigator.geolocation.watchPosition(onPos, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 })
      } else if (active.current.length === 0) {
        stopWatch()
      }
    }

    refresh()
    const iv = setInterval(refresh, 15000)
    const onChange = () => refresh()
    window.addEventListener('tend-trips-changed', onChange)
    return () => { stopped = true; clearInterval(iv); window.removeEventListener('tend-trips-changed', onChange); stopWatch() }
  }, [user?.orgId, user?.role, user?.houseId])
}
