import { useState, useEffect } from 'react'
import { fetchResources, addResource, deleteResource, fetchHouses } from '../lib/db'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { IconPlus, IconChev, IconFlag, IconArrow, IconUp, IconDown } from '../components/icons'
import { COMMON_SUPPLIES } from '../data/suggestions'

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
          <input
            autoFocus list="supply-suggestions" placeholder="Item name (e.g. Paper towels)" value={name} onChange={e => setName(e.target.value)}
            style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
          <datalist id="supply-suggestions">
            {COMMON_SUPPLIES.map(s => <option key={s} value={s} />)}
          </datalist>
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

          {!loading && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No items yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tap "Add item" to log a supply or resource needed.</div>
            </div>
          )}

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
              if (!item.house_id) continue
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
