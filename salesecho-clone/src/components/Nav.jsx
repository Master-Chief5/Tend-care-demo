import Logo from './Logo.jsx'
import { LANGS } from '../content.js'

export default function Nav({ lang, setLang, t, onSignIn }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo />
        <div className="nav-actions">
          <label className="lang-pill">
            <span className="globe" aria-hidden="true">🌐</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Language"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </label>
          <button className="signin-btn" onClick={onSignIn}>
            {t.nav.signIn}
          </button>
        </div>
      </div>
    </header>
  )
}
