'use client'

import { useMemo, useState } from 'react'
import { Empty, Table, Td, Th, cn } from '@/components/ui'
import { money, moneySigned, percent, pnlClass, price, qty } from '@/lib/format'
import type { SymbolAnalysis } from '@/types/db'

type Alan = keyof SymbolAnalysis

const SUTUNLAR: {
  alan: Alan
  baslik: string
  sag?: boolean
  ipucu?: string
}[] = [
  { alan: 'symbol', baslik: 'Hisse' },
  { alan: 'trade_count', baslik: 'İşlem', sag: true },
  { alan: 'buy_qty', baslik: 'Alınan', sag: true },
  { alan: 'sell_qty', baslik: 'Satılan', sag: true },
  { alan: 'open_qty', baslik: 'Elde', sag: true },
  { alan: 'avg_buy_price', baslik: 'Ort. alış', sag: true },
  { alan: 'avg_sell_price', baslik: 'Ort. satış', sag: true },
  { alan: 'volume', baslik: 'Hacim', sag: true },
  { alan: 'commission', baslik: 'Komisyon', sag: true },
  { alan: 'realized_net', baslik: 'Gerçekleşen', sag: true },
  { alan: 'unrealized_pnl', baslik: 'Gerçekleşmemiş', sag: true },
  { alan: 'total_pnl', baslik: 'Toplam K/Z', sag: true },
  { alan: 'roi_pct', baslik: 'Getiri', sag: true, ipucu: 'Toplam K/Z ÷ alış tutarı' },
]

function karsilastir(a: unknown, b: unknown): number {
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, 'tr')
  const x = a === null || a === undefined ? Number.NEGATIVE_INFINITY : Number(a)
  const y = b === null || b === undefined ? Number.NEGATIVE_INFINITY : Number(b)
  return x - y
}

export default function SymbolTable({ rows }: { rows: SymbolAnalysis[] }) {
  const [alan, setAlan] = useState<Alan>('total_pnl')
  const [artan, setArtan] = useState(false)

  const sirali = useMemo(() => {
    const kopya = [...rows]
    kopya.sort((a, b) => {
      const s = karsilastir(a[alan], b[alan])
      return artan ? s : -s
    })
    return kopya
  }, [rows, alan, artan])

  function sirala(yeni: Alan) {
    if (yeni === alan) {
      setArtan((v) => !v)
    } else {
      setAlan(yeni)
      setArtan(yeni === 'symbol')
    }
  }

  if (rows.length === 0) {
    return <Empty>Henüz işlem yok. İşlem ekledikçe hisse bazlı analiz burada oluşur.</Empty>
  }

  return (
    <Table>
      <thead>
        <tr>
          {SUTUNLAR.map((s) => {
            const aktif = s.alan === alan
            return (
              <Th key={s.alan} className={cn('p-0', s.sag && 'text-right')}>
                <button
                  type="button"
                  onClick={() => sirala(s.alan)}
                  title={s.ipucu ?? `${s.baslik} sütununa göre sırala`}
                  className={cn(
                    'flex w-full items-center gap-1 px-4 py-2.5 transition-colors hover:text-[var(--fg)]',
                    s.sag && 'justify-end',
                    aktif && 'font-semibold text-[var(--fg)]',
                  )}
                >
                  {s.baslik}
                  <span
                    aria-hidden
                    className={cn('text-[9px] leading-none', aktif ? 'opacity-80' : 'opacity-25')}
                  >
                    {aktif && artan ? '▲' : '▼'}
                  </span>
                </button>
              </Th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sirali.map((r) => (
          <tr key={r.symbol} className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
            <Td>
              <div className="font-semibold">{r.symbol}</div>
              <div className="max-w-56 truncate text-xs text-[var(--muted)]">{r.title}</div>
            </Td>
            <Td className="tnum text-right text-[var(--muted)]">
              {r.trade_count}
              <span className="ml-1 text-xs">
                ({r.buy_count}A/{r.sell_count}S)
              </span>
            </Td>
            <Td className="tnum text-right">{qty(r.buy_qty)}</Td>
            <Td className="tnum text-right">{r.sell_qty > 0 ? qty(r.sell_qty) : '—'}</Td>
            <Td className="tnum text-right font-medium">
              {r.open_qty > 0 ? qty(r.open_qty) : <span className="text-[var(--muted)]">kapalı</span>}
            </Td>
            <Td className="tnum text-right">{price(r.avg_buy_price)}</Td>
            <Td className="tnum text-right">{price(r.avg_sell_price)}</Td>
            <Td className="tnum text-right text-[var(--muted)]">{money(r.volume)}</Td>
            <Td className="tnum text-right text-[var(--muted)]">{money(r.commission)}</Td>
            <Td className={cn('tnum text-right', pnlClass(r.realized_net))}>
              {r.sell_count > 0 ? moneySigned(r.realized_net) : '—'}
            </Td>
            <Td className={cn('tnum text-right', pnlClass(r.unrealized_pnl))}>
              {r.open_qty > 0 ? moneySigned(r.unrealized_pnl) : '—'}
            </Td>
            <Td className={cn('tnum text-right font-semibold', pnlClass(r.total_pnl))}>
              {moneySigned(r.total_pnl)}
            </Td>
            <Td className={cn('tnum text-right', pnlClass(r.roi_pct))}>{percent(r.roi_pct)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
