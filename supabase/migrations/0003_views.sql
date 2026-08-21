-- ============================================================================
-- Görünümler — tüm hesaplama Postgres tarafında, arayüz sadece okur.
-- security_invoker = true  ->  RLS sorguyu yapan kullanıcı için uygulanır.
-- ============================================================================

-- --------------------------------------------------- Açık pozisyonlar --
create or replace view public.positions with (security_invoker = true) as
with agg as (
  select
    t.user_id,
    t.symbol,
    sum(case when t.side = 'buy' then t.quantity else -t.quantity end) as quantity,
    min(t.trade_date) as first_trade_date,
    max(t.trade_date) as last_trade_date
  from public.trades t
  group by t.user_id, t.symbol
),
last_trade as (
  select distinct on (t.user_id, t.symbol)
    t.user_id, t.symbol, t.cost_basis
  from public.trades t
  order by t.user_id, t.symbol, t.trade_date desc, t.created_at desc, t.id desc
),
last_price as (
  select distinct on (p.user_id, p.symbol)
    p.user_id, p.symbol, p.price, p.as_of_date
  from public.price_entries p
  order by p.user_id, p.symbol, p.as_of_date desc, p.created_at desc
)
select
  a.user_id,
  a.symbol,
  (select s.title from public.stocks s
    where s.symbol = a.symbol and (s.user_id is null or s.user_id = a.user_id)
    order by s.user_id nulls first limit 1) as title,
  round(a.quantity, 6)                                       as quantity,
  round(coalesce(lt.cost_basis, 0), 4)                       as avg_cost,
  round(a.quantity * coalesce(lt.cost_basis, 0), 2)          as total_cost,
  lp.price                                                   as last_price,
  lp.as_of_date                                              as price_date,
  round(a.quantity * coalesce(lp.price, lt.cost_basis, 0), 2) as market_value,
  round(a.quantity * (coalesce(lp.price, lt.cost_basis, 0) - coalesce(lt.cost_basis, 0)), 2)
                                                             as unrealized_pnl,
  case when coalesce(lt.cost_basis, 0) > 0 and lp.price is not null
       then round(((lp.price - lt.cost_basis) / lt.cost_basis) * 100, 2)
  end                                                        as unrealized_pnl_pct,
  a.first_trade_date,
  a.last_trade_date
from agg a
left join last_trade lt on lt.user_id = a.user_id and lt.symbol = a.symbol
left join last_price lp on lp.user_id = a.user_id and lp.symbol = a.symbol
where a.quantity > 0.000001;

-- ------------------------------------------------------- Cüzdan bakiyesi --
create or replace view public.wallet_balance with (security_invoker = true) as
with ids as (
  select user_id from public.cash_transactions
  union
  select user_id from public.trades
),
cash as (
  select user_id,
    sum(amount) filter (where type = 'deposit')    as deposits,
    sum(amount) filter (where type = 'withdrawal') as withdrawals
  from public.cash_transactions group by user_id
),
tr as (
  select user_id,
    sum(quantity * unit_price) filter (where side = 'buy')  as buy_amount,
    sum(quantity * unit_price) filter (where side = 'sell') as sell_amount,
    sum(commission)                                          as commission
  from public.trades group by user_id
)
select
  i.user_id,
  round(coalesce(c.deposits, 0), 2)     as total_deposits,
  round(coalesce(c.withdrawals, 0), 2)  as total_withdrawals,
  round(coalesce(t.buy_amount, 0), 2)   as total_buy_amount,
  round(coalesce(t.sell_amount, 0), 2)  as total_sell_amount,
  round(coalesce(t.commission, 0), 2)   as total_commission,
  round(coalesce(c.deposits, 0) - coalesce(c.withdrawals, 0)
        - coalesce(t.buy_amount, 0) + coalesce(t.sell_amount, 0)
        - coalesce(t.commission, 0), 2) as balance
from ids i
left join cash c on c.user_id = i.user_id
left join tr   t on t.user_id = i.user_id;

-- ------------------------------------------ Günlük gerçekleşen kâr/zarar --
create or replace view public.realized_pnl_daily with (security_invoker = true) as
select
  user_id,
  trade_date                                                        as day,
  round(coalesce(sum(realized_pnl), 0), 2)                          as gross_pnl,
  round(sum(commission), 2)                                         as commission,
  round(coalesce(sum(realized_pnl), 0) - sum(commission), 2)        as net_pnl,
  count(*) filter (where side = 'buy')                              as buy_count,
  count(*) filter (where side = 'sell')                             as sell_count,
  count(*)                                                          as trade_count
from public.trades
group by user_id, trade_date;

-- ------------------------------------------ Haftalık gerçekleşen kâr/zarar --
create or replace view public.realized_pnl_weekly with (security_invoker = true) as
select
  user_id,
  date_trunc('week', trade_date)::date                              as period,
  round(coalesce(sum(realized_pnl), 0), 2)                          as gross_pnl,
  round(sum(commission), 2)                                         as commission,
  round(coalesce(sum(realized_pnl), 0) - sum(commission), 2)        as net_pnl,
  count(*) filter (where side = 'buy')                              as buy_count,
  count(*) filter (where side = 'sell')                             as sell_count,
  count(*)                                                          as trade_count
from public.trades
group by user_id, date_trunc('week', trade_date);

-- --------------------------- Aylık kâr/zarar + toplam işlem sayısı --
create or replace view public.trade_activity_monthly with (security_invoker = true) as
select
  user_id,
  date_trunc('month', trade_date)::date                             as period,
  round(coalesce(sum(realized_pnl), 0), 2)                          as gross_pnl,
  round(sum(commission), 2)                                         as commission,
  round(coalesce(sum(realized_pnl), 0) - sum(commission), 2)        as net_pnl,
  count(*) filter (where side = 'buy')                              as buy_count,
  count(*) filter (where side = 'sell')                             as sell_count,
  count(*)                                                          as trade_count
from public.trades
group by user_id, date_trunc('month', trade_date);

-- ------------------------------------------ Hisse bazlı kâr/zarar özeti --
create or replace view public.symbol_pnl_summary with (security_invoker = true) as
select
  t.user_id,
  t.symbol,
  (select s.title from public.stocks s
    where s.symbol = t.symbol and (s.user_id is null or s.user_id = t.user_id)
    order by s.user_id nulls first limit 1)                          as title,
  round(coalesce(sum(t.realized_pnl), 0), 2)                         as gross_pnl,
  round(sum(t.commission), 2)                                        as commission,
  round(coalesce(sum(t.realized_pnl), 0) - sum(t.commission), 2)     as net_pnl,
  count(*) filter (where t.side = 'buy')                             as buy_count,
  count(*) filter (where t.side = 'sell')                            as sell_count,
  count(*)                                                           as trade_count,
  round(sum(case when t.side = 'buy' then t.quantity * t.unit_price else 0 end), 2)
                                                                     as total_bought,
  round(sum(case when t.side = 'sell' then t.quantity * t.unit_price else 0 end), 2)
                                                                     as total_sold,
  round(sum(case when t.side = 'buy' then t.quantity else -t.quantity end), 6)
                                                                     as open_quantity,
  min(t.trade_date)                                                  as first_trade_date,
  max(t.trade_date)                                                  as last_trade_date
from public.trades t
group by t.user_id, t.symbol;

grant select on
  public.positions,
  public.wallet_balance,
  public.realized_pnl_daily,
  public.realized_pnl_weekly,
  public.trade_activity_monthly,
  public.symbol_pnl_summary
to authenticated;
