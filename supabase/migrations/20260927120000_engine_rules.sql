-- Motor de rutas v2 (spec 17, ADR 0008): el admin controla las reglas del motor.
-- 1. course_prerequisites: qué curso necesita a cuál ("necesita") o conviene después de cuál
--    ("conviene"). Sale de data/course-prerequisites.json.
-- 2. interest_courses: qué cursos sugiere cada interés del cuestionario, en orden de preferencia.
--    Las etiquetas de los intereses siguen en lib/paths/interests.ts. Sale de
--    data/interest-courses.json.
-- 3. Fundamentos pasa a ser la base editable del principiante: Programación requerido, Git
--    recomendado y el resto opcional (entra solo si se marca ese interés).
-- 4. get_shared_path devuelve la dificultad de cada curso, para agrupar la ruta por tramos.
-- Lectura pública y escritura solo admin, igual que program_courses (20260920222218_catalog.sql).

create type public.course_prerequisite_kind as enum ('necesita', 'conviene');

create table public.course_prerequisites (
  course_id bigint not null references public.courses (id) on delete cascade,
  prerequisite_course_id bigint not null references public.courses (id) on delete cascade,
  kind public.course_prerequisite_kind not null,
  primary key (course_id, prerequisite_course_id),
  constraint course_prerequisites_not_self check (course_id <> prerequisite_course_id)
);

create index course_prerequisites_prerequisite_course_id_idx
  on public.course_prerequisites (prerequisite_course_id);

-- interest_slug es texto sin FK: los intereses viven en código (lib/paths/interests.ts).
create table public.interest_courses (
  interest_slug text not null,
  course_id bigint not null references public.courses (id) on delete cascade,
  position integer not null,
  primary key (interest_slug, course_id),
  constraint interest_courses_interest_slug_format
    check (interest_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index interest_courses_course_id_idx on public.interest_courses (course_id);

alter table public.course_prerequisites enable row level security;
alter table public.interest_courses enable row level security;

create policy "course_prerequisites_select_public"
  on public.course_prerequisites
  for select
  to anon, authenticated
  using (true);

create policy "course_prerequisites_insert_admin"
  on public.course_prerequisites
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "course_prerequisites_update_admin"
  on public.course_prerequisites
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "course_prerequisites_delete_admin"
  on public.course_prerequisites
  for delete
  to authenticated
  using ((select private.is_admin()));

create policy "interest_courses_select_public"
  on public.interest_courses
  for select
  to anon, authenticated
  using (true);

create policy "interest_courses_insert_admin"
  on public.interest_courses
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "interest_courses_update_admin"
  on public.interest_courses
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "interest_courses_delete_admin"
  on public.interest_courses
  for delete
  to authenticated
  using ((select private.is_admin()));

insert into public.course_prerequisites (course_id, prerequisite_course_id, kind)
select c.id, p.id, t.kind::public.course_prerequisite_kind
from jsonb_to_recordset($seed_prerequisites$
[{"course_slug":"javascript-moderno","prerequisite_slug":"programacion-para-principiantes","kind":"conviene"},{"course_slug":"Java","prerequisite_slug":"programacion-para-principiantes","kind":"conviene"},{"course_slug":"python","prerequisite_slug":"programacion-para-principiantes","kind":"conviene"},{"course_slug":"csharp","prerequisite_slug":"programacion-para-principiantes","kind":"conviene"},{"course_slug":"PHP-moderno","prerequisite_slug":"programacion-para-principiantes","kind":"conviene"},{"course_slug":"dart-cero-hasta-detalles","prerequisite_slug":"programacion-para-principiantes","kind":"conviene"},{"course_slug":"typescript-guia-completa","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"react-de-cero","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"react-pro","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"nextjs","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"react-router","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"tanstack-query","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"tanstack-query","prerequisite_slug":"typescript-guia-completa","kind":"necesita"},{"course_slug":"zustand-gestor-de-estado-para-react","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"shadcn-ui","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"shadcn-ui","prerequisite_slug":"typescript-guia-completa","kind":"necesita"},{"course_slug":"shadcn-ui","prerequisite_slug":"tailwindcss-para-desarrolladores","kind":"conviene"},{"course_slug":"react-sockets","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"react-native-expo","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"expo-gemini","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"expo-gemini","prerequisite_slug":"react-native-expo","kind":"conviene"},{"course_slug":"openai","prerequisite_slug":"react-de-cero","kind":"necesita"},{"course_slug":"openai","prerequisite_slug":"nest","kind":"necesita"},{"course_slug":"openai","prerequisite_slug":"typescript-guia-completa","kind":"conviene"},{"course_slug":"openai-angular-nestjs","prerequisite_slug":"angular-moderno","kind":"necesita"},{"course_slug":"openai-angular-nestjs","prerequisite_slug":"nest","kind":"necesita"},{"course_slug":"vue-cero-a-experto","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"Vue-intermedio","prerequisite_slug":"vue-cero-a-experto","kind":"necesita"},{"course_slug":"nuxt","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"nuxt","prerequisite_slug":"vue-cero-a-experto","kind":"conviene"},{"course_slug":"angular-moderno","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"angular-moderno","prerequisite_slug":"typescript-guia-completa","kind":"conviene"},{"course_slug":"angular","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"angular-pro","prerequisite_slug":"angular-moderno","kind":"necesita"},{"course_slug":"angular-pro","prerequisite_slug":"git-github-control-versiones-desde-cero","kind":"conviene"},{"course_slug":"Angular_socket_bun","prerequisite_slug":"angular-moderno","kind":"necesita"},{"course_slug":"Astro","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"qwik-introduccion","prerequisite_slug":"typescript-guia-completa","kind":"necesita"},{"course_slug":"qwik-introduccion","prerequisite_slug":"react-de-cero","kind":"conviene"},{"course_slug":"nodejs-de-cero-a-experto","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"node-clean-architecture","prerequisite_slug":"nodejs-de-cero-a-experto","kind":"necesita"},{"course_slug":"node-clean-architecture","prerequisite_slug":"sql-con-postgres","kind":"conviene"},{"course_slug":"nest","prerequisite_slug":"javascript-moderno","kind":"necesita"},{"course_slug":"nest","prerequisite_slug":"typescript-guia-completa","kind":"conviene"},{"course_slug":"nest","prerequisite_slug":"nodejs-de-cero-a-experto","kind":"conviene"},{"course_slug":"nest-graphql","prerequisite_slug":"nest","kind":"necesita"},{"course_slug":"nestjs-microservicios","prerequisite_slug":"nest","kind":"necesita"},{"course_slug":"nestjs-microservicios","prerequisite_slug":"typescript-guia-completa","kind":"necesita"},{"course_slug":"nestjs-microservicios","prerequisite_slug":"docker-guia-practica","kind":"conviene"},{"course_slug":"nestjs-reportes","prerequisite_slug":"nest","kind":"necesita"},{"course_slug":"NestJS-Testing","prerequisite_slug":"nest","kind":"necesita"},{"course_slug":"java-avanzado","prerequisite_slug":"Java","kind":"necesita"},{"course_slug":"spring-boot","prerequisite_slug":"Java","kind":"necesita"},{"course_slug":"spring-boot","prerequisite_slug":"java-avanzado","kind":"conviene"},{"course_slug":"spring-boot-patrones-arquitectura","prerequisite_slug":"spring-boot","kind":"necesita"},{"course_slug":"spring-boot-microservicios","prerequisite_slug":"spring-boot","kind":"necesita"},{"course_slug":"spring-boot-microservicios","prerequisite_slug":"sql-con-postgres","kind":"necesita"},{"course_slug":"spring-boot-microservicios","prerequisite_slug":"docker-guia-practica","kind":"conviene"},{"course_slug":"springboot-mvc-hexagonal","prerequisite_slug":"spring-boot","kind":"necesita"},{"course_slug":"kafka-springboot-event-driven","prerequisite_slug":"spring-boot","kind":"necesita"},{"course_slug":"spring-AI","prerequisite_slug":"spring-boot","kind":"necesita"},{"course_slug":"spring-AI","prerequisite_slug":"java-avanzado","kind":"conviene"},{"course_slug":"NET-Backend","prerequisite_slug":"csharp","kind":"necesita"},{"course_slug":"NET-Backend","prerequisite_slug":"sql-con-postgres","kind":"conviene"},{"course_slug":"net-pruebascompletas","prerequisite_slug":"csharp","kind":"necesita"},{"course_slug":"net-pruebascompletas","prerequisite_slug":"NET-Backend","kind":"conviene"},{"course_slug":"netfullstack","prerequisite_slug":"csharp","kind":"necesita"},{"course_slug":"netfullstack","prerequisite_slug":"NET-Backend","kind":"conviene"},{"course_slug":"fastapi","prerequisite_slug":"python","kind":"necesita"},{"course_slug":"fastapi","prerequisite_slug":"sql-con-postgres","kind":"necesita"},{"course_slug":"fastapi","prerequisite_slug":"git-github-control-versiones-desde-cero","kind":"conviene"},{"course_slug":"django","prerequisite_slug":"python","kind":"necesita"},{"course_slug":"django","prerequisite_slug":"sql-con-postgres","kind":"conviene"},{"course_slug":"python-ia-aplicada","prerequisite_slug":"python","kind":"necesita"},{"course_slug":"python-ia-aplicada","prerequisite_slug":"sql-con-postgres","kind":"necesita"},{"course_slug":"python-ia-aplicada","prerequisite_slug":"Ingeniería-de-prompts","kind":"conviene"},{"course_slug":"python-n8n-automatiza-rutinas","prerequisite_slug":"python","kind":"necesita"},{"course_slug":"python-n8n-automatiza-rutinas","prerequisite_slug":"n8n-mcp","kind":"conviene"},{"course_slug":"python-n8n-automatiza-rutinas","prerequisite_slug":"fastapi","kind":"conviene"},{"course_slug":"laravel-ai","prerequisite_slug":"PHP-moderno","kind":"necesita"},{"course_slug":"golang-fundamentos-lenguaje","prerequisite_slug":"programacion-para-principiantes","kind":"conviene"},{"course_slug":"golang-backend-profesional","prerequisite_slug":"golang-fundamentos-lenguaje","kind":"necesita"},{"course_slug":"golang-backend-profesional","prerequisite_slug":"sql-con-postgres","kind":"necesita"},{"course_slug":"golang-backend-profesional","prerequisite_slug":"git-github-control-versiones-desde-cero","kind":"conviene"},{"course_slug":"flutter-movil-cero-a-experto","prerequisite_slug":"dart-cero-hasta-detalles","kind":"conviene"},{"course_slug":"flutter-movil-intermedio","prerequisite_slug":"flutter-movil-cero-a-experto","kind":"necesita"},{"course_slug":"flutter-movil-intermedio","prerequisite_slug":"dart-cero-hasta-detalles","kind":"necesita"},{"course_slug":"riverpod-con-anotaciones","prerequisite_slug":"flutter-movil-cero-a-experto","kind":"necesita"},{"course_slug":"flutter-bloc","prerequisite_slug":"flutter-movil-cero-a-experto","kind":"necesita"},{"course_slug":"Flutter-Gemini","prerequisite_slug":"flutter-movil-cero-a-experto","kind":"necesita"},{"course_slug":"solid-clean-code","prerequisite_slug":"typescript-guia-completa","kind":"necesita"},{"course_slug":"patrones-diseno","prerequisite_slug":"typescript-guia-completa","kind":"conviene"},{"course_slug":"ia-para-developers","prerequisite_slug":"typescript-guia-completa","kind":"necesita"},{"course_slug":"ia-para-developers","prerequisite_slug":"Ingeniería-de-prompts","kind":"conviene"},{"course_slug":"ia-para-developers","prerequisite_slug":"nodejs-de-cero-a-experto","kind":"conviene"},{"course_slug":"claude-code-guia-completa","prerequisite_slug":"programacion-para-principiantes","kind":"conviene"},{"course_slug":"claude-code-guia-completa","prerequisite_slug":"git-github-control-versiones-desde-cero","kind":"conviene"},{"course_slug":"open-code-guia-completa","prerequisite_slug":"git-github-control-versiones-desde-cero","kind":"conviene"},{"course_slug":"docker-guia-practica","prerequisite_slug":"git-github-control-versiones-desde-cero","kind":"conviene"},{"course_slug":"vibe-coding","prerequisite_slug":"javascript-moderno","kind":"conviene"},{"course_slug":"vibe-coding","prerequisite_slug":"python","kind":"conviene"}]
$seed_prerequisites$::jsonb)
  as t(course_slug text, prerequisite_slug text, kind text)
join public.courses c on c.slug = t.course_slug
join public.courses p on p.slug = t.prerequisite_slug;

insert into public.interest_courses (interest_slug, course_id, position)
select t.interest_slug, c.id, t.position
from jsonb_to_recordset($seed_interests$
[{"interest_slug":"docker","course_slug":"docker-guia-practica","position":1},{"interest_slug":"solid-clean-code","course_slug":"solid-clean-code","position":1},{"interest_slug":"patrones-diseno","course_slug":"patrones-diseno","position":1},{"interest_slug":"control-versiones","course_slug":"git-github-control-versiones-desde-cero","position":1},{"interest_slug":"bases-de-datos-sql","course_slug":"sql-con-postgres","position":1},{"interest_slug":"testing","course_slug":"NestJS-Testing","position":1},{"interest_slug":"testing","course_slug":"net-pruebascompletas","position":2},{"interest_slug":"tiempo-real","course_slug":"react-sockets","position":1},{"interest_slug":"tiempo-real","course_slug":"Angular_socket_bun","position":2},{"interest_slug":"ia-aplicada","course_slug":"Ingeniería-de-prompts","position":1},{"interest_slug":"ia-aplicada","course_slug":"spring-AI","position":2},{"interest_slug":"ia-aplicada","course_slug":"python-ia-aplicada","position":3},{"interest_slug":"ia-aplicada","course_slug":"ia-para-developers","position":4},{"interest_slug":"ia-aplicada","course_slug":"Flutter-Gemini","position":5},{"interest_slug":"ia-aplicada","course_slug":"expo-gemini","position":6},{"interest_slug":"ia-aplicada","course_slug":"openai","position":7},{"interest_slug":"ia-aplicada","course_slug":"openai-angular-nestjs","position":8},{"interest_slug":"microservicios","course_slug":"nestjs-microservicios","position":1},{"interest_slug":"microservicios","course_slug":"spring-boot-microservicios","position":2},{"interest_slug":"microservicios","course_slug":"go-microservicios","position":3},{"interest_slug":"sitios-de-contenido","course_slug":"Astro","position":1},{"interest_slug":"sitios-de-contenido","course_slug":"qwik-introduccion","position":2},{"interest_slug":"agentes-vibe-coding","course_slug":"claude-code-guia-completa","position":1},{"interest_slug":"agentes-vibe-coding","course_slug":"open-code-guia-completa","position":2},{"interest_slug":"agentes-vibe-coding","course_slug":"vibe-coding","position":3},{"interest_slug":"estilos","course_slug":"tailwindcss-para-desarrolladores","position":1}]
$seed_interests$::jsonb)
  as t(interest_slug text, course_slug text, position integer)
join public.courses c on c.slug = t.course_slug;

-- Cada curso de Fundamentos tiene su propia etapa: cambiar el nivel no choca con el unique
-- (program_id, stage, level, position).
update public.program_courses pc
set level = case c.slug
  when 'programacion-para-principiantes' then 'requerido'
  when 'git-github-control-versiones-desde-cero' then 'recomendado'
  else 'opcional'
end::public.program_course_level
from public.programs p, public.courses c
where pc.program_id = p.id
  and pc.course_id = c.id
  and p.slug = 'fundamentos';

-- Igual que en 20260925160000_path_sharing.sql, más `courseDifficulty` por paso. `create or
-- replace` conserva los grants de anon y authenticated.
create or replace function public.get_shared_path(p_slug text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_viewer_id uuid := (select auth.uid());
  v_path public.learning_paths%rowtype;
  v_author_username text;
  v_author_avatar_url text;
  v_own_path_id uuid;
  v_steps jsonb;
begin
  select * into v_path
  from public.learning_paths
  where share_slug = p_slug and is_public;

  if not found then
    return null;
  end if;

  select username, avatar_url into v_author_username, v_author_avatar_url
  from public.profiles
  where id = v_path.user_id;

  if v_viewer_id = v_path.user_id then
    v_own_path_id := v_path.id;
  elsif v_viewer_id is not null then
    select id into v_own_path_id
    from public.learning_paths
    where user_id = v_viewer_id and copied_from_path_id = v_path.id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'courseId', courses.id,
        'stage', path_steps.stage,
        'position', path_steps.position,
        'origin', path_steps.origin,
        'reason', coalesce(path_steps.ai_reason, path_steps.reason),
        'courseTitle', courses.title,
        'courseHours', courses.hours,
        'courseDifficulty', courses.difficulty,
        'courseUrl', courses.url,
        'courseImageUrl', courses.image_url,
        'programSlug', programs.slug,
        'programName', programs.name
      )
      order by path_steps.stage, path_steps.position
    ),
    '[]'::jsonb
  ) into v_steps
  from public.path_steps
  join public.courses on courses.id = path_steps.course_id
  left join public.programs on programs.id = path_steps.source_program_id
  where path_steps.path_id = v_path.id
    and path_steps.status <> 'discarded';

  return jsonb_build_object(
    'title', coalesce(v_path.ai_title, v_path.title),
    'summary', coalesce(v_path.ai_summary, v_path.summary),
    'budgetHours', v_path.budget_hours,
    'isPersonalized', v_path.personalized_at is not null,
    'author', jsonb_build_object('username', v_author_username, 'avatarUrl', v_author_avatar_url),
    'viewer', jsonb_build_object(
      'isOwner', v_viewer_id is not null and v_viewer_id = v_path.user_id,
      'ownPathId', v_own_path_id
    ),
    'steps', v_steps
  );
end;
$$;
