SET local check_function_bodies = off;

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_check";

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_current_streak_check";

ALTER TABLE "public"."quiz_attempts"
  DROP CONSTRAINT "quiz_attempts_path_id_fkey";

ALTER TABLE "public"."quiz_attempts"
  DROP CONSTRAINT "quiz_attempts_path_step_id_fkey";

ALTER TABLE "public"."quiz_attempts"
  DROP CONSTRAINT "quiz_attempts_quiz_id_fkey";

ALTER TABLE "public"."quiz_attempts"
  DROP CONSTRAINT "quiz_attempts_user_id_fkey";

ALTER TABLE "public"."quizzes"
  DROP CONSTRAINT "quizzes_course_id_fkey";

ALTER TABLE "public"."streak_activities"
  DROP CONSTRAINT "streak_activities_source_attempt_id_fkey";

ALTER TABLE "public"."streak_activities"
  DROP CONSTRAINT "streak_activities_user_id_fkey";

DROP FUNCTION "public"."submit_quiz_attempt"(uuid, uuid, uuid, jsonb, text, uuid);

ALTER TABLE "public"."profiles"
  DROP COLUMN "best_streak";

ALTER TABLE "public"."profiles"
  DROP COLUMN "current_streak";

ALTER TABLE "public"."profiles"
  DROP COLUMN "last_activity_date";

ALTER TABLE "public"."profiles"
  DROP COLUMN "timezone";

DROP TABLE "public"."quiz_attempts";

DROP TABLE "public"."quizzes";

DROP TYPE "public"."quiz_generation_status";

DROP TYPE "public"."quiz_kind";

DROP TABLE "public"."streak_activities";

CREATE TABLE "public"."ai_personalizations" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "path_id"    uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ai_personalizations_pkey" PRIMARY KEY (id),
  "user_id"    uuid                     NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."ai_personalizations"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."learning_paths"
  ADD COLUMN "ai_title" text;

ALTER TABLE "public"."learning_paths"
  ADD COLUMN "ai_summary" text;

ALTER TABLE "public"."learning_paths"
  ADD COLUMN "personalized_at" timestamp WITH time zone;

ALTER TABLE "public"."learning_paths"
  ADD COLUMN "ai_adjustments" jsonb;

ALTER TABLE "public"."path_steps"
  ADD COLUMN "ai_reason" text;

CREATE OR REPLACE FUNCTION public.apply_ai_personalization (
  p_path_id uuid,
  p_title   text,
  p_summary text,
  p_reasons jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  update public.learning_paths
  set ai_title = p_title,
      ai_summary = p_summary,
      personalized_at = now()
  where id = p_path_id;

  -- Ruta ajena (la RLS la oculta) o inexistente: se aborta sin tocar path_steps.
  if not found then
    raise exception 'learning_path % no existe o no pertenece al usuario', p_path_id
      using errcode = 'P0002';
  end if;

  update public.path_steps
  set ai_reason = reasons.reason
  from jsonb_to_recordset(p_reasons) as reasons ("courseSlug" text, reason text)
  join public.courses on courses.slug = reasons."courseSlug"
  where path_steps.path_id = p_path_id
    and path_steps.course_id = courses.id
    and path_steps.status <> 'discarded';
end;
$function$;

ALTER TABLE "public"."ai_personalizations"
  ADD CONSTRAINT "ai_personalizations_path_id_fkey" FOREIGN KEY (path_id) REFERENCES public.learning_paths(id) ON DELETE SET NULL;

CREATE INDEX ai_personalizations_path_id_idx ON public.ai_personalizations USING btree (path_id);

REVOKE ALL ON FUNCTION "public"."apply_ai_personalization"(uuid, text, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."apply_ai_personalization"(uuid, text, text, jsonb) TO "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_personalizations" TO "anon", "authenticated", "postgres", "service_role";

ALTER TABLE "public"."ai_personalizations"
  ADD CONSTRAINT "ai_personalizations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX ai_personalizations_user_id_created_at_idx ON public.ai_personalizations USING btree (user_id, created_at);

CREATE POLICY "ai_personalizations_insert_owner" ON "public"."ai_personalizations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "ai_personalizations_select_owner" ON "public"."ai_personalizations"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

