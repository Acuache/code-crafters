-- SPEC 02 (specs/02-supabase-schema.md) — paso 2 del plan de implementación.
-- Esquema `private` (no expuesto por la Data API), rol de usuario, perfil creado al
-- registrarse, y la función que decide quién es admin.

create schema if not exists private;

create type public.user_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lectura: solo el propio dueño. `profiles.role` no debe ser visible para `anon`.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- Deliberadamente sin políticas de insert/update/delete para `authenticated`: RLS filtra
-- filas, no columnas, así que "el propio dueño puede editar su fila" dejaría que cualquiera
-- se ponga role = 'admin' a sí mismo. El trigger de abajo (security definer) crea la fila al
-- registrarse; el rol se cambia solo desde el panel de Supabase, que corre como `postgres` y
-- no pasa por RLS. Ver "Decisiones" en specs/02-supabase-schema.md.

create function private.is_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
end;
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- El trigger lee los metadatos de cualquiera de los tres proveedores OAuth del spec 03
-- (Discord, Google, GitHub) con coalesce: cada uno usa claves distintas para el nombre
-- visible y el avatar. Vive en `private`, no en `public`: una función `security definer`
-- que devuelve `trigger` no debería quedar en un esquema expuesto por la API aunque
-- Postgres ya rechace invocarla fuera de un trigger — mismo criterio que `is_admin()`.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();
