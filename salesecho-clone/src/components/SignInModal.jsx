import { useState, useEffect } from 'react'
import Logo from './Logo.jsx'

export default function SignInModal({ open, onClose, t }) {
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) setSubmitted(false)
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const s = t.signin

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="modal-logo"><Logo size={44} /></div>
        <h2>{s.title}</h2>
        <p className="modal-sub">{s.sub}</p>

        {submitted ? (
          <div className="modal-success">✅ {s.demoNote}</div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
            className="modal-form"
          >
            <button type="button" className="google-btn" onClick={() => setSubmitted(true)}>
              <span aria-hidden="true">🔵</span> {s.google}
            </button>
            <div className="divider"><span>or</span></div>
            <label>
              {s.email}
              <input type="email" required placeholder="you@company.com" />
            </label>
            <label>
              {s.password}
              <input type="password" required placeholder="••••••••" />
            </label>
            <button type="submit" className="modal-submit">{s.button}</button>
            <p className="modal-foot">
              {s.noAccount} <a href="#pricing" onClick={onClose}>{s.signup}</a>
            </p>
            <p className="modal-note">{s.demoNote}</p>
          </form>
        )}
      </div>
    </div>
  )
}
