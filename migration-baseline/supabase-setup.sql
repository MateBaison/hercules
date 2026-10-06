-- Ejecutar una sola vez en Supabase > SQL Editor para activar la sincronización.
-- Ningún usuario anónimo recibe acceso a los entrenamientos.
begin;

create table if not exists public.mrgymson_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mrgymson_state enable row level security;
revoke all on public.mrgymson_state from public, anon;
grant select, insert, update on public.mrgymson_state to authenticated;

create policy "Cada usuario lee sus datos"
on public.mrgymson_state for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Cada usuario crea sus datos"
on public.mrgymson_state for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Cada usuario actualiza sus datos"
on public.mrgymson_state for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

commit;
