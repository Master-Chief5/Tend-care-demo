import { useState } from 'react'
import { LoginScreen } from './components/layout/LoginScreen'
import { MobileShell } from './components/layout/MobileShell'
import { DesktopShell } from './components/layout/DesktopShell'
import { useIsMobile } from './hooks/useIsMobile'

export default function App() {
  const [user, setUser] = useState(null)
  const isMobile = useIsMobile(820)

  if (!user) return <LoginScreen onLogin={setUser} />
  return isMobile
    ? <MobileShell user={user} onLogout={() => setUser(null)} />
    : <DesktopShell user={user} onLogout={() => setUser(null)} />
}
