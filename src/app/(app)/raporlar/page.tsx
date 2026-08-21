import Link from 'next/link'
import { requireUser } from '@/lib/supabase/server'
import { PageHeader } from '@/components/kpi'
import { Card, CardHeader, Empty, Table, Td, Th, cn } from '@/components/ui'
import { date, money, moneySigned, month, pnlClass, week } from '@/lib/format'
import type { DailyPnl, PeriodicPnl } from '@/types/db'

export const metadata = { title: 'Raporlar · BIST Portföy' }

const PERIODS = [
  { key: 'gunluk', label: 'Günlük', view: 'realized_pnl_daily', column: 'day' },
  { key: 'haftalik', label: 'Haftalık', view: 'realized_pnl_weekly', column: 'period' },
  { key: 'aylik', label: 'Aylık', view: 'trade_activity_monthly', column: 'period' },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']

function labelFor(key: PeriodKey, value: string) {
  if (key === 'gunluk') return date(value)
  if (key === 'haftalik') return week(value)
  return month(value)
}

export default async function RaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string }>
}) {
  const { supabase } = await requireUser()
  const { donem } = await searchParams

  const active = PERIODS.find((p) => p.key === donem) ?? PERIODS[2]

  const { data } = await supabase
    .from(active.view)
    .select('*')
    .order(active.column, { ascending: false })
    .limit(200)

  const rows = (data ?? []) as (DailyPnl | PeriodicPnl)[]
  const keyOf = (r: DailyPnl | PeriodicPnl) =>
    'day' in r ? (r as DailyPnl).day : (r as PeriodicPnl).period

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + Number(r.gross_pnl),
      commission: acc.commission + Number(r.commission),
      net: acc.net + Number(r.net_pnl),
      buy: acc.buy + Number(r.buy_count),
      sell: acc.sell + Number(r.sell_count),
      trades: acc.trades + Number(r.trade_count),
    }),
    { gross: 0, commission: 0, net: 0, buy: 0, sell: 0, trades: 0 },
  )

  return (
    <>
      <PageHeader
        title="Raporlar"
        description="Gerçekleşen kâr/zarar ve işlem sayısının dönemsel kırılımı. Kâr, satış anında ağırlıklı ortalama maliyete göre kesinleşir."
      />

      <div className="mb-4 inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/raporlar?donem=${p.key}`}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              p.key === active.key
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-[var(--muted)] hover:text-[var(--fg)]',
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title={`${active.label} özet`}
          description={`${rows.length} dönem · toplam ${totals.trades} işlem`}
        />
        {rows.length === 0 ? (
          <Empty>Bu dönem için kayıt yok.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Dönem</Th>
                <Th className="text-right">Alış</Th>
                <Th className="text-right">Satış</Th>
                <Th className="text-right">Toplam işlem</Th>
                <Th className="text-right">Brüt K/Z</Th>
                <Th className="text-right">Komisyon</Th>
                <Th className="text-right">Net K/Z</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={keyOf(r)}>
                  <Td className="font-medium">{labelFor(active.key, keyOf(r))}</Td>
                  <Td className="tnum text-right text-[var(--muted)]">{r.buy_count}</Td>
                  <Td className="tnum text-right text-[var(--muted)]">{r.sell_count}</Td>
                  <Td className="tnum text-right font-medium">{r.trade_count}</Td>
                  <Td className={`tnum text-right ${pnlClass(r.gross_pnl)}`}>
                    {r.gross_pnl === 0 ? '—' : moneySigned(r.gross_pnl)}
                  </Td>
                  <Td className="tnum text-right text-[var(--muted)]">
                    {r.commission === 0 ? '—' : money(r.commission)}
                  </Td>
                  <Td className={`tnum text-right font-semibold ${pnlClass(r.net_pnl)}`}>
                    {moneySigned(r.net_pnl)}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-black/[0.02] font-semibold dark:bg-white/[0.03]">
                <Td>Toplam</Td>
                <Td className="tnum text-right">{totals.buy}</Td>
                <Td className="tnum text-right">{totals.sell}</Td>
                <Td className="tnum text-right">{totals.trades}</Td>
                <Td className={`tnum text-right ${pnlClass(totals.gross)}`}>
                  {moneySigned(totals.gross)}
                </Td>
                <Td className="tnum text-right">{money(totals.commission)}</Td>
                <Td className={`tnum text-right ${pnlClass(totals.net)}`}>
                  {moneySigned(totals.net)}
                </Td>
              </tr>
            </tfoot>
          </Table>
        )}
      </Card>
    </>
  )
}
