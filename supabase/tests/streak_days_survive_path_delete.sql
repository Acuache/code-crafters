-- Borrar una ruta no borra días de racha (spec 14). Termina en rollback: no deja datos.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

select fk_ok(
  'public', 'streak_activities', 'source_attempt_id',
  'public', 'quiz_attempts', 'id',
  'a streak day may point to the attempt it came from'
);
select is(
  (select confdeltype::text from pg_catalog.pg_constraint
   where conname = 'streak_activities_source_attempt_id_fkey'),
  'n', 'deleting an attempt sets the streak day source to null'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'streak-owner@example.com', '', now(), '{}', '{}', now(), now());

insert into public.courses (slug, title, url, hours, lessons, difficulty, outcome) values
  ('test-streak-1', 'Curso test racha', 'https://example.com/test-streak-1', 1, 1, 'principiante', 'Test');

insert into public.learning_paths (id, user_id, title, goal)
values ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Ruta test racha', 'react-nest');

insert into public.path_steps (id, path_id, course_id, stage, position, origin, reason) values
  ('31000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-streak-1'), 1, 1, 'requerido', 'Primero');

insert into public.quizzes (id, course_id, is_active, questions) values
  ('41000000-0000-0000-0000-000000000001', (select id from public.courses where slug = 'test-streak-1'), true,
    '[{"id":"1","prompt":"P1","options":["A","B","C","D"],"correctOption":0,"explanation":"E"}]'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

-- Aprobar el quiz registra el día con el intento como origen.
select is(
  (public.submit_quiz_attempt('41000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','[0]'::jsonb,'UTC','51000000-0000-0000-0000-000000000001') ->> 'passed')::boolean,
  true, 'passing the quiz records a streak day'
);

-- El dueño borra la ruta: se van los intentos, el día queda.
delete from public.learning_paths where id = '21000000-0000-0000-0000-000000000001';

select is(
  (select count(*)::integer from public.streak_activities),
  1, 'deleting the path keeps the streak day'
);
select is(
  (select source_attempt_id from public.streak_activities),
  null, 'the kept day no longer points to the deleted attempt'
);

select * from finish();
rollback;
