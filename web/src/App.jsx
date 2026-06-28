import { useState, useEffect, useRef, useCallback } from 'react'
import { LoginScreen, OrgSearchPicker, HousePicker, toSlug } from './components/layout/LoginScreen'
import { MobileShell } from './components/layout/MobileShell'
import { DesktopShell } from './components/layout/DesktopShell'
import { useIsMobile } from './hooks/useIsMobile'
import { supabase, isDemoMode, isMisconfigured } from './lib/supabase'
import { fetchStaffProfile, registerAsStaff, createOrgAndSupervisor } from './lib/db'
import { setMyDuty } from './hooks/useDutyTracking'

// Build a minimal user from the JWT immediately — no DB call, no delay.
function quickUser(session) {
  const meta = session?.user?.user_metadata ?? {}
  const role = meta.role ?? 'staff'
  const name = meta.name ?? session?.user?.email ?? ''
  return { id: role, name, role, enriched: false }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Enrich the user with orgId/staffId/houseId from the database in the background.
// A monotonic `seq` (compared against `seqRef.current`) ensures only the most
// recent enrich applies its result — stale concurrent runs are ignored.
//
// Crucially, this distinguishes three outcomes so the app routes correctly:
//   • profile found        → fill in org/house/role
//   • genuinely no profile → enriched with no orgId → org-setup screen
//   • fetch error/timeout  → retry a few times, then flag profileError so the
//     app shows a "couldn't load your account" retry screen — NOT the org-setup
//     screen, which used to confusingly appear on any transient DB hiccup.
async function enrichUser(session, setUser, seq, seqRef) {
  const apply = (updater) => { if (seqRef.current === seq) setUser(updater) }
  if (!supabase || !session?.user) { apply(prev => prev ? { ...prev, enriched: true } : null); return }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const profile = await fetchStaffProfile(session.user.id, session.user.email)
      if (profile) {
        const r = profile.role || quickUser(session).role
        apply(prev => prev ? { ...prev, ...profile, id: r, role: r, name: profile.name || prev.name, enriched: true, profileError: false } : null)
      } else {
        // Authenticated but no staff row yet — a real "needs setup" state.
        apply(prev => prev ? { ...prev, enriched: true, profileError: false } : null)
      }
      return
    } catch (e) {
      if (attempt < 2) { await sleep(500 * (attempt + 1)); continue }
      console.error('enrichUser failed after retries:', e)
      apply(prev => prev ? { ...prev, enriched: true, profileError: true } : null)
    }
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
  const [selectedHouse, setSelectedHouse] = useState(null)
  const [orgHasHouses, setOrgHasHouses] = useState(null)
  const [orgName, setOrgName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleJoin = async () => {
    if (!selectedOrg) return
    if (orgHasHouses && !selectedHouse) { setError('Please pick the home you work at.'); return }
    setBusy(true)
    const { error: e } = await registerAsStaff(selectedOrg.id, user.name, selectedHouse?.id || null)
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
            <OrgSearchPicker selected={selectedOrg} onSelect={(o) => { setSelectedOrg(o); setSelectedHouse(null); setOrgHasHouses(null) }} />
            {selectedOrg && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--a-ink3)', marginBottom: 6, fontWeight: 500 }}>Which home do you work at?</div>
                <HousePicker orgId={selectedOrg.id} selected={selectedHouse} onSelect={setSelectedHouse} onAvailability={setOrgHasHouses} />
              </div>
            )}
            {error && <div style={{ fontSize: 12.5, color: 'var(--a-clay)', marginTop: 10 }}>{error}</div>}
            <button onClick={handleJoin} disabled={!selectedOrg || busy || (orgHasHouses && !selectedHouse)}
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

// Shown when a staff/manager is linked to an org but has NO house yet. Without a
// house, auth_house_id() is null and every house-scoped write (incidents,
// clock-in, daily log, schedule) silently fails RLS — so we block here with an
// honest prompt instead of letting them work into a void. Picking a home calls
// register_as_staff again, which fills the missing house (self-heal).
function AssignHouseScreen({ user, onAssigned, onLogout }) {
  const [selectedHouse, setSelectedHouse] = useState(null)
  const [orgHasHouses, setOrgHasHouses]   = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleAssign = async () => {
    if (!selectedHouse) return
    setBusy(true)
    const { error: e } = await registerAsStaff(user.orgId, user.name, selectedHouse.id)
    setBusy(false)
    if (e) { setError(`Could not assign your home: ${e}`); return }
    onAssigned()
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--a-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="serif" style={{ fontSize: 26, letterSpacing: '-0.02em', marginBottom: 8 }}>Pick your home</div>
        <div style={{ fontSize: 14, color: 'var(--a-ink2)', marginBottom: 24, lineHeight: 1.6 }}>
          Welcome, {user.name?.split(' ')[0] || 'there'}. You’re not assigned to a group home yet — choose where you work so your incidents, logs, and time punches save to the right place.
        </div>
        <HousePicker orgId={user.orgId} selected={selectedHouse} onSelect={setSelectedHouse} onAvailability={setOrgHasHouses} />
        {orgHasHouses === false && (
          <div style={{ fontSize: 12.5, color: 'var(--a-ink3)', marginTop: 12, lineHeight: 1.5 }}>
            No homes have been set up in your organization yet. Ask your supervisor to add one and assign you to it.
          </div>
        )}
        {error && <div style={{ fontSize: 12.5, color: 'var(--a-clay)', marginTop: 12 }}>{error}</div>}
        <button onClick={handleAssign} disabled={!selectedHouse || busy}
          style={{ width: '100%', marginTop: 18, padding: '12px', borderRadius: 999, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, fontSize: 14, fontWeight: 600, fontFamily: 'Geist, sans-serif', cursor: selectedHouse && !busy ? 'pointer' : 'default', opacity: selectedHouse && !busy ? 1 : 0.5 }}>
          {busy ? 'Saving…' : 'Continue'}
        </button>
        <button onClick={onLogout}
          style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 999, background: 'transparent', border: '1px solid var(--a-line)', fontSize: 13, color: 'var(--a-ink3)', fontFamily: 'Geist, sans-serif', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}

// Centered single-message screen used for fatal/holding states.
function CenteredNotice({ title, body, children }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--a-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="serif" style={{ fontSize: 24, letterSpacing: '-0.02em', marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--a-ink2)', lineHeight: 1.6, marginBottom: 20 }}>{body}</div>
        {children}
      </div>
    </div>
  )
}

// Shown when a production build has no Supabase credentials (and isn't an
// explicit demo). Better to say so loudly than to serve a fake demo login.
function MisconfiguredScreen() {
  return (
    <CenteredNotice
      title="App not configured"
      body="Tend can't reach its database — the Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are missing from this build. Set them in the hosting environment and redeploy. (To intentionally run the offline demo, set VITE_DEMO_MODE=true.)"
    />
  )
}

// Shown when the user is authenticated but their profile couldn't be loaded due
// to a transient error/timeout (vs. genuinely having no profile yet).
function ProfileErrorScreen({ onRetry, onLogout }) {
  const btn = { width: '100%', padding: '12px', borderRadius: 999, fontSize: 14, fontWeight: 600, fontFamily: 'Geist, sans-serif', cursor: 'pointer' }
  return (
    <CenteredNotice
      title="Couldn't load your account"
      body="We had trouble reaching the server to load your profile. Check your connection and try again."
    >
      <button onClick={onRetry} style={{ ...btn, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0 }}>Try again</button>
      <button onClick={onLogout} style={{ ...btn, marginTop: 10, background: 'transparent', border: '1px solid var(--a-line)', color: 'var(--a-ink3)' }}>Sign out</button>
    </CenteredNotice>
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

  // Retry profile enrichment after a transient load failure (profileError).
  const retryEnrich = useCallback(() => {
    if (!sessionRef.current) return
    setUser(prev => prev ? { ...prev, enriched: false, profileError: false } : null)
    runEnrich(sessionRef.current)
  }, [runEnrich])

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
    // End on-duty location sharing before signing out, so the person doesn't
    // linger as "on duty" on the supervisor's team map after they leave.
    try { await setMyDuty(user?.staffId, false) } catch { /* ignore */ }
    if (!isDemoMode && supabase) await supabase.auth.signOut()
    setUser(null)
  }

  // Production build with no database credentials → say so, never fake-demo.
  if (isMisconfigured) return <MisconfiguredScreen />

  if (loading || (user && !user.enriched && !isDemoMode)) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-bg)' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--a-line)', borderTopColor: 'var(--a-sage)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // Profile fetch failed (transient) — offer a retry instead of stranding the
  // user on the org-setup screen as if they had no organization.
  if (user && user.enriched && user.profileError && !isDemoMode) return (
    <ProfileErrorScreen onRetry={retryEnrich} onLogout={handleLogout} />
  )

  // Authenticated but no org profile — sign-up via email confirmation, or a fresh account.
  if (user && user.enriched && !user.orgId && !isDemoMode) return (
    <NeedsSetupScreen user={user} onLinked={retriggerEnrich} onLogout={handleLogout} />
  )

  // Linked to an org as staff/manager but assigned to NO house — block with an
  // honest "pick your home" prompt; otherwise every house-scoped write 403s while
  // the UI pretends it saved. Supervisors don't need a house, so they pass through.
  if (user && user.enriched && user.orgId && !user.houseId && user.role !== 'supervisor' && !isDemoMode) return (
    <AssignHouseScreen user={user} onAssigned={retriggerEnrich} onLogout={handleLogout} />
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
