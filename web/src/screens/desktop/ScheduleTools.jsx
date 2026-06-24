import { useState, useEffect, useRef } from 'react'
import {
  saveScheduleTemplate, fetchScheduleTemplates, deleteScheduleTemplate,
  applyShiftsToWeek, fetchShiftsWeek, publishShiftsWeek,
} from '../../lib/db'
import { summarizeWeek, fmtHrs } from '../../lib/scheduleSummary'
import { dBtnGhost } from './Desktop'

// Connecteam-style scheduling tools, layered on top of the existing week grid
// without touching its rendering: a per-day + weekly hours/shifts/staff summary,
// and an admin toolbar to copy last week or save/apply named week templates.

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d }

// Turn a set of screen shifts (for one displayed week) into template-shift
// objects keyed by their position (0-6) within that week, carrying the house
// slug so the pattern can be re-applied per house.
function shiftsToTemplate(shifts, weekDates) {
  return (shifts || []).map(s => ({
    dayIndex: weekDates.indexOf(s.date),
    startHour: s.start, endHour: s.end,
    role: s.role || 'DSP', personName: s.person || '', staffId: s.staffId || null,
    note: s.note || '', requiredCert: s.requiredCert || null, house: s.house,
  })).filter(t => t.dayIndex >= 0 && t.personName)
}

// Apply template-shifts (each carrying a `house` slug) to `weekDates`, grouped by
// house so each group inserts against the right house UUID. Returns total count.
async function applyTemplateShifts(orgId, weekDates, templateShifts, houses) {
  const byHouse = new Map()
  for (const t of (templateShifts || [])) {
    if (!byHouse.has(t.house)) byHouse.set(t.house, [])
    byHouse.get(t.house).push(t)
  }
  let total = 0
  for (const [slug, group] of byHouse) {
    // _uuid is the real house UUID (and equals the slug in demo mode).
    const houseId = houses.find(h => h.id === slug)?._uuid || slug
    const n = await applyShiftsToWeek(orgId, { houseId, weekDates, shifts: group })
    total += (Number(n) || 0)
  }
  return total
}

// ── Weekly summary (per-day hours + week totals) ─────────────────────────────
export function WeekSummary({ shifts, weekDates, houses = [] }) {
  const { perDay, total } = summarizeWeek(shifts, weekDates)
  const cell = { textAlign: 'center', padding: '8px 0', borderLeft: '1px solid var(--a-line)' }
  const houseCount = houses.length
  const openTotal = (shifts || []).filter(s => s.status === 'open').length
  // Per-day coverage: distinct houses with at least one NON-open shift that day.
  const coveredOn = (date) => {
    const set = new Set()
    for (const s of (shifts || [])) {
      if (s.date === date && s.status !== 'open') set.add(s.house)
    }
    return set.size
  }
  const openOn = (date) => (shifts || []).filter(s => s.date === date && s.status === 'open').length
  return (
    <div style={{ marginTop: 12, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)' }}>
        <div style={{ padding: '8px 14px', fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          Hours / day
        </div>
        {(perDay || []).map((d, i) => {
          const covered = coveredOn(d.date)
          const open = openOn(d.date)
          return (
            <div key={i} style={cell}>
              <div style={{ fontSize: 14, fontWeight: 700, color: d.hours > 0 ? 'var(--a-ink)' : 'var(--a-ink3)', fontVariantNumeric: 'tabular-nums' }}>{fmtHrs(d.hours)}</div>
              <div style={{ fontSize: 9.5, color: 'var(--a-ink3)', marginTop: 1 }}>{d.count} shift{d.count === 1 ? '' : 's'}</div>
              {houseCount > 0 && (
                <div style={{ fontSize: 9.5, marginTop: 1, color: open > 0 ? 'var(--a-clay)' : 'var(--a-ink3)', fontVariantNumeric: 'tabular-nums' }}>
                  {covered}/{houseCount} covered{open > 0 ? ` · ${open} open` : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 22, padding: '10px 16px', borderTop: '1px solid var(--a-line)', background: 'var(--a-paper)', fontSize: 12 }}>
        <span style={{ color: 'var(--a-ink2)' }}>Week total: <strong style={{ color: 'var(--a-ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtHrs(total.hours)} hrs</strong></span>
        <span style={{ color: 'var(--a-ink2)' }}><strong style={{ color: 'var(--a-ink)' }}>{total.shifts}</strong> shifts</span>
        <span style={{ color: 'var(--a-ink2)' }}><strong style={{ color: 'var(--a-ink)' }}>{total.staff}</strong> staff scheduled</span>
        <span style={{ color: openTotal > 0 ? 'var(--a-clay)' : 'var(--a-ink2)', fontWeight: openTotal > 0 ? 700 : 400 }}><strong style={{ color: openTotal > 0 ? 'var(--a-clay)' : 'var(--a-ink)' }}>{openTotal}</strong> open</span>
      </div>
    </div>
  )
}

// ── Admin toolbar: copy last week, save/apply/delete templates ───────────────
export function ScheduleWeekTools({ user, houses, weekDates, shifts, onChanged }) {
  const orgId = user?.orgId
  const isManager = user?.role === 'manager'
  const houseScope = isManager ? (user?.houseId || null) : null
  const [busy, setBusy] = useState('')
  const [menu, setMenu] = useState(false)
  const [templates, setTemplates] = useState([])
  const [toast, setToast] = useState('')
  const menuRef = useRef(null)

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600) }

  const loadTemplates = () => Promise.resolve(fetchScheduleTemplates(orgId, { houseId: houseScope }))
    .then(rows => setTemplates(rows || [])).catch(() => setTemplates([]))

  useEffect(() => {
    if (!menu) return
    loadTemplates()
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menu]) // eslint-disable-line react-hooks/exhaustive-deps

  const copyLastWeek = async () => {
    if (!orgId || busy) return
    setBusy('copy')
    try {
      const prevDates = weekDates.map(ds => toDateStr(addDays(new Date(ds + 'T12:00:00'), -7)))
      const prev = await fetchShiftsWeek(orgId, houseScope, prevDates[0], prevDates[6]).catch(() => [])
      const tmpl = shiftsToTemplate(prev || [], prevDates)
      if (!tmpl.length) { flash('Last week had no shifts to copy.'); setBusy(''); return }
      const n = await applyTemplateShifts(orgId, weekDates, tmpl, houses)
      flash(`Copied ${n} shift${n === 1 ? '' : 's'} from last week.`)
      onChanged?.()
    } catch { flash('Could not copy last week.') }
    setBusy('')
  }

  const saveTemplate = async () => {
    if (!orgId || busy) return
    const tmpl = shiftsToTemplate(shifts, weekDates)
    if (!tmpl.length) { flash('This week has no shifts to save.'); return }
    const name = (window.prompt('Name this week template:', 'Standard week') || '').trim()
    if (!name) return
    setBusy('save')
    try {
      await saveScheduleTemplate(orgId, { houseId: houseScope, name, shifts: tmpl, createdByName: user?.name || null })
      flash(`Saved template “${name}”.`)
    } catch { flash('Could not save template.') }
    setBusy('')
  }

  const applyTemplate = async (t) => {
    if (busy) return
    setBusy('apply')
    try {
      const n = await applyTemplateShifts(orgId, weekDates, t.shifts || [], houses)
      flash(`Applied “${t.name}” — ${n} shift${n === 1 ? '' : 's'}.`)
      setMenu(false)
      onChanged?.()
    } catch { flash('Could not apply template.') }
    setBusy('')
  }

  const removeTemplate = async (t) => {
    if (!window.confirm(`Delete template “${t.name}”?`)) return
    try { await deleteScheduleTemplate(t.id) } catch { /* ignore */ }
    loadTemplates()
  }

  // Draft/Published: the week is "Published" once every non-open shift carries a
  // published_at; any unpublished non-open shift makes it a Draft.
  const nonOpen = (shifts || []).filter(s => s.status !== 'open')
  const allPublished = nonOpen.length > 0 && nonOpen.every(s => s.publishedAt)
  const publishWeek = async () => {
    if (!orgId || busy || !nonOpen.length) return
    setBusy('publish')
    try {
      const n = await publishShiftsWeek(orgId, { houseId: houseScope, weekStart: weekDates[0], weekEnd: weekDates[6] })
      flash(`Published ${n} shift${n === 1 ? '' : 's'}.`)
      onChanged?.()
    } catch { flash('Could not publish the week.') }
    setBusy('')
  }

  const btn = { ...dBtnGhost, padding: '7px 12px', fontSize: 12 }
  const pill = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, border: '1px solid' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
      {toast && (
        <span style={{ fontSize: 11.5, color: 'var(--a-sage)', fontWeight: 600, marginRight: 4 }}>{toast}</span>
      )}
      {nonOpen.length > 0 && (
        allPublished
          ? <span style={{ ...pill, color: 'var(--a-sage)', borderColor: 'var(--a-sage)', background: 'rgba(74,107,86,0.08)' }}>Published ✓</span>
          : <span style={{ ...pill, color: 'var(--a-clay)', borderColor: '#e3b6ad', background: 'rgba(176,92,60,0.08)' }}>Draft</span>
      )}
      <button onClick={publishWeek} disabled={!!busy || !nonOpen.length || allPublished} style={btn}>{busy === 'publish' ? 'Publishing…' : 'Publish week'}</button>
      <button onClick={copyLastWeek} disabled={!!busy} style={btn}>{busy === 'copy' ? 'Copying…' : 'Copy last week'}</button>
      <button onClick={saveTemplate} disabled={!!busy} style={btn}>{busy === 'save' ? 'Saving…' : 'Save as template'}</button>
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button onClick={() => setMenu(m => !m)} disabled={!!busy} style={btn}>Templates ▾</button>
        {menu && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, width: 260, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.14)', padding: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, padding: '6px 10px 4px' }}>Apply a template</div>
            {(templates || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--a-ink3)', padding: '8px 10px', lineHeight: 1.4 }}>No templates yet. Build a week, then “Save as template”.</div>
            )}
            {(templates || []).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px 4px 10px', borderRadius: 8 }}>
                <button onClick={() => applyTemplate(t)} disabled={!!busy} style={{ flex: 1, textAlign: 'left', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'Geist', padding: '6px 0' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{t.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{(t.shifts || []).length} shift{(t.shifts || []).length === 1 ? '' : 's'}{t.created_by_name ? ` · ${t.created_by_name}` : ''}</div>
                </button>
                <button onClick={() => removeTemplate(t)} title="Delete template" style={{ border: 0, background: 'transparent', color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 15, padding: '4px 8px', borderRadius: 6 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
