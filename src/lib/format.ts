const TRY = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const TRY_COMPACT = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const NUM = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 })
const PRICE = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

/** 1234.5 -> "₺1.234,50" */
export function money(value: number | null | undefined): string {
  return TRY.format(Number(value ?? 0))
}

/** Grafik ekseni için kısa gösterim: 1234567 -> "₺1,2 Mn" */
export function moneyCompact(value: number | null | undefined): string {
  return TRY_COMPACT.format(Number(value ?? 0))
}

/** İşareti her zaman gösterir: +₺1.234,50 / -₺500,00 */
export function moneySigned(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  return `${n > 0 ? '+' : ''}${TRY.format(n)}`
}

/** Adet — gereksiz sıfırları atar */
export function qty(value: number | null | undefined): string {
  return NUM.format(Number(value ?? 0))
}

/** Birim fiyat — 2-4 basamak */
export function price(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return PRICE.format(Number(value))
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  return `${n > 0 ? '+' : ''}${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}%`
}

/** "2026-08-21" -> "21.08.2026" (saat dilimi kaymasız) */
export function date(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

/** "2026-08-01" -> "Ağustos 2026" */
export function month(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m] = value.slice(0, 10).split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

const MONTHS_SHORT = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
]

/** Grafik ekseni için kısa gösterim: "2026-08-01" -> "Ağu '26" */
export function monthShort(value: string | null | undefined): string {
  if (!value) return ''
  const [y, m] = value.slice(0, 10).split('-')
  return `${MONTHS_SHORT[Number(m) - 1]} '${y.slice(2)}`
}

/** "2026-08-17" -> "17.08.2026 haftası" */
export function week(value: string | null | undefined): string {
  if (!value) return '—'
  return `${date(value)} haftası`
}

/** Bugünün tarihi, yerel saate göre "YYYY-MM-DD" */
export function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Kâr/zarar rengi için Tailwind sınıfı */
export function pnlClass(value: number | null | undefined): string {
  const n = Number(value ?? 0)
  if (n > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (n < 0) return 'text-rose-600 dark:text-rose-400'
  return 'text-neutral-500 dark:text-neutral-400'
}

/** "1.234,56" veya "1234.56" -> 1234.56 (kullanıcı girişini normalize eder) */
export function parseNumber(input: string): number | null {
  const raw = input.trim()
  if (!raw) return null
  // Türkçe biçim: binlik "." ondalık "," — ikisi de varsa noktaları at
  const normalized =
    raw.includes(',') && raw.includes('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}
