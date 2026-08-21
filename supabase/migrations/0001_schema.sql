-- ============================================================================
-- BIST Portföy Takip — Şema
-- Tablolar, index'ler ve Row Level Security politikaları
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enum'lar --
do $$ begin
  create type public.cash_type as enum ('deposit', 'withdrawal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trade_side as enum ('buy', 'sell');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------- stocks (sözlük) --
-- user_id IS NULL  -> KAP'tan seed edilen sistem sembolü (herkes okur)
-- user_id = uid    -> kullanıcının elle eklediği sembol (sadece o görür)
create table if not exists public.stocks (
  id         uuid primary key default gen_random_uuid(),
  symbol     text not null,
  title      text not null,
  city       text,
  user_id    uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint stocks_symbol_len check (char_length(symbol) between 1 and 16)
);

create unique index if not exists stocks_system_symbol_key
  on public.stocks (symbol) where user_id is null;
create unique index if not exists stocks_user_symbol_key
  on public.stocks (user_id, symbol) where user_id is not null;
create index if not exists stocks_symbol_idx on public.stocks (symbol);

-- --------------------------------------------- cash_transactions (cüzdan) --
create table if not exists public.cash_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type             public.cash_type not null,
  amount           numeric(18, 2) not null check (amount > 0),
  bank             text,
  note             text,
  transaction_date date not null default current_date,
  created_at       timestamptz not null default now()
);

create index if not exists cash_tx_user_date_idx
  on public.cash_transactions (user_id, transaction_date desc, created_at desc);

-- --------------------------------------------------- trades (al/sat işlemleri) --
-- cost_basis ve realized_pnl KULLANICI TARAFINDAN YAZILAMAZ; trigger hesaplar.
create table if not exists public.trades (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol       text not null,
  side         public.trade_side not null,
  quantity     numeric(18, 6) not null check (quantity > 0),
  unit_price   numeric(18, 4) not null check (unit_price >= 0),
  commission   numeric(18, 2) not null default 0 check (commission >= 0),
  note         text,
  trade_date   date not null default current_date,
  cost_basis   numeric(18, 6),
  realized_pnl numeric(18, 2),
  created_at   timestamptz not null default now()
);

create index if not exists trades_user_symbol_idx
  on public.trades (user_id, symbol, trade_date, created_at);
create index if not exists trades_user_date_idx
  on public.trades (user_id, trade_date desc, created_at desc);

-- ------------------------------------- price_entries (manuel fiyat girişi) --
create table if not exists public.price_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol     text not null,
  price      numeric(18, 4) not null check (price >= 0),
  as_of_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, symbol, as_of_date)
);

create index if not exists price_entries_lookup_idx
  on public.price_entries (user_id, symbol, as_of_date desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.stocks            enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.trades            enable row level security;
alter table public.price_entries     enable row level security;

-- stocks: sistem sembolleri herkese açık, kullanıcı sembolleri sahibine
drop policy if exists stocks_select on public.stocks;
create policy stocks_select on public.stocks for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

drop policy if exists stocks_insert on public.stocks;
create policy stocks_insert on public.stocks for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists stocks_update on public.stocks;
create policy stocks_update on public.stocks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists stocks_delete on public.stocks;
create policy stocks_delete on public.stocks for delete to authenticated
  using (user_id = (select auth.uid()));

-- cash_transactions / trades / price_entries: yalnızca kendi kayıtları
do $$
declare t text;
begin
  foreach t in array array['cash_transactions', 'trades', 'price_entries'] loop
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || '_all', t);
  end loop;
end $$;

grant select on public.stocks to authenticated;
grant insert, update, delete on public.stocks to authenticated;
grant select, insert, update, delete
  on public.cash_transactions, public.trades, public.price_entries to authenticated;
