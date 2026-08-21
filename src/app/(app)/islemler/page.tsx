import { requireUser } from '@/lib/supabase/server'
import { getStockOptions } from '@/lib/data'
import { deleteTrade } from '@/lib/actions/data'
import { PageHeader } from '@/components/kpi'
import { DeleteButton } from '@/components/forms'
import { Badge, Button, Card, CardHeader, Empty, Table, Td, Th, inputClass } from '@/components/ui'
import { date, money, pnlClass, price, qty } from '@/lib/format'
import type { Trade } from '@/types/db'
import TradeForm from './form'

export const metadata = { title: 'İşlemler · BIST Portföy' }

type Search = { hisse?: string; tip?: string; baslangic?: string; bitis?: string }

export default async function IslemlerPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { supabase } = await requireUser()
  const filters = await searchParams

  let query = supabase
    .from('trades')
    .select('*')
    .order('trade_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500)

  if (filters.hisse) query = query.eq('symbol', filters.hisse.toUpperCase())
  if (filters.tip === 'buy' || filters.tip === 'sell') query = query.eq('side', filters.tip)
  if (filters.baslangic) query = query.gte('trade_date', filters.baslangic)
  if (filters.bitis) query = query.lte('trade_date', filters.bitis)

  const [stocks, { data: rows }, { data: usedSymbols }] = await Promise.all([
    getStockOptions(supabase),
    query,
    supabase.from('symbol_pnl_summary').select('symbol').order('symbol'),
  ])

  const trades = (rows ?? []) as Trade[]
  const symbols = (usedSymbols ?? []).map((r) => r.symbol as string)
  const hasFilter = Boolean(filters.hisse || filters.tip || filters.baslangic || filters.bitis)

  return (
    <>
      <PageHeader
        title="İşlemler"
        description="Alım ve satım kayıtlarınız. Kâr/zarar ağırlıklı ortalama maliyet yöntemiyle hesaplanır."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <TradeForm stocks={stocks} />

        <Card className="overflow-hidden">
          <CardHeader
            title="İşlem geçmişi"
            description={`${trades.length} kayıt${hasFilter ? ' (filtrelenmiş)' : ''}`}
          />

          <form method="get" className="flex flex-wrap items-end gap-2 border-b border-[var(--border)] p-4">
            <label className="min-w-32 flex-1">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Hisse</span>
              <select name="hisse" defaultValue={filters.hisse ?? ''} className={inputClass}>
                <option value="">Tümü</option>
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-28 flex-1">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Tip</span>
              <select name="tip" defaultValue={filters.tip ?? ''} className={inputClass}>
                <option value="">Tümü</option>
                <option value="buy">Alış</option>
                <option value="sell">Satış</option>
              </select>
            </label>
            <label className="min-w-32 flex-1">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Başlangıç</span>
              <input type="date" name="baslangic" defaultValue={filters.baslangic ?? ''} className={inputClass} />
            </label>
            <label className="min-w-32 flex-1">
              <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Bitiş</span>
              <input type="date" name="bitis" defaultValue={filters.bitis ?? ''} className={inputClass} />
            </label>
            <Button type="submit" variant="secondary">
              Filtrele
            </Button>
            {hasFilter ? (
              <Button type="submit" name="temizle" variant="ghost" formAction="/islemler">
                Temizle
              </Button>
            ) : null}
          </form>

          {trades.length === 0 ? (
            <Empty>
              {hasFilter
                ? 'Bu filtreye uyan işlem yok.'
                : 'Henüz işlem yok. Soldaki formdan ilk alışınızı kaydedin.'}
            </Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Tarih</Th>
                  <Th>Hisse</Th>
                  <Th>Tip</Th>
                  <Th className="text-right">Adet</Th>
                  <Th className="text-right">Birim fiyat</Th>
                  <Th className="text-right">Tutar</Th>
                  <Th className="text-right">Komisyon</Th>
                  <Th className="text-right">Ort. maliyet</Th>
                  <Th className="text-right">Brüt K/Z</Th>
                  <Th>Not</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id}>
                    <Td className="tnum text-[var(--muted)]">{date(t.trade_date)}</Td>
                    <Td className="font-semibold">{t.symbol}</Td>
                    <Td>
                      <Badge tone={t.side === 'buy' ? 'buy' : 'sell'}>
                        {t.side === 'buy' ? 'Alış' : 'Satış'}
                      </Badge>
                    </Td>
                    <Td className="tnum text-right">{qty(t.quantity)}</Td>
                    <Td className="tnum text-right">{price(t.unit_price)}</Td>
                    <Td className="tnum text-right font-medium">
                      {money(t.quantity * t.unit_price)}
                    </Td>
                    <Td className="tnum text-right text-[var(--muted)]">
                      {t.commission ? money(t.commission) : '—'}
                    </Td>
                    <Td className="tnum text-right text-[var(--muted)]">{price(t.cost_basis)}</Td>
                    <Td className={`tnum text-right font-medium ${pnlClass(t.realized_pnl)}`}>
                      {t.side === 'sell' && t.realized_pnl !== null
                        ? `${t.realized_pnl > 0 ? '+' : ''}${money(t.realized_pnl)}`
                        : '—'}
                    </Td>
                    <Td className="max-w-56 truncate text-[var(--muted)]" title={t.note ?? ''}>
                      {t.note || '—'}
                    </Td>
                    <Td>
                      <form action={deleteTrade}>
                        <input type="hidden" name="id" value={t.id} />
                        <DeleteButton
                          confirmText={`${date(t.trade_date)} tarihli ${t.symbol} ${
                            t.side === 'buy' ? 'alış' : 'satış'
                          } işlemi silinsin mi? Bu hissenin tüm kâr/zarar hesabı yeniden yapılacak.`}
                        />
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
