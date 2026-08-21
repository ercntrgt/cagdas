import type { SupabaseClient } from '@supabase/supabase-js'
import type { StockOption } from '@/components/stock-picker'

/** Hisse seçici için sembol listesi (KAP sistem sembolleri + kullanıcının ekledikleri). */
export async function getStockOptions(
  supabase: SupabaseClient,
): Promise<StockOption[]> {
  const { data } = await supabase
    .from('stocks')
    .select('symbol,title')
    .order('symbol')
    .limit(2000)

  return (data ?? []) as StockOption[]
}
