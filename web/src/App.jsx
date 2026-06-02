import { useState, useEffect, useRef, useCallback } from 'react'
import { LoginScreen } from './components/layout/LoginScreen'
import { MobileShell } from './components/layout/MobileShell'
import { DesktopShell } from './components/layout/DesktopShell'
import { useIsMobile } from './hooks/useIsMobile'
import { supabase, isDemoMode } from './lib/supabase'
import { fetchStaffProfile, registerAsStaff } from './lib/db'
import { OrgSearchPicker } from './components/layout/LoginScreen'

// Build a minimal user from the JWT immediately — no DB call, no delay.
function quickUser(session) {
  const meta = session?.user?.user_metadata ?? {}
  const role = meta.role ?? 'staff'
  const name = meta.name ?? session?.user?.email ?? ''
  return { id: role, name, role, enriched: false }
}

// Enrich the user with orgId/staffId/houseId from the database in the background.
// Always marks enriched:true so the app renders even if the profile fetch fails.
async function enrichUser(session, setUser) {
  const markDone = () => setUser(prev => prev ? { ...prev, enriched: true } : null)
  if (!supabase || !session?.user) { markDone(); return }
  try {
    const profile = await fetchStaffProfile(session.user.id, session.user.email)
    if (profile) {
      const r = profile.role || quickUser(session).role
      setUser(prev => prev ? { ...prev, ...profile, id: r, role: r, name: profile.name || prev.name, enriched: true } : null)
    } else {
      markDone()
    }
  } catch (e) {
    console.error('enrichUser failed:', e)
    markDone()
  }
}

// Shown when a user is authenticated but has no staff profile yet.
// This happens after email-confirmation signup where register_as_staff wasn't called yet.
function NeedsSetupScreen({ user, onLinked, onLogout }) {
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  const handleJoin = async () => {
    if (!selectedOrg) return
    setJoining(true)
    const result = await registerAsStaff(selectedOrg.id, user.name)
    setJoining(false)
    if (!result) { setError('Could not link your account. Please try again.'); return }
    onLinked()
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--a-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="serif" style={{ fontSize: 26, letterSpacing: '-0.02em', marginBottom: 8 }}>
          One more step
        </div>
        <div style={{ fontSize: 14, color: 'var(--a-ink2)', marginBottom: 28, lineHeight: 1.6 }}>
          Welcome, {user.name?.split(' ')[0] || 'there'}. Search for your organization below to complete your account setup.
        </div>
        <OrgSearchPicker selected={selectedOrg} onSelect={setSelectedOrg} />
        {error && <div style={{ fontSize: 12.5, color: 'var(--a-clay)', marginTop: 10 }}>{error}</div>}
        <button
          onClick={handleJoin}
          disabled={!selectedOrg || joining}
          style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 999, background: 'var(--a-ink)', color: 'var(--a-card)', border: 0, fontSize: 14, fontWeight: 600, fontFamily: 'Geist, sans-serif', cursor: selectedOrg && !joining ? 'pointer' : 'default', opacity: selectedOrg && !joining ? 1 : 0.5 }}
        >
          {joining ? 'Joining…' : 'Join organization'}
        </button>
        <button
          onClick={onLogout}
          style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 999, background: 'transparent', border: '1px solid var(--a-line)', fontSize: 13, color: 'var(--a-ink3)', fontFamily: 'Geist, sans-serif', cursor: 'pointer' }}
        >
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

  const retriggerEnrich = useCallback(() => {
    if (!sessionRef.current) return
    // Reset to not-enriched so the spinner shows while we re-fetch
    setUser(prev => prev ? { ...prev, enriched: false } : null)
    enrichUser(sessionRef.current, setUser)
  }, [])

  useEffect(() => {
    if (isDemoMode) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        lastUid.current = session.user.id
        sessionRef.current = session
        setUser(quickUser(session))
        enrichUser(session, setUser)
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
      enrichUser(session, setUser)
    })

    return () => subscription.unsubscribe()
  }, [])

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

  // Authenticated but no org profile — sign-up via email confirmation, or race condition.
  if (user && user.enriched && !user.orgId && !isDemoMode) return (
    <NeedsSetupScreen user={user} onLinked={retriggerEnrich} onLogout={handleLogout} />
  )

  if (!user) return <LoginScreen onLogin={setUser} onSignedUp={retriggerEnrich} />
  return isMobile
    ? <MobileShell user={user} onLogout={handleLogout} />
    : <DesktopShell user={user} onLogout={handleLogout} />
}
