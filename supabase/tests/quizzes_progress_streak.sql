-- Quizzes de curso y racha unificada (migraciones 20260923120000, 20260924130000 y 20260925130000).
-- Corre dentro de una transacción que termina en rollback: no deja datos. `supabase test db` o
-- pegarlo en el editor SQL. Usa cursos propios (`test-quiz-*`) para no chocar con los quizzes del
-- seed: cada curso tiene un único quiz.
begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

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
select hasnt_column('public', 'quizzes', 'kind', 'every quiz is a course quiz, no chapters');
select hasnt_column('public', 'quizzes', 'status', 'quizzes are written by the admin, not generated');
select col_is_unique('public', 'quizzes', 'course_id', 'one quiz per course');
select col_is_null('public', 'streak_activities', 'source_attempt_id', 'a streak day may come from a step');
select hasnt_column('public', 'profiles', 'current_streak', 'the streak is derived, not stored');
select policies_are(
  'public',
  'quiz_attempts',
  array['quiz_attempts_select_owner'],
  'attempts expose only an owner-select policy'
);
select policies_are(
  'public',
  'quizzes',
  array['quizzes_select_active', 'quizzes_insert_admin', 'quizzes_update_admin'],
  'quizzes are read by users, written only by admins and never deleted'
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
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'other@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'quiz-admin@example.com', '', now(), '{}', '{}', now(), now());

-- El trigger de auth.users ya creó los perfiles; el rol solo se cambia fuera de la API.
update public.profiles set role = 'admin' where id = '10000000-0000-0000-0000-000000000003';

insert into public.courses (slug, title, url, hours, lessons, difficulty, outcome) values
  ('test-quiz-1', 'Curso test 1', 'https://example.com/test-quiz-1', 1, 1, 'principiante', 'Test'),
  ('test-quiz-2', 'Curso test 2', 'https://example.com/test-quiz-2', 1, 1, 'principiante', 'Test'),
  ('test-quiz-3', 'Curso test 3', 'https://example.com/test-quiz-3', 1, 1, 'principiante', 'Test'),
  ('test-quiz-4', 'Curso test 4', 'https://example.com/test-quiz-4', 1, 1, 'principiante', 'Test');

insert into public.learning_paths (id, user_id, title, goal)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ruta test', 'react-nest');

insert into public.path_steps (id, path_id, course_id, stage, position, origin, reason) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-quiz-1'), 1, 1, 'requerido', 'Primero'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-quiz-2'), 2, 1, 'requerido', 'Segundo'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-quiz-3'), 3, 1, 'requerido', 'Tercero');

-- Dos quizzes activos y uno desactivado; test-quiz-4 queda sin quiz para que lo cree el admin.
insert into public.quizzes (id, course_id, is_active, questions) values
  ('40000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-quiz-1'), true,
    '[{"id":"1","prompt":"P1","options":["A","B","C","D"],"correctOption":0,"explanation":"E1"},{"id":"2","prompt":"P2","options":["A","B","C","D"],"correctOption":1,"explanation":"E2"},{"id":"3","prompt":"P3","options":["A","B","C","D"],"correctOption":2,"explanation":"E3"}]'::jsonb),
  ('40000000-0000-0000-0000-000000000002', (select id from public.courses where slug = 'test-quiz-2'), true,
    '[{"id":"1","prompt":"P1","options":["A","B","C","D"],"correctOption":0,"explanation":"E"}]'::jsonb),
  ('40000000-0000-0000-0000-000000000003', (select id from public.courses where slug = 'test-quiz-3'), false,
    '[{"id":"1","prompt":"P1","options":["A","B","C","D"],"correctOption":0,"explanation":"E"}]'::jsonb);

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

-- Un usuario lee solo los quizzes activos y no escribe ninguno.
select is(
  (select count(*)::integer from public.quizzes
   where course_id in (select id from public.courses where slug like 'test-quiz-%')),
  2, 'a user sees only active quizzes'
);
select throws_ok(
  $$ insert into public.quizzes (course_id, questions)
     values ((select id from public.courses where slug = 'test-quiz-4'),
       '[{"id":"1","prompt":"P","options":["A","B","C","D"],"correctOption":0,"explanation":"E"}]'::jsonb) $$,
  '42501', null, 'a user cannot create a quiz'
);
with updated as (
  update public.quizzes set pass_percentage = 1
  where course_id in (select id from public.courses where slug like 'test-quiz-%')
  returning id
)
select is(count(*)::integer, 0, 'a user cannot edit a quiz') from updated;

-- Quiz aprobado (2 de 3 = 67 %): se corrige en la base y marca el paso como hecho.
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
  'done', 'passing the quiz marks the step as done'
);

-- Desaprobar no cambia el paso; aprobar después, sí.
select is(
  (public.submit_quiz_attempt('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','[1]'::jsonb,'UTC','50000000-0000-0000-0000-000000000002') ->> 'passed')::boolean,
  false, 'a wrong answer fails the quiz'
);
select is(
  (select status::text from public.path_steps where id = '30000000-0000-0000-0000-000000000002'),
  'pending', 'failing the quiz does not change the step'
);
select is(
  (public.submit_quiz_attempt('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','[0]'::jsonb,'UTC','50000000-0000-0000-0000-000000000003') ->> 'stepCompleted')::boolean,
  true, 'passing on a later attempt completes the step'
);

select throws_ok(
  $$ select public.submit_quiz_attempt('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003','[0]'::jsonb,'UTC','50000000-0000-0000-0000-000000000004') $$,
  '22023', 'Quiz no disponible', 'an inactive quiz cannot be submitted'
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

-- El admin ve los desactivados, crea y edita; nadie borra, un quiz se desactiva.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::integer from public.quizzes
   where course_id in (select id from public.courses where slug like 'test-quiz-%')),
  3, 'an admin also sees inactive quizzes'
);
select lives_ok(
  $$ insert into public.quizzes (course_id, questions)
     values ((select id from public.courses where slug = 'test-quiz-4'),
       '[{"id":"1","prompt":"P","options":["A","B","C","D"],"correctOption":0,"explanation":"E"}]'::jsonb) $$,
  'an admin can create a quiz'
);
with updated as (
  update public.quizzes set is_active = true
  where course_id = (select id from public.courses where slug = 'test-quiz-3')
  returning id
)
select is(count(*)::integer, 1, 'an admin can reactivate a quiz') from updated;
with deleted as (
  delete from public.quizzes
  where course_id = (select id from public.courses where slug = 'test-quiz-4')
  returning id
)
select is(count(*)::integer, 0, 'not even an admin deletes a quiz: it is deactivated') from deleted;

select * from finish();
rollback;
