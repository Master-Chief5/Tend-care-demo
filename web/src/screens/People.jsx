import { useState, useEffect } from 'react'
import { fetchStaff, removeStaff, setStaffCerts } from '../lib/db'
import { StaffFormModal, StaffStatus } from '../components/StaffFormModal'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { TabBar } from '../components/ui/TabBar'
import { IconPlus, IconSearch, IconChev } from '../components/icons'
import { SuggestInput } from '../components/SuggestInput'

const CERT_SUGGESTIONS = ['CPR', 'First Aid', 'Medication Administration', 'CPI / Crisis Prevention', 'Bloodborne Pathogens', 'Abuse & Neglect Prevention', 'Fire Safety', 'Mandated Reporter']
// Status of a certification by expiry date.
export function certStatus(expires) {
  if (!expires) return { label: 'No date', bg: 'var(--a-paper)', tc: 'var(--a-ink3)', rank: 1 }
  const days = Math.floor((new Date(expires).getTime() - Date.now()) / 86400000)
  if (days < 0) return { label: `Expired`, bg: '#fadcd7', tc: '#a93a25', rank: 3 }
  if (days <= 60) return { label: `${days}d left`, bg: '#f5e9d6', tc: '#a47012', rank: 2 }
  return { label: 'Valid', bg: '#dee6df', tc: '#3f604d', rank: 0 }
}
// Worst cert status across a list — for the list-card warning dot.
export function certWarning(certs = []) {
  let worst = 0
  for (const c of certs) worst = Math.max(worst, certStatus(c.expires).rank)
  return worst   // 0 ok, 2 expiring, 3 expired
}

function CertSection({ certs = [], onChange }) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [expires, setExpires] = useState('')
  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '9px 11px', fontSize: 13.5, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const add = (e) => {
    e.preventDefault(); if (!name.trim()) return
    onChange([...certs, { name: name.trim(), expires }])
    setName(''); setExpires(''); setShowAdd(false)
  }
  const sorted = [...certs].sort((a, b) => (a.expires || '9999').localeCompare(b.expires || '9999'))
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px 2px' }}>
        <span style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Certifications & training</span>
        <button onClick={() => setShowAdd(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: 'var(--a-sage)', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}><IconPlus size={13} sw={2.2} /> Add</button>
      </div>
      {showAdd && (
        <form onSubmit={add} style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: 12, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SuggestInput autoFocus options={CERT_SUGGESTIONS} value={name} onChange={setName} placeholder="Certification (e.g. CPR)" style={input} />
          <div><div style={{ fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }}>Expires</div><input type="date" value={expires} onChange={e => setExpires(e.target.value)} style={input} /></div>
          <button type="submit" disabled={!name.trim()} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '10px', fontSize: 13.5, fontWeight: 600, fontFamily: 'Geist', cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5 }}>Add certification</button>
        </form>
      )}
      <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
        {sorted.length === 0 && <div style={{ padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>No certifications tracked.</div>}
        {sorted.map((c, i) => {
          const st = certStatus(c.expires)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < sorted.length - 1 ? '1px solid var(--a-line)' : '' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{c.expires ? `Expires ${new Date(c.expires).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No expiry set'}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: st.tc, background: st.bg, padding: '2px 8px', borderRadius: 999 }}>{st.label}</span>
              <button onClick={() => onChange(certs.filter((_, j) => j !== certs.indexOf(c)))} aria-label="Remove" style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>×</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RingChart({ pct = 0.9, color = 'var(--a-sage)', size = 40 }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--a-line)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

export function StaffCard({ name, role, houseName, houseColor, linked, onClick }) {
  const hColor = houseColor ?? '#888'
  const hName = houseName || 'No house'
  const initials = name.split(' ').map(n => n[0]).join('')
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, marginBottom: 8, cursor: 'pointer' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: hColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 1 }}>{role} · {hName.split(' ')[0]}</div>
      </div>
      <StaffStatus linked={linked} />
    </div>
  )
}

function StaffDetail({ staff, onBack, onRemove, onEdit, onSetCerts }) {
  const hColor = staff.houseColor ?? '#888'
  const hName = staff.houseName || 'No house assigned'
  const initials = staff.name.split(' ').map(n => n[0]).join('')
  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink2)', cursor: 'pointer' }}>
            <IconChev size={20} sw={2} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>Staff</span>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 18, padding: '20px 18px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: hColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, margin: '0 auto 12px', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>{initials}</div>
            <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{staff.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 4 }}>{staff.role} · {hName}</div>
            {staff.email && <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 4 }}>{staff.email}</div>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
              <StaffStatus linked={staff.linked} />
            </div>
            {!staff.linked && (
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 10, lineHeight: 1.5 }}>
                Invited — becomes active once they sign in with this email.
              </div>
            )}
          </div>
          <button onClick={() => onEdit(staff)} style={{ width: '100%', padding: '11px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', fontFamily: 'Geist', cursor: 'pointer', marginBottom: 14 }}>
            Edit details
          </button>
          {onSetCerts && <CertSection certs={staff.certs || []} onChange={onSetCerts} />}
          {staff.notes && (
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13.5, color: 'var(--a-ink2)', lineHeight: 1.5 }}>{staff.notes}</div>
            </div>
          )}
          {staff.id && onRemove && (
            <button onClick={() => onRemove(staff)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #fadcd7', borderRadius: 12, fontSize: 13, color: '#a93a25', fontFamily: 'Geist', cursor: 'pointer' }}>
              Remove staff member
            </button>
          )}
        </div>
      </div>
      <TabBar active="me" />
    </div>
  )
}

export function ScreenA_Staff({ user, onLogout }) {
  const [query, setQuery] = useState('')
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [modal, setModal] = useState(null)   // null | { mode:'add' } | { mode:'edit', staff }
  const [toast, showToast] = useToast()

  const reload = () => {
    if (!user?.orgId) return Promise.resolve([])
    return fetchStaff(user.orgId, user.role === 'manager' ? user.houseId : null).then(data => {
      setStaffList(data); return data
    })
  }
  useEffect(() => { reload() }, [user?.orgId, user?.houseId, user?.role])

  const handleSaved = async (_row, mode) => {
    setModal(null)
    const data = await reload()
    if (mode === 'edit' && selectedStaff) {
      setSelectedStaff(data.find(s => s.id === selectedStaff.id) || null)
    }
    showToast(mode === 'edit' ? 'Staff member updated' : 'Staff member added')
  }

  const handleRemove = async (staff) => {
    if (!staff.id) return
    await removeStaff(staff.id)
    setSelectedStaff(null)
    reload()
    showToast('Staff member removed')
  }

  const handleSetCerts = async (certs) => {
    if (!selectedStaff?.id) return
    await setStaffCerts(selectedStaff.id, certs)
    const data = await reload()
    setSelectedStaff(data.find(s => s.id === selectedStaff.id) || null)
  }

  if (selectedStaff) return (
    <>
      <StaffDetail
        staff={selectedStaff}
        onBack={() => setSelectedStaff(null)}
        onRemove={handleRemove}
        onEdit={(s) => setModal({ mode: 'edit', staff: s })}
        onSetCerts={handleSetCerts}
      />
      {modal?.mode === 'edit' && (
        <StaffFormModal user={user} editStaff={modal.staff} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </>
  )

  const filtered = staffList.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.role.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="phone-screen">
      <Toast msg={toast} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px calc(22px + var(--chip-clear, 0px)) 8px 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Staff</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>{staffList.length} staff members</div>
          </div>
          <button onClick={() => setModal({ mode: 'add' })} style={{ background: 'transparent', border: '1px solid var(--a-line)', color: 'var(--a-ink2)', borderRadius: 999, padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconPlus size={13} sw={2.2} /> Add
          </button>
        </div>

        <div style={{ padding: '0 22px 8px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flex: 1, background: 'var(--a-paper)', borderRadius: 999, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--a-line)' }}>
            <IconSearch size={13} color="var(--a-ink3)" />
            <input
              placeholder="Search staff" value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 12.5, fontFamily: 'Geist', color: 'var(--a-ink2)' }}
            />
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          {staffList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No staff yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tap "Add" to add your first team member.</div>
            </div>
          )}
          {filtered.map((s, i) => <StaffCard key={s.id ?? i} {...s} onClick={() => setSelectedStaff(s)} />)}
          {query.length > 0 && filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--a-ink3)', fontSize: 13, paddingTop: 24 }}>No staff match "{query}"</div>}
          {onLogout && (
            <button onClick={onLogout} style={{ width: '100%', marginTop: 16, padding: '12px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, fontSize: 13, color: 'var(--a-ink3)', fontFamily: 'Geist', cursor: 'pointer' }}>
              Sign out
            </button>
          )}
        </div>
      </div>
      <TabBar active="me" />

      {modal?.mode === 'add' && user?.orgId && (
        <StaffFormModal user={user} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
