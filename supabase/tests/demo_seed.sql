-- ============================================================================
-- Geliştirme için örnek veri — SADECE YEREL KULLANIM.
-- Çalıştırma:  npm run db:demo
-- Temizleme:   npm run db:demo:clear
-- Bu dosya migration DEĞİLDİR, üretime gitmez.
-- ============================================================================
\set ON_ERROR_STOP on
set client_min_messages = warning;

do $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = 'deneme@ornek.com';
  if uid is null then
    raise exception 'deneme@ornek.com kullanıcısı yok. Önce kayıt olun.';
  end if;

  delete from public.trades            where user_id = uid;
  delete from public.cash_transactions where user_id = uid;
  delete from public.price_entries     where user_id = uid;

  -- ------------------------------------------------------------- cüzdan --
  insert into public.cash_transactions (user_id, type, amount, bank, note, transaction_date) values
    (uid, 'deposit',    250000, 'Ziraat Bankası — vadesiz TL', 'Başlangıç sermayesi',      date '2026-01-08'),
    (uid, 'deposit',     50000, 'Garanti BBVA',                'Ek yatırım',               date '2026-03-04'),
    (uid, 'withdrawal',  20000, 'Ziraat Bankası',              'Nakit ihtiyacı',           date '2026-06-11'),
    (uid, 'deposit',     30000, 'İş Bankası',                  'Temmuz ek yatırım',        date '2026-07-02');

  -- ------------------------------------------------------------ işlemler --
  insert into public.trades (user_id, symbol, side, quantity, unit_price, commission, trade_date, note) values
    (uid, 'THYAO', 'buy',   50, 280.00, 26.00, date '2026-01-12', 'İlk pozisyon'),
    (uid, 'GARAN', 'buy',  200, 118.00, 44.00, date '2026-01-12', null),
    (uid, 'SASA',  'buy',  500,  38.50, 36.00, date '2026-02-05', null),
    (uid, 'ASELS', 'buy',  150, 195.00, 55.00, date '2026-02-20', 'Savunma sanayi'),
    (uid, 'THYAO', 'buy',   30, 305.00, 17.00, date '2026-03-10', 'Ekleme'),
    (uid, 'GARAN', 'sell', 100, 132.00, 25.00, date '2026-03-25', 'Yarısını sattım'),
    (uid, 'EREGL', 'buy',  400,  27.80, 21.00, date '2026-04-08', null),
    (uid, 'SASA',  'buy',  300,  33.20, 19.00, date '2026-04-22', 'Maliyet düşürme'),
    (uid, 'SASA',  'sell', 400,  31.00, 23.00, date '2026-05-14', 'Zararına çıkış'),
    (uid, 'ASELS', 'sell', 150, 242.00, 68.00, date '2026-06-03', 'Hedef fiyat'),
    (uid, 'THYAO', 'buy',   20, 292.00, 11.00, date '2026-06-18', null),
    (uid, 'EREGL', 'sell', 400,  24.10, 18.00, date '2026-07-09', 'Zarar kes'),
    (uid, 'THYAO', 'sell',  60, 318.00, 57.00, date '2026-07-28', 'Kâr realizasyonu'),
    (uid, 'GARAN', 'buy',  150, 126.00, 28.00, date '2026-08-12', null);

  -- ---------------------------------------------- manuel fiyat girişleri --
  insert into public.price_entries (user_id, symbol, price, as_of_date) values
    (uid, 'THYAO', 298.00, date '2026-03-31'), (uid, 'GARAN', 127.40, date '2026-03-31'),
    (uid, 'SASA',   35.10, date '2026-03-31'), (uid, 'ASELS', 208.00, date '2026-03-31'),
    (uid, 'THYAO', 286.50, date '2026-05-30'), (uid, 'GARAN', 121.90, date '2026-05-30'),
    (uid, 'SASA',   32.40, date '2026-05-30'), (uid, 'EREGL',  25.60, date '2026-05-30'),
    (uid, 'THYAO', 301.75, date '2026-06-30'), (uid, 'GARAN', 124.30, date '2026-06-30'),
    (uid, 'SASA',   33.60, date '2026-06-30'),
    (uid, 'THYAO', 315.00, date '2026-07-31'), (uid, 'GARAN', 128.75, date '2026-07-31'),
    (uid, 'SASA',   34.15, date '2026-07-31'),
    (uid, 'THYAO', 304.25, date '2026-08-20'), (uid, 'GARAN', 131.10, date '2026-08-20'),
    (uid, 'SASA',   34.80, date '2026-08-20');
end $$;

\echo ''
\echo '--- Pozisyonlar ---'
select symbol, quantity as adet, avg_cost as "ort_maliyet", last_price as "son_fiyat",
       market_value as "piyasa_degeri", unrealized_pnl as "gerceklesmemis_kz"
  from public.positions
 where user_id = (select id from auth.users where email = 'deneme@ornek.com')
 order by symbol;

\echo ''
\echo '--- Hisse bazlı gerçekleşen K/Z ---'
select symbol, gross_pnl as "brut", commission as "komisyon", net_pnl as "net",
       trade_count as "islem", open_quantity as "acik_adet"
  from public.symbol_pnl_summary
 where user_id = (select id from auth.users where email = 'deneme@ornek.com')
 order by net_pnl desc;

\echo ''
\echo '--- Cüzdan ---'
select balance as "bakiye", total_deposits as "giris", total_withdrawals as "cikis",
       total_commission as "komisyon"
  from public.wallet_balance
 where user_id = (select id from auth.users where email = 'deneme@ornek.com');
