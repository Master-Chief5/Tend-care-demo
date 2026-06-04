import { useEffect, useRef } from 'react'
import { pingStaffLocation, setStaffDuty } from '../lib/db'

// App-level "on duty" location sharing for staff. While the staff member is on
// duty (toggled in My Day), their phone shares its location with the org so the
// supervisor's team map can show where everyone is. Runs regardless of which tab
// is open. Off duty → no watch, no location.
//
// Source of truth is the staff row's on_duty flag, mirrored to localStorage so
// this hook (and the toggle UI) stay in sync without a round-trip. Toggling
// dispatches 'tend-duty-changed'.
const KEY = 'tend-on-duty'
export const isOnDuty = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

// Flip on-duty state: persist locally, write the staff row, notify listeners.
export async function setMyDuty(staffId, onDuty) {
  try { localStorage.setItem(KEY, onDuty ? '1' : '0') } catch { /* ignore */ }
  window.dispatchEvent(new Event('tend-duty-changed'))
  if (staffId) await setStaffDuty(staffId, onDuty)
}

export function useDutyTracking(user) {
  const watchId = useRef(null)

  useEffect(() => {
    const staffId = user?.staffId
    if (!staffId || typeof navigator === 'undefined' || !navigator.geolocation) return
    let stopped = false

    const stopWatch = () => { if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null } }
    const onPos = (pos) => { if (!stopped) pingStaffLocation(staffId, { lat: pos.coords.latitude, lng: pos.coords.longitude }) }

    const sync = () => {
      if (isOnDuty()) {
        if (watchId.current == null) {
          watchId.current = navigator.geolocation.watchPosition(onPos, () => {}, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 })
        }
      } else {
        stopWatch()
      }
    }

    sync()
    // Re-assert periodically so a fresh point lands even if the device is still
    // (watchPosition only fires on movement); also recovers a dropped watch.
    const iv = setInterval(() => { if (isOnDuty()) navigator.geolocation.getCurrentPosition(onPos, () => {}, { maximumAge: 15000, timeout: 20000 }) }, 25000)
    window.addEventListener('tend-duty-changed', sync)
    return () => { stopped = true; clearInterval(iv); window.removeEventListener('tend-duty-changed', sync); stopWatch() }
  }, [user?.staffId])
}
