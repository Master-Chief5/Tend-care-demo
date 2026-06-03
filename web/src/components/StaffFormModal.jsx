import { useState, useEffect } from 'react'
import { fetchHouses, inviteStaff, updateStaffMember } from '../lib/db'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Shared add / edit staff form. `centered` renders a desktop-style centered
// dialog; otherwise a mobile bottom sheet. Fetches its own house list so the
// caller doesn't have to worry about house id shapes.
export function StaffFormModal({ user, editStaff = null, centered = false, onClose, onSaved }) {
  const isEdit = !!editStaff
  const isSupervisor = user?.role === 'supervisor'
  const [houses, setHouses] = useState([])
  const [name, setName] = useState(editStaff?.name || '')
  const [email, setEmail] = useState(editStaff?.email || '')
  const [role, setRole] = useState(editStaff?.rawRole || 'staff')
  const [houseId, setHouseId] = useState(editStaff?.houseId || (isSupervisor ? '' : (user?.houseId || '')))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.orgId) return
    fetchHouses(user.orgId).then(rows => {
      setHouses(rows)
      // Default a new staff member to the first house if none chosen yet.
      setHouseId(prev => prev || (isSupervisor ? (rows[0]?.id ?? '') : (user?.houseId || rows[0]?.id || '')))
    })
  }, [user?.orgId])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !user?.orgId || saving) return
    if (!isEdit && !EMAIL_RE.test(email.trim())) { setError('Enter a valid email — it’s how this person is matched when they sign in.'); return }
    setError(''); setSaving(true)
    let saved
    if (isEdit) {
      saved = await updateStaffMember(editStaff.id, { name: name.trim(), role, house_id: houseId || null })
    } else {
      saved = await inviteStaff(user.orgId, houseId || null, { name: name.trim(), email: email.trim(), role })
    }
    setSaving(false)
    if (saved) onSaved(saved, isEdit ? 'edit' : 'add')
  }

  const field = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const canSubmit = name.trim() && (isEdit || EMAIL_RE.test(email.trim())) && !saving

  const overlay = centered
    ? { alignItems: 'center', justifyContent: 'center' }
    : { alignItems: 'flex-end' }
  const sheet = centered
    ? { width: 400, maxWidth: 'calc(100vw - 40px)', borderRadius: 16, padding: '22px 24px 26px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }
    : { width: '100%', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 300, display: 'flex', fontFamily: 'Geist', ...overlay }}>
      <div style={{ background: 'var(--a-bg)', border: '1px solid var(--a-line)', ...sheet }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="serif" style={{ fontSize: 22 }}>{isEdit ? 'Edit staff' : 'Add staff'}</div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', color: 'var(--a-ink3)', fontSize: 20, cursor: 'pointer', lineHeight: 1, fontFamily: 'Geist' }}>×</button>
        </div>
        {!isEdit && (
          <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginBottom: 14, lineHeight: 1.5 }}>
            They’ll show as <strong>Pending</strong> until they sign in with this exact email — that’s how we confirm it’s a real person on your team.
          </div>
        )}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input autoFocus placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={field} />
          {isEdit ? (
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', paddingLeft: 2 }}>{email || 'No email on file'} · email can’t be changed</div>
          ) : (
            <input type="email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); if (error) setError('') }}
              style={{ ...field, borderColor: error ? '#e0a99a' : 'var(--a-line)' }} />
          )}
          {error && <div style={{ fontSize: 11.5, color: '#a93a25', marginTop: -4 }}>{error}</div>}
          <select value={role} onChange={e => setRole(e.target.value)} style={field}>
            <option value="staff">DSP</option>
            <option value="manager">House Manager</option>
          </select>
          {isSupervisor && (
            <select value={houseId} onChange={e => setHouseId(e.target.value)} style={field}>
              <option value="">No house assigned</option>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <button type="submit" disabled={!canSubmit}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5, marginTop: 2 }}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add staff member'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Small Pending / Active chip shown next to a staff member.
export function StaffStatus({ linked }) {
  return linked
    ? <span style={{ fontSize: 9.5, fontWeight: 700, color: '#3f7050', background: '#dee6df', padding: '2px 7px', borderRadius: 999, letterSpacing: '0.03em' }}>ACTIVE</span>
    : <span style={{ fontSize: 9.5, fontWeight: 700, color: '#a47012', background: '#f5e9d6', padding: '2px 7px', borderRadius: 999, letterSpacing: '0.03em' }}>PENDING</span>
}
