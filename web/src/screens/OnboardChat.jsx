export function ScreenA_Chat() {
  return (
    <div className="phone-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 32 }}>💬</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--a-ink)' }}>Team Chat</div>
      <div style={{ fontSize: 13.5, color: 'var(--a-ink3)', lineHeight: 1.6, maxWidth: 280 }}>
        End-to-end encrypted messaging is coming soon. Messages will be live and never stored on any server.
      </div>
      <div style={{ fontSize: 11, color: 'var(--a-ink3)', background: 'var(--a-paper)', border: '1px solid var(--a-line)', borderRadius: 999, padding: '4px 14px', marginTop: 8 }}>
        Coming soon
      </div>
    </div>
  )
}
