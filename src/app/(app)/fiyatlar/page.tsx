import { requireUser } from '@/lib/supabase/server'
import { deletePrice } from '@/lib/actions/data'
import { PageHeader } from '@/components/kpi'
import { DeleteButton } from '@/components/forms'
import { Card, CardHeader, Empty, Table, Td, Th } from '@/components/ui'
import { date, price } from '@/lib/format'
import type { Position, PriceEntry } from '@/types/db'
import PriceForm from './form'

export const metadata = { title: 'Fiyatlar' }

export default async function FiyatlarPage() {
  const { supabase } = await requireUser()

  const [{ data: positions }, { data: entries }] = await Promise.all([
    supabase.from('positions').select('*').order('symbol'),
    supabase
      .from('price_entries')
      .select('*')
      .order('as_of_date', { ascending: false })
      .order('symbol')
      .limit(200),
  ])

  const list = (entries ?? []) as PriceEntry[]

  return (
    <>
      <PageHeader
        title="Fiyatlar"
        description="Fiyatlar otomatik çekilmez — güncel değerleri buradan siz girersiniz. Her giriş portföy değeri grafiğinde bir nokta bırakır."
      />

      <div className="space-y-6">
        <PriceForm positions={(positions ?? []) as Position[]} />

        <Card className="overflow-hidden">
          <CardHeader title="Fiyat geçmişi" description={`Son ${list.length} kayıt`} />
          {list.length === 0 ? (
            <Empty>Henüz fiyat girilmemiş.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Tarih</Th>
                  <Th>Hisse</Th>
                  <Th className="text-right">Fiyat</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <Td className="tnum text-[var(--muted)]">{date(e.as_of_date)}</Td>
                    <Td className="font-semibold">{e.symbol}</Td>
                    <Td className="tnum text-right">{price(e.price)}</Td>
                    <Td>
                      <form action={deletePrice}>
                        <input type="hidden" name="id" value={e.id} />
                        <DeleteButton
                          confirmText={`${e.symbol} için ${date(e.as_of_date)} tarihli fiyat kaydı silinsin mi?`}
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
