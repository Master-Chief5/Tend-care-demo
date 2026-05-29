import { useState, useEffect } from 'react'
import { HOUSES } from '../data/constants'
import { fetchTrips, addTrip } from '../lib/db'
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

function LogTripModal({ user, onClose, onAdded }) {
  const [driverName, setDriverName] = useState(user?.name || '')
  const [residentName, setResidentName] = useState('')
  const [destination, setDestination] = useState('')
  const [miles, setMiles] = useState('')
  const [purpose, setPurpose] = useState('other')
  const [houseId, setHouseId] = useState(user?.houseId || '')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!residentName.trim() || !destination.trim() || !user?.orgId) return
    setSaving(true)
    const trip = await addTrip(user.orgId, {
      houseId: houseId || null,
      driverName: driverName.trim() || 'Unknown',
      residentName: residentName.trim(),
      destination: destination.trim(),
      miles: parseFloat(miles) || 0,
      purpose,
    })
    setSaving(false)
    if (trip) onAdded(trip)
  }

  const purposeOpts = ['medical', 'grocery', 'activity', 'other']

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px', maxHeight: '85dvh', overflowY: 'auto' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 16 }}>Log trip</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input placeholder="Resident name" value={residentName} onChange={e => setResidentName(e.target.value)} autoFocus
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          <input placeholder="Destination (e.g. Dr. Patel, 14 Oak St)" value={destination} onChange={e => setDestination(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          <input placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input placeholder="Miles" value={miles} onChange={e => setMiles(e.target.value)}
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
            <select value={purpose} onChange={e => setPurpose(e.target.value)}
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }}>
              {purposeOpts.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <button type="submit" disabled={!residentName.trim() || !destination.trim() || saving}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: (residentName.trim() && destination.trim()) ? 'pointer' : 'default', opacity: (residentName.trim() && destination.trim()) ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Log trip'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function ScreenA_Driving({ user }) {
  const [trips, setTrips] = useState([])
  const [showLog, setShowLog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, showToast] = useToast()

  useEffect(() => {
    if (!user?.orgId) return
    setLoading(true)
    fetchTrips(user.orgId, user.houseId || null, null).then(data => {
      setTrips(data)
      setLoading(false)
    })
  }, [user?.orgId, user?.houseId])

  const handleAdded = (trip) => {
    setTrips(prev => [trip, ...prev])
    setShowLog(false)
    showToast('Trip logged')
  }

  const fmtDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const today = new Date()
    const diff = Math.floor((today - d) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="phone-screen">
      <Toast msg={toast} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Driving</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>Trips · Mileage</div>
          </div>
          <button onClick={() => setShowLog(true)}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconPlus size={14} sw={2.4} /> Log trip
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 22px 24px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>}

          {!loading && trips.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🚐</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No trips yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tap "Log trip" to record a resident transport.</div>
            </div>
          )}

          {!loading && trips.length > 0 && (
            <>
              <SectionHeader title="Recent trips" />
              <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                {trips.map((t, i) => {
                  const hConst = t.houses ? HOUSES.find(x => x.id === t.houses.slug) : null
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < trips.length - 1 ? '1px solid var(--a-line)' : '' }}>
                      {hConst && <div style={{ width: 3, height: 28, background: hConst.color, borderRadius: 4 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--a-ink)', fontWeight: 500 }}>{t.resident_name} → {t.destination}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>
                          {t.driver_name} · {fmtDate(t.trip_date)} · {t.purpose}
                        </div>
                      </div>
                      <div className="tnum" style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-ink2)' }}>
                        {t.miles}<span style={{ fontSize: 9, color: 'var(--a-ink3)', marginLeft: 2 }}>mi</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <SectionHeader title="Vehicles" />
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px' }}>
            <VehicleRow name="Van #1 · Sienna '22" sub="38,402 mi" status="ok" onClick={() => showToast('Van #1 — all clear')} />
            <VehicleRow name="Van #2 · Sienna '21" sub="51,108 mi" status="active" onClick={() => showToast('Van #2 — currently in use')} />
            <VehicleRow name="Van #3 · Odyssey '23" sub="Oil due — check with manager" status="due" last onClick={() => showToast('Van #3 — service needed')} />
          </div>
        </div>
      </div>

      <TabBar active="drive" />

      {showLog && (
        <LogTripModal
          user={user}
          onClose={() => setShowLog(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  )
}
