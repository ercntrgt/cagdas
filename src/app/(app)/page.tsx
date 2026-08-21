import Link from 'next/link'
import { requireUser } from '@/lib/supabase/server'
import { Kpi, PageHeader } from '@/components/kpi'
import { Button, Card, CardHeader, Empty, Table, Td, Th } from '@/components/ui'
import { money, moneySigned, percent, pnlClass, qty } from '@/lib/format'
import type { DashboardSummary, PeriodicPnl, PortfolioHistoryPoint, SymbolPnl } from '@/types/db'
import PortfolioChart from '@/components/charts/portfolio-chart'
import MonthlyPnlChart from '@/components/charts/monthly-pnl-chart'
import MonthlyTradesChart from '@/components/charts/monthly-trades-chart'
import SymbolPnlChart from '@/components/charts/symbol-pnl-chart'

export const metadata = { title: 'Gösterge Paneli' }

export default async function DashboardPage() {
  const { supabase } = await requireUser()

  const [summaryRes, historyRes, monthlyRes, symbolRes] = await Promise.all([
    supabase.rpc('get_dashboard_summary'),
    supabase.rpc('get_portfolio_history', { p_from: null, p_to: null }),
    supabase.from('trade_activity_monthly').select('*').order('period'),
    supabase.from('symbol_pnl_summary').select('*'),
  ])

  const s = (summaryRes.data ?? {}) as Partial<DashboardSummary>
  const history = (historyRes.data ?? []) as PortfolioHistoryPoint[]
  const monthly = (monthlyRes.data ?? []) as PeriodicPnl[]
  const symbols = (symbolRes.data ?? []) as SymbolPnl[]

  const isEmpty = !s.trade_count && !s.total_deposits

  if (isEmpty) {
    return (
      <>
        <PageHeader title="Gösterge Paneli" />
        <Card className="p-10 text-center">
          <h2 className="text-base font-semibold">Hoş geldiniz 👋</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            Başlamak için önce cüzdanınıza para girişi yapın, ardından hisse alım
            işlemlerinizi kaydedin. Fiyatları siz gireceğiniz için portföy değeriniz
            her zaman kontrolünüzde olur.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/cuzdan">
              <Button>1. Para girişi yap</Button>
            </Link>
            <Link href="/islemler">
              <Button variant="secondary">2. İşlem ekle</Button>
            </Link>
            <Link href="/fiyatlar">
              <Button variant="secondary">3. Fiyat gir</Button>
            </Link>
          </div>
        </Card>
      </>
    )
  }

  const invested = Number(s.invested_cost ?? 0)
  const unrealized = Number(s.unrealized_pnl ?? 0)
  const realizedNet = Number(s.realized_net ?? 0)

  return (
    <>
      <PageHeader
        title="Gösterge Paneli"
        description="Varlıklarınızın, gerçekleşen kâr/zararınızın ve işlem hacminizin özeti."
      />

      {/* Varlık özeti */}
      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Toplam varlık"
          value={money(s.total_assets)}
          hint="Nakit + portföy değeri"
        />
        <Kpi label="Nakit bakiye" value={money(s.cash_balance)} hint="Cüzdandaki para" />
        <Kpi
          label="Portföy değeri"
          value={money(s.portfolio_value)}
          hint={`${s.position_count ?? 0} hisse`}
        />
        <Kpi
          label="Toplam yatırım"
          value={money(invested)}
          hint="Açık pozisyonların maliyeti"
        />
      </div>

      {/* Kâr/zarar ve işlem özeti */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Gerçekleşen K/Z (net)"
          value={moneySigned(realizedNet)}
          tone={realizedNet > 0 ? 'profit' : realizedNet < 0 ? 'loss' : undefined}
          hint={`Brüt ${moneySigned(s.realized_gross)} − komisyon ${money(s.total_commission)}`}
        />
        <Kpi
          label="Gerçekleşmemiş K/Z"
          value={moneySigned(unrealized)}
          tone={unrealized > 0 ? 'profit' : unrealized < 0 ? 'loss' : undefined}
          hint={invested > 0 ? percent((unrealized / invested) * 100) : 'Elinizdeki hisseler'}
        />
        <Kpi
          label="Toplam işlem sayısı"
          value={s.trade_count ?? 0}
          hint={`Bu hafta ${s.trade_count_week ?? 0} · Bugün ${s.trade_count_today ?? 0}`}
        />
        <Kpi
          label="Bu ayki işlem sayısı"
          value={s.trade_count_month ?? 0}
          hint="İçinde bulunulan takvim ayı"
        />
      </div>

      {/* Dönemsel gerçekleşen kâr/zarar */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader
          title="Gerçekleşen kâr/zarar"
          description="Satış yaptığınız anda kesinleşen kâr/zarar. Net değerler komisyon düşülmüş hâldir."
          action={
            <Link href="/raporlar">
              <Button variant="secondary" size="sm">
                Detaylı rapor
              </Button>
            </Link>
          }
        />
        <div className="grid divide-y divide-[var(--border)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            { label: 'Bugün', net: s.realized_net_today, gross: s.realized_today },
            { label: 'Bu hafta', net: s.realized_net_week, gross: s.realized_week },
            { label: 'Bu ay', net: s.realized_net_month, gross: s.realized_month },
            { label: 'Toplam', net: s.realized_net, gross: s.realized_gross },
          ].map((p) => (
            <div key={p.label} className="px-5 py-4">
              <p className="text-xs font-medium text-[var(--muted)]">{p.label}</p>
              <p className={`tnum mt-1 text-lg font-semibold ${pnlClass(p.net)}`}>
                {moneySigned(p.net)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                brüt {moneySigned(p.gross)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Grafikler */}
      <div className="mb-6 grid gap-6">
        <Card className="overflow-hidden">
          <CardHeader
            title="Varlık değeri"
            description="Toplam varlık = nakit + hisse değeri. Hisse değeri, girdiğiniz en güncel fiyatlarla hesaplanır."
          />
          <PortfolioChart data={history} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader title="Aylık gerçekleşen kâr/zarar" description="Komisyon düşülmüş net" />
            <MonthlyPnlChart data={monthly} />
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Aylık işlem sayısı" description="Alış + satış" />
            <MonthlyTradesChart data={monthly} />
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader
            title="Hisse bazlı gerçekleşen kâr/zarar"
            description="En yüksek etkiye sahip 10 hisse"
          />
          <SymbolPnlChart data={symbols} />
        </Card>
      </div>

      {/* Hisse bazlı özet tablosu */}
      <Card className="overflow-hidden">
        <CardHeader title="Hisse bazlı özet" description={`${symbols.length} hisse`} />
        {symbols.length === 0 ? (
          <Empty>Henüz işlem yok.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Hisse</Th>
                <Th className="text-right">İşlem</Th>
                <Th className="text-right">Alış tutarı</Th>
                <Th className="text-right">Satış tutarı</Th>
                <Th className="text-right">Brüt K/Z</Th>
                <Th className="text-right">Komisyon</Th>
                <Th className="text-right">Net K/Z</Th>
                <Th className="text-right">Açık pozisyon</Th>
              </tr>
            </thead>
            <tbody>
              {[...symbols]
                .sort((a, b) => b.net_pnl - a.net_pnl)
                .map((row) => (
                  <tr key={row.symbol}>
                    <Td>
                      <div className="font-semibold">{row.symbol}</div>
                      <div className="max-w-56 truncate text-xs text-[var(--muted)]">
                        {row.title}
                      </div>
                    </Td>
                    <Td className="tnum text-right text-[var(--muted)]">
                      {row.trade_count}
                      <span className="ml-1 text-xs">
                        ({row.buy_count}A/{row.sell_count}S)
                      </span>
                    </Td>
                    <Td className="tnum text-right">{money(row.total_bought)}</Td>
                    <Td className="tnum text-right">{money(row.total_sold)}</Td>
                    <Td className={`tnum text-right ${pnlClass(row.gross_pnl)}`}>
                      {moneySigned(row.gross_pnl)}
                    </Td>
                    <Td className="tnum text-right text-[var(--muted)]">
                      {money(row.commission)}
                    </Td>
                    <Td className={`tnum text-right font-medium ${pnlClass(row.net_pnl)}`}>
                      {moneySigned(row.net_pnl)}
                    </Td>
                    <Td className="tnum text-right text-[var(--muted)]">
                      {row.open_quantity > 0 ? `${qty(row.open_quantity)} adet` : 'kapalı'}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
