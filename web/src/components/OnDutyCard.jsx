import { useState, useEffect } from 'react'
import { isOnDuty, setMyDuty } from '../hooks/useDutyTracking'

// Staff control for sharing live location while on shift. Honest + consent-based:
// the staff member explicitly goes on/off duty, and the card states plainly that
// their supervisor can see their location while on duty.
export function OnDutyCard({ user }) {
  const [on, setOn] = useState(isOnDuty())

  useEffect(() => {
    const sync = () => setOn(isOnDuty())
    window.addEventListener('tend-duty-changed', sync)
    return () => window.removeEventListener('tend-duty-changed', sync)
  }, [])

  const toggle = async () => {
    const next = !on
    setOn(next)
    // Ask for permission up front so the first point lands promptly.
    if (next) navigator.geolocation?.getCurrentPosition(() => {}, () => {}, { timeout: 8000 })
    await setMyDuty(user?.staffId, next)
  }

  return (
    <div style={{
      background: on ? 'var(--a-sage)' : 'var(--a-card)',
      border: `1px solid ${on ? 'var(--a-sage)' : 'var(--a-line)'}`,
      borderRadius: 12, padding: '12px 14px', marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.2s',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: on ? 'rgba(255,255,255,0.22)' : 'var(--a-paper)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
      }}>📍</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: on ? '#fff' : 'var(--a-ink)' }}>
          {on ? 'On duty · sharing location' : 'Off duty'}
        </div>
        <div style={{ fontSize: 11, color: on ? 'rgba(255,255,255,0.82)' : 'var(--a-ink3)', marginTop: 1, lineHeight: 1.35 }}>
          {on ? 'Your supervisor can see your location while you’re on duty.' : 'Go on duty to share your location during your shift.'}
        </div>
      </div>
      <button onClick={toggle} aria-label={on ? 'Go off duty' : 'Go on duty'} style={{
        width: 46, height: 27, borderRadius: 999, border: 0, flexShrink: 0, cursor: 'pointer',
        background: on ? 'rgba(255,255,255,0.9)' : 'var(--a-line)', position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: '50%',
          background: on ? 'var(--a-sage)' : 'var(--a-card)', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }} />
      </button>
    </div>
  )
}
