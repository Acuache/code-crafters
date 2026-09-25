# 0005: Quizzes con IA y una sola racha, integrados en la ruta del spec 12

- **Fecha:** 2026-09-24
- **Estado:** aceptada; la generación con IA y la práctica por capítulo las reemplaza el
  [ADR 0006](0006-quizzes-de-curso-escritos-por-el-admin.md) (quizzes escritos por el admin). La
  racha y la integración con el mapa siguen vigentes.

## Contexto

Ariel Tonato construyó en `develop` (13 commits del 2026-09-23, diseño en
`docs/superpowers/specs/2026-09-23-quizzes-progress-streak-design.md`) quizzes generados con IA por
curso y por capítulo, intentos guardados y una racha diaria. Partió de una base anterior a los specs
08, 11 y 12, así que además rehizo la pantalla `/paths/[id]` por su cuenta. Al unir las ramas había
dos pantallas para la misma ruta, dos proveedores de IA (OpenAI y OpenRouter), el spec de
gamificación (hoy el 14) que planeaba su propia tabla de racha (`activity_days`) y dos migraciones
que rompían una base nueva (`remote_schema.sql`, que borraba las tablas de quizzes, y una copia
idéntica de la migración original). Sin decidir, o se perdía el mapa del spec 12 o se perdían los quizzes.

## Opciones consideradas

1. **Pantalla de Ariel** (timeline + panel de detalle) — ya traía los quizzes; se perdían el mapa
   del spec 12, los toggles y el descarte del 08 y la personalización del 11 en esa pantalla.
2. **Pantalla de los specs 08/12 con los quizzes adentro** — conserva lo aprobado y lo del guion del
   video; los componentes de layout de Ariel quedan sin uso.
3. **Racha propia del spec de gamificación (`activity_days`) además de la de Ariel** — dos
   historias de la misma racha que pueden contradecirse.

## Qué dijo el abogado del diablo

No se corrió `/critique` para esta decisión: se tomó al integrar las ramas, comparando pieza por
pieza con el código de las dos.

## Decisión

Opción 2, y una sola racha: la de Ariel (`streak_activities`). En detalle:

- **Pantalla:** mapa y lista de los specs 08/12. Los quizzes se abren desde el modal de cada paso
  ("Rendir quiz del curso", "Practicar por capítulo") con el `QuizDialog` de Ariel. Su `StreakCard`
  va arriba de la ruta.
- **Completar un curso, dos formas:** el toggle "Hecho" o aprobar el quiz del curso (60 %). El
  toggle es lo que garantiza que la app funcione sin IA (`ENUNCIADO.md`).
- **Sin bloqueo por orden:** el quiz no puede ser más estricto que el toggle.
- **IA:** OpenAI con el mismo modelo que la personalización (`PERSONALIZATION_MODEL`); una sola
  key. Sale `@openrouter/ai-sdk-provider`.
- **Racha:** suma un día al aprobar un quiz o cuando un paso pasa a "En curso"/"Hecho"
  (`record_step_activity`). Se deriva al leer (`lib/gamification/streak.ts`), con "hoy o ayer"
  como racha viva; `profiles.current_streak/best_streak/last_activity_date` se borraron porque se
  quedaban viejas. `profiles.timezone` queda: define "hoy" al leer.
- **Sin corrección antes de entregar:** la action que decía si una opción era correcta permitía
  probar las cuatro. La corrección por pregunta llega con el resultado de `submit_quiz_attempt`.
- **Migraciones:** se borraron `20260923233116_remote_schema.sql` y
  `20260924000000_restore_quizzes_progress_streak.sql`; los cambios van en
  `20260924130000_unify_streak.sql`.

## Consecuencias

- Queda el trabajo de los dos: el mapa y la IA de la ruta, más los quizzes y la racha de Ariel.
  Sus componentes de layout (`path-experience`, `path-timeline`, `path-overview`, `course-detail`,
  `bonus-missions`) y `lib/paths/path-view.ts` / `lib/quizzes/score.ts` se retiraron por repetidos
  o sin uso.
- Los quizzes necesitan `SUPABASE_SECRET_KEY` además de `OPENAI_API_KEY` (la tabla `quizzes` no
  tiene políticas porque guarda las respuestas). Sin alguna de las dos, los botones no aparecen.
- El spec 14 (gamificación) deja de crear `activity_days` y usa esta racha.
- Los quizzes generados con IA los reemplaza el spec 13 (`course-quizzes`): los escribe el admin.
- El historial remoto de migraciones se reparó una vez a mano el 2026-09-24 con
  `supabase migration repair` (se quitaron las dos versiones borradas y se registraron las del
  spec 11).
- Revisar si los quizzes gastan más crédito de OpenAI del previsto: se generan una vez por curso o
  capítulo y se comparten, pero no tienen límite diario propio.
