-- Quizzes y racha unificada (migraciones 20260923120000 y 20260924130000). Corre dentro de una
-- transacción que termina en rollback: no deja datos. `supabase test db` o pegarlo en el editor SQL.
begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_table('public', 'quizzes', 'shared quizzes table exists');
select has_table('public', 'quiz_attempts', 'private quiz attempts table exists');
select has_table('public', 'streak_activities', 'daily streak activity table exists');
select has_function(
  'public',
  'submit_quiz_attempt',
  array['uuid', 'uuid', 'uuid', 'jsonb', 'text', 'uuid'],
  'atomic quiz submission RPC exists'
);
select has_function(
  'public',
  'record_step_activity',
  array['uuid', 'text'],
  'manual step progress RPC exists'
);
select col_is_null('public', 'streak_activities', 'source_attempt_id', 'a streak day may come from a step');
select hasnt_column('public', 'profiles', 'current_streak', 'the streak is derived, not stored');
select policies_are(
  'public',
  'quiz_attempts',
  array['quiz_attempts_select_owner'],
  'attempts expose only an owner-select policy'
);
select ok(
  not has_function_privilege('anon', 'public.record_step_activity(uuid, text)', 'execute'),
  'anon cannot record step activity'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'quiz-owner@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'other@example.com', '', now(), '{}', '{}', now(), now());

insert into public.learning_paths (id, user_id, title, goal)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ruta test', 'react-nest');

insert into public.path_steps (id, path_id, course_id, stage, position, origin, reason)
select '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', id, 1, 1, 'requerido', 'Primero'
from public.courses order by id limit 1;
insert into public.path_steps (id, path_id, course_id, stage, position, origin, reason)
select '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', id, 2, 1, 'requerido', 'Segundo'
from public.courses order by id offset 1 limit 1;

insert into public.quizzes (id, course_id, kind, chapter_title, target_key, status, title, questions, model)
select '40000000-0000-0000-0000-000000000001', course_id, 'chapter', 'Capítulo test', 'chapter:test', 'ready', 'Capítulo test',
  '[{"id":"1","prompt":"P1","options":["A","B","C","D"],"correctOption":0,"explanation":"E1"},{"id":"2","prompt":"P2","options":["A","B","C","D"],"correctOption":1,"explanation":"E2"},{"id":"3","prompt":"P3","options":["A","B","C","D"],"correctOption":2,"explanation":"E3"}]'::jsonb, 'test'
from public.path_steps where id = '30000000-0000-0000-0000-000000000001';
insert into public.quizzes (id, course_id, kind, target_key, status, title, questions, model)
select '40000000-0000-0000-0000-000000000002', course_id, 'course', 'course:test-second', 'ready', 'Curso test',
  '[{"id":"1","prompt":"P1","options":["A","B","C","D"],"correctOption":0,"explanation":"E"}]'::jsonb, 'test'
from public.path_steps where id = '30000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

-- Avance manual: un paso pendiente no cuenta; en curso, sí, una vez por día.
select throws_ok(
  $$ select public.record_step_activity('30000000-0000-0000-0000-000000000001', 'UTC') $$,
  'P0002', 'Paso no disponible', 'a pending step does not count for the streak'
);
update public.path_steps set status = 'in_progress' where id = '30000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.record_step_activity('30000000-0000-0000-0000-000000000001', 'Invalid/Zone') $$,
  'an in-progress step records the day, invalid zones fall back to UTC'
);
select public.record_step_activity('30000000-0000-0000-0000-000000000001', 'UTC');
select is(
  (select count(*)::integer from public.streak_activities where user_id = '10000000-0000-0000-0000-000000000001'),
  1, 'two advances on the same day leave one row'
);
select is(
  (select timezone from public.streak_activities where user_id = '10000000-0000-0000-0000-000000000001'),
  'UTC', 'the invalid zone was stored as UTC'
);

-- Quiz de capítulo: corrige en el servidor y no completa el paso.
select is(
  (public.submit_quiz_attempt('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','[0,1,3]'::jsonb,'UTC','50000000-0000-0000-0000-000000000001') ->> 'correctCount')::integer,
  2, 'the attempt is graded in the database'
);
select is(
  (select jsonb_array_length(public.submit_quiz_attempt('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','[0,1,3]'::jsonb,'UTC','50000000-0000-0000-0000-000000000001') -> 'results')),
  3, 'a resubmission returns the per-question results of the saved attempt'
);
select is(
  (select count(*)::integer from public.quiz_attempts where user_id = '10000000-0000-0000-0000-000000000001'),
  1, 'duplicate idempotency key does not save another attempt'
);
select is(
  (select status::text from public.path_steps where id = '30000000-0000-0000-0000-000000000001'),
  'in_progress', 'a chapter quiz does not complete its course step'
);

-- Quiz de curso: sin bloqueo por orden (el paso 1 no está hecho) y aprobarlo completa el paso.
select lives_ok(
  $$ select public.submit_quiz_attempt('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','[0]'::jsonb,'UTC','50000000-0000-0000-0000-000000000002') $$,
  'a course quiz can be taken in any order, like the manual toggle'
);
select is(
  (select status::text from public.path_steps where id = '30000000-0000-0000-0000-000000000002'),
  'done', 'passing the course quiz marks the step as done'
);

-- Otro usuario no puede usar los pasos ni ver los días del primero.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select public.record_step_activity('30000000-0000-0000-0000-000000000001', 'UTC') $$,
  'P0002', 'Paso no disponible', 'another user cannot record activity on a foreign step'
);
select is(
  (select count(*)::integer from public.streak_activities),
  0, 'another user cannot read foreign streak days'
);

select * from finish();
rollback;
