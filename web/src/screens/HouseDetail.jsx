import { useState, useEffect, useCallback } from 'react'
import { fetchStaff, fetchResidents, fetchTrips, addResident, updateResident, deleteResident } from '../lib/db'
import { IconChev, IconChat, IconPlus } from '../components/icons'
import { TabBar } from '../components/ui/TabBar'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { HouseItems } from '../components/HouseItems'
import { MedPass } from '../components/MedPass'

// Quick-reference safety flags surfaced on the resident's card (surveyors and
// new staff scan these first).
const RESIDENT_FLAGS = ['Allergy', 'Fall risk', 'Seizure', 'Diet', 'Behavior plan', 'Elopement risk', 'Diabetic', '1:1 support']
const RESIDENT_STATUS = [
  { id: 'active', label: 'Home' },
  { id: 'appt', label: 'At appointment' },
  { id: 'program', label: 'Day program' },
  { id: 'hospital', label: 'Hospital' },
  { id: 'away', label: 'Away / visit' },
]
const statusLabel = (s) => (RESIDENT_STATUS.find(x => x.id === s) || {}).label || s
function ageFromDob(dob) {
  if (!dob) return null
  const d = new Date(dob); if (isNaN(d)) return null
  const t = new Date(); let a = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--
  return a >= 0 && a < 130 ? a : null
}

function Stat({ label, big, sub }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 2 }}>{big}</div>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{sub}</div>
    </div>
  )
}

function NeedRow({ kind, text, color }) {
  const kindMap = {
    grocery: { label: 'Grocery', bg: '#f5e9d6', tc: '#a47012' },
    med:     { label: 'Med',     bg: '#fadcd7', tc: '#a93a25' },
    drive:   { label: 'Drive',   bg: '#dde6f0', tc: '#3c5887' },
  }
  const k = kindMap[kind] || { label: kind, bg: 'var(--a-paper)', tc: 'var(--a-ink3)' }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--a-line)' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: k.tc, background: k.bg, padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 1 }}>{k.label}</span>
      <span style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.4 }}>{text}</span>
    </div>
  )
}

function ResidentModal({ user, houseUuid, resident, startEdit = false, onClose, onSaved, onDeleted }) {
  const editing0 = startEdit || !resident
  const [editing, setEditing] = useState(editing0)
  const [name, setName] = useState(resident?.name || '')
  const [room, setRoom] = useState(resident?.room || '')
  const [dob, setDob] = useState(resident?.dob || '')
  const [status, setStatus] = useState(resident?.status || 'active')
  const [allergies, setAllergies] = useState(resident?.allergies || '')
  const [diagnoses, setDiagnoses] = useState(resident?.diagnoses || '')
  const [diet, setDiet] = useState(resident?.diet || '')
  const [flags, setFlags] = useState(resident?.flags || [])
  const [guardian, setGuardian] = useState(resident?.guardian || '')
  const [physician, setPhysician] = useState(resident?.physician || '')
  const [notes, setNotes] = useState(resident?.notes || '')
  const [saving, setSaving] = useState(false)

  const toggleFlag = (f) => setFlags(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f])
  const inputStyle = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }

  const save = async (e) => {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    const payload = { name: name.trim(), room: room.trim(), dob, status, allergies: allergies.trim(), diagnoses: diagnoses.trim(), diet: diet.trim(), flags, guardian: guardian.trim(), physician: physician.trim(), notes: notes.trim() }
    if (resident) await updateResident(resident.id, payload)
    else await addResident(user.orgId, houseUuid, payload)
    setSaving(false); onSaved()
  }
  const remove = async () => { if (!resident || saving) return; setSaving(true); await deleteResident(resident.id); setSaving(false); onDeleted() }

  const age = ageFromDob(dob)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '92vh', overflowY: 'auto', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="serif" style={{ fontSize: 22 }}>{resident ? (editing ? 'Edit resident' : name) : 'Add resident'}</div>
          {resident && !editing && <button type="button" onClick={() => setEditing(true)} style={{ border: 0, background: 'transparent', color: 'var(--a-sage)', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Edit</button>}
        </div>

        {!editing && resident ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)' }}>
              {[room && `Room ${room}`, age != null && `${age} yrs`, statusLabel(status)].filter(Boolean).join(' · ')}
            </div>
            {flags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {flags.map(f => <span key={f} style={{ fontSize: 11, fontWeight: 700, color: '#a93a25', background: '#fadcd7', padding: '3px 9px', borderRadius: 999 }}>{f}</span>)}
              </div>
            )}
            <ViewField label="Allergies" value={allergies} alert />
            <ViewField label="Diagnoses" value={diagnoses} />
            <ViewField label="Diet" value={diet} />
            <ViewField label="Guardian / contact" value={guardian} />
            <ViewField label="Physician" value={physician} />
            <ViewField label="Notes" value={notes} />
            <button type="button" onClick={remove} disabled={saving} style={{ marginTop: 6, width: '100%', padding: '11px', background: 'transparent', border: '1px solid #e0b4ab', borderRadius: 10, fontSize: 13, color: '#a93a25', fontFamily: 'Geist', cursor: 'pointer' }}>Remove resident</button>
          </div>
        ) : (
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={lbl}>Room</div><input value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. 1" style={inputStyle} /></div>
              <div><div style={lbl}>Date of birth</div><input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} /></div>
            </div>
            <div><div style={lbl}>Status</div>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                {RESIDENT_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div><div style={lbl}>Allergies</div><input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Penicillin, peanuts" style={inputStyle} /></div>
            <div><div style={lbl}>Diagnoses</div><input value={diagnoses} onChange={e => setDiagnoses(e.target.value)} placeholder="e.g. Autism, epilepsy" style={inputStyle} /></div>
            <div><div style={lbl}>Diet</div><input value={diet} onChange={e => setDiet(e.target.value)} placeholder="e.g. Pureed, no nuts" style={inputStyle} /></div>
            <div><div style={lbl}>Quick-reference flags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {RESIDENT_FLAGS.map(f => {
                  const on = flags.includes(f)
                  return <button key={f} type="button" onClick={() => toggleFlag(f)} style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: on ? '#fadcd7' : 'transparent', color: on ? '#a93a25' : 'var(--a-ink3)', border: `1px solid ${on ? '#e0b4ab' : 'var(--a-line)'}` }}>{f}</button>
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={lbl}>Guardian / contact</div><input value={guardian} onChange={e => setGuardian(e.target.value)} placeholder="Name · phone" style={inputStyle} /></div>
              <div><div style={lbl}>Physician</div><input value={physician} onChange={e => setPhysician(e.target.value)} placeholder="Dr. name" style={inputStyle} /></div>
            </div>
            <div><div style={lbl}>Notes</div><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything staff should know" style={inputStyle} /></div>
            <button type="submit" disabled={!name.trim() || saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5 }}>
              {saving ? 'Saving…' : resident ? 'Save changes' : 'Add resident'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ViewField({ label, value, alert }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: alert ? '#a93a25' : 'var(--a-ink)', fontWeight: alert ? 600 : 400, lineHeight: 1.4 }}>{value}</div>
    </div>
  )
}

export function ScreenA_HouseDetail({ houseId = '', user, onBack, houses = [] }) {
  const house = houses.find(h => h.id === houseId) || houses[0] || null
  if (!house) return (
    <div className="phone-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--a-ink3)' }}>House not found.</div>
      <button onClick={onBack} style={{ background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 999, padding: '8px 20px', fontSize: 13, fontFamily: 'Geist', cursor: 'pointer', color: 'var(--a-ink2)' }}>← Back</button>
    </div>
  )
  const c = house.color
  const [toast, showToast] = useToast()

  const [staffToday, setStaffToday] = useState([])
  const [residents, setResidents]   = useState([])
  const [drives, setDrives]         = useState(0)
  const [residentModal, setResidentModal] = useState(null) // null | {mode:'add'} | {mode:'view'|'edit', resident}

  // The house's real DB UUID comes through on the normalized house object as `_uuid`.
  const houseUuid = house._uuid

  const reloadResidents = useCallback(() => {
    if (!user?.orgId || !houseUuid) return
    fetchResidents(user.orgId, houseUuid).then(setResidents)
  }, [user?.orgId, houseUuid])

  useEffect(() => {
    if (!user?.orgId || !houseUuid) return
    let cancelled = false
    fetchStaff(user.orgId, houseUuid).then(rows => {
      if (cancelled) return
      setStaffToday(rows.map(s => ({ name: s.name, role: s.role, status: 'sched' })))
    })
    fetchResidents(user.orgId, houseUuid).then(rows => { if (!cancelled) setResidents(rows) })
    fetchTrips(user.orgId, houseUuid, new Date()).then(rows => {
      if (!cancelled) setDrives(rows.length)
    })
    return () => { cancelled = true }
  }, [user?.orgId, houseUuid])

  const onShift = staffToday.filter(s => s.status === 'here').length || staffToday.length
  const residentsHome = residents.filter(r => (r.status || 'active') === 'active').length
  const closeResident = () => { setResidentModal(null); reloadResidents() }

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 4, background: c, flexShrink: 0 }} />
        <div style={{ padding: '12px 22px 8px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink2)', cursor: 'pointer' }}>
            <IconChev size={20} sw={2} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
              <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{house.name}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 2 }}>{house.addr} · {house.branch} branch · mgr {house.manager}</div>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 22px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
            <Stat label="Staff" big={onShift} sub={`${staffToday.length} total`} />
            <Stat label="Residents" big={residentsHome} sub={`${residents.length} total`} />
            <Stat label="Today's drives" big={drives} sub="logged" />
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 8px' }}>Staff</div>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '0 14px', marginBottom: 14 }}>
            {staffToday.length === 0 && (
              <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>No staff assigned yet</div>
            )}
            {staffToday.map((s, i) => {
              const st = s.status === 'here'
                ? { tag: 'On shift', bg: '#dee6df', tc: '#3f604d' }
                : { tag: 'Scheduled', bg: 'var(--a-paper)', tc: 'var(--a-ink3)' }
              const initials = s.name.split(' ').map(n => n[0]).join('')
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < staffToday.length - 1 ? '1px dashed var(--a-line)' : '' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 11, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{s.role}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: st.tc, background: st.bg, padding: '2px 7px', borderRadius: 999 }}>{st.tag}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Residents</span>
            <button onClick={() => setResidentModal({ mode: 'add' })} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: c, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
              <IconPlus size={13} sw={2.2} /> Add resident
            </button>
          </div>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            {residents.length === 0 && (
              <div style={{ padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>No residents yet — tap “Add resident”.</div>
            )}
            {residents.map((r, i) => {
              const age = ageFromDob(r.dob)
              const flags = r.flags || []
              const sub = [r.room && `Room ${r.room}`, age != null && `${age} yrs`, statusLabel(r.status || 'active')].filter(Boolean).join(' · ')
              return (
                <div key={r.id || i} onClick={() => setResidentModal({ mode: 'view', resident: r })}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < residents.length - 1 ? '1px solid var(--a-line)' : '', cursor: 'pointer' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${c}22`, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, border: `1px solid ${c}44` }}>{(r.name || '?')[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>
                    {(flags.length > 0 || r.allergies) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {r.allergies && <span style={{ fontSize: 9, fontWeight: 700, color: '#a93a25', background: '#fadcd7', padding: '1px 6px', borderRadius: 999 }}>⚠ {r.allergies}</span>}
                        {flags.slice(0, 3).map(f => <span key={f} style={{ fontSize: 9, fontWeight: 700, color: 'var(--a-ink2)', background: 'var(--a-paper)', padding: '1px 6px', borderRadius: 999, border: '1px solid var(--a-line)' }}>{f}</span>)}
                      </div>
                    )}
                  </div>
                  <IconChev size={16} sw={2} color="var(--a-ink3)" />
                </div>
              )
            })}
          </div>

          <MedPass user={user} houseUuid={houseUuid} houseColor={c} residents={residents} />

          <HouseItems user={user} houseUuid={houseUuid} houseColor={c} />

          <button onClick={() => showToast('Team messaging coming soon')} style={{ width: '100%', marginTop: 14, padding: '11px 0', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, fontSize: 12.5, fontWeight: 500, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconChat size={15} sw={1.7} /> Message
          </button>
        </div>
      </div>
      <TabBar active="houses" />
      <Toast msg={toast} />
      {residentModal && (
        <ResidentModal
          user={user}
          houseUuid={houseUuid}
          resident={residentModal.resident || null}
          startEdit={residentModal.mode === 'edit'}
          onClose={() => setResidentModal(null)}
          onSaved={closeResident}
          onDeleted={closeResident}
        />
      )}
    </div>
  )
}
