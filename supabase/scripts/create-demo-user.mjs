#!/usr/bin/env node
/**
 * Yerel geliştirme için deneme kullanıcısı oluşturur (varsa dokunmaz).
 * db reset auth.users tablosunu da sildiği için demo verisinden önce çalışır.
 */
import { execSync } from 'node:child_process'

const USERNAME = process.env.DEMO_USER ?? 'deneme'
const EMAIL = `${USERNAME}@cagdas.local`
const PASSWORD = process.env.DEMO_PASSWORD ?? 'deneme1234'

const status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8' }))
const res = await fetch(`${status.API_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    apikey: status.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: USERNAME, is_admin: false },
  }),
})

const body = await res.json()
if (res.ok) console.log(`✓ kullanıcı oluşturuldu: ${USERNAME} / ${PASSWORD}`)
else if (JSON.stringify(body).includes('already been registered')) console.log(`✓ kullanıcı zaten var: ${USERNAME}`)
else { console.error(body); process.exit(1) }
