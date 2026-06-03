import { useState, useEffect, useRef, useCallback } from 'react'
import { LoginScreen, OrgSearchPicker, toSlug } from './components/layout/LoginScreen'
import { MobileShell } from './components/layout/MobileShell'
import { DesktopShell } from './components/layout/DesktopShell'
import { useIsMobile } from './hooks/useIsMobile'
import { supabase, isDemoMode } from './lib/supabase'
import { fetchStaffProfile, registerAsStaff, createOrgAndSupervisor } from './lib/db'

// Build a minimal user from the JWT immediately — no DB call, no delay.
function quickUser(session) {
  const meta = session?.user?.user_metadata ?? {}
  const role = meta.role ?? 'staff'
  const name = meta.name ?? session?.user?.email ?? ''
  return { id: role, name, role, enriched: false }
}

// Enrich the user with orgId/staffId/houseId from the database in the background.
// A monotonic `seq` (compared against `seqRef.current`) ensures only the most
// recent enrich applies its result — stale concurrent runs are ignored.
// Always marks enriched:true so the app renders even if the profile fetch fails.
async function enrichUser(session, setUser, seq, seqRef) {
  const apply = (updater) => { if (seqRef.current === seq) setUser(updater) }
  const markDone = () => apply(prev => prev ? { ...prev, enriched: true } : null)
  if (!supabase || !session?.user) { markDone(); return }
  try {
    const profile = await fetchStaffProfile(session.user.id, session.user.email)
    if (profile) {
      const r = profile.role || quickUser(session).role
      apply(prev => prev ? { ...prev, ...profile, id: r, role: r, name: profile.name || prev.name, enriched: true } : null)
    } else {
      markDone()
    }
  } catch (e) {
    console.error('enrichUser failed:', e)
    markDone()
  }
}

// Shown when a user is authenticated but has no staff profile yet.
// Two paths depending on the role they signed up as (carried in JWT metadata):
//  - supervisor: create a brand-new organization
//  - staff: search for and join an existing organization
function NeedsSetupScreen({ user, onLinked, onLogout }) {
  // Default to the role carried in the JWT, but let the user switch — a supervisor
  // whose role wasn't detected must never get stranded on the "join" path.
  const [isSupervisor, setIsSupervisor] = useState(user.role === 'supervisor')
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [orgName, setOrgName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleJoin = async () => {
    if (!selectedOrg) return
    setBusy(true)
    const { error: e } = await registerAsStaff(selectedOrg.id, user.name)
    setBusy(false)
    if (e) { setError(`Could not link your account: ${e}`); return }
    onLinked()
  }

  const handleCreate = async () => {
    if (!orgName.trim()) return
    setBusy(true)
    const slug = toSlug(orgName) || `org-${Math.random().toString(36).slice(2, 8)}`
    const { error: e } = await createOrgAndSupervisor(orgName.trim(), slug, user.name)
    setBusy(false)
    if (e) { setError(`Could not create organization: ${e}`); return }
    onLinked()
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: '1px solid var(--a-line)', background: 'var(--a-card)',
    fontFamily: 'Geist, sans-serif', color: 'var(--a-ink)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--a-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="serif" style={{ fontSize: 26, letterSpacing: '-0.02em', marginBottom: 8 }}>
          One more step
        </div>
        <div style={{ fontSize: 14, color: 'var(--a-ink2)', marginBottom: 28, lineHeight: 1.6 }}>
          {isSupervisor
            ? <>Welcome, {user.name?.split(' ')[0] || 'there'}. Name your organization to finish setting up your account.</>
            : <>Welcome, {user.name?.split(' ')[0] || 'there'}. Search for your organization below to complete your account setup.</>}
        </div>

        {isSupervisor ? (
          <>
            <input type="text" placeholder="Organization name (e.g. Sunrise Care)" value={orgName}
              onChange={e => setOrgName(e.target.value)} autoFocus style={inputStyle} />
            {error && <div style={{ fontSize: 12.5, color: 'var(--a-clay)', marginTop: 10 }}>{error}</div>}
            <button onClick={handleCreate} disabled={!orgName.trim() || busy}
              style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 999, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, fontSize: 14, fontWeight: 600, fontFamily: 'Geist, sans-serif', cursor: orgName.trim() && !busy ? 'pointer' : 'default', opacity: orgName.trim() && !busy ? 1 : 0.5 }}>
              {busy ? 'Creating…' : 'Create organization'}
            </button>
          </>
        ) : (
          <>
            <OrgSearchPicker selected={selectedOrg} onSelect={setSelectedOrg} />
            {error && <div style={{ fontSize: 12.5, color: 'var(--a-clay)', marginTop: 10 }}>{error}</div>}
            <button onClick={handleJoin} disabled={!selectedOrg || busy}
              style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 999, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, fontSize: 14, fontWeight: 600, fontFamily: 'Geist, sans-serif', cursor: selectedOrg && !busy ? 'pointer' : 'default', opacity: selectedOrg && !busy ? 1 : 0.5 }}>
              {busy ? 'Joining…' : 'Join organization'}
            </button>
          </>
        )}

        <button onClick={() => { setIsSupervisor(s => !s); setError(null) }}
          style={{ width: '100%', marginTop: 16, padding: 0, background: 'transparent', border: 0, fontSize: 12.5, color: 'var(--a-ink3)', fontFamily: 'Geist, sans-serif', cursor: 'pointer', textAlign: 'center' }}>
          {isSupervisor
            ? 'Joining an existing organization instead? Search for it →'
            : 'Setting up a new organization? Create one instead →'}
        </button>

        <button onClick={onLogout}
          style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 999, background: 'transparent', border: '1px solid var(--a-line)', fontSize: 13, color: 'var(--a-ink3)', fontFamily: 'Geist, sans-serif', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!isDemoMode)
  const isMobile = useIsMobile(820)
  const lastUid = useRef(null)
  const sessionRef = useRef(null)
  const seqRef = useRef(0)            // guards against stale enrich results clobbering newer ones
  const signupActiveRef = useRef(false) // defers auto-enrich while a signup's registration RPC runs

  // Run enrichment as the single source of truth, bumping the sequence so older runs are ignored.
  const runEnrich = useCallback((session) => {
    const seq = ++seqRef.current
    enrichUser(session, setUser, seq, seqRef)
  }, [])

  // Called by the signup flow once its registration RPC has created the row.
  const retriggerEnrich = useCallback(() => {
    signupActiveRef.current = false
    if (!sessionRef.current) return
    setUser(prev => prev ? { ...prev, enriched: false } : null)
    runEnrich(sessionRef.current)
  }, [runEnrich])

  const startSignup  = useCallback(() => { signupActiveRef.current = true }, [])
  const cancelSignup = useCallback(() => { signupActiveRef.current = false }, [])

  useEffect(() => {
    if (isDemoMode) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        lastUid.current = session.user.id
        sessionRef.current = session
        setUser(quickUser(session))
        runEnrich(session)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        lastUid.current = null
        sessionRef.current = null
        setUser(null)
        setLoading(false)
        return
      }
      sessionRef.current = session
      if (session.user.id === lastUid.current) return
      lastUid.current = session.user.id
      setUser(quickUser(session))
      setLoading(false)
      // During signup, defer enrichment to retriggerEnrich (which runs after the
      // staff/org row is created) so the profile fetch doesn't race ahead of it.
      if (!signupActiveRef.current) runEnrich(session)
    })

    return () => subscription.unsubscribe()
  }, [runEnrich])

  const handleLogout = async () => {
    if (!isDemoMode && supabase) await supabase.auth.signOut()
    setUser(null)
  }

  if (loading || (user && !user.enriched && !isDemoMode)) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-bg)' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--a-line)', borderTopColor: 'var(--a-sage)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Authenticated but no org profile — sign-up via email confirmation, or a fresh account.
  if (user && user.enriched && !user.orgId && !isDemoMode) return (
    <NeedsSetupScreen user={user} onLinked={retriggerEnrich} onLogout={handleLogout} />
  )

  if (!user) return (
    <LoginScreen
      onLogin={setUser}
      onSignedUp={retriggerEnrich}
      onSignupStart={startSignup}
      onSignupCancel={cancelSignup}
    />
  )
  return isMobile
    ? <MobileShell user={user} onLogout={handleLogout} />
    : <DesktopShell user={user} onLogout={handleLogout} />
}
