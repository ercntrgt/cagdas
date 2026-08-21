-- ============================================================================
-- Kullanıcı adıyla giriş + admin kullanıcı yönetimi
--
-- Supabase Auth kimliği e-posta üzerinden çalışır. Bu uygulamada e-posta
-- kullanılmadığı için her kullanıcı adı sabit bir iç adrese eşlenir:
--     ohacagdas  ->  ohacagdas@cagdas.local
-- Bu adrese hiçbir zaman e-posta gönderilmez; kullanıcılar admin tarafından
-- doğrulanmış olarak oluşturulur. Böylece e-posta doğrulama akışı devre dışıdır.
-- ============================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,32}$')
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Yetki kontrolü.
-- security definer -> profiles üzerindeki RLS'i atlar, aksi hâlde politika
-- kendi tablosunu sorgulayıp sonsuz döngüye girer.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$fn$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- Profil oluşturma/silme yalnızca sunucu tarafında (service_role) yapılır.
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Yeni auth kullanıcısı -> profil
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, username, is_admin)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))),
    coalesce((new.raw_user_meta_data ->> 'is_admin')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Mevcut kullanıcılar için profil doldur (kullanıcı adı = e-postanın @ öncesi)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, username)
select distinct on (lower(split_part(u.email, '@', 1)))
       u.id, lower(split_part(u.email, '@', 1))
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id)
   and lower(split_part(u.email, '@', 1)) ~ '^[a-z0-9_]{3,32}$'
 order by lower(split_part(u.email, '@', 1)), u.created_at
on conflict do nothing;
