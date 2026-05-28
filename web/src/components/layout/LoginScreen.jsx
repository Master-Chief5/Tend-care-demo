import { useState } from 'react'
import { TendLogo } from '../ui/TendLogo'
import { IconArrow } from '../icons'
import { ROLES } from '../../data/constants'
import { supabase, isDemoMode } from '../../lib/supabase'

export function LoginScreen({ onLogin }) {
  return isDemoMode ? <DemoLogin onLogin={onLogin} /> : <RealLogin onLogin={onLogin} />
}

// ── Demo mode: 3 account cards (no password) ──────────────────────────
function DemoLogin({ onLogin }) {
  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--a-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 24px',
    }}>
      <TendLogo size={20} />
      <p className="serif" style={{ fontSize: 18, color: 'var(--a-ink2)', marginTop: 6, marginBottom: 36, letterSpacing: '-0.01em' }}>
        care operations
      </p>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Sign in as
        </div>
        {ROLES.map(r => <AccountButton key={r.id} user={r} onLogin={onLogin} />)}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--a-ink3)', marginTop: 20 }}>
          Demo · no real data is stored
        </div>
      </div>
    </div>
  )
}

function AccountButton({ user, onLogin }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={() => onLogin(user)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 14, marginBottom: 10,
        background: hov ? 'var(--a-paper)' : 'var(--a-card)',
        border: '1px solid var(--a-line)', cursor: 'pointer', textAlign: 'left',
        fontFamily: 'Geist, sans-serif', transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: user.color,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 15, flexShrink: 0,
      }}>
        {user.initial}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--a-ink)' }}>{user.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 2 }}>{user.role}</div>
      </div>
      <IconArrow size={16} color="var(--a-ink3)" />
    </button>
  )
}

// ── Real mode: email + password via Supabase ───────────────────────────
function RealLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    // Fetch role from user metadata or profiles table
    const role = data.user?.user_metadata?.role ?? 'staff'
    onLogin({ id: role, name: data.user?.user_metadata?.name ?? email, role })
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: '1px solid var(--a-line)', background: 'var(--a-card)',
    fontFamily: 'Geist, sans-serif', color: 'var(--a-ink)',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--a-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '32px 24px',
    }}>
      <TendLogo size={20} />
      <p className="serif" style={{ fontSize: 18, color: 'var(--a-ink2)', marginTop: 6, marginBottom: 36, letterSpacing: '-0.01em' }}>
        care operations
      </p>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          required autoComplete="email"
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          required autoComplete="current-password"
          style={{ ...inputStyle, marginBottom: 16 }}
        />
        {error && <div style={{ fontSize: 12.5, color: 'var(--a-clay)', marginBottom: 12 }}>{error}</div>}
        <button
          type="submit" disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 999,
            background: 'var(--a-ink)', color: 'var(--a-card)',
            border: 0, fontSize: 14, fontWeight: 600,
            fontFamily: 'Geist, sans-serif', cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
