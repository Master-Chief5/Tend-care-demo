import { useState } from 'react'
import { HOUSES } from '../data/constants'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { TabBar } from '../components/ui/TabBar'
import { IconPlus, IconCar } from '../components/icons'

function Mini({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      <div className="tnum" style={{ fontSize: 17, marginTop: 2, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

export function TripRow({ time, person, house, from, to, miles, purpose, last, onClick }) {
  const h = HOUSES.find(x => x.id === house)
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: last ? '' : '1px solid var(--a-line)', cursor: 'pointer' }}>
      <div style={{ width: 3, height: 28, background: h.color, borderRadius: 4 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--a-ink)', fontWeight: 500 }}>{from} → {to}</div>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{person} · {time} · {purpose}</div>
      </div>
      <div className="tnum" style={{ fontSize: 13, fontWeight: 500, color: 'var(--a-ink2)' }}>{miles}<span style={{ fontSize: 9, color: 'var(--a-ink3)', marginLeft: 2 }}>mi</span></div>
    </div>
  )
}

export function VehicleRow({ name, sub, status, last, onClick }) {
  const m = {
    ok:     { dot: '#4a8a55', tag: 'Available' },
    active: { dot: '#d49a3a', tag: 'In use' },
    due:    { dot: '#c45a3a', tag: 'Service due' },
  }[status]
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: last ? '' : '1px dashed var(--a-line)', cursor: 'pointer' }}>
      <div style={{ width: 36, height: 26, borderRadius: 6, background: 'var(--a-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--a-ink2)' }}>
        <IconCar size={16} sw={1.7} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: m.dot }} />
        <span style={{ fontSize: 11, color: 'var(--a-ink2)' }}>{m.tag}</span>
      </div>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--a-ink2)', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '14px 0 8px' }}>{title}</div>
  )
}

export function ScreenA_Driving() {
  const [tripActive, setTripActive] = useState(true)
  const [toast, showToast] = useToast()

  return (
    <div className="phone-screen">
      <Toast msg={toast} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Driving</div>
            <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>Logs · Mileage · Vehicles</div>
          </div>
          <button
            onClick={() => { setTripActive(v => !v); showToast(tripActive ? 'Trip ended · mileage saved' : 'Trip started') }}
            style={{ background: tripActive ? '#a93a25' : 'var(--a-ink)', color: 'var(--a-card)', border: 0, borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Geist', cursor: 'pointer' }}>
            {tripActive ? 'End trip' : <><IconPlus size={14} sw={2.4} /> Start trip</>}
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 22px 24px' }}>
          {tripActive ? (
            <div style={{ background: 'var(--a-ink)', color: '#fbf6ec', borderRadius: 16, padding: '16px 18px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(circle at 90% 10%, #fbf6ec 0%, transparent 40%)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: '#7dd28a', boxShadow: '0 0 0 4px rgba(125,210,138,0.2)' }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', color: '#7dd28a', textTransform: 'uppercase' }}>Trip in progress</span>
                </div>
                <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1.15 }}>M. Lee to Dr. Patel's office</div>
                <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>Driver: Aisha M. · Van #2 · Oak House</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(251,246,236,0.12)' }}>
                  <Mini label="Time" value="0:18" />
                  <Mini label="Distance" value="4.2 mi" />
                  <Mini label="Purpose" value="Medical" />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '16px 18px', marginBottom: 14, textAlign: 'center', color: 'var(--a-ink3)' }}>
              <div style={{ fontSize: 13 }}>No active trip</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Tap "Start trip" to begin logging</div>
            </div>
          )}

          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>This pay period</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span className="serif tnum" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em' }}>248.4</span>
              <span style={{ fontSize: 13, color: 'var(--a-ink2)' }}>mi · ${' '}<span className="tnum" style={{ fontWeight: 600, color: 'var(--a-ink)' }}>166.43</span></span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11, color: 'var(--a-ink3)' }}>
              <span>34 trips</span><span>·</span><span>6 days remaining</span>
              <div style={{ flex: 1 }} />
              <span style={{ color: 'var(--a-sage)', fontWeight: 500 }}>On track</span>
            </div>
            <svg viewBox="0 0 200 40" style={{ width: '100%', height: 36, marginTop: 10 }}>
              <polyline points="0,30 20,28 40,22 60,24 80,18 100,20 120,15 140,17 160,12 180,9 200,11" fill="none" stroke="var(--a-sage)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="0,30 20,28 40,22 60,24 80,18 100,20 120,15 140,17 160,12 180,9 200,11 200,40 0,40" fill="var(--a-sage)" fillOpacity="0.06" stroke="none" />
            </svg>
          </div>

          <SectionHeader title="Recent trips" />
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            <TripRow time="Today · 9:14a" person="Devon P." house="willow" from="Willow" to="Walmart" miles="3.8" purpose="Grocery" onClick={() => showToast('Opening trip details…')} />
            <TripRow time="Today · 8:02a" person="Saira K." house="maple" from="Maple" to="Day program" miles="6.1" purpose="Program" onClick={() => showToast('Opening trip details…')} />
            <TripRow time="Mon · 4:40p" person="Aisha M." house="oak" from="Oak" to="Dr. Patel" miles="4.2" purpose="Medical" onClick={() => showToast('Opening trip details…')} />
            <TripRow time="Mon · 11:20a" person="Jay B." house="oak" from="Oak" to="Library" miles="1.6" purpose="Activity" last onClick={() => showToast('Opening trip details…')} />
          </div>

          <SectionHeader title="Vehicles" />
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '12px 14px' }}>
            <VehicleRow name="Van #1 · Sienna '22" sub="Oak / Willow · 38,402 mi" status="ok" onClick={() => showToast('Van #1 — all clear')} />
            <VehicleRow name="Van #2 · Sienna '21" sub="Oak / Willow · Aisha out · 51,108 mi" status="active" onClick={() => showToast('Van #2 — currently in use')} />
            <VehicleRow name="Van #3 · Odyssey '23" sub="Maple / Cedar · Oil due 4/8" status="due" last onClick={() => showToast('Van #3 — service overdue')} />
          </div>
        </div>
      </div>
      <TabBar active="drive" />
    </div>
  )
}
