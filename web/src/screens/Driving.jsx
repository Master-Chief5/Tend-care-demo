import { useState, useEffect, useRef } from 'react'
import { fetchTrips, addTrip, updateTrip, deleteTrip, fetchStaff, fetchResidents, fetchVehicles, addVehicle, startTrip, endTrip, fetchActiveTrips, setTripLocation, setTripDest } from '../lib/db'
import { forwardGeocode } from '../lib/leaflet'
import { AddressInput } from '../components/AddressInput'
import { SuggestInput } from '../components/SuggestInput'
import { MapPicker } from '../components/MapPicker'
import { LiveTripsMap } from '../components/LiveTripsMap'
import { TeamMap } from '../components/TeamMap'
// Great-circle distance in metres.
const distM = (a, b) => {
  const R = 6371000, toR = (x) => x * Math.PI / 180
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
// Trip ids this device is actively driving, persisted so live tracking resumes
// after a reload.
const MY_TRIPS_KEY = 'tend-my-trips'
const readMyTrips = () => { try { return new Set(JSON.parse(localStorage.getItem(MY_TRIPS_KEY) || '[]')) } catch { return new Set() } }
const writeMyTrips = (set) => { try { localStorage.setItem(MY_TRIPS_KEY, JSON.stringify([...set])) } catch { /* ignore */ } }
// Best-effort current location (resolves {} if unavailable / denied).
const getLoc = () => new Promise((resolve) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({})
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () => resolve({}), { timeout: 8000, enableHighAccuracy: true })
})
// Local date key (not UTC) so pay-period / "today" math matches the wall clock.
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { TabBar } from '../components/ui/TabBar'
import { IconPlus, IconCar } from '../components/icons'

export function VehicleRow({ name, sub, status, last, onClick }) {
  const m = {
    ok:     { dot: '#4a8a55', tag: 'Available' },
    active: { dot: '#d49a3a', tag: 'In use' },
    due:    { dot: '#c45a3a', tag: 'Service due' },
  }[status]
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: last ? '' : '1px dashed var(--a-line)', cursor: 'pointer' }}>
      <div style={{ width: 36, height: 26, borderRadius: 6, background: 'var(--a-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--a-ink2)' }}>
        <IconCar size={16} sw={1.7} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: m.dot }} />
        <span style={{ fontSize: 11, color: 'var(--a-ink2)' }}>{m.tag}</span>
      </div>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--a-ink2)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '14px 0 8px' }}>{title}</div>
  )
}

const inputStyle = {
  background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10,
  padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box',
}

function TripForm({ initial, defaultDriver = '', staffNames, residentNames, onSave, onCancel, saving, title, hideMiles = false }) {
  const [driverName, setDriverName]     = useState(initial?.driver_name || defaultDriver || '')
  const [residentName, setResidentName] = useState(initial?.resident_name || '')
  const [destination, setDestination]   = useState(initial?.destination || '')
  const [miles, setMiles]               = useState(initial?.miles != null ? String(initial.miles) : '')
  const [purpose, setPurpose]           = useState(initial?.purpose || 'Medical appt')
  const [showMap, setShowMap]           = useState(false)
  const [destCoords, setDestCoords]     = useState(null)

  const purposeOpts = ['Medical appt', 'Day program', 'Pharmacy', 'Grocery', 'Outing', 'Other']
  const ready = residentName.trim() && destination.trim() && driverName.trim()

  const submit = (e) => {
    e.preventDefault()
    if (!ready) return
    onSave({ driverName: driverName.trim(), residentName: residentName.trim(), destination: destination.trim(), miles: parseFloat(miles) || 0, purpose, destLat: destCoords?.lat, destLng: destCoords?.lng })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SuggestInput placeholder="Resident name" value={residentName} onChange={setResidentName}
        options={residentNames} autoFocus style={inputStyle} />
      <div>
        <AddressInput placeholder="Destination (e.g. Dr. Patel, 14 Oak St)" value={destination} onChange={(v) => { setDestination(v); setDestCoords(null) }} style={inputStyle} />
        <button type="button" onClick={() => setShowMap(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 0, color: 'var(--a-sage)', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', marginTop: 6, padding: '2px 2px' }}>
          📍 Pick on map{destCoords ? ' ✓' : ''}
        </button>
      </div>
      <SuggestInput placeholder="Driver — who's driving (required)" value={driverName} onChange={setDriverName}
        options={staffNames} style={inputStyle} />
      {showMap && <MapPicker onClose={() => setShowMap(false)} onPick={(a, c) => { setDestination(a); setDestCoords(c || null); setShowMap(false) }} />}
      <div style={{ display: 'grid', gridTemplateColumns: hideMiles ? '1fr' : '1fr 1fr', gap: 10 }}>
        {!hideMiles && <input placeholder="Miles" value={miles} onChange={e => setMiles(e.target.value)} style={inputStyle} />}
        <select value={purpose} onChange={e => setPurpose(e.target.value)} style={inputStyle}>
          {purposeOpts.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={!ready || saving}
          style={{ flex: 2, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.5 }}>
          {saving ? 'Saving…' : title}
        </button>
      </div>
    </form>
  )
}

function TripModal({ title, initial, defaultDriver = '', staffNames, residentNames, onClose, onSave, hideMiles = false, hint }) {
  const [saving, setSaving] = useState(false)
  const handleSave = async (data) => {
    setSaving(true)
    await onSave(data)
    setSaving(false)
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px', maxHeight: '85dvh', overflowY: 'auto' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: hint ? 4 : 16 }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 14 }}>{hint}</div>}
        <TripForm initial={initial} defaultDriver={defaultDriver} staffNames={staffNames} residentNames={residentNames}
          onSave={handleSave} onCancel={onClose} saving={saving} title={title} hideMiles={hideMiles} />
      </div>
    </div>
  )
}

function VehicleForm({ onSave, onCancel, saving }) {
  const [name, setName]       = useState('')
  const [plate, setPlate]     = useState('')
  const [mileage, setMileage] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), plate: plate.trim(), mileage: parseInt(mileage, 10) || 0 })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input placeholder="Vehicle name (e.g. Van #1 · Sienna '22)" value={name} onChange={e => setName(e.target.value)}
        autoFocus style={inputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input placeholder="Plate" value={plate} onChange={e => setPlate(e.target.value)} style={inputStyle} />
        <input placeholder="Mileage" value={mileage} onChange={e => setMileage(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={!name.trim() || saving}
          style={{ flex: 2, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5 }}>
          {saving ? 'Saving…' : 'Add vehicle'}
        </button>
      </div>
    </form>
  )
}

function VehicleModal({ onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  const handleSave = async (data) => {
    setSaving(true)
    await onSave(data)
    setSaving(false)
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px', maxHeight: '85dvh', overflowY: 'auto' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 16 }}>Add vehicle</div>
        <VehicleForm onSave={handleSave} onCancel={onClose} saving={saving} />
      </div>
    </div>
  )
}

function TripInProgress({ trip, onEnd }) {
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    const startedAt = trip.started_at ? new Date(trip.started_at).getTime() : (trip._startedAt || Date.now())
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    tick()
    timerRef.current = setInterval(tick, 1000)
    return () => clearInterval(timerRef.current)
  }, [trip.id, trip.started_at, trip._startedAt])

  const h = Math.floor(elapsed / 3600)
  const mins = Math.floor((elapsed % 3600) / 60)
  const secs = elapsed % 60
  const timeStr = h > 0 ? `${h}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${mins}:${String(secs).padStart(2, '0')}`
  const hColor = trip.houses?.color || '#3a7a5a'
  const dest = trip.destination?.length > 14 ? trip.destination.slice(0, 14) + '…' : trip.destination

  return (
    <div style={{ background: '#181510', borderRadius: 16, padding: '16px 18px 18px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: hColor }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50', flexShrink: 0, boxShadow: '0 0 0 3px rgba(76,175,80,0.22)' }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#4caf50', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Trip in progress</span>
        <button onClick={onEnd} style={{
          marginLeft: 'auto', background: '#b83030', border: 0, borderRadius: 8,
          padding: '4px 11px', fontSize: 11, fontWeight: 600, color: '#fff',
          fontFamily: 'Geist', cursor: 'pointer', letterSpacing: '0.01em',
        }}>End trip</button>
      </div>
      <div className="serif" style={{ fontSize: 22, color: '#f5f0e8', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 3 }}>
        {trip.resident_name} to {dest}
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(245,240,232,0.45)', marginBottom: 16 }}>
        Driver: {trip.driver_name}{trip.houses?.name ? ` · ${trip.houses.name}` : ''}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontSize: 9.5, color: 'rgba(245,240,232,0.38)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 600 }}>Time</div>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 600, color: '#f5f0e8', letterSpacing: '-0.02em', marginTop: 3 }}>{timeStr}</div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, color: 'rgba(245,240,232,0.38)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 600 }}>Distance</div>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 600, color: '#f5f0e8', letterSpacing: '-0.02em', marginTop: 3 }}>
            {trip.miles}<span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(245,240,232,0.5)', marginLeft: 3 }}>mi</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PayPeriodCard({ trips }) {
  const today = new Date()
  const periodStart = new Date(today)
  periodStart.setDate(today.getDate() - 13)
  const startStr = dstr(periodStart)

  const periodTrips = trips.filter(t => (t.trip_date || '') >= startStr)
  const totalMiles = periodTrips.reduce((s, t) => s + (Number(t.miles) || 0), 0)
  const totalCost  = totalMiles * 0.67
  const tripCount  = periodTrips.length
  const dayOfPeriod = Math.floor((today - periodStart) / 86400000)
  const daysRemaining = Math.max(0, 13 - dayOfPeriod)

  // Sparkline: daily miles for last 7 days
  const dailyMiles = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const ds = dstr(d)
    return trips.filter(t => t.trip_date === ds).reduce((s, t) => s + (Number(t.miles) || 0), 0)
  })
  const maxM = Math.max(...dailyMiles, 1)
  const W = 200, H = 36
  const pts = dailyMiles.map((m, i) => `${(i / 6) * W},${H - (m / maxM) * H}`).join(' ')
  const area = `0,${H} ${pts} ${W},${H}`

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ fontSize: 9.5, color: 'var(--a-ink3)', letterSpacing: '0.09em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>This pay period</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
        <span className="serif tnum" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>{totalMiles.toFixed(1)}</span>
        <span style={{ fontSize: 14, color: 'var(--a-ink2)' }}>mi · <strong style={{ color: 'var(--a-ink)' }}>$ {totalCost.toFixed(2)}</strong></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: tripCount > 0 ? 12 : 0, flexWrap: 'wrap', rowGap: 2 }}>
        <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>{tripCount} trip{tripCount !== 1 ? 's' : ''}</span>
        <span style={{ margin: '0 6px', color: 'var(--a-line)' }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span>
        {tripCount > 0 && (
          <>
            <span style={{ margin: '0 6px', color: 'var(--a-line)' }}>·</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--a-sage)' }}>On track</span>
          </>
        )}
      </div>
      {tripCount > 0 && (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block', height: 36 }} preserveAspectRatio="none">
          <polygon points={area} fill="var(--a-sage)" fillOpacity="0.14" />
          <polyline points={pts} fill="none" stroke="var(--a-sage)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      )}
    </div>
  )
}

function fmtShortTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'p' : 'a'}`
}

function fmtTripDate(dateStr) {
  if (!dateStr) return ''
  const today = dstr(new Date())
  if (dateStr === today) return 'Today'
  const d = new Date(dateStr + 'T12:00:00')
  const diff = Math.floor((new Date() - d) / 86400000)
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function TripRow({ trip, onEdit, onDelete, isLast }) {
  const hColor    = trip.houses?.color || 'var(--a-line)'
  const houseName = trip.houses?.name
  const title     = houseName ? `${houseName} → ${trip.destination}` : `${trip.resident_name} → ${trip.destination}`
  const timePart  = trip.created_at ? ` · ${fmtShortTime(trip.created_at)}` : ''
  const sub       = `${trip.driver_name} · ${fmtTripDate(trip.trip_date)}${timePart} · ${trip.purpose}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: isLast ? '' : '1px solid var(--a-line)' }}>
      <div style={{ width: 3, alignSelf: 'stretch', minHeight: 32, background: hColor, borderRadius: 4 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--a-ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span className="tnum" style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-ink2)' }}>
          {trip.miles}<span style={{ fontSize: 9, color: 'var(--a-ink3)', marginLeft: 1 }}>mi</span>
        </span>
        <button onClick={() => onEdit(trip)}
          style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 11, cursor: 'pointer', padding: '4px', fontFamily: 'Geist' }}>Edit</button>
        <button onClick={() => onDelete(trip.id)}
          style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 18, cursor: 'pointer', padding: '4px', lineHeight: 1 }}>×</button>
      </div>
    </div>
  )
}

export function ScreenA_Driving({ user }) {
  const [trips, setTrips]               = useState([])
  const [vehicles, setVehicles]         = useState([])
  const [staffNames, setStaffNames]     = useState([])
  const [residentNames, setResidentNames] = useState([])
  const [residentsFull, setResidentsFull] = useState([])
  const [showLog, setShowLog]           = useState(false)
  const [editTrip, setEditTrip]         = useState(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showStart, setShowStart]       = useState(false)
  const [loading, setLoading]           = useState(false)
  const [activeTrips, setActiveTrips]   = useState([])
  const [toast, showToast]              = useToast()

  const houseScope = user?.role === 'manager' ? user.houseId : null

  useEffect(() => {
    if (!user?.orgId) return
    setLoading(true)
    fetchTrips(user.orgId, houseScope, null).then(data => { setTrips(data); setLoading(false) })
    fetchStaff(user.orgId, houseScope).then(data => setStaffNames(data.map(s => s.name)))
    fetchResidents(user.orgId, houseScope).then(data => { setResidentNames(data.map(r => r.name)); setResidentsFull(data) })
    fetchVehicles(user.orgId, houseScope).then(setVehicles)
    const loadActive = () => fetchActiveTrips(user.orgId, houseScope).then(setActiveTrips)
    loadActive()
    // Poll so everyone sees trips start/end/move ~live (location is updated by
    // the app-level tracking hook).
    const iv = setInterval(loadActive, 18000)
    return () => clearInterval(iv)
  }, [user?.orgId, houseScope])

  // Start a trip now (status=active). Created instantly; GPS is captured in the
  // background so the trip never waits on the location-permission prompt.
  const handleStart = async (data) => {
    // Scope the trip to the resident's house (so a supervisor's trip isn't orphaned).
    const resHouse = residentsFull.find(r => r.name === data.residentName)?.house_id
    const houseId = user.houseId || resHouse || null
    const trip = await startTrip(user.orgId, { ...data, houseId })
    if (trip) {
      setActiveTrips(prev => [trip, ...prev])
      setTrips(prev => [trip, ...prev])
      setShowStart(false)
      showToast('Trip started')
      // Record that this device is driving this trip; the app-level tracking
      // hook (runs on any tab) picks it up and reports location + arrival.
      const my = readMyTrips(); my.add(trip.id); writeMyTrips(my); window.dispatchEvent(new Event('tend-trips-changed'))
      getLoc().then(loc => {
        if (loc.lat != null) setTripLocation(trip.id, 'start', loc)
        // No destination coords yet (typed address) → geocode in the background
        // (biased to the worker's location) so arrival can be auto-detected.
        if (trip.dest_lat == null && data.destination) {
          forwardGeocode(data.destination, loc.lat != null ? loc : null).then(c => {
            if (!c) return
            if (loc.lat != null && distM(loc, c) > 300000) return // ignore far/wrong match
            setTripDest(trip.id, c)
            setActiveTrips(prev => prev.map(t => t.id === trip.id ? { ...t, dest_lat: c.lat, dest_lng: c.lng } : t))
            window.dispatchEvent(new Event('tend-trips-changed')) // let the tracker pick up the destination
          })
        }
      })
    } else {
      showToast('Could not start trip — try again')
    }
  }

  // End an in-progress trip now; capture end location in the background.
  const handleEnd = async (trip) => {
    const my = readMyTrips(); my.delete(trip.id); writeMyTrips(my); window.dispatchEvent(new Event('tend-trips-changed'))
    const updated = await endTrip(trip.id, {})
    if (updated) {
      setActiveTrips(prev => prev.filter(t => t.id !== trip.id))
      setTrips(prev => prev.map(t => t.id === trip.id ? updated : t))
      showToast('Trip ended')
      getLoc().then(loc => { if (loc.lat != null) setTripLocation(trip.id, 'end', loc) })
    }
  }

  // Log a completed (past) trip retrospectively.
  const handleAdd = async (data) => {
    const trip = await addTrip(user.orgId, { ...data, houseId: user.houseId || null })
    if (trip) {
      setTrips(prev => [trip, ...prev])
      setShowLog(false)
      showToast('Trip logged')
    }
  }

  const handleEdit = async (data) => {
    const trip = await updateTrip(editTrip.id, data)
    if (trip) {
      setTrips(prev => prev.map(t => t.id === editTrip.id ? trip : t))
      setActiveTrips(prev => prev.map(t => t.id === editTrip.id ? { ...t, ...trip } : t))
      setEditTrip(null)
      showToast('Trip updated')
    }
  }

  const handleDelete = async (id) => {
    await deleteTrip(id)
    setTrips(prev => prev.filter(t => t.id !== id))
    setActiveTrips(prev => prev.filter(t => t.id !== id))
    showToast('Trip removed')
  }

  const handleAddVehicle = async (data) => {
    const vehicle = await addVehicle(user.orgId, { ...data, houseId: user.houseId || null })
    if (vehicle) {
      setVehicles(prev => [vehicle, ...prev])
      setShowAddVehicle(false)
      showToast('Vehicle added')
    }
  }

  // Only people who actually drive residents start live trips; supervisors monitor.
  const canDrive = user?.role === 'staff' || user?.role === 'manager'

  return (
    <div className="phone-screen">
      <Toast msg={toast} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 6px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Transportation</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--a-ink2)' }}>Resident transport — appointments, day programs, outings · mileage</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowLog(true)}
                style={{ background: 'transparent', color: 'var(--a-ink2)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
                Log past
              </button>
              {/* Live trips are started by the person driving (DSP / manager); a
                  supervisor monitors rather than logging others' drives. */}
              {canDrive && (
                <button onClick={() => setShowStart(true)}
                  style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '7px 13px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
                  <IconPlus size={13} sw={2.4} /> Start trip
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 22px 24px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>}

          {(user?.role === 'supervisor' || user?.role === 'manager') && <TeamMap user={user} />}

          {activeTrips.some(t => t.cur_lat != null || t.dest_lat != null) && (
            <div style={{ marginBottom: 14 }}>
              <SectionHeader title={user?.role === 'supervisor' ? 'Live · workers in transit' : 'Live map'} />
              <LiveTripsMap trips={activeTrips} />
            </div>
          )}

          {activeTrips.map(t => (
            <TripInProgress key={t.id} trip={t} onEnd={() => handleEnd(t)} />
          ))}

          {!loading && trips.length > 0 && (
            <PayPeriodCard trips={trips} />
          )}

          {!loading && trips.length === 0 && activeTrips.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🚐</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No trips yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tap "Start trip" when leaving, or "Log past" to record a completed one.</div>
            </div>
          )}

          {(() => {
            const recent = trips.filter(t => t.status !== 'active')
            return recent.length > 0 && (
              <>
                <SectionHeader title="Recent trips" />
                <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                  {recent.map((t, i) => (
                    <TripRow key={t.id} trip={t} onEdit={setEditTrip} onDelete={handleDelete} isLast={i === recent.length - 1} />
                  ))}
                </div>
              </>
            )
          })()}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionHeader title="Vehicles" />
            <button onClick={() => setShowAddVehicle(true)}
              style={{ background: 'transparent', border: 0, color: 'var(--a-ink2)', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Geist', cursor: 'pointer' }}>
              <IconPlus size={12} sw={2.4} /> Add vehicle
            </button>
          </div>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px' }}>
            {vehicles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--a-ink3)', fontSize: 12.5 }}>No vehicles added yet</div>
            )}
            {vehicles.map((v, i) => {
              const mileageStr = v.mileage?.toLocaleString?.() ?? v.mileage
              const sub = v.plate ? `${mileageStr} mi · ${v.plate}` : `${mileageStr} mi`
              const status = v.mileage > 50000 ? 'due' : 'ok'
              return (
                <VehicleRow key={v.id} name={v.name} sub={sub} status={status} last={i === vehicles.length - 1}
                  onClick={() => showToast(status === 'due' ? `${v.name} — service due` : `${v.name} — all clear`)} />
              )
            })}
          </div>
        </div>
      </div>

      <TabBar active="drive" />

      {showStart && (
        <TripModal title="Start trip" hideMiles hint="Your location is captured at start and end so the team can see the trip is underway."
          defaultDriver={user?.name} staffNames={staffNames} residentNames={residentNames}
          onClose={() => setShowStart(false)} onSave={handleStart} />
      )}
      {showLog && (
        <TripModal title="Log past trip" defaultDriver={user?.name} staffNames={staffNames} residentNames={residentNames}
          onClose={() => setShowLog(false)} onSave={handleAdd} />
      )}
      {editTrip && (
        <TripModal title="Edit trip" initial={editTrip} staffNames={staffNames} residentNames={residentNames}
          onClose={() => setEditTrip(null)} onSave={handleEdit} />
      )}
      {showAddVehicle && (
        <VehicleModal onClose={() => setShowAddVehicle(false)} onSave={handleAddVehicle} />
      )}
    </div>
  )
}
