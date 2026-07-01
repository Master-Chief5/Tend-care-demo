import { Component } from 'react'

// Catches render-time errors anywhere below it so a single broken screen can't
// blank out the whole app. Shows a calm Hearth-styled fallback with a Reload
// button and logs the error to the console for debugging.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'var(--a-bg)', fontFamily: 'Geist, sans-serif',
      }}>
        <div style={{
          width: '100%', maxWidth: 420, background: 'var(--a-card)',
          border: '1px solid var(--a-line)', borderRadius: 16, padding: '28px 24px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 34, marginBottom: 12 }} aria-hidden="true">🌿</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 700, color: 'var(--a-ink)' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 22px', fontSize: 14, lineHeight: 1.5, color: 'var(--a-ink3)' }}>
            This screen ran into a problem. Reloading usually clears it up — your
            data is safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              border: 0, borderRadius: 10, padding: '11px 22px', cursor: 'pointer',
              background: 'var(--a-sage)', color: '#fbf6ec', fontSize: 14, fontWeight: 600,
              fontFamily: 'Geist, sans-serif',
            }}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
