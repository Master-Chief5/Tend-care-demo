import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasCreds     = !!(supabaseUrl && supabaseKey)
const explicitDemo = import.meta.env.VITE_DEMO_MODE === 'true'

// supabase is null when env vars aren't set.
export const supabase = hasCreds ? createClient(supabaseUrl, supabaseKey) : null

// Demo mode is for explicit demos (VITE_DEMO_MODE=true) or local dev without
// credentials. A *production* build with no credentials is NOT silently demoted
// to demo — that would hand real users a fake login. It's flagged as
// misconfigured so the app can show a clear setup error instead (see App.jsx).
export const isMisconfigured = import.meta.env.PROD && !explicitDemo && !hasCreds
export const isDemoMode = explicitDemo || (!hasCreds && !import.meta.env.PROD)
