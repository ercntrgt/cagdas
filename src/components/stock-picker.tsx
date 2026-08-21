'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createStock } from '@/lib/actions/data'
import { cn, inputClass } from '@/components/ui'

export type StockOption = { symbol: string; title: string }

/** Türkçe karakterleri ASCII'ye indirger — "sise" yazınca "ŞİŞE" bulunur. */
function norm(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
}

const MAX_RESULTS = 40

/**
 * Arama sıralaması ipucu: yoğun işlem gören, adı sık aranan hisseler.
 * Bu bir endeks üyeliği listesi DEĞİLDİR — yalnızca "sa" yazınca SASA'nın
 * SAFKR/SAMAT gibi az bilinen kodların önüne geçmesi için kullanılır.
 */
const POPULAR = new Set([
  'AKBNK', 'ALARK', 'ARCLK', 'ASELS', 'BIMAS', 'EKGYO', 'ENKAI', 'EREGL',
  'FROTO', 'GARAN', 'GUBRF', 'HEKTS', 'ISCTR', 'KCHOL', 'KONTR', 'KRDMD',
  'ODAS', 'OYAKC', 'PETKM', 'PGSUS', 'SAHOL', 'SASA', 'SISE', 'SOKM',
  'TAVHL', 'TCELL', 'THYAO', 'TOASO', 'TTKOM', 'TUPRS', 'TURSG', 'VESTL',
  'YKBNK',
])

/** Aynı gruptaki adaylar: önce bilinen hisseler, sonra kısa kod, sonra alfabetik. */
function rank(a: StockOption, b: StockOption): number {
  const pa = POPULAR.has(a.symbol) ? 0 : 1
  const pb = POPULAR.has(b.symbol) ? 0 : 1
  if (pa !== pb) return pa - pb
  if (a.symbol.length !== b.symbol.length) return a.symbol.length - b.symbol.length
  return a.symbol.localeCompare(b.symbol, 'tr')
}

/**
 * Sembol öncelikli sıralama:
 *   1. tam eşleşme        SASA -> SASA
 *   2. sembol başlangıcı  sa   -> SASA, SAHOL, SANFM…
 *   3. sembol içinde
 *   4. şirket unvanında
 */
function search(stocks: StockOption[], query: string): StockOption[] {
  const q = norm(query.trim())
  if (!q) return [...stocks].sort(rank).slice(0, MAX_RESULTS)

  const buckets: StockOption[][] = [[], [], [], []]

  for (const stock of stocks) {
    const symbol = norm(stock.symbol)
    if (symbol === q) buckets[0].push(stock)
    else if (symbol.startsWith(q)) buckets[1].push(stock)
    else if (symbol.includes(q)) buckets[2].push(stock)
    else if (norm(stock.title).includes(q)) buckets[3].push(stock)
  }

  return buckets.flatMap((bucket) => bucket.sort(rank)).slice(0, MAX_RESULTS)
}

export function StockPicker({
  name = 'symbol',
  stocks,
  defaultSymbol = '',
  required,
  autoFocus,
}: {
  name?: string
  stocks: StockOption[]
  defaultSymbol?: string
  required?: boolean
  autoFocus?: boolean
}) {
  const [options, setOptions] = useState(stocks)
  const [selected, setSelected] = useState<StockOption | null>(
    () => stocks.find((s) => s.symbol === defaultSymbol) ?? null,
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [addError, setAddError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const results = useMemo(() => search(options, query), [options, query])

  const typed = query.trim().toUpperCase()
  const canAdd =
    typed.length > 0 &&
    /^[A-Z0-9.]{1,16}$/.test(typed) &&
    !options.some((s) => s.symbol === typed)

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Klavyeyle gezinirken aktif satırı görünür tut
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: 'nearest',
    })
  }, [active, open])

  function choose(stock: StockOption) {
    setSelected(stock)
    setQuery('')
    setOpen(false)
    setAddError(null)
  }

  function addNew() {
    if (!canAdd || pending) return
    setAddError(null)
    startTransition(async () => {
      const result = await createStock(typed, typed)
      if (result.error) {
        setAddError(result.error)
        return
      }
      if (result.stock) {
        const option = { symbol: result.stock.symbol, title: result.stock.title }
        setOptions((prev) => [...prev, option])
        choose(option)
      }
    })
  }

  const itemCount = results.length + (canAdd ? 1 : 0)

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (itemCount === 0 ? 0 : (i + step + itemCount) % itemCount))
      return
    }
    if (event.key === 'Enter') {
      if (!open) return
      event.preventDefault()
      if (active < results.length) choose(results[active])
      else if (canAdd) addNew()
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selected?.symbol ?? ''} required={required} />

      {selected && !open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setQuery('')
            setActive(0)
            requestAnimationFrame(() =>
              rootRef.current?.querySelector<HTMLInputElement>('input[type="text"]')?.focus(),
            )
          }}
          className={cn(inputClass, 'flex items-center justify-between text-left')}
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="font-semibold">{selected.symbol}</span>
            <span className="truncate text-xs text-[var(--muted)]">{selected.title}</span>
          </span>
          <span className="ml-2 shrink-0 text-xs text-[var(--muted)]">değiştir</span>
        </button>
      ) : (
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder="Hisse kodu veya şirket adı — örn. SASA"
          className={inputClass}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
            setAddError(null)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      )}

      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <ul ref={listRef} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {results.map((stock, index) => (
              <li key={stock.symbol}>
                <button
                  type="button"
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(stock)}
                  className={cn(
                    'flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm',
                    index === active && 'bg-black/[0.05] dark:bg-white/[0.08]',
                  )}
                >
                  <span className="w-16 shrink-0 font-semibold">{stock.symbol}</span>
                  <span className="truncate text-xs text-[var(--muted)]">{stock.title}</span>
                </button>
              </li>
            ))}

            {canAdd ? (
              <li className={results.length ? 'border-t border-[var(--border)]' : undefined}>
                <button
                  type="button"
                  data-active={active === results.length}
                  onMouseEnter={() => setActive(results.length)}
                  onClick={addNew}
                  disabled={pending}
                  className={cn(
                    'w-full px-3 py-2.5 text-left text-sm disabled:opacity-60',
                    active === results.length && 'bg-black/[0.05] dark:bg-white/[0.08]',
                  )}
                >
                  {pending ? (
                    <>“{typed}” ekleniyor…</>
                  ) : (
                    <>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        “{typed}” sembolünü ekle
                      </span>
                      <span className="ml-1 text-xs text-[var(--muted)]">
                        (listede yok — kendi listenize eklenir)
                      </span>
                    </>
                  )}
                </button>
              </li>
            ) : null}

            {results.length === 0 && !canAdd ? (
              <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                Sonuç bulunamadı.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {addError ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{addError}</p>
      ) : null}
    </div>
  )
}
