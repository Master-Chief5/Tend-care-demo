import { useState, useEffect, useRef } from 'react'
import { TendLogo } from '../ui/TendLogo'
import { IconArrow, IconSearch, IconCheck, IconHome, IconPeople } from '../icons'
import { ROLES } from '../../data/constants'
import { supabase, isDemoMode } from '../../lib/supabase'
import { searchOrganizations, registerAsStaff, createOrgAndSupervisor, listOrgHouses } from '../../lib/db'

export function LoginScreen({ onLogin, onSignedUp, onSignupStart, onSignupCancel }) {
  return isDemoMode
    ? <DemoLogin onLogin={onLogin} />
    : <RealAuth onLogin={onLogin} onSignedUp={onSignedUp} onSignupStart={onSignupStart} onSignupCancel={onSignupCancel} />
}

// ── Demo mode ─────────────────────────────────────────────────────────────────
function DemoLogin({ onLogin }) {
  return (
    <AuthShell>
      <div style={{ fontSize: 10.5, color: 'var(--a-ink3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        Sign in as
      </div>
      {ROLES.map(r => <AccountButton key={r.id} user={r} onLogin={onLogin} />)}
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--a-ink3)', marginTop: 20 }}>
        Demo · no real data is stored
      </div>
    </AuthShell>
  )
}

function AccountButton({ user, onLogin }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={() => onLogin({ ...user, role: user.id, orgId: 'demo-org', enriched: true })}
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
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: user.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
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

// ── Real auth router ──────────────────────────────────────────────────────────
function RealAuth({ onLogin, onSignedUp, onSignupStart, onSignupCancel }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'check-email'

  if (mode === 'signup') return (
    <SignUpForm
      onBack={() => setMode('login')}
      onCheckEmail={() => setMode('check-email')}
      onLogin={onLogin}
      onSignedUp={onSignedUp}
      onSignupStart={onSignupStart}
      onSignupCancel={onSignupCancel}
    />
  )
  if (mode === 'check-email') return <CheckEmailScreen onBack={() => setMode('login')} />
  return <LoginForm onLogin={onLogin} onCreateAccount={() => setMode('signup')} />
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────
function AuthShell({ children, wide }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--a-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <TendLogo size={20} />
      <p className="serif" style={{ fontSize: 18, color: 'var(--a-ink2)', marginTop: 6, marginBottom: 36, letterSpacing: '-0.01em' }}>
        care operations
      </p>
      <div style={{ width: '100%', maxWidth: wide ? 440 : 360 }}>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
  border: '1px solid var(--a-line)', background: 'var(--a-card)',
  fontFamily: 'Geist, sans-serif', color: 'var(--a-ink)',
  outline: 'none', boxSizing: 'border-box',
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onLogin, onCreateAccount }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    const role = data.user?.user_metadata?.role ?? 'staff'
    onLogin({ id: role, name: data.user?.user_metadata?.name ?? email, role })
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          required autoComplete="email" style={{ ...inputStyle, marginBottom: 10 }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          required autoComplete="current-password" style={{ ...inputStyle, marginBottom: 16 }} />
        {error && <div style={{ fontSize: 12.5, color: 'var(--a-clay)', marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: 999, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, fontSize: 14, fontWeight: 600, fontFamily: 'Geist, sans-serif', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button onClick={onCreateAccount}
        style={{ width: '100%', marginTop: 12, padding: '11px', borderRadius: 999, background: 'transparent', border: '1px solid var(--a-line)', fontSize: 13, fontWeight: 500, color: 'var(--a-ink2)', fontFamily: 'Geist, sans-serif', cursor: 'pointer' }}>
        Create account →
      </button>
    </AuthShell>
  )
}

// ── Org search picker (also exported for NeedsSetupScreen in App.jsx) ─────────
export function OrgSearchPicker({ selected, onSelect }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef             = useRef(null)

  useEffect(() => {
    if (selected) return
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const orgs = await searchOrganizations(query)
      setSearching(false)
      setResults(orgs)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, selected])

  if (selected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--a-card)', border: '1px solid var(--a-sage)', borderRadius: 10 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--a-sage)', background: '#dee6df', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em' }}>{selected.slug}</span>
        <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{selected.name}</span>
        <IconCheck size={14} color="var(--a-sage)" sw={2.2} />
        <button type="button" onClick={() => onSelect(null)}
          style={{ background: 'transparent', border: 0, color: 'var(--a-ink3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10 }}>
        <IconSearch size={14} color="var(--a-ink3)" />
        <input type="text" placeholder="Search for your organization…" value={query} onChange={e => setQuery(e.target.value)}
          style={{ border: 0, outline: 'none', background: 'transparent', fontFamily: 'Geist, sans-serif', fontSize: 14, color: 'var(--a-ink)', flex: 1 }} />
        {searching && <span style={{ fontSize: 11, color: 'var(--a-ink3)' }}>…</span>}
      </div>
      {results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--a-card)', border: '1px solid var(--a-line)', borderRadius: 10, marginTop: 4, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
          {results.map(org => (
            <button key={org.id} type="button" onClick={() => { onSelect(org); setQuery(''); setResults([]) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'Geist, sans-serif' }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--a-ink3)', background: 'var(--a-paper)', padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em', flexShrink: 0 }}>{org.slug}</span>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--a-ink)' }}>{org.name}</span>
            </button>
          ))}
        </div>
      )}
      {query.trim() && !searching && results.length === 0 && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--a-ink3)', paddingLeft: 4 }}>
          No organization found — ask your supervisor for the exact name.
        </div>
      )}
    </div>
  )
}

// ── House picker (which group home does this staffer work at?) ────────────────
// Lists the org's houses so a joining staffer can pick their home. Assigning a
// house at join is what makes house-scoped writes (incidents, clock-in, logs)
// actually save — without it auth_house_id() is null and every write 403s.
// Reports availability to the parent so it can require a pick only when houses exist.
export function HousePicker({ orgId, selected, onSelect, onAvailability }) {
  const [houses, setHouses]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!orgId) { setHouses([]); onAvailability?.(null); return }
    let stop = false
    setLoading(true)
    listOrgHouses(orgId).then(hs => {
      if (stop) return
      setHouses(hs); setLoading(false); onAvailability?.(hs.length > 0)
    })
    return () => { stop = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  if (!orgId) return null
  if (loading) return <div style={{ fontSize: 12, color: 'var(--a-ink3)', padding: '4px 2px' }}>Loading homes…</div>
  if (houses.length === 0) return (
    <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', padding: '4px 2px', lineHeight: 1.5 }}>
      This organization hasn’t added any homes yet — your supervisor can assign you to one later.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {houses.map(h => {
        const active = selected?.id === h.id
        return (
          <button key={h.id} type="button" onClick={() => onSelect(h)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 10,
              border: active ? '2px solid var(--a-sage)' : '1px solid var(--a-line)',
              background: active ? 'var(--a-card)' : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'Geist, sans-serif' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: active ? 'var(--a-sage)' : 'var(--a-line)', flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--a-ink)', flex: 1 }}>{h.name}</span>
            {active && <IconCheck size={14} color="var(--a-sage)" sw={2.2} />}
          </button>
        )
      })}
    </div>
  )
}

// ── Sign-up form (role selection + branching) ─────────────────────────────────
export const toSlug = (name) =>
  (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)

function SignUpForm({ onBack, onCheckEmail, onLogin, onSignedUp, onSignupStart, onSignupCancel }) {
  const [accountType, setAccountType] = useState(null) // 'supervisor' | 'staff'
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  // Supervisor fields
  const [orgName, setOrgName]         = useState('')
  const [orgSlug, setOrgSlug]         = useState('')
  const [slugEdited, setSlugEdited]   = useState(false)
  // Staff fields
  const [selectedOrg, setSelectedOrg]     = useState(null)
  const [selectedHouse, setSelectedHouse] = useState(null)
  const [orgHasHouses, setOrgHasHouses]   = useState(null) // null=unknown, true/false once loaded

  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  // Auto-generate slug from org name unless the user has manually edited it
  useEffect(() => {
    if (!slugEdited) setOrgSlug(toSlug(orgName))
  }, [orgName, slugEdited])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim())               { setError('Please enter your full name.'); return }
    if (password.length < 8)        { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm)       { setError('Passwords do not match.'); return }
    if (accountType === 'supervisor' && !orgName.trim()) { setError('Please enter your organization name.'); return }
    if (accountType === 'staff' && !selectedOrg)        { setError('Please select your organization.'); return }
    if (accountType === 'staff' && orgHasHouses && !selectedHouse) { setError('Please pick the home you work at.'); return }

    setError(null); setLoading(true)

    // Tell App a signup is in flight so its auth listener defers enrichment
    // until our registration RPC has created the staff/org row.
    onSignupStart?.()

    // Stash the org/home pick so it survives email-confirmation (when there's no
    // session yet, App replays this on first authenticated load instead of making
    // the user re-search the org and re-pick their home).
    const pendingReg = accountType === 'supervisor'
      ? { kind: 'supervisor', email, name: name.trim(), orgName: orgName.trim(), orgSlug: orgSlug || toSlug(orgName) }
      : { kind: 'staff', email, name: name.trim(), orgId: selectedOrg.id, houseId: selectedHouse?.id || null }
    try { localStorage.setItem('tend-pending-reg', JSON.stringify(pendingReg)) } catch { /* ignore */ }

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim(), role: accountType === 'supervisor' ? 'supervisor' : 'staff' } },
    })

    if (signUpErr) { setLoading(false); onSignupCancel?.(); setError(signUpErr.message); return }

    if (data.session) {
      let regError = null
      if (accountType === 'supervisor') {
        const slug = orgSlug || toSlug(orgName) || `org-${Math.random().toString(36).slice(2, 8)}`
        const { error: e } = await createOrgAndSupervisor(orgName.trim(), slug, name.trim())
        regError = e
      } else {
        const { error: e } = await registerAsStaff(selectedOrg.id, name.trim(), selectedHouse?.id || null)
        regError = e
      }
      if (regError) {
        setLoading(false)
        onSignupCancel?.()
        setError(`Could not set up your profile: ${regError}`)
        return
      }
      // Registered directly (no email-confirm) — the stash isn't needed.
      try { localStorage.removeItem('tend-pending-reg') } catch { /* ignore */ }
      setLoading(false)
      const role = data.user?.user_metadata?.role ?? 'staff'
      onLogin({ id: role, name: name.trim(), role, enriched: false })
      // Now that the row exists, run enrichment (clears the deferral flag too).
      onSignedUp?.()
    } else {
      setLoading(false)
      onSignupCancel?.()
      onCheckEmail()
    }
  }

  const canSubmit = name.trim() && email && password && confirm && !loading &&
    (accountType === 'supervisor'
      ? orgName.trim()
      : selectedOrg && (orgHasHouses === false || selectedHouse))

  return (
    <AuthShell wide>
      <button type="button" onClick={onBack}
        style={{ background: 'transparent', border: 0, color: 'var(--a-ink2)', cursor: 'pointer', fontSize: 13, fontFamily: 'Geist, sans-serif', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Back to sign in
      </button>
      <div className="serif" style={{ fontSize: 26, letterSpacing: '-0.02em', marginBottom: 6 }}>Create account</div>
      <div style={{ fontSize: 13, color: 'var(--a-ink3)', marginBottom: 22 }}>How will you be using Tend?</div>

      {/* Role selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { id: 'supervisor', label: 'Supervisor', sub: 'I run the organization', icon: IconHome },
          { id: 'staff',      label: 'Staff / DSP', sub: 'I work at a group home', icon: IconPeople },
        ].map(opt => {
          const active = accountType === opt.id
          return (
            <button key={opt.id} type="button" onClick={() => { setAccountType(opt.id); setError(null) }}
              style={{ padding: '14px 12px', borderRadius: 12, border: active ? '2px solid var(--a-ink)' : '1px solid var(--a-line)', background: active ? 'var(--a-card)' : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'Geist, sans-serif', position: 'relative' }}>
              <div style={{ marginBottom: 6 }}><opt.icon size={20} color={active ? 'var(--a-ink)' : 'var(--a-ink2)'} sw={1.7} /></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 2, lineHeight: 1.4 }}>{opt.sub}</div>
              {active && (
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <IconCheck size={14} color="var(--a-ink)" sw={2.4} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {accountType && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
            required autoFocus style={inputStyle} />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            required autoComplete="email" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="password" placeholder="Password (8+ chars)" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="new-password" style={inputStyle} />
            <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)}
              required autoComplete="new-password" style={inputStyle} />
          </div>

          {accountType === 'supervisor' ? (
            <div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 6, fontWeight: 500 }}>Your organization</div>
              <input type="text" placeholder="Organization name (e.g. Sunrise Care)" value={orgName}
                onChange={e => setOrgName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--a-ink3)', flexShrink: 0 }}>Slug:</span>
                <input type="text" placeholder="org-slug" value={orgSlug}
                  onChange={e => { setOrgSlug(toSlug(e.target.value)); setSlugEdited(true) }}
                  style={{ ...inputStyle, fontSize: 12, padding: '7px 10px' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginTop: 4, paddingLeft: 2 }}>
                Staff will search for <strong>{orgName.trim() || 'your org name'}</strong> when signing up.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 6, fontWeight: 500 }}>Your organization</div>
              <OrgSearchPicker selected={selectedOrg} onSelect={(o) => { setSelectedOrg(o); setSelectedHouse(null); setOrgHasHouses(null) }} />
              {selectedOrg && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 6, fontWeight: 500 }}>Which home do you work at?</div>
                  <HousePicker orgId={selectedOrg.id} selected={selectedHouse} onSelect={setSelectedHouse} onAvailability={setOrgHasHouses} />
                </div>
              )}
            </div>
          )}

          {error && <div style={{ fontSize: 12.5, color: 'var(--a-clay)' }}>{error}</div>}
          <button type="submit" disabled={!canSubmit}
            style={{ padding: '12px', borderRadius: 999, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, fontSize: 14, fontWeight: 600, fontFamily: 'Geist, sans-serif', cursor: canSubmit ? 'pointer' : 'default', opacity: canSubmit ? 1 : 0.5, marginTop: 4 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          {accountType === 'supervisor' && (
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', lineHeight: 1.5, textAlign: 'center' }}>
              Your account starts on the free plan. You can add houses and staff right away.
            </div>
          )}
          {accountType === 'staff' && (
            <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', lineHeight: 1.5, textAlign: 'center' }}>
              Pick the home you work at so your logs, incidents, and time punches save to the right place. Your supervisor can change your role or home later.
            </div>
          )}
        </form>
      )}
    </AuthShell>
  )
}

// ── Check email screen ────────────────────────────────────────────────────────
function CheckEmailScreen({ onBack }) {
  return (
    <AuthShell>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
        <div className="serif" style={{ fontSize: 22, letterSpacing: '-0.01em', marginBottom: 10 }}>Check your email</div>
        <div style={{ fontSize: 14, color: 'var(--a-ink2)', lineHeight: 1.6, marginBottom: 28 }}>
          We sent a confirmation link to your email address. Click it to activate your account, then come back here to sign in.
        </div>
        <button onClick={onBack}
          style={{ width: '100%', padding: '12px', borderRadius: 999, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, fontSize: 14, fontWeight: 600, fontFamily: 'Geist, sans-serif', cursor: 'pointer' }}>
          Back to sign in
        </button>
      </div>
    </AuthShell>
  )
}
