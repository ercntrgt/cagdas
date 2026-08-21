#!/usr/bin/env node
/**
 * KAP'tan (Kamuyu Aydınlatma Platformu) BIST'te işlem gören tüm şirketleri çeker
 * ve supabase/migrations/0005_seed_stocks.sql dosyasını üretir.
 *
 * Kullanım:  npm run seed:symbols
 *
 * Liste güncellendiğinde (yeni halka arz vb.) tekrar çalıştırıp migration'ı
 * yeniden uygulamak yeterlidir — dosya idempotent (ON CONFLICT DO UPDATE).
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const KAP_URL = 'https://www.kap.org.tr/tr/bist-sirketler'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations/0005_seed_stocks.sql')

const html = await fetch(KAP_URL, {
  headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'tr-TR,tr;q=0.9' },
  signal: AbortSignal.timeout(30_000),
}).then((r) => {
  if (!r.ok) throw new Error(`KAP ${r.status} döndü`)
  return r.text()
})

// Next.js RSC payload parçalarını birleştir (self.__next_f.push([1,"..."]))
const payload = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\[\s\S])*")\]\)/g)]
  .map((m) => JSON.parse(m[1]))
  .join('')

// Şirket kayıtları: {"mkkMemberOid":"...","kapMemberTitle":"...",...,"stockCode":"XXXX",...}
const records = []
for (const m of payload.matchAll(/\{"mkkMemberOid":"[^{}]*?\}/g)) {
  try {
    const r = JSON.parse(m[0])
    if (r.stockCode && r.kapMemberTitle) records.push(r)
  } catch {
    /* bozuk parça — atla */
  }
}

if (records.length < 400) {
  throw new Error(
    `Beklenenden az şirket bulundu (${records.length}). KAP sayfa yapısı değişmiş olabilir; ` +
      `mevcut migration dosyası korundu.`,
  )
}

// "AKM, AKMEN" gibi çok kodlu şirketleri ayrı sembollere böl
const bySymbol = new Map()
for (const r of records) {
  for (const raw of String(r.stockCode).split(',')) {
    const symbol = raw.trim().toUpperCase()
    if (!symbol) continue
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, { symbol, title: r.kapMemberTitle.trim(), city: (r.cityName || '').trim() })
    }
  }
}

const rows = [...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol, 'tr'))
const q = (v) => (v ? `'${String(v).replace(/'/g, "''")}'` : 'null')

const sql = `-- ============================================================================
-- BIST sembol listesi — KAP'tan otomatik üretildi (${rows.length} sembol / ${records.length} şirket)
-- Kaynak: ${KAP_URL}
-- Yeniden üretmek için: npm run seed:symbols
-- BU DOSYAYI ELLE DÜZENLEMEYİN.
-- ============================================================================

insert into public.stocks (symbol, title, city, user_id) values
${rows.map((r) => `  (${q(r.symbol)}, ${q(r.title)}, ${q(r.city)}, null)`).join(',\n')}
on conflict (symbol) where user_id is null
do update set title = excluded.title, city = excluded.city;
`

writeFileSync(OUT, sql, 'utf8')
console.log(`✓ ${rows.length} sembol (${records.length} şirket) yazıldı -> ${OUT}`)
