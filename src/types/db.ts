// Supabase şema tipleri. Yeniden üretmek için:
//   supabase gen types typescript --local > src/types/db.ts
export type CashType = 'deposit' | 'withdrawal'
export type TradeSide = 'buy' | 'sell'

export interface Stock {
  id: string
  symbol: string
  title: string
  city: string | null
  user_id: string | null
  created_at: string
}

export interface CashTransaction {
  id: string
  user_id: string
  type: CashType
  amount: number
  bank: string | null
  note: string | null
  transaction_date: string
  created_at: string
}

export interface Trade {
  id: string
  user_id: string
  symbol: string
  side: TradeSide
  quantity: number
  unit_price: number
  commission: number
  note: string | null
  trade_date: string
  /** Ortalama maliyet — sistem hesaplar */
  cost_basis: number | null
  /** Brüt gerçekleşen K/Z (yalnızca satışlarda) — sistem hesaplar */
  realized_pnl: number | null
  created_at: string
}

export interface PriceEntry {
  id: string
  user_id: string
  symbol: string
  price: number
  as_of_date: string
  created_at: string
}

export interface Position {
  user_id: string
  symbol: string
  title: string | null
  quantity: number
  avg_cost: number
  total_cost: number
  last_price: number | null
  price_date: string | null
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_pct: number | null
  first_trade_date: string
  last_trade_date: string
}

export interface WalletBalance {
  user_id: string
  total_deposits: number
  total_withdrawals: number
  total_buy_amount: number
  total_sell_amount: number
  total_commission: number
  balance: number
}

export interface PeriodPnl {
  user_id: string
  gross_pnl: number
  commission: number
  net_pnl: number
  buy_count: number
  sell_count: number
  trade_count: number
  /** Dönemdeki alışların toplam tutarı */
  buy_amount: number
  /** Dönemdeki satışların toplam tutarı */
  sell_amount: number
  /** İşlem hacmi = alış + satış tutarı (komisyon hariç) */
  volume: number
}

export type DailyPnl = PeriodPnl & { day: string }
export type PeriodicPnl = PeriodPnl & { period: string }

export interface SymbolPnl extends PeriodPnl {
  symbol: string
  title: string | null
  total_bought: number
  total_sold: number
  open_quantity: number
  first_trade_date: string
  last_trade_date: string
}

export interface PortfolioHistoryPoint {
  day: string
  cost_value: number
  market_value: number
  cash_balance: number
  total_value: number
}

export interface DashboardSummary {
  cash_balance: number
  total_deposits: number
  total_withdrawals: number
  total_commission: number
  invested_cost: number
  portfolio_value: number
  unrealized_pnl: number
  position_count: number
  total_assets: number
  realized_gross: number
  realized_net: number
  realized_today: number
  realized_week: number
  realized_month: number
  realized_net_today: number
  realized_net_week: number
  realized_net_month: number
  trade_count: number
  trade_count_month: number
  trade_count_week: number
  trade_count_today: number
}

/** symbol_analysis view'ı — hisse başına ayrıntılı istatistik */
export interface SymbolAnalysis {
  user_id: string
  symbol: string
  title: string | null
  trade_count: number
  buy_count: number
  sell_count: number
  buy_qty: number
  sell_qty: number
  open_qty: number
  buy_amount: number
  sell_amount: number
  volume: number
  avg_buy_price: number | null
  avg_sell_price: number | null
  commission: number
  realized_gross: number
  realized_net: number
  unrealized_pnl: number
  market_value: number
  open_cost: number
  avg_cost: number | null
  last_price: number | null
  /** Gerçekleşen net + gerçekleşmemiş */
  total_pnl: number
  win_sells: number
  loss_sells: number
  best_sell: number | null
  worst_sell: number | null
  first_trade_date: string
  last_trade_date: string
  span_days: number
  roi_pct: number | null
}

/** get_analysis_summary() çıktısı */
export interface AnalysisSummary {
  trade_count: number
  sell_count: number
  win_count: number
  loss_count: number
  flat_count: number
  /** Kârla kapanan satışların yüzdesi */
  win_rate: number | null
  total_win: number
  total_loss: number
  avg_win: number
  avg_loss: number
  /** Toplam brüt kâr / toplam brüt zarar */
  profit_factor: number | null
  best_trade: number
  worst_trade: number
  commission: number
  /** Komisyonun toplam brüt kâra oranı (%) */
  commission_ratio: number | null
  volume: number
  realized_gross: number
  realized_net: number
  unrealized: number
  total_pnl: number
  market_value: number
  open_cost: number
  position_count: number
  symbol_count: number
  winning_symbols: number
  losing_symbols: number
  closed_symbols: number
  avg_span_days: number
}
