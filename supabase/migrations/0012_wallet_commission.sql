-- ============================================================================
-- Cüzdan komisyonlarının bakiyeye ve kâr/zarara yansıması
--
-- Komisyon hareketi:
--   * nakit bakiyeden düşülür (para çıkışı gibi)
--   * dönemsel raporlarda gider olarak sayılır, net K/Z'yi azaltır
--   * işlem başına girilen komisyonla TOPLANIR (ikisi de kullanılabilir)
-- ============================================================================

-- Sütun adları değiştiği için önce düşürülmeli (create or replace yeniden adlandıramaz)
drop view if exists public.wallet_balance;

create view public.wallet_balance with (security_invoker = true) as
with ids as (
  select user_id from public.cash_transactions
  union
  select user_id from public.trades
),
cash as (
  select user_id,
    sum(amount) filter (where type = 'deposit')    as deposits,
    sum(amount) filter (where type = 'withdrawal') as withdrawals,
    sum(amount) filter (where type = 'commission') as commissions
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
  round(coalesce(c.deposits, 0), 2)                                  as total_deposits,
  round(coalesce(c.withdrawals, 0), 2)                               as total_withdrawals,
  round(coalesce(t.buy_amount, 0), 2)                                as total_buy_amount,
  round(coalesce(t.sell_amount, 0), 2)                               as total_sell_amount,
  round(coalesce(t.commission, 0), 2)                                as trade_commission,
  round(coalesce(c.commissions, 0), 2)                               as wallet_commission,
  round(coalesce(t.commission, 0) + coalesce(c.commissions, 0), 2)   as total_commission,
  round(coalesce(c.deposits, 0) - coalesce(c.withdrawals, 0) - coalesce(c.commissions, 0)
        - coalesce(t.buy_amount, 0) + coalesce(t.sell_amount, 0)
        - coalesce(t.commission, 0), 2)                              as balance
from ids i
left join cash c on c.user_id = i.user_id
left join tr   t on t.user_id = i.user_id;

grant select on public.wallet_balance to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Dönemsel görünümler: işlem komisyonu + cüzdan komisyonu birlikte
-- ---------------------------------------------------------------------------
create or replace function public.period_pnl(p_trunc text)
returns table (
  user_id     uuid,
  period      date,
  gross_pnl   numeric,
  commission  numeric,
  net_pnl     numeric,
  buy_count   bigint,
  sell_count  bigint,
  trade_count bigint,
  buy_amount  numeric,
  sell_amount numeric,
  volume      numeric
)
language sql
stable
set search_path = public
as $fn$
  with t as (
    select
      tr.user_id,
      case when p_trunc = 'day' then tr.trade_date
           else date_trunc(p_trunc, tr.trade_date)::date end            as period,
      coalesce(sum(tr.realized_pnl), 0)                                 as gross_pnl,
      sum(tr.commission)                                                as commission,
      count(*) filter (where tr.side = 'buy')                           as buy_count,
      count(*) filter (where tr.side = 'sell')                          as sell_count,
      count(*)                                                          as trade_count,
      coalesce(sum(tr.quantity * tr.unit_price) filter (where tr.side = 'buy'), 0)  as buy_amount,
      coalesce(sum(tr.quantity * tr.unit_price) filter (where tr.side = 'sell'), 0) as sell_amount,
      coalesce(sum(tr.quantity * tr.unit_price), 0)                     as volume
    from public.trades tr
    group by 1, 2
  ),
  c as (
    select
      ct.user_id,
      case when p_trunc = 'day' then ct.transaction_date
           else date_trunc(p_trunc, ct.transaction_date)::date end      as period,
      sum(ct.amount)                                                    as commission
    from public.cash_transactions ct
    where ct.type = 'commission'
    group by 1, 2
  )
  select
    coalesce(t.user_id, c.user_id),
    coalesce(t.period, c.period),
    round(coalesce(t.gross_pnl, 0), 2),
    round(coalesce(t.commission, 0) + coalesce(c.commission, 0), 2),
    round(coalesce(t.gross_pnl, 0) - coalesce(t.commission, 0) - coalesce(c.commission, 0), 2),
    coalesce(t.buy_count, 0),
    coalesce(t.sell_count, 0),
    coalesce(t.trade_count, 0),
    round(coalesce(t.buy_amount, 0), 2),
    round(coalesce(t.sell_amount, 0), 2),
    round(coalesce(t.volume, 0), 2)
  from t
  full outer join c on c.user_id = t.user_id and c.period = t.period;
$fn$;

grant execute on function public.period_pnl(text) to authenticated, service_role;

drop view if exists public.realized_pnl_daily;
drop view if exists public.realized_pnl_weekly;
drop view if exists public.trade_activity_monthly;

create view public.realized_pnl_daily with (security_invoker = true) as
  select user_id, period as day, gross_pnl, commission, net_pnl,
         buy_count, sell_count, trade_count, buy_amount, sell_amount, volume
    from public.period_pnl('day');

create view public.realized_pnl_weekly with (security_invoker = true) as
  select * from public.period_pnl('week');

create view public.trade_activity_monthly with (security_invoker = true) as
  select * from public.period_pnl('month');

grant select on
  public.realized_pnl_daily,
  public.realized_pnl_weekly,
  public.trade_activity_monthly
to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Analiz özeti: komisyon artık cüzdan komisyonlarını da içeriyor
-- ---------------------------------------------------------------------------
create or replace function public.get_analysis_summary()
returns jsonb
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_uid   uuid := auth.uid();
  s       record;
  p       record;
  y       record;
  v_wcomm numeric;
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

  select coalesce(sum(amount), 0) into v_wcomm
    from public.cash_transactions
   where user_id = v_uid and type = 'commission';

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
    'commission',       round(s.commission + v_wcomm, 2),
    'trade_commission', round(s.commission, 2),
    'wallet_commission', round(v_wcomm, 2),
    'commission_ratio', case when s.total_win > 0
                             then round(((s.commission + v_wcomm) / s.total_win) * 100, 1) end,
    'volume',           round(s.volume, 2),
    'realized_gross',   round(s.realized_gross, 2),
    'realized_net',     round(s.realized_gross - s.commission - v_wcomm, 2),
    'unrealized',       round(p.unrealized, 2),
    'total_pnl',        round(s.realized_gross - s.commission - v_wcomm + p.unrealized, 2),
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

-- ---------------------------------------------------------------------------
-- Gösterge paneli özeti: net kâr/zarar cüzdan komisyonunu da düşsün
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_uid         uuid := auth.uid();
  v_today       date := current_date;
  v_week_start  date := date_trunc('week',  current_date)::date;
  v_month_start date := date_trunc('month', current_date)::date;
  v_wallet      record;
  v_pos         record;
  v_pnl         record;
  v_wc          record;
begin
  if v_uid is null then return '{}'::jsonb; end if;

  select coalesce(w.balance, 0)           as balance,
         coalesce(w.total_deposits, 0)    as deposits,
         coalesce(w.total_withdrawals, 0) as withdrawals,
         coalesce(w.total_commission, 0)  as commission
    into v_wallet
    from public.wallet_balance w where w.user_id = v_uid;

  select coalesce(sum(p.total_cost), 0)     as cost,
         coalesce(sum(p.market_value), 0)   as market,
         coalesce(sum(p.unrealized_pnl), 0) as unrealized,
         count(*)                           as position_count
    into v_pos
    from public.positions p where p.user_id = v_uid;

  select
    coalesce(sum(t.realized_pnl), 0)                                              as gross_total,
    coalesce(sum(t.commission), 0)                                                as comm_total,
    coalesce(sum(t.realized_pnl) filter (where t.trade_date = v_today), 0)        as gross_today,
    coalesce(sum(t.realized_pnl) filter (where t.trade_date >= v_week_start), 0)  as gross_week,
    coalesce(sum(t.realized_pnl) filter (where t.trade_date >= v_month_start), 0) as gross_month,
    coalesce(sum(t.commission)   filter (where t.trade_date = v_today), 0)        as comm_today,
    coalesce(sum(t.commission)   filter (where t.trade_date >= v_week_start), 0)  as comm_week,
    coalesce(sum(t.commission)   filter (where t.trade_date >= v_month_start), 0) as comm_month,
    count(*)                                                                      as trade_count,
    count(*) filter (where t.trade_date >= v_month_start)                         as trade_count_month,
    count(*) filter (where t.trade_date >= v_week_start)                          as trade_count_week,
    count(*) filter (where t.trade_date = v_today)                                as trade_count_today
    into v_pnl
    from public.trades t where t.user_id = v_uid;

  -- cüzdandan girilen komisyonlar, tarihlerine göre aynı dönemlere dağıtılır
  select
    coalesce(sum(amount), 0)                                              as total,
    coalesce(sum(amount) filter (where transaction_date = v_today), 0)    as today,
    coalesce(sum(amount) filter (where transaction_date >= v_week_start), 0)  as week,
    coalesce(sum(amount) filter (where transaction_date >= v_month_start), 0) as month
    into v_wc
    from public.cash_transactions
   where user_id = v_uid and type = 'commission';

  return jsonb_build_object(
    'cash_balance',        round(coalesce(v_wallet.balance, 0), 2),
    'total_deposits',      round(coalesce(v_wallet.deposits, 0), 2),
    'total_withdrawals',   round(coalesce(v_wallet.withdrawals, 0), 2),
    'total_commission',    round(coalesce(v_wallet.commission, 0), 2),
    'invested_cost',       round(v_pos.cost, 2),
    'portfolio_value',     round(v_pos.market, 2),
    'unrealized_pnl',      round(v_pos.unrealized, 2),
    'position_count',      v_pos.position_count,
    'total_assets',        round(coalesce(v_wallet.balance, 0) + v_pos.market, 2),
    'realized_gross',      round(v_pnl.gross_total, 2),
    'realized_net',        round(v_pnl.gross_total - v_pnl.comm_total - v_wc.total, 2),
    'realized_today',      round(v_pnl.gross_today, 2),
    'realized_week',       round(v_pnl.gross_week, 2),
    'realized_month',      round(v_pnl.gross_month, 2),
    'realized_net_today',  round(v_pnl.gross_today - v_pnl.comm_today - v_wc.today, 2),
    'realized_net_week',   round(v_pnl.gross_week  - v_pnl.comm_week  - v_wc.week, 2),
    'realized_net_month',  round(v_pnl.gross_month - v_pnl.comm_month - v_wc.month, 2),
    'trade_count',         v_pnl.trade_count,
    'trade_count_month',   v_pnl.trade_count_month,
    'trade_count_week',    v_pnl.trade_count_week,
    'trade_count_today',   v_pnl.trade_count_today
  );
end;
$fn$;

grant execute on function public.get_dashboard_summary() to authenticated;
