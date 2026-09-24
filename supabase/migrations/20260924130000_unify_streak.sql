-- Une la racha de los quizzes (20260923120000_quizzes_progress_streak.sql) con el avance manual de
-- los pasos (spec 08): una sola historia, `streak_activities`, que suma un día por fecha local
-- cuando se aprueba un quiz o cuando un paso pasa a 'in_progress' / 'done'. Decisiones en
-- docs/decisiones/0005-quizzes-y-racha-unificados.md.

-- 1. Un día puede venir de un paso marcado a mano, sin intento de quiz detrás.
alter table public.streak_activities
  alter column source_attempt_id drop not null;

-- 2. La racha actual y la mejor se derivan al leer desde streak_activities
--    (lib/gamification/streak.ts). Guardadas se quedaban viejas: current_streak seguía en 5 una
--    semana después del último avance. `timezone` se queda: define "hoy" al leer. Borrar las
--    columnas arrastra los dos checks que las usan.
alter table public.profiles
  drop column current_streak,
  drop column best_streak,
  drop column last_activity_date;

-- 3. Única forma de registrar un día. Vive en `private` (no expuesto por la Data API) y solo la
--    llaman las dos funciones security definer de abajo, que ya verificaron al usuario. Una zona
--    desconocida cae a UTC. Devuelve true si el día es nuevo.
create function private.register_activity_day(
  p_user_id uuid,
  p_time_zone text,
  p_source_attempt_id uuid
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_time_zone text;
  v_inserted_rows integer;
begin
  select name into v_time_zone
  from pg_catalog.pg_timezone_names
  where name = p_time_zone
  limit 1;
  v_time_zone := coalesce(v_time_zone, 'UTC');

  insert into public.streak_activities (user_id, activity_date, timezone, source_attempt_id)
  values (
    p_user_id,
    (current_timestamp at time zone v_time_zone)::date,
    v_time_zone,
    p_source_attempt_id
  )
  on conflict (user_id, activity_date) do nothing;
  get diagnostics v_inserted_rows = row_count;

  -- La última zona usada define "hoy" cuando el servidor calcula la racha al leer.
  update public.profiles set timezone = v_time_zone where id = p_user_id;

  return v_inserted_rows = 1;
end;
$$;

revoke execute on function private.register_activity_day(uuid, text, uuid) from public, anon, authenticated;

-- 4. Avance manual (setStepStatus). security definer porque streak_activities no tiene política
--    de insert: la función exige un paso propio en avance. Riesgo aceptado: llamarla cada día
--    sobre un paso ya hecho sostiene la racha sin avanzar; solo se engaña a sí mismo.
create function public.record_step_activity(p_step_id uuid, p_time_zone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.path_steps
    join public.learning_paths on learning_paths.id = path_steps.path_id
    where path_steps.id = p_step_id
      and learning_paths.user_id = v_user_id
      and path_steps.status in ('in_progress', 'done')
  ) then
    raise exception 'Paso no disponible' using errcode = 'P0002';
  end if;

  perform private.register_activity_day(v_user_id, p_time_zone, null);
end;
$$;

revoke execute on function public.record_step_activity(uuid, text) from public, anon;
grant execute on function public.record_step_activity(uuid, text) to authenticated;

-- 5. Corrección por pregunta, para devolverla recién al entregar el intento (antes había una
--    action que respondía si una opción era correcta antes de entregar, y bastaba con probar las
--    cuatro). Una respuesta que no es número cuenta como incorrecta.
create function private.grade_quiz_answers(p_questions jsonb, p_answers jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'questionId', question.value ->> 'id',
        'selectedOption', answer.value,
        'correctOption', (question.value ->> 'correctOption')::integer,
        -- CASE y no AND: Postgres no garantiza cortocircuito, y castear un texto rompería.
        'correct', case
          when jsonb_typeof(answer.value) = 'number'
            then (answer.value #>> '{}')::numeric = (question.value ->> 'correctOption')::numeric
          else false
        end,
        'explanation', question.value ->> 'explanation'
      )
      order by question.position
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(p_questions) with ordinality as question(value, position)
  join jsonb_array_elements(p_answers) with ordinality as answer(value, position)
    using (position);
$$;

revoke execute on function private.grade_quiz_answers(jsonb, jsonb) from public, anon, authenticated;

-- 6. submit_quiz_attempt, con tres cambios sobre la versión original:
--    - sin bloqueo por orden: un curso se puede marcar "Hecho" a mano en cualquier orden, y el
--      quiz no puede ser más estricto que el toggle;
--    - devuelve la corrección por pregunta (`results`) y ya no la racha resumida, que se deriva;
--    - el día de racha sale de private.register_activity_day, igual que el avance manual.
drop function public.submit_quiz_attempt(uuid, uuid, uuid, jsonb, text, uuid);

create function public.submit_quiz_attempt(
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
      'stepCompleted', v_attempt.passed and v_quiz.kind = 'course',
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
    and status = 'ready'
    and course_id = v_step.course_id;

  if not found then
    raise exception 'Quiz no disponible' using errcode = '22023';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Las respuestas no son válidas' using errcode = '22023';
  end if;

  v_question_count := jsonb_array_length(v_quiz.questions);
  if v_question_count = 0 or jsonb_array_length(p_answers) <> v_question_count then
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

  if v_attempt.passed then
    v_streak_increased := private.register_activity_day(v_user_id, v_timezone, v_attempt.id);

    -- Aprobar el quiz del curso es la otra forma de marcarlo "Hecho" (la primera es el toggle).
    if v_quiz.kind = 'course' then
      update public.path_steps
      set status = 'done', completed_at = coalesce(completed_at, now())
      where id = p_path_step_id;
    end if;
  end if;

  return jsonb_build_object(
    'attemptId', v_attempt.id,
    'correctCount', v_attempt.correct_count,
    'scorePercentage', v_attempt.score_percentage,
    'passed', v_attempt.passed,
    'streakIncreased', v_streak_increased,
    'stepCompleted', v_attempt.passed and v_quiz.kind = 'course',
    'results', v_results
  );
end;
$$;

revoke execute on function public.submit_quiz_attempt(uuid, uuid, uuid, jsonb, text, uuid) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, uuid, uuid, jsonb, text, uuid) to authenticated;
