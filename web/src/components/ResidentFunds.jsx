import { useState, useEffect, useCallback } from 'react'
import { fetchResidentFunds, addResidentFundEntry, deleteResidentFundEntry, residentFundsBalance } from '../lib/db'
import { IconPlus, IconX } from './icons'

// Resident personal-funds (PNI) ledger — a regulatory deposit/withdrawal record
// per resident with a running balance. Supervisors/managers record entries; DSPs
// are read-only. A print action exports the visible ledger (reuses window.print
// like ProgressPanel).

const input = { background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'Geist', color: 'var(--a-ink)', outline: 'none', width: '100%', boxSizing: 'border-box' }
const lbl = { fontSize: 11, color: 'var(--a-ink3)', margin: '0 0 4px 2px' }
const sectionHead = { fontSize: 11, fontWeight: 600, color: 'var(--a-ink3)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }
const emptyBox = { background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }

const DEPOSIT_CATS = ['SSI allowance', 'Family deposit', 'Wages', 'Refund', 'Other']
const WITHDRAWAL_CATS = ['Clothing', 'Personal care', 'Outing', 'Snacks', 'Haircut', 'Other']

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`

function Stat({ label, big, sub, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 24, fontWeight: 500, marginTop: 2, color: color || 'var(--a-ink)' }}>{big}</div>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)' }}>{sub}</div>
    </div>
  )
}

function EntryForm({ houseColor, onSave, onCancel, saving }) {
  const [type, setType] = useState('deposit')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(DEPOSIT_CATS[0])
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')

  const cats = type === 'withdrawal' ? WITHDRAWAL_CATS : DEPOSIT_CATS
  const ready = Number(amount) > 0 && !saving

  const setKind = (t) => { setType(t); setCategory((t === 'withdrawal' ? WITHDRAWAL_CATS : DEPOSIT_CATS)[0]) }

  const submit = (e) => {
    e.preventDefault()
    if (!ready) return
    onSave({ type, amount: Number(amount), category, entryDate: date || undefined, note: note.trim() })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 4, background: 'var(--a-paper)', borderRadius: 10, padding: 4 }}>
        {['deposit', 'withdrawal'].map(t => {
          const on = type === t
          return <button key={t} type="button" onClick={() => setKind(t)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 0, fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', textTransform: 'capitalize', background: on ? 'var(--a-card)' : 'transparent', color: on ? 'var(--a-ink)' : 'var(--a-ink2)', boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>{t}</button>
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><div style={lbl}>Amount ($)</div><input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={input} /></div>
        <div><div style={lbl}>Date</div><input type="date" value={date} onChange={e => setDate(e.target.value)} style={input} /></div>
      </div>
      <div><div style={lbl}>Category</div>
        <select value={category} onChange={e => setCategory(e.target.value)} style={input}>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div><div style={lbl}>Note (optional)</div><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. New socks" style={input} /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 10, fontSize: 13, color: 'var(--a-ink2)', fontFamily: 'Geist', cursor: 'pointer' }}>Cancel</button>
        <button type="submit" disabled={!ready} style={{ flex: 2, background: houseColor, color: '#fff', border: 0, borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'Geist', cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.5 }}>
          {saving ? 'Saving…' : `Record ${type}`}
        </button>
      </div>
    </form>
  )
}

export function ResidentFunds({ user, houseUuid, houseColor = 'var(--a-ink)', residents = [] }) {
  const orgId = user?.orgId
  const canManage = user?.role !== 'staff'   // DSP read-only
  const list = residents || []

  const [residentId, setResidentId] = useState(list[0]?.id || '')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!residentId && list[0]) setResidentId(list[0].id) }, [list, residentId])

  const reload = useCallback(() => {
    if (!orgId || !houseUuid) { setRows([]); setLoading(false); return }
    setLoading(true)
    Promise.resolve(fetchResidentFunds(orgId, { houseId: houseUuid }))
      .then(r => { setRows(r || []); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [orgId, houseUuid])
  useEffect(() => { reload() }, [reload])

  const residentName = list.find(r => r.id === residentId)?.name || ''
  const entries = (rows || []).filter(f => !residentId || f.resident_id === residentId)
  const balance = residentFundsBalance(entries)
  const deposits = entries.filter(f => f.type !== 'withdrawal').reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const withdrawals = entries.filter(f => f.type === 'withdrawal').reduce((s, f) => s + (Number(f.amount) || 0), 0)

  const add = async (data) => {
    setSaving(true)
    await Promise.resolve(addResidentFundEntry(orgId, {
      houseId: houseUuid, residentId, residentName,
      type: data.type, amount: data.amount, category: data.category,
      entryDate: data.entryDate, note: data.note, recordedByName: user?.name,
    })).catch(() => null)
    setSaving(false); setAdding(false); reload()
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this ledger entry?')) return
    await Promise.resolve(deleteResidentFundEntry(id)).catch(() => null)
    reload()
  }

  if (list.length === 0) {
    return (
      <div>
        <div style={sectionHead}>Personal funds (PNI)</div>
        <div style={emptyBox}>Add residents to this house to track personal funds.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '4px 0 10px' }}>
        <span className="serif" style={{ fontSize: 20, color: 'var(--a-ink)' }}>Personal funds (PNI)</span>
        <button onClick={() => window.print()} style={{ background: 'transparent', border: '1px solid var(--a-line)', borderRadius: 999, padding: '6px 12px', fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist', color: 'var(--a-ink2)', cursor: 'pointer' }}>Print</button>
      </div>

      {list.length > 1 && (
        <select value={residentId} onChange={e => setResidentId(e.target.value)} style={{ ...input, marginBottom: 12 }}>
          {list.map(r => <option key={r.id} value={r.id}>{r.name}{r.room ? ` · Rm ${r.room}` : ''}</option>)}
        </select>
      )}

      {/* Balance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
        <Stat label="Balance" big={money(balance)} sub="on hand" color={balance < 0 ? 'var(--a-clay)' : 'var(--a-ink)'} />
        <Stat label="Deposits" big={money(deposits)} sub="total in" color="var(--a-sage)" />
        <Stat label="Withdrawals" big={money(withdrawals)} sub="total out" color="#b9892f" />
      </div>

      {canManage && (
        adding ? (
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
            <EntryForm houseColor={houseColor} onSave={add} onCancel={() => setAdding(false)} saving={saving} />
          </div>
        ) : (
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: '100%', background: 'transparent', border: `1px solid ${houseColor}55`, color: houseColor, borderRadius: 999, padding: '10px', fontSize: 13, fontWeight: 600, fontFamily: 'Geist', cursor: 'pointer', marginBottom: 14 }}>
            <IconPlus size={14} sw={2.2} /> Record entry
          </button>
        )
      )}

      <div style={sectionHead}>Ledger</div>
      {loading && <div style={{ padding: '14px', textAlign: 'center', fontSize: 12.5, color: 'var(--a-ink3)' }}>Loading…</div>}
      {!loading && entries.length === 0 && (
        <div style={emptyBox}>No entries yet for {residentName || 'this resident'}.</div>
      )}
      {!loading && entries.length > 0 && (
        <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden' }}>
          {entries.map((f, i) => {
            const isW = f.type === 'withdrawal'
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < entries.length - 1 ? '1px solid var(--a-line)' : '' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--a-ink)', fontWeight: 500 }}>
                    {f.category || (isW ? 'Withdrawal' : 'Deposit')}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>
                    <span className="tnum">{f.entry_date}</span>{f.recorded_by_name ? ` · ${f.recorded_by_name}` : ''}{f.note ? ` · ${f.note}` : ''}
                  </div>
                </div>
                <span className="tnum" style={{ fontSize: 13.5, fontWeight: 600, color: isW ? 'var(--a-clay)' : 'var(--a-sage)', flexShrink: 0 }}>
                  {isW ? '−' : '+'}{money(f.amount)}
                </span>
                {canManage && (
                  <button onClick={() => remove(f.id)} aria-label="Delete entry" style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '0 2px', flexShrink: 0 }}><IconX size={16} /></button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
