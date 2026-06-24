import { useState, useEffect } from 'react'
import { fmtDayLabel, getGreeting } from '../lib/utils'
import { TendLogo } from '../components/ui/TendLogo'
import {
  IconCal, IconHeart, IconFlag, IconClock, IconChev, IconPeople,
  IconChat, IconMegaphone,
} from '../components/icons'
import { fetchShifts, fetchTrips, fetchStaff, fetchHouseAlerts } from '../lib/db'

// ── Status palette (Hearth tokens) ────────────────────────────────────
const TONE = {
  good: { bg: 'var(--status-good-bg, #dee6df)', tc: 'var(--status-good-tc, #3f604d)' },
  warn: { bg: 'var(--status-warn-bg, #f5e9d6)', tc: '#b9892f' },
  bad:  { bg: 'var(--status-bad-bg, #fadcd7)',  tc: 'var(--a-clay, #b05c3c)' },
  info: { bg: 'var(--a-paper)',                 tc: 'var(--a-sage, #4a6b56)' },
}

// Map an alert kind to a tag + tone, mirroring the desktop "Needs attention" list.
const NEED_TAG = {
  grocery: { tag: 'Shop',  tone: 'warn' },
  med:     { tag: 'Med',   tone: 'bad'  },
  note:    { tag: 'Note',  tone: 'info' },
  drive:   { tag: 'Drive', tone: 'info' },
  appt:    { tag: 'Appt',  tone: 'info' },
  maint:   { tag: 'Maint', tone: 'warn' },
}

// Format a numeric hour (e.g. 23, 7.5) into a compact clock label.
function fmtHour(h) {
  if (h == null || Number.isNaN(Number(h))) return ''
  const n = Number(h)
  const hr = Math.floor(n) % 24
  const min = Math.round((n - Math.floor(n)) * 60)
  const ap = hr < 12 ? 'am' : 'pm'
  const h12 = hr % 12 === 0 ? 12 : hr % 12
  return `${h12}${min ? ':' + String(min).padStart(2, '0') : ''}${ap}`
}

// ── Greeting header ───────────────────────────────────────────────────
function GreetingHeader({ name, houseCount, residentCount, needsCount }) {
  const today = new Date()
  const firstName = name?.split(' ')[0] || 'there'
  const rollup = [
    `${houseCount} ${houseCount === 1 ? 'house' : 'houses'}`,
    `${residentCount} ${residentCount === 1 ? 'resident' : 'residents'}`,
    needsCount > 0
      ? `${needsCount} ${needsCount === 1 ? 'thing needs' : 'things need'} you`
      : 'all clear',
  ].join(' · ')
  return (
    <div style={{ padding: '10px calc(22px + var(--chip-clear, 0px)) 6px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 2 }}>{fmtDayLabel(today)}</div>
        <TendLogo size={14} style={{ marginTop: 2 }} />
      </div>
      <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
        {getGreeting()},<br /><em style={{ color: 'var(--a-sage)' }}>{firstName}</em>
      </div>
      <div style={{ fontSize: 13, color: 'var(--a-ink3)', marginTop: 6 }}>{rollup}</div>
    </div>
  )
}

// ── Section header (label + optional action) ──────────────────────────
function SectionHeader({ label, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '18px 22px 8px' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      {action && (
        <button onClick={onAction} style={{ background: 'transparent', border: 0, padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--a-sage)', fontFamily: 'Geist', cursor: 'pointer' }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ── At-a-glance tile ──────────────────────────────────────────────────
function GlanceTile({ icon: Icon, tone = 'info', value, label, sub, subTone, onClick }) {
  const t = TONE[tone] || TONE.info
  const st = subTone ? (TONE[subTone] || TONE.info) : null
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', width: '100%',
      background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14,
      padding: '14px 14px', fontFamily: 'Geist', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: t.bg, color: t.tc, flexShrink: 0 }}>
          <Icon size={18} sw={1.7} />
        </span>
        <span className="serif tnum" style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.05, color: 'var(--a-ink)' }}>{value}</span>
      </div>
      <span style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.25 }}>{label}</span>
      {sub && (
        <span style={{ fontSize: 12, marginTop: 'auto', color: st ? st.tc : 'var(--a-ink3)', fontWeight: st ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
      )}
    </button>
  )
}

// ── Priority row ──────────────────────────────────────────────────────
function PriorityRow({ rail, icon: Icon, iconTone, title, sub, pill, pillTone = 'info', last, onClick }) {
  const it = iconTone ? (TONE[iconTone] || TONE.info) : null
  const pt = TONE[pillTone] || TONE.info
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
      background: 'transparent', border: 0, padding: '12px 14px', fontFamily: 'Geist', cursor: 'pointer',
      borderTop: last === 'first' ? 0 : '1px solid var(--a-line)',
    }}>
      <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 999, background: rail || 'var(--a-sage)', flexShrink: 0 }} />
      <span style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: it ? it.bg : 'var(--a-paper)', color: it ? it.tc : 'var(--a-ink2)' }}>
        <Icon size={18} sw={1.7} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1.25 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--a-ink3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {pill && <span style={{ fontSize: 11, fontWeight: 600, color: pt.tc, background: pt.bg, padding: '2px 8px', borderRadius: 999 }}>{pill}</span>}
        <IconChev size={16} color="var(--a-ink3)" />
      </span>
    </button>
  )
}

// ── House summary row ─────────────────────────────────────────────────
function HouseRow({ house, staffOn, alertCount, last, onClick }) {
  const c = house.color
  const meta = [
    house.branch,
    `${staffOn} on`,
    `${house.residents || 0} ${house.residents === 1 ? 'resident' : 'residents'}`,
    house.manager,
  ].filter(Boolean).join(' · ')
  const status = alertCount > 0
    ? { label: 'Needs you', tone: 'bad' }
    : { label: 'All good', tone: 'good' }
  const st = TONE[status.tone]
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
      background: 'transparent', border: 0, padding: '12px 14px', fontFamily: 'Geist', cursor: 'pointer',
      borderTop: last === 'first' ? 0 : '1px solid var(--a-line)',
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: '0.08em', background: `${c}1a`, padding: '2px 6px', borderRadius: 4 }}>{house.short}</span>
          <span className="serif" style={{ fontSize: 17, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{house.name}</span>
          {alertCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#d44e3a', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{alertCount}</span>
          )}
        </span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--a-ink3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: st.tc, background: st.bg, padding: '2px 8px', borderRadius: 999 }}>{status.label}</span>
        <IconChev size={16} color="var(--a-ink3)" />
      </span>
    </button>
  )
}

// ── Quick action ──────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '12px 6px', background: 'var(--a-card)', border: '1px solid var(--a-line)',
      borderRadius: 14, color: 'var(--a-ink2)', fontSize: 12, fontWeight: 600,
      textAlign: 'center', fontFamily: 'Geist', cursor: 'pointer',
    }}>
      <span style={{ width: 38, height: 38, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-paper)', color: 'var(--a-sage)' }}>
        <Icon size={20} sw={1.7} />
      </span>
      {label}
    </button>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────
function Card({ children }) {
  return (
    <div style={{ margin: '0 16px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, overflow: 'hidden' }}>
      {children}
    </div>
  )
}

// New mobile landing for supervisor / manager. Mirrors the desktop dashboard's
// data composition (open shifts, house alerts, staff on shift) but laid out for
// phone with a serif greeting, an at-a-glance grid, ranked care priorities, a
// compact houses summary, and quick actions.
export function ScreenA_Home({ user, houses = [], onNavigate, onHouseClick }) {
  const [snap, setSnap] = useState({ stats: {}, alerts: {}, shifts: [] })
  const [loading, setLoading] = useState(true)

  const isManager = user?.role === 'manager'
  const scopedHouses = isManager ? houses.filter(h => h.id === user?.houseSlug) : houses

  useEffect(() => {
    if (!user?.orgId || !houses.length) { setSnap({ stats: {}, alerts: {}, shifts: [] }); setLoading(false); return }
    let alive = true
    setLoading(true)
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
          staffOn:     shifts.filter(s => s.house === h.id).length,
          staffTotal:  staff.filter(s => s.house === h.id).length,
          drivesToday: trips.filter(t => (t.houses?.slug ?? t.house_id) === h.id).length,
        }
      }
      setSnap({ stats, alerts: alerts || {}, shifts: shifts || [] })
      setLoading(false)
    }).catch(() => { if (alive) { setSnap({ stats: {}, alerts: {}, shifts: [] }); setLoading(false) } })
    return () => { alive = false }
  }, [user?.orgId, houses.map(h => h.id).join(',')])

  const { stats, alerts, shifts } = snap
  const visibleIds = new Set(scopedHouses.map(h => h.id))
  const nameOf = (slug) => scopedHouses.find(h => h.id === slug)?.name || slug
  const houseOf = (slug) => scopedHouses.find(h => h.id === slug)

  // ── At-a-glance numbers (same approach as PageTodayDesktop) ──────────
  const vShifts = shifts.filter(s => visibleIds.has(s.house))
  const openShifts = vShifts.filter(s => s.status === 'open')
  const staffOnTotal = vShifts.filter(s => s.status !== 'open').length
  const residentsTotal = scopedHouses.reduce((n, h) => n + (h.residents || 0), 0)

  // Per-house alert lists, scoped to visible houses.
  const houseAlertList = scopedHouses.map(h => ({ house: h, list: alerts[h.id] || [] }))
  const totalAlerts = houseAlertList.reduce((n, c) => n + c.list.length, 0)

  // Residents needing attention (med alerts mention a resident).
  const medRows = []
  for (const c of houseAlertList) {
    for (const a of c.list) if (a.kind === 'med') medRows.push({ house: c.house, text: a.text })
  }
  // Incidents & alerts surfaced from house alerts (med + maint = action items).
  const incidentRows = []
  for (const c of houseAlertList) {
    for (const a of c.list) if (a.kind === 'med' || a.kind === 'maint') incidentRows.push({ house: c.house, ...a })
  }

  // ── Ranked care priorities (open shifts first, then alerts) ──────────
  const priorities = []
  for (const s of openShifts) {
    const h = houseOf(s.house)
    priorities.push({
      key: `shift-${s.id}`,
      rail: 'var(--a-clay)',
      icon: IconPeople, iconTone: 'warn',
      title: `Fill ${s.role || 'shift'} — ${nameOf(s.house)}`,
      sub: `${fmtHour(s.start)}–${fmtHour(s.end)} · unassigned`,
      pill: 'Open', pillTone: 'warn',
      onClick: () => onNavigate?.('sched'),
    })
  }
  for (const c of houseAlertList) {
    for (const a of c.list) {
      if (a.kind === 'med' || a.kind === 'maint') {
        const t = NEED_TAG[a.kind] || NEED_TAG.note
        priorities.push({
          key: `alert-${c.house.id}-${a.kind}-${a.text}`,
          rail: c.house.color,
          icon: IconFlag, iconTone: 'bad',
          title: `${t.tag} — ${c.house.name}`,
          sub: a.text,
          pill: t.tag, pillTone: t.tone,
          onClick: () => onHouseClick?.(c.house.id),
        })
      }
    }
  }
  for (const c of houseAlertList) {
    for (const a of c.list) {
      if (a.kind === 'note' || a.kind === 'drive' || a.kind === 'appt' || a.kind === 'grocery') {
        const t = NEED_TAG[a.kind] || NEED_TAG.note
        priorities.push({
          key: `note-${c.house.id}-${a.kind}-${a.text}`,
          rail: c.house.color,
          icon: a.kind === 'drive' || a.kind === 'appt' ? IconCal : IconFlag, iconTone: t.tone,
          title: `${t.tag} — ${c.house.name}`,
          sub: a.text,
          pill: t.tag, pillTone: t.tone,
          onClick: () => onHouseClick?.(c.house.id),
        })
      }
    }
  }
  const shownPriorities = priorities.slice(0, 5)

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <GreetingHeader
          name={user?.name}
          houseCount={scopedHouses.length}
          residentCount={residentsTotal}
          needsCount={totalAlerts + openShifts.length}
        />

        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
          {/* At a glance */}
          <SectionHeader label="At a glance · today" />
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <GlanceTile
              icon={IconCal} tone="warn"
              value={loading ? '–' : openShifts.length}
              label={openShifts.length === 1 ? 'Open shift today' : 'Open shifts today'}
              sub={openShifts.length > 0 ? `${nameOf(openShifts[0].house)} · ${openShifts[0].role || 'shift'}` : 'fully covered'}
              subTone={openShifts.length > 0 ? 'warn' : undefined}
              onClick={() => onNavigate?.('sched')}
            />
            <GlanceTile
              icon={IconHeart} tone="info"
              value={loading ? '–' : medRows.length}
              label="Residents need attention"
              sub={medRows.length > 0 ? medRows.slice(0, 2).map(r => r.house.short).join(' · ') : 'all stable'}
              onClick={() => scopedHouses[0] && onHouseClick?.(scopedHouses[0].id)}
            />
            <GlanceTile
              icon={IconFlag} tone="bad"
              value={loading ? '–' : incidentRows.length}
              label="Incidents & alerts"
              sub={incidentRows.length > 0 ? `${incidentRows.length} need${incidentRows.length === 1 ? 's' : ''} review` : 'none open'}
              subTone={incidentRows.length > 0 ? 'bad' : undefined}
              onClick={() => onNavigate?.('activity')}
            />
            <GlanceTile
              icon={IconClock} tone="good"
              value={loading ? '–' : staffOnTotal}
              label="Staff on today"
              sub={`${vShifts.length} shift${vShifts.length === 1 ? '' : 's'} scheduled`}
              onClick={() => onNavigate?.('sched')}
            />
          </div>

          {/* Today's care priorities */}
          <SectionHeader label="Today's care priorities" action={priorities.length > 5 ? 'View all' : undefined} onAction={() => onNavigate?.('activity')} />
          {loading ? (
            <Card><div style={{ padding: '20px 14px', fontSize: 13, color: 'var(--a-ink3)', textAlign: 'center' }}>Loading today’s priorities…</div></Card>
          ) : shownPriorities.length === 0 ? (
            <Card>
              <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                <div className="serif" style={{ fontSize: 18, color: 'var(--a-ink)', marginBottom: 4 }}>You’re all caught up</div>
                <div style={{ fontSize: 12.5, color: 'var(--a-ink3)' }}>No open shifts, med or supply items today.</div>
              </div>
            </Card>
          ) : (
            <Card>
              {shownPriorities.map((p, i) => {
                const { key, ...rest } = p
                return <PriorityRow key={key} {...rest} last={i === 0 ? 'first' : undefined} />
              })}
            </Card>
          )}

          {/* Your houses */}
          <SectionHeader label="Your houses" action={!isManager ? 'Add house' : undefined} onAction={() => onNavigate?.('setup')} />
          {scopedHouses.length === 0 ? (
            <Card><div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 13, color: 'var(--a-ink3)' }}>No houses yet.</div></Card>
          ) : (
            <Card>
              {scopedHouses.map((h, i) => (
                <HouseRow
                  key={h.id}
                  house={h}
                  staffOn={stats[h.id]?.staffOn ?? 0}
                  alertCount={(alerts[h.id] || []).length}
                  last={i === 0 ? 'first' : undefined}
                  onClick={() => onHouseClick?.(h.id)}
                />
              ))}
            </Card>
          )}

          {/* Quick actions */}
          <SectionHeader label="Quick actions" />
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <QuickAction icon={IconPeople} label="Fill shift" onClick={() => onNavigate?.('sched')} />
            <QuickAction icon={IconFlag} label="Log incident" onClick={() => onNavigate?.('activity')} />
            <QuickAction icon={IconChat} label="Message" onClick={() => onNavigate?.('team')} />
            <QuickAction icon={IconMegaphone} label="Post update" onClick={() => onNavigate?.('updates')} />
          </div>
        </div>
      </div>
    </div>
  )
}
