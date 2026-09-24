begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select has_table('public', 'quizzes', 'shared quizzes table exists');
select has_table('public', 'quiz_attempts', 'private quiz attempts table exists');
select has_table('public', 'streak_activities', 'daily streak activity table exists');
select has_function(
  'public',
  'submit_quiz_attempt',
  array['uuid', 'uuid', 'uuid', 'jsonb', 'text', 'uuid'],
  'atomic quiz submission RPC exists'
);
select col_is_pk('public', 'quizzes', 'id', 'quizzes has a primary key');
select col_is_fk('public', 'quiz_attempts', 'quiz_id', 'attempt references its quiz');
select col_is_fk('public', 'streak_activities', 'source_attempt_id', 'activity references its attempt');
select policies_are(
  'public',
  'quiz_attempts',
  array['quiz_attempts_select_owner'],
  'attempts expose only an owner-select policy'
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
  '[{"id":"1","prompt":"P1","options":["A","B","C","D"],"correctOption":0,"explanation":"E"},{"id":"2","prompt":"P2","options":["A","B","C","D"],"correctOption":1,"explanation":"E"},{"id":"3","prompt":"P3","options":["A","B","C","D"],"correctOption":2,"explanation":"E"}]'::jsonb, 'test'
from public.path_steps where id = '30000000-0000-0000-0000-000000000001';
insert into public.quizzes (id, course_id, kind, target_key, status, title, questions, model)
select '40000000-0000-0000-0000-000000000002', course_id, 'course', 'course:test-locked', 'ready', 'Curso test',
  '[{"id":"1","prompt":"P1","options":["A","B","C","D"],"correctOption":0,"explanation":"E"}]'::jsonb, 'test'
from public.path_steps where id = '30000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ select public.submit_quiz_attempt('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','[0,1,2]'::jsonb,'Invalid/Zone','50000000-0000-0000-0000-000000000001') $$,
  'chapter pass accepts an invalid zone through the UTC fallback'
);
select is((select timezone from public.quiz_attempts where idempotency_key = '50000000-0000-0000-0000-000000000001'), 'UTC', 'invalid timezone is stored as UTC');
select is((select status::text from public.path_steps where id = '30000000-0000-0000-0000-000000000001'), 'pending', 'chapter pass does not complete its course step');
select is((select count(*)::integer from public.streak_activities where user_id = '10000000-0000-0000-0000-000000000001'), 1, 'a passed quiz creates one daily activity');

select public.submit_quiz_attempt('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','[0,1,2]'::jsonb,'UTC','50000000-0000-0000-0000-000000000001');
select is((select count(*)::integer from public.quiz_attempts where user_id = '10000000-0000-0000-0000-000000000001'), 1, 'duplicate idempotency key returns without another attempt');

select throws_ok(
  $$ select public.submit_quiz_attempt('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','[0]'::jsonb,'UTC','50000000-0000-0000-0000-000000000002') $$,
  '42501', 'Completa el paso anterior', 'a locked main step cannot be submitted'
);

select * from finish();
rollback;
