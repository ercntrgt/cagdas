import Link from 'next/link'
import { requireUser } from '@/lib/supabase/server'
import { Kpi, PageHeader } from '@/components/kpi'
import { Button, Card, CardHeader, Empty, Table, Td, Th } from '@/components/ui'
import { date, money, percent, pnlClass, price, qty } from '@/lib/format'
import type { Position } from '@/types/db'

export const metadata = { title: 'Portföy' }

export default async function PortfoyPage() {
  const { supabase } = await requireUser()

  const { data } = await supabase.from('positions').select('*').order('symbol')
  const positions = (data ?? []) as Position[]

  const totalCost = positions.reduce((s, p) => s + Number(p.total_cost), 0)
  const totalValue = positions.reduce((s, p) => s + Number(p.market_value), 0)
  const totalPnl = totalValue - totalCost
  const missingPrice = positions.filter((p) => p.last_price === null).length

  return (
    <>
      <PageHeader
        title="Portföy"
        description="Elinizdeki hisseler ve gerçekleşmemiş kâr/zarar."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Toplam yatırım" value={money(totalCost)} hint="Açık pozisyonların maliyeti" />
        <Kpi label="Portföy değeri" value={money(totalValue)} hint="Girdiğiniz güncel fiyatlarla" />
        <Kpi
          label="Gerçekleşmemiş K/Z"
          value={money(totalPnl)}
          tone={totalPnl > 0 ? 'profit' : totalPnl < 0 ? 'loss' : undefined}
          hint={totalCost > 0 ? percent((totalPnl / totalCost) * 100) : undefined}
        />
        <Kpi label="Hisse sayısı" value={positions.length} hint={`${missingPrice} hissenin fiyatı girilmemiş`} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Açık pozisyonlar"
          description={
            missingPrice > 0
              ? `${missingPrice} hissenin güncel fiyatı girilmemiş — bu hisseler maliyet değeriyle gösteriliyor.`
              : undefined
          }
          action={
            <Link href="/fiyatlar">
              <Button variant="secondary" size="sm">
                Fiyatları güncelle
              </Button>
            </Link>
          }
        />

        {positions.length === 0 ? (
          <Empty>
            Portföyünüz boş.{' '}
            <Link href="/islemler" className="text-blue-600 hover:underline dark:text-blue-400">
              İlk alış işleminizi kaydedin
            </Link>
            .
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Hisse</Th>
                <Th className="text-right">Adet</Th>
                <Th className="text-right">Ort. maliyet</Th>
                <Th className="text-right">Toplam maliyet</Th>
                <Th className="text-right">Son fiyat</Th>
                <Th className="text-right">Piyasa değeri</Th>
                <Th className="text-right">Gerçekleşmemiş K/Z</Th>
                <Th className="text-right">%</Th>
                <Th className="text-right">Ağırlık</Th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.symbol}>
                  <Td>
                    <div className="font-semibold">{p.symbol}</div>
                    <div className="max-w-56 truncate text-xs text-[var(--muted)]">{p.title}</div>
                  </Td>
                  <Td className="tnum text-right">{qty(p.quantity)}</Td>
                  <Td className="tnum text-right">{price(p.avg_cost)}</Td>
                  <Td className="tnum text-right">{money(p.total_cost)}</Td>
                  <Td className="tnum text-right">
                    {p.last_price === null ? (
                      <Link
                        href="/fiyatlar"
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        fiyat gir
                      </Link>
                    ) : (
                      <>
                        <div>{price(p.last_price)}</div>
                        <div className="text-xs text-[var(--muted)]">{date(p.price_date)}</div>
                      </>
                    )}
                  </Td>
                  <Td className="tnum text-right font-medium">{money(p.market_value)}</Td>
                  <Td className={`tnum text-right font-medium ${pnlClass(p.unrealized_pnl)}`}>
                    {p.last_price === null ? '—' : money(p.unrealized_pnl)}
                  </Td>
                  <Td className={`tnum text-right ${pnlClass(p.unrealized_pnl)}`}>
                    {percent(p.unrealized_pnl_pct)}
                  </Td>
                  <Td className="tnum text-right text-[var(--muted)]">
                    {totalValue > 0
                      ? `%${((Number(p.market_value) / totalValue) * 100).toLocaleString('tr-TR', {
                          maximumFractionDigits: 1,
                        })}`
                      : '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-black/[0.02] font-semibold dark:bg-white/[0.03]">
                <Td>Toplam</Td>
                <Td />
                <Td />
                <Td className="tnum text-right">{money(totalCost)}</Td>
                <Td />
                <Td className="tnum text-right">{money(totalValue)}</Td>
                <Td className={`tnum text-right ${pnlClass(totalPnl)}`}>{money(totalPnl)}</Td>
                <Td className={`tnum text-right ${pnlClass(totalPnl)}`}>
                  {totalCost > 0 ? percent((totalPnl / totalCost) * 100) : '—'}
                </Td>
                <Td className="tnum text-right">%100</Td>
              </tr>
            </tfoot>
          </Table>
        )}
      </Card>
    </>
  )
}
