// Google Maps loader. Reads the key from VITE_GOOGLE_MAPS_API_KEY at build time.
// If no key is set, everything degrades gracefully (callers fall back to plain
// text input / no map). Add the key in Vercel → Project → Settings → Environment
// Variables as VITE_GOOGLE_MAPS_API_KEY, then redeploy.

let _promise = null

export const hasMapsKey = () => !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.resolve(null)
  if (typeof window !== 'undefined' && window.google?.maps?.places) return Promise.resolve(window.google.maps)
  if (_promise) return _promise
  _promise = new Promise((resolve) => {
    try {
      const s = document.createElement('script')
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`
      s.async = true
      s.defer = true
      s.onload = () => resolve(window.google?.maps || null)
      s.onerror = () => resolve(null)
      document.head.appendChild(s)
    } catch { resolve(null) }
  })
  return _promise
}
