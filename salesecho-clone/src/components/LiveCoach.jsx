import { useState, useRef, useEffect } from 'react'

// Live AI coaching: type (or pick) what the prospect just said and get a real
// Claude-generated coaching cue back. Falls back to canned cues if the backend
// has no ANTHROPIC_API_KEY configured.
export default function LiveCoach({ lang, t }) {
  const c = t.coach
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([]) // {who, text}
  const [cards, setCards] = useState([]) // {id, tip, source}
  const [loading, setLoading] = useState(false)
  const cardsBox = useRef(null)
  const idRef = useRef(0)

  useEffect(() => {
    const el = cardsBox.current
    if (el) el.scrollTop = el.scrollHeight
  }, [cards, loading])

  async function coach(line) {
    const prospectLine = (line ?? input).trim()
    if (!prospectLine || loading) return
    setInput('')
    const nextHistory = [...history, { who: 'prospect', text: prospectLine }]
    setHistory(nextHistory)
    setLoading(true)
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, prospectLine, history }),
      })
      const data = await res.json()
      const tip = data.tip || { title: 'Coach', kind: 'tip', text: '—' }
      setCards((cs) => [...cs, { id: ++idRef.current, prospectLine, tip, source: data.source }])
    } catch (e) {
      setCards((cs) => [...cs, {
        id: ++idRef.current,
        prospectLine,
        tip: { title: c.errorTitle, kind: 'warning', text: c.errorText },
        source: 'error',
      }])
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setHistory([]); setCards([]); setInput('')
  }

  return (
    <div className="coach-live">
      <div className="coach-live-head">
        <span className="spark">✨</span>
        <div>
          <strong>{c.title}</strong>
          <div className="coach-live-sub">{c.sub}</div>
        </div>
        {cards.length > 0 && (
          <button className="coach-reset" onClick={reset}>↺ {c.reset}</button>
        )}
      </div>

      <div className="coach-live-body">
        <div className="coach-cards-live" ref={cardsBox}>
          {cards.length === 0 && !loading && (
            <div className="idemo-empty small">{c.empty}</div>
          )}
          {cards.map((card) => (
            <div className="coach-exchange" key={card.id}>
              <div className="coach-prospect-line">
                <span className="bubble-who">Prospect</span>{card.prospectLine}
              </div>
              <div className={`coach-card coach-${card.tip.kind}`}>
                <div className="coach-phase">
                  {c.cueLabel}
                  <span className={`coach-src coach-src-${card.source}`}>
                    {card.source === 'claude' ? c.liveBadge : card.source === 'error' ? c.errBadge : c.fallbackBadge}
                  </span>
                </div>
                <div className="coach-title">{card.tip.title}</div>
                <div className="coach-text">{card.tip.text}</div>
              </div>
            </div>
          ))}
          {loading && <div className="coach-thinking">{c.thinking}</div>}
        </div>

        <div className="coach-quick">
          {c.quick.map((q, i) => (
            <button key={i} className="coach-chip" disabled={loading} onClick={() => coach(q)}>{q}</button>
          ))}
        </div>

        <form className="coach-input-row" onSubmit={(e) => { e.preventDefault(); coach() }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={c.placeholder}
            disabled={loading}
          />
          <button type="submit" className="btn-dark" disabled={loading || !input.trim()}>
            {loading ? c.coaching : c.button}
          </button>
        </form>
        <p className="coach-note">{c.note}</p>
      </div>
    </div>
  )
}
