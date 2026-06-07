import { useState, useEffect } from 'react'
import { fmtDayLabel, getGreeting } from '../lib/utils'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { TabBar } from '../components/ui/TabBar'
import { TendLogo } from '../components/ui/TendLogo'
import { IconChat, IconChev, IconPlus, IconDots, IconArrow } from '../components/icons'
import { fetchShifts, fetchTrips, fetchStaff, fetchHouseAlerts, fetchResidents, fetchMedPass, fetchIncidents, fetchDrills, fetchActiveTrips, fetchResources } from '../lib/db'

// One "Needs attention" row — a tinted tag (Shop / Med / Note / Drive) + text.
const NEED_KINDS = {
  grocery: { tag: 'Shop',  bg: '#f5e9d6', tc: '#a47012' },
  med:     { tag: 'Med',   bg: '#fadcd7', tc: '#a93a25' },
  note:    { tag: 'Note',  bg: '#e7dfe9', tc: '#5a3a6b' },
  drive:   { tag: 'Drive', bg: '#dde6f0', tc: '#3c5887' },
  maint:   { tag: 'Maint', bg: '#dee6df', tc: '#3f604d' },
}

function NeedRow({ kind, text }) {
  const k = NEED_KINDS[kind] || NEED_KINDS.grocery
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0' }}>
      <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: k.tc, background: k.bg, padding: '2px 7px', borderRadius: 5, letterSpacing: '0.03em' }}>{k.tag}</span>
      <span style={{ fontSize: 12.5, color: 'var(--a-ink2)', lineHeight: 1.35 }}>{text}</span>
    </div>
  )
}

function GreetingHeader({ name, isSupervisor, onAddHouse }) {
  const today = new Date()
  const firstName = name?.split(' ')[0] || 'there'
  return (
    <div style={{ padding: '10px 22px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 2 }}>{fmtDayLabel(today)}</div>
        <TendLogo size={14} style={{ marginTop: 2 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {getGreeting()},<br /><em style={{ color: 'var(--a-sage)' }}>{firstName}</em>
        </div>
        {isSupervisor && onAddHouse && (
          <button onClick={onAddHouse} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--a-ink)', color: 'var(--a-card)',
            border: 0, borderRadius: 999, padding: '6px 12px',
            fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
            marginBottom: 2, flexShrink: 0,
          }}>
            <IconPlus size={13} sw={2.2} /> Add house
          </button>
        )}
      </div>
    </div>
  )
}

function BranchTabs({ branches, active, setActive }) {
  return (
    <div style={{ padding: '0 22px 12px', display: 'flex', gap: 6 }}>
      {branches.map(b => (
        <button key={b} onClick={() => setActive(b)} style={{
          border: active === b ? 0 : '1px solid var(--a-line)',
          background: active === b ? 'var(--a-ink)' : 'transparent',
          color: active === b ? 'var(--a-card)' : 'var(--a-ink2)',
          padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 500,
          fontFamily: 'Geist', cursor: 'pointer',
        }}>{b}</button>
      ))}
    </div>
  )
}

function HouseStat({ label, big, sub }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: 'var(--a-ink3)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1, marginTop: 2 }}>{big}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function MenuItem({ label, onClick, danger }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} style={{
      display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent',
      padding: '10px 14px', fontSize: 13, fontFamily: 'Geist', cursor: 'pointer',
      color: danger ? 'var(--a-clay)' : 'var(--a-ink)', borderBottom: '1px solid var(--a-line)',
    }}>{label}</button>
  )
}

function HouseCard({ house, stats, alerts = [], onHouseClick, onTeamChat }) {
  const [toast, showToast] = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const c = house.color
  const staffOn    = stats?.staffOn    ?? 0
  const staffTotal = stats?.staffTotal ?? 0
  const drivesToday = stats?.drivesToday ?? 0
  const shown = alerts.slice(0, 2)
  const extra = alerts.length - shown.length

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
      <Toast msg={toast} />
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '12px 14px 14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
          <span className="serif" style={{ fontSize: 17, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{house.name}</span>
          {alerts.length > 0 && (
            <span style={{ background: '#d44e3a', color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, padding: '0 6px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alerts.length}</span>
          )}
          <div style={{ position: 'relative', display: 'flex' }}>
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }} style={{ background: 'transparent', border: 0, padding: 2, color: 'var(--a-ink3)', cursor: 'pointer', display: 'flex' }} aria-label="House options">
              <IconDots size={16} />
            </button>
            {menuOpen && (
              <>
                <div onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{ position: 'absolute', top: 24, right: 0, zIndex: 41, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden', minWidth: 150 }}>
                  <MenuItem label="Open house" onClick={() => { setMenuOpen(false); onHouseClick?.(house.id) }} />
                  {onTeamChat && <MenuItem label="Team chat" onClick={() => { setMenuOpen(false); onTeamChat() }} />}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3-stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 0', borderTop: '1px dashed var(--a-line)', borderBottom: '1px dashed var(--a-line)', marginBottom: alerts.length > 0 ? 10 : 12 }}>
          <HouseStat label="Staff on" big={staffOn} sub={staffTotal > 0 ? `of ${staffTotal}` : null} />
          <HouseStat label="Residents in" big={house.residents || 0} sub={house.residents ? `of ${house.residents}` : null} />
          <HouseStat label="Drives today" big={drivesToday} />
        </div>

        {/* Needs attention */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {shown.map((a, i) => <NeedRow key={i} kind={a.kind} text={a.text} />)}
            {extra > 0 && (
              <button onClick={() => onHouseClick ? onHouseClick(house.id) : showToast(`Opening ${house.name}…`)}
                style={{ background: 'transparent', border: 0, padding: '4px 0 0', color: 'var(--a-ink3)', fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist', cursor: 'pointer' }}>
                +{extra} more
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onTeamChat ? onTeamChat() : showToast('Team messaging coming soon')}
            style={{ flex: 1, padding: '9px 0', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 12, fontWeight: 500, color: 'var(--a-ink2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconChat size={13} sw={1.8} /> Message
          </button>
          <button
            onClick={() => onHouseClick ? onHouseClick(house.id) : showToast(`Opening ${house.name}…`)}
            style={{ flex: 2, padding: '9px 0', background: c, border: 0, borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            Open house <IconChev size={13} sw={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Expanded, personalized dashboard for a house manager (one house): today's
// med pass, open incidents, in-transit trips, fire-drill status, flagged residents.
function MgrStat({ label, value, sub, tone, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: 1, textAlign: 'center', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 9.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 22, fontWeight: 500, lineHeight: 1, marginTop: 3, color: tone === 'bad' ? '#a93a25' : 'var(--a-ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: tone === 'bad' ? '#a93a25' : 'var(--a-ink3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ManagerHomePanel({ user, house, onHouseClick }) {
  const c = house.color
  const [d, setD] = useState(null)
  useEffect(() => {
    const uuid = house._uuid
    if (!user?.orgId || !uuid) return
    let cancelled = false
    const today = new Date()
    Promise.all([
      fetchResidents(user.orgId, uuid), fetchMedPass(user.orgId, uuid, today),
      fetchIncidents(user.orgId, uuid), fetchDrills(user.orgId, uuid),
      fetchActiveTrips(user.orgId, uuid), fetchShifts(user.orgId, uuid, today),
      fetchResources(user.orgId, uuid),
    ]).then(([residents, medpass, incidents, drills, active, shifts, resources]) => {
      if (cancelled) return
      const lastFire = drills.filter(x => x.type === 'Fire')[0]
      const fireDue = lastFire ? (Date.now() - new Date((lastFire.date || '') + 'T00:00:00').getTime()) / 86400000 >= 90 : true
      setD({
        residents: residents.length,
        flagged: residents.filter(r => (r.flags || []).length || r.allergies).length,
        medDone: medpass.filter(x => x.status !== 'due').length, medTotal: medpass.length,
        openIncidents: incidents.filter(i => i.status === 'open').length,
        fireDue, active: active.length, onShift: shifts.length, supplies: resources.length,
      })
    })
    return () => { cancelled = true }
  }, [user?.orgId, house._uuid])

  const open = () => onHouseClick?.(house.id)
  const medPct = d && d.medTotal ? d.medDone / d.medTotal : 0
  const Row = ({ label, value, tone, onClick }) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: '1px solid var(--a-line)', cursor: 'pointer' }}>
      <span style={{ fontSize: 13, color: 'var(--a-ink2)', flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: tone === 'bad' ? '#a93a25' : tone === 'good' ? '#3f7050' : 'var(--a-ink)' }}>{value}</span>
      <IconChev size={15} sw={2} color="var(--a-ink3)" />
    </div>
  )

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
          <span className="serif" style={{ fontSize: 19, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{house.name}</span>
          <button onClick={open} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: c, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>Open <IconArrow size={13} sw={2} /></button>
        </div>
        <div style={{ display: 'flex', padding: '8px 0 12px' }}>
          <MgrStat label="Residents" value={d?.residents ?? '–'} sub={d?.flagged ? `${d.flagged} flagged` : 'on file'} onClick={open} />
          <MgrStat label="On shift" value={d?.onShift ?? '–'} sub="today" />
          <MgrStat label="In transit" value={d?.active ?? '–'} sub={d?.active ? 'now' : 'none'} tone={d?.active ? 'bad' : undefined} />
        </div>
        {/* Med pass progress */}
        <div style={{ marginTop: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
            <span style={{ color: 'var(--a-ink2)', fontWeight: 600 }}>Med pass · today</span>
            <span style={{ color: d && d.medTotal && d.medDone === d.medTotal ? '#3f7050' : 'var(--a-clay)', fontWeight: 700 }}>
              {d ? (d.medTotal ? `${d.medDone}/${d.medTotal} done` : 'none scheduled') : '…'}
            </span>
          </div>
          <div style={{ height: 7, background: 'var(--a-paper)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${medPct * 100}%`, height: '100%', background: medPct >= 1 ? '#3f7050' : c, borderRadius: 999 }} />
          </div>
        </div>
      </div>
      <Row label="Open incidents" value={d ? d.openIncidents : '…'} tone={d?.openIncidents ? 'bad' : 'good'} onClick={open} />
      <Row label="Fire drill" value={d ? (d.fireDue ? 'Due' : 'OK') : '…'} tone={d?.fireDue ? 'bad' : 'good'} onClick={open} />
      <Row label="Supplies to get" value={d ? d.supplies : '…'} tone={d?.supplies ? 'bad' : 'good'} onClick={open} />
    </div>
  )
}

export function ScreenA_Houses({ user, houses = [], onHouseClick, onTeamChat, onAddHouse }) {
  const [branch, setBranch] = useState('All')
  const [houseStats, setHouseStats] = useState({})
  const [houseAlerts, setHouseAlerts] = useState({})
  const isManager  = user?.role === 'manager'
  const isSupervisor = user?.role === 'supervisor'

  const branches = ['All', ...new Set(houses.map(h => h.branch).filter(Boolean))]

  const scopedHouses = isManager
    ? houses.filter(h => h.id === user?.houseSlug)
    : houses
  const visibleHouses = isManager || branches.length <= 1
    ? scopedHouses
    : scopedHouses.filter(h => branch === 'All' || h.branch === branch)

  useEffect(() => {
    if (!user?.orgId || !houses.length) return
    const today = new Date()
    Promise.all([
      fetchShifts(user.orgId, null, today),
      fetchTrips(user.orgId, null, today),
      fetchStaff(user.orgId, null),
    ]).then(([shifts, trips, staff]) => {
      const stats = {}
      for (const h of houses) {
        stats[h.id] = {
          staffOn:    shifts.filter(s => s.house === h.id).length,
          staffTotal: staff.filter(s => s.house === h.id).length,
          drivesToday: trips.filter(t => (t.houses?.slug ?? t.house_id) === h.id).length,
        }
      }
      setHouseStats(stats)
    })
    fetchHouseAlerts(user.orgId).then(setHouseAlerts)
  }, [user?.orgId, houses.map(h => h.id).join(',')])

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <GreetingHeader name={user?.name} isSupervisor={isSupervisor && visibleHouses.length > 0} onAddHouse={onAddHouse} />
        {!isManager && branches.length > 1 && <BranchTabs branches={branches} active={branch} setActive={setBranch} />}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 24px' }}>
          {visibleHouses.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🏠</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginBottom: 8, color: 'var(--a-ink)' }}>No houses yet</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 260, margin: '0 auto 24px' }}>
                {isSupervisor
                  ? 'Add your first group home to get started.'
                  : 'Your supervisor hasn\'t added any houses yet.'}
              </div>
              {isSupervisor && onAddHouse && (
                <button onClick={onAddHouse} style={{
                  background: 'var(--a-ink)', color: 'var(--a-card)',
                  border: 0, borderRadius: 999, padding: '12px 28px',
                  fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer',
                }}>
                  Add your first house →
                </button>
              )}
            </div>
          )}
          {visibleHouses.map(h => (
            isManager
              ? <ManagerHomePanel key={h.id} user={user} house={h} onHouseClick={onHouseClick} />
              : <HouseCard key={h.id} house={h} stats={houseStats[h.id]} alerts={houseAlerts[h.id]} onHouseClick={onHouseClick} onTeamChat={onTeamChat} />
          ))}
        </div>
      </div>
      <TabBar active="houses" />
    </div>
  )
}
