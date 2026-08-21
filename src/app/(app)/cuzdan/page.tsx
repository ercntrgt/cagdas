import { requireUser } from '@/lib/supabase/server'
import { deleteCash } from '@/lib/actions/data'
import { Kpi, PageHeader } from '@/components/kpi'
import { DeleteButton } from '@/components/forms'
import { Badge, Card, CardHeader, Empty, Table, Td, Th } from '@/components/ui'
import { date, money } from '@/lib/format'
import type { CashTransaction, WalletBalance } from '@/types/db'
import CashForm from './form'

export const metadata = { title: 'Cüzdan' }

export default async function CuzdanPage() {
  const { supabase } = await requireUser()

  const [{ data: wallet }, { data: rows }] = await Promise.all([
    supabase.from('wallet_balance').select('*').maybeSingle(),
    supabase
      .from('cash_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const w = (wallet ?? null) as WalletBalance | null
  const list = (rows ?? []) as CashTransaction[]

  return (
    <>
      <PageHeader
        title="Cüzdan"
        description="Nakit giriş/çıkış hareketleri ve güncel bakiye."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Nakit bakiye"
          value={money(w?.balance)}
          hint="Para girişi − çıkış − alışlar + satışlar − komisyon"
        />
        <Kpi label="Toplam para girişi" value={money(w?.total_deposits)} tone="profit" />
        <Kpi label="Toplam para çıkışı" value={money(w?.total_withdrawals)} tone="loss" />
        <Kpi
          label="Ödenen komisyon"
          value={money(w?.total_commission)}
          hint="Tüm alış/satış işlemleri"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <CashForm />

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
                  <Th>Banka</Th>
                  <Th>Not</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const isIn = row.type === 'deposit'
                  return (
                    <tr key={row.id}>
                      <Td className="tnum text-[var(--muted)]">{date(row.transaction_date)}</Td>
                      <Td>
                        <Badge tone={isIn ? 'in' : 'out'}>{isIn ? 'Giriş' : 'Çıkış'}</Badge>
                      </Td>
                      <Td
                        className={`tnum text-right font-medium ${
                          isIn
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIn ? '+' : '−'}
                        {money(row.amount)}
                      </Td>
                      <Td>{row.bank || '—'}</Td>
                      <Td className="max-w-64 truncate text-[var(--muted)]" title={row.note ?? ''}>
                        {row.note || '—'}
                      </Td>
                      <Td>
                        <form action={deleteCash}>
                          <input type="hidden" name="id" value={row.id} />
                          <DeleteButton
                            confirmText={`${date(row.transaction_date)} tarihli ${money(
                              row.amount,
                            )} tutarındaki hareket silinsin mi?`}
                          />
                        </form>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
