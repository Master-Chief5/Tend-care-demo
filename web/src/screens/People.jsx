import { useState, useEffect } from 'react'
import { HOUSES } from '../data/constants'
import { fetchStaff, inviteStaff, removeStaff } from '../lib/db'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { Pill } from '../components/ui/Pill'
import { TabBar } from '../components/ui/TabBar'
import { IconPlus, IconSearch, IconChev } from '../components/icons'

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

export function StaffCard({ name, role, house, houseId, houseName, score, sub, highlight, onClick }) {
  const hConst = house ? HOUSES.find(x => x.id === house) : null
  const hColor = hConst?.color ?? '#888'
  const hName = houseName || hConst?.name || 'Staff'
  const initials = name.split(' ').map(n => n[0]).join('')
  const scoreColor = score >= 90 ? '#3f7050' : score >= 80 ? '#a47012' : '#a93a25'
  const flagMap = {
    promo:   { tag: 'Promote',        tc: '#3f7050', bg: '#dee6df' },
    concern: { tag: 'Concern',        tc: '#a93a25', bg: '#fadcd7' },
    orient:  { tag: 'In orientation', tc: '#5a3a6b', bg: '#e7dfe9' },
  }
  const flag = highlight ? flagMap[highlight] : null
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, marginBottom: 8, cursor: 'pointer' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: hColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</span>
          {flag && <span style={{ fontSize: 9, fontWeight: 600, color: flag.tc, background: flag.bg, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{flag.tag}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 1 }}>{role} · {hName.split(' ')[0]} · {sub}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="serif tnum" style={{ fontSize: 18, fontWeight: 500, color: scoreColor, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>Quality</div>
      </div>
    </div>
  )
}

function StaffDetail({ staff, onBack, onRemove }) {
  const hConst = staff.house ? HOUSES.find(x => x.id === staff.house) : null
  const hColor = hConst?.color ?? '#888'
  const hName = staff.houseName || hConst?.name || 'All houses'
  const initials = staff.name.split(' ').map(n => n[0]).join('')
  const scoreColor = staff.score >= 90 ? '#3f7050' : staff.score >= 80 ? '#a47012' : '#a93a25'
  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink2)', cursor: 'pointer' }}>
            <IconChev size={20} sw={2} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>Team</span>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 18, padding: '20px 18px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: hColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, margin: '0 auto 12px', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>{initials}</div>
            <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{staff.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 4 }}>{staff.role} · {hName}</div>
            {staff.email && <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 4 }}>{staff.email}</div>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
              <Pill color="var(--a-sage)">{staff.tenure || staff.sub}</Pill>
            </div>
          </div>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Quality score</span>
              <span className="serif tnum" style={{ fontSize: 28, fontWeight: 500, color: scoreColor }}>{staff.score}</span>
            </div>
            <div style={{ height: 6, background: 'var(--a-paper)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${staff.score}%`, height: '100%', background: scoreColor, borderRadius: 999 }} />
            </div>
          </div>
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

function AddStaffModal({ user, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [saving, setSaving] = useState(false)

  const houseId = user?.houseId || null

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !user?.orgId) return
    setSaving(true)
    const member = await inviteStaff(user.orgId, houseId, {
      name: name.trim(),
      email: email.trim() || null,
      role,
    })
    setSaving(false)
    if (member) onAdded(member)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 16 }}>Add staff</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input autoFocus placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          <input placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} type="email"
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          <select value={role} onChange={e => setRole(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }}>
            <option value="staff">DSP</option>
            <option value="manager">House Manager</option>
          </select>
          <button type="submit" disabled={!name.trim() || saving}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Add staff member'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function ScreenA_Staff({ user, onLogout }) {
  const [query, setQuery] = useState('')
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, showToast] = useToast()

  useEffect(() => {
    if (!user?.orgId) return
    fetchStaff(user.orgId, user.role === 'manager' ? user.houseId : null).then(data => {
      setStaffList(data)
    })
  }, [user?.orgId, user?.houseId, user?.role])

  const handleAdded = (member) => {
    setStaffList(prev => [...prev, {
      id: member.id,
      name: member.name,
      email: member.email ?? '',
      role: member.role === 'manager' ? 'House mgr' : 'DSP',
      rawRole: member.role,
      house: null,
      score: 85,
      sub: 'New',
      tenure: 'New',
    }])
    setShowAdd(false)
    showToast('Staff member added')
  }

  const handleRemove = async (staff) => {
    if (!staff.id) return
    await removeStaff(staff.id)
    setStaffList(prev => prev.filter(s => s.id !== staff.id))
    setSelectedStaff(null)
    showToast('Staff member removed')
  }

  if (selectedStaff) return (
    <StaffDetail
      staff={selectedStaff}
      onBack={() => setSelectedStaff(null)}
      onRemove={handleRemove}
    />
  )

  const filtered = staffList.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.role.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="phone-screen">
      <Toast msg={toast} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Team</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>{staffList.length} staff members</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ background: 'transparent', border: '1px solid var(--a-line)', color: 'var(--a-ink2)', borderRadius: 999, padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
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

      {showAdd && user?.orgId && (
        <AddStaffModal user={user} onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      )}
    </div>
  )
}
