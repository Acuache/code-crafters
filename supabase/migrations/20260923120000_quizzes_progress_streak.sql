create type public.quiz_kind as enum ('course', 'chapter');
create type public.quiz_generation_status as enum ('generating', 'ready', 'failed');

alter table public.profiles
  add column timezone text not null default 'UTC',
  add column current_streak integer not null default 0 check (current_streak >= 0),
  add column best_streak integer not null default 0 check (best_streak >= current_streak),
  add column last_activity_date date;

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id bigint not null references public.courses (id) on delete cascade,
  kind public.quiz_kind not null,
  chapter_title text,
  target_key text not null,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  status public.quiz_generation_status not null default 'generating',
  title text not null,
  pass_percentage smallint not null default 60 check (pass_percentage between 1 and 100),
  questions jsonb,
  model text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'course' and chapter_title is null) or (kind = 'chapter' and chapter_title is not null)),
  check (questions is null or jsonb_typeof(questions) = 'array'),
  check (
    (status = 'ready' and questions is not null and model is not null and failure_message is null)
    or (status = 'generating' and questions is null and failure_message is null)
    or (status = 'failed' and questions is null and failure_message is not null)
  )
);

create unique index quizzes_one_active_target_idx
  on public.quizzes (target_key)
  where is_active;
create index quizzes_course_id_idx on public.quizzes (course_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete restrict,
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  path_step_id uuid not null references public.path_steps (id) on delete cascade,
  idempotency_key uuid not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  correct_count smallint not null check (correct_count >= 0),
  score_percentage smallint not null check (score_percentage between 0 and 100),
  pass_percentage smallint not null check (pass_percentage between 1 and 100),
  passed boolean not null,
  timezone text not null,
  activity_date date not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index quiz_attempts_quiz_id_idx on public.quiz_attempts (quiz_id);
create index quiz_attempts_path_id_idx on public.quiz_attempts (path_id);
create index quiz_attempts_path_step_id_idx on public.quiz_attempts (path_step_id);

create table public.streak_activities (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  timezone text not null,
  source_attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, activity_date),
  unique (source_attempt_id)
);

create index streak_activities_user_date_idx
  on public.streak_activities (user_id, activity_date desc);

alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.streak_activities enable row level security;

create policy "quiz_attempts_select_owner"
  on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "streak_activities_select_owner"
  on public.streak_activities for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_path_id uuid,
  p_path_step_id uuid,
  p_answers jsonb,
  p_timezone text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_quiz public.quizzes%rowtype;
  v_step public.path_steps%rowtype;
  v_existing public.quiz_attempts%rowtype;
  v_attempt public.quiz_attempts%rowtype;
  v_timezone text;
  v_activity_date date;
  v_question_count integer;
  v_answer_count integer;
  v_correct_count integer;
  v_score integer;
  v_streak_inserted integer := 0;
  v_current_streak integer;
  v_best_streak integer;
  v_last_activity date;
  v_next_step_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into v_existing
  from public.quiz_attempts
  where user_id = v_user_id and idempotency_key = p_idempotency_key;

  if found then
    select current_streak, best_streak into v_current_streak, v_best_streak
    from public.profiles where id = v_user_id;
    return jsonb_build_object(
      'attemptId', v_existing.id,
      'correctCount', v_existing.correct_count,
      'scorePercentage', v_existing.score_percentage,
      'passed', v_existing.passed,
      'streakCurrent', coalesce(v_current_streak, 0),
      'streakBest', coalesce(v_best_streak, 0),
      'streakIncreased', false,
      'stepCompleted', v_existing.passed and exists (
        select 1 from public.quizzes q where q.id = v_existing.quiz_id and q.kind = 'course'
      ),
      'nextStepId', null
    );
  end if;

  select ps.* into v_step
  from public.path_steps ps
  join public.learning_paths lp on lp.id = ps.path_id
  where ps.id = p_path_step_id and ps.path_id = p_path_id and lp.user_id = v_user_id;
  if not found or v_step.status = 'discarded' then
    raise exception 'Paso no disponible' using errcode = '42501';
  end if;

  select * into v_quiz from public.quizzes
  where id = p_quiz_id and is_active and status = 'ready' and course_id = v_step.course_id;
  if not found then
    raise exception 'Quiz no disponible' using errcode = '22023';
  end if;

  if v_quiz.kind = 'course' and v_step.origin <> 'opcional' and exists (
    select 1 from public.path_steps previous
    where previous.path_id = p_path_id
      and previous.origin <> 'opcional'
      and previous.status not in ('done', 'discarded')
      and (previous.stage, previous.position) < (v_step.stage, v_step.position)
  ) then
    raise exception 'Completa el paso anterior' using errcode = '42501';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Las respuestas no son válidas' using errcode = '22023';
  end if;
  v_question_count := jsonb_array_length(v_quiz.questions);
  v_answer_count := jsonb_array_length(p_answers);
  if v_question_count = 0 or v_answer_count <> v_question_count then
    raise exception 'La cantidad de respuestas no coincide con el quiz' using errcode = '22023';
  end if;

  select count(*)::integer into v_correct_count
  from jsonb_array_elements(v_quiz.questions) with ordinality as question(value, position)
  join jsonb_array_elements(p_answers) with ordinality as answer(value, position)
    using (position)
  where jsonb_typeof(answer.value) = 'number'
    and (answer.value #>> '{}')::integer = (question.value ->> 'correctOption')::integer;

  v_score := round((v_correct_count::numeric / v_question_count::numeric) * 100)::integer;
  select name into v_timezone from pg_catalog.pg_timezone_names where name = p_timezone limit 1;
  v_timezone := coalesce(v_timezone, 'UTC');
  v_activity_date := (current_timestamp at time zone v_timezone)::date;

  insert into public.quiz_attempts (
    user_id, quiz_id, path_id, path_step_id, idempotency_key, answers,
    correct_count, score_percentage, pass_percentage, passed, timezone, activity_date
  ) values (
    v_user_id, p_quiz_id, p_path_id, p_path_step_id, p_idempotency_key, p_answers,
    v_correct_count, v_score, v_quiz.pass_percentage, v_score >= v_quiz.pass_percentage,
    v_timezone, v_activity_date
  ) returning * into v_attempt;

  if v_attempt.passed then
    insert into public.streak_activities (user_id, activity_date, timezone, source_attempt_id)
    values (v_user_id, v_activity_date, v_timezone, v_attempt.id)
    on conflict (user_id, activity_date) do nothing;
    get diagnostics v_streak_inserted = row_count;

    if v_streak_inserted = 1 then
      select current_streak, best_streak, last_activity_date
      into v_current_streak, v_best_streak, v_last_activity
      from public.profiles where id = v_user_id for update;

      v_current_streak := case
        when v_last_activity = v_activity_date - 1 then v_current_streak + 1
        else 1
      end;
      v_best_streak := greatest(v_best_streak, v_current_streak);
      update public.profiles set
        timezone = v_timezone,
        current_streak = v_current_streak,
        best_streak = v_best_streak,
        last_activity_date = v_activity_date
      where id = v_user_id;
    end if;

    if v_quiz.kind = 'course' then
      update public.path_steps set status = 'done', completed_at = coalesce(completed_at, now())
      where id = p_path_step_id;
    end if;
  end if;

  select current_streak, best_streak into v_current_streak, v_best_streak
  from public.profiles where id = v_user_id;
  select ps.id into v_next_step_id from public.path_steps ps
  where ps.path_id = p_path_id and ps.origin <> 'opcional'
    and ps.status not in ('done', 'discarded')
  order by ps.stage, ps.position limit 1;

  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'correctCount', v_attempt.correct_count,
    'scorePercentage', v_attempt.score_percentage,
    'passed', v_attempt.passed,
    'streakCurrent', coalesce(v_current_streak, 0),
    'streakBest', coalesce(v_best_streak, 0),
    'streakIncreased', v_streak_inserted = 1,
    'stepCompleted', v_attempt.passed and v_quiz.kind = 'course',
    'nextStepId', v_next_step_id
  );
end;
$$;

revoke all on function public.submit_quiz_attempt(uuid, uuid, uuid, jsonb, text, uuid) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, uuid, uuid, jsonb, text, uuid) to authenticated;
