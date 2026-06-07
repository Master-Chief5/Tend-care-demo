import { useEffect, useState } from 'react'
import { GEO_EVENT } from '../lib/geoStatus'

// Shows a dismissible banner when location sharing is denied while the app is
// trying to use it (on duty or driving a trip). A successful fix clears it.
// Mounted once per shell; silent until something actually goes wrong.
export function GeoStatusBanner() {
  const [denied, setDenied] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onStatus = (e) => {
      const d = e.detail || {}
      if (d.ok) { setDenied(false); setDismissed(false) }
      else if (d.denied) setDenied(true)
    }
    window.addEventListener(GEO_EVENT, onStatus)
    return () => window.removeEventListener(GEO_EVENT, onStatus)
  }, [])

  if (!denied || dismissed) return null

  return (
    <div style={{
      position: 'fixed', top: 'calc(8px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9998, width: 'calc(100% - 24px)', maxWidth: 460,
      background: '#fadcd7', border: '1px solid #e0b4ab', borderRadius: 12,
      padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontFamily: 'Geist, sans-serif',
    }}>
      <span style={{ fontSize: 16 }}>📍</span>
      <span style={{ flex: 1, fontSize: 12, color: '#a93a25', fontWeight: 600, lineHeight: 1.4 }}>
        Location sharing is off — Tend can't update your spot on the team map or auto-detect arrivals. Enable location access for this app.
      </span>
      <button onClick={() => setDismissed(true)}
        style={{ border: 0, background: 'transparent', color: '#a93a25', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 2 }}>×</button>
    </div>
  )
}
