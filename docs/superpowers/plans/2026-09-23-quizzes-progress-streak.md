# Quizzes, Progress, and Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la vista persistente de una ruta, quizzes compartidos por curso/capítulo e intentos privados que actualicen progreso y racha de forma atómica.

**Architecture:** Supabase conserva rutas, quizzes versionados, intentos y actividad diaria; RLS protege los datos del usuario y un cliente administrativo exclusivo del servidor escribe el caché global de quizzes. Next.js carga la ruta en un Server Component, delega interacción a componentes cliente y usa Server Actions para generar, comprobar y entregar intentos. Vercel AI SDK valida la salida de OpenRouter antes de persistirla.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8, TypeScript estricto, Supabase/Postgres/RLS, Vercel AI SDK, `@openrouter/ai-sdk-provider`, Zod 4, Vitest 5, shadcn/Base UI, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-09-23-quizzes-progress-streak-design.md`

## Global Constraints

- Conservar el assessment de seis pasos, `buildPath()` y la generación actual de rutas.
- Supabase es la fuente de verdad; no usar `localStorage` para progreso, intentos ni racha.
- Un quiz de capítulo tiene 3 preguntas; uno de curso tiene 10; ambos aprueban con 60%.
- Existe una sola versión activa compartida por objetivo; intentos, progreso y racha son privados.
- `OPENROUTER_API_KEY` y `SUPABASE_SECRET_KEY` son secretos de servidor y nunca llevan `NEXT_PUBLIC_`.
- La fecha de racha se deriva en el servidor desde una zona IANA validada; como fallback se usa `UTC`.
- Las respuestas correctas no forman parte del DTO inicial enviado al navegador.
- Toda UI nueva compone `components/ui/*`, `components/brand/*`, los assets WebP existentes y los tokens del tema.
- Leer la guía local relevante de Next.js 16 en `node_modules/next/dist/docs/` y consultar documentación actual de cada librería antes de escribir su integración.
- No leer, imprimir, editar ni commitear `.env.local`.

## Review Focus

- Dos solicitudes concurrentes para el mismo objetivo deben terminar usando el mismo `quiz.id`; cubrirlo en Task 5.
- Un `chapterTitle` que no pertenece al curso debe fallar antes de llamar a OpenRouter; cubrirlo en Task 5.
- Una entrega duplicada con el mismo `idempotencyKey` debe devolver el intento existente sin duplicar racha; cubrirlo en Task 7.
- Cambiar o falsificar la zona horaria no debe permitir elegir la fecha de actividad; cubrirlo en Task 7.
- Un paso bloqueado o perteneciente a otra persona no debe poder presentar un quiz de curso; cubrirlo en Tasks 2 y 7.

---

## File Map

### Data and server boundaries

- `supabase/migrations/20260923HHMMSS_quizzes_progress_streak.sql`: enums, tables, indexes, RLS and transactional attempt RPC.
- `supabase/tests/quizzes_progress_streak.sql`: pgTAP coverage for constraints, RLS-facing helpers and attempt effects.
- `lib/supabase/admin.ts`: server-only secret-key client for shared quiz writes.
- `lib/supabase/database.types.ts`: generated schema types after the migration.
- `lib/quizzes/schema.ts`: generated quiz Zod schema and safe DTO types.
- `lib/quizzes/score.ts`: pure scoring shared by tests and explanatory UI contracts.
- `lib/quizzes/generate.ts`: OpenRouter provider call and prompt construction.
- `lib/quizzes/repository.ts`: target lookup, generation claim, publish/fail and safe DTO mapping.
- `lib/paths/path-view.ts`: path query-row to UI model and unlock derivation.
- `lib/gamification/streak.ts`: pure date/streak helpers used to verify database behavior.
- `app/(app)/paths/[id]/actions.ts`: authenticated Server Actions for quiz retrieval, answer feedback, attempt submission and timezone sync.

### UI

- `app/(app)/paths/[id]/page.tsx`: protected data loader and page composition.
- `components/paths/path-experience.tsx`: selected step, quiz dialog and optimistic refresh state.
- `components/paths/path-overview.tsx`: title, hours and progress summary.
- `components/paths/path-timeline.tsx`: responsive ordered main path.
- `components/paths/course-detail.tsx`: selected course, chapters and quiz launch.
- `components/paths/discarded-steps.tsx`: reasons for removed courses.
- `components/paths/bonus-missions.tsx`: optional steps that do not block the main path.
- `components/quizzes/quiz-dialog.tsx`: quiz state machine.
- `components/quizzes/quiz-question.tsx`: locked selection and feedback.
- `components/quizzes/quiz-result.tsx`: score, retry and celebration.
- `components/gamification/streak-card.tsx`: current/best streak and recent activity.

## Task 1: Dependencies, environment contract, and quiz schema

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `lib/quizzes/schema.ts`
- Create: `lib/quizzes/schema.test.ts`
- Create: `lib/quizzes/score.ts`
- Create: `lib/quizzes/score.test.ts`

**Interfaces:**
- Produces: `generatedQuizSchema`, `GeneratedQuiz`, `SafeQuiz`, `QuizKind`, `scoreQuiz(answers, correctOptions, passPercentage)`.

- [ ] **Step 1: Install the provider packages**

Run: `npm install ai @openrouter/ai-sdk-provider`

Expected: `package.json` lists both runtime dependencies and the lockfile resolves one compatible AI SDK graph.

- [ ] **Step 2: Add server-only environment names**

Append to `.env.example` without values:

```dotenv
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4.1-mini
SUPABASE_SECRET_KEY=
```

- [ ] **Step 3: Write failing schema and scoring tests**

Cover exactly these cases:

```ts
expect(generatedQuizSchema.safeParse(validCourseQuiz).success).toBe(true);
expect(generatedQuizSchema.safeParse({ questions: validCourseQuiz.questions.slice(0, 2) }).success).toBe(false);
expect(generatedQuizSchema.safeParse(quizWithDuplicateOptions).success).toBe(false);
expect(scoreQuiz([0, 1, 2, 3, 0], [0, 1, 2, 0, 1], 60)).toEqual({
  correctCount: 3,
  scorePercentage: 60,
  passed: true,
});
```

The schema validates an individual question; `parseGeneratedQuiz(value, kind)` enforces 3 versus 10 questions.

- [ ] **Step 4: Run tests and observe the expected failure**

Run: `npm run test -- lib/quizzes/schema.test.ts lib/quizzes/score.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 5: Implement the contracts and pure scorer**

Use these public shapes:

```ts
export type QuizKind = "course" | "chapter";
export type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctOption: number;
  explanation: string;
};
export type SafeQuizQuestion = Omit<QuizQuestion, "correctOption" | "explanation">;
export type GeneratedQuiz = { questions: QuizQuestion[] };
export type SafeQuiz = {
  id: string;
  title: string;
  kind: QuizKind;
  passPercentage: number;
  questions: SafeQuizQuestion[];
};
export function parseGeneratedQuiz(value: unknown, kind: QuizKind): GeneratedQuiz;
export function scoreQuiz(
  answers: number[],
  correctOptions: number[],
  passPercentage: number,
): { correctCount: number; scorePercentage: number; passed: boolean };
```

Reject blank/over-500-character prompts, anything other than four nonblank unique options, invalid indices and blank/over-500-character explanations.

- [ ] **Step 6: Run unit tests**

Run: `npm run test -- lib/quizzes/schema.test.ts lib/quizzes/score.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example lib/quizzes
git commit -m "feat: define quiz generation contracts"
```

## Task 2: Database schema, RLS, and atomic submission

**Files:**
- Create: `supabase/migrations/20260923120000_quizzes_progress_streak.sql`
- Create: `supabase/tests/quizzes_progress_streak.sql`
- Modify: `lib/supabase/database.types.ts`

**Interfaces:**
- Produces: tables `quizzes`, `quiz_attempts`, `streak_activities`; RPC `submit_quiz_attempt`; profile streak columns.
- Consumes: existing `profiles`, `courses`, `learning_paths`, `path_steps`.

- [ ] **Step 1: Write pgTAP failures first**

The SQL test must assert:

```sql
select has_table('public', 'quizzes');
select has_table('public', 'quiz_attempts');
select has_table('public', 'streak_activities');
select has_function('public', 'submit_quiz_attempt', array['uuid','uuid','uuid','jsonb','text','uuid']);
```

Add fixtures for two users and assert: wrong owner rejected, locked main step rejected, failed attempt has no activity, chapter pass adds activity only, course pass marks `path_steps.done`, an invalid timezone is normalized to `UTC`, and duplicate idempotency key returns one attempt/activity.

- [ ] **Step 2: Run the database test and observe failure**

Run: `npx supabase test db`

Expected: FAIL because the new relations/function do not exist. If the local stack is stopped, run `npx supabase start` and repeat.

- [ ] **Step 3: Write the migration**

Create enums `quiz_kind` and `quiz_generation_status`; add profile columns:

```sql
alter table public.profiles
  add column timezone text not null default 'UTC',
  add column current_streak integer not null default 0 check (current_streak >= 0),
  add column best_streak integer not null default 0 check (best_streak >= current_streak),
  add column last_activity_date date;
```

Create the three tables using the exact columns from the design. Use a partial unique index:

```sql
create unique index quizzes_one_active_target_idx
  on public.quizzes (target_key)
  where is_active;
```

Enable RLS. `quiz_attempts` and `streak_activities` receive owner-select policies only; mutations go through the RPC. `quizzes` receives no Data API policy.

Implement `submit_quiz_attempt(...) returns jsonb` as `security definer set search_path = ''`. It must derive `auth.uid()`, validate ownership/target/elegibility, validate the IANA zone with `pg_timezone_names`, calculate `activity_date` using `current_timestamp at time zone timezone`, score JSON questions, insert once by `(user_id, idempotency_key)`, update daily activity and profile summaries only for a newly passed date, and mark only passed course quizzes as `done`.

- [ ] **Step 4: Reset the local database and run pgTAP**

Run: `npx supabase db reset && npx supabase test db`

Expected: all migration and pgTAP checks PASS.

- [ ] **Step 5: Regenerate TypeScript types**

Run: `npx supabase gen types typescript --local > /tmp/devpathlles-database.types.ts`

Inspect the generated file, then replace `lib/supabase/database.types.ts` with it using `apply_patch`; do not use shell redirection to overwrite the repository file.

- [ ] **Step 6: Run TypeScript and existing tests**

Run: `npx tsc --noEmit && npm run test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations supabase/tests lib/supabase/database.types.ts
git commit -m "feat: persist quizzes attempts and streaks"
```

## Task 3: Server-only admin client

**Files:**
- Create: `lib/supabase/admin.ts`
- Create: `lib/supabase/admin.test.ts`

**Interfaces:**
- Produces: `createAdminClient(): SupabaseClient<Database>`.

- [ ] **Step 1: Write a failing environment-contract test**

Mock environment variables and assert that missing `SUPABASE_SECRET_KEY` throws `Falta la configuración administrativa de Supabase en el servidor.` without including any key value.

- [ ] **Step 2: Run the focused test**

Run: `npm run test -- lib/supabase/admin.test.ts`

Expected: FAIL because `admin.ts` does not exist.

- [ ] **Step 3: Implement the client**

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Falta la configuración administrativa de Supabase en el servidor.");
  return createClient<Database>(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

Keep this module unreachable from Client Components through the `server-only` import and verify that no file containing `"use client"` imports it with `rg -n 'supabase/admin' app components`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm run test -- lib/supabase/admin.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/admin.ts lib/supabase/admin.test.ts
git commit -m "feat: add server-only supabase admin client"
```

## Task 4: Path view model and protected loader

**Files:**
- Create: `lib/paths/path-view.ts`
- Create: `lib/paths/path-view.test.ts`
- Modify: `app/(app)/paths/[id]/page.tsx`

**Interfaces:**
- Produces: `PathView`, `PathStepView`, `buildPathView(rows)`, `loadPathView(pathId, userId)`.

- [ ] **Step 1: Write failing view-model tests**

Use rows containing `done`, `pending`, `discarded` and `origin: "opcional"`. Assert:

```ts
expect(view.mainSteps.map((step) => step.uiStatus)).toEqual(["done", "available", "locked"]);
expect(view.bonusSteps).toHaveLength(1);
expect(view.discardedSteps[0].discardReason).toBe("Ya dominás este contenido");
expect(view.progressPercentage).toBe(33);
```

Also cover an empty active path without division by zero and ordering by `(stage, position)`.

- [ ] **Step 2: Run the focused test and observe failure**

Run: `npm run test -- lib/paths/path-view.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure mapper**

Define:

```ts
export type StepUiStatus = "locked" | "available" | "in_progress" | "done" | "discarded";
export type PathStepView = {
  id: string;
  stage: number;
  position: number;
  origin: "requerido" | "recomendado" | "opcional" | "interes";
  reason: string;
  status: Database["public"]["Enums"]["path_step_status"];
  uiStatus: StepUiStatus;
  course: Pick<Tables<"courses">, "id" | "slug" | "title" | "summary" | "hours" | "chapters" | "url">;
  discardReason: string | null;
};
```

Only `origin === "opcional"` is bonus. Among other active steps, an explicit database status `in_progress` maps to the same UI status; otherwise the first non-done item is `available` and later pending items are `locked`.

- [ ] **Step 4: Replace the page query with a protected loader**

`page.tsx` must call `requireUser()`, query the route by both `id` and `user_id`, select course details for every step, load profile streak fields plus the last 35 `streak_activities`, pass rows through `buildPathView`, and call `notFound()` for missing/foreign paths.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run test -- lib/paths/path-view.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/paths/path-view.ts lib/paths/path-view.test.ts 'app/(app)/paths/[id]/page.tsx'
git commit -m "feat: load persistent path progress"
```

## Task 5: Shared quiz repository and OpenRouter generation

**Files:**
- Create: `lib/quizzes/generate.ts`
- Create: `lib/quizzes/generate.test.ts`
- Create: `lib/quizzes/repository.ts`
- Create: `lib/quizzes/repository.test.ts`

**Interfaces:**
- Consumes: `createAdminClient`, `parseGeneratedQuiz`, course catalog fields.
- Produces: `generateQuiz(input)`, `getOrCreateQuiz(input)`, `toSafeQuiz(row)`.

- [ ] **Step 1: Write failing generation and repository tests**

Mock the model call and repository adapter. Cover:

- exact prompt context excludes unrelated courses;
- chapter title outside `course.chapters` throws before provider invocation;
- invalid model JSON is rejected by `parseGeneratedQuiz`;
- existing `ready` row avoids provider invocation;
- two concurrent claims resolve to the same persisted quiz ID;
- provider failure changes `generating` to `failed` and a later request can reclaim it;
- `toSafeQuiz` strips `correctOption` and `explanation`.

- [ ] **Step 2: Run the focused tests and observe failure**

Run: `npm run test -- lib/quizzes/generate.test.ts lib/quizzes/repository.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement OpenRouter generation**

Create the provider lazily so importing the module in tests does not require a key:

```ts
const openrouter = createOpenRouter({ apiKey });
const { output } = await generateText({
  model: openrouter(process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini"),
  output: Output.object({ schema: generatedQuizSchema }),
  system: buildQuizSystemPrompt(questionCount),
  prompt: JSON.stringify(courseContext),
});
return parseGeneratedQuiz(output, input.kind);
```

Use only title, summary, topics, prerequisites, outcomes and the selected chapter/all chapters.

- [ ] **Step 4: Implement claim/publish/fail behavior**

`getOrCreateQuiz` accepts `{ pathId, pathStepId, kind, chapterTitle }`, first validates the authenticated route/step with the session client, then uses the admin client only for global quiz rows. Build `targetKey` as `course:<courseId>` or `chapter:<courseId>:<sha256(normalizedTitle)>`. Insert `generating` with the active unique index; on conflict, refetch. A `ready` row returns immediately. A stale `generating` row older than two minutes and a `failed` row may be claimed by an atomic conditional update.

When another request owns a fresh `generating` row, poll that row up to eight times with a 500 ms delay. Return the shared `ready` row as soon as it appears; after four seconds return a recoverable `El quiz se sigue preparando. Intentá de nuevo en unos segundos.` result instead of starting a second generation.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run test -- lib/quizzes/generate.test.ts lib/quizzes/repository.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/quizzes/generate.ts lib/quizzes/generate.test.ts lib/quizzes/repository.ts lib/quizzes/repository.test.ts
git commit -m "feat: generate and reuse shared quizzes"
```

## Task 6: Quiz Server Actions

**Files:**
- Create: `app/(app)/paths/[id]/actions.ts`
- Create: `app/(app)/paths/[id]/actions.test.ts`

**Interfaces:**
- Produces: `requestQuiz`, `checkQuizAnswer`, `submitQuizAttempt`, `updateTimezone`.

- [ ] **Step 1: Write failing action tests**

Mock `requireUser`, repository and Supabase RPC. Assert unauthorized ownership becomes a generic error, `requestQuiz` returns `SafeQuiz`, `checkQuizAnswer` returns only `{ correct, explanation }`, malformed answers fail before RPC, and timezone updates normalize non-IANA values to `UTC`.

- [ ] **Step 2: Run tests and observe failure**

Run: `npm run test -- 'app/(app)/paths/[id]/actions.test.ts'`

Expected: FAIL because the actions do not exist.

- [ ] **Step 3: Implement exact action contracts**

```ts
export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };
export type AttemptResult = {
  attemptId: string;
  correctCount: number;
  scorePercentage: number;
  passed: boolean;
  streakCurrent: number;
  streakBest: number;
  streakIncreased: boolean;
  stepCompleted: boolean;
  nextStepId: string | null;
};
export async function requestQuiz(input: {
  pathId: string; pathStepId: string; kind: QuizKind; chapterTitle: string | null;
}): Promise<ActionResult<SafeQuiz>>;
export async function checkQuizAnswer(input: {
  quizId: string; questionId: string; selectedOption: number;
}): Promise<ActionResult<{ correct: boolean; explanation: string }>>;
export async function submitQuizAttempt(input: {
  quizId: string; pathId: string; pathStepId: string; answers: number[];
  timezone: string; idempotencyKey: string;
}): Promise<ActionResult<AttemptResult>>;
export async function updateTimezone(timezone: string): Promise<ActionResult<null>>;
```

Every action begins with `requireUser()`. `checkQuizAnswer` reads the global row with the admin client only after verifying that the quiz course is in one of the caller's routes. `submitQuizAttempt` invokes `submit_quiz_attempt` and calls `revalidatePath('/paths/' + pathId)` after success.

When `requestQuiz` opens the available main course step for the first time, update that owned step from `pending` to `in_progress`. Chapter practice, bonus steps, completed steps and retries do not change status at quiz-open time.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm run test -- 'app/(app)/paths/[id]/actions.test.ts' && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'app/(app)/paths/[id]/actions.ts' 'app/(app)/paths/[id]/actions.test.ts'
git commit -m "feat: expose protected quiz actions"
```

## Task 7: Attempt idempotency and streak behavior audit

**Files:**
- Create: `lib/gamification/streak.ts`
- Create: `lib/gamification/streak.test.ts`
- Modify: `supabase/tests/quizzes_progress_streak.sql`
- Modify: `supabase/migrations/20260923120000_quizzes_progress_streak.sql`

**Interfaces:**
- Produces: `deriveStreak(activityDates, today)` for display/test parity.
- Audits: `submit_quiz_attempt` contract consumed by Task 6.

- [ ] **Step 1: Write failing boundary tests**

Cover same-day repetition, consecutive day, skipped day, out-of-order historical date, UTC/local midnight, invalid zone fallback, duplicate idempotency key, spoofed `activityDate` absent from RPC arguments, and a locked/foreign step.

```ts
expect(deriveStreak(["2026-09-21", "2026-09-22", "2026-09-23"], "2026-09-23"))
  .toEqual({ current: 3, best: 3 });
expect(deriveStreak(["2026-09-20", "2026-09-22"], "2026-09-23"))
  .toEqual({ current: 0, best: 1 });
```

- [ ] **Step 2: Run unit and database tests**

Run: `npm run test -- lib/gamification/streak.test.ts && npx supabase test db`

Expected: new cases FAIL before implementation/correction.

- [ ] **Step 3: Implement the pure helper and correct SQL behavior**

The helper sorts/deduplicates ISO dates and returns current/best consecutive spans. The RPC must ignore any client date, derive its own date, return an existing attempt on duplicate idempotency key, and update profile summaries only when `insert ... on conflict do nothing` for `streak_activities` inserted a row.

- [ ] **Step 4: Run all data tests**

Run: `npm run test -- lib/gamification/streak.test.ts && npx supabase test db`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/gamification/streak.ts lib/gamification/streak.test.ts supabase
git commit -m "test: harden streak and attempt idempotency"
```

## Task 8: Responsive path experience

**Files:**
- Create: `components/paths/path-experience.tsx`
- Create: `components/paths/path-overview.tsx`
- Create: `components/paths/path-timeline.tsx`
- Create: `components/paths/course-detail.tsx`
- Create: `components/paths/discarded-steps.tsx`
- Create: `components/paths/bonus-missions.tsx`
- Create: `components/paths/path-experience.test.tsx`
- Modify: `app/(app)/paths/[id]/page.tsx`

**Interfaces:**
- Consumes: `PathView`, streak summary, quiz actions.
- Produces: selected-course UI and quiz launch callback for Task 9.

- [ ] **Step 1: Add a DOM test environment and failing component tests**

Install the required test packages with `npm install -D @testing-library/react @testing-library/user-event jsdom` and set the component test file to `// @vitest-environment jsdom`.

Assert that the first pending main step says `Disponible`, later pending steps say `Bloqueado`, done steps say `Completado`, optional steps render under `Misiones bonus`, discarded reasons appear in an accordion, and selecting a course updates the detail heading.

- [ ] **Step 2: Run the component test and observe failure**

Run: `npm run test -- components/paths/path-experience.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the composed UI**

Use `Card`, `Progress`, `Badge`, `Button`, `Accordion`, `Separator` and Phosphor icons. Layout:

```tsx
<div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
  <aside>{/* overview + streak */}</aside>
  <main>{/* vertical timeline; alternating offset only at xl */}</main>
  <aside>{/* selected course + bonus missions */}</aside>
</div>
```

On mobile the DOM order must remain overview, timeline, details. Locked main steps may be selected for reading but their course-quiz button is disabled. Chapter practice buttons and optional missions remain available.

- [ ] **Step 4: Compose the page**

Pass the server-loaded `PathView` and streak activity into `PathExperience`. Keep `notFound()` and ownership checks in the Server Component.

- [ ] **Step 5: Run tests, lint and typecheck**

Run: `npm run test -- components/paths/path-experience.test.tsx && npm run lint && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/paths 'app/(app)/paths/[id]/page.tsx' package.json package-lock.json vitest.config.mts
git commit -m "feat: build interactive path progress view"
```

## Task 9: Quiz dialog and result celebration

**Files:**
- Create: `components/quizzes/quiz-dialog.tsx`
- Create: `components/quizzes/quiz-question.tsx`
- Create: `components/quizzes/quiz-result.tsx`
- Create: `components/quizzes/quiz-dialog.test.tsx`
- Create: `components/gamification/streak-card.tsx`
- Create: `components/gamification/streak-card.test.tsx`
- Modify: `components/paths/path-experience.tsx`

**Interfaces:**
- Consumes: Task 6 actions, `SafeQuiz`, `AttemptResult`.
- Produces: complete route-to-quiz interaction.

- [ ] **Step 1: Write failing interaction tests**

Test loading, provider error/retry, 3-question chapter copy, 10-question course copy, disabled `Comprobar` without a selection, locked selection after feedback, explanation rendering, failed result/retry, passed chapter result without step-completed copy, passed course result with next-step copy, and one of `/streak/celebration-{1..4}.webp` with descriptive alt text.

- [ ] **Step 2: Run tests and observe failure**

Run: `npm run test -- components/quizzes/quiz-dialog.test.tsx components/gamification/streak-card.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the dialog state machine**

Use states `loading | answering | submitting | result | error`. Generate one `crypto.randomUUID()` idempotency key when a quiz session opens and reuse it for retries of the same final submission. Store one selected index per question; after `checkQuizAnswer` succeeds, lock that question and show its explanation. Submit the full answer array only after all questions are locked.

- [ ] **Step 4: Implement result and streak cards**

`QuizResult` shows score and retry/close actions. Choose the celebration deterministically with `attemptId.charCodeAt(0) % 4 + 1`, avoiding hydration differences. `StreakCard` displays current, best and the last seven local dates; omit every demo-date control from the prototype.

- [ ] **Step 5: Connect to `PathExperience`**

Opening a course passes `kind: "course", chapterTitle: null`; a chapter passes `kind: "chapter"` and its exact catalog title. On successful submission, call `router.refresh()` and keep the result dialog visible until the user closes it.

- [ ] **Step 6: Run focused and full UI checks**

Run: `npm run test -- components/quizzes components/gamification components/paths && npm run lint && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/quizzes components/gamification components/paths/path-experience.tsx
git commit -m "feat: add course and chapter quiz experience"
```

## Task 10: Documentation and production verification

**Files:**
- Modify: `README.md`
- Modify: `docs/SPECS-MAP.md`
- Modify: `docs/ROADMAP.md`
- Modify: design spec status if implementation decisions changed.

**Interfaces:**
- Verifies every prior task; produces operator setup instructions.

- [ ] **Step 1: Document configuration and behavior**

Document `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`, `SUPABASE_SECRET_KEY`, shared quiz reuse, the 60% threshold, local-time streak behavior and the no-key failure mode. Never include real values.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm run test && npm run lint && npx tsc --noEmit && npm run build`

Expected: every command exits 0.

- [ ] **Step 3: Run database verification**

Run: `npx supabase db reset && npx supabase test db`

Expected: migrations apply from zero and pgTAP passes.

- [ ] **Step 4: Perform the authenticated manual flow**

Verify in the browser:

1. Open an existing `/paths/[id]` and confirm refresh preserves progress.
2. Generate a chapter quiz, pass it and confirm the course remains incomplete while the streak changes once.
3. Repeat another passed quiz on the same local date and confirm the streak does not increment.
4. Pass a course quiz at exactly 60%, confirm its step becomes done and the next becomes available.
5. Open the same target as a second user and confirm the same quiz ID/content is reused while attempts remain private.
6. Temporarily remove `OPENROUTER_API_KEY`, restart, and confirm the route remains usable with a recoverable quiz error.
7. Check keyboard focus, dialog close behavior, 375px mobile layout and desktop layout.

- [ ] **Step 5: Inspect Supabase security advisors**

Run the available Supabase advisor command/MCP check for security and performance. Resolve findings caused by this migration; record unrelated pre-existing findings in the handoff.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md docs .env.example
git commit -m "docs: explain quizzes progress and streaks"
```

- [ ] **Step 7: Final clean-tree evidence**

Run: `git status --short && git log --oneline -10`

Expected: empty status followed by the task commits.
