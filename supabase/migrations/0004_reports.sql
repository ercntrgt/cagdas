-- ============================================================================
-- Rapor fonksiyonları: portföy değeri zaman serisi + gösterge paneli özeti
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Portföy değeri geçmişi
-- Her gün için: o güne kadarki net pozisyonlar x o güne kadar bilinen son fiyat
-- Fiyat girilmemişse ortalama maliyete düşülür (grafik sıfıra çökmesin).
-- ---------------------------------------------------------------------------
create or replace function public.get_portfolio_history(
  p_from date default null,
  p_to   date default null
)
returns table (
  day          date,
  cost_value   numeric,
  market_value numeric,
  cash_balance numeric,
  total_value  numeric
)
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_uid  uuid := auth.uid();
  v_from date;
  v_to   date;
begin
  if v_uid is null then return; end if;

  v_to := coalesce(p_to, current_date);

  select coalesce(
           p_from,
           least(
             (select min(trade_date)       from public.trades            where user_id = v_uid),
             (select min(transaction_date) from public.cash_transactions where user_id = v_uid)
           ))
    into v_from;

  if v_from is null then return; end if;
  if v_to < v_from then v_to := v_from; end if;
  -- grafik için en fazla 2 yıl geriye git
  if v_to - v_from > 730 then v_from := v_to - 730; end if;

  return query
  with days as (
    select gs::date as day from generate_series(v_from, v_to, interval '1 day') gs
  ),
  syms as (
    select distinct symbol from public.trades where user_id = v_uid
  ),
  held as (
    select
      d.day,
      s.symbol,
      p.qty,
      p.cb,
      (select pe.price
         from public.price_entries pe
        where pe.user_id = v_uid and pe.symbol = s.symbol and pe.as_of_date <= d.day
        order by pe.as_of_date desc, pe.created_at desc
        limit 1) as px
    from days d
    cross join syms s
    cross join lateral (
      select
        coalesce(sum(case when t.side = 'buy' then t.quantity else -t.quantity end), 0) as qty,
        (array_agg(t.cost_basis order by t.trade_date desc, t.created_at desc))[1]      as cb
      from public.trades t
      where t.user_id = v_uid and t.symbol = s.symbol and t.trade_date <= d.day
    ) p
    where p.qty > 0.000001
  ),
  cash as (
    select
      d.day,
      (select coalesce(sum(case when c.type = 'deposit' then c.amount else -c.amount end), 0)
         from public.cash_transactions c
        where c.user_id = v_uid and c.transaction_date <= d.day)
      - (select coalesce(sum(
             case when t.side = 'buy' then t.quantity * t.unit_price
                                      else -(t.quantity * t.unit_price) end
             + t.commission), 0)
           from public.trades t
          where t.user_id = v_uid and t.trade_date <= d.day) as bal
    from days d
  )
  select
    d.day,
    round(coalesce(sum(h.qty * coalesce(h.cb, 0)), 0), 2)                            as cost_value,
    round(coalesce(sum(h.qty * coalesce(h.px, h.cb, 0)), 0), 2)                      as market_value,
    round(c.bal, 2)                                                                  as cash_balance,
    round(coalesce(sum(h.qty * coalesce(h.px, h.cb, 0)), 0) + c.bal, 2)              as total_value
  from days d
  join cash c on c.day = d.day
  left join held h on h.day = d.day
  group by d.day, c.bal
  order by d.day;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Gösterge paneli özeti — tüm KPI'lar tek çağrıda
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_uid          uuid := auth.uid();
  v_today        date := current_date;
  v_week_start   date := date_trunc('week',  current_date)::date;
  v_month_start  date := date_trunc('month', current_date)::date;
  v_wallet       record;
  v_pos          record;
  v_pnl          record;
begin
  if v_uid is null then return '{}'::jsonb; end if;

  select coalesce(w.balance, 0)          as balance,
         coalesce(w.total_deposits, 0)   as deposits,
         coalesce(w.total_withdrawals, 0) as withdrawals,
         coalesce(w.total_commission, 0) as commission
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
    coalesce(sum(t.realized_pnl), 0) - coalesce(sum(t.commission), 0)             as net_total,
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
    'realized_net',        round(v_pnl.net_total, 2),
    'realized_today',      round(v_pnl.gross_today, 2),
    'realized_week',       round(v_pnl.gross_week, 2),
    'realized_month',      round(v_pnl.gross_month, 2),
    'realized_net_today',  round(v_pnl.gross_today - v_pnl.comm_today, 2),
    'realized_net_week',   round(v_pnl.gross_week  - v_pnl.comm_week, 2),
    'realized_net_month',  round(v_pnl.gross_month - v_pnl.comm_month, 2),
    'trade_count',         v_pnl.trade_count,
    'trade_count_month',   v_pnl.trade_count_month,
    'trade_count_week',    v_pnl.trade_count_week,
    'trade_count_today',   v_pnl.trade_count_today
  );
end;
$fn$;

grant execute on function public.get_portfolio_history(date, date) to authenticated;
grant execute on function public.get_dashboard_summary()          to authenticated;
