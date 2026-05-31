import { useState, useEffect, useRef } from 'react'
import { LoginScreen } from './components/layout/LoginScreen'
import { MobileShell } from './components/layout/MobileShell'
import { DesktopShell } from './components/layout/DesktopShell'
import { useIsMobile } from './hooks/useIsMobile'
import { supabase, isDemoMode } from './lib/supabase'
import { fetchStaffProfile } from './lib/db'

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

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!isDemoMode)
  const isMobile = useIsMobile(820)
  const lastUid = useRef(null)

  useEffect(() => {
    if (isDemoMode) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        lastUid.current = session.user.id
        setUser(quickUser(session))
        enrichUser(session, setUser)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        lastUid.current = null
        setUser(null)
        setLoading(false)
        return
      }
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

  if (!user) return <LoginScreen onLogin={setUser} />
  return isMobile
    ? <MobileShell user={user} onLogout={handleLogout} />
    : <DesktopShell user={user} onLogout={handleLogout} />
}
