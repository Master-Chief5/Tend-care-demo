import { useState, useEffect } from 'react'
import { HOUSES } from '../data/constants'
import { fetchHouses, fetchStaff, fetchResidents, fetchShifts, fetchTrips } from '../lib/db'
import { IconChev, IconDots, IconChat, IconPlus } from '../components/icons'
import { TabBar } from '../components/ui/TabBar'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'

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

// Demo fallbacks — shown only when there's no live DB data (e.g. demo mode).
const FALLBACK_STAFF = [
  { name: 'Aisha Mendez', role: 'Lead · 7a–3p', status: 'here' },
  { name: 'Jay Brooks',   role: 'DSP · 7a–3p',  status: 'here' },
  { name: 'Carmen Vela',  role: 'DSP · 3p–11p', status: 'sched' },
]
const FALLBACK_RESIDENTS = [
  { name: 'Ruth Johnson', room: '1', status: 'home' },
  { name: 'Marcus Lee',   room: '2', status: 'appt',    note: 'Dentist 1:30p' },
  { name: 'Tom Reyes',    room: '3', status: 'home' },
  { name: 'Donna Park',   room: '4', status: 'program', note: 'Day program' },
]

export function ScreenA_HouseDetail({ houseId = 'oak', user, onBack }) {
  const house = HOUSES.find(h => h.id === houseId) || HOUSES[0]
  const c = house.color
  const [toast, showToast] = useToast()

  const [staffToday, setStaffToday] = useState(FALLBACK_STAFF)
  const [residents, setResidents]   = useState(FALLBACK_RESIDENTS)
  const [drives, setDrives]         = useState(2)

  useEffect(() => {
    if (!user?.orgId) return
    let cancelled = false
    // Resolve this house's real UUID from its slug, then load its data.
    fetchHouses(user.orgId).then(houses => {
      const match = houses.find(h => h.slug === house.id)
      if (!match) return
      fetchStaff(user.orgId, match.id).then(rows => {
        if (cancelled || !rows.length) return
        setStaffToday(rows.map(s => ({ name: s.name, role: s.role, status: 'sched' })))
      })
      fetchResidents(user.orgId, match.id).then(rows => {
        if (cancelled || !rows.length) return
        setResidents(rows.map((r, i) => ({ name: r.name, room: r.room || String(i + 1), status: r.status === 'active' ? 'home' : r.status })))
      })
      fetchTrips(user.orgId, match.id, new Date()).then(rows => {
        if (!cancelled) setDrives(rows.length)
      })
    })
    return () => { cancelled = true }
  }, [user?.orgId, house.id])

  const onShift = staffToday.filter(s => s.status === 'here').length || staffToday.length
  const residentsIn = residents.filter(r => r.status === 'home' || r.status === 'appt' || r.status === 'program').length

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
          <button style={{ background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink3)', cursor: 'pointer' }}>
            <IconDots size={18} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 22px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
            <Stat label="Staff" big={onShift} sub={`${staffToday.length} total`} />
            <Stat label="Residents" big={residentsIn} sub={`of ${residents.length}`} />
            <Stat label="Today's drives" big={drives} sub="logged" />
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 8px' }}>Staff</div>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '0 14px', marginBottom: 14 }}>
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

          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 0 8px' }}>Residents</div>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            {residents.map((r, i) => {
              const m = {
                home:    { tag: 'Home',        bg: '#dee6df', tc: '#3f604d' },
                appt:    { tag: 'Appt',        bg: '#f5e9d6', tc: '#a47012' },
                program: { tag: 'Day program', bg: '#dde6f0', tc: '#3c5887' },
              }[r.status] || { tag: r.status, bg: 'var(--a-paper)', tc: 'var(--a-ink3)' }
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < residents.length - 1 ? '1px solid var(--a-line)' : '' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${c}22`, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, border: `1px solid ${c}44` }}>{r.room}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                    {r.note && <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{r.note}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: m.tc, background: m.bg, padding: '2px 7px', borderRadius: 999 }}>{m.tag}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => showToast('Team messaging coming soon')} style={{ flex: 1, padding: '11px 0', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, fontSize: 12.5, fontWeight: 500, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', cursor: 'pointer' }}>
              <IconChat size={15} sw={1.7} /> Message
            </button>
            <button onClick={() => showToast('Log item coming soon')} style={{ flex: 1, padding: '11px 0', background: c, border: 0, borderRadius: 12, fontSize: 12.5, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', cursor: 'pointer' }}>
              <IconPlus size={14} sw={2.2} /> Log item
            </button>
          </div>
        </div>
      </div>
      <TabBar active="houses" />
      <Toast msg={toast} />
    </div>
  )
}
