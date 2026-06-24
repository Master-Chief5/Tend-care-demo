import { useEffect, useMemo, useState } from 'react'
import { IconChev, IconHeart } from '../components/icons'
import { fetchIncidents } from '../lib/db'
import { MedPass } from '../components/MedPass'
import { Goals } from '../components/Goals'
import { Behavior } from '../components/Behavior'
import { HealthLogs } from '../components/HealthLogs'
import { ProgressPanel } from '../components/ProgressPanel'
import { DailyLog } from '../components/DailyLog'
import { FamilyDigest } from '../components/FamilyDigest'

// ── Resident profile (resident-scoped) ───────────────────────────────────────
// A single resident's profile: identity header, key info, and "Care areas" that
// surface that resident's meds / goals / health / behavior / notes by REUSING
// the exact same care panels the house detail uses — each panel is simply
// scoped to one house + one resident (houseUuid + residents=[resident]), so the
// panels self-filter to this resident and no logic is duplicated. Mirrors the
// approved mockup mockups/redesign-phase0/03-care-hub.html (Frame 2). Hearth
// styling, per-house accent via the resident's house color, no emoji.

const RESIDENT_STATUS = {
  active:   'Home',
  appt:     'At appointment',
  program:  'Day program',
  hospital: 'Hospital',
  away:     'Away / visit',
}
const statusLabel = (s) => RESIDENT_STATUS[s] || RESIDENT_STATUS.active

function ageFromDob(dob) {
  if (!dob) return null
  const d = new Date(dob); if (isNaN(d)) return null
  const t = new Date(); let a = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--
  return a >= 0 && a < 130 ? a : null
}

// Care areas surfaced as rows; selecting one drops into the reused panel below.
const CARE_AREAS = [
  { id: 'meds',     title: 'Meds · eMAR',     sub: 'Scheduled + PRN passes' },
  { id: 'goals',    title: 'Goals · ISP',     sub: 'Active goals + progress logging' },
  { id: 'health',   title: 'Health',          sub: 'Vitals, sleep, meals, seizures' },
  { id: 'behavior', title: 'Behavior',        sub: 'Behavior plan + ABC incidents' },
  { id: 'progress', title: 'Progress',        sub: 'Trends across this resident’s logs' },
  { id: 'incidents', title: 'Incidents',      sub: 'Filed incidents for this resident' },
  { id: 'notes',    title: 'Notes · daily log', sub: 'Shift notes for this resident' },
]

// Incident severity → badge tone, matching the Hearth status palette used for
// flags/reports elsewhere (clay for severe, honey for the rest).
function severityTone(severity) {
  const bad = /severe|major|critical/i.test(severity || '')
  return bad
    ? { bg: '#fadcd7', fg: '#a93a25' }
    : { bg: '#f5e9d6', fg: '#a47012' }
}

// Format an incident's date for display (prefers the explicit date, falls back
// to the created-at timestamp).
function incidentDate(inc) {
  const raw = inc.date || inc.at || inc.occurred_at
  if (!raw) return null
  const d = new Date(raw); if (isNaN(d)) return String(raw)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// A flag pill — clay for alerting flags, honey for cautions, sage otherwise.
function flagTone(flag) {
  const bad = ['Behavior plan', 'Elopement risk', 'Seizure', '1:1 support']
  const warn = ['Allergy', 'Fall risk', 'Diabetic', 'Diet']
  if (bad.includes(flag)) return { bg: '#fadcd7', fg: '#a93a25' }
  if (warn.includes(flag)) return { bg: '#f5e9d6', fg: '#a47012' }
  return { bg: 'var(--a-paper)', fg: 'var(--a-ink2)' }
}

function KeyInfoRow({ label, value, alert }) {
  if (!value) return null
  return (
    <>
      <dt style={{ color: 'var(--a-ink3)' }}>{label}</dt>
      <dd style={{ margin: 0, color: alert ? '#a93a25' : 'var(--a-ink2)', fontWeight: alert ? 600 : 500 }}>{value}</dd>
    </>
  )
}

export function ResidentProfile({ user, resident, houses = [], onBack }) {
  const [area, setArea] = useState('overview')
  const [familyDigest, setFamilyDigest] = useState(false)
  const [incidents, setIncidents] = useState(null)   // null = not loaded yet

  // Read-only incident history for THIS resident. Fetch the house's incidents
  // (reusing the same loader the Compliance flow uses) and filter to this
  // resident; filing lives in the house Compliance flow, not here. Lazy-loaded
  // the first time the Incidents area is opened.
  useEffect(() => {
    if (area !== 'incidents' || !resident || incidents !== null) return
    let alive = true
    Promise.resolve(fetchIncidents(user?.orgId, resident.house_id))
      .then(rows => {
        if (!alive) return
        // Match on resident_id; in the Supabase backend the mapped row carries
        // the joined resident name rather than the id, so fall back to that.
        const mine = (rows || []).filter(i =>
          i.resident_id === resident.id ||
          (i.resident && resident.name && i.resident === resident.name))
        // Newest-first by recorded date / created timestamp.
        mine.sort((a, b) => new Date(b.at || b.date || 0) - new Date(a.at || a.date || 0))
        setIncidents(mine)
      })
      .catch(() => { if (alive) setIncidents([]) })
    return () => { alive = false }
  }, [area, resident, incidents, user])

  // Resolve this resident's house for the accent color + badge. Residents carry
  // house_id (= house._uuid); fall back to the joined `houses` row (Supabase).
  const house = useMemo(() => {
    if (!resident) return null
    return houses.find(h => h._uuid === resident.house_id)
      || (resident.houses ? { name: resident.houses.name, short: (resident.houses.slug || resident.houses.name || '').slice(0, 3).toUpperCase(), color: resident.houses.color } : null)
  }, [resident, houses])

  if (!resident) return (
    <div className="phone-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--a-ink3)' }}>Resident not found.</div>
      <button onClick={onBack} style={{ background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 999, padding: '8px 20px', fontSize: 13, fontFamily: 'Geist', cursor: 'pointer', color: 'var(--a-ink2)' }}>← Back to Care</button>
    </div>
  )

  const c = house?.color || 'var(--a-sage)'
  const houseUuid = resident.house_id
  const scoped = [resident]   // single-resident scope for every reused panel
  const age = ageFromDob(resident.dob)
  const flags = resident.flags || []
  const initials = (resident.name || '?').split(' ').map(n => n[0]).slice(0, 2).join('')
  const idLine = [house?.name, resident.room && `Rm ${resident.room}`, age != null && `Age ${age}`, statusLabel(resident.status || 'active')].filter(Boolean).join(' · ')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'meds', label: 'Meds' },
    { id: 'goals', label: 'Goals' },
    { id: 'health', label: 'Health' },
    { id: 'behavior', label: 'Behavior' },
    { id: 'progress', label: 'Progress' },
    { id: 'incidents', label: 'Incidents' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 4, background: c, flexShrink: 0 }} />

        {/* Back bar */}
        <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, padding: 4, color: 'var(--a-ink2)', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconChev size={18} sw={2} style={{ transform: 'rotate(180deg)' }} /> Care
          </button>
          <button onClick={() => setFamilyDigest(true)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${c}66`, borderRadius: 999, padding: '5px 13px', color: c, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconHeart size={13} color={c} /> Family update
          </button>
        </div>

        {/* Identity header */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 16px 14px', flexShrink: 0 }}>
          <span style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: c, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, fontFamily: 'Newsreader, serif' }}>{initials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="serif" style={{ fontSize: 24, letterSpacing: '-0.01em', margin: 0 }}>{resident.name}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {house?.short && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', background: c, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 4 }}>{house.short}</span>}
              <span>{idLine}</span>
            </div>
            {(flags.length > 0 || resident.allergies) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {resident.allergies && <span style={{ fontSize: 11, fontWeight: 700, color: '#a93a25', background: '#fadcd7', padding: '3px 9px', borderRadius: 999 }}>Allergy: {resident.allergies}</span>}
                {flags.map(f => {
                  const t = flagTone(f)
                  return <span key={f} style={{ fontSize: 11, fontWeight: 700, color: t.fg, background: t.bg, padding: '3px 9px', borderRadius: 999 }}>{f}</span>
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section tabs (resident-scoped) */}
        <div style={{ borderBottom: '1px solid var(--a-line)', padding: '0 16px 10px', display: 'flex', gap: 6, flexShrink: 0, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setArea(t.id)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', background: area === t.id ? 'var(--a-ink)' : 'transparent', color: area === t.id ? 'var(--a-card)' : 'var(--a-ink2)', border: area === t.id ? 0 : '1px solid var(--a-line)' }}>{t.label}</button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px 28px' }}>
          {area === 'overview' && (<>
            {/* Key info */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>Key info</div>
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 18 }}>
              <dl style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '7px 12px', fontSize: 13, margin: 0 }}>
                <KeyInfoRow label="Allergies" value={resident.allergies} alert />
                <KeyInfoRow label="Diagnoses" value={resident.diagnoses} />
                <KeyInfoRow label="Diet" value={resident.diet} />
                <KeyInfoRow label="Guardian" value={resident.guardian} />
                <KeyInfoRow label="Physician" value={resident.physician} />
                {!(resident.allergies || resident.diagnoses || resident.diet || resident.guardian || resident.physician) && (
                  <dd style={{ gridColumn: '1 / -1', margin: 0, color: 'var(--a-ink3)' }}>No clinical info recorded yet.</dd>
                )}
              </dl>
              {resident.notes && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--a-line)' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.45 }}>{resident.notes}</div>
                </div>
              )}
            </div>

            {/* Care areas — entry points into the reused panels */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>Care areas</div>
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
              {CARE_AREAS.map((a, i) => (
                <button key={a.id} type="button" onClick={() => setArea(a.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                  padding: '13px 16px', background: 'transparent', cursor: 'pointer',
                  border: 0, borderTop: i > 0 ? '1px solid var(--a-line)' : 0, fontFamily: 'Geist',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--a-ink)' }}>{a.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--a-ink3)', marginTop: 2 }}>{a.sub}</span>
                  </span>
                  <IconChev size={16} color="var(--a-ink3)" />
                </button>
              ))}
            </div>

            {/* Family update — a shareable, redacted digest for the resident's
                guardian/family (opens a print/share report, not a care tab). */}
            <button type="button" onClick={() => setFamilyDigest(true)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
              marginTop: 12, padding: '13px 15px', cursor: 'pointer', fontFamily: 'Geist',
              background: `${c}12`, border: `1px solid ${c}55`, borderRadius: 14,
            }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconHeart size={17} color="#fff" /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--a-ink)' }}>Family update</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--a-ink3)', marginTop: 2 }}>
                  {resident.guardian ? `Shareable digest for ${resident.guardian.split(/[·,|]/)[0].trim()}` : 'Shareable progress digest for family'}
                </span>
              </span>
              <IconChev size={16} color="var(--a-ink3)" />
            </button>
          </>)}

          {/* Reused care panels — each scoped to this single resident's house +
              this resident, so they self-filter without rebuilding any logic. */}
          {area === 'meds' && <MedPass user={user} houseUuid={houseUuid} houseColor={c} residents={scoped} />}
          {area === 'goals' && <Goals user={user} houseUuid={houseUuid} houseColor={c} residents={scoped} />}
          {area === 'health' && <HealthLogs user={user} houseUuid={houseUuid} houseColor={c} residents={scoped} />}
          {area === 'behavior' && <Behavior user={user} houseUuid={houseUuid} houseColor={c} residents={scoped} />}
          {area === 'progress' && <ProgressPanel user={user} houseUuid={houseUuid} houseColor={c} residents={scoped} />}

          {/* Incidents — read-only history of filed incidents for THIS resident,
              newest-first. Filing happens in the house Compliance flow. */}
          {area === 'incidents' && (
            incidents === null ? (
              <div style={{ fontSize: 13, color: 'var(--a-ink3)', padding: '8px 2px' }}>Loading incidents…</div>
            ) : incidents.length === 0 ? (
              <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--a-ink2)', fontWeight: 600 }}>No incidents on file</div>
                <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 4, lineHeight: 1.45 }}>
                  Nothing has been filed for {resident.name?.split(' ')[0] || 'this resident'}. Incidents are filed from the house Compliance flow.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {incidents.map(inc => {
                  const t = severityTone(inc.severity)
                  const reviewed = inc.status === 'reviewed'
                  const d = incidentDate(inc)
                  return (
                    <div key={inc.id} style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '13px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--a-ink)' }}>{inc.type || 'Incident'}</span>
                        {inc.severity && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: t.fg, background: t.bg, padding: '3px 9px', borderRadius: 999 }}>{inc.severity}</span>
                        )}
                        <span style={{
                          marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                          color: reviewed ? '#3f7d52' : 'var(--a-ink2)',
                          background: reviewed ? '#dceadf' : 'var(--a-paper)',
                        }}>{reviewed ? 'Reviewed' : 'Open'}</span>
                      </div>
                      {d && <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 3 }}>{d}{inc.by ? ` · ${inc.by}` : ''}</div>}
                      {inc.text && <div style={{ fontSize: 13, color: 'var(--a-ink2)', lineHeight: 1.45, marginTop: 7 }}>{inc.text}</div>}
                    </div>
                  )
                })}
              </div>
            )
          )}

          {area === 'notes' && <DailyLog user={user} houseUuid={houseUuid} houseColor={c} residents={scoped} />}
        </div>
      </div>

      {familyDigest && (
        <FamilyDigest user={user} resident={resident} house={house} onClose={() => setFamilyDigest(false)} />
      )}
    </div>
  )
}
