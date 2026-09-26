-- SPEC 13 (specs/13-course-quizzes.md): un quiz por curso, escrito por el admin desde /admin en vez
-- de generado con IA. Decisiones en docs/decisiones/0006-quizzes-de-curso-escritos-por-el-admin.md.

-- 1. Datos de prueba de la etapa con IA: se borran. Borrar los intentos arrastra los días de racha
--    que salieron de ellos (streak_activities.source_attempt_id on delete cascade).
delete from public.quiz_attempts;
delete from public.quizzes;

-- 2. Un quiz por curso. Sale todo lo que existía para generar con IA y para los capítulos; los dos
--    checks sin nombre que cruzaban esas columnas (quizzes_check, quizzes_check1) caen con ellas.
drop index public.quizzes_one_active_target_idx;

alter table public.quizzes
  drop column kind,
  drop column chapter_title,
  drop column target_key,
  drop column version,
  drop column status,
  drop column model,
  drop column failure_message,
  drop column title,
  add constraint quizzes_course_id_key unique (course_id),
  alter column questions set not null,
  add constraint quizzes_questions_not_empty check (jsonb_array_length(questions) >= 1);

drop type public.quiz_kind;
drop type public.quiz_generation_status;

-- quizzes_course_id_idx sobra: el unique ya indexa course_id.
drop index public.quizzes_course_id_idx;

-- 3. RLS. Leer: cualquier usuario autenticado, solo quizzes activos; las respuestas viajan al
--    navegador a propósito, para el feedback al instante (el quiz no da nada que no dé el toggle
--    "Hecho"). Escribir: solo admin, como el catálogo (spec 02). Sin política de delete: un quiz se
--    desactiva, porque los intentos lo referencian con `on delete restrict`.
create policy "quizzes_select_active"
  on public.quizzes
  for select
  to authenticated
  using (is_active or (select private.is_admin()));

create policy "quizzes_insert_admin"
  on public.quizzes
  for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "quizzes_update_admin"
  on public.quizzes
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- 4. submit_quiz_attempt, sin `kind` ni `status`: exige un quiz activo y aprobar siempre completa el
--    paso, porque todo quiz es de curso. La idempotencia, la corrección por pregunta y la racha
--    quedan como en 20260924130000_unify_streak.sql. `create or replace` conserva los grants.
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
  v_user_id uuid := (select auth.uid());
  v_quiz public.quizzes%rowtype;
  v_step public.path_steps%rowtype;
  v_attempt public.quiz_attempts%rowtype;
  v_results jsonb;
  v_timezone text;
  v_question_count integer;
  v_correct_count integer;
  v_score integer;
  v_streak_increased boolean := false;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  -- Reenvío del mismo intento (doble click, reintento de red): devuelve lo ya guardado.
  select * into v_attempt
  from public.quiz_attempts
  where user_id = v_user_id and idempotency_key = p_idempotency_key;

  if found then
    select * into v_quiz from public.quizzes where id = v_attempt.quiz_id;
    return jsonb_build_object(
      'attemptId', v_attempt.id,
      'correctCount', v_attempt.correct_count,
      'scorePercentage', v_attempt.score_percentage,
      'passed', v_attempt.passed,
      'streakIncreased', false,
      'stepCompleted', v_attempt.passed,
      'results', private.grade_quiz_answers(v_quiz.questions, v_attempt.answers)
    );
  end if;

  select path_steps.* into v_step
  from public.path_steps
  join public.learning_paths on learning_paths.id = path_steps.path_id
  where path_steps.id = p_path_step_id
    and path_steps.path_id = p_path_id
    and learning_paths.user_id = v_user_id;

  if not found or v_step.status = 'discarded' then
    raise exception 'Paso no disponible' using errcode = '42501';
  end if;

  select * into v_quiz
  from public.quizzes
  where id = p_quiz_id
    and is_active
    and course_id = v_step.course_id;

  if not found then
    raise exception 'Quiz no disponible' using errcode = '22023';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Las respuestas no son válidas' using errcode = '22023';
  end if;

  v_question_count := jsonb_array_length(v_quiz.questions);
  if jsonb_array_length(p_answers) <> v_question_count then
    raise exception 'La cantidad de respuestas no coincide con el quiz' using errcode = '22023';
  end if;

  v_results := private.grade_quiz_answers(v_quiz.questions, p_answers);
  select count(*)::integer into v_correct_count
  from jsonb_array_elements(v_results) as result(value)
  where (result.value ->> 'correct')::boolean;
  v_score := round((v_correct_count::numeric / v_question_count::numeric) * 100)::integer;

  select name into v_timezone
  from pg_catalog.pg_timezone_names
  where name = p_timezone
  limit 1;
  v_timezone := coalesce(v_timezone, 'UTC');

  insert into public.quiz_attempts (
    user_id, quiz_id, path_id, path_step_id, idempotency_key, answers,
    correct_count, score_percentage, pass_percentage, passed, timezone, activity_date
  ) values (
    v_user_id, p_quiz_id, p_path_id, p_path_step_id, p_idempotency_key, p_answers,
    v_correct_count, v_score, v_quiz.pass_percentage, v_score >= v_quiz.pass_percentage,
    v_timezone, (current_timestamp at time zone v_timezone)::date
  ) returning * into v_attempt;

  -- Aprobar el quiz es la otra forma de marcar el curso "Hecho" (la primera es el toggle).
  if v_attempt.passed then
    v_streak_increased := private.register_activity_day(v_user_id, v_timezone, v_attempt.id);

    update public.path_steps
    set status = 'done', completed_at = coalesce(completed_at, now())
    where id = p_path_step_id;
  end if;

  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'correctCount', v_attempt.correct_count,
    'scorePercentage', v_attempt.score_percentage,
    'passed', v_attempt.passed,
    'streakIncreased', v_streak_increased,
    'stepCompleted', v_attempt.passed,
    'results', v_results
  );
end;
$$;
