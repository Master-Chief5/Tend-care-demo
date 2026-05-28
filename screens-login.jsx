// screens-login.jsx — Demo login screen

function LoginScreen({ onLogin }) {
  return (
    <div style={{
      width: '100%', height: '100dvh', background: 'var(--a-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', fontFamily: 'Geist, system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: 8 }}>
          <TendLogo size={18} />
        </div>
        <p className="serif" style={{ fontSize: 14, color: 'var(--a-ink3)', margin: '0 0 32px', fontStyle: 'italic' }}>
          care operations · demo
        </p>

        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--a-ink3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Sign in as
        </div>

        {ROLES.map(r => <AccountButton key={r.id} user={r} onLogin={onLogin} />)}

        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--a-ink3)', textAlign: 'center' }}>
          Demo mode · no real data is stored
        </div>
      </div>
    </div>
  );
}

function AccountButton({ user, onLogin }) {
  const [hov, setHov] = useState(false);
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
        transition: 'background 0.12s', fontFamily: 'Geist',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '50%', background: user.color,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 15, flexShrink: 0,
      }}>
        {user.initial}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--a-ink)' }}>{user.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--a-ink3)', marginTop: 2 }}>{user.role}</div>
      </div>
      <IconArrow size={16} color="var(--a-ink3)" />
    </button>
  );
}

Object.assign(window, { LoginScreen, AccountButton });
