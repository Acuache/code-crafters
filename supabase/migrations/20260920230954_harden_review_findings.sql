-- SPEC 02 (specs/02-supabase-schema.md) — hallazgos de /review (craft-reviewer) sobre los
-- pasos 2 y 4, aplicados como migración nueva para no generar drift entre los archivos ya
-- aplicados y la base real.

-- 1. private.is_admin() no era `stable`: sin eso, Postgres no puede cachear
--    `(select private.is_admin())` como InitPlan dentro de una política RLS, que era el punto
--    del patrón (ver security-rls-performance.md y el ejemplo oficial de Supabase).
--    `create or replace` conserva los grants ya otorgados.
create or replace function private.is_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
end;
$$;

-- 2. Falta el `grant usage` sobre el esquema `private`. Funcionaba en este proyecto por un
--    default de Supabase no documentado en ningún archivo del repo; un `db reset` limpio en
--    otro proyecto podría no tenerlo. Se deja explícito para no depender de eso.
grant usage on schema private to authenticated;

-- 3. El spec dice que el execute se revoca de `public` Y `anon`; el SQL original solo lo hacía
--    de `public`. Bajo riesgo real (el esquema no está expuesto por la API), pero conviene que
--    el código diga lo mismo que el spec.
revoke execute on function private.is_admin() from anon;

-- 4. El check de path_steps no tenía nombre: Postgres lo bautizó `path_steps_check`, un mensaje
--    de error inútil para quien lo vea desde el cliente.
alter table public.path_steps
  rename constraint path_steps_check to path_steps_discarded_requires_reason;

-- 5. Nombres de política inconsistentes: las 12 del catálogo siguen `tabla_acción_quién`
--    (courses_select_public, courses_insert_admin); las 3 de "dueño" invertían el orden
--    (assessments_owner_all). Se renombran estas tres para que seguir el mismo patrón.
alter policy "assessments_owner_all" on public.assessments rename to "assessments_all_owner";
alter policy "learning_paths_owner_all" on public.learning_paths rename to "learning_paths_all_owner";
alter policy "path_steps_owner_all" on public.path_steps rename to "path_steps_all_owner";

-- 6. El trigger no tenía red de seguridad: si el insert en profiles fallara por cualquier razón
--    (ej. una fila ya existente), toda la transacción de alta en auth.users se revierte y el
--    registro del usuario falla. La doc oficial de Supabase advierte esto explícitamente.
create or replace function private.handle_new_user()
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
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
