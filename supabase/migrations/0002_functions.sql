-- ============================================================================
-- Kâr/Zarar hesaplama — Ağırlıklı Ortalama Maliyet (replay yöntemi)
--
-- Bir sembolün tüm işlemleri tarih sırasına göre baştan yeniden oynatılır.
-- Böylece geçmiş tarihli bir işlem eklendiğinde/silindiğinde/düzeltildiğinde
-- sonraki tüm satışların maliyeti ve kârı otomatik olarak doğru hesaplanır.
--
-- Komisyon KÂRA DAHİL EDİLMEZ (kullanıcı kararı: ayrı gider olarak gösterilir).
--   realized_pnl = (satış fiyatı - ortalama maliyet) x adet   [brüt]
--   net kâr      = brüt kâr - komisyonlar                     [view'larda]
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
  v_used numeric;  -- satışta kullanılan ortalama maliyet
  eps    constant numeric := 0.000001;
begin
  for r in
    select id, side, quantity, unit_price
      from public.trades
     where user_id = p_user and symbol = p_symbol
     order by trade_date, created_at, id
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

      -- Satışta kullanılan maliyet, pozisyon kapansa bile kayda geçmeli:
      -- işlem satırındaki cost_basis "bu satışta kullanılan ortalama maliyet"tir.
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

-- Sadece trigger'lar çağırsın; doğrudan RPC olarak çağrılamaz.
revoke all on function public.recalc_symbol(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- BEFORE: kullanıcının hesaplanan alanlara yazmasını engelle + sembolü doğrula
-- WHEN koşulu trigger fonksiyonuna GİRMEDEN ÖNCE değerlendirilir, bu yüzden üst
-- seviye yazımlarda pg_trigger_depth() = 0 olur. recalc_symbol içindeki iç içe
-- UPDATE sırasında ise 1 döner ve trigger yeniden tetiklenmez (sonsuz döngü yok).
-- ---------------------------------------------------------------------------
create or replace function public.trades_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  new.symbol       := upper(btrim(new.symbol));
  new.cost_basis   := null;
  new.realized_pnl := null;

  if not exists (
    select 1 from public.stocks s
     where s.symbol = new.symbol
       and (s.user_id is null or s.user_id = new.user_id)
  ) then
    raise exception 'Tanımsız hisse sembolü: %. Önce hisseyi listeye ekleyin.', new.symbol
      using errcode = 'P0001';
  end if;

  return new;
end;
$fn$;

drop trigger if exists trades_guard_trg on public.trades;
create trigger trades_guard_trg
  before insert or update on public.trades
  for each row when (pg_trigger_depth() = 0)
  execute function public.trades_guard();

-- ---------------------------------------------------------------------------
-- AFTER: etkilenen sembol(ler)i yeniden hesapla
-- ---------------------------------------------------------------------------
create or replace function public.trades_recalc()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_symbol(old.user_id, old.symbol);
    return old;
  end if;

  if tg_op = 'UPDATE'
     and (old.symbol is distinct from new.symbol or old.user_id is distinct from new.user_id) then
    perform public.recalc_symbol(old.user_id, old.symbol);
  end if;

  perform public.recalc_symbol(new.user_id, new.symbol);
  return new;
end;
$fn$;

drop trigger if exists trades_recalc_trg on public.trades;
create trigger trades_recalc_trg
  after insert or update or delete on public.trades
  for each row when (pg_trigger_depth() = 0)
  execute function public.trades_recalc();

-- ---------------------------------------------------------------------------
-- stocks: sembolü normalize et, sistem sembolünün kopyasını engelle
-- ---------------------------------------------------------------------------
create or replace function public.stocks_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  new.symbol := upper(btrim(new.symbol));
  new.title  := btrim(new.title);

  if new.title = '' then
    new.title := new.symbol;
  end if;

  if new.user_id is not null
     and exists (select 1 from public.stocks s where s.symbol = new.symbol and s.user_id is null) then
    raise exception 'Bu sembol zaten listede var: %', new.symbol using errcode = 'P0001';
  end if;

  return new;
end;
$fn$;

drop trigger if exists stocks_guard_trg on public.stocks;
create trigger stocks_guard_trg
  before insert or update on public.stocks
  for each row execute function public.stocks_guard();

-- ---------------------------------------------------------------------------
-- price_entries: sembolü normalize et
-- ---------------------------------------------------------------------------
create or replace function public.price_entries_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  new.symbol := upper(btrim(new.symbol));
  return new;
end;
$fn$;

drop trigger if exists price_entries_guard_trg on public.price_entries;
create trigger price_entries_guard_trg
  before insert or update on public.price_entries
  for each row execute function public.price_entries_guard();
