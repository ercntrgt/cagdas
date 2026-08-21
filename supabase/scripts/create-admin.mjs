#!/usr/bin/env node
/**
 * Yönetici (veya normal) kullanıcı oluşturur / şifresini günceller.
 *
 * Yerelde:  node supabase/scripts/create-admin.mjs <kullanıcıadı> <şifre> [--user]
 * Bulutta:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ... <ad> <şifre>
 *
 * Uygulama e-posta kullanmadığı için kullanıcı adı <ad>@cagdas.local adresine
 * eşlenir ve hesap doğrulanmış olarak açılır — e-posta gönderilmez.
 */
import { execSync } from 'node:child_process'

const DOMAIN = 'cagdas.local'
const [username, password, ...flags] = process.argv.slice(2)
const isAdmin = !flags.includes('--user')

if (!username || !password) {
  console.error('Kullanım: node supabase/scripts/create-admin.mjs <kullanıcıadı> <şifre> [--user]')
  process.exit(1)
}
if (!/^[a-z0-9_]{3,32}$/.test(username)) {
  console.error('Kullanıcı adı 3-32 karakter olmalı; küçük harf, rakam ve alt çizgi.')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Şifre en az 8 karakter olmalı.')
  process.exit(1)
}

let url = process.env.SUPABASE_URL
let key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  const status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8' }))
  url = status.API_URL
  key = status.SERVICE_ROLE_KEY
  console.log('→ yerel Supabase kullanılıyor:', url)
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
}
const email = `${username}@${DOMAIN}`

const created = await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, is_admin: isAdmin },
  }),
})
const body = await created.json()

if (created.ok) {
  console.log(`✓ oluşturuldu: ${username} (${isAdmin ? 'yönetici' : 'kullanıcı'})`)
  process.exit(0)
}

if (!JSON.stringify(body).includes('already been registered')) {
  console.error('Hata:', body)
  process.exit(1)
}

// Zaten varsa: şifreyi ve yetkiyi güncelle
const list = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers })
const { users } = await list.json()
const existing = users.find((u) => u.email === email)
if (!existing) {
  console.error(`"${username}" kayıtlı görünüyor ama bulunamadı.`)
  process.exit(1)
}

const updated = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ password, user_metadata: { username, is_admin: isAdmin } }),
})
if (!updated.ok) {
  console.error('Hata:', await updated.json())
  process.exit(1)
}

// user_metadata profili güncellemez; profiles satırını da hizala
const patched = await fetch(`${url}/rest/v1/profiles?id=eq.${existing.id}`, {
  method: 'PATCH',
  headers: { ...headers, Prefer: 'return=minimal' },
  body: JSON.stringify({ username, is_admin: isAdmin }),
})
console.log(
  patched.ok
    ? `✓ güncellendi: ${username} (${isAdmin ? 'yönetici' : 'kullanıcı'}) — şifre yenilendi`
    : `✓ şifre yenilendi: ${username} (profil güncellenemedi: ${patched.status})`,
)
