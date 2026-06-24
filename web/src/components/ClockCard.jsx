import { useState, useEffect, useRef } from 'react'
import { clockIn, clockOut, fetchActivePunch } from '../lib/db'
import { setMyDuty } from '../hooks/useDutyTracking'
import { IconClock, IconPin } from './icons'

// Compact time-clock card for the staff "My Day" screen. Lets a worker punch in
// and out; while clocked in it shows a live-ticking elapsed timer. Clocking in/out
// also flips the duty location-sharing hook (only for real staff ids — demo
// personas use a synthetic id and are skipped).

function fmtClock(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`
}

// Whole-seconds elapsed since an ISO timestamp, rendered "H:MM:SS".
function fmtElapsed(fromIso, nowMs) {
  if (!fromIso) return '0:00:00'
  const start = new Date(fromIso).getTime()
  let s = Math.max(0, Math.floor((nowMs - start) / 1000))
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60); s -= m * 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Best-effort geolocation — never blocks or throws; resolves {lat,lng} or {} on
// failure/timeout.
function getPosition() {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({})
    let done = false
    const finish = (v) => { if (!done) { done = true; resolve(v) } }
    try {
      navigator.geolocation.getCurrentPosition(
        pos => finish({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => finish({}),
        { timeout: 8000 }
      )
    } catch { finish({}) }
  })
}

export function ClockCard({ user }) {
  const orgId = user?.orgId
  const staffId = user?.staffId || `demo-${user?.role || 'staff'}`
  const staffName = user?.name || 'You'
  const houseId = user?.houseId || null

  const [punch, setPunch] = useState(null)   // active punch row, or null
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const tickRef = useRef(null)

  // On mount, see whether this person is already clocked in.
  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    let stop = false
    Promise.resolve(fetchActivePunch(orgId, staffId))
      .then(row => { if (!stop) setPunch(row || null) })
      .catch(() => {})
      .finally(() => { if (!stop) setLoading(false) })
    return () => { stop = true }
  }, [orgId, staffId])

  // Live timer — only runs while clocked in.
  useEffect(() => {
    const active = punch && punch.clock_in_at && !punch.clock_out_at
    if (!active) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      return
    }
    setNow(Date.now())
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null } }
  }, [punch?.id, punch?.clock_in_at, punch?.clock_out_at])

  const doClockIn = async () => {
    if (busy || !orgId) return
    setBusy(true)
    try {
      const { lat, lng } = await getPosition()
      const row = await clockIn(orgId, { houseId, staffId, staffName, role: user?.role, shiftId: null, lat, lng })
      if (row) setPunch(row)
      if (user?.staffId) { try { await setMyDuty(user.staffId, true) } catch { /* ignore */ } }
    } catch { /* ignore */ }
    setBusy(false)
  }

  const doClockOut = async () => {
    if (busy || !punch?.id) return
    setBusy(true)
    try {
      const { lat, lng } = await getPosition()
      await clockOut(punch.id, { lat, lng })
      setPunch(null)
      if (user?.staffId) { try { await setMyDuty(user.staffId, false) } catch { /* ignore */ } }
    } catch { /* ignore */ }
    setBusy(false)
  }

  const isClockedIn = !!(punch && punch.clock_in_at && !punch.clock_out_at)

  return (
    <div style={{
      background: isClockedIn ? 'var(--a-sage)' : 'var(--a-card)',
      border: `1px solid ${isClockedIn ? 'var(--a-sage)' : 'var(--a-line)'}`,
      borderRadius: 12, padding: '14px 14px', marginBottom: 12,
      transition: 'background 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: isClockedIn ? 'rgba(255,255,255,0.22)' : 'var(--a-paper)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
        }}><IconClock size={17} color={isClockedIn ? '#fff' : 'var(--a-ink)'} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: isClockedIn ? '#fff' : 'var(--a-ink)' }}>
            {isClockedIn ? 'On the clock' : 'Time clock'}
          </div>
          <div style={{ fontSize: 11, color: isClockedIn ? 'rgba(255,255,255,0.82)' : 'var(--a-ink3)', marginTop: 1, lineHeight: 1.35 }}>
            {loading
              ? 'Checking your status…'
              : isClockedIn
                ? `Since ${fmtClock(punch.clock_in_at)}`
                : 'Clock in when you start your shift.'}
          </div>
        </div>
        {isClockedIn && (
          <div style={{
            fontVariantNumeric: 'tabular-nums', fontSize: 18, fontWeight: 700,
            color: '#fff', letterSpacing: '0.01em', flexShrink: 0,
          }}>
            {fmtElapsed(punch.clock_in_at, now)}
          </div>
        )}
      </div>

      {!loading && isClockedIn && (punch.in_lat != null) && (
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.82)', marginTop: 8, marginLeft: 46, display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconPin size={11} color="rgba(255,255,255,0.82)" /> Location captured
        </div>
      )}

      {!loading && (
        <button
          onClick={isClockedIn ? doClockOut : doClockIn}
          disabled={busy || !orgId}
          style={isClockedIn ? {
            width: '100%', marginTop: 12, padding: '11px', borderRadius: 999,
            background: 'rgba(255,255,255,0.92)', color: 'var(--a-clay)',
            border: '1px solid rgba(255,255,255,0.92)', fontSize: 14, fontWeight: 600,
            fontFamily: 'Geist', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
          } : {
            width: '100%', marginTop: 12, padding: '11px', borderRadius: 999,
            background: 'var(--a-sage)', color: '#fff', border: 0,
            fontSize: 14, fontWeight: 600, fontFamily: 'Geist',
            cursor: (busy || !orgId) ? 'default' : 'pointer', opacity: (busy || !orgId) ? 0.6 : 1,
          }}>
          {busy ? (isClockedIn ? 'Clocking out…' : 'Clocking in…') : (isClockedIn ? 'Clock out' : 'Clock in')}
        </button>
      )}
    </div>
  )
}
