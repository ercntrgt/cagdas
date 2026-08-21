'use client'

import type { ReactNode } from 'react'
import { money, moneyCompact } from '@/lib/format'

/** Ortak eksen/ızgara ayarları — ızgara ve eksen geri planda kalır. */
export const AXIS = {
  tick: { fill: 'var(--viz-ink)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export const GRID = {
  stroke: 'var(--viz-grid)',
  strokeDasharray: '0',
  vertical: false,
} as const

export function yTickMoney(value: number) {
  return moneyCompact(value)
}

/** Yalnızca istenen köşeleri yuvarlatılmış dikdörtgen yolu. */
function roundedPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  [tl, tr, br, bl]: [boolean, boolean, boolean, boolean],
): string {
  return [
    `M${x + (tl ? r : 0)},${y}`,
    `H${x + w - (tr ? r : 0)}`,
    tr ? `A${r},${r} 0 0 1 ${x + w},${y + r}` : '',
    `V${y + h - (br ? r : 0)}`,
    br ? `A${r},${r} 0 0 1 ${x + w - r},${y + h}` : '',
    `H${x + (bl ? r : 0)}`,
    bl ? `A${r},${r} 0 0 1 ${x},${y + h - r}` : '',
    `V${y + (tl ? r : 0)}`,
    tl ? `A${r},${r} 0 0 1 ${x + r},${y}` : '',
    'Z',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Veri ucu 4px yuvarlatılmış, taban çizgisine sabitlenen çubuk.
 * Sıfır çizgisine değen uç köşeli kalır; yuvarlanan uç değerin yönünü gösterir.
 */
export function RoundedBar(props: {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  value?: number | number[]
  axisDir?: 'vertical' | 'horizontal'
}) {
  const { fill, axisDir = 'vertical' } = props
  if (!props.width || !props.height) return null

  // Recharts sıfırın altındaki çubuklarda x/y'yi sıfır çizgisine koyup
  // genişliği (veya yüksekliği) NEGATİF verir — önce dikdörtgeni normalize et.
  let x = Number(props.x ?? 0)
  let y = Number(props.y ?? 0)
  let width = Number(props.width)
  let height = Number(props.height)
  if (width < 0) {
    x += width
    width = -width
  }
  if (height < 0) {
    y += height
    height = -height
  }

  const raw = Array.isArray(props.value) ? props.value[1] : props.value
  const negative = Number(raw ?? 0) < 0
  const r = Math.max(0, Math.min(4, width / 2, height / 2))

  const corners: [boolean, boolean, boolean, boolean] =
    axisDir === 'horizontal'
      ? negative
        ? [true, false, false, true]   // sola uzanır -> sol uç yuvarlak
        : [false, true, true, false]   // sağa uzanır -> sağ uç yuvarlak
      : negative
        ? [false, false, true, true]   // aşağı iner -> alt uç yuvarlak
        : [true, true, false, false]   // yukarı çıkar -> üst uç yuvarlak

  return <path d={roundedPath(x, y, width, height, r, corners)} fill={fill} />
}

/**
 * Çubuğun dış ucuna yazılan işaretli değer etiketi.
 * İşaret yalnızca renkle taşınmasın diye zorunlu (renk körlüğü erişilebilirliği).
 */
export function SignedLabel({
  axisDir = 'vertical',
  format,
  ...props
}: {
  /** Recharts LabelList bu alanları string ya da number verebiliyor. */
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  value?: number | string | boolean | null
  axisDir?: 'vertical' | 'horizontal'
  format: (value: number) => string
}) {
  let x = Number(props.x ?? 0)
  let y = Number(props.y ?? 0)
  let width = Number(props.width ?? 0)
  let height = Number(props.height ?? 0)
  const value = Number(props.value ?? 0)
  if (!Number.isFinite(value) || !Number.isFinite(x) || !Number.isFinite(y)) return null

  // Çubukla aynı normalizasyon (bkz. RoundedBar)
  if (width < 0) {
    x += width
    width = -width
  }
  if (height < 0) {
    y += height
    height = -height
  }

  const negative = value < 0
  const text = format(value)

  const position =
    axisDir === 'horizontal'
      ? {
          x: negative ? x - 6 : x + width + 6,
          y: y + height / 2 + 3,
          anchor: negative ? ('end' as const) : ('start' as const),
        }
      : {
          x: x + width / 2,
          y: negative ? y + height + 12 : y - 6,
          anchor: 'middle' as const,
        }

  return (
    <text
      x={position.x}
      y={position.y}
      textAnchor={position.anchor}
      fill="var(--muted)"
      fontSize={10}
    >
      {text}
    </text>
  )
}

/* ---------------------------------------------------------------- Tooltip */

export function TooltipBox({ title, rows }: { title: ReactNode; rows: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium">{title}</p>
      <table className="tnum">
        <tbody>{rows}</tbody>
      </table>
    </div>
  )
}

export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string
  label: string
  value: string
}) {
  return (
    <tr>
      <td className="pr-2 align-middle">
        {color ? (
          <span
            className="inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: color }}
          />
        ) : null}
      </td>
      <td className="pr-3 text-[var(--muted)]">{label}</td>
      <td className="text-right font-medium">{value}</td>
    </tr>
  )
}

export function moneyRow(label: string, value: number, color?: string) {
  return <TooltipRow key={label} color={color} label={label} value={money(value)} />
}

/* ------------------------------------------------------------------ Boş hâl */

export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-56 items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
      {children}
    </div>
  )
}

/**
 * Eksen için "düzgün" adım ve tick'ler üretir; min<=0<=max olduğunda
 * sıfır her zaman bir tick olur (ıraksak grafiklerde taban çizgisi okunabilsin).
 * domain, etiketlerin eksene girmemesi için adımın bir kısmı kadar geniş tutulur.
 */
export function niceScale(min: number, max: number, targetTicks = 5) {
  const lo0 = Math.min(0, min)
  const hi0 = Math.max(0, max)
  const span = hi0 - lo0 || 1
  const rawStep = span / (targetTicks - 1)
  const mag = 10 ** Math.floor(Math.log10(rawStep))
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) ?? 10 * mag

  const lo = Math.floor(lo0 / step) * step
  const hi = Math.ceil(hi0 / step) * step

  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6)
  }

  return { domain: [lo - step * 0.4, hi + step * 0.4] as [number, number], ticks }
}
