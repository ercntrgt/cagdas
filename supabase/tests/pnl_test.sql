-- ============================================================================
-- Kâr/zarar motoru doğrulama testi
-- Çalıştırma:  npm run test:db
-- ============================================================================
\set ON_ERROR_STOP on
\timing off
set client_min_messages = notice;

begin;

-- ------------------------------------------------------------ test kullanıcıları --
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'test1@ornek.com', crypt('sifre123', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email"}', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'test2@ornek.com', crypt('sifre123', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email"}', '{}');

-- Kullanıcı 1 kimliğine bürün (RLS + auth.uid() gerçek koşullarda test edilsin)
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}';

\echo ''
\echo '=== 1) 100.000 TL para girişi ==='
insert into public.cash_transactions (type, amount, bank, note, transaction_date)
values ('deposit', 100000, 'Ziraat Bankası', 'Başlangıç sermayesi', date '2026-01-05');
select balance as "bakiye" from public.wallet_balance;

\echo ''
\echo '=== 2) SASA 100 adet x 40,00 TL alış (komisyon 20) ==='
insert into public.trades (symbol, side, quantity, unit_price, commission, trade_date, note)
values ('SASA', 'buy', 100, 40, 20, date '2026-01-10', 'ilk alım');
select symbol, quantity as adet, avg_cost as "ort_maliyet", total_cost as "toplam_maliyet"
  from public.positions;
select balance as "bakiye" from public.wallet_balance;

\echo ''
\echo '=== 3) SASA 100 adet x 60,00 TL alış (komisyon 30) -> ort. maliyet 50,00 ==='
insert into public.trades (symbol, side, quantity, unit_price, commission, trade_date)
values ('SASA', 'buy', 100, 60, 30, date '2026-01-20');
select symbol, quantity as adet, avg_cost as "ort_maliyet" from public.positions;

\echo ''
\echo '=== 4) 100 adet x 70,00 TL satış (komisyon 35) ==='
\echo '     beklenen: brüt +2.000,00 | komisyon 85,00 | net +1.915,00 | kalan 100 @ 50,00'
insert into public.trades (symbol, side, quantity, unit_price, commission, trade_date)
values ('SASA', 'sell', 100, 70, 35, date '2026-02-03');

select side, quantity, unit_price, cost_basis as "ort_maliyet", realized_pnl as "brut_kz"
  from public.trades order by trade_date;
select symbol, quantity as "kalan_adet", avg_cost as "ort_maliyet" from public.positions;
select gross_pnl as "brut_kz", commission as "komisyon", net_pnl as "net_kz",
       trade_count as "islem_sayisi"
  from public.symbol_pnl_summary;
select balance as "bakiye" from public.wallet_balance;

\echo ''
\echo '=== 5) GERİYE DÖNÜK İŞLEM: 2 ve 3 arasına 100 adet x 20,00 TL alış eklenir ==='
\echo '     yeni ort. maliyet = (4000+2000+6000)/300 = 40,00'
\echo '     satışın brüt K/Z değeri (70-40)x100 = +3.000,00 olarak YENİDEN hesaplanmalı'
insert into public.trades (symbol, side, quantity, unit_price, commission, trade_date)
values ('SASA', 'buy', 100, 20, 10, date '2026-01-15');

select trade_date, side, quantity, unit_price, cost_basis as "ort_maliyet",
       realized_pnl as "brut_kz"
  from public.trades order by trade_date, created_at;
select symbol, quantity as "kalan_adet", avg_cost as "ort_maliyet" from public.positions;

\echo ''
\echo '=== 6) Manuel fiyat girişi: SASA = 85,00 -> gerçekleşmemiş K/Z ==='
insert into public.price_entries (symbol, price, as_of_date) values ('SASA', 85, date '2026-02-10');
select symbol, quantity as adet, avg_cost as "ort_maliyet", last_price as "son_fiyat",
       market_value as "piyasa_degeri", unrealized_pnl as "gerceklesmemis_kz",
       unrealized_pnl_pct as "yuzde"
  from public.positions;

\echo ''
\echo '=== 7) Dönemsel raporlar ==='
select day as "gun", gross_pnl as "brut", commission as "komisyon", net_pnl as "net",
       trade_count as "islem"
  from public.realized_pnl_daily order by day;
select period as "ay", gross_pnl as "brut", net_pnl as "net", trade_count as "islem_sayisi"
  from public.trade_activity_monthly order by period;

\echo ''
\echo '=== 8) Gösterge paneli özeti ==='
select jsonb_pretty(public.get_dashboard_summary());

\echo ''
\echo '=== 9) Portföy değeri geçmişi (son 5 gün) ==='
select * from public.get_portfolio_history(date '2026-02-06', date '2026-02-10');

\echo ''
\echo '=== 10) HATA TESTİ: elde olandan fazla satış (300 var, 500 satılıyor) ==='
savepoint s1;
do $$
begin
  insert into public.trades (symbol, side, quantity, unit_price, trade_date)
  values ('SASA', 'sell', 500, 90, date '2026-02-11');
  raise exception 'BAŞARISIZ: fazla satış engellenmedi!' using errcode = 'XX000';
exception when sqlstate 'P0001' then
  raise notice 'BAŞARILI — beklenen hata alındı: %', sqlerrm;
end $$;
rollback to savepoint s1;

\echo ''
\echo '=== 11) HATA TESTİ: tanımsız sembol ==='
savepoint s2;
do $$
begin
  insert into public.trades (symbol, side, quantity, unit_price, trade_date)
  values ('YOKBOYLEHISSE', 'buy', 10, 5, current_date);
  raise exception 'BAŞARISIZ: tanımsız sembol kabul edildi!' using errcode = 'XX000';
exception when sqlstate 'P0001' then
  raise notice 'BAŞARILI — beklenen hata alındı: %', sqlerrm;
end $$;
rollback to savepoint s2;

\echo ''
\echo '=== 12) HATA TESTİ: kullanıcı realized_pnl değerini elle yazamaz ==='
savepoint s3;
insert into public.trades (symbol, side, quantity, unit_price, trade_date, realized_pnl, cost_basis)
values ('SASA', 'buy', 1, 10, date '2026-03-01', 999999, 123);
select realized_pnl as "brut_kz_null_olmali", cost_basis as "ort_maliyet_hesaplanmis"
  from public.trades where trade_date = date '2026-03-01';
rollback to savepoint s3;

\echo ''
\echo '=== 13) RLS TESTİ: kullanıcı 2 kullanıcı 1in verisini göremez ==='
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aud":"authenticated"}';
select count(*) as "gorunen_islem_sayisi_0_olmali"  from public.trades;
select count(*) as "gorunen_cuzdan_sayisi_0_olmali" from public.cash_transactions;
select count(*) as "gorunen_pozisyon_0_olmali"      from public.positions;
select count(*) as "gorunen_bist_sembolu_800"       from public.stocks where user_id is null;

\echo ''
\echo '=== 14) Manuel sembol ekleme (listede olmayan hisse) ==='
insert into public.stocks (symbol, title, user_id)
values ('yenihis', 'Yeni Hisse A.Ş.', '22222222-2222-2222-2222-222222222222');
select symbol as "buyuk_harfe_cevrilmis", title from public.stocks
 where user_id = '22222222-2222-2222-2222-222222222222';

insert into public.trades (symbol, side, quantity, unit_price, trade_date)
values ('YENIHIS', 'buy', 50, 12.5, current_date);
select symbol, quantity as adet, avg_cost as "ort_maliyet" from public.positions;

rollback;
