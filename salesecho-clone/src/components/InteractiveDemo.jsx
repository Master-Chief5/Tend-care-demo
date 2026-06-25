import { useState, useEffect, useRef } from 'react'
import { callScript } from '../content.js'

// A simulated live sales call. When the user starts the call, the scripted
// transcript plays out in real time and AI coaching cards pop into the side
// panel — demonstrating the before / during / after experience the product
// promises, with no backend required.
export default function InteractiveDemo({ lang, t }) {
  const script = callScript[lang]
  const d = t.demo

  const [status, setStatus] = useState('idle') // idle | running | paused | ended
  const [elapsed, setElapsed] = useState(0)
  const [shownLines, setShownLines] = useState([])
  const [coachCards, setCoachCards] = useState([])

  const timers = useRef([])
  const tickRef = useRef(null)
  const transcriptBox = useRef(null)
  const coachBox = useRef(null)

  const clearAll = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
  }

  useEffect(() => () => clearAll(), [])

  // Restart whenever the language changes mid-demo so script + UI stay in sync.
  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const reset = () => {
    clearAll()
    setStatus('idle')
    setElapsed(0)
    setShownLines([])
    setCoachCards([])
  }

  const start = () => {
    clearAll()
    setStatus('running')
    setElapsed(0)
    // Prep card appears immediately (the "Before" phase).
    setShownLines([])
    setCoachCards([{ id: 'prep', kind: 'prep', phase: script.prep.phase, title: script.prep.title, lines: script.prep.lines }])

    const startTime = Date.now()
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 250)

    const lastT = script.transcript[script.transcript.length - 1].t
    script.transcript.forEach((item, i) => {
      const id = setTimeout(() => {
        if (item.who === 'coach') {
          setCoachCards((c) => [...c, { id: `c${i}`, kind: item.kind, phase: item.phase, title: item.title, text: item.text }])
        } else {
          setShownLines((l) => [...l, { id: `l${i}`, who: item.who, text: item.text }])
        }
      }, item.t)
      timers.current.push(id)
    })

    // Summary + end after the last line.
    const endId = setTimeout(() => {
      setCoachCards((c) => [...c, { id: 'summary', kind: 'summary', phase: script.summary.phase, title: script.summary.title, lines: script.summary.lines }])
      setStatus('ended')
      if (tickRef.current) clearInterval(tickRef.current)
    }, lastT + 2200)
    timers.current.push(endId)
  }

  // Scroll the inner panels (not the page) so the latest line/card is visible.
  useEffect(() => {
    const el = transcriptBox.current
    if (el) el.scrollTop = el.scrollHeight
  }, [shownLines])
  useEffect(() => {
    const el = coachBox.current
    if (el) el.scrollTop = el.scrollHeight
  }, [coachCards])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="idemo">
      {/* Call panel */}
      <div className="idemo-call">
        <div className="idemo-callbar">
          <div className="idemo-parties">
            <span className="dot-live" data-on={status === 'running'} />
            <span className="idemo-calltitle">{d.callTitle}</span>
          </div>
          <span className="idemo-timer">{status === 'ended' ? d.ended : `${mm}:${ss}`}</span>
        </div>

        <div className="idemo-avatars">
          <div className="avatar avatar-you"><span>🧑‍💼</span><small>{d.you}</small></div>
          <div className="avatar avatar-prospect"><span>👩‍💼</span><small>{d.prospect}</small></div>
        </div>

        <div className="idemo-transcript" ref={transcriptBox}>
          {shownLines.length === 0 && status === 'idle' && (
            <div className="idemo-empty">▶ {d.start}</div>
          )}
          {shownLines.map((l) => (
            <div key={l.id} className={`bubble bubble-${l.who}`}>
              <span className="bubble-who">{l.who === 'you' ? d.you : 'Jordan'}</span>
              {l.text}
            </div>
          ))}
        </div>

        <div className="idemo-controls">
          {status === 'idle' && <button className="btn-dark" onClick={start}>▶ {d.start}</button>}
          {(status === 'running' || status === 'paused') && (
            <button className="btn-dark" onClick={reset}>↺ {d.restart}</button>
          )}
          {status === 'ended' && <button className="btn-dark" onClick={start}>↺ {d.restart}</button>}
        </div>
      </div>

      {/* Coaching panel */}
      <div className="idemo-coach">
        <div className="idemo-coach-head">
          <span className="spark">✨</span> {d.coachingTitle}
          <span className="idemo-private">🔒 private to you</span>
        </div>
        <div className="idemo-cards" ref={coachBox}>
          {coachCards.length === 0 && (
            <div className="idemo-empty small">AI tips appear here in real time.</div>
          )}
          {coachCards.map((c) => (
            <div key={c.id} className={`coach-card coach-${c.kind}`}>
              <div className="coach-phase">{c.phase}</div>
              <div className="coach-title">{c.title}</div>
              {c.text && <div className="coach-text">{c.text}</div>}
              {c.lines && (
                <ul className="coach-lines">
                  {c.lines.map((ln, i) => <li key={i}>{ln}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
