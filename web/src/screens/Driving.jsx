import { useState, useEffect } from 'react'
import { fetchTrips, addTrip, updateTrip, deleteTrip, fetchStaff, fetchResidents, fetchVehicles, addVehicle } from '../lib/db'
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

function TripForm({ initial, staffNames, residentNames, onSave, onCancel, saving, title }) {
  const [driverName, setDriverName]     = useState(initial?.driver_name || '')
  const [residentName, setResidentName] = useState(initial?.resident_name || '')
  const [destination, setDestination]   = useState(initial?.destination || '')
  const [miles, setMiles]               = useState(initial?.miles != null ? String(initial.miles) : '')
  const [purpose, setPurpose]           = useState(initial?.purpose || 'other')

  const purposeOpts = ['medical', 'grocery', 'activity', 'other']

  const submit = (e) => {
    e.preventDefault()
    if (!residentName.trim() || !destination.trim()) return
    onSave({ driverName: driverName.trim() || 'Unknown', residentName: residentName.trim(), destination: destination.trim(), miles: parseFloat(miles) || 0, purpose })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <datalist id="dl-residents">{residentNames.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="dl-staff">{staffNames.map(n => <option key={n} value={n} />)}</datalist>

      <input placeholder="Resident name" value={residentName} onChange={e => setResidentName(e.target.value)}
        list="dl-residents" autoFocus style={inputStyle} />
      <input placeholder="Destination (e.g. Dr. Patel, 14 Oak St)" value={destination} onChange={e => setDestination(e.target.value)}
        style={inputStyle} />
      <input placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)}
        list="dl-staff" style={inputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input placeholder="Miles" value={miles} onChange={e => setMiles(e.target.value)} style={inputStyle} />
        <select value={purpose} onChange={e => setPurpose(e.target.value)} style={inputStyle}>
          {purposeOpts.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={!residentName.trim() || !destination.trim() || saving}
          style={{ flex: 2, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: (residentName.trim() && destination.trim()) ? 'pointer' : 'default', opacity: (residentName.trim() && destination.trim()) ? 1 : 0.5 }}>
          {saving ? 'Saving…' : title}
        </button>
      </div>
    </form>
  )
}

function TripModal({ title, initial, staffNames, residentNames, onClose, onSave }) {
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
        <div className="serif" style={{ fontSize: 22, marginBottom: 16 }}>{title}</div>
        <TripForm initial={initial} staffNames={staffNames} residentNames={residentNames}
          onSave={handleSave} onCancel={onClose} saving={saving} title={title} />
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

export function ScreenA_Driving({ user }) {
  const [trips, setTrips]         = useState([])
  const [vehicles, setVehicles]   = useState([])
  const [staffNames, setStaffNames]     = useState([])
  const [residentNames, setResidentNames] = useState([])
  const [showLog, setShowLog]     = useState(false)
  const [editTrip, setEditTrip]   = useState(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [toast, showToast]        = useToast()

  useEffect(() => {
    if (!user?.orgId) return
    setLoading(true)
    fetchTrips(user.orgId, user.houseId || null, null).then(data => {
      setTrips(data)
      setLoading(false)
    })
    fetchStaff(user.orgId, user.houseId || null).then(data => {
      setStaffNames(data.map(s => s.name))
    })
    fetchResidents(user.orgId, user.houseId || null).then(data => {
      setResidentNames(data.map(r => r.name))
    })
    fetchVehicles(user.orgId, user.role === 'manager' ? user.houseId : null).then(data => {
      setVehicles(data)
    })
  }, [user?.orgId, user?.houseId, user?.role])

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
      setEditTrip(null)
      showToast('Trip updated')
    }
  }

  const handleDelete = async (id) => {
    await deleteTrip(id)
    setTrips(prev => prev.filter(t => t.id !== id))
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
                  const hColor = t.houses?.color
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < trips.length - 1 ? '1px solid var(--a-line)' : '' }}>
                      {hColor && <div style={{ width: 3, height: 28, background: hColor, borderRadius: 4 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--a-ink)', fontWeight: 500 }}>{t.resident_name} → {t.destination}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>
                          {t.driver_name} · {fmtDate(t.trip_date)} · {t.purpose}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="tnum" style={{ fontSize: 12, fontWeight: 500, color: 'var(--a-ink2)' }}>
                          {t.miles}<span style={{ fontSize: 9, color: 'var(--a-ink3)', marginLeft: 2 }}>mi</span>
                        </span>
                        <button onClick={() => setEditTrip(t)}
                          style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 12, cursor: 'pointer', padding: '4px', fontFamily: 'Geist' }}>Edit</button>
                        <button onClick={() => handleDelete(t.id)}
                          style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 18, cursor: 'pointer', padding: '4px', lineHeight: 1 }}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

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

      {showLog && (
        <TripModal title="Log trip" staffNames={staffNames} residentNames={residentNames}
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
