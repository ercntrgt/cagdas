import Link from 'next/link'
import { requireUser } from '@/lib/supabase/server'
import { Kpi, PageHeader } from '@/components/kpi'
import { Badge, Button, Card, CardHeader, Empty, Table, Td, Th, cn } from '@/components/ui'
import { date, money, moneySigned, percent, pnlClass, price, qty } from '@/lib/format'
import type {
  AnalysisSummary,
  DailyPnl,
  PeriodicPnl,
  Position,
  SymbolAnalysis,
  Trade,
} from '@/types/db'
import CumulativePnlChart, { type CumulativePoint } from '@/components/charts/cumulative-pnl-chart'
import SymbolDivergingChart from '@/components/charts/symbol-diverging-chart'
import AllocationChart from '@/components/charts/allocation-chart'
import BuySellChart from '@/components/charts/buy-sell-chart'
import SymbolTable from './symbol-table'

export const metadata = { title: 'Analiz' }

/** En kârlı / en zararlı satışlar için küçük tablo */
function TradeList({ rows, bos }: { rows: Trade[]; bos: string }) {
  if (rows.length === 0) return <Empty>{bos}</Empty>
  return (
    <Table>
      <thead>
        <tr>
          <Th>Tarih</Th>
          <Th>Hisse</Th>
          <Th className="text-right">Adet</Th>
          <Th className="text-right">Maliyet → Satış</Th>
          <Th className="text-right">Brüt K/Z</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.id}>
            <Td className="tnum text-[var(--muted)]">{date(t.trade_date)}</Td>
            <Td className="font-semibold">{t.symbol}</Td>
            <Td className="tnum text-right">{qty(t.quantity)}</Td>
            <Td className="tnum text-right text-[var(--muted)]">
              {price(t.cost_basis)} → {price(t.unit_price)}
            </Td>
            <Td className={cn('tnum text-right font-semibold', pnlClass(t.realized_pnl))}>
              {moneySigned(t.realized_pnl)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

export default async function AnalizPage() {
  const { supabase } = await requireUser()

  const [
    ozetRes,
    hisseRes,
    gunlukRes,
    aylikRes,
    pozisyonRes,
    enIyiRes,
    enKotuRes,
  ] = await Promise.all([
    supabase.rpc('get_analysis_summary'),
    supabase.from('symbol_analysis').select('*'),
    supabase.from('realized_pnl_daily').select('*').order('day'),
    supabase.from('trade_activity_monthly').select('*').order('period'),
    supabase.from('positions').select('*'),
    supabase
      .from('trades')
      .select('*')
      .eq('side', 'sell')
      .order('realized_pnl', { ascending: false })
      .limit(5),
    supabase
      .from('trades')
      .select('*')
      .eq('side', 'sell')
      .order('realized_pnl', { ascending: true })
      .limit(5),
  ])

  const s = (ozetRes.data ?? {}) as Partial<AnalysisSummary>
  const hisseler = (hisseRes.data ?? []) as SymbolAnalysis[]
  const gunluk = (gunlukRes.data ?? []) as DailyPnl[]
  const aylik = (aylikRes.data ?? []) as PeriodicPnl[]
  const pozisyonlar = (pozisyonRes.data ?? []) as Position[]

  // En iyi listesi kârlıları, en kötü listesi zararlıları göstersin
  const enIyi = ((enIyiRes.data ?? []) as Trade[]).filter((t) => Number(t.realized_pnl) > 0)
  const enKotu = ((enKotuRes.data ?? []) as Trade[]).filter((t) => Number(t.realized_pnl) < 0)

  if (hisseler.length === 0) {
    return (
      <>
        <PageHeader title="Analiz" />
        <Card className="p-10 text-center">
          <h2 className="text-base font-semibold">Analiz için henüz veri yok</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
            İşlem kaydettikçe hangi hisseden ne kadar kazandığınız, başarı oranınız ve
            portföy dağılımınız burada grafiklerle görünecek.
          </p>
          <Link href="/islemler" className="mt-6 inline-block">
            <Button>İlk işlemi ekle</Button>
          </Link>
        </Card>
      </>
    )
  }

  // Birikimli net kâr/zarar eğrisi
  let birikim = 0
  const birikimliSeri: CumulativePoint[] = gunluk.map((g) => {
    birikim += Number(g.net_pnl)
    return { day: g.day, cumulative: Math.round(birikim * 100) / 100, daily: Number(g.net_pnl) }
  })

  const toplamKz = Number(s.total_pnl ?? 0)
  const gerceklesen = Number(s.realized_net ?? 0)
  const gerceklesmemis = Number(s.unrealized ?? 0)
  const kazandiran = Number(s.winning_symbols ?? 0)
  const kaybettiren = Number(s.losing_symbols ?? 0)

  const enIyiHisse = [...hisseler].sort((a, b) => b.total_pnl - a.total_pnl)[0]
  const enKotuHisse = [...hisseler].sort((a, b) => a.total_pnl - b.total_pnl)[0]

  return (
    <>
      <PageHeader
        title="Analiz"
        description="Hangi hisse kazandırdı, hangisi kaybettirdi; işlem alışkanlıklarınız ne söylüyor."
      />

      {/* Kâr/zarar tablosu */}
      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Toplam kâr/zarar"
          value={moneySigned(toplamKz)}
          tone={toplamKz > 0 ? 'profit' : toplamKz < 0 ? 'loss' : undefined}
          hint="Gerçekleşen + gerçekleşmemiş"
        />
        <Kpi
          label="Gerçekleşen (net)"
          value={moneySigned(gerceklesen)}
          tone={gerceklesen > 0 ? 'profit' : gerceklesen < 0 ? 'loss' : undefined}
          hint={`${s.sell_count ?? 0} satıştan, komisyon düşülmüş`}
        />
        <Kpi
          label="Gerçekleşmemiş"
          value={moneySigned(gerceklesmemis)}
          tone={gerceklesmemis > 0 ? 'profit' : gerceklesmemis < 0 ? 'loss' : undefined}
          hint={`${s.position_count ?? 0} açık pozisyonda`}
        />
        <Kpi
          label="İşlem hacmi"
          value={money(s.volume)}
          hint={`${s.trade_count ?? 0} işlem · ${s.symbol_count ?? 0} hisse`}
        />
      </div>

      {/* Başarı metrikleri */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Başarı oranı"
          value={s.win_rate === null || s.win_rate === undefined ? '—' : `%${s.win_rate}`}
          hint={`${s.win_count ?? 0} kârlı · ${s.loss_count ?? 0} zararlı satış`}
        />
        <Kpi
          label="Kâr faktörü"
          value={
            s.profit_factor === null || s.profit_factor === undefined
              ? '—'
              : s.profit_factor.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
          }
          tone={
            s.profit_factor && s.profit_factor > 1
              ? 'profit'
              : s.profit_factor && s.profit_factor < 1
                ? 'loss'
                : undefined
          }
          hint="Toplam kâr ÷ toplam zarar · 1 üstü kazandırıyor"
        />
        <Kpi
          label="Ortalama kazanç / kayıp"
          value={`${money(s.avg_win)} / ${money(s.avg_loss)}`}
          hint={`En iyi ${moneySigned(s.best_trade)} · en kötü ${moneySigned(s.worst_trade)}`}
        />
        <Kpi
          label="Komisyon yükü"
          value={money(s.commission)}
          hint={
            s.commission_ratio === null || s.commission_ratio === undefined
              ? 'Ödenen toplam komisyon'
              : `Brüt kârınızın %${s.commission_ratio}'i`
          }
        />
      </div>

      {/* Öne çıkanlar */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-[var(--muted)]">En çok kazandıran</p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold">{enIyiHisse?.symbol ?? '—'}</span>
            <span className={cn('tnum font-semibold', pnlClass(enIyiHisse?.total_pnl))}>
              {enIyiHisse ? moneySigned(enIyiHisse.total_pnl) : ''}
            </span>
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{enIyiHisse?.title}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-[var(--muted)]">En çok kaybettiren</p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold">{enKotuHisse?.symbol ?? '—'}</span>
            <span className={cn('tnum font-semibold', pnlClass(enKotuHisse?.total_pnl))}>
              {enKotuHisse ? moneySigned(enKotuHisse.total_pnl) : ''}
            </span>
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{enKotuHisse?.title}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-[var(--muted)]">Hisse dağılımı</p>
          <p className="mt-1.5 flex items-center gap-2">
            <Badge tone="in">{kazandiran} kazandıran</Badge>
            <Badge tone="out">{kaybettiren} kaybettiren</Badge>
          </p>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            {s.closed_symbols ? (
              <>
                Kapanan {s.closed_symbols} pozisyon ortalama {s.avg_span_days} gün tutuldu
              </>
            ) : (
              'Henüz kapanmış pozisyon yok'
            )}
          </p>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card className="overflow-hidden">
          <CardHeader
            title="Birikimli kâr/zarar"
            description="Gerçekleşen net kâr/zararınızın zaman içindeki toplamı. Yukarı giden eğri kazandıran bir geçmiş demek."
          />
          <CumulativePnlChart data={birikimliSeri} />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Hisse bazlı toplam kâr/zarar"
              description="Gerçekleşen net + gerçekleşmemiş, en yüksek etkiden başlayarak"
            />
            <SymbolDivergingChart
              data={hisseler.map((h) => ({
                symbol: h.symbol,
                title: h.title,
                value: Number(h.total_pnl),
                detay: [
                  { etiket: 'Gerçekleşen', tutar: Number(h.realized_net) },
                  { etiket: 'Gerçekleşmemiş', tutar: Number(h.unrealized_pnl) },
                  { etiket: 'Komisyon', tutar: Number(h.commission) },
                ],
              }))}
              bos="Henüz kâr/zarar oluşmamış."
            />
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Portföy ağırlığı"
              description="Açık pozisyonların piyasa değerine göre payı — yoğunlaşma riskini gösterir"
            />
            <AllocationChart
              data={pozisyonlar.map((p) => ({
                symbol: p.symbol,
                title: p.title,
                value: Number(p.market_value),
                cost: Number(p.total_cost),
              }))}
            />
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Açık pozisyonlarda gerçekleşmemiş kâr/zarar"
              description="Girdiğiniz güncel fiyatlara göre, henüz satılmamış hisseler"
            />
            <SymbolDivergingChart
              data={pozisyonlar
                .filter((p) => p.last_price !== null)
                .map((p) => ({
                  symbol: p.symbol,
                  title: p.title,
                  value: Number(p.unrealized_pnl),
                  detay: [
                    { etiket: 'Maliyet', tutar: Number(p.total_cost) },
                    { etiket: 'Piyasa değeri', tutar: Number(p.market_value) },
                  ],
                }))}
              bos="Fiyat girilmiş açık pozisyon yok. Fiyatlar sayfasından güncel fiyatları girin."
            />
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Aylık alış / satış"
              description="Hangi ay ne kadar alıp ne kadar sattınız"
            />
            <BuySellChart data={aylik} />
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader title="En kârlı satışlar" description="Brüt kâra göre ilk 5" />
            <TradeList rows={enIyi} bos="Henüz kârla kapanan satış yok." />
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="En zararlı satışlar" description="Brüt zarara göre ilk 5" />
            <TradeList rows={enKotu} bos="Zararla kapanan satış yok — güzel." />
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader
            title="Hisse bazlı detay"
            description={`${hisseler.length} hisse · başlığa tıklayarak sıralayın`}
          />
          <SymbolTable rows={hisseler} />
        </Card>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
        Gerçekleşmemiş kâr/zarar, <Link href="/fiyatlar" className="underline">Fiyatlar</Link>{' '}
        sayfasında girdiğiniz en güncel fiyatlara dayanır; fiyat girilmemiş hisseler maliyet
        değeriyle sayılır. Getiri oranı, hissenin toplam kâr/zararının o hisseye yaptığınız
        toplam alış tutarına bölümüdür.
      </p>
    </>
  )
}
