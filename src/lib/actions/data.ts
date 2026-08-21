'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseNumber } from '@/lib/format'
import type { Stock } from '@/types/db'

export type FormState = { error?: string; success?: string }

/** Tüm veri sayfalarını tazeler (bir işlem her ekranı etkiler). */
function revalidateAll() {
  for (const p of ['/', '/islemler', '/portfoy', '/cuzdan', '/fiyatlar', '/raporlar']) {
    revalidatePath(p)
  }
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim()
}

/** Postgres/PostgREST hatalarını okunabilir Türkçeye çevirir. */
function dbError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('duplicate key') && m.includes('price_entries'))
    return 'Bu hisse için bu tarihe zaten fiyat girilmiş.'
  if (m.includes('duplicate key')) return 'Bu kayıt zaten mevcut.'
  if (m.includes('violates check constraint') && m.includes('quantity'))
    return 'Adet sıfırdan büyük olmalı.'
  if (m.includes('violates check constraint') && m.includes('amount'))
    return 'Tutar sıfırdan büyük olmalı.'
  if (m.includes('violates row-level security'))
    return 'Bu işlem için yetkiniz yok.'
  return message
}

/* ====================================================================== İşlem */

export async function createTrade(_prev: FormState, formData: FormData): Promise<FormState> {
  const symbol = field(formData, 'symbol').toUpperCase()
  const side = field(formData, 'side')
  const quantity = parseNumber(field(formData, 'quantity'))
  const unitPrice = parseNumber(field(formData, 'unit_price'))
  const commission = parseNumber(field(formData, 'commission')) ?? 0
  const tradeDate = field(formData, 'trade_date')
  const note = field(formData, 'note')

  if (!symbol) return { error: 'Hisse seçin.' }
  if (side !== 'buy' && side !== 'sell') return { error: 'İşlem tipi geçersiz.' }
  if (quantity === null || quantity <= 0) return { error: 'Geçerli bir adet girin.' }
  if (unitPrice === null || unitPrice < 0) return { error: 'Geçerli bir birim fiyat girin.' }
  if (commission < 0) return { error: 'Komisyon negatif olamaz.' }
  if (!tradeDate) return { error: 'İşlem tarihi zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('trades').insert({
    symbol,
    side,
    quantity,
    unit_price: unitPrice,
    commission,
    trade_date: tradeDate,
    note: note || null,
  })

  if (error) return { error: dbError(error.message) }

  revalidateAll()
  return {
    success: `${symbol} ${side === 'buy' ? 'alış' : 'satış'} işlemi kaydedildi.`,
  }
}

/** Doğrudan <form action={deleteTrade}> olarak kullanılır. */
export async function deleteTrade(formData: FormData): Promise<void> {
  const id = field(formData, 'id')
  if (!id) throw new Error('Silinecek kayıt bulunamadı.')

  const supabase = await createClient()
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw new Error(dbError(error.message))

  revalidateAll()
}

/* ====================================================================== Cüzdan */

export async function createCash(_prev: FormState, formData: FormData): Promise<FormState> {
  const type = field(formData, 'type')
  const amount = parseNumber(field(formData, 'amount'))
  const bank = field(formData, 'bank')
  const note = field(formData, 'note')
  const transactionDate = field(formData, 'transaction_date')

  if (type !== 'deposit' && type !== 'withdrawal') return { error: 'Hareket tipi geçersiz.' }
  if (amount === null || amount <= 0) return { error: 'Geçerli bir tutar girin.' }
  if (!transactionDate) return { error: 'Tarih zorunludur.' }

  const supabase = await createClient()
  const { error } = await supabase.from('cash_transactions').insert({
    type,
    amount,
    bank: bank || null,
    note: note || null,
    transaction_date: transactionDate,
  })

  if (error) return { error: dbError(error.message) }

  revalidateAll()
  return { success: type === 'deposit' ? 'Para girişi kaydedildi.' : 'Para çıkışı kaydedildi.' }
}

/** Doğrudan <form action={deleteCash}> olarak kullanılır. */
export async function deleteCash(formData: FormData): Promise<void> {
  const id = field(formData, 'id')
  if (!id) throw new Error('Silinecek kayıt bulunamadı.')

  const supabase = await createClient()
  const { error } = await supabase.from('cash_transactions').delete().eq('id', id)
  if (error) throw new Error(dbError(error.message))

  revalidateAll()
}

/* ====================================================================== Fiyat */

/** Toplu fiyat güncelleme: price_<SEMBOL> alanlarını okur, boş olanları atlar. */
export async function savePrices(_prev: FormState, formData: FormData): Promise<FormState> {
  const asOfDate = field(formData, 'as_of_date')
  if (!asOfDate) return { error: 'Tarih zorunludur.' }

  const rows: { symbol: string; price: number; as_of_date: string }[] = []

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('price_')) continue
    const raw = String(value).trim()
    if (!raw) continue

    const symbol = key.slice('price_'.length).toUpperCase()
    const price = parseNumber(raw)
    if (price === null || price < 0) return { error: `${symbol} için geçersiz fiyat: ${raw}` }

    rows.push({ symbol, price, as_of_date: asOfDate })
  }

  if (rows.length === 0) return { error: 'Güncellenecek fiyat girilmedi.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('price_entries')
    .upsert(rows, { onConflict: 'user_id,symbol,as_of_date' })

  if (error) return { error: dbError(error.message) }

  revalidateAll()
  return { success: `${rows.length} hissenin fiyatı güncellendi.` }
}

/** Doğrudan <form action={deletePrice}> olarak kullanılır. */
export async function deletePrice(formData: FormData): Promise<void> {
  const id = field(formData, 'id')
  if (!id) throw new Error('Silinecek kayıt bulunamadı.')

  const supabase = await createClient()
  const { error } = await supabase.from('price_entries').delete().eq('id', id)
  if (error) throw new Error(dbError(error.message))

  revalidateAll()
}

/* ====================================================================== Hisse */

/** Listede olmayan bir sembolü kullanıcının kendi listesine ekler. */
export async function createStock(
  symbolInput: string,
  titleInput: string,
): Promise<{ error?: string; stock?: Stock }> {
  const symbol = symbolInput.trim().toUpperCase()
  const title = titleInput.trim() || symbol

  if (!symbol) return { error: 'Sembol boş olamaz.' }
  if (!/^[A-Z0-9.]{1,16}$/.test(symbol))
    return { error: 'Sembol yalnızca harf ve rakamlardan oluşmalı (en fazla 16 karakter).' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı.' }

  const { data, error } = await supabase
    .from('stocks')
    .insert({ symbol, title, user_id: user.id })
    .select()
    .single()

  if (error) {
    if (error.message.toLowerCase().includes('duplicate key'))
      return { error: `${symbol} zaten listenizde.` }
    return { error: dbError(error.message) }
  }

  revalidateAll()
  return { stock: data as Stock }
}
