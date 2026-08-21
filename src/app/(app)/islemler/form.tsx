'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createTrade, type FormState } from '@/lib/actions/data'
import { StockPicker, type StockOption } from '@/components/stock-picker'
import { SubmitButton } from '@/components/forms'
import { Card, CardHeader, Field, FormError, FormSuccess, Input, Select, Textarea } from '@/components/ui'
import { parseNumber, money, today } from '@/lib/format'

export default function TradeForm({ stocks }: { stocks: StockOption[] }) {
  const [state, action] = useActionState<FormState, FormData>(createTrade, {})
  const [side, setSide] = useState('buy')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [commission, setCommission] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!state.success) return
    formRef.current?.reset()
    setQuantity('')
    setUnitPrice('')
    setCommission('')
    setResetKey((k) => k + 1) // hisse seçiciyi de sıfırla
  }, [state.success])

  const q = parseNumber(quantity) ?? 0
  const p = parseNumber(unitPrice) ?? 0
  const c = parseNumber(commission) ?? 0
  const gross = q * p
  const cash = side === 'buy' ? gross + c : gross - c

  return (
    <Card>
      <CardHeader
        title="Yeni işlem"
        description="Gerçekleştirdiğiniz alım veya satımı kaydedin."
      />
      <form ref={formRef} action={action} className="space-y-4 p-5">
        <FormError>{state.error}</FormError>
        <FormSuccess>{state.success}</FormSuccess>

        <Field label="Hisse" hint="Kod veya şirket adıyla arayın; listede yoksa ekleyebilirsiniz.">
          <StockPicker key={resetKey} name="symbol" stocks={stocks} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="İşlem tipi">
            <Select name="side" value={side} onChange={(e) => setSide(e.target.value)}>
              <option value="buy">Alış</option>
              <option value="sell">Satış</option>
            </Select>
          </Field>

          <Field label="Tarih">
            <Input name="trade_date" type="date" defaultValue={today()} required />
          </Field>

          <Field label="Adet">
            <Input
              name="quantity"
              inputMode="decimal"
              placeholder="100"
              required
              className="tnum"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>

          <Field label={side === 'buy' ? 'Alış birim fiyatı (₺)' : 'Satış birim fiyatı (₺)'}>
            <Input
              name="unit_price"
              inputMode="decimal"
              placeholder="40,50"
              required
              className="tnum"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Komisyon / masraf (₺)" hint="İşleme özel — boş bırakırsanız 0 kabul edilir.">
          <Input
            name="commission"
            inputMode="decimal"
            placeholder="0,00"
            className="tnum"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
          />
        </Field>

        <Field label="Not">
          <Textarea name="note" placeholder="Açıklama (isteğe bağlı)" maxLength={500} />
        </Field>

        {gross > 0 ? (
          <dl className="space-y-1 rounded-lg bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">İşlem tutarı</dt>
              <dd className="tnum font-medium">{money(gross)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Komisyon</dt>
              <dd className="tnum">{money(c)}</dd>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-1">
              <dt className="font-medium">
                {side === 'buy' ? 'Cüzdandan çıkacak' : 'Cüzdana girecek'}
              </dt>
              <dd className="tnum font-semibold">{money(cash)}</dd>
            </div>
          </dl>
        ) : null}

        <SubmitButton pendingText="Kaydediliyor…">
          {side === 'buy' ? 'Alış işlemini kaydet' : 'Satış işlemini kaydet'}
        </SubmitButton>
      </form>
    </Card>
  )
}
