'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createCash, type FormState } from '@/lib/actions/data'
import { SubmitButton } from '@/components/forms'
import { Card, CardHeader, Field, FormError, FormSuccess, Input, Select, Textarea } from '@/components/ui'
import { today } from '@/lib/format'

export default function CashForm() {
  const [state, action] = useActionState<FormState, FormData>(createCash, {})
  const [type, setType] = useState('deposit')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <Card>
      <CardHeader
        title="Nakit hareketi ekle"
        description="Hesabınıza yatırdığınız veya çektiğiniz parayı kaydedin."
      />
      <form ref={formRef} action={action} className="space-y-4 p-5">
        <FormError>{state.error}</FormError>
        <FormSuccess>{state.success}</FormSuccess>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hareket tipi">
            <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="deposit">Para girişi (yatırma)</option>
              <option value="withdrawal">Para çıkışı (çekme)</option>
            </Select>
          </Field>

          <Field label="Tutar (₺)">
            <Input
              name="amount"
              inputMode="decimal"
              placeholder="10.000,00"
              required
              className="tnum"
            />
          </Field>

          <Field label="Banka / hesap detayı" hint="Örn. Ziraat Bankası — vadesiz TL">
            <Input name="bank" placeholder="Banka adı veya hesap" maxLength={120} />
          </Field>

          <Field label="Tarih">
            <Input name="transaction_date" type="date" defaultValue={today()} required />
          </Field>
        </div>

        <Field label="Not">
          <Textarea name="note" placeholder="Açıklama (isteğe bağlı)" maxLength={500} />
        </Field>

        <SubmitButton pendingText="Kaydediliyor…">
          {type === 'deposit' ? 'Para girişi kaydet' : 'Para çıkışı kaydet'}
        </SubmitButton>
      </form>
    </Card>
  )
}
