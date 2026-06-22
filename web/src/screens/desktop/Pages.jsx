import { useState, useEffect } from 'react'
import { HOUSES, CHAT_DATA } from '../../data/constants'
import { fetchStaff, removeStaff, fetchTrips, fetchVehicles, fetchShifts, fetchHouseAlerts } from '../../lib/db'
import { StaffFormModal, StaffStatus } from '../../components/StaffFormModal'
import { fmtDayLabel, buildWeek } from '../../lib/utils'
import { getGreeting } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'
import { Toast } from '../../components/ui/Toast'
import { Pill } from '../../components/ui/Pill'
import { StaffCard } from '../People'
import { DStat, DHouseCard, DDecision, DTopBar, dCard, dBtnSolid, dBtnGhost } from './Desktop'
import { IconPlus, IconSearch, IconChev, IconChat, IconArrow } from '../../components/icons'
import { TeamChat } from '../../components/TeamChat'
import { StaffRanking } from './StaffRanking'

// ── Local helpers ─────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '12px 16px 4px' }}>
      {children}
    </div>
  )
}

function Stat({ label, big, sub }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>{big}</div>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>
    </div>
  )
}

function NeedRow({ kind, text, color }) {
  const kindMap = {
    grocery: { dot: '#a47012' }, med: { dot: '#a93a25' },
    drive: { dot: '#3c5887' }, note: { dot: 'var(--a-ink3)' }, maint: { dot: '#a47012' },
  }
  const dot = kindMap[kind]?.dot || color
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--a-ink2)', padding: '2px 0' }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, marginTop: 5, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      <div className="tnum" style={{ fontSize: 17, marginTop: 2, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

// Live per-house snapshot (shifts on today, staff total, drives today, alerts),
// shared by the desktop Today + Houses pages. Mirrors the mobile Houses screen.
function useHouseSnapshot(user, houses) {
  const [snap, setSnap] = useState({ stats: {}, alerts: {}, shifts: [], trips: [] })
  useEffect(() => {
    if (!user?.orgId || !houses.length) { setSnap({ stats: {}, alerts: {}, shifts: [], trips: [] }); return }
    let alive = true
    const today = new Date()
    Promise.all([
      fetchShifts(user.orgId, null, today),
      fetchTrips(user.orgId, null, today),
      fetchStaff(user.orgId, null),
      fetchHouseAlerts(user.orgId),
    ]).then(([shifts, trips, staff, alerts]) => {
      if (!alive) return
      const stats = {}
      for (const h of houses) {
        stats[h.id] = {
          staffOn:    shifts.filter(s => s.house === h.id).length,
          staffTotal: staff.filter(s => s.house === h.id).length,
          drivesToday: trips.filter(t => (t.houses?.slug ?? t.house_id) === h.id).length,
        }
      }
      setSnap({ stats, alerts: alerts || {}, shifts: shifts || [], trips: trips || [] })
    })
    return () => { alive = false }
  }, [user?.orgId, houses.length])
  return snap
}

// Map an alert kind to the badge style used in the "Needs attention" list.
const NEED_TAG = {
  grocery: { tag: 'Shop', tone: 'warn' }, med: { tag: 'Med', tone: 'bad' },
  note: { tag: 'Note', tone: 'info' }, drive: { tag: 'Drive', tone: 'info' },
  maint: { tag: 'Maint', tone: 'warn' },
}

function CenteredColumn({ children, width = 760, side }) {
  return (
    <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
      <div style={{
        maxWidth: side ? '100%' : width,
        margin: side ? 0 : '0 auto',
        display: side ? 'grid' : 'block',
        gridTemplateColumns: side ? `minmax(0, ${width}px) minmax(280px, 1fr)` : '',
        gap: 20,
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Today ─────────────────────────────────────────────────────────────

export function PageTodayDesktop({ onHouseClick, user, houses = [], onNavigate }) {
  const [toast, showToast] = useToast()
  const [branchFilter, setBranchFilter] = useState('All')
  const greeting = getGreeting()
  const dateLabel = fmtDayLabel(new Date())
  const firstName = user?.name?.split(' ')[0] || 'there'
  const isManager = user?.role === 'manager'

  const { stats, alerts, shifts, trips } = useHouseSnapshot(user, houses)
  const branches = ['All', ...new Set(houses.map(h => h.branch).filter(Boolean))]
  const scopedHouses = isManager ? houses.filter(h => h.id === user?.houseSlug) : houses
  const visibleCards = scopedHouses
    .filter(h => isManager || branchFilter === 'All' || h.branch === branchFilter)
    .map(house => {
      const a = alerts[house.id] || []
      const st = stats[house.id] || {}
      return {
        house,
        urgent: a.length,
        staff: st.staffOn || 0,
        staffTotal: st.staffTotal || 0,
        present: house.residents || 0,
        drives: st.drivesToday || 0,
        needs: a.map(x => x.text),
      }
    })
  const totalNeeds = visibleCards.reduce((n, c) => n + c.urgent, 0)

  // ── Real top-line metrics (computed from today's shifts + trips) ──────
  const visibleIds = new Set(visibleCards.map(c => c.house.id))
  const nameOf = (slug) => visibleCards.find(c => c.house.id === slug)?.house.name || slug
  const vShifts = shifts.filter(s => visibleIds.has(s.house))
  const vTrips  = trips.filter(t => visibleIds.has(t.houses?.slug ?? t.house_id))
  const openShifts = vShifts.filter(s => s.status === 'open')
  const coverage = vShifts.length ? Math.round((vShifts.length - openShifts.length) / vShifts.length * 100) : 100
  const milesToday = vTrips.reduce((m, t) => m + Number(t.miles || 0), 0)
  const reimbToday = milesToday * 0.67   // IRS-style $/mile
  const residentsTotal = visibleCards.reduce((n, c) => n + (c.house.residents || 0), 0)

  // ── Real "Needs attention" list (house alerts + unfilled shifts) ─────
  const attention = []
  for (const c of visibleCards) {
    for (const a of (alerts[c.house.id] || [])) {
      const t = NEED_TAG[a.kind] || { tag: 'Note', tone: 'info' }
      attention.push({ tag: t.tag, tone: t.tone, who: c.house.name, why: a.text, hid: c.house.id })
    }
  }
  for (const s of openShifts) {
    attention.push({ tag: 'Open shift', tone: 'warn', who: nameOf(s.house), why: `${s.role || 'Shift'} — unfilled`, hid: s.house })
  }
  const attentionShown = attention.slice(0, 7)

  // ── Real "Low on supplies" (Shop alerts across houses) ───────────────
  const lowSupplies = []
  for (const c of visibleCards) {
    for (const a of (alerts[c.house.id] || [])) {
      if (a.kind === 'grocery') lowSupplies.push({ house: c.house, text: a.text })
    }
  }

  return (
    <>
      <Toast msg={toast} />
      <DTopBar
        title={<>{greeting}, <em style={{ color: 'var(--a-sage)', fontStyle: 'italic' }}>{firstName}</em></>}
        sub={<>{dateLabel} · {visibleCards.length} {visibleCards.length === 1 ? 'house' : 'houses'}{isManager ? ' · manager view' : totalNeeds > 0 ? <> · <span style={{ color: 'var(--a-clay)', fontWeight: 600 }}>{totalNeeds} {totalNeeds === 1 ? 'thing needs' : 'things need'} you</span></> : <> · <span style={{ color: 'var(--a-sage)', fontWeight: 600 }}>all clear</span></>}</>}
        actions={<button onClick={() => onNavigate?.('schedule')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> New shift</button>}
      />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          <DStat label="Shift coverage" value={`${coverage}%`} sub={openShifts.length > 0 ? `${openShifts.length} shift${openShifts.length === 1 ? '' : 's'} open` : 'fully staffed today'} tone={coverage >= 100 ? 'good' : 'warn'} big />
          <DStat label="Open shifts" value={openShifts.length} sub="today · need filling" tone={openShifts.length > 0 ? 'warn' : 'good'} />
          <DStat label="Drives today" value={vTrips.length} sub={`${milesToday.toFixed(0)} mi · ~$${reimbToday.toFixed(0)}`} />
          <DStat label="Needs attention" value={totalNeeds} sub={totalNeeds > 0 ? 'across houses' : 'all clear'} tone={totalNeeds > 0 ? 'bad' : 'good'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>Houses today</div>
          {!isManager && branches.length > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {branches.map(b => (
                <button key={b} onClick={() => setBranchFilter(b)} style={{
                  border: b === branchFilter ? '0' : '1px solid var(--a-line)',
                  background: b === branchFilter ? 'var(--a-ink)' : 'transparent',
                  color: b === branchFilter ? 'var(--a-card)' : 'var(--a-ink2)',
                  padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 500, fontFamily: 'Geist', cursor: 'pointer',
                }}>{b}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
          {visibleCards.map(({ house, urgent, staff, staffTotal, present, drives, needs }) => (
            <DHouseCard key={house.id} house={house} urgent={urgent} staff={staff} staffTotal={staffTotal} present={present} drives={drives} needs={needs}
              onClick={() => onHouseClick && onHouseClick(house.id)} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16 }}>
          <div style={dCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: attention.length ? 'var(--a-clay)' : 'var(--a-sage)' }} />
              <span className="serif" style={{ fontSize: 18 }}>Needs attention</span>
              <span style={{ fontSize: 10, color: 'var(--a-ink3)', background: 'var(--a-paper)', padding: '1px 7px', borderRadius: 999, marginLeft: 'auto' }}>{attention.length} open</span>
            </div>
            {attention.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--a-ink3)' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: 13.5, color: 'var(--a-ink2)', fontWeight: 500 }}>You're all caught up</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>No open supply, med, note or shift items today.</div>
              </div>
            ) : attentionShown.map((d, i) => (
              <DDecision key={i} tag={d.tag} tone={d.tone} who={d.who} why={d.why} cta="Open"
                last={i === attentionShown.length - 1}
                onCta={() => onHouseClick && onHouseClick(d.hid)} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={dCard}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="serif" style={{ fontSize: 18 }}>Driving today</span>
                <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>all houses</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <Mini label="Trips" value={vTrips.length} />
                <Mini label="Miles" value={milesToday.toFixed(0)} />
                <Mini label="Est. cost" value={`$${reimbToday.toFixed(0)}`} />
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 10 }}>Reimbursement estimated at $0.67 / mile.</div>
            </div>
            {lowSupplies.length > 0 && (
              <div style={dCard}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="serif" style={{ fontSize: 18 }}>Low on supplies</span>
                  <span style={{ fontSize: 11, color: 'var(--a-clay)', fontWeight: 500 }}>{lowSupplies.length} house{lowSupplies.length === 1 ? '' : 's'}</span>
                </div>
                {lowSupplies.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', fontSize: 12.5, color: 'var(--a-ink2)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.house.color, letterSpacing: '0.08em', background: `${s.house.color}1a`, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>{s.house.short}</span>
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Houses ─────────────────────────────────────────────────────────────

function HouseCardWide({ house, urgent, staff, staffTotal, present, drives, needs, onOpen }) {
  const c = house.color
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ height: 4, background: c }} />
      <div style={{ padding: '16px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, letterSpacing: '0.1em', background: `${c}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
              <span className="serif" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>{house.name}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 3 }}>
              {house.addr} · {house.branch} · mgr {house.manager}
            </div>
          </div>
          {urgent > 0 ? (
            <span style={{ background: '#d44e3a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{urgent}</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 600 }}>ALL CLEAR</span>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 18px 14px', borderBottom: '1px dashed var(--a-line)' }}>
        <Stat label="On shift" big={staff} sub={staffTotal > 0 ? `of ${staffTotal}` : 'on shift'} />
        <Stat label="Residents in" big={present} sub={`of ${house.residents}`} />
        <Stat label="Today's drives" big={drives} sub="planned" />
      </div>
      <div style={{ padding: '12px 18px 14px' }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Needs attention</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {needs.map((s, i) => <NeedRow key={i} {...s} color={c} />)}
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--a-line)' }}>
        <button onClick={onOpen} style={{ flex: 1, padding: '11px 0', background: 'transparent', border: 0, fontSize: 12.5, fontWeight: 600, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Geist', cursor: 'pointer' }}>
          Open house <IconArrow size={14} sw={2} />
        </button>
      </div>
    </div>
  )
}

export function PageHousesDesktop({ onHouseClick, user, houses = [], onNavigate }) {
  const isManager = user?.role === 'manager'
  const { stats, alerts } = useHouseSnapshot(user, houses)
  const scoped = isManager ? houses.filter(h => h.id === user?.houseSlug) : houses
  const houseData = scoped.map(house => {
    const a = alerts[house.id] || []
    const st = stats[house.id] || {}
    return {
      house,
      urgent: a.length,
      staff: st.staffOn || 0,
      staffTotal: st.staffTotal || 0,
      present: house.residents || 0,
      drives: st.drivesToday || 0,
      needs: a,
    }
  })
  const subText = isManager
    ? `${houseData.length} house · manager view`
    : `${houseData.length} house${houseData.length === 1 ? '' : 's'}`
  return (
    <>
      <DTopBar title="Houses" sub={subText}
        actions={!isManager && <button onClick={() => onNavigate?.('setup')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Add house</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        {houseData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--a-ink3)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No houses yet</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>Go to House Setup to create your first house.</div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          {houseData.map(({ house, urgent, staff, staffTotal, present, drives, needs }) => (
            <HouseCardWide key={house.id} house={house} urgent={urgent} staff={staff} staffTotal={staffTotal} present={present} drives={drives} needs={needs}
              onOpen={() => onHouseClick && onHouseClick(house.id)} />
          ))}
        </div>
      </div>
    </>
  )
}

// ── Team chat ─────────────────────────────────────────────────────────

function ChannelRow({ ch, active, onClick }) {
  const h = HOUSES.find(x => x.id === ch.key)
  const color = h ? h.color : '#6e4d8f'
  const short = h ? h.short : ch.name?.split(' ').map(n => n[0]).join('')
  const last = ch.messages[ch.messages.length - 1]
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', background: active ? 'var(--a-paper)' : 'transparent' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{short}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{ch.name}</span>
          {last && <span style={{ fontSize: 10, color: 'var(--a-ink3)' }}>{last.time}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
          {last ? `${last.from}: ${last.text}` : 'No messages'}
        </div>
      </div>
    </div>
  )
}

function Msg({ who, color, time, text, me }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexDirection: me ? 'row-reverse' : 'row' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{who[0]}</div>
      <div style={{ maxWidth: '70%' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexDirection: me ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{who}</span>
          <span style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{time}</span>
        </div>
        <div style={{ background: me ? 'var(--a-ink)' : 'var(--a-card)', color: me ? 'var(--a-card)' : 'var(--a-ink)', padding: '10px 14px', borderRadius: 12, border: me ? '0' : '1px solid var(--a-line)', fontSize: 13.5, lineHeight: 1.45 }}>{text}</div>
      </div>
    </div>
  )
}

export function PageTeamDesktop({ user }) {
  return <TeamChat user={user} desktop />
}

// ── Staff ─────────────────────────────────────────────────────────────

export function PageStaffDesktop({ user, houses = [] }) {
  const [query, setQuery] = useState('')
  const [houseFilter, setHouseFilter] = useState('All')
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [modal, setModal] = useState(null)   // null | { mode:'add' } | { mode:'edit', staff }
  const [view, setView] = useState('directory')   // 'directory' | 'ranking'
  const [toast, showToast] = useToast()

  const reload = () => {
    if (!user?.orgId) return Promise.resolve([])
    const houseId = user.role === 'manager' ? user.houseId : null
    return fetchStaff(user.orgId, houseId).then(data => { setStaffList(data); setLoading(false); return data })
  }
  useEffect(() => { setLoading(true); reload() }, [user?.orgId, user?.houseId, user?.role])

  const onSaved = async (_row, mode) => {
    setModal(null)
    const data = await reload()
    if (mode === 'edit' && selectedStaff) setSelectedStaff(data.find(s => s.id === selectedStaff.id) || null)
    showToast(mode === 'edit' ? 'Staff updated' : 'Staff added')
  }
  const onRemove = async (staff) => {
    if (!staff.id) return
    await removeStaff(staff.id); setSelectedStaff(null); reload(); showToast('Staff removed')
  }
  const pendingCount = staffList.filter(s => !s.linked).length

  const houseFilterTabs = ['All', ...houses.map(h => h.name)]

  const filtered = staffList.filter(s => {
    const matchHouse = houseFilter === 'All' || s.houseName === houseFilter || s.house === houseFilter.toLowerCase()
    const matchQuery = s.name.toLowerCase().includes(query.toLowerCase()) || s.role.toLowerCase().includes(query.toLowerCase())
    return matchHouse && matchQuery
  })

  return (
    <>
      <Toast msg={toast} />
      <DTopBar title="Staff" sub={`${staffList.length} staff member${staffList.length === 1 ? '' : 's'}`}
        actions={<>
          <div style={{ display: 'flex', background: 'var(--a-paper)', borderRadius: 999, padding: 3, border: '1px solid var(--a-line)' }}>
            {['directory', 'ranking'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ border: 0, background: v === view ? 'var(--a-ink)' : 'transparent', color: v === view ? 'var(--a-card)' : 'var(--a-ink2)', padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'Geist', textTransform: 'capitalize' }}>{v === 'ranking' ? 'Ranking' : 'Directory'}</button>
            ))}
          </div>
          <button onClick={() => setModal({ mode: 'add' })} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Add staff</button>
        </>}
        search={false} />
      <CenteredColumn width={820} side>
        <div>{view === 'ranking' ? <StaffRanking user={user} /> : (<>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, background: 'var(--a-paper)', borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--a-line)' }}>
              <IconSearch size={13} color="var(--a-ink3)" />
              <input placeholder="Search staff…" value={query} onChange={e => setQuery(e.target.value)}
                style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 12.5, fontFamily: 'Geist', color: 'var(--a-ink)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {houseFilterTabs.map(b => (
              <button key={b} onClick={() => setHouseFilter(b)} style={{
                border: b === houseFilter ? '0' : '1px solid var(--a-line)',
                background: b === houseFilter ? 'var(--a-ink)' : 'transparent',
                color: b === houseFilter ? 'var(--a-card)' : 'var(--a-ink2)',
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontFamily: 'Geist', fontWeight: 500, cursor: 'pointer',
              }}>{b}</button>
            ))}
          </div>
          {loading && <div style={{ color: 'var(--a-ink3)', fontSize: 13, paddingTop: 12 }}>Loading…</div>}
          {!loading && staffList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No staff yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Hire your first team member to get started.</div>
            </div>
          )}
          {!loading && staffList.length > 0 && filtered.map((s) => <StaffCard key={s.id} {...s} onClick={() => setSelectedStaff(s)} />)}
          {!loading && staffList.length > 0 && filtered.length === 0 && <div style={{ color: 'var(--a-ink3)', fontSize: 13, paddingTop: 12 }}>No staff match your search.</div>}
        </>)}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedStaff ? (
            <div style={dCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <button onClick={() => setSelectedStaff(null)} style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', padding: 0 }}>
                  <IconChev size={16} sw={2} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <span className="serif" style={{ fontSize: 18 }}>{selectedStaff.name}</span>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: selectedStaff.houseColor ?? '#888', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, margin: '0 auto 8px' }}>{selectedStaff.name.split(' ').map(n => n[0]).join('')}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedStaff.role}</div>
                <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 8 }}>{selectedStaff.houseName ?? 'No house assigned'}</div>
                <StaffStatus linked={selectedStaff.linked} />
              </div>
              {selectedStaff.email && <div style={{ fontSize: 12, color: 'var(--a-ink3)', textAlign: 'center', marginBottom: 4 }}>{selectedStaff.email}</div>}
              {!selectedStaff.linked && <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', lineHeight: 1.5, marginBottom: 12 }}>Invited — becomes active once they sign in with this email.</div>}
              {selectedStaff.notes && <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.5, marginBottom: 12 }}>{selectedStaff.notes}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={() => setModal({ mode: 'edit', staff: selectedStaff })} style={{ ...dBtnGhost, flex: 1, justifyContent: 'center' }}>Edit</button>
                <button onClick={() => onRemove(selectedStaff)} style={{ ...dBtnGhost, flex: 1, justifyContent: 'center', color: '#a93a25', borderColor: '#e3b6ad' }}>Remove</button>
              </div>
            </div>
          ) : (
            <div style={dCard}>
              <span className="serif" style={{ fontSize: 18 }}>Team overview</span>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1, textAlign: 'center', background: 'var(--a-paper)', borderRadius: 10, padding: '12px 4px' }}>
                  <div className="serif tnum" style={{ fontSize: 26, fontWeight: 500 }}>{staffList.length}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', background: 'var(--a-paper)', borderRadius: 10, padding: '12px 4px' }}>
                  <div className="serif tnum" style={{ fontSize: 26, fontWeight: 500, color: '#3f7050' }}>{staffList.length - pendingCount}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Active</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', background: 'var(--a-paper)', borderRadius: 10, padding: '12px 4px' }}>
                  <div className="serif tnum" style={{ fontSize: 26, fontWeight: 500, color: '#a47012' }}>{pendingCount}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pending</div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 14, lineHeight: 1.5 }}>
                Click a staff card to view, edit, or remove them. <strong>Pending</strong> means they’ve been invited but haven’t signed in yet.
              </div>
            </div>
          )}
        </div>
      </CenteredColumn>
      {modal && (
        <StaffFormModal user={user} centered editStaff={modal.mode === 'edit' ? modal.staff : null} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
    </>
  )
}

// ── Orientation ───────────────────────────────────────────────────────

function NewHireCard({ name, house, mentor, day, pct, next }) {
  const h = HOUSES.find(x => x.id === house) || { color: '#888888', name: house }
  const initials = name.split(' ').map(n => n[0]).join('')
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: h.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{h.name} · mentor {mentor}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="serif tnum" style={{ fontSize: 18, fontWeight: 500, color: 'var(--a-sage)', lineHeight: 1 }}>{Math.round(pct * 100)}%</div>
          <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Day {day}/30</div>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--a-paper)', borderRadius: 999, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--a-sage)' }} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--a-ink2)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--a-clay)', background: '#fadcd7', padding: '2px 6px', borderRadius: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Next</span>
        {next}
      </div>
    </div>
  )
}

function RootWeek({ num, title, items }) {
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--a-paper)', color: 'var(--a-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '1.5px solid var(--a-line)' }}>{num}</div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--a-ink3)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>Week {num}</div>
          <div className="serif" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>{title}</div>
        </div>
      </div>
      <ul style={{ paddingLeft: 16, margin: '10px 0 0', listStyle: 'none' }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 12, color: 'var(--a-ink2)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--a-ink3)' }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PageOrientationDesktop({ onNavigate }) {
  const [toast, showToast] = useToast()
  return (
    <>
      <Toast msg={toast} />
      <DTopBar title="Orientation" sub="New-hire onboarding"
        actions={<button onClick={() => onNavigate?.('staff')} style={dBtnSolid}><IconPlus size={13} sw={2.4} /> Add hire</button>} />
      <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px 40px' }}>
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '36px 20px', textAlign: 'center', color: 'var(--a-ink3)' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🌱</div>
          <div className="serif" style={{ fontSize: 20, color: 'var(--a-ink)', marginBottom: 6 }}>No one is onboarding right now</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
            When you add a new hire, they'll appear here with their 30-day progress against the plan below.
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>The Roots plan</span>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 4, marginBottom: 14 }}>A 30-day onboarding template — four weeks, mentor-led, self-paced with Friday check-ins.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <RootWeek num={1} title="Find your footing" items={['Welcome video', 'Meet your mentor', 'House walkthrough', 'Resident profiles', 'Shadow shift #1']} />
            <RootWeek num={2} title="On the floor" items={['Daily routines', 'Documentation basics', 'Family intros', 'Shadow shift #2', 'Activity planning', 'Mid-week check-in']} />
            <RootWeek num={3} title="Medications & docs" items={['MAR training', 'Med pass observed', 'Incident reporting', 'Quality basics', 'Mock audit']} />
            <RootWeek num={4} title="Solo + sign-off" items={['Solo shift #1', 'Solo shift #2', 'Mentor sign-off', '30-day review']} />
          </div>
        </div>
      </div>
    </>
  )
}
