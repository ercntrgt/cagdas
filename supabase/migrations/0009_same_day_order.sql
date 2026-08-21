-- ============================================================================
-- Aynı gün içindeki işlem sırası
--
-- Sistem gün bazında çalışır; bir günün içindeki saat bilgisi tutulmaz. Bu yüzden
-- aynı güne düşen bir alış ile bir satışın hangisinin önce olduğu veriden
-- anlaşılamaz. Tek tutarlı kural, aynı gün içinde ALIŞLARI SATIŞLARDAN ÖNCE
-- işlemektir: aksi hâlde gün içinde alınıp satılan bir hisse "elde olandan fazla
-- satış" hatası verir ve hiç kaydedilemez.
--
-- Farklı günler arasındaki sıra ve aynı gün içindeki alışların kendi arasındaki
-- sıra değişmez (created_at korunur).
-- ============================================================================

create or replace function public.recalc_symbol(p_user uuid, p_symbol text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r      record;
  v_qty  numeric := 0;  -- elde kalan adet
  v_cost numeric := 0;  -- elde kalanın toplam maliyeti
  v_avg  numeric := 0;  -- ağırlıklı ortalama birim maliyet
  v_pnl  numeric;
  v_used numeric;       -- satışta kullanılan ortalama maliyet
  eps    constant numeric := 0.000001;
begin
  for r in
    select id, side, quantity, unit_price
      from public.trades
     where user_id = p_user and symbol = p_symbol
     -- (side = 'sell') false -> alışlar önce
     order by trade_date, (side = 'sell'), created_at, id
  loop
    if r.side = 'buy' then
      v_cost := v_cost + (r.quantity * r.unit_price);
      v_qty  := v_qty + r.quantity;
      v_avg  := case when v_qty > 0 then v_cost / v_qty else 0 end;

      update public.trades
         set cost_basis = round(v_avg, 6), realized_pnl = null
       where id = r.id;

    else
      if r.quantity > v_qty + eps then
        raise exception
          'Elde olandan fazla satış: % için elinizde % adet var, % adet satmaya çalışıyorsunuz.',
          p_symbol, trim_scale(v_qty), trim_scale(r.quantity)
          using errcode = 'P0001';
      end if;

      v_used := v_avg;
      v_pnl  := (r.unit_price - v_used) * r.quantity;
      v_cost := v_cost - (v_used * r.quantity);
      v_qty  := v_qty - r.quantity;

      -- pozisyon kapandıysa ondalık artıkları temizle
      if v_qty <= eps then
        v_qty  := 0;
        v_cost := 0;
        v_avg  := 0;
      end if;

      update public.trades
         set cost_basis = round(v_used, 6), realized_pnl = round(v_pnl, 2)
       where id = r.id;
    end if;
  end loop;
end;
$fn$;

revoke all on function public.recalc_symbol(uuid, text) from public, anon, authenticated;

-- positions görünümü de aynı sırayı kullanmalı: bir sembolün güncel ortalama
-- maliyeti, aynı sıralamadaki SON işlemin cost_basis değeridir.
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
  order by t.user_id, t.symbol, t.trade_date desc, (t.side = 'sell') desc, t.created_at desc, t.id desc
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

grant select on public.positions to authenticated;

-- Sıralama değiştiği için mevcut tüm kayıtları yeniden hesapla
do $$
declare r record;
begin
  for r in select distinct user_id, symbol from public.trades loop
    perform public.recalc_symbol(r.user_id, r.symbol);
  end loop;
end $$;
