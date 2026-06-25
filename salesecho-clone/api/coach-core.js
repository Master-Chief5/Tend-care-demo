// Shared coaching logic used by BOTH the Vercel serverless function (api/coach.js)
// and the Vite dev middleware (vite.config.js). Calls the real Claude API when
// ANTHROPIC_API_KEY is set; otherwise returns a heuristic fallback so the demo
// still works with zero configuration.
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM = {
  en: `You are SalesEcho, a real-time AI sales-call coach whispering to a sales rep mid-call.
The rep is on a live B2B sales call. Given the conversation so far and the prospect's latest line,
give ONE short, specific, actionable coaching cue for the rep's very next move.
Be concrete and tactical — name the exact question to ask or the exact reframe to use.
Keep "text" under 45 words. Never write what the rep should say verbatim in quotes longer than one sentence.
Pick "kind": "objection" if the prospect raised a concern/pushback, "good" if they gave a buying signal to capitalize on,
"warning" if the rep is at risk (talking too much, chasing, discounting early), otherwise "tip".`,
  es: `Eres SalesEcho, un coach de ventas con IA en tiempo real que susurra a un vendedor durante una llamada.
El vendedor está en una llamada de ventas B2B en vivo. Dada la conversación y la última frase del prospecto,
da UNA señal de coaching breve, específica y accionable para el siguiente movimiento del vendedor.
Sé concreto y táctico — nombra la pregunta exacta o el reencuadre exacto.
Mantén "text" en menos de 45 palabras. Responde en español.
Elige "kind": "objection" si el prospecto puso una objeción, "good" si dio una señal de compra,
"warning" si el vendedor está en riesgo (habla de más, persigue, descuenta pronto), de lo contrario "tip".`,
}

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A 2-5 word headline for the cue' },
    kind: { type: 'string', enum: ['tip', 'objection', 'good', 'warning'] },
    text: { type: 'string', description: 'The coaching cue, under 45 words' },
  },
  required: ['title', 'kind', 'text'],
  additionalProperties: false,
}

// Keyword-driven fallback so the demo is never broken without an API key.
function fallback(lang, prospectLine) {
  const l = (prospectLine || '').toLowerCase()
  const en = {
    price: { title: 'Price objection', kind: 'objection', text: 'Don\'t defend price — anchor on value. Ask what the problem is costing them per quarter, then frame cost against that number.' },
    competitor: { title: 'Competitor in play', kind: 'objection', text: 'Don\'t bash them. Position alongside: ask what their current tool does NOT do today, and aim at that gap.' },
    think: { title: 'Stall signal', kind: 'warning', text: '"Let me think about it" hides a real concern. Ask: "What specifically would you want to be sure of before moving forward?"' },
    interesting: { title: 'Buying signal 🎯', kind: 'good', text: 'They\'re leaning in. Trial-close now — propose a concrete next step (a 30-min technical walkthrough this week) while interest is high.' },
    busy: { title: 'Low time', kind: 'tip', text: 'Respect the clock. Ask one high-impact discovery question, then offer to book focused time rather than rushing the pitch.' },
  }
  const es = {
    price: { title: 'Objeción de precio', kind: 'objection', text: 'No defiendas el precio — ancla en el valor. Pregunta cuánto les cuesta el problema por trimestre y enmarca el costo frente a esa cifra.' },
    competitor: { title: 'Competidor presente', kind: 'objection', text: 'No lo critiques. Posiciónate al lado: pregunta qué NO hace su herramienta actual hoy y apunta a ese hueco.' },
    think: { title: 'Señal de freno', kind: 'warning', text: '"Déjame pensarlo" esconde una preocupación real. Pregunta: "¿De qué querrías estar seguro antes de avanzar?"' },
    interesting: { title: 'Señal de compra 🎯', kind: 'good', text: 'Están interesados. Haz un cierre de prueba — propón un paso concreto (una demo técnica de 30 min esta semana).' },
    busy: { title: 'Poco tiempo', kind: 'tip', text: 'Respeta el reloj. Haz una pregunta de descubrimiento de alto impacto y ofrece agendar tiempo enfocado.' },
  }
  const table = lang === 'es' ? es : en
  if (/(price|cost|expensive|budget|cre[oa]|precio|caro|presupuesto)/.test(l)) return { tip: table.price }
  if (/(gong|competitor|already use|other tool|competidor|ya usamos|otra herramienta)/.test(l)) return { tip: table.competitor }
  if (/(think about|not sure|maybe later|pensarlo|no estoy seguro)/.test(l)) return { tip: table.think }
  if (/(interesting|interested|love|tell me more|interesante|me interesa)/.test(l)) return { tip: table.interesting }
  if (/(busy|no time|minutes|ocupado|sin tiempo|minutos)/.test(l)) return { tip: table.busy }
  return { tip: lang === 'es'
    ? { title: 'Sigue descubriendo', kind: 'tip', text: 'Profundiza antes de presentar. Pregunta por el impacto: "¿Qué pasa si esto no se resuelve este trimestre?"' }
    : { title: 'Keep discovering', kind: 'tip', text: 'Don\'t pitch yet. Dig into impact: ask "What happens if this isn\'t solved this quarter?" before presenting a solution.' } }
}

export async function getCoaching({ lang = 'en', prospectLine = '', history = [] } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!prospectLine || !prospectLine.trim()) {
    return { ...fallback(lang, ''), source: 'fallback', reason: 'empty' }
  }
  if (!apiKey) {
    return { ...fallback(lang, prospectLine), source: 'fallback', reason: 'no-key' }
  }

  try {
    const client = new Anthropic({ apiKey })
    const convo = (history || [])
      .map((h) => `${h.who === 'you' ? 'Rep' : 'Prospect'}: ${h.text}`)
      .join('\n')
    const userMsg =
      (convo ? `Conversation so far:\n${convo}\n\n` : '') +
      `The prospect just said: "${prospectLine}"\n\nGive one coaching cue for the rep's next move.`

    const resp = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 500,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM[lang] || SYSTEM.en,
      messages: [{ role: 'user', content: userMsg }],
    })

    const text = resp.content.find((b) => b.type === 'text')?.text || ''
    const tip = JSON.parse(text)
    return { tip, source: 'claude' }
  } catch (e) {
    return { ...fallback(lang, prospectLine), source: 'fallback', reason: 'error', error: String(e?.message || e) }
  }
}
