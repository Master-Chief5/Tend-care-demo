// Creates the 3 demo accounts in your Supabase project.
//
// Before running:
//   Supabase dashboard → Authentication → Providers → Email
//   → turn OFF "Confirm email" (so accounts are active immediately)
//
// Run once:
//   node scripts/seed-users.js
//
// After running you can re-enable email confirmation if you want.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ztatmhxvvthlevddqqdl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0YXRtaHh2dnRobGV2ZGRxcWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5Mjg2MjIsImV4cCI6MjA5NTUwNDYyMn0.JFclJV5G87fuPeY2nImbHUgFlF4_5l-d29GWysmH7mU'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const DEMO_USERS = [
  { email: 'lina@tendcare.app',  password: 'TendCare2025!', role: 'supervisor', name: 'Lina R.' },
  { email: 'devon@tendcare.app', password: 'TendCare2025!', role: 'manager',    name: 'Devon P.' },
  { email: 'aisha@tendcare.app', password: 'TendCare2025!', role: 'staff',      name: 'Aisha M.' },
]

for (const u of DEMO_USERS) {
  const { error } = await supabase.auth.signUp({
    email: u.email,
    password: u.password,
    options: { data: { role: u.role, name: u.name } },
  })
  if (error) {
    console.error(`✗ ${u.email}:`, error.message)
  } else {
    console.log(`✓ ${u.email}  (${u.role})`)
  }
}

console.log('\nDone. Users can now sign in at the app with password: TendCare2025!')
