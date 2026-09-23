begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

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

select * from finish();
rollback;
