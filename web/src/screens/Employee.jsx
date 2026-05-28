import { useState, useEffect } from 'react'
import { buildWeek, fmtDayLabel, getGreeting } from '../lib/utils'
import { fetchTasks, toggleTask } from '../lib/db'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/ui/Toast'
import { Pill } from '../components/ui/Pill'
import { TabBar } from '../components/ui/TabBar'
import { TendLogo } from '../components/ui/TendLogo'
import { IconCheck, IconCal, IconCar, IconChat, IconBook } from '../components/icons'

const FALLBACK_TASKS = [
  { kind: 'med',   text: 'Morning meds — Ruth J., Marcus L., Tom R., Donna P.',   done: true,  urgent: false },
  { kind: 'drive', text: '1:30pm — M. Lee to dentist (Dr. Patel, 14 Oak St)',     done: false, urgent: true },
  { kind: 'note',  text: 'Document shift note before 3pm handoff',                done: false, urgent: false },
  { kind: 'shop',  text: 'Grocery order — oat milk, bananas, dish soap',          done: false, urgent: false },
  { kind: 'med',   text: 'Afternoon meds — Ruth J. 2pm (needs 2nd signoff)',      done: false, urgent: true },
]

const kindMap = {
  med:   { label: 'Med',   bg: '#fadcd7', tc: '#a93a25' },
  drive: { label: 'Drive', bg: '#dde6f0', tc: '#3c5887' },
  note:  { label: 'Note',  bg: 'var(--a-paper)', tc: 'var(--a-ink3)' },
  shop:  { label: 'Shop',  bg: '#f5e9d6', tc: '#a47012' },
}

export function ScreenA_MyDay({ user }) {
  const [tasks, setTasks] = useState(FALLBACK_TASKS)
  const [loading, setLoading] = useState(!!user?.staffId)
  const today = new Date()
  const firstName = user?.name?.split(' ')[0] || 'Aisha'

  useEffect(() => {
    if (!user?.staffId) return
    setLoading(true)
    fetchTasks(user.staffId, today).then(data => {
      if (data.length > 0) setTasks(data)
      setLoading(false)
    })
  }, [user?.staffId])

  const toggle = async (task, idx) => {
    const newDone = !task.done
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, done: newDone } : t))
    if (task.id) await toggleTask(task.id, newDone)
  }

  const done = tasks.filter(t => t.done).length

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginBottom: 2 }}>{fmtDayLabel(today)}</div>
            <div className="serif" style={{ fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {getGreeting()},<br /><em style={{ color: 'var(--a-sage)' }}>{firstName}</em>
            </div>
          </div>
          <TendLogo size={13} />
        </div>

        <div style={{ padding: '8px 22px 12px' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: 'var(--a-ink2)' }}>{done}/{tasks.length} tasks done</div>
              <div style={{ height: 4, background: 'var(--a-paper)', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`, height: '100%', background: 'var(--a-sage)', borderRadius: 999, transition: 'width 0.3s' }} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--a-sage)', fontWeight: 600 }}>
              {done === tasks.length ? '✓ All done!' : `${tasks.length - done} left`}
            </span>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 22px 24px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--a-ink3)', fontSize: 13 }}>
              Loading tasks…
            </div>
          )}
          {!loading && tasks.map((t, i) => {
            const k = kindMap[t.kind] || kindMap.note
            return (
              <div key={t.id ?? i} onClick={() => toggle(t, i)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                background: 'var(--a-card)', border: '1px solid var(--a-line)',
                borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                opacity: t.done ? 0.55 : 1, transition: 'opacity 0.2s',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  border: `2px solid ${t.done ? 'var(--a-sage)' : 'var(--a-line)'}`,
                  background: t.done ? 'var(--a-sage)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.done && <IconCheck size={12} sw={2.5} color="#fff" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: k.tc, background: k.bg, padding: '1px 6px', borderRadius: 3 }}>{k.label}</span>
                    {t.urgent && !t.done && <span style={{ fontSize: 9, fontWeight: 700, color: '#a93a25', letterSpacing: '0.04em' }}>URGENT</span>}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--a-ink)', lineHeight: 1.4, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
                </div>
              </div>
            )
          })}
          {!loading && tasks.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--a-ink3)', fontSize: 13, paddingTop: 32 }}>
              No tasks for today.
            </div>
          )}
        </div>
      </div>
      <TabBar active="home" />
    </div>
  )
}

export function ScreenA_MySchedule() {
  const week = buildWeek(new Date())
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const weekLabel = `${MONTHS[week[0].date.getMonth()]} ${week[0].num} – ${MONTHS[week[6].date.getMonth()]} ${week[6].num}`

  const upcomingShifts = [
    { day: fmtDayLabel(new Date()), time: '7:00 AM – 3:00 PM', house: 'Oak House', role: 'DSP Lead', status: 'today' },
    { day: fmtDayLabel(new Date(week[1 < week.findIndex(d=>d.today)+1 ? week.findIndex(d=>d.today)+1 : 0].date)), time: '7:00 AM – 3:00 PM', house: 'Oak House', role: 'DSP Lead', status: 'upcoming' },
    { day: 'Saturday', time: '3:00 PM – 11:00 PM', house: 'Willow Run', role: 'DSP (coverage)', status: 'swap' },
  ]

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>My Schedule</div>
          <div style={{ fontSize: 13, color: 'var(--a-ink2)', marginTop: 2 }}>{weekLabel}</div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 22px 24px' }}>
          {upcomingShifts.map((s, i) => {
            const sc = s.status === 'today' ? { bg: 'var(--a-sage)', tc: '#fff' }
              : s.status === 'swap' ? { bg: '#e7dfe9', tc: '#5a3a6b' }
              : { bg: 'var(--a-paper)', tc: 'var(--a-ink3)' }
            return (
              <div key={i} style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink2)' }}>{s.day}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: sc.tc, background: sc.bg, padding: '2px 8px', borderRadius: 999 }}>
                    {s.status === 'today' ? 'Today' : s.status === 'swap' ? 'Swap' : 'Scheduled'}
                  </span>
                </div>
                <div className="tnum" style={{ fontSize: 16, fontWeight: 600 }}>{s.time}</div>
                <div style={{ fontSize: 12, color: 'var(--a-ink3)', marginTop: 4 }}>{s.house} · {s.role}</div>
              </div>
            )
          })}
        </div>
      </div>
      <TabBar active="sched" />
    </div>
  )
}

export function ScreenA_Me({ user, onLogout }) {
  const name = user?.name || 'Aisha Mendez'
  const initial = name[0] || 'A'
  const sub = user?.role === 'supervisor' ? 'Supervisor'
    : user?.role === 'manager' ? `House Mgr · ${user.houseSlug || 'House'}`
    : `DSP Lead · ${user?.houseSlug || 'Oak House'}`

  return (
    <div className="phone-screen">
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 22px 8px' }}>
          <div className="serif" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>Me</div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 22px 24px' }}>
          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 18, padding: '20px 18px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--a-sage)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, margin: '0 auto 12px' }}>{initial}</div>
            <div className="serif" style={{ fontSize: 22 }}>{name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--a-ink2)', marginTop: 4 }}>{sub}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <Pill color="var(--a-sage)">Score: 96</Pill>
            </div>
          </div>

          <div style={{ background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, padding: '4px 0', marginBottom: 14 }}>
            {[
              { Icon: IconCal,  label: 'My schedule' },
              { Icon: IconCar,  label: 'My trips' },
              { Icon: IconChat, label: 'Messages' },
              { Icon: IconBook, label: 'Training' },
            ].map(({ Icon, label }, i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--a-line)' : '', cursor: 'pointer' }}>
                <Icon size={18} sw={1.7} color="var(--a-ink2)" />
                <span style={{ fontSize: 14, color: 'var(--a-ink)' }}>{label}</span>
              </div>
            ))}
          </div>

          {onLogout && (
            <button onClick={onLogout} style={{ width: '100%', padding: '12px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 14, fontSize: 13, color: 'var(--a-ink3)', fontFamily: 'Geist', cursor: 'pointer' }}>
              Sign out
            </button>
          )}
        </div>
      </div>
      <TabBar active="me" />
    </div>
  )
}
