import { useState, useEffect, useMemo } from 'react'
import { fetchResidents } from '../lib/db'
import {
  IconChev, IconSearch, IconFilter, IconHeart, IconChart, IconActivity,
  IconClipboard, IconClock, IconBook, IconCart,
} from '../components/icons'

// ── Care hub (Screen A) ──────────────────────────────────────────────────────
// Top-level Care landing that spans every house: today's care priorities, the
// module grid (clear entry points), and a cross-house resident list. Tapping a
// resident hands the full resident row back up via onOpenResident(resident) so
// the shell can route to the resident profile. Mirrors the approved mockup
// mockups/redesign-phase0/03-care-hub.html. Hearth styling, no emoji.

const RESIDENT_STATUS = {
  active:   'Home',
  appt:     'At appointment',
  program:  'Day program',
  hospital: 'Hospital',
  away:     'Away / visit',
}
const statusLabel = (s) => RESIDENT_STATUS[s] || RESIDENT_STATUS.active

// A small status pill on a flagged resident (incident / health due etc.).
function dotColor(kind) {
  return kind === 'bad' ? 'var(--a-clay)'
    : kind === 'warn' ? '#b9892f'
    : kind === 'good' ? 'var(--a-sage)'
    : 'var(--a-line)'
}

function SectionHeader({ label, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 8px', padding: '0 16px' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      {right}
    </div>
  )
}

// A single priority card with a tinted left rail by status. When `onClick` is
// supplied the whole card becomes a button so priorities can deep-link into the
// relevant care area.
function PriorityCard({ tone, Icon, title, sub, meta, onClick }) {
  const rail = tone === 'bad' ? 'var(--a-clay)' : tone === 'warn' ? '#b9892f' : 'var(--a-sage)'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left',
        padding: '12px 14px', background: 'var(--a-card)', fontFamily: 'Geist',
        border: '1px solid var(--a-line)', borderLeft: `3px solid ${rail}`,
        borderRadius: 12, marginBottom: 8, cursor: onClick ? 'pointer' : 'default',
      }}>
      <span style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: rail, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="#fff" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1.25 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 2 }}>{sub}</div>
      </div>
      {meta && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink3)', whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'center' }}>{meta}</span>}
    </Tag>
  )
}

// One module tile in the "Go to" grid.
function ModTile({ Icon, label, sub, count, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 8,
      padding: 12, minHeight: 84, textAlign: 'left', cursor: 'pointer',
      background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12,
      fontFamily: 'Geist',
    }}>
      {count != null && (
        <span style={{ position: 'absolute', top: 8, right: 8, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--a-clay)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
      )}
      <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--a-paper)', color: 'var(--a-sage)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1.15 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--a-ink3)' }}>{sub}</span>
    </button>
  )
}

function ageFromDob(dob) {
  if (!dob) return null
  const d = new Date(dob); if (isNaN(d)) return null
  const t = new Date(); let a = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--
  return a >= 0 && a < 130 ? a : null
}

export function ScreenA_CareHub({ user, houses = [], onOpenResident, onOpenHouseSection, scopeHouseId = null }) {
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  // `scopeHouseId` (a house DB uuid) hard-scopes the hub to one house — used for
  // house-bound users (a DSP). When set, that house is the only one shown and the
  // initial resident filter; the cross-house picker is hidden.
  const [houseFilter, setHouseFilter] = useState(scopeHouseId || '')  // '' = all houses
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // House lookup keyed by db uuid (resident.house_id) so we can resolve the
  // resident's house color / short badge without another fetch.
  const houseByUuid = useMemo(() => {
    const m = {}
    for (const h of houses) m[h._uuid] = h
    return m
  }, [houses])

  // Resolve the active house for module deep-links: the explicit scope, the
  // chosen filter, or — when neither is set and there's exactly one house — that
  // single house. Module tiles route into this house's HouseDetail at the
  // matching section. Null only when the user is genuinely spanning >1 house.
  const targetHouseId = scopeHouseId || houseFilter ||
    (houses.length === 1 ? houses[0]._uuid : null)
  const targetHouse = targetHouseId ? houseByUuid[targetHouseId] : null

  // Open the target house's HouseDetail at a given section pill. Threaded up to
  // the shell via onOpenHouseSection(houseSlug, sectionId).
  const goToSection = (sectionId) => {
    if (!targetHouse || !onOpenHouseSection) return
    onOpenHouseSection(targetHouse.id, sectionId)
  }

  // Residents: when scoped to one house (a DSP) fetch just that house; otherwise
  // fetchResidents with no houseId returns every resident in the org (existing db
  // function — no new backend).
  useEffect(() => {
    if (!user?.orgId) { setResidents([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchResidents(user.orgId, scopeHouseId || null).then(rows => {
      if (cancelled) return
      setResidents(rows || [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user?.orgId, scopeHouseId])

  const today = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

  // Resolve a resident's house (color + short badge). Falls back to the joined
  // `houses` row (Supabase path) when the house isn't in the prop list.
  const resHouse = (r) => houseByUuid[r.house_id] || (r.houses ? { name: r.houses.name, short: (r.houses.slug || r.houses.name || '').slice(0, 3).toUpperCase(), color: r.houses.color } : null)

  const visibleResidents = residents.filter(r => {
    if (houseFilter && r.house_id !== houseFilter) return false
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      const h = resHouse(r)
      if (!(`${r.name || ''} ${h?.name || ''}`.toLowerCase().includes(q))) return false
    }
    return true
  })

  // Residents that carry a quick-reference flag or an allergy show a status dot
  // set; the first dot reflects the most pressing flag (alerts surveyors fast).
  const residentTone = (r) => {
    const flags = r.flags || []
    if (flags.includes('Behavior plan') || flags.includes('Elopement risk') || flags.includes('Seizure')) return 'bad'
    if (r.allergies || flags.includes('Allergy') || flags.includes('Fall risk') || flags.includes('Diabetic')) return 'warn'
    return 'good'
  }

  const houseCount = new Set(residents.map(r => r.house_id)).size
  const filterLabel = houseFilter ? (houseByUuid[houseFilter]?.name || 'House') : 'All houses'

  const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '9px 12px', fontSize: 13.5, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* App bar */}
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 16px 4px' }}>
          <div>
            <h1 className="serif" style={{ fontSize: 26, letterSpacing: '-0.01em', margin: 0 }}>Care</h1>
            <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 2 }}>
              {/* When hard-scoped to one house (a DSP), name that house instead of
                  a cross-house count — they only ever see their assigned home. */}
              {scopeHouseId
                ? `${targetHouse?.name || 'Your house'} · ${residents.length} ${residents.length === 1 ? 'resident' : 'residents'} · ${today}`
                : `${houseCount} ${houseCount === 1 ? 'house' : 'houses'} · ${residents.length} ${residents.length === 1 ? 'resident' : 'residents'} · ${today}`}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* House picker — hidden when hard-scoped to one house (a DSP), who
                should only ever see their assigned home. */}
            {!scopeHouseId && houses.length > 1 && (
              <select
                value={houseFilter}
                onChange={e => setHouseFilter(e.target.value)}
                aria-label="Filter by house"
                style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', color: 'var(--a-ink2)', cursor: 'pointer' }}
              >
                <option value="">All houses</option>
                {houses.map(h => <option key={h._uuid || h.id} value={h._uuid}>{h.name}</option>)}
              </select>
            )}
            <button type="button" onClick={() => setShowSearch(s => !s)} aria-label="Search residents" style={{ background: 'transparent', border: 0, padding: 6, color: 'var(--a-ink2)', cursor: 'pointer' }}>
              <IconSearch size={19} />
            </button>
          </div>
        </header>

        {showSearch && (
          <div style={{ padding: '4px 16px 0' }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search residents or houses…" style={input} />
          </div>
        )}

        {/* Today's care priorities */}
        <SectionHeader
          label="Today's care priorities"
          right={<span style={{ fontSize: 11, fontWeight: 700, color: 'var(--a-clay)', background: '#fadcd7', padding: '2px 10px', borderRadius: 999 }}>{4} open</span>}
        />
        <div style={{ padding: '0 16px' }}>
          <PriorityCard tone="bad" Icon={IconFilter} title="Incident needs review" sub={targetHouse ? `Behavioral, moderate — open in ${targetHouse.name} Incidents` : 'Behavioral, moderate — open in the Incidents area'} meta="Today" onClick={targetHouse ? () => goToSection('compliance') : undefined} />
          <PriorityCard tone="warn" Icon={IconClock} title="Meds due this hour" sub="Check the eMAR for due passes" meta="Now" onClick={targetHouse ? () => goToSection('meds') : undefined} />
          <PriorityCard tone="warn" Icon={IconClipboard} title="Shift documentation incomplete" sub="Some residents not yet documented this shift" meta="Day shift" onClick={targetHouse ? () => goToSection('shift') : undefined} />
          <PriorityCard tone="info" Icon={IconActivity} title="Health checks due" sub="Weekly weight + vitals for scheduled residents" meta="Today" onClick={targetHouse ? () => goToSection('health') : undefined} />
        </div>

        {/* Module grid — clear entry points. Each tile routes into the target
            house's HouseDetail at the matching section. When the user spans more
            than one house and hasn't picked one, tapping prompts a house choice
            by opening the house filter. */}
        <SectionHeader label="Go to" right={!targetHouse && houses.length > 1 ? <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>Pick a house first</span> : null} />
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <ModTile Icon={IconClipboard} label="Meds" sub="eMAR" onClick={() => goToSection('meds')} />
            <ModTile Icon={IconChart} label="Goals" sub="ISP progress" onClick={() => goToSection('goals')} />
            <ModTile Icon={IconActivity} label="Health" sub="Vitals · logs" onClick={() => goToSection('health')} />
            <ModTile Icon={IconFilter} label="Incidents" sub="To review" count={1} onClick={() => goToSection('compliance')} />
            <ModTile Icon={IconHeart} label="Behavior" sub="Plans · ABC" onClick={() => goToSection('behavior')} />
            <ModTile Icon={IconBook} label="Notes" sub="Daily log" onClick={() => goToSection('log')} />
            <ModTile Icon={IconCart} label="Funds" sub="Ledger · spending" onClick={() => goToSection('funds')} />
          </div>
        </div>

        {/* Residents — cross-house list */}
        <SectionHeader label={houseFilter ? `Residents · ${filterLabel}` : 'Residents'} />
        <div style={{ margin: '0 16px 24px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Loading residents…</div>
          ) : visibleResidents.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>
              {residents.length === 0 ? 'No residents yet.' : 'No residents match your filter.'}
            </div>
          ) : visibleResidents.map((r, i) => {
            const h = resHouse(r)
            const c = h?.color || 'var(--a-sage)'
            const age = ageFromDob(r.dob)
            const sub = [h?.name, r.room && `Rm ${r.room}`, age != null && `${age} yrs`, statusLabel(r.status || 'active')].filter(Boolean).join(' · ')
            const tone = residentTone(r)
            const initials = (r.name || '?').split(' ').map(n => n[0]).slice(0, 2).join('')
            return (
              <button key={r.id || i} type="button" onClick={() => onOpenResident?.(r)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '11px 14px', background: 'transparent', cursor: 'pointer',
                border: 0, borderTop: i > 0 ? '1px solid var(--a-line)' : 0, fontFamily: 'Geist',
              }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: c, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--a-ink)' }}>{r.name}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--a-ink3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {h?.short && <span style={{ fontSize: 9.5, fontWeight: 700, color: c, letterSpacing: '0.06em', background: 'var(--a-paper)', padding: '2px 6px', borderRadius: 4 }}>{h.short}</span>}
                  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(tone) }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor('good') }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor() }} />
                  </span>
                  <IconChev size={16} color="var(--a-ink3)" />
                </span>
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
