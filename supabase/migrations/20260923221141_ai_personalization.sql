-- SPEC 11 (specs/11-ai-personalization.md) — paso 3 del plan de implementación.
-- Capa 2 del ADR 0001: lo que escribe la IA vive en columnas aparte, nunca pisa el texto por
-- plantilla del motor (spec 04), y cada intento queda registrado para el límite diario.

-- 1. Texto de la IA, separado del original. La vista muestra `ai_* ?? original`: un paso que la
--    IA no nombró cae solo a su razón por plantilla.
alter table public.learning_paths
  add column ai_title text,
  add column ai_summary text,
  add column personalized_at timestamptz;

alter table public.path_steps
  add column ai_reason text;

-- 2. Un registro por intento que llega a llamar al modelo (éxito o falla). Es la base del límite
--    diario; el spec 15 lo reusa para la traducción de texto libre a chips.
create table public.ai_personalizations (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path_id uuid references public.learning_paths (id) on delete set null,
  created_at timestamptz not null default now()
);

-- El conteo del límite filtra por user_id y created_at en una ventana de 24 h.
create index ai_personalizations_user_id_created_at_idx
  on public.ai_personalizations (user_id, created_at);
create index ai_personalizations_path_id_idx on public.ai_personalizations (path_id);

alter table public.ai_personalizations enable row level security;

-- Solo select + insert del dueño. Sin update ni delete: un usuario no puede borrar sus
-- registros para saltarse el límite. Nombres `tabla_acción_quién`, como el resto del esquema.
create policy "ai_personalizations_select_owner"
  on public.ai_personalizations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "ai_personalizations_insert_owner"
  on public.ai_personalizations
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- 3. Escribe título, resumen y razones en una sola transacción: nunca queda un título nuevo con
--    razones viejas si algo falla a la mitad. security invoker: corre con los permisos del
--    usuario, así que la RLS de learning_paths/path_steps (spec 02) sigue decidiendo qué filas
--    puede tocar. Los pasos descartados nunca reciben ai_reason.
create function public.apply_ai_personalization(
  p_path_id uuid,
  p_title text,
  p_summary text,
  p_reasons jsonb -- [{ "courseSlug": "...", "reason": "..." }]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.learning_paths
  set ai_title = p_title,
      ai_summary = p_summary,
      personalized_at = now()
  where id = p_path_id;

  -- Ruta ajena (la RLS la oculta) o inexistente: se aborta sin tocar path_steps.
  if not found then
    raise exception 'learning_path % no existe o no pertenece al usuario', p_path_id
      using errcode = 'P0002';
  end if;

  update public.path_steps
  set ai_reason = reasons.reason
  from jsonb_to_recordset(p_reasons) as reasons ("courseSlug" text, reason text)
  join public.courses on courses.slug = reasons."courseSlug"
  where path_steps.path_id = p_path_id
    and path_steps.course_id = courses.id
    and path_steps.status <> 'discarded';
end;
$$;

-- Solo usuarios autenticados la llaman (desde la server action del spec 11). Supabase da
-- execute a anon por defecto sobre funciones de public; se le quita.
revoke execute on function public.apply_ai_personalization(uuid, text, text, jsonb) from public, anon;
grant execute on function public.apply_ai_personalization(uuid, text, text, jsonb) to authenticated;
