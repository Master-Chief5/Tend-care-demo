import { useState, useEffect } from 'react'
import { fetchHouses, addHouse, updateHouse, deleteHouse } from '../lib/db'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { IconPlus, IconChev } from '../components/icons'

const PRESET_COLORS = ['#d4a64a', '#2f9489', '#cf4f3b', '#6e4d8f', '#3c5887', '#4a8a55', '#c45a3a', '#888888']

function HouseForm({ initial, onSave, onCancel, saving }) {
  const [name, setName]         = useState(initial?.name || '')
  const [short, setShort]       = useState(initial?.short || '')
  const [address, setAddress]   = useState(initial?.address || '')
  const [branch, setBranch]     = useState(initial?.branch || '')
  const [color, setColor]       = useState(initial?.color || '#888888')
  const [mgr, setMgr]           = useState(initial?.managerName || '')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), short: short.trim() || name.trim().slice(0, 3).toUpperCase(), address, branch, color, managerName: mgr })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input placeholder="House name (e.g. Oak House)" value={name} onChange={e => setName(e.target.value)} autoFocus
        style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <input placeholder="Short code (e.g. OAK)" value={short} onChange={e => setShort(e.target.value.toUpperCase().slice(0, 4))}
          style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
        <input placeholder="Branch (e.g. North)" value={branch} onChange={e => setBranch(e.target.value)}
          style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
      </div>
      <input placeholder="Address" value={address} onChange={e => setAddress(e.target.value)}
        style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
      <input placeholder="House manager name (optional)" value={mgr} onChange={e => setMgr(e.target.value)}
        style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none' }} />
      <div>
        <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 8 }}>House color</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              style={{ width: 32, height: 32, borderRadius: 999, background: c, border: color === c ? '3px solid var(--a-ink)' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>
          Cancel
        </button>
        <button type="submit" disabled={!name.trim() || saving}
          style={{ flex: 2, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5 }}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create house'}
        </button>
      </div>
    </form>
  )
}

function HouseCard({ house, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ height: 4, background: house.color }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: house.color, letterSpacing: '0.1em', background: `${house.color}1a`, padding: '2px 7px', borderRadius: 4 }}>{house.short}</span>
          <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{house.name}</span>
        </div>
        {house.address && <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginBottom: 4 }}>{house.address}{house.branch ? ` · ${house.branch}` : ''}</div>}
        {house.managerName && <div style={{ fontSize: 11.5, color: 'var(--a-ink3)' }}>Manager: {house.managerName}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => onEdit(house)}
            style={{ flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>
            Edit
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #fadcd7', borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#a93a25', fontFamily: 'Geist', cursor: 'pointer' }}>
              Delete
            </button>
          ) : (
            <button onClick={() => { setConfirmDelete(false); onDelete(house.id) }}
              style={{ padding: '7px 14px', background: '#a93a25', border: 0, borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'Geist', cursor: 'pointer' }}>
              Confirm delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ScreenA_HouseSetup({ user, onHousesChanged }) {
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editHouse, setEditHouse] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, showToast] = useToast()

  useEffect(() => {
    if (!user?.orgId) return
    setLoading(true)
    fetchHouses(user.orgId).then(data => {
      setHouses(data)
      setLoading(false)
    })
  }, [user?.orgId])

  const handleAdd = async (data) => {
    if (!user?.orgId) return
    setSaving(true)
    const h = await addHouse(user.orgId, { ...data, slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })
    setSaving(false)
    if (h) {
      setHouses(prev => [...prev, {
        id: h.id, slug: h.slug, name: h.name, short: h.short,
        address: h.address ?? '', branch: h.branch ?? '',
        color: h.color, managerName: h.manager_name ?? '', residentsCount: 0,
      }])
      setShowAdd(false)
      showToast('House created')
      onHousesChanged?.()
    }
  }

  const handleEdit = async (data) => {
    if (!editHouse) return
    setSaving(true)
    const h = await updateHouse(editHouse.id, data)
    setSaving(false)
    if (h) {
      setHouses(prev => prev.map(x => x.id === editHouse.id ? {
        ...x, name: h.name, short: h.short,
        address: h.address ?? '', branch: h.branch ?? '',
        color: h.color, managerName: h.manager_name ?? '',
      } : x))
      setEditHouse(null)
      showToast('House updated')
      onHousesChanged?.()
    }
  }

  const handleDelete = async (id) => {
    await deleteHouse(id)
    setHouses(prev => prev.filter(h => h.id !== id))
    showToast('House deleted')
    onHousesChanged?.()
  }

  return (
    <div className="phone-screen">
      <Toast msg={toast} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Houses</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>{houses.length} houses</div>
          </div>
          <button onClick={() => { setShowAdd(true); setEditHouse(null) }}
            style={{ background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            <IconPlus size={14} sw={2.4} /> Add house
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 22px 24px' }}>
          {loading && <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--a-ink3)', fontSize: 13 }}>Loading…</div>}

          {!loading && houses.length === 0 && !showAdd && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No houses yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Tap "Add house" to create your first group home.</div>
            </div>
          )}

          {(showAdd && !editHouse) && (
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '16px', marginBottom: 14 }}>
              <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>New house</div>
              <HouseForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
            </div>
          )}

          {houses.map(h => editHouse?.id === h.id ? (
            <div key={h.id} style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '16px', marginBottom: 10 }}>
              <div className="serif" style={{ fontSize: 18, marginBottom: 14 }}>Edit {h.name}</div>
              <HouseForm initial={editHouse} onSave={handleEdit} onCancel={() => setEditHouse(null)} saving={saving} />
            </div>
          ) : (
            <HouseCard key={h.id} house={h} onEdit={setEditHouse} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  )
}
