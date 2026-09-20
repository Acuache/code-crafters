-- SPEC 02 (specs/02-supabase-schema.md) — paso 4 del plan de implementación.
-- Lo que genera el cuestionario y el motor: assessments, learning_paths, path_steps.
-- Todo accesible solo por su dueño (RLS por auth.uid()).

create type public.path_step_status as enum ('pending', 'in_progress', 'done', 'discarded');

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_id uuid references public.assessments (id) on delete set null,
  title text not null,
  goal text not null,
  summary text,
  budget_hours numeric(6,1),
  created_at timestamptz not null default now()
);

create table public.path_steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  course_id bigint not null references public.courses (id) on delete restrict,
  source_program_id bigint references public.programs (id) on delete set null,
  stage integer not null,
  position integer not null,
  origin text not null,
  reason text not null,
  status public.path_step_status not null default 'pending',
  discard_reason text,
  depends_on uuid[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (path_id, course_id),         -- red de seguridad de la deduplicación que promete el spec 04
  -- Un paso descartado siempre conserva su motivo: es lo que va a mostrar el acordeón
  -- "Qué quitamos y por qué" del spec 08 (ADR 0004 pieza 2).
  check (status <> 'discarded' or discard_reason is not null)
);

-- Índices de FK (Postgres no los crea solo) y de las columnas que van a filtrar las políticas RLS.
create index assessments_user_id_idx on public.assessments (user_id);
create index learning_paths_user_id_idx on public.learning_paths (user_id);
create index learning_paths_assessment_id_idx on public.learning_paths (assessment_id);
create index path_steps_course_id_idx on public.path_steps (course_id);
create index path_steps_source_program_id_idx on public.path_steps (source_program_id);
-- path_id ya queda cubierto como prefijo izquierdo de unique (path_id, course_id).

alter table public.assessments enable row level security;
alter table public.learning_paths enable row level security;
alter table public.path_steps enable row level security;

create policy "assessments_owner_all"
  on public.assessments
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "learning_paths_owner_all"
  on public.learning_paths
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- path_steps no tiene user_id propio: su dueño es el de la ruta a la que pertenece.
create policy "path_steps_owner_all"
  on public.path_steps
  for all
  to authenticated
  using (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_steps.path_id
        and lp.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_steps.path_id
        and lp.user_id = (select auth.uid())
    )
  );
