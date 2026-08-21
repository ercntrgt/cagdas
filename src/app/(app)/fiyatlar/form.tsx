'use client'

import { useActionState } from 'react'
import { savePrices, type FormState } from '@/lib/actions/data'
import { SubmitButton } from '@/components/forms'
import { Card, CardHeader, Empty, FormError, FormSuccess, Input, Table, Td, Th } from '@/components/ui'
import { date, money, pnlClass, price, qty, today } from '@/lib/format'
import type { Position } from '@/types/db'

export default function PriceForm({ positions }: { positions: Position[] }) {
  const [state, action] = useActionState<FormState, FormData>(savePrices, {})

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader title="Fiyat güncelle" />
        <Empty>
          Portföyünüzde hisse yok. Fiyat girmek için önce bir alış işlemi kaydedin.
        </Empty>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Fiyat güncelle"
        description="Portföyünüzdeki hisselerin güncel fiyatlarını girin. Boş bıraktıklarınız değişmez."
      />
      <form action={action}>
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border)] p-4">
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Fiyat tarihi
            </span>
            <Input name="as_of_date" type="date" defaultValue={today()} required />
          </label>
          <SubmitButton pendingText="Kaydediliyor…">Fiyatları kaydet</SubmitButton>
        </div>

        {state.error || state.success ? (
          <div className="border-b border-[var(--border)] p-4">
            <FormError>{state.error}</FormError>
            <FormSuccess>{state.success}</FormSuccess>
          </div>
        ) : null}

        <Table>
          <thead>
            <tr>
              <Th>Hisse</Th>
              <Th className="text-right">Adet</Th>
              <Th className="text-right">Ort. maliyet</Th>
              <Th className="text-right">Mevcut fiyat</Th>
              <Th className="text-right">Yeni fiyat (₺)</Th>
              <Th className="text-right">Gerçekleşmemiş K/Z</Th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.symbol}>
                <Td>
                  <span className="font-semibold">{p.symbol}</span>
                  <span className="ml-2 text-xs text-[var(--muted)]">{p.title}</span>
                </Td>
                <Td className="tnum text-right">{qty(p.quantity)}</Td>
                <Td className="tnum text-right text-[var(--muted)]">{price(p.avg_cost)}</Td>
                <Td className="tnum text-right">
                  {p.last_price === null ? (
                    <span className="text-[var(--muted)]">girilmedi</span>
                  ) : (
                    <>
                      {price(p.last_price)}
                      <span className="ml-1 text-xs text-[var(--muted)]">
                        ({date(p.price_date)})
                      </span>
                    </>
                  )}
                </Td>
                <Td className="text-right">
                  <Input
                    name={`price_${p.symbol}`}
                    inputMode="decimal"
                    placeholder={p.last_price !== null ? price(p.last_price) : price(p.avg_cost)}
                    className="tnum ml-auto w-32 text-right"
                    aria-label={`${p.symbol} yeni fiyat`}
                  />
                </Td>
                <Td className={`tnum text-right font-medium ${pnlClass(p.unrealized_pnl)}`}>
                  {p.last_price === null ? '—' : money(p.unrealized_pnl)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </form>
    </Card>
  )
}
