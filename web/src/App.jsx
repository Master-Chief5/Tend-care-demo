import { useState, useEffect } from 'react'
import { LoginScreen } from './components/layout/LoginScreen'
import { MobileShell } from './components/layout/MobileShell'
import { DesktopShell } from './components/layout/DesktopShell'
import { useIsMobile } from './hooks/useIsMobile'
import { supabase, isDemoMode } from './lib/supabase'

function userFromSession(session) {
  const meta = session?.user?.user_metadata ?? {}
  const role = meta.role ?? 'staff'
  const name = meta.name ?? session?.user?.email ?? ''
  return { id: role, name, role }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!isDemoMode)
  const isMobile = useIsMobile(820)

  useEffect(() => {
    if (isDemoMode) return

    // Restore existing session on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(userFromSession(session))
      setLoading(false)
    })

    // Keep user state in sync with auth events (tab focus, token refresh, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? userFromSession(session) : null)
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
