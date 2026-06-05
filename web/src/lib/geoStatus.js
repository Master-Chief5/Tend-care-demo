// Lightweight pub/sub for geolocation status, so the app-level tracking hooks
// (which have no UI of their own) can surface GPS problems to the user. The
// GeoStatusBanner listens for these events.
export const GEO_EVENT = 'tend-geo-status'

// detail: { ok: boolean, denied?: boolean, kind: 'trip' | 'duty', message?: string }
export function reportGeo(detail) {
  try { window.dispatchEvent(new CustomEvent(GEO_EVENT, { detail })) } catch { /* ignore */ }
}

// Build an error detail from a GeolocationPositionError. code 1 = permission
// denied (the actionable case worth surfacing prominently).
export function geoError(err, kind) {
  return { ok: false, denied: !!err && err.code === 1, kind, message: err?.message || 'Location unavailable' }
}
