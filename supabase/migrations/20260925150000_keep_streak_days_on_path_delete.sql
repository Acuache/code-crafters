-- SPEC 14: borrar una ruta ya no borra los días de racha que salieron de aprobar sus quizzes.
-- El día queda sin intento de origen, como los de record_step_activity.
alter table public.streak_activities
  drop constraint streak_activities_source_attempt_id_fkey,
  add constraint streak_activities_source_attempt_id_fkey
    foreign key (source_attempt_id) references public.quiz_attempts (id) on delete set null;
