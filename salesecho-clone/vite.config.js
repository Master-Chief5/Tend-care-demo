import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only middleware so POST /api/coach works under `npm run dev`
// (Vite doesn't run the Vercel serverless functions). In production, Vercel
// serves api/coach.js. Both share api/coach-core.js.
function devApi() {
  return {
    name: 'salesecho-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/coach', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let raw = ''
        req.on('data', (c) => (raw += c))
        req.on('end', async () => {
          try {
            const { getCoaching } = await server.ssrLoadModule('/api/coach-core.js')
            const result = await getCoaching(raw ? JSON.parse(raw) : {})
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(e?.message || e) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devApi()],
})
