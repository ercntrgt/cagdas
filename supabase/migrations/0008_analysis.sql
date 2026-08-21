-- ============================================================================
-- Analiz katmanı
--   symbol_analysis        : hisse başına ayrıntılı istatistik
--   get_analysis_summary() : başarı oranı, kâr faktörü, komisyon yükü vb.
--
-- Not: "kâr faktörü" = toplam brüt kâr / toplam brüt zarar. 1'in üzeri kazandıran
-- bir geçmişe, altı kaybettiren bir geçmişe işaret eder.
-- ============================================================================

create or replace view public.symbol_analysis with (security_invoker = true) as
with t as (
  select
    user_id,
    symbol,
    count(*)                                                        as trade_count,
    count(*) filter (where side = 'buy')                            as buy_count,
    count(*) filter (where side = 'sell')                           as sell_count,
    coalesce(sum(quantity) filter (where side = 'buy'), 0)          as buy_qty,
    coalesce(sum(quantity) filter (where side = 'sell'), 0)         as sell_qty,
    coalesce(sum(quantity * unit_price) filter (where side = 'buy'), 0)  as buy_amount,
    coalesce(sum(quantity * unit_price) filter (where side = 'sell'), 0) as sell_amount,
    coalesce(sum(commission), 0)                                    as commission,
    coalesce(sum(realized_pnl), 0)                                  as realized_gross,
    count(*) filter (where side = 'sell' and realized_pnl > 0)      as win_sells,
    count(*) filter (where side = 'sell' and realized_pnl < 0)      as loss_sells,
    max(realized_pnl)                                               as best_sell,
    min(realized_pnl)                                               as worst_sell,
    min(trade_date)                                                 as first_trade_date,
    max(trade_date)                                                 as last_trade_date
  from public.trades
  group by user_id, symbol
)
select
  t.user_id,
  t.symbol,
  (select s.title from public.stocks s
    where s.symbol = t.symbol and (s.user_id is null or s.user_id = t.user_id)
    order by s.user_id nulls first limit 1)                          as title,
  t.trade_count,
  t.buy_count,
  t.sell_count,
  round(t.buy_qty, 6)                                                as buy_qty,
  round(t.sell_qty, 6)                                               as sell_qty,
  round(t.buy_qty - t.sell_qty, 6)                                   as open_qty,
  round(t.buy_amount, 2)                                             as buy_amount,
  round(t.sell_amount, 2)                                            as sell_amount,
  round(t.buy_amount + t.sell_amount, 2)                             as volume,
  case when t.buy_qty  > 0 then round(t.buy_amount  / t.buy_qty,  4) end as avg_buy_price,
  case when t.sell_qty > 0 then round(t.sell_amount / t.sell_qty, 4) end as avg_sell_price,
  round(t.commission, 2)                                             as commission,
  round(t.realized_gross, 2)                                         as realized_gross,
  round(t.realized_gross - t.commission, 2)                          as realized_net,
  round(coalesce(p.unrealized_pnl, 0), 2)                            as unrealized_pnl,
  round(coalesce(p.market_value, 0), 2)                              as market_value,
  round(coalesce(p.total_cost, 0), 2)                                as open_cost,
  p.avg_cost                                                         as avg_cost,
  p.last_price                                                       as last_price,
  round(t.realized_gross - t.commission + coalesce(p.unrealized_pnl, 0), 2) as total_pnl,
  t.win_sells,
  t.loss_sells,
  round(t.best_sell, 2)                                              as best_sell,
  round(t.worst_sell, 2)                                             as worst_sell,
  t.first_trade_date,
  t.last_trade_date,
  (t.last_trade_date - t.first_trade_date)                           as span_days,
  case when t.buy_amount > 0
       then round(((t.realized_gross - t.commission + coalesce(p.unrealized_pnl, 0))
                   / t.buy_amount) * 100, 2)
  end                                                                as roi_pct
from t
left join public.positions p on p.user_id = t.user_id and p.symbol = t.symbol;

grant select on public.symbol_analysis to authenticated;

-- ---------------------------------------------------------------------------
-- Genel analiz özeti
-- ---------------------------------------------------------------------------
create or replace function public.get_analysis_summary()
returns jsonb
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  s     record;
  p     record;
  y     record;
begin
  if v_uid is null then return '{}'::jsonb; end if;

  select
    count(*)                                                        as trade_count,
    count(*) filter (where side = 'sell')                           as sell_count,
    count(*) filter (where side = 'sell' and realized_pnl > 0)      as win_count,
    count(*) filter (where side = 'sell' and realized_pnl < 0)      as loss_count,
    count(*) filter (where side = 'sell' and realized_pnl = 0)      as flat_count,
    coalesce(sum(realized_pnl)  filter (where realized_pnl > 0), 0) as total_win,
    coalesce(-sum(realized_pnl) filter (where realized_pnl < 0), 0) as total_loss,
    coalesce(avg(realized_pnl)  filter (where realized_pnl > 0), 0) as avg_win,
    coalesce(-avg(realized_pnl) filter (where realized_pnl < 0), 0) as avg_loss,
    coalesce(max(realized_pnl), 0)                                  as best,
    coalesce(min(realized_pnl), 0)                                  as worst,
    coalesce(sum(commission), 0)                                    as commission,
    coalesce(sum(realized_pnl), 0)                                  as realized_gross,
    coalesce(sum(quantity * unit_price), 0)                         as volume
  into s
  from public.trades where user_id = v_uid;

  select
    coalesce(sum(unrealized_pnl), 0) as unrealized,
    coalesce(sum(market_value), 0)   as market_value,
    coalesce(sum(total_cost), 0)     as cost,
    count(*)                         as position_count
  into p
  from public.positions where user_id = v_uid;

  select
    count(*)                                                            as symbol_count,
    count(*) filter (where total_pnl > 0)                               as winning_symbols,
    count(*) filter (where total_pnl < 0)                               as losing_symbols,
    coalesce(round(avg(span_days) filter
      (where open_qty <= 0.000001 and sell_count > 0)), 0)              as avg_span_days,
    count(*) filter (where open_qty <= 0.000001 and sell_count > 0)     as closed_symbols
  into y
  from public.symbol_analysis where user_id = v_uid;

  return jsonb_build_object(
    'trade_count',      s.trade_count,
    'sell_count',       s.sell_count,
    'win_count',        s.win_count,
    'loss_count',       s.loss_count,
    'flat_count',       s.flat_count,
    'win_rate',         case when s.sell_count > 0
                             then round((s.win_count::numeric / s.sell_count) * 100, 1) end,
    'total_win',        round(s.total_win, 2),
    'total_loss',       round(s.total_loss, 2),
    'avg_win',          round(s.avg_win, 2),
    'avg_loss',         round(s.avg_loss, 2),
    'profit_factor',    case when s.total_loss > 0
                             then round(s.total_win / s.total_loss, 2) end,
    'best_trade',       round(s.best, 2),
    'worst_trade',      round(s.worst, 2),
    'commission',       round(s.commission, 2),
    'commission_ratio', case when s.total_win > 0
                             then round((s.commission / s.total_win) * 100, 1) end,
    'volume',           round(s.volume, 2),
    'realized_gross',   round(s.realized_gross, 2),
    'realized_net',     round(s.realized_gross - s.commission, 2),
    'unrealized',       round(p.unrealized, 2),
    'total_pnl',        round(s.realized_gross - s.commission + p.unrealized, 2),
    'market_value',     round(p.market_value, 2),
    'open_cost',        round(p.cost, 2),
    'position_count',   p.position_count,
    'symbol_count',     y.symbol_count,
    'winning_symbols',  y.winning_symbols,
    'losing_symbols',   y.losing_symbols,
    'closed_symbols',   y.closed_symbols,
    'avg_span_days',    y.avg_span_days
  );
end;
$fn$;

grant execute on function public.get_analysis_summary() to authenticated;
