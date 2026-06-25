// Vercel serverless function: POST /api/coach
// Deployed automatically by Vercel from the api/ directory.
import { getCoaching } from './coach-core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    // req.body is parsed by Vercel when content-type is application/json,
    // but guard for the raw-string case too.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const result = await getCoaching(body)
    res.status(200).json(result)
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
}
