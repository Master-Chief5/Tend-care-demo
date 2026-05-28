import { useState, useEffect, useRef } from 'react'
import { LoginScreen } from './components/layout/LoginScreen'
import { MobileShell } from './components/layout/MobileShell'
import { DesktopShell } from './components/layout/DesktopShell'
import { useIsMobile } from './hooks/useIsMobile'
import { supabase, isDemoMode } from './lib/supabase'
import { fetchStaffProfile } from './lib/db'

async function buildUser(session) {
  const meta = session?.user?.user_metadata ?? {}
  const role = meta.role ?? 'staff'
  const name = meta.name ?? session?.user?.email ?? ''
  const base = { id: role, name, role }

  if (!supabase || !session?.user) return base

  try {
    const profile = await fetchStaffProfile(session.user.id, session.user.email)
    if (profile) {
      const r = profile.role || role
      return { ...base, ...profile, id: r, role: r, name: profile.name || name }
    }
  } catch (e) {
    console.error('profile lookup failed:', e)
  }

  return base
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!isDemoMode)
  const isMobile = useIsMobile(820)
  const lastUid = useRef(null)

  useEffect(() => {
    if (isDemoMode) return

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        lastUid.current = session.user.id
        setUser(await buildUser(session))
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        lastUid.current = null
        setUser(null)
        setLoading(false)
        return
      }
      if (session.user.id === lastUid.current) return
      lastUid.current = session.user.id
      setUser(await buildUser(session))
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    if (!isDemoMode && supabase) await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) return (
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
