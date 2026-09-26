-- SPEC 11 (specs/11-ai-personalization.md) — paso 9 del plan de implementación.
-- Qué cambió la IA en las respuestas del cuestionario (meta, intereses, tecnologías dominadas)
-- antes de que el motor armara la ruta, a partir del texto libre del usuario. Forma:
-- { goal: {from,to} | null, addedInterests, removedInterests, addedMastered, removedMastered,
--   explanation } (AppliedAdjustment en lib/ai/profile-adjustment.ts).
-- null = no hubo ajuste: sin key, sin texto libre, sin usos del día, la llamada falló o la IA no
-- cambió nada. Las respuestas originales siguen intactas en assessments.answers.
-- La RLS de learning_paths (spec 02, learning_paths_all_owner) ya cubre la columna nueva.
alter table public.learning_paths add column ai_adjustments jsonb;
