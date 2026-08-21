import Link from 'next/link'
import { requireUser } from '@/lib/supabase/server'
import { deleteCash } from '@/lib/actions/data'
import { Kpi, PageHeader } from '@/components/kpi'
import { DeleteButton, EditLink } from '@/components/forms'
import { Badge, Card, CardHeader, Empty, FormSuccess, Table, Td, Th } from '@/components/ui'
import { date, money } from '@/lib/format'
import type { CashTransaction, WalletBalance } from '@/types/db'
import CashForm from './form'

export const metadata = { title: 'Cüzdan' }

const TIP = {
  deposit: { etiket: 'Giriş', tone: 'in' as const, isaret: '+', renk: 'text-emerald-600 dark:text-emerald-400' },
  withdrawal: { etiket: 'Çıkış', tone: 'out' as const, isaret: '−', renk: 'text-rose-600 dark:text-rose-400' },
  commission: { etiket: 'Komisyon', tone: 'sell' as const, isaret: '−', renk: 'text-amber-600 dark:text-amber-400' },
}

export default async function CuzdanPage({
  searchParams,
}: {
  searchParams: Promise<{ duzenle?: string; guncellendi?: string }>
}) {
  const { supabase } = await requireUser()
  const { duzenle, guncellendi } = await searchParams

  const [{ data: wallet }, { data: rows }, duzenlenen] = await Promise.all([
    supabase.from('wallet_balance').select('*').maybeSingle(),
    supabase
      .from('cash_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
    duzenle
      ? supabase.from('cash_transactions').select('*').eq('id', duzenle).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const w = (wallet ?? null) as WalletBalance | null
  const list = (rows ?? []) as CashTransaction[]

  return (
    <>
      <PageHeader
        title="Cüzdan"
        description="Nakit giriş/çıkış hareketleri, ödediğiniz komisyonlar ve güncel bakiye."
      />

      {guncellendi ? (
        <div className="mb-4">
          <FormSuccess>Hareket güncellendi.</FormSuccess>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Nakit bakiye"
          value={money(w?.balance)}
          hint="Giriş − çıkış − komisyon − alışlar + satışlar"
        />
        <Kpi label="Toplam para girişi" value={money(w?.total_deposits)} tone="profit" />
        <Kpi label="Toplam para çıkışı" value={money(w?.total_withdrawals)} tone="loss" />
        <Kpi
          label="Ödenen komisyon"
          value={money(w?.total_commission)}
          hint={`İşlemlerden ${money(w?.trade_commission)} · cüzdandan ${money(
            w?.wallet_commission,
          )}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <CashForm initial={(duzenlenen?.data ?? null) as CashTransaction | null} />

        <Card className="overflow-hidden">
          <CardHeader title="Hareketler" description={`${list.length} kayıt`} />
          {list.length === 0 ? (
            <Empty>Henüz nakit hareketi yok. Soldaki formdan ilk para girişinizi yapın.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Tarih</Th>
                  <Th>Tip</Th>
                  <Th className="text-right">Tutar</Th>
                  <Th>Banka / kurum</Th>
                  <Th>Not</Th>
                  <Th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const t = TIP[row.type]
                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                    >
                      <Td className="tnum text-[var(--muted)]">{date(row.transaction_date)}</Td>
                      <Td>
                        <Badge tone={t.tone}>{t.etiket}</Badge>
                      </Td>
                      <Td className={`tnum text-right font-medium ${t.renk}`}>
                        {t.isaret}
                        {money(row.amount)}
                      </Td>
                      <Td>{row.bank || '—'}</Td>
                      <Td className="max-w-64 truncate text-[var(--muted)]" title={row.note ?? ''}>
                        {row.note || '—'}
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-0.5">
                          <EditLink href={`/cuzdan?duzenle=${row.id}`} />
                          <form action={deleteCash}>
                            <input type="hidden" name="id" value={row.id} />
                            <DeleteButton
                              confirmText={`${date(row.transaction_date)} tarihli ${money(
                                row.amount,
                              )} tutarındaki hareket silinsin mi?`}
                            />
                          </form>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
        Komisyonu iki yerden girebilirsiniz: her{' '}
        <Link href="/islemler" className="underline">
          işleme
        </Link>{' '}
        tek tek, ya da buradan toplu olarak. İkisi de bakiyeden düşülür ve raporlarda gider
        sayılır — aynı komisyonu iki kez girmemeye dikkat edin.
      </p>
    </>
  )
}
