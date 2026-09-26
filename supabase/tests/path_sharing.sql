-- Rutas compartidas (migración 20260925160000, spec 15). Termina en rollback: no deja datos.
-- Usa cursos propios (`test-share-*`) y un slug fijo para la ruta pública.
begin;

create extension if not exists pgtap with schema extensions;

select plan(46);

select has_column('public', 'learning_paths', 'is_public', 'a path can be public');
select has_column('public', 'learning_paths', 'share_slug', 'a path has a share slug');
select col_is_unique('public', 'learning_paths', 'share_slug', 'share slugs are unique');
select fk_ok(
  'public', 'learning_paths', 'copied_from_path_id',
  'public', 'learning_paths', 'id',
  'a copy points to the path it came from'
);
select is(
  (select confdeltype::text from pg_catalog.pg_constraint
   where conname = 'learning_paths_copied_from_path_id_fkey'),
  'n', 'deleting the original sets the copy origin to null'
);
select has_function('public', 'get_shared_path', array['text'], 'public read RPC exists');
select has_function('public', 'copy_shared_path', array['text'], 'copy RPC exists');
select has_function('public', 'get_path_origin', array['uuid'], 'copy origin RPC exists');
select policies_are(
  'public', 'learning_paths', array['learning_paths_all_owner'],
  'paths keep a single owner policy, none for anon'
);
select policies_are(
  'public', 'path_steps', array['path_steps_all_owner'],
  'steps keep a single owner policy, none for anon'
);
select ok(
  has_function_privilege('anon', 'public.get_shared_path(text)', 'execute'),
  'anon can read a shared path'
);
select ok(
  not has_function_privilege('anon', 'public.copy_shared_path(text)', 'execute'),
  'anon cannot copy a path'
);
select ok(
  not has_function_privilege('anon', 'public.get_path_origin(uuid)', 'execute'),
  'anon cannot read a copy origin'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '12000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'share-author@example.com', '', now(), '{}', '{"user_name":"autora"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '12000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'share-visitor@example.com', '', now(), '{}', '{}', now(), now());

insert into public.courses (slug, title, url, hours, lessons, difficulty, outcome) values
  ('test-share-1', 'Curso share 1', 'https://example.com/test-share-1', 2, 1, 'principiante', 'Test'),
  ('test-share-2', 'Curso share 2', 'https://example.com/test-share-2', 3, 1, 'principiante', 'Test'),
  ('test-share-3', 'Curso share 3', 'https://example.com/test-share-3', 4, 1, 'principiante', 'Test');

insert into public.assessments (id, user_id, answers)
values ('62000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '{}');

-- La ruta pública: personalizada, con un paso hecho, uno en curso y uno descartado.
insert into public.learning_paths (
  id, user_id, assessment_id, title, goal, summary, budget_hours,
  ai_title, personalized_at, ai_adjustments, is_public, share_slug
) values (
  '22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000001', 'Ruta motor', 'react-nest', 'Resumen motor', 10,
  'Ruta IA', now(), '{"explanation":"Ajuste del perfil de la autora"}', true, 'feedfacecafe0001'
);

insert into public.learning_paths (id, user_id, title, goal)
values ('22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', 'Ruta privada', 'react-nest');

insert into public.path_steps (id, path_id, course_id, stage, position, origin, reason, ai_reason, status, discard_reason, completed_at) values
  ('32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-share-1'), 1, 1, 'requerido', 'Primero', 'Razón IA', 'done', null, now()),
  ('32000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-share-2'), 1, 2, 'requerido', 'Segundo', null, 'in_progress', null, null),
  ('32000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-share-3'), 2, 1, 'opcional', 'Tercero', null, 'discarded', 'Lo quitaste tú', null);

select ok(
  (select not is_public and share_slug ~ '^[0-9a-f]{16}$'
   from public.learning_paths where id = '22000000-0000-0000-0000-000000000002'),
  'a new path is private and gets a 16-char hex slug'
);

-- Sin sesión: las tablas no devuelven nada, pero la función lee la ruta pública.
set local role anon;

select is(
  (select count(*)::integer from public.learning_paths),
  0, 'anon reads no paths'
);
select is(
  (select count(*)::integer from public.path_steps),
  0, 'anon reads no steps'
);
select is(
  public.get_shared_path('feedfacecafe0001') ->> 'title',
  'Ruta IA', 'the AI title replaces the engine title'
);
select is(
  public.get_shared_path('feedfacecafe0001') ->> 'summary',
  'Resumen motor', 'without an AI summary, the engine summary is shown'
);
select is(
  array(select key from jsonb_object_keys(public.get_shared_path('feedfacecafe0001')) as key order by key),
  array['author', 'budgetHours', 'isPersonalized', 'steps', 'summary', 'title', 'viewer'],
  'the shared path exposes no ids, assessment or AI adjustments'
);
select is(
  public.get_shared_path('feedfacecafe0001') -> 'author' ->> 'username',
  'autora', 'the author username is shown'
);
select is(
  array(
    select step ->> 'courseTitle'
    from jsonb_array_elements(public.get_shared_path('feedfacecafe0001') -> 'steps') as step
  ),
  array['Curso share 1', 'Curso share 2'],
  'only non-discarded steps are shown, in order'
);
select is(
  public.get_shared_path('feedfacecafe0001') -> 'steps' -> 0 ->> 'reason',
  'Razón IA', 'the AI reason replaces the engine reason'
);
select is(
  public.get_shared_path('feedfacecafe0001') -> 'viewer',
  '{"isOwner": false, "ownPathId": null}'::jsonb,
  'anon is neither the owner nor has a copy'
);
select is(
  public.get_shared_path('0000000000000000'),
  null, 'an unknown slug returns null'
);
select throws_ok(
  $$ select public.copy_shared_path('feedfacecafe0001') $$,
  '42501', null, 'anon cannot run the copy'
);

-- La visitante copia la ruta.
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);

select isnt(
  public.copy_shared_path('feedfacecafe0001'),
  null, 'a visitor copies a shared path'
);
select is(
  public.copy_shared_path('feedfacecafe0001'),
  (select id from public.learning_paths where copied_from_path_id = '22000000-0000-0000-0000-000000000001'),
  'copying again returns the existing copy'
);
select is(
  (select count(*)::integer from public.learning_paths),
  1, 'a second copy is not created'
);
select ok(
  (select not is_public and share_slug ~ '^[0-9a-f]{16}$' and share_slug <> 'feedfacecafe0001'
   from public.learning_paths where copied_from_path_id = '22000000-0000-0000-0000-000000000001'),
  'the copy is private and has its own slug'
);
select ok(
  (select title = 'Ruta motor' and summary = 'Resumen motor' and budget_hours = 10
     and ai_title = 'Ruta IA' and ai_summary is null and personalized_at is not null
   from public.learning_paths where copied_from_path_id = '22000000-0000-0000-0000-000000000001'),
  'the copy keeps the engine and AI texts'
);
select ok(
  (select assessment_id is null and ai_adjustments is null
   from public.learning_paths where copied_from_path_id = '22000000-0000-0000-0000-000000000001'),
  'the copy drops the author assessment and AI adjustments'
);
select is(
  array(
    select courses.slug || ':' || path_steps.status
    from public.path_steps
    join public.courses on courses.id = path_steps.course_id
    join public.learning_paths on learning_paths.id = path_steps.path_id
    where learning_paths.copied_from_path_id = '22000000-0000-0000-0000-000000000001'
    order by path_steps.stage, path_steps.position
  ),
  array['test-share-1:pending', 'test-share-2:pending', 'test-share-3:discarded'],
  'the copy keeps the courses and their order, with progress reset'
);
select is(
  (select discard_reason from public.path_steps where status = 'discarded'),
  'Lo quitaste tú', 'a discarded step keeps its reason'
);
select is(
  (select count(*)::integer from public.path_steps where completed_at is not null),
  0, 'no copied step is completed'
);
select is(
  (select ai_reason from public.path_steps where position = 1 and stage = 1),
  'Razón IA', 'the copy keeps the AI reasons'
);
select is(
  (public.get_shared_path('feedfacecafe0001') -> 'viewer' ->> 'ownPathId')::uuid,
  (select id from public.learning_paths where copied_from_path_id = '22000000-0000-0000-0000-000000000001'),
  'after copying, the shared path points the visitor to her copy'
);
select is(
  public.get_path_origin((select id from public.learning_paths where copied_from_path_id = '22000000-0000-0000-0000-000000000001')),
  'autora', 'the copy owner reads the original author'
);
select is(
  public.get_path_origin('22000000-0000-0000-0000-000000000001'),
  null, 'only the owner of a path reads its origin'
);
select throws_ok(
  $$ insert into public.learning_paths (user_id, title, goal, copied_from_path_id)
     values ('12000000-0000-0000-0000-000000000002', 'Otra copia', 'react-nest', '22000000-0000-0000-0000-000000000001') $$,
  '23505', null, 'the unique index blocks a second copy of the same path'
);

-- La autora abre su propio link, lo deja de compartir y borra la ruta.
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);

select is(
  public.get_shared_path('feedfacecafe0001') -> 'viewer',
  '{"isOwner": true, "ownPathId": "22000000-0000-0000-0000-000000000001"}'::jsonb,
  'the owner is recognized and pointed to her own path'
);
select is(
  public.copy_shared_path('feedfacecafe0001'),
  '22000000-0000-0000-0000-000000000001'::uuid, 'the owner copying gets her own path back'
);
select is(
  (select count(*)::integer from public.learning_paths),
  2, 'the owner copying creates nothing'
);

update public.learning_paths set is_public = false where id = '22000000-0000-0000-0000-000000000001';

select is(
  public.get_shared_path('feedfacecafe0001'),
  null, 'an unshared path is not found'
);

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select public.copy_shared_path('feedfacecafe0001') $$,
  'P0002', 'Ruta no disponible', 'an unshared path cannot be copied'
);

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
delete from public.learning_paths where id = '22000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);
select is(
  (select copied_from_path_id from public.learning_paths),
  null, 'the copy survives the original, without its origin'
);
select is(
  public.get_path_origin((select id from public.learning_paths)),
  null, 'the copy loses its attribution line'
);

select * from finish();
rollback;
