import { useState } from 'react'
import { content } from './content.js'
import Nav from './components/Nav.jsx'
import SignInModal from './components/SignInModal.jsx'
import InteractiveDemo from './components/InteractiveDemo.jsx'

function IntegrationChips() {
  return (
    <span className="chips">
      <span className="chip" title="Google Meet">📹</span>
      <span className="chip" title="Zoom">🎦</span>
      <span className="chip" title="Microsoft Teams">👥</span>
    </span>
  )
}

function Hero({ t, onPrimary, onSecondary }) {
  const h = t.hero
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true" />
      <div className="container hero-inner">
        <h1 className="hero-title">
          {h.title.map((line, i) => (
            <span key={i} className="hero-line">
              {line}{i === h.title.length - 1 && <span className="rocket"> {h.rocket}</span>}
            </span>
          ))}
        </h1>
        <p className="hero-sub">
          {h.sub.map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
          )}
        </p>

        <div className="hero-ctas">
          <button className="btn-dark btn-lg" onClick={onPrimary}>
            {h.primary} {h.primaryEmoji} <span className="arrow">→</span>
          </button>
          <button className="btn-outline btn-lg" onClick={onSecondary}>
            {h.secondary} {h.secondaryEmoji}
          </button>
        </div>

        <div className="hero-trial"><span className="check">✓</span> {h.trial}</div>
        <div className="hero-works">
          {h.worksWith} <IntegrationChips /> {h.more}
        </div>

        <a href="#demo" className="see-how">
          <span className="see-how-text">{h.seeHow}</span>
          <span className="squiggle" aria-hidden="true">⌇</span>
          <span className="see-how-arrow" aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  )
}

function DemoSection({ lang, t }) {
  const [tab, setTab] = useState('interactive')
  const d = t.demo
  return (
    <section className="demo" id="demo">
      <div className="container">
        <div className="demo-tabs" role="tablist">
          <button
            role="tab"
            className={`demo-tab ${tab === 'video' ? 'active' : ''}`}
            onClick={() => setTab('video')}
          >
            📺 {d.videoTab}
          </button>
          <button
            role="tab"
            className={`demo-tab ${tab === 'interactive' ? 'active' : ''}`}
            onClick={() => setTab('interactive')}
          >
            🎮 {d.interactiveTab}
          </button>
        </div>

        {tab === 'video' ? (
          <div className="video-demo">
            <div className="video-frame">
              <button className="video-play" aria-label={d.playLabel}>▶</button>
              <div className="video-shimmer" aria-hidden="true" />
            </div>
            <h3>{d.videoTitle}</h3>
            <p>{d.videoSub}</p>
            <button className="link-btn" onClick={() => setTab('interactive')}>{d.tryLabel}</button>
          </div>
        ) : (
          <InteractiveDemo lang={lang} t={t} />
        )}
      </div>
    </section>
  )
}

function Features({ t }) {
  const f = t.features
  return (
    <section className="features" id="features">
      <div className="container">
        <h2 className="section-h">{f.heading}</h2>
        <p className="section-sub">{f.sub}</p>
        <div className="feature-grid">
          {f.items.map((it, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{it.icon}</div>
              <h3>{it.title}</h3>
              <p>{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks({ t }) {
  const h = t.how
  return (
    <section className="how">
      <div className="container">
        <h2 className="section-h">{h.heading}</h2>
        <div className="how-grid">
          {h.steps.map((s, i) => (
            <div className="how-step" key={i}>
              <div className="how-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing({ t, onPick }) {
  const [cycle, setCycle] = useState('monthly')
  const p = t.pricing
  return (
    <section className="pricing" id="pricing">
      <div className="container">
        <h2 className="section-h">{p.heading}</h2>
        <p className="section-sub">{p.sub}</p>

        <div className="cycle-toggle">
          <button className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>{p.monthly}</button>
          <button className={cycle === 'yearly' ? 'on' : ''} onClick={() => setCycle('yearly')}>
            {p.yearly} <span className="save">{p.yearlyNote}</span>
          </button>
        </div>

        <div className="price-grid">
          {p.plans.map((plan, i) => (
            <div className={`price-card ${plan.featured ? 'featured' : ''}`} key={i}>
              {plan.featured && <div className="badge">★</div>}
              <h3>{plan.name}</h3>
              <div className="price">
                {plan.price[cycle] == null
                  ? <span className="price-custom">{p.contact}</span>
                  : <><span className="amount">${plan.price[cycle]}</span><span className="per">{p.perMonth}</span></>}
              </div>
              <p className="price-tag">{plan.tagline}</p>
              <ul className="price-feats">
                {plan.features.map((ft, j) => <li key={j}><span className="tick">✓</span> {ft}</li>)}
              </ul>
              <button
                className={plan.featured ? 'btn-dark full' : 'btn-outline full'}
                onClick={onPick}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials({ t }) {
  const tm = t.testimonials
  return (
    <section className="testimonials">
      <div className="container">
        <h2 className="section-h">{tm.heading}</h2>
        <div className="t-grid">
          {tm.items.map((it, i) => (
            <figure className="t-card" key={i}>
              <div className="stars">★★★★★</div>
              <blockquote>“{it.quote}”</blockquote>
              <figcaption><strong>{it.name}</strong><span>{it.role}</span></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ({ t }) {
  const [open, setOpen] = useState(0)
  const f = t.faq
  return (
    <section className="faq">
      <div className="container narrow">
        <h2 className="section-h">{f.heading}</h2>
        <div className="faq-list">
          {f.items.map((it, i) => (
            <div className={`faq-item ${open === i ? 'open' : ''}`} key={i}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                {it.q}<span className="faq-icon">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <div className="faq-a">{it.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ t, onClick }) {
  const c = t.cta
  return (
    <section className="final-cta">
      <div className="container">
        <h2>{c.heading}</h2>
        <p>{c.sub}</p>
        <button className="btn-light btn-lg" onClick={onClick}>{c.button} 🎯 <span className="arrow">→</span></button>
      </div>
    </section>
  )
}

function Footer({ t }) {
  const f = t.footer
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="logo">
            <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="48" fill="#fff" />
              <g fill="#111">
                <rect x="28" y="42" width="7" height="16" rx="3.5" />
                <rect x="40" y="30" width="7" height="40" rx="3.5" />
                <rect x="52" y="24" width="7" height="52" rx="3.5" />
                <rect x="64" y="38" width="7" height="24" rx="3.5" />
              </g>
            </svg>
            <span className="logo-word light">SalesEcho</span>
          </span>
          <p>{f.tagline}</p>
        </div>
        {f.cols.map((col, i) => (
          <div className="footer-col" key={i}>
            <h4>{col.title}</h4>
            <ul>{col.links.map((l, j) => <li key={j}><a href="#">{l}</a></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} SalesEcho. {f.rights}</span>
        <span className="disclaimer">{f.disclaimer}</span>
      </div>
    </footer>
  )
}

export default function App() {
  const [lang, setLang] = useState('en')
  const [signInOpen, setSignInOpen] = useState(false)
  const t = content[lang]

  const goPricing = () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="app">
      <Nav lang={lang} setLang={setLang} t={t} onSignIn={() => setSignInOpen(true)} />
      <main>
        <Hero t={t} onPrimary={goPricing} onSecondary={() => setSignInOpen(true)} />
        <DemoSection lang={lang} t={t} />
        <Features t={t} />
        <HowItWorks t={t} />
        <Pricing t={t} onPick={() => setSignInOpen(true)} />
        <Testimonials t={t} />
        <FAQ t={t} />
        <FinalCTA t={t} onClick={goPricing} />
      </main>
      <Footer t={t} />
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} t={t} />
    </div>
  )
}
