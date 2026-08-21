-- ============================================================================
-- Dönemsel raporlara alış/satış tutarı ve işlem hacmi eklendi.
--   alış tutarı  = adet × birim fiyat (alışlar)
--   satış tutarı = adet × birim fiyat (satışlar)
--   işlem hacmi  = alış tutarı + satış tutarı  (komisyon hariç, brüt çevrim)
-- ============================================================================

drop view if exists public.realized_pnl_daily;
drop view if exists public.realized_pnl_weekly;
drop view if exists public.trade_activity_monthly;

create view public.realized_pnl_daily with (security_invoker = true) as
select
  user_id,
  trade_date                                                            as day,
  round(coalesce(sum(realized_pnl), 0), 2)                              as gross_pnl,
  round(sum(commission), 2)                                             as commission,
  round(coalesce(sum(realized_pnl), 0) - sum(commission), 2)            as net_pnl,
  count(*) filter (where side = 'buy')                                  as buy_count,
  count(*) filter (where side = 'sell')                                 as sell_count,
  count(*)                                                              as trade_count,
  round(coalesce(sum(quantity * unit_price) filter (where side = 'buy'), 0), 2)  as buy_amount,
  round(coalesce(sum(quantity * unit_price) filter (where side = 'sell'), 0), 2) as sell_amount,
  round(coalesce(sum(quantity * unit_price), 0), 2)                     as volume
from public.trades
group by user_id, trade_date;

create view public.realized_pnl_weekly with (security_invoker = true) as
select
  user_id,
  date_trunc('week', trade_date)::date                                  as period,
  round(coalesce(sum(realized_pnl), 0), 2)                              as gross_pnl,
  round(sum(commission), 2)                                             as commission,
  round(coalesce(sum(realized_pnl), 0) - sum(commission), 2)            as net_pnl,
  count(*) filter (where side = 'buy')                                  as buy_count,
  count(*) filter (where side = 'sell')                                 as sell_count,
  count(*)                                                              as trade_count,
  round(coalesce(sum(quantity * unit_price) filter (where side = 'buy'), 0), 2)  as buy_amount,
  round(coalesce(sum(quantity * unit_price) filter (where side = 'sell'), 0), 2) as sell_amount,
  round(coalesce(sum(quantity * unit_price), 0), 2)                     as volume
from public.trades
group by user_id, date_trunc('week', trade_date);

create view public.trade_activity_monthly with (security_invoker = true) as
select
  user_id,
  date_trunc('month', trade_date)::date                                 as period,
  round(coalesce(sum(realized_pnl), 0), 2)                              as gross_pnl,
  round(sum(commission), 2)                                             as commission,
  round(coalesce(sum(realized_pnl), 0) - sum(commission), 2)            as net_pnl,
  count(*) filter (where side = 'buy')                                  as buy_count,
  count(*) filter (where side = 'sell')                                 as sell_count,
  count(*)                                                              as trade_count,
  round(coalesce(sum(quantity * unit_price) filter (where side = 'buy'), 0), 2)  as buy_amount,
  round(coalesce(sum(quantity * unit_price) filter (where side = 'sell'), 0), 2) as sell_amount,
  round(coalesce(sum(quantity * unit_price), 0), 2)                     as volume
from public.trades
group by user_id, date_trunc('month', trade_date);

grant select on
  public.realized_pnl_daily,
  public.realized_pnl_weekly,
  public.trade_activity_monthly
to authenticated;
