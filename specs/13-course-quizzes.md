# SPEC 13 — Quizzes de curso escritos por el admin, sin IA

> **Estado:** Borrador
> **Depende de:** SPEC 02, SPEC 08, SPEC 10, SPEC 12, ADR 0005
> **Fecha:** 2026-09-24
> **Objetivo:** Reemplazar los quizzes generados con IA por un quiz por curso que el admin escribe y
> edita desde `/admin`, con 3 preguntas de ejemplo para cada uno de los 74 cursos, feedback al
> instante y el mismo "aprobar = Hecho" y racha que ya existen.

## Por qué existe este spec

El ADR 0005 integró los quizzes de Ariel: se generan con OpenAI la primera vez que alguien abre el
quiz de un curso o de un capítulo. Al probarlo aparecieron tres problemas:

- **Tarda.** El primer usuario de cada curso espera entre 15 y 45 s ("Preparando tu quiz…"). En la
  demo del concurso, ese primero es el jurado.
- **La IA no conoce el curso.** Solo ve lo que hay en `data/courses.json`: título, resumen, temas y
  los *títulos* de los capítulos. Pregunta cosas genéricas del tema, puede inventar, y nadie revisa
  lo que se publica.
- **La práctica por capítulo sobra.** DevTalles ya tiene evaluaciones en varias secciones, y con
  solo el título de un capítulo las preguntas son casi adivinanzas.

Además, generar los quizzes obliga a tener `SUPABASE_SECRET_KEY`: una variable de entorno más para
quien clone el repo, y `ENUNCIADO.md` descalifica un proyecto que no funcione al clonarlo.

La idea de Ariel se conserva: un quiz por curso, aprobarlo marca el paso como "Hecho", los intentos
se guardan y suman a la racha. Cambia de dónde salen las preguntas: las escribe el admin, igual que
carga los cursos en el spec 10. Así el contenido escala con el catálogo sin tocar código.

Va antes de la gamificación (spec 14), que depende de él. La renumeración que lo hizo lugar
(gamificación 13 → 14, `path-sharing` 14 → 15, `path-recalculation` 15 → 16) ya se hizo al escribir
este spec, en `docs/SPECS-MAP.md`, `CLAUDE.md`, los ADR y los specs.

**Dependencias, una por motivo distinto:**

- **SPEC 02**: `courses`, `path_steps` y `private.is_admin()` (la misma escritura solo-admin del
  catálogo).
- **SPEC 08**: `components/paths/step-row.tsx`, la vista de lista, que recibe el botón del quiz.
- **SPEC 10**: el panel `/admin`, `requireAdmin()`, la edición de curso
  (`app/(admin)/admin/courses/[slug]/page.tsx`), la lista de cursos y el patrón de formularios con
  `react-hook-form` + zod de `components/admin/*`.
- **SPEC 12**: `components/paths/step-detail-dialog.tsx`, el modal del mapa, que ya tiene la sección
  de quiz.
- **ADR 0005**: las tablas `quizzes`, `quiz_attempts`, `streak_activities`, el RPC
  `submit_quiz_attempt`, `components/quizzes/*` y la racha. Este spec las simplifica, no las
  reemplaza.

## Alcance

**Entra:**

- **Migración** `supabase/migrations/<timestamp>_course_quizzes.sql` (ver Modelo de datos):
  simplifica `quizzes` a un quiz por curso, le agrega RLS de lectura y de escritura solo-admin, y
  ajusta `submit_quiz_attempt`.
- **Seed**:
  - `data/quizzes.json` con 3 preguntas por cada uno de los 74 cursos. Las redacta el agente a
    partir de `summary`, `topics` y `outcomes` de `data/courses.json`, y el equipo las revisa antes
    de aprobar el paso.
  - `supabase/migrations/<timestamp>_seed_course_quizzes.sql`, con ese JSON embebido y generado una
    sola vez, igual que `20260920223655_seed_courses.sql`.
- **Borrar la generación con IA**:
  - `lib/quizzes/generate.ts`, `lib/quizzes/repository.ts`, `lib/supabase/admin.ts` y sus tests.
  - `requestQuiz` en `app/(app)/paths/[id]/actions.ts`.
  - `SUPABASE_SECRET_KEY` de `.env.example` y del README.
- `lib/quizzes/schema.ts` reescrito: el schema de una pregunta y el del formulario del admin (ver
  Modelo de datos).
- **Ruta del usuario**:
  - `app/(app)/paths/[id]/page.tsx` carga los quizzes activos de los cursos de la ruta en la misma
    carga de la página, así el quiz se abre al instante, sin action.
  - El botón "Rendir quiz del curso" aparece solo si el curso tiene quiz activo: en el modal del
    mapa (`step-detail-dialog.tsx`) y en la fila de la lista (`step-row.tsx`).
- **Diálogo del quiz** (`components/quizzes/quiz-dialog.tsx`, `quiz-question.tsx`,
  `quiz-result.tsx`):
  - Al elegir una opción queda fija, se marca correcta o incorrecta y aparece la explicación.
  - "Siguiente" pasa a la pregunta que sigue, y la última pregunta termina en "Entregar".
  - El resultado muestra el puntaje, si aprobó, si el curso quedó hecho y si sumó a la racha.
- **Panel del admin**:
  - Página `app/(admin)/admin/courses/[slug]/quiz/page.tsx` con `components/admin/quiz-form.tsx`:
    agregar, editar, reordenar y borrar preguntas (mínimo 1, máximo 20), porcentaje para aprobar
    (default 60), activo sí/no.
  - Actions `saveCourseQuiz` y `setCourseQuizActive` en `app/(admin)/admin/courses/actions.ts`.
  - Link "Quiz" desde la edición del curso y columna "Quiz" en la lista de cursos (activo,
    inactivo o sin quiz).
- `lib/supabase/database.types.ts` regenerado.
- **Documentación**: ADR 0006 "Quizzes de curso escritos por el admin" (reemplaza la parte de IA
  del ADR 0005), README, `.env.example`, `CLAUDE.md` (variables de entorno) y `docs/SPECS-MAP.md`.

**Qué NO entra (queda para otros specs o fuera):**

- XP, niveles, insignias y la celebración con confetti: los hace el spec 14 (`gamification`) sobre
  este.
- Generar preguntas con IA desde el panel ("sugerir preguntas"): quedaría para otro spec si hace
  falta.
- Quizzes por capítulo.
- Banco de preguntas, orden aleatorio o un subconjunto distinto por intento.
- Historial de intentos del usuario o estadísticas del quiz para el admin.
- Borrar un quiz: se desactiva. Los intentos guardados lo referencian (`on delete restrict`).
- Cambios a la racha (ADR 0005).

## Modelo de datos

### Migración `<timestamp>_course_quizzes.sql`

```sql
-- 1. Datos de prueba de la etapa con IA: se borran. Borrar los intentos arrastra los días de racha
--    que salieron de ellos (streak_activities.source_attempt_id on delete cascade).
delete from public.quiz_attempts;
delete from public.quizzes;

-- 2. Un quiz por curso. Sale todo lo que existía para generar con IA y para los capítulos.
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
--    navegador a propósito (ver Decisiones). Escribir: solo admin, como el catálogo (spec 02).
create policy "quizzes_select_active" on public.quizzes
  for select to authenticated using (is_active or (select private.is_admin()));
create policy "quizzes_insert_admin" on public.quizzes
  for insert to authenticated with check ((select private.is_admin()));
create policy "quizzes_update_admin" on public.quizzes
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- 4. submit_quiz_attempt: sin `kind` ni `status`. Exige is_active; aprobar siempre completa el paso
--    (todo quiz es de curso). El resto (idempotencia, corrección por pregunta, racha) igual.
```

Filas: `quizzes (id, course_id unique, is_active, pass_percentage, questions, created_at,
updated_at)`. `updated_at` lo pone la action al guardar, no un trigger.

### Una pregunta (`questions` jsonb, `lib/quizzes/schema.ts`)

```ts
export const quizQuestionSchema = z.object({
  id: z.string().min(1).max(100), // estable al editar; la action pone crypto.randomUUID() a las nuevas
  prompt: z.string().trim().min(1).max(500),
  options: z
    .tuple([option, option, option, option]) // option = z.string().trim().min(1).max(240)
    .refine((options) => new Set(options).size === 4, "Las cuatro opciones deben ser distintas."),
  correctOption: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(500),
});

export const courseQuizFormSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1).max(20),
  passPercentage: z.number().int().min(1).max(100), // default 60
  isActive: z.boolean(),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type CourseQuiz = { id: string; courseId: number; passPercentage: number; questions: QuizQuestion[] };
```

### `data/quizzes.json`

```json
[
  {
    "courseSlug": "git-github-control-versiones-desde-cero",
    "questions": [
      {
        "id": "1",
        "prompt": "¿Qué comando guarda los cambios preparados en el historial de Git?",
        "options": ["git add", "git commit", "git push", "git status"],
        "correctOption": 1,
        "explanation": "git commit crea una instantánea con lo que está en el área de preparación."
      }
    ]
  }
]
```

Las 74 entradas son **sencillas**: conceptos básicos que dice el propio `summary`/`topics`/`outcomes`
del curso, nunca detalles de una clase concreta. Pass percentage 60 e `is_active = true` por
defecto en el seed.

### `PathStepView` (spec 08) y la carga de la página

`PathStepView` pierde `courseChapters` y suma `quiz: CourseQuiz | null`. `page.tsx` hace una query más:
`quizzes` con `course_id in (cursos de la ruta)` (la RLS ya filtra a los activos).

## Plan de implementación

1. **Migración del esquema.**
   - `<timestamp>_course_quizzes.sql`, escrita con la skill `supabase-postgres-best-practices` y
     aplicada con `supabase db push`.
   - Regenerar `database.types.ts`.
   - Verificación con `execute_sql`:
     - Un usuario sin rol admin no puede insertar ni actualizar `quizzes` y no ve los inactivos.
     - Un admin sí puede.
     - `submit_quiz_attempt` sobre un quiz inactivo falla.
     - Aprobar marca el paso como `done`.
     - `get_advisors` sin alertas nuevas.
     - Actualizar `supabase/tests/quizzes_progress_streak.sql` a este esquema.
2. **Seed.**
   - Redactar `data/quizzes.json` (74 × 3) y generar `<timestamp>_seed_course_quizzes.sql`.
   - **Pausa para que el equipo revise las preguntas antes de aplicar.**
   - Verificación: 74 filas en `quizzes`, todas validan contra `quizQuestionSchema` (un test de
     Vitest recorre `data/quizzes.json`), y cada `courseSlug` existe en `data/courses.json`.
3. **Borrar la generación con IA.**
   - Quitar `generate.ts`, `repository.ts`, `admin.ts`, sus tests y `requestQuiz`.
   - Reescribir `lib/quizzes/schema.ts` y su test.
   - Quitar `SUPABASE_SECRET_KEY`.
   - Verificación: `npm run test` y `tsc` pasan, y `grep` de "openai" en `lib/quizzes/` y de
     "SUPABASE_SECRET_KEY" no dan resultados.
4. **Diálogo con feedback al instante.**
   - `quiz-dialog.tsx`, `quiz-question.tsx`, `quiz-result.tsx` y su test: recibe el `CourseQuiz` ya
     cargado (sin action de pedido).
   - Verificación: los tests cubren que la opción queda fija, que se muestran la explicación y la
     correcta, y que "Entregar" manda todas las respuestas.
5. **Ruta del usuario.**
   - `page.tsx` carga los quizzes.
   - El botón aparece en el modal y en la lista solo si hay quiz.
   - Verificación en el navegador:
     - El quiz abre al instante.
     - Aprobar marca el paso como "Hecho" y suma racha.
     - Un curso sin quiz no muestra el botón.
6. **Panel del admin.**
   - La página del quiz, `quiz-form.tsx`, las actions, el link y la columna.
   - Verificación:
     - Crear un quiz a un curso sin quiz, agregar y borrar preguntas, guardar, desactivar.
     - El usuario deja de ver el botón.
     - Un usuario no admin que entra a la URL es redirigido (`requireAdmin`).
7. **Documentación.**
   - ADR 0006 (y el índice), README, `.env.example`, `SPECS-MAP.md`.
   - Verificación: `npm run test`, `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] Al clonar y aplicar las migraciones, los 74 cursos activos tienen un quiz de 3 preguntas.
- [ ] Abrir el quiz de un curso no hace esperar: no hay "Preparando tu quiz…" ni llamada a una IA.
- [ ] Al elegir una opción queda fija, se ve si es correcta, cuál era la correcta y la explicación.
- [ ] Aprobar (≥ el porcentaje del quiz, 60 % por defecto) marca el paso como "Hecho" y suma el día
      a la racha; desaprobar no cambia el estado del paso.
- [ ] El botón "Rendir quiz del curso" aparece en el modal del mapa y en la lista, solo si el curso
      tiene quiz activo.
- [ ] El admin puede crear el quiz de un curso, agregar, editar, reordenar y borrar preguntas,
      cambiar el porcentaje para aprobar y desactivarlo, desde `/admin/courses/[slug]/quiz`.
- [ ] Un usuario que no es admin no puede escribir en `quizzes` (ni por la UI ni por la API de
      Supabase) ni ver quizzes inactivos.
- [ ] No quedan quizzes por capítulo, `lib/quizzes/generate.ts`, `lib/supabase/admin.ts` ni
      `SUPABASE_SECRET_KEY` en el repo.
- [ ] La app funciona sin `OPENAI_API_KEY`, incluidos los quizzes.
- [ ] `npm run test`, `npm run lint` y `npm run build` pasan.

## Decisiones

- **El admin escribe los quizzes, no la IA.** La IA solo veía títulos y resúmenes, tardaba hasta
  45 s el primer uso y publicaba sin revisión. Escritos por el admin, el contenido es confiable,
  se corrige desde el panel y crece con el catálogo igual que los cursos (spec 10). Descartado:
  generar en vivo con un modelo más rápido (sigue sin revisión) y "sugerir con IA" en el panel
  (queda fuera, ver Alcance).
- **Un quiz por curso, sin capítulos.** La práctica por capítulo aportaba poco y DevTalles ya
  evalúa varias secciones.
- **Feedback al instante con las respuestas en el navegador.** El usuario pidió ver al marcar por
  qué una opción está bien o mal. Mandar el quiz completo evita un viaje al servidor por pregunta.
  Hacer trampa (leer las respuestas en devtools) no da nada que no dé el toggle "Hecho", que ya se
  marca a mano; `submit_quiz_attempt` igual vuelve a corregir en Postgres. Esto revierte a
  propósito la corrección "sin feedback antes de entregar" del ADR 0005.
- **RLS en vez de secret key.** El admin escribe con `private.is_admin()` (mismo patrón que el
  catálogo) y el usuario lee con su sesión: sale `lib/supabase/admin.ts` y una variable de entorno.
- **3 preguntas sencillas por curso en el seed, redactadas por el agente y revisadas por el
  equipo.** Así el jurado ve quizzes en todos los cursos apenas clona. Son conceptos del propio
  resumen del curso. El seed es un JSON embebido y generado una sola vez, igual que el de cursos
  del spec 02; lo que cambie después va por el panel, no reescribiendo la migración.
- **60 % por defecto (2 de 3), editable por quiz.**
- **Editar en el lugar, sin versiones.** Los intentos viejos conservan puntaje y si aprobaron; solo
  su detalle por pregunta podría no coincidir, y no se muestra en ningún lado. Salen `version` y
  el índice de "un activo por objetivo".
- **Desactivar, no borrar.** Los intentos referencian el quiz con `on delete restrict`.
- **Renumerar en vez de usar el siguiente número libre.** El usuario prefirió que el número refleje
  el orden: los quizzes van antes que la gamificación, que depende de ellos. Se renumeró al
  escribir este spec.
- **Se borran los datos de prueba de la etapa con IA** (el quiz generado y sus intentos), con los
  días de racha que salieron de ellos: son datos de desarrollo.

## Riesgos

- **Calidad de las 222 preguntas.** Las redacta un agente a partir de metadatos. Mitigación: son
  deliberadamente básicas, el paso 2 pausa para la revisión del equipo, y cualquiera se corrige
  desde el panel.
- **Respuestas visibles en el navegador.** Aceptado (ver Decisiones): el quiz no da nada que no dé
  el toggle.
