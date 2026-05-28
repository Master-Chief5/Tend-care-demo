import { useState } from 'react'
import { HOUSES, STAFF_LIST } from '../data/constants'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { Pill } from '../components/ui/Pill'
import { TabBar } from '../components/ui/TabBar'
import { IconPlus, IconSearch, IconFilter, IconChev } from '../components/icons'

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

export function StaffCard({ name, role, house, score, sub, highlight, onClick }) {
  const h = HOUSES.find(x => x.id === house)
  const initials = name.split(' ').map(n => n[0]).join('')
  const scoreColor = score >= 90 ? '#3f7050' : score >= 80 ? '#a47012' : '#a93a25'
  const flagMap = {
    promo:   { tag: 'Promote',       tc: '#3f7050', bg: '#dee6df' },
    concern: { tag: 'Concern',       tc: '#a93a25', bg: '#fadcd7' },
    orient:  { tag: 'In orientation',tc: '#5a3a6b', bg: '#e7dfe9' },
  }
  const flag = highlight ? flagMap[highlight] : null
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, marginBottom: 8, cursor: 'pointer' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: h.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{name}</span>
          {flag && <span style={{ fontSize: 9, fontWeight: 600, color: flag.tc, background: flag.bg, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{flag.tag}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 1 }}>{role} · {h.name.split(' ')[0]} · {sub}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="serif tnum" style={{ fontSize: 18, fontWeight: 500, color: scoreColor, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 9, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>Quality</div>
      </div>
    </div>
  )
}

function StaffDetail({ staff, onBack }) {
  const h = HOUSES.find(x => x.id === staff.house)
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
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: h.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, margin: '0 auto 12px', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>{initials}</div>
            <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>{staff.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 4 }}>{staff.role} · {h.name}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
              <Pill color="var(--a-sage)">{staff.tenure}</Pill>
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
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Notes</div>
            <div style={{ fontSize: 13.5, color: 'var(--a-ink2)', lineHeight: 1.5 }}>{staff.notes}</div>
          </div>
        </div>
      </div>
      <TabBar active="me" />
    </div>
  )
}

export function ScreenA_Staff({ onLogout }) {
  const [query, setQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [toast, showToast] = useToast()

  if (selectedStaff) return <StaffDetail staff={selectedStaff} onBack={() => setSelectedStaff(null)} />

  const filtered = STAFF_LIST.filter(s =>
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
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>22 staff · 4 in onboarding</div>
          </div>
          <button onClick={() => showToast('Opening hiring flow…')} style={{ background: 'transparent', border: '1px solid var(--a-line)', color: 'var(--a-ink2)', borderRadius: 999, padding: '7px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconPlus size={13} sw={2.2} /> Hire
          </button>
        </div>

        <div style={{ margin: '6px 22px 14px', background: 'var(--a-card)', borderRadius: 16, border: '1px solid var(--a-line)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px dashed var(--a-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Quality of care · May</div>
              <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 500 }}>↑ 4 pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span className="serif tnum" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em' }}>92</span>
              <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>/ 100</span>
              <div style={{ flex: 1 }} />
              <RingChart pct={0.92} color="var(--a-sage)" />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Pill color="var(--a-sage)">MAR · 100%</Pill>
              <Pill color="var(--a-sage)">Notes · 96%</Pill>
              <Pill color="var(--a-clay)">Late · 8%</Pill>
              <Pill color="var(--a-sage)">Family ★ 4.7</Pill>
            </div>
          </div>
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
          <button style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '6px 10px', fontSize: 11.5, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <IconFilter size={12} sw={1.8} /> Flags
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 22px 24px' }}>
          {filtered.map((s, i) => <StaffCard key={i} {...s} onClick={() => setSelectedStaff(s)} />)}
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--a-ink3)', fontSize: 13, paddingTop: 24 }}>No staff match "{query}"</div>}
          {onLogout && (
            <button onClick={onLogout} style={{ width: '100%', marginTop: 16, padding: '12px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, fontSize: 13, color: 'var(--a-ink3)', fontFamily: 'Geist', cursor: 'pointer' }}>
              Sign out
            </button>
          )}
        </div>
      </div>
      <TabBar active="me" />
    </div>
  )
}
