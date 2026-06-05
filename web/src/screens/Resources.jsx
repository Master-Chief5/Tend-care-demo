import { useState, useEffect } from 'react'
import { fetchResources, addResource, deleteResource, fetchHouses, fetchSupplyBudget, setSupplyBudget } from '../lib/db'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { IconPlus, IconChev, IconFlag, IconArrow, IconUp, IconDown } from '../components/icons'
import { COMMON_SUPPLIES } from '../data/suggestions'
import { SuggestInput } from '../components/SuggestInput'

function BigStat({ label, value, sub, tone }) {
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 4, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11, color: tone === 'good' ? '#3f7050' : tone === 'bad' ? '#a93a25' : 'var(--a-ink3)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '12px 0 8px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--a-ink2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--a-ink3)' }}>{sub}</div>}
    </div>
  )
}

export function HouseBar({ house, value, pct, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: last ? '' : '1px dashed var(--a-line)' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: house.color, letterSpacing: '0.06em', width: 40 }}>{house.short}</span>
      <div style={{ flex: 1, height: 8, background: 'var(--a-paper)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: house.color, borderRadius: 999 }} />
      </div>
      <span className="tnum" style={{ fontSize: 12, fontWeight: 500, width: 56, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export function TopItem({ rank, name, qty, trend, last }) {
  const trendIco = trend === 'up'
    ? <IconUp size={12} sw={2.4} color="#a93a25" />
    : trend === 'down'
    ? <IconDown size={12} sw={2.4} color="#3f7050" />
    : <span style={{ fontSize: 14, color: 'var(--a-ink3)' }}>—</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: last ? '' : '1px dashed var(--a-line)' }}>
      <span style={{ fontSize: 11, color: 'var(--a-ink3)', width: 14, fontWeight: 600 }}>{rank}</span>
      <span style={{ fontSize: 13.5, color: 'var(--a-ink)', flex: 1, fontWeight: 500 }}>{name}</span>
      <span className="tnum" style={{ fontSize: 12, color: 'var(--a-ink2)' }}>{qty}</span>
      <div style={{ width: 16, display: 'flex', justifyContent: 'center' }}>{trendIco}</div>
    </div>
  )
}

export function SwapRow({ from, to, item, note }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: from.color, letterSpacing: '0.06em' }}>{from.short}</span>
        <IconArrow size={12} sw={2} color="var(--a-ink3)" />
        <span style={{ fontSize: 10, fontWeight: 700, color: to.color, letterSpacing: '0.06em' }}>{to.short}</span>
        <span style={{ fontSize: 13, color: 'var(--a-ink)', fontWeight: 500 }}>{item}</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>{note}</div>
    </div>
  )
}

// Compact, dependency-free overview rendered above the supplies list.
// Shows a summary row (item count + total estimated cost) and a horizontal
// SVG bar chart grouped by house. Charts estimated spend per house when cost
// data exists; otherwise falls back to item count per house.
function SuppliesOverview({ items }) {
  // ── Summary row figures ──────────────────────────────────────────────────
  const totalCost = items.reduce((sum, it) => {
    const c = Number(it?.cost)
    return sum + (Number.isFinite(c) ? c : 0)
  }, 0)
  const itemsWithCost = items.filter(it => Number.isFinite(Number(it?.cost)) && Number(it.cost) > 0).length

  const fmtMoney = (n) =>
    `$${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // ── Group by house ───────────────────────────────────────────────────────
  // If at least a third of items carry a cost, chart spend; else chart counts.
  const useSpend = itemsWithCost > 0 && itemsWithCost >= Math.ceil(items.length / 3)

  const byHouse = {}
  for (const it of items) {
    const h = it?.houses
    const key = it?.house_id || '__none__'
    if (!byHouse[key]) {
      byHouse[key] = {
        name:  h?.name || 'Unassigned',
        color: h?.color || 'var(--a-sage)',
        spend: 0,
        count: 0,
      }
    }
    const c = Number(it?.cost)
    byHouse[key].spend += Number.isFinite(c) ? c : 0
    byHouse[key].count += 1
  }

  const rows = Object.values(byHouse)
    .map(r => ({ ...r, value: useSpend ? r.spend : r.count }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)

  const maxValue = rows.reduce((m, r) => Math.max(m, r.value), 0)
  const fmtVal = (v) => (useSpend ? fmtMoney(v) : `${v}`)

  // ── SVG bar chart geometry (viewBox units; scales fluidly to container) ───
  const W = 300
  const labelW = 86       // left gutter for house name
  const valueW = 64       // right gutter for value
  const barH = 12
  const gap = 12
  const barAreaW = W - labelW - valueW
  const H = rows.length > 0 ? rows.length * (barH + gap) - gap : 0

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
      {/* Summary row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: rows.length ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Items</div>
          <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 2, letterSpacing: '-0.02em' }}>{items.length}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Est. cost</div>
          <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 2, letterSpacing: '-0.02em' }}>{fmtMoney(totalCost)}</div>
        </div>
      </div>

      {/* Bar chart */}
      {rows.length > 0 && (
        <>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--a-ink2)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            {useSpend ? 'Estimated spend by house' : 'Items by house'}
          </div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }} preserveAspectRatio="xMidYMid meet" role="img"
            aria-label={useSpend ? 'Estimated spend by house' : 'Item count by house'}>
            {rows.map((r, i) => {
              const y = i * (barH + gap)
              const w = maxValue ? (r.value / maxValue) * barAreaW : 0
              return (
                <g key={i}>
                  {/* House label */}
                  <text x={0} y={y + barH - 1} fontSize="10" fontFamily="Geist" fontWeight="600" fill="var(--a-ink2)">
                    {r.name.length > 12 ? r.name.slice(0, 11) + '…' : r.name}
                  </text>
                  {/* Track */}
                  <rect x={labelW} y={y} width={barAreaW} height={barH} rx={barH / 2} fill="var(--a-paper)" />
                  {/* Value bar */}
                  <rect x={labelW} y={y} width={Math.max(w, 0)} height={barH} rx={barH / 2} fill={r.color} />
                  {/* Value label */}
                  <text x={W} y={y + barH - 1} fontSize="10.5" fontFamily="Geist" fontWeight="500" fill="var(--a-ink)" textAnchor="end">
                    {fmtVal(r.value)}
                  </text>
                </g>
              )
            })}
          </svg>
        </>
      )}
    </div>
  )
}

const inThisMonth = (iso) => {
  if (!iso) return false
  const d = new Date(iso), n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}
const MONTHS_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// "Spent this month" trend: total spend for the current month + a weekly bar
// chart, built from each item's cost and purchase date (created_at).
const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const money = (n) => `$${(Number.isFinite(n) ? n : 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

// Build a spend time-series for the chosen range from items' cost + purchase date.
function buildSeries(range, items) {
  const now = new Date()
  const costed = items.filter(it => Number(it?.cost) > 0 && it.created_at).map(it => ({ d: new Date(it.created_at), c: Number(it.cost) }))
  const out = []
  const add = (label, match) => out.push({ label, value: costed.filter(x => match(x.d)).reduce((s, x) => s + x.c, 0) })
  const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  if (range === 'day') {
    for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); add(`${d.getMonth() + 1}/${d.getDate()}`, x => x.toDateString() === d.toDateString()) }
  } else if (range === 'year') {
    const yrs = costed.map(x => x.d.getFullYear())
    let y0 = Math.min(now.getFullYear(), ...(yrs.length ? yrs : [now.getFullYear()])); if (now.getFullYear() - y0 > 9) y0 = now.getFullYear() - 9
    for (let y = y0; y <= now.getFullYear(); y++) add(String(y), x => x.getFullYear() === y)
  } else if (range === 'max') {
    if (!costed.length) return { series: [], total: 0 }
    const earliest = costed.reduce((m, x) => x.d < m ? x.d : m, costed[0].d)
    const months = (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth())
    if (months <= 24) { for (let i = months; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); add(MONTHS_S[d.getMonth()], x => sameMonth(x, d)) } }
    else { for (let y = earliest.getFullYear(); y <= now.getFullYear(); y++) add(String(y), x => x.getFullYear() === y) }
  } else { // month — last 12 months
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); add(MONTHS_S[d.getMonth()], x => sameMonth(x, d)) }
  }
  return { series: out, total: out.reduce((s, b) => s + b.value, 0) }
}

const RANGE_OPTS = [['day', 'Day'], ['month', 'Month'], ['year', 'Year'], ['max', 'Max']]

// Spend over time, with a Day/Month/Year/Max selector and a line/bar toggle.
function SpendGraph({ items }) {
  const [range, setRange] = useState('month')
  const [kind, setKind] = useState('line')
  const { series, total } = buildSeries(range, items)
  const nonZero = series.filter(b => b.value > 0).length
  // A line needs at least two points to be a trend; a single point shows as a bar.
  const enough = kind === 'bar' ? nonZero >= 1 : nonZero >= 2
  const maxV = Math.max(...series.map(b => b.value), 1)
  const n = series.length
  const W = 320, H = 96, padL = 8, padR = 8, top = 10, bot = 18
  const xAt = (i) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i / (n - 1)) * (W - padL - padR))
  const yAt = (v) => H - bot - (v / maxV) * (H - top - bot)
  const linePts = series.map((b, i) => `${xAt(i).toFixed(1)},${yAt(b.value).toFixed(1)}`).join(' ')
  const labelEvery = Math.max(1, Math.ceil(n / 6))

  const chip = (active) => ({ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', border: 0, background: active ? 'var(--a-ink)' : 'transparent', color: active ? 'var(--a-card)' : 'var(--a-ink2)' })

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Spend</div>
          <div className="serif tnum" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}>{money(total)}</div>
        </div>
        <button onClick={() => setKind(k => k === 'line' ? 'bar' : 'line')} style={{ background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'Geist', color: 'var(--a-ink2)', cursor: 'pointer' }}>
          {kind === 'line' ? '◔ Bars' : '∿ Line'}
        </button>
      </div>

      {/* Range selector */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 9, padding: 3, marginBottom: 12 }}>
        {RANGE_OPTS.map(([id, label]) => <button key={id} onClick={() => setRange(id)} style={chip(range === id)}>{label}</button>)}
      </div>

      {!enough ? (
        <div style={{ padding: '22px 8px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)', lineHeight: 1.5 }}>
          Not enough data yet for this view.<br />Log a few purchases with costs to see the trend.
        </div>
      ) : kind === 'line' ? (
        <>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }} preserveAspectRatio="none">
            <polygon points={`${padL},${H - bot} ${linePts} ${W - padR},${H - bot}`} fill="var(--a-sage)" fillOpacity="0.12" />
            <polyline points={linePts} fill="none" stroke="var(--a-sage)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {series.map((b, i) => b.value > 0 && <circle key={i} cx={xAt(i)} cy={yAt(b.value)} r="2.5" fill="var(--a-sage)" />)}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {series.map((b, i) => <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8.5, color: 'var(--a-ink3)' }}>{i % labelEvery === 0 ? b.label : ''}</span>)}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 84 }}>
          {series.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
              <div style={{ width: '100%', height: 60, display: 'flex', alignItems: 'flex-end' }}>
                <div title={money(b.value)} style={{ width: '100%', height: `${Math.max((b.value / maxV) * 100, b.value > 0 ? 4 : 0)}%`, background: i === n - 1 ? 'var(--a-sage)' : 'var(--a-sage-dim)', borderRadius: '3px 3px 0 0', minHeight: b.value > 0 ? 3 : 0 }} />
              </div>
              <span style={{ fontSize: 8.5, color: 'var(--a-ink3)', whiteSpace: 'nowrap' }}>{i % labelEvery === 0 ? b.label : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddItemModal({ user, houses, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('units')
  const [cost, setCost] = useState('')
  const [houseId, setHouseId] = useState(user?.houseId || '')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !user?.orgId) return
    setSaving(true)
    const item = await addResource(user.orgId, houseId || null, {
      name: name.trim(),
      qty: parseFloat(qty) || 1,
      unit: unit || 'units',
      cost: cost ? parseFloat(cost) : null,
    })
    setSaving(false)
    if (item) onAdded(item)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: 'var(--a-bg)', borderRadius: '20px 20px 0 0', padding: '20px 22px 36px' }}>
        <div className="serif" style={{ fontSize: 22, marginBottom: 16 }}>Add item</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SuggestInput
            autoFocus options={COMMON_SUPPLIES} placeholder="Item name (e.g. Paper towels)" value={name} onChange={setName}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input placeholder="Qty (e.g. 2)" value={qty} onChange={e => setQty(e.target.value)}
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
            <input placeholder="Unit (e.g. boxes)" value={unit} onChange={e => setUnit(e.target.value)}
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          </div>
          <input placeholder="Cost (optional, e.g. 12.99)" value={cost} onChange={e => setCost(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          {houses.length > 0 && (
            <select value={houseId} onChange={e => setHouseId(e.target.value)}
              style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }}>
              <option value="">All houses</option>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <button type="submit" disabled={!name.trim() || saving}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5 }}>
            {saving ? 'Saving…' : 'Add item'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Monthly supply budget vs this-month spend. Supervisors can set/edit it.
function BudgetCard({ user, items, budget, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(budget != null ? String(budget) : '')
  const [saving, setSaving] = useState(false)
  const isSup = user?.role === 'supervisor'
  const spent = items.filter(it => Number(it?.cost) > 0 && inThisMonth(it.created_at)).reduce((s, it) => s + Number(it.cost), 0)
  const has = budget != null && budget > 0
  const pct = has ? Math.min(spent / budget, 1) : 0
  const over = has && spent > budget
  const save = async () => { setSaving(true); const amt = parseFloat(val) || 0; await setSupplyBudget(user.orgId, amt); setSaving(false); setEditing(false); onSaved(amt) }

  if (!has && !isSup) return null
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Supplies budget · {MONTHS_F[new Date().getMonth()]}</div>
        {isSup && !editing && <button onClick={() => { setVal(budget != null ? String(budget) : ''); setEditing(true) }} style={{ background: 'transparent', border: 0, color: 'var(--a-sage)', fontSize: 12, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>{has ? 'Edit' : 'Set budget'}</button>}
      </div>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 16, color: 'var(--a-ink2)' }}>$</span>
          <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)} placeholder="e.g. 500" style={{ flex: 1, background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '9px 12px', fontSize: 15, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          <button onClick={save} disabled={saving} style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer' }}>{saving ? '…' : 'Save'}</button>
        </div>
      ) : has ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span className="serif tnum" style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', color: over ? '#a93a25' : 'var(--a-ink)' }}>{money(spent)}</span>
            <span style={{ fontSize: 13, color: 'var(--a-ink3)' }}>/ {money(budget)}</span>
          </div>
          <div style={{ height: 8, background: 'var(--a-paper)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: over ? '#c0392b' : pct > 0.8 ? 'var(--a-honey)' : 'var(--a-sage)', borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 11, color: over ? '#a93a25' : 'var(--a-ink3)', fontWeight: over ? 600 : 400, marginTop: 6 }}>
            {over ? `Over budget by ${money(spent - budget)}` : `${money(budget - spent)} left this month`}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 8 }}>No budget set. Tap “Set budget” to track spend against a monthly limit.</div>
      )}
    </div>
  )
}

export function ScreenA_Resources({ user }) {
  const [items, setItems] = useState([])
  const [houses, setHouses] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [budget, setBudget] = useState(null)
  const [toast, showToast] = useToast()

  const isSupervisor = user?.role === 'supervisor'

  useEffect(() => {
    if (!user?.orgId) return
    setLoading(true)
    fetchSupplyBudget(user.orgId).then(setBudget)
    fetchResources(user.orgId, user.houseId || null).then(data => {
      setItems(data)
      setLoading(false)
    })
    // Only supervisors choose which house an item belongs to; managers/staff are
    // locked to their own house (no picker).
    if (isSupervisor) {
      fetchHouses(user.orgId).then(setHouses)
    } else {
      setHouses([])
    }
  }, [user?.orgId, user?.houseId, isSupervisor])

  const handleAdded = (item) => {
    setItems(prev => [item, ...prev])
    setShowAdd(false)
    showToast('Item added')
  }

  const handleDelete = async (id) => {
    await deleteResource(id)
    setItems(prev => prev.filter(x => x.id !== id))
    showToast('Item removed')
  }

  return (
    <div className="phone-screen">
      <Toast msg={toast} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Resources</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>Supplies & spend</div>
          </div>
          <button onClick={() => setShowAdd(true)}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconPlus size={14} sw={2.4} /> Add item
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 22px 24px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>}

          {!loading && <BudgetCard user={user} items={items} budget={budget} onSaved={setBudget} />}

          {!loading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No items yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tap "Add item" to log a supply or resource needed.</div>
            </div>
          )}

          {!loading && items.length > 0 && <SpendGraph items={items} />}
          {!loading && items.length > 0 && <SuppliesOverview items={items} />}

          {!loading && items.length > 0 && (
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
              {items.map((item, i) => {
                const h = item.houses
                const hColor = h?.color
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < items.length - 1 ? '1px solid var(--a-line)' : '' }}>
                    {hColor && <div style={{ width: 3, height: 28, background: hColor, borderRadius: 4 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 1 }}>
                        {item.qty} {item.unit}{item.cost ? ` · $${Number(item.cost).toFixed(2)}` : ''}{h ? ` · ${h.name}` : ''}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(item.id)}
                      style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', fontSize: 18, cursor: 'pointer', padding: '4px', lineHeight: 1 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}

          {isSupervisor && (() => {
            // Group real fetched items by house and sum cost (null cost counts as 0).
            const byHouse = {}
            for (const item of items) {
              if (!item.house_id || !inThisMonth(item.created_at)) continue
              const h = item.houses
              const key = item.house_id
              if (!byHouse[key]) {
                const hState = houses.find(x => x.id === key)
                byHouse[key] = {
                  total: 0,
                  house: {
                    color: h?.color || hState?.color || '#888888',
                    short: h?.short || hState?.short || (h?.name || hState?.name || '—').slice(0, 4).toUpperCase(),
                    name:  h?.name || hState?.name || '—',
                  },
                }
              }
              byHouse[key].total += Number(item.cost) || 0
            }
            const rows = Object.values(byHouse)
              .filter(r => r.total > 0)
              .sort((a, b) => b.total - a.total)
            const maxTotal = rows.reduce((m, r) => Math.max(m, r.total), 0)
            const fmt = (n) => `$${Math.round(n).toLocaleString('en-US')}`

            return (
              <>
                <SectionHeader title="Spend by house · this month" />
                <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                  {rows.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)', padding: '6px 0' }}>No spend recorded yet</div>
                  ) : (
                    <>
                      {rows.map((r, i) => (
                        <HouseBar
                          key={i}
                          house={r.house}
                          value={fmt(r.total)}
                          pct={maxTotal ? r.total / maxTotal : 0}
                          last={i === rows.length - 1}
                        />
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--a-ink3)', marginTop: 8 }}>
                        <span>0</span><span>{fmt(maxTotal)}</span>
                      </div>
                    </>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {showAdd && (
        <AddItemModal
          user={user}
          houses={houses}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  )
}
