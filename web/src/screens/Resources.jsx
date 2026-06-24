import { useState, useEffect } from 'react'
import { fetchResources, addResource, deleteResource, fetchHouses } from '../lib/db'
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
function MonthSpendGraph({ items }) {
  const now = new Date()
  const withCost = items.filter(it => Number(it?.cost) > 0)
  const monthItems = withCost.filter(it => inThisMonth(it.created_at))
  const total = monthItems.reduce((s, it) => s + Number(it.cost), 0)
  const lastMonthTotal = withCost.filter(it => {
    if (!it.created_at) return false
    const d = new Date(it.created_at)
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth()
  }).reduce((s, it) => s + Number(it.cost), 0)

  // Weekly buckets of the current month (week 1 = days 1–7, etc.).
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const weekCount = Math.ceil(daysInMonth / 7)
  const weeks = Array.from({ length: weekCount }, () => 0)
  for (const it of monthItems) {
    const day = new Date(it.created_at).getDate()
    weeks[Math.min(weekCount - 1, Math.floor((day - 1) / 7))] += Number(it.cost)
  }
  const maxW = Math.max(...weeks, 1)
  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const delta = total - lastMonthTotal
  const curWeek = Math.min(weekCount - 1, Math.floor((now.getDate() - 1) / 7))

  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Spent · {MONTHS_F[now.getMonth()]}</div>
        {lastMonthTotal > 0 && (
          <div style={{ fontSize: 11, fontWeight: 600, color: delta > 0 ? '#a93a25' : '#3f7050' }}>
            {delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta))} vs last mo
          </div>
        )}
      </div>
      <div className="serif tnum" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 12 }}>{fmt(total)}</div>
      {total > 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 72 }}>
          {weeks.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 9, color: 'var(--a-ink3)', fontWeight: 600 }}>{v > 0 ? `$${Math.round(v)}` : ''}</div>
              <div style={{ width: '100%', height: 48, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${Math.max((v / maxW) * 100, v > 0 ? 6 : 0)}%`, background: i === curWeek ? 'var(--a-sage)' : 'var(--a-sage-dim)', borderRadius: '4px 4px 0 0', minHeight: v > 0 ? 4 : 0, transition: 'height 0.3s' }} />
              </div>
              <div style={{ fontSize: 9, color: i === curWeek ? 'var(--a-ink2)' : 'var(--a-ink3)', fontWeight: i === curWeek ? 700 : 500 }}>W{i + 1}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--a-ink3)', paddingBottom: 4 }}>No purchases logged this month yet. Add an item with a cost (or mark a supply “bought”) to track spend.</div>
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

export function ScreenA_Resources({ user }) {
  const [items, setItems] = useState([])
  const [houses, setHouses] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, showToast] = useToast()

  const isSupervisor = user?.role === 'supervisor'

  useEffect(() => {
    if (!user?.orgId) return
    setLoading(true)
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
        <div style={{ padding: '14px calc(22px + var(--chip-clear, 0px)) 4px 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
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

          {!loading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No items yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tap "Add item" to log a supply or resource needed.</div>
            </div>
          )}

          {!loading && items.length > 0 && <MonthSpendGraph items={items} />}
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
