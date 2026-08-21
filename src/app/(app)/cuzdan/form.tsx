'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createCash, updateCash, type FormState } from '@/lib/actions/data'
import { SubmitButton } from '@/components/forms'
import { Card, CardHeader, Field, FormError, FormSuccess, Input, Select, Textarea } from '@/components/ui'
import { today } from '@/lib/format'
import type { CashTransaction } from '@/types/db'

const ETIKET = {
  deposit: { baslik: 'Para girişi kaydet', banka: 'Banka / hesap detayı', ipucu: 'Örn. Ziraat Bankası — vadesiz TL' },
  withdrawal: { baslik: 'Para çıkışı kaydet', banka: 'Banka / hesap detayı', ipucu: 'Paranın çekildiği hesap' },
  commission: { baslik: 'Komisyonu kaydet', banka: 'Aracı kurum', ipucu: 'Komisyonu kesen kurum (isteğe bağlı)' },
} as const

export default function CashForm({ initial }: { initial?: CashTransaction | null }) {
  const duzenleme = Boolean(initial)
  const [state, action] = useActionState<FormState, FormData>(
    duzenleme ? updateCash : createCash,
    {},
  )
  const [type, setType] = useState<keyof typeof ETIKET>(initial?.type ?? 'deposit')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  const e = ETIKET[type]

  return (
    <Card>
      <CardHeader
        title={duzenleme ? 'Hareketi düzenle' : 'Nakit hareketi ekle'}
        description={
          duzenleme
            ? 'Değişiklik kaydedilince bakiye yeniden hesaplanır.'
            : 'Para giriş/çıkışı veya ödediğiniz komisyonu kaydedin.'
        }
        action={
          duzenleme ? (
            <Link href="/cuzdan" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
              Vazgeç
            </Link>
          ) : null
        }
      />
      <form ref={formRef} action={action} className="space-y-4 p-5">
        {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
        <FormError>{state.error}</FormError>
        <FormSuccess>{state.success}</FormSuccess>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hareket tipi">
            <Select
              name="type"
              value={type}
              onChange={(ev) => setType(ev.target.value as keyof typeof ETIKET)}
            >
              <option value="deposit">Para girişi (yatırma)</option>
              <option value="withdrawal">Para çıkışı (çekme)</option>
              <option value="commission">Komisyon / masraf</option>
            </Select>
          </Field>

          <Field label="Tutar (₺)">
            <Input
              name="amount"
              inputMode="decimal"
              placeholder="10.000,00"
              required
              defaultValue={initial ? String(initial.amount).replace('.', ',') : ''}
              className="tnum"
            />
          </Field>

          <Field label={e.banka} hint={e.ipucu}>
            <Input name="bank" maxLength={120} defaultValue={initial?.bank ?? ''} />
          </Field>

          <Field label="Tarih">
            <Input
              name="transaction_date"
              type="date"
              defaultValue={initial?.transaction_date ?? today()}
              required
            />
          </Field>
        </div>

        <Field label="Not">
          <Textarea
            name="note"
            placeholder="Açıklama (isteğe bağlı)"
            maxLength={500}
            defaultValue={initial?.note ?? ''}
          />
        </Field>

        {type === 'commission' ? (
          <p className="rounded-lg bg-black/[0.03] px-3 py-2 text-xs leading-relaxed text-[var(--muted)] dark:bg-white/[0.04]">
            Komisyon bakiyeden düşülür ve raporlarda gider olarak sayılır — net kâr/zararınızı
            azaltır. İşlem başına komisyon da giriyorsanız ikisi toplanır, mükerrer girmeyin.
          </p>
        ) : null}

        <SubmitButton pendingText="Kaydediliyor…">
          {duzenleme ? 'Değişikliği kaydet' : e.baslik}
        </SubmitButton>
      </form>
    </Card>
  )
}
