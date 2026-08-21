#!/usr/bin/env node
/**
 * Eski sistemden alınan geçmiş verinin içe aktarımı.
 *
 * Kaynak: Geçmiş/ klasöründeki üç ekran görüntüsü (31 işlem + 4 nakit hareketi).
 *
 * Eski kayıtta hisse listesine elle ekleme yapılamadığı için listede olmayan
 * hisseler "XBANK" olarak girilip gerçek kod açıklamaya yazılmış. Burada
 * açıklamadaki gerçek koda çevriliyor; açıklaması olmayan tek çift ise
 * TANIMSIZ olarak bırakılıyor (uydurma yapılmıyor).
 *
 * Kullanım:
 *   node supabase/scripts/import-legacy.mjs <kullanıcıadı> [--temizle] [--kuru]
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ... <kullanıcıadı>
 */
import { execSync } from 'node:child_process'

const DOMAIN = 'cagdas.local'
const XBANK_NOT = 'Eski kayıtta XBANK olarak girilmişti'
const BELIRSIZ_NOT = 'Eski kayıtta XBANK, açıklama yok — hisse belirsiz'

const [username, ...flags] = process.argv.slice(2)
const temizle = flags.includes('--temizle')
const kuru = flags.includes('--kuru')

if (!username) {
  console.error('Kullanım: node supabase/scripts/import-legacy.mjs <kullanıcıadı> [--temizle] [--kuru]')
  process.exit(1)
}

/* ----------------------------------------------------------------- veriler */

const NAKIT = [
  { transaction_date: '2026-05-29', type: 'deposit', amount: 898602.0, bank: null, note: null },
  { transaction_date: '2026-07-29', type: 'deposit', amount: 100000.0, bank: null, note: null },
  { transaction_date: '2026-08-12', type: 'withdrawal', amount: 46600.0, bank: null, note: 'nakit çekildi' },
  { transaction_date: '2026-08-18', type: 'deposit', amount: 100000.0, bank: 'işbank', note: null },
]

// Tarih artan, aynı gün içinde alışlar önce (motor da bu sırayı uyguluyor)
const ISLEMLER = [
  ['2026-05-29', 'buy',  'SASA',     358009, 2.51,   null],
  ['2026-07-29', 'buy',  'SASA',      40025, 2.50,   null],
  ['2026-07-31', 'buy',  'SASA',         43, 2.45,   null],

  ['2026-08-07', 'buy',  'KCAER',      5000, 15.00,  null],
  ['2026-08-07', 'buy',  'KCAER',      1400, 14.98,  null],
  ['2026-08-07', 'buy',  'TUREX',     10000, 6.60,   null],
  ['2026-08-07', 'buy',  'ADEL',       9000, 3.34,   null],
  ['2026-08-07', 'sell', 'KCAER',      6400, 15.06,  null],
  ['2026-08-07', 'sell', 'SASA',      38077, 2.57,   'Satıştan a… (eski kayıtta not tam görünmüyordu)'],

  ['2026-08-10', 'buy',  'TANIMSIZ',   1500, 34.84,  BELIRSIZ_NOT],
  ['2026-08-10', 'buy',  'MARMR',     19272, 2.40,   XBANK_NOT],
  ['2026-08-10', 'buy',  'BIGCH',     10000, 6.53,   XBANK_NOT],
  ['2026-08-10', 'buy',  'TRALT',      1000, 52.80,  XBANK_NOT],
  ['2026-08-10', 'buy',  'KTLEV',      1000, 42.98,  null],
  ['2026-08-10', 'buy',  'ADEL',       7000, 3.28,   null],
  ['2026-08-10', 'buy',  'ISVEA',      1000, 45.40,  XBANK_NOT],
  ['2026-08-10', 'buy',  'DUNYH',       300, 146.20, XBANK_NOT],
  ['2026-08-10', 'sell', 'TUREX',     10000, 6.63,   null],
  ['2026-08-10', 'sell', 'TANIMSIZ',   1500, 34.92,  BELIRSIZ_NOT],
  ['2026-08-10', 'sell', 'MARMR',     19272, 2.47,   XBANK_NOT],
  ['2026-08-10', 'sell', 'BIGCH',     10000, 6.57,   XBANK_NOT],
  ['2026-08-10', 'sell', 'TRALT',      1000, 53.05,  XBANK_NOT],
  ['2026-08-10', 'sell', 'KTLEV',      1000, 43.14,  null],
  ['2026-08-10', 'sell', 'ISVEA',      1000, 45.72,  XBANK_NOT],
  ['2026-08-10', 'sell', 'DUNYH',       300, 146.50, XBANK_NOT],

  ['2026-08-18', 'buy',  'SASA',      44444, 2.25,   null],

  ['2026-08-19', 'buy',  'PATEK',       990, 19.70,  null],
  ['2026-08-19', 'buy',  'DARDL',     20000, 1.72,   null],
  ['2026-08-19', 'buy',  'DCTTR',      2500, 7.50,   XBANK_NOT],
  ['2026-08-19', 'sell', 'PATEK',       990, 20.04,  null],
  ['2026-08-19', 'sell', 'ADEL',      16000, 3.37,   null],
]

/* ------------------------------------------------------------- bağlantı */

let url = process.env.SUPABASE_URL
let key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  const status = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8' }))
  url = status.API_URL
  key = status.SERVICE_ROLE_KEY
  console.log('→ yerel Supabase:', url)
}
const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

async function api(path, init = {}) {
  const r = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...H, ...init.headers } })
  const metin = await r.text()
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${r.status}: ${metin}`)
  return metin ? JSON.parse(metin) : null
}

const tl = (n) => n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })

/* --------------------------------------------------------------- kontroller */

const alisTutari = ISLEMLER.filter((t) => t[1] === 'buy').reduce((s, t) => s + t[3] * t[4], 0)
const satisTutari = ISLEMLER.filter((t) => t[1] === 'sell').reduce((s, t) => s + t[3] * t[4], 0)
const giris = NAKIT.filter((c) => c.type === 'deposit').reduce((s, c) => s + c.amount, 0)
const cikis = NAKIT.filter((c) => c.type === 'withdrawal').reduce((s, c) => s + c.amount, 0)
const bakiye = giris - cikis - alisTutari + satisTutari

console.log(`\nİçe aktarılacak: ${ISLEMLER.length} işlem, ${NAKIT.length} nakit hareketi`)
console.log(`  alışlar : ${tl(alisTutari)}`)
console.log(`  satışlar: ${tl(satisTutari)}`)
console.log(`  nakit   : ${tl(giris)} giriş − ${tl(cikis)} çıkış`)
console.log(`  beklenen bakiye: ${tl(bakiye)}`)

if (bakiye < 0) {
  console.error('\n✗ Beklenen bakiye negatif — veri eksik olabilir. İçe aktarma durduruldu.')
  process.exit(1)
}
if (kuru) {
  console.log('\n(--kuru) Yalnızca kontrol yapıldı, hiçbir kayıt yazılmadı.')
  process.exit(0)
}

/* ------------------------------------------------------------------ aktarım */

const kullanicilar = await api(`profiles?select=id,username&username=eq.${username}`)
if (!kullanicilar?.length) throw new Error(`"${username}" kullanıcısı bulunamadı.`)
const userId = kullanicilar[0].id
console.log(`\nHedef hesap: ${username} (${userId})`)

if (temizle) {
  await api(`trades?user_id=eq.${userId}`, { method: 'DELETE' })
  await api(`cash_transactions?user_id=eq.${userId}`, { method: 'DELETE' })
  await api(`price_entries?user_id=eq.${userId}`, { method: 'DELETE' })
  console.log('✓ mevcut işlem, nakit ve fiyat kayıtları silindi')
}

// Hissesi belirsiz satırlar için kullanıcıya özel sembol
const mevcut = await api(`stocks?select=id&symbol=eq.TANIMSIZ&user_id=eq.${userId}`)
if (!mevcut?.length) {
  await api('stocks', {
    method: 'POST',
    body: JSON.stringify({
      symbol: 'TANIMSIZ',
      title: 'Tanımsız hisse (eski kayıtta XBANK)',
      user_id: userId,
    }),
  })
  console.log('✓ TANIMSIZ sembolü eklendi')
}

await api('cash_transactions', {
  method: 'POST',
  body: JSON.stringify(NAKIT.map((c) => ({ ...c, user_id: userId }))),
})
console.log(`✓ ${NAKIT.length} nakit hareketi yazıldı`)

// created_at sırayla artsın: aynı gün içindeki alışların kendi sırası korunur
const taban = Date.parse('2026-01-01T00:00:00Z')
let i = 0
for (const [trade_date, side, symbol, quantity, unit_price, note] of ISLEMLER) {
  await api('trades', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      trade_date,
      side,
      symbol,
      quantity,
      unit_price,
      commission: 0, // eski sistemde komisyon tutulmuyordu
      note,
      created_at: new Date(taban + i * 1000).toISOString(),
    }),
  })
  i += 1
  process.stdout.write(`\r✓ ${i}/${ISLEMLER.length} işlem yazıldı`)
}
console.log()

/* ---------------------------------------------------------------- doğrulama */

const cuzdan = await api(`wallet_balance?select=*&user_id=eq.${userId}`)
const pozisyonlar = await api(`positions?select=symbol,quantity,avg_cost,total_cost&user_id=eq.${userId}&order=symbol`)
const hisseler = await api(`symbol_analysis?select=symbol,realized_net,open_qty&user_id=eq.${userId}&order=realized_net.desc`)

console.log(`\nCüzdan bakiyesi : ${tl(Number(cuzdan[0].balance))}`)
console.log(`Beklenen        : ${tl(bakiye)}`)
console.log(
  Math.abs(Number(cuzdan[0].balance) - bakiye) < 0.02
    ? '✓ bakiye tutuyor'
    : '✗ BAKİYE TUTMUYOR',
)

console.log('\nAçık pozisyonlar:')
for (const p of pozisyonlar) {
  console.log(
    `  ${p.symbol.padEnd(9)} ${Number(p.quantity).toLocaleString('tr-TR').padStart(12)} adet` +
      `  ort. ${Number(p.avg_cost).toFixed(4).padStart(10)}  = ${tl(Number(p.total_cost))}`,
  )
}

console.log('\nGerçekleşen kâr/zarar (hisse bazlı):')
for (const h of hisseler) {
  if (Number(h.realized_net) === 0) continue
  console.log(`  ${h.symbol.padEnd(9)} ${tl(Number(h.realized_net)).padStart(16)}`)
}
