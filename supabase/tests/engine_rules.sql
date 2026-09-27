-- Reglas del motor v2 (migración 20260927120000, spec 17). Termina en rollback: no deja datos.
-- Usa cursos propios (`test-rules-*`) para no depender del seed.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select has_table('public', 'course_prerequisites', 'prerequisites between courses exist');
select has_table('public', 'interest_courses', 'interest courses exist');
select col_is_pk(
  'public', 'course_prerequisites', array['course_id', 'prerequisite_course_id'],
  'a course names each prerequisite once'
);
select col_is_pk(
  'public', 'interest_courses', array['interest_slug', 'course_id'],
  'an interest names each course once'
);
select policies_are(
  'public', 'course_prerequisites',
  array[
    'course_prerequisites_select_public', 'course_prerequisites_insert_admin',
    'course_prerequisites_update_admin', 'course_prerequisites_delete_admin'
  ],
  'prerequisites are public to read and written only by admins'
);
select policies_are(
  'public', 'interest_courses',
  array[
    'interest_courses_select_public', 'interest_courses_insert_admin',
    'interest_courses_update_admin', 'interest_courses_delete_admin'
  ],
  'interest courses are public to read and written only by admins'
);
select is(
  (select level::text from public.program_courses pc
   join public.programs p on p.id = pc.program_id
   join public.courses c on c.id = pc.course_id
   where p.slug = 'fundamentos' and c.slug = 'git-github-control-versiones-desde-cero'),
  'recomendado', 'git is recommended in the beginner base'
);
select is(
  (select level::text from public.program_courses pc
   join public.programs p on p.id = pc.program_id
   join public.courses c on c.id = pc.course_id
   where p.slug = 'fundamentos' and c.slug = 'solid-clean-code'),
  'opcional', 'solid is optional in the beginner base'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '13000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rules-user@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '13000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'rules-admin@example.com', '', now(), '{}', '{}', now(), now());

update public.profiles set role = 'admin' where id = '13000000-0000-0000-0000-000000000002';

insert into public.courses (slug, title, url, hours, lessons, difficulty, outcome) values
  ('test-rules-1', 'Curso reglas 1', 'https://example.com/test-rules-1', 2, 1, 'principiante', 'Test'),
  ('test-rules-2', 'Curso reglas 2', 'https://example.com/test-rules-2', 3, 1, 'intermedio', 'Test');

insert into public.course_prerequisites (course_id, prerequisite_course_id, kind)
select c.id, p.id, 'necesita'
from public.courses c, public.courses p
where c.slug = 'test-rules-2' and p.slug = 'test-rules-1';

insert into public.interest_courses (interest_slug, course_id, position)
select 'interes-de-prueba', id, 1 from public.courses where slug = 'test-rules-1';

select throws_ok(
  $$ insert into public.course_prerequisites (course_id, prerequisite_course_id, kind)
     select id, id, 'conviene' from public.courses where slug = 'test-rules-1' $$,
  '23514', null, 'a course cannot need itself'
);
select throws_ok(
  $$ insert into public.interest_courses (interest_slug, course_id, position)
     select 'Interés Raro', id, 2 from public.courses where slug = 'test-rules-2' $$,
  '23514', null, 'an interest slug is kebab-case'
);

-- anon lee las reglas, no las escribe.
set local role anon;

select is(
  (select count(*)::integer from public.course_prerequisites
   where course_id = (select id from public.courses where slug = 'test-rules-2')),
  1, 'anon reads prerequisites'
);
select is(
  (select count(*)::integer from public.interest_courses where interest_slug = 'interes-de-prueba'),
  1, 'anon reads interest courses'
);
select throws_ok(
  $$ insert into public.interest_courses (interest_slug, course_id, position)
     select 'interes-de-prueba', id, 2 from public.courses where slug = 'test-rules-2' $$,
  '42501', null, 'anon cannot write interest courses'
);

-- Un usuario común tampoco escribe: la RLS filtra el delete y rechaza el insert.
set local role authenticated;
select set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$ insert into public.course_prerequisites (course_id, prerequisite_course_id, kind)
     select c.id, p.id, 'conviene' from public.courses c, public.courses p
     where c.slug = 'test-rules-1' and p.slug = 'test-rules-2' $$,
  '42501', null, 'a regular user cannot add a prerequisite'
);
with deleted as (
  delete from public.course_prerequisites
  where course_id = (select id from public.courses where slug = 'test-rules-2')
  returning course_id
)
select is(count(*)::integer, 0, 'a regular user cannot remove a prerequisite') from deleted;

-- El admin agrega, reordena y quita.
select set_config('request.jwt.claim.sub', '13000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $$ insert into public.interest_courses (interest_slug, course_id, position)
     select 'interes-de-prueba', id, 2 from public.courses where slug = 'test-rules-2' $$,
  'an admin can add a course to an interest'
);
with updated as (
  update public.interest_courses set position = 3
  where interest_slug = 'interes-de-prueba'
    and course_id = (select id from public.courses where slug = 'test-rules-1')
  returning course_id
)
select is(count(*)::integer, 1, 'an admin can reorder an interest') from updated;
with deleted as (
  delete from public.course_prerequisites
  where course_id = (select id from public.courses where slug = 'test-rules-2')
  returning course_id
)
select is(count(*)::integer, 1, 'an admin can remove a prerequisite') from deleted;

select * from finish();
rollback;
