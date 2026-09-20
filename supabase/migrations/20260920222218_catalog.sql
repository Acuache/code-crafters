-- SPEC 02 (specs/02-supabase-schema.md) — paso 3 del plan de implementación.
-- Catálogo de cursos y programas oficiales: courses, programs, program_courses.
-- Lectura pública (anon + authenticated); escritura solo admin, vía private.is_admin().

create type public.course_difficulty as enum ('principiante', 'intermedio', 'avanzado');
create type public.program_course_level as enum ('requerido', 'recomendado', 'opcional');

create table public.courses (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  summary text,
  url text not null,
  image_url text,
  instructor text,
  hours numeric(5,1) not null,
  lessons integer not null,
  price numeric(6,2),          -- único campo del catálogo con nulos: los 7 cursos solo-PRO
  is_free boolean not null default false,
  is_pro boolean not null default false,
  is_new boolean not null default false,
  in_construction boolean not null default false,
  is_active boolean not null default true,
  areas text[] not null default '{}',
  prerequisites text[] not null default '{}',
  topics text[] not null default '{}',
  outcomes text[] not null default '{}',
  chapters text[] not null default '{}',
  related text[] not null default '{}',
  difficulty public.course_difficulty not null,
  outcome text not null,
  created_at timestamptz not null default now()
);

create table public.programs (
  id bigint generated always as identity primary key,
  slug text not null unique,           -- 'react', 'react-native', 'dart-movil', 'dart-web', ...
  source_slug text not null,           -- el slug de nivel superior en programs.json: 'react', 'dart'
  name text not null,                  -- 'React', 'React Native'
  position integer not null,
  created_at timestamptz not null default now()
);

create table public.program_courses (
  id bigint generated always as identity primary key,
  program_id bigint not null references public.programs (id) on delete cascade,
  course_id bigint not null references public.courses (id) on delete restrict,
  stage integer not null,
  level public.program_course_level not null,
  position integer not null,           -- orden dentro de un paso con varios cursos (máx. 4 en el catálogo)
  note text,
  unique (program_id, stage, level, position),
  unique (program_id, course_id)       -- un curso no se repite dentro de una misma ruta (verificado en los 107 vínculos)
);

-- Postgres no indexa automáticamente las columnas de FK. program_id ya queda cubierto como
-- prefijo izquierdo de los dos unique de arriba; course_id no, así que necesita su propio índice.
create index program_courses_course_id_idx on public.program_courses (course_id);

alter table public.courses enable row level security;
alter table public.programs enable row level security;
alter table public.program_courses enable row level security;

create policy "courses_select_public"
  on public.courses
  for select
  to anon, authenticated
  using (true);

create policy "courses_insert_admin"
  on public.courses
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "courses_update_admin"
  on public.courses
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "courses_delete_admin"
  on public.courses
  for delete
  to authenticated
  using ((select private.is_admin()));

create policy "programs_select_public"
  on public.programs
  for select
  to anon, authenticated
  using (true);

create policy "programs_insert_admin"
  on public.programs
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "programs_update_admin"
  on public.programs
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "programs_delete_admin"
  on public.programs
  for delete
  to authenticated
  using ((select private.is_admin()));

create policy "program_courses_select_public"
  on public.program_courses
  for select
  to anon, authenticated
  using (true);

create policy "program_courses_insert_admin"
  on public.program_courses
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "program_courses_update_admin"
  on public.program_courses
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "program_courses_delete_admin"
  on public.program_courses
  for delete
  to authenticated
  using ((select private.is_admin()));
