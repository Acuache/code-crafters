# SPEC 14 — Gamificación: XP por curso, niveles, racha, insignias y celebración al completar

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 03, SPEC 08, SPEC 09, SPEC 12, SPEC 13, ADR 0005 (quizzes y racha de Ariel)
> **Fecha:** 2026-09-24
> **Objetivo:** Darle al usuario XP por cada curso completado (10 XP por hora), niveles, la racha de
> días con avance que ya existe (ADR 0005) y 6 insignias, todo derivado de sus datos al leer,
> visible en el dashboard y en una página `/profile` nueva, y celebrado en `/paths/[id]` con un
> toast al completar un curso o con confetti y la mascota cuando hay un logro mayor.

## Por qué existe este spec

`docs/ROADMAP.md` lo pone en SHOULD ("XP por curso según horas, niveles, 5 o 6 insignias, racha y
confetti") y el guion del video lo usa en el segundo 45: "marcar un curso, XP e insignia". Una ruta
de 100 horas se recorre en semanas, y sin un premio intermedio marcar un paso como hecho no
cambia nada visible fuera de una barra. El concurso se evalúa navegando la app (`ENUNCIADO.md`,
criterio 4), y el patrón de Duolingo (XP + racha) es el que ya inspira el mapa del spec 12.

**Dependencias, una por motivo distinto:**

- **SPEC 02** — `path_steps.status` / `completed_at`, `learning_paths` y la RLS por dueño sobre las
  que se deriva todo. `profiles` sigue **sin** política de update (ver Decisiones).
- **SPEC 03** — `requireUser()` y `proxy.ts`: `/profile` se suma a las rutas privadas.
- **SPEC 08** — `setStepStatus` en `app/(app)/paths/[id]/actions.ts` (ya escribe `completed_at`
  "para la gamificación") y el estado optimista de `components/paths/path-steps-view.tsx`.
- **SPEC 09** — la cabecera de `app/(app)/dashboard/page.tsx`, donde va el resumen.
- **SPEC 12** — `handleStatusChange` como punto de enganche, el modal de detalle del paso y los
  tiempos de `lib/path-map/motion.ts`: la celebración espera a que termine la coreografía del mapa.
- **SPEC 13** — aprobar el quiz del curso (`submitQuizAttempt`) es la otra forma de completar un
  paso. El `QuizDialog` ya le pasa el `AttemptResult` completo a `onAttemptSaved`.
- **ADR 0005** — la racha ya existe: `streak_activities` (suma al aprobar un quiz y, vía
  `record_step_activity`, al pasar un paso a "En curso"/"Hecho"), `profiles.timezone` y
  `lib/gamification/streak.ts` (`computeStreak`, `todayInTimeZone`, con tests), más la
  `StreakCard` de `components/gamification/streak-card.tsx`. `setStepStatus` ya recibe `timeZone`.

## Alcance

**Entra:**

- **Una migración chica**,
  `supabase/migrations/<timestamp>_keep_streak_days_on_path_delete.sql` (timestamp posterior a
  `20260925140000`): el FK `streak_activities.source_attempt_id → quiz_attempts` pasa de
  `on delete cascade` a `on delete set null`. Hoy borrar una ruta borra sus intentos de quiz
  (`quiz_attempts.path_id … on delete cascade`) y, en cascada, los días de racha que salieron de
  aprobarlos. XP, nivel e insignias no se guardan: se derivan al leer.
- `supabase/tests/streak_days_survive_path_delete.sql` — pgTAP de esa migración.
- `lib/gamification/xp.ts` — XP por curso y nivel a partir del XP total. Puro.
- `lib/gamification/achievements.ts` — el catálogo de las 6 insignias y su evaluación. Puro.
- `lib/gamification/summary.ts` — `summarizeGamification` (el resumen completo),
  `celebrateStepChange` (qué hay que celebrar cuando un paso pasa a "En curso" o "Hecho") y
  `mainCelebration` (el logro que decide la pose del modal). Puro.
- `lib/gamification/load-gamification.ts` — única pieza con I/O: las queries a Supabase que arman
  la entrada de `summary.ts`. Solo servidor.
- Tests: `xp.test.ts`, `achievements.test.ts` y `summary.test.ts` en `lib/gamification/`.
- `lib/gamification/streak.ts` — **ya existe** (ADR 0005); se reusa tal cual.
- `components/gamification/xp-bar.tsx` — **ya existe** con props en inglés (`level`, `currentXp`,
  `nextLevelXp`) y un uso de muestra en `/sistema-diseno`; se conecta a datos reales sin cambiarlo.
- `components/gamification/streak-indicator.tsx` — versión compacta de la racha para la cabecera
  del dashboard. `/paths/[id]` y `/profile` usan la `StreakCard` de Ariel, que este spec no toca.
- `components/gamification/achievement-grid.tsx` — las 6 insignias: ganadas a color, bloqueadas en
  gris con la condición para ganarlas.
- `components/gamification/celebration-dialog.tsx` — el modal de logro mayor con la pose de la
  mascota que corresponda.
- `components/gamification/celebrate.ts` — dispara el confetti con `import()` dinámico de
  `canvas-confetti`.
- `components/gamification/use-celebration.ts` — el hook que ordena la celebración: la guarda
  hasta que no haya otro diálogo abierto y, si hay logro mayor, hasta que termine la coreografía del
  mapa; después muestra el toast o el modal (ver "Cuándo se abre el modal"). `path-steps-view.tsx`
  solo lo llama.
- `app/(app)/profile/page.tsx` y `app/(app)/profile/loading.tsx` — página nueva `/profile` (ver
  Composición de UI), con su pantalla de carga como la del dashboard.
- `package.json`: `canvas-confetti` y `@types/canvas-confetti` (dev).
- **Excepción a la regla 5 en `app/(app)/paths/[id]/actions.ts` (spec 08):** `setStepStatus`
  devuelve `gamification` cuando el paso pasa a `in_progress` o `done`, y `recordStreakDay` avisa si
  pudo registrar el día; `submitQuizAttempt` devuelve `gamification` cuando el quiz se aprueba.
  Además (ADR 0007), `setStepStatus` rechaza `done` cuando el curso del paso tiene un quiz activo:
  ese curso se completa aprobando el quiz. `discardStep` y `restoreStep` no cambian.
- **Excepción a la regla 5 en `components/paths/path-steps-view.tsx` (spec 08, ya tocado por el
  12 y el 13):** pasarle a `useCelebration` el resultado de `handleStatusChange` y de
  `onAttemptSaved`, avisarle qué diálogos están abiertos y montar `CelebrationDialog`. Además (ADR
  0007), pedir "Hecho" en un curso con quiz abre el quiz en vez de cambiar el estado, desde la lista
  y desde el detalle del mapa. Nada más del mapa ni de la lista cambia.
- **Excepción a la regla 5 en `components/paths/step-status-toggle.tsx` (spec 08, reusado por el
  12):** el estado activo va relleno con el color de marca (`bg-primary text-primary-foreground`).
  Hoy solo lleva `bg-muted`, que en tema oscuro casi no se distingue del fondo del modal de detalle,
  y el usuario no sabe en qué estado está el paso.
- **`app/globals.css`:** una regla sin capa que sube el `ToastViewport` (`data-slot="toast-viewport"`)
  por encima de los diálogos. Tienen el mismo `z-50`, pero el diálogo se monta después y tapaba los
  toasts (por ejemplo, un error al cambiar el estado desde el detalle) con su fondo borroso;
  `components/ui/toast.tsx` sigue sin tocarse.
- `docs/decisiones/0007-done-requires-course-quiz.md` — ADR nuevo: "Hecho" exige aprobar el quiz
  cuando el curso tiene uno. Cambia en parte el ADR 0005 ("el quiz no puede ser más estricto que el
  toggle") y el 0006.
- **Excepción a la regla 5 en `app/(app)/dashboard/page.tsx` (spec 09, ya tocado por el 10 y el
  11):** en la cabecera, `XpBar` + `StreakIndicator`, y el avatar/nombre como link a `/profile`. La
  grilla de rutas no cambia.
- **Excepción a la regla 5 en `proxy.ts` (spec 03):** sumar `/profile` a `PRIVATE_PATH_PREFIXES`.
  Con un `loading.tsx` la página ya no puede devolver un 307: sin esto, un visitante sin sesión ve
  la carga antes de que `requireUser()` lo mande a `/login`.
- Actualizar `docs/SPECS-MAP.md` (fila 14, §7 "14 · gamification", regla 5 con la propiedad y las
  cinco excepciones de arriba, regla 6 con la migración del 14, regla 9 y §6),
  `docs/decisiones/README.md` (fila de la 0007) y `docs/ROADMAP.md`
  (el modelo de datos ya no tiene `profiles.xp/level/streak/last_activity_at` ni las tablas
  `achievements`/`user_achievements`; no hay "XP extra" por puntaje; las insignias van en
  `/profile`, no en el dashboard).

**Qué NO entra (queda para otros specs o fuera):**

- Columnas `xp` o `level` en `profiles`, y las tablas `achievements` / `user_achievements` que
  preveía el mapa (ver Decisiones). Cualquier otro cambio a la racha o a los quizzes (ADR 0005,
  spec 13) fuera del FK de arriba.
- Bonus de XP por completar una ruta, por racha, por puntaje del quiz o por cualquier otra cosa:
  solo los cursos dan XP.
- Celebrar insignias que no salen de cambiar el estado de un paso ("Explorador" al crear la 3.ª
  ruta): aparecen en el perfil, pero la action de generación del spec 07 no se toca.
- Aviso o toast al desmarcar un paso hecho: el XP y el nivel bajan en silencio.
- Tabla de posiciones, XP visible para otros usuarios, compartir insignias (el spec 15 decide si
  la ruta pública muestra algo).
- "Congelar" la racha, recordatorios por mail o notificaciones.
- Editar el perfil (nombre, avatar): `/profile` es de solo lectura.
- Gamificación en la ruta pública (spec 15) o en el panel de admin (spec 10).
- Tocar `lib/progress/*` (08/09), `lib/paths/*` (04), `lib/path-map/*` (12),
  `lib/gamification/streak.ts` y `components/gamification/streak-card.tsx` (ADR 0005),
  `components/quizzes/*` (13) o `components/ui/toast.tsx`: se leen o se usan, no se modifican.

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*`, los assets de `public/streak/` y
`@phosphor-icons/react` (sufijo `Icon`; `@phosphor-icons/react/ssr` en los Server Components), sin
colores, radios ni sombras fuera de los tokens del tema (`CLAUDE.md` §"UI: componer, no crear").
Los componentes nuevos de `components/gamification/` son **composiciones** con nombre propio
porque se usan en dos pantallas (dashboard y perfil) o encapsulan una librería (confetti); ninguno
agrega una pieza visual que no exista.

| Elemento               | Qué se reusa                                                                                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nivel + XP             | `XpBar` (existente, sobre `Progress`): "Nivel N" y "X / Y XP" del nivel actual                                                                                                                                                                                       |
| Racha compacta         | `StreakIndicator`: `FireIcon weight="fill"` + "N días" en `font-heading tabular-nums`. Con racha viva y sin avance hoy, `reminder.webp` a 48 px (`alt=""`) + "Avanza hoy para no perder tu racha". Racha 0: "Empieza tu racha hoy", sin imagen                       |
| Cabecera del dashboard | La `header` del 09 intacta; debajo del saludo, una fila con `XpBar` y `StreakIndicator`. Avatar + nombre envueltos en `Link href="/profile"` con `focus-visible:ring`                                                                                                |
| Perfil — cabecera      | Mismo patrón de la cabecera del dashboard (`brand-gradient-soft`, `Avatar`, `Eyebrow` "Tu perfil", nombre como `h1`), `XpBar` y `Button variant="outline"` "Volver al panel" (`ArrowLeftIcon`)                                                                       |
| Perfil — racha         | La `StreakCard` de Ariel, igual que en `/paths/[id]`: racha actual, récord y la última semana                                                                                                                                                                        |
| Perfil — estadísticas  | 3 `Card` pequeñas: cursos hechos, horas completadas, rutas creadas. Número en `text-title tabular-nums`, etiqueta en `text-muted-foreground`. La mejor racha no se repite: ya está en la `StreakCard`                                                                 |
| Perfil — insignias     | `AchievementGrid`: grilla de 6 `Card` (2 columnas en móvil, 3 en `lg`) con una **medalla** por insignia (`AchievementMedal`: cinta y disco con el degradado del botón `brand` y el icono Phosphor de la insignia), nombre y descripción. Bloqueada: medalla en `muted` al 60 % con `LockSimpleIcon`, y el texto sin atenuar con "Cómo ganarla: …". Se distingue por medalla, candado y texto, no solo por color |
| Toast de curso hecho   | `toast.add` del `Toaster` que ya monta `path-steps-view.tsx`, con `title` como `ReactNode`: `celebration-1.webp` a 40 px (`alt=""`) + "+N XP · «Curso»". Si el curso ya contaba en otra ruta: "«Curso» ya sumaba XP en otra de tus rutas", sin imagen. Solo cuando no hay logro mayor: si lo hay, el XP va como primer ítem del modal |
| Modal de logro mayor   | `Dialog` + `DialogContent` + `DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`: pose de la mascota a 160 px, título según el logro principal, lista de todo lo ganado (XP del curso con `celebration-1.webp`, ruta, nivel, insignias con su medalla), `Button variant="brand"` "¡Seguir!"       |
| Confetti               | `canvas-confetti` con los colores del tema (`--primary-bright`, `--chart-2`, `--primary-end`) leídos al disparar y convertidos a HEX, porque la librería solo acepta HEX y los tokens están en OKLCH (p. ej., pintando un píxel en un canvas de 1×1); `disableForReducedMotion: true` |

`toast.add` acepta `ReactNode` en `title` (Base UI, `ToastManagerAddOptions`): la mascota entra por
ahí, sin cambiar el `ToastList` de `components/ui/toast.tsx`. Un toast que aparece con un diálogo
abierto se ve por encima (regla de `app/globals.css`, ver Alcance). Base UI deja fuera del `inert`
de un diálogo modal a los elementos con `aria-live`, y el viewport del toast lo tiene: sigue
anunciándose y se puede cerrar.

**Estado del paso** (`StepStatusToggle`, lista y detalle del mapa): el ítem activo va relleno con
`bg-primary text-primary-foreground`, así que activo e inactivo se distinguen por relleno y no solo
por tono. En un curso con quiz activo, "Hecho" abre el quiz (ADR 0007): la sección "Pon a prueba lo
que aprendiste" del detalle y el botón "Rendir quiz del curso" de la lista ya lo anuncian.

**Qué pose va en cada caso** (`public/streak/`, `CLAUDE.md` §"Marca y assets"):

| Evento                                          | Pose                             | Confetti |
| ----------------------------------------------- | -------------------------------- | -------- |
| Curso hecho (sin otro logro)                    | `celebration-1.webp` en el toast | No       |
| Ruta completa                                   | `celebration-2.webp`             | Sí       |
| Subida de nivel                                 | `celebration-3.webp`             | Sí       |
| Insignia nueva (también al pasar a "En curso") | `celebration-4.webp`             | Sí       |

**Cuándo se abre el modal:**

- **Uno solo por acción.** Si un mismo click dispara varios logros (el último paso de una ruta, que
  además sube de nivel y da "Ruta completa"), se abre **un solo** modal que lista todo, con la pose
  del de mayor prioridad: ruta completa > nivel > insignia (`mainCelebration`). El XP del curso va
  como primer ítem de ese modal, sin toast aparte: en un celular bajo, el toast tapaba el botón
  "¡Seguir!".
- **Nunca encima de otro diálogo.** Si el detalle del paso (spec 12) o el quiz (spec 13) están
  abiertos, la celebración (toast o modal) espera a que se cierren. Al aprobar el quiz, su
  resultado ya dice que el curso quedó hecho, y la celebración aparece al cerrarlo: un toast encima
  tapaba el botón "Cerrar" del quiz a 360 px. Pasar a "En curso" desde el detalle (que no se cierra
  solo) abre el modal cuando el usuario cierra el detalle.
- **Después de la coreografía del mapa.** Cuando el paso pasa a "Hecho" en la vista de mapa, el
  modal espera `max(0, ARRIVAL_DELAY_MS − tiempo desde el click)`: la coreografía arranca con el
  cambio optimista, y la respuesta de la action puede llegar antes o después de que termine. En la
  lista, al pasar a "En curso" o con `prefers-reduced-motion`, no hay espera.

## Modelo de datos

### Racha (ya existe, ADR 0005) y el FK que cambia

Los días con avance están en `streak_activities` (un día por fecha local, sumado por
`submit_quiz_attempt` al aprobar un quiz y por `record_step_activity` al pasar un paso a "En curso"
o "Hecho"); la última zona usada queda en `profiles.timezone`. `lib/gamification/streak.ts` ya
expone `computeStreak(days, today)` → `{ current, best, isActiveToday }` y
`todayInTimeZone(timeZone, now?)`.

El único cambio de esquema: hoy `streak_activities.source_attempt_id` apunta a `quiz_attempts` con
`on delete cascade`, y `quiz_attempts.path_id` apunta a `learning_paths` también con
`on delete cascade`. Borrar una ruta arrastra los días que salieron de aprobar sus quizzes. La
migración lo cambia a `on delete set null`: el día queda sin intento de origen, igual que los que
registra `record_step_activity`, que ya tienen `source_attempt_id` null.

```sql
-- El nombre es el que Postgres le dio al FK inline de 20260923120000; se confirma en el paso 1.
alter table public.streak_activities
  drop constraint streak_activities_source_attempt_id_fkey,
  add constraint streak_activities_source_attempt_id_fkey
    foreign key (source_attempt_id) references public.quiz_attempts (id) on delete set null;
```

El `unique (source_attempt_id)` admite varios null, así que no choca. `database.types.ts` no cambia
(los tipos generados no incluyen la acción del FK).

### `lib/gamification/xp.ts`

```ts
export const XP_PER_HOUR = 10;

export function courseXp(hours: number): number; // Math.round(hours * XP_PER_HOUR)

// Pasar del nivel n al n + 1 cuesta 100 × n XP: 0 → nivel 1, 100 → 2, 300 → 3, 600 → 4, 1000 → 5.
export function xpRequiredForLevel(level: number): number; // acumulado: 50 × level × (level − 1)

export type LevelProgress = {
  level: number;
  xpIntoLevel: number; // XP ganado dentro del nivel actual
  xpForNextLevel: number; // lo que cuesta el nivel actual completo (100 × level)
};

export function levelFromXp(totalXp: number): LevelProgress;
```

### `lib/gamification/achievements.ts`

```ts
export type AchievementId =
  | "first-step"
  | "first-course"
  | "path-complete"
  | "explorer"
  | "consistency"
  | "marathoner";

export type Achievement = {
  id: AchievementId;
  name: string; // "Primer paso"
  description: string; // "Empezaste tu primer curso"
  howToEarn: string; // "Marca un paso como En curso o Hecho"
};

export type AchievementStats = {
  hasAnyActivity: boolean; // algún día en streak_activities
  completedCourses: number; // cursos distintos con algún paso 'done'
  completedPaths: number; // rutas con ≥1 paso vigente y todos los vigentes 'done'
  createdPaths: number;
  bestStreak: number;
  completedHours: number; // suma de horas de los cursos distintos hechos
};

export const ACHIEVEMENTS: readonly Achievement[];
export function earnedAchievementIds(stats: AchievementStats): AchievementId[];
```

| Id              | Nombre        | Se gana cuando          | Icono (Phosphor)    |
| --------------- | ------------- | ----------------------- | ------------------- |
| `first-step`    | Primer paso   | `hasAnyActivity`        | `FootprintsIcon`    |
| `first-course`  | Primer curso  | `completedCourses >= 1` | `GraduationCapIcon` |
| `path-complete` | Ruta completa | `completedPaths >= 1`   | `FlagCheckeredIcon` |
| `explorer`      | Explorador    | `createdPaths >= 3`     | `CompassIcon`       |
| `consistency`   | Constancia    | `bestStreak >= 7`       | `FireIcon`          |
| `marathoner`    | Maratonista   | `completedHours >= 50`  | `MedalIcon`         |

Los nombres de iconos se verifican contra `@phosphor-icons/react` en el paso 1; el mapeo id → icono
vive en `achievement-grid.tsx`, no en `lib/` (lib no importa React).

### `lib/gamification/summary.ts`

```ts
// Entrada ya normalizada por load-gamification.ts (horas como number, no string de numeric).
export type GamificationInput = {
  paths: {
    id: string;
    steps: { id: string; courseId: number; status: PathStepStatus; hours: number }[];
  }[];
  activityDays: string[];
  today: string; // en la zona del usuario
};

export type GamificationSummary = {
  totalXp: number;
  level: LevelProgress;
  streak: StreakSummary;
  stats: AchievementStats;
  earned: AchievementId[];
  completedPathIds: string[];
};

export function summarizeGamification(input: GamificationInput): GamificationSummary;

// Lo que acaba de pasar en la base: el paso cambió de estado y, si el registro de la racha salió
// bien, hoy cuenta como día con avance.
export type StepChange = {
  pathId: string;
  stepId: string;
  status: "in_progress" | "done";
  recordedActivityDay: boolean;
};

export type CelebrationEvents = {
  // Solo si ESTA acción pasó el paso a "Hecho"; null si fue a "En curso" o si ya estaba hecho
  // (rendir otra vez el quiz de un paso hecho). gainedXp = 0: el curso ya contaba por otra ruta.
  completedCourse: { gainedXp: number } | null;
  completedPathId: string | null; // solo si ESTA acción completó la ruta
  levelUp: number | null; // nivel nuevo
  newAchievements: AchievementId[];
};

// Resume `before`, le aplica `change` en memoria, resume otra vez y compara.
export function celebrateStepChange(
  before: GamificationInput,
  change: StepChange,
): CelebrationEvents;

export type MainCelebration = "path-complete" | "level-up" | "achievement";

// El logro que decide la pose del modal (ruta > nivel > insignia); null = no hay modal.
export function mainCelebration(events: CelebrationEvents): MainCelebration | null;
```

**Reglas del cálculo:**

- El XP cuenta **cursos distintos**: el mismo curso hecho en dos rutas suma una vez
  (`courseId` como clave). Las horas son las del curso (`courses.hours`), no las del paso.
- Los pasos `discarded` no suman nada, aunque tengan `completed_at` viejo.
- Borrar una ruta (spec 09) resta el XP de los cursos que solo estaban hechos en ella. Los días de
  `streak_activities` no se borran: son del usuario, no de la ruta (ver el FK de arriba).
- Aplicar el cambio en memoria es cambiar el estado de un paso y, si `recordedActivityDay`, sumar
  `today` a `activityDays`: exactamente lo que hicieron el update y el RPC en la base.
- Si el paso no aparece en `before` (no debería: la RLS ya filtró), no hay nada que celebrar.

### `lib/gamification/load-gamification.ts`

```ts
import "server-only"; // mismo patrón que lib/ai/personalize-path.ts

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

// Para las actions: "hoy" sale de la zona que mandó el navegador.
export async function loadGamificationInput(
  supabase: ServerSupabase,
  today: string,
): Promise<GamificationInput>;

// Para el dashboard y el perfil: "hoy" sale de profiles.timezone, como loadStreak en /paths/[id].
export async function loadGamification(
  supabase: ServerSupabase,
  userId: string,
): Promise<{ input: GamificationInput; summary: GamificationSummary }>;
```

Queries en paralelo, filtradas por la RLS del dueño: (1) `learning_paths` con
`path_steps(id, course_id, status, courses(hours))` embebido; (2) `streak_activities` con
`activity_date`; y, solo en `loadGamification`, (3) `profiles.timezone` para calcular "hoy" con
`todayInTimeZone`. `/profile` le pasa `input.activityDays` e `input.today` a la `StreakCard`. Un
error de Supabase se lanza; cada llamador decide qué hacer (ver abajo y Decisiones).

### Cambio en `setStepStatus` y `submitQuizAttempt`

```ts
// setStepStatus
Promise<{ ok: true; gamification?: CelebrationEvents } | ActionFailure>;

// submitQuizAttempt: el QuizDialog no cambia, porque ya le pasa el AttemptResult completo a
// onAttemptSaved. Opcional para no tocar los fixtures de quiz-dialog.test.tsx (spec 13).
export type AttemptResult = z.infer<typeof attemptResultSchema> & {
  gamification?: CelebrationEvents;
};
```

Si el estado nuevo es `done`, `setStepStatus` primero busca el `course_id` del paso y si ese curso
tiene un quiz con `is_active` (el filtro no sobra: la RLS le deja ver los desactivados al admin). Si
lo tiene, devuelve `ActionFailure` con "Este curso se completa aprobando su quiz." y no toca nada
(ADR 0007). La UI no llega a pedirlo, porque abre el quiz, así que esto solo cubre una página con
datos viejos o una llamada directa a la action. Como las otras reglas de transición, vive en la
action y no en la base. Volver de `done` a `in_progress` o `pending` sigue libre, y para volver a
`done` hay que aprobar el quiz otra vez.

Orden dentro de `setStepStatus` cuando el estado nuevo es `in_progress` o `done`:
`loadGamificationInput` con `todayInTimeZone(timeZone)` (antes) → update del paso →
`record_step_activity` (ya existe; `recordStreakDay` pasa a devolver si pudo registrar el día) →
`celebrateStepChange`. En `submitQuizAttempt`: `loadGamificationInput` → RPC → si
`attempt.passed`, `celebrateStepChange` con `status: "done"` y `recordedActivityDay: true` (el RPC
registra el día al aprobar). Un reenvío idempotente no celebra nada, porque el paso ya estaba hecho
en el "antes". Si la carga falla, el cambio **igual se confirma** (`ok: true` sin `gamification`) y
el error se registra con `console.error`: la gamificación nunca rompe marcar un paso ni entregar un
quiz.

## Plan de implementación

1. **Verificación de APIs.** Con Context7: `canvas-confetti` (opciones, colores en HEX,
   `disableForReducedMotion`, import dinámico en Next), `Dialog` y `toast` de Base UI
   (`title: ReactNode` en `toast.add`) e `Intl.DateTimeFormat().resolvedOptions().timeZone`. En
   `node_modules/next/dist/docs/`: server actions con varios argumentos y `server-only`. Confirmar
   que existen los 7 iconos de Phosphor nombrados y el nombre real del FK
   `streak_activities_source_attempt_id_fkey` (MCP de Supabase, `pg_constraint`). Verificación:
   anotar qué se confirmó; nada se escribe sin verificar.
2. **Migración del FK + pgTAP.** La migración de `on delete set null` y
   `supabase/tests/streak_days_survive_path_delete.sql`: con un quiz aprobado en una ruta, borrar la
   ruta deja el día en `streak_activities` con `source_attempt_id` null. Se aplica con
   `npx supabase db push`. Verificación: `npx supabase test db` pasa, con el test nuevo y
   `quizzes_progress_streak.sql`.
3. **XP y niveles + tests.** `xp.ts` y `xp.test.ts`: `courseXp(10) = 100`, `courseXp(2.5) = 25`;
   `levelFromXp(0)` es nivel 1 con 0/100; `levelFromXp(100)` es nivel 2 con 0/200;
   `levelFromXp(1200)` es nivel 5 con 200/500. La racha no necesita trabajo nuevo: `streak.ts` y
   `streak.test.ts` (ADR 0005) ya cubren sus casos. Verificación: `npm run test` en verde.
4. **Insignias y resumen + tests.** `achievements.ts`, `summary.ts` y sus tests:
   - un curso repetido en dos rutas suma una vez, y un paso descartado no suma;
   - una ruta con un paso `done` y uno `discarded` cuenta como completa; una sin pasos vigentes, no;
   - `celebrateStepChange` detecta subida de nivel, insignias nuevas y ruta completada solo cuando
     cambian;
   - `gainedXp = 0` cuando el curso ya contaba por otra ruta, y `completedCourse = null` cuando el
     paso ya estaba hecho;
   - el primer paso a "En curso" da `first-step` sin `completedCourse`, y con
     `recordedActivityDay: false` no se suma el día;
   - `mainCelebration` respeta la prioridad ruta > nivel > insignia.

   Verificación: `npm run test`.
5. **Carga del servidor.** `load-gamification.ts`. Verificación: llamado temporalmente desde el
   dashboard con un usuario real, el XP coincide con `sum(round(hours × 10))` calculado a mano con
   SQL sobre sus cursos distintos hechos.
6. **Actions.** Excepción en `setStepStatus` y `submitQuizAttempt` (ver Modelo de datos).
   Verificación:
   - marcar "Hecho" o aprobar el quiz del curso devuelve `gamification` con el XP del curso;
   - el primer "En curso" de un usuario nuevo devuelve `first-step`, y volver a "Pendiente" no
     devuelve nada;
   - rendir otra vez el quiz de un paso hecho no celebra nada;
   - una falla en la carga no rompe el cambio de estado;
   - `done` en un curso con quiz activo se rechaza sin tocar el paso; sin quiz activo, se acepta
     (ADR 0007).
7. **Componentes.** `StreakIndicator`, `AchievementGrid`, `CelebrationDialog`, `celebrate.ts` y
   `use-celebration.ts`; `npm install canvas-confetti` y `@types/canvas-confetti`. Verificación:
   `npm run build` pasa y `canvas-confetti` no está en el bundle inicial de `/paths/[id]` (solo en un
   chunk aparte).
8. **Celebración en la ruta.** Excepción en `path-steps-view.tsx`; con el ADR 0007, también en
   `step-status-toggle.tsx` y la regla del toast en `app/globals.css`. Verificación en el
   navegador:
   - los cuatro casos de la tabla de poses, y marcar el último paso de una ruta abre un solo modal;
   - en el mapa, el modal aparece después de que la mascota llega al próximo paso;
   - el primer "En curso" desde el detalle abre el modal al cerrar el detalle;
   - aprobar el quiz no muestra nada sobre el resultado; al cerrarlo, sale el toast o el modal (con
     el XP adentro);
   - en un curso con quiz, "Hecho" abre el quiz desde la lista y desde el detalle, y el paso no
     cambia hasta aprobarlo; en un curso sin quiz, "Hecho" funciona como antes;
   - el estado activo del toggle se distingue en tema claro y oscuro.
9. **Dashboard.** Excepción en la cabecera del 09. Verificación: el nivel, el XP y la racha
   coinciden con el paso 5; el avatar lleva a `/profile`; si la carga de gamificación falla, la
   grilla de rutas se sigue viendo.
10. **Perfil.** `app/(app)/profile/page.tsx` con `requireUser()`, su `loading.tsx` y `/profile` en
    `PRIVATE_PATH_PREFIXES` de `proxy.ts`. Verificación: un usuario sin rutas ve nivel 1, 0 XP, racha
    0, las 6 insignias bloqueadas y las estadísticas en 0; uno con datos ve lo mismo que el
    dashboard; sin sesión, `/profile` redirige a `/login` sin mostrar la carga.
11. **Pulido visual y accesibilidad.** Revisión con la skill `ui-ux-pro-max`: contraste de las
    insignias bloqueadas y de los colores del confetti en tema claro y oscuro, foco del modal, 360 px
    de ancho, y "reducir movimiento" emulado (sin confetti, el modal igual aparece).
12. **Cierre.** Actualizar `docs/SPECS-MAP.md` y `docs/ROADMAP.md` (ver Alcance). Verificación:
    `npm run test`, `npm run typecheck`, `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] Completar un curso de N horas suma `round(N × 10)` XP; el mismo curso hecho en otra ruta no
      vuelve a sumar.
- [x] Desmarcar un paso hecho resta su XP (y baja de nivel si corresponde) sin mostrar ningún aviso;
      volver a marcarlo lo suma y lo celebra de nuevo.
- [x] Borrar una ruta resta el XP de los cursos que solo estaban hechos en ella, y la racha no
      cambia aunque alguno de sus días haya salido de aprobar un quiz de esa ruta.
- [x] Los niveles siguen la curva 0 / 100 / 300 / 600 / 1000 XP para los niveles 1 a 5, y `XpBar`
      muestra el XP dentro del nivel actual sobre el costo de ese nivel.
- [x] La racha se sigue calculando como en el ADR 0005 (un día por fecha local; viva si el último
      avance fue hoy o ayer): este spec no cambia `streak.ts` y sus tests siguen pasando.
- [x] Las 6 insignias se ganan exactamente con las condiciones de la tabla y se muestran en
      `/profile`: ganadas a color, bloqueadas con candado y "Cómo ganarla".
- [x] Marcar un paso "Hecho" sin otro logro muestra el toast "+N XP · «Curso»" con la mascota; si
      el curso ya contaba en otra ruta, el toast lo dice y no muestra XP; si el paso ya estaba hecho,
      no aparece nada. Con un logro mayor, el XP va dentro del modal y no hay toast.
- [x] Completar una ruta, subir de nivel o ganar una insignia abre un solo modal con confetti, la
      pose correspondiente y la lista de todo lo ganado.
- [x] Pasar un paso a "En curso" celebra con el modal las insignias nuevas ("Primer paso",
      "Constancia"), sin toast de XP.
- [x] El modal nunca se abre encima de otro diálogo: con el detalle del paso o el quiz abiertos,
      aparece al cerrarlos.
- [x] En el mapa, el modal aparece después de que la mascota llegó al próximo paso; en la lista,
      enseguida.
- [x] Con "reducir movimiento" no hay confetti, y el toast y el modal aparecen igual.
- [x] Si falla el registro de actividad o el cálculo de gamificación, el paso igual queda marcado y
      no aparece ningún error al usuario.
- [x] Aprobar el quiz del curso da el mismo XP y la misma celebración que marcarlo "Hecho", al cerrar
      el quiz: nada tapa el resultado ni el botón "Cerrar".
- [x] En un curso con quiz activo, "Hecho" (en la lista o en el detalle del mapa) abre el quiz y el
      paso queda "Hecho" solo al aprobarlo; `setStepStatus(…, "done")` lo rechaza aunque se llame
      directo. Un curso sin quiz activo se sigue marcando "Hecho" con el toggle.
- [x] Un paso aprobado que vuelve a "En curso" o "Pendiente" necesita aprobar el quiz otra vez
      para volver a "Hecho".
- [x] El estado activo del toggle (Pendiente / En curso / Hecho) se distingue en tema claro y
      oscuro, en la lista y en el detalle del mapa.
- [x] El dashboard muestra `XpBar` y la racha en la cabecera, con el recordatorio de
      `reminder.webp` cuando la racha está viva y hoy todavía no hubo avance; el avatar lleva a
      `/profile`. Si la gamificación no carga, las rutas se siguen viendo.
- [x] `/profile` muestra nivel, XP, la `StreakCard`, las 3 estadísticas y las 6 insignias, con un
      link de vuelta al panel; sin sesión, `proxy.ts` redirige a `/login`.
- [x] `/profile` y la cabecera del dashboard no tienen scroll horizontal a 360 px, en tema claro y
      oscuro.
- [x] `canvas-confetti` se carga solo al celebrar (chunk aparte, no en el bundle inicial).
- [x] `profiles` sigue sin política de update y este spec no le agrega columnas.
- [x] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` y `npx supabase test db`
      pasan.

## Decisiones

- **XP, nivel e insignias derivados al leer, no guardados** (cambia lo que decían `SPECS-MAP.md` y
  `ROADMAP.md`). El XP sale de los pasos `done` que existen hoy: no se puede desincronizar, no hay
  forma de farmearlo marcando y desmarcando, y no obliga a abrir escritura sobre `profiles`, que
  no tiene política de update a propósito (spec 02: si no, cualquiera se pone `role = 'admin'`).
  Descartado: columnas en `profiles` actualizadas por trigger (se desincronizan y necesitan
  `security definer` sobre la tabla del rol) y un registro "ganado para siempre" (más SQL, y
  mantiene XP de rutas que el usuario borró).
- **Insignias con catálogo en código**, no tablas `achievements` / `user_achievements`: son 6,
  cambian con un deploy, y derivarlas mantiene una sola fuente de verdad con el XP. Consecuencia
  aceptada: una insignia se puede perder (borrar la ruta completa quita "Ruta completa" si era la
  única), y no hay fecha de "ganada el…".
- **La racha es la de Ariel (`streak_activities`), no una tabla propia** (ADR 0005). Cuenta
  cualquier avance (quiz aprobado, paso a "En curso" o "Hecho"): completar un curso de 5–30 h por
  día haría que la racha casi nunca pase de 1.
- **Borrar una ruta no borra días de racha: el FK pasa a `on delete set null`.** Los días son del
  usuario, no de la ruta, y hoy solo sobrevivían los que salían del toggle. Descartados: aceptar la
  pérdida y corregir el criterio (dos días iguales se comportarían distinto según cómo se ganaron)
  y un fix aparte fuera de SDD (sin test ni registro). Consecuencia: el 14 crea una migración, la
  regla 6 del mapa lo suma a la lista y el 14 no se implementa en paralelo con el 15.
- **Día local del navegador.** La comunidad de DevTalles está repartida por LATAM y España: cortar
  el día en UTC o en Lima rompe rachas a media tarde o a la mañana. Ya lo resolvió el ADR 0005: la
  zona viaja en cada `setStepStatus` y en cada entrega de quiz, y queda en `profiles.timezone` para
  los Server Components.
- **10 XP por hora y curva de 100 × n.** El XP respeta el esfuerzo real (un curso de 30 h vale
  tres veces uno de 10 h), y una ruta típica de ~120 h lleva a nivel 5: se sube seguido al
  principio y se frena después. Descartados: XP fijo por curso y bonus por ruta completa (crear
  rutas cortas se volvería una forma de farmear).
- **Celebración escalonada y nunca apilada.** Toast en cada curso hecho, confetti solo para logros
  mayores: si todo dispara confetti, deja de significar algo. Un solo modal por acción, con la pose
  del logro de mayor prioridad, y nunca encima del detalle del paso ni del quiz: dos diálogos
  apilados complican el foco y tapan el resultado del quiz.
- **La celebración se calcula en la action, con el "después" en memoria.** El XP depende de todas
  las rutas del usuario y el cliente solo conoce la ruta abierta, así que va en el servidor. Se
  carga el "antes" una vez (2 queries en paralelo) y el "después" es ese mismo "antes" con el
  cambio aplicado: es puro, se testea sin base y no depende de lecturas intermedias. Descartado:
  releer todo después del update (6 queries en vez de 2, contando `profiles.timezone`, que en la
  action sobra porque la zona llega por parámetro).
- **El diff sabe si el paso ya estaba hecho.** `gainedXp = 0` significaba dos cosas: "el curso ya
  contaba por otra ruta" y "este paso ya estaba hecho" (rendir otra vez el quiz de un curso hecho,
  o un reenvío idempotente). Solo la primera merece el toast; la segunda no celebra nada.
- **"Hecho" exige aprobar el quiz cuando el curso tiene uno (ADR 0007, decidido durante la
  implementación).** Al probar el paso 8, el estado y el quiz se sentían como dos cosas separadas:
  se podía marcar "Hecho" sin rendir nada, y el quiz no significaba nada. Ahora "Hecho", en un curso
  con quiz activo, abre el quiz, y la action rechaza `done` directo. Un curso sin quiz se sigue
  completando con el toggle, porque si no nunca se podría terminar ni la ruta. La regla vive en la
  action y en la UI, como las otras transiciones (sin trigger): saltarla escribiendo directo en la
  API solo engaña al propio usuario, el mismo riesgo que ya acepta `record_step_activity`. Desmarcar
  un paso aprobado obliga a rendir el quiz de nuevo: más simple que recordar intentos aprobados y
  coherente con "Hecho = quiz aprobado". Descartados: exigir el quiz también en cursos sin quiz, y
  un trigger en `path_steps` (migración + pgTAP para una regla que la action ya cubre).
- **La celebración nunca tapa otro diálogo ni se tapa a sí misma** (cambiado durante los pasos 8 y
  11). Primero el toast iba debajo del fondo borroso del quiz. Después, encima, pero a 360 px
  tapaba el botón "Cerrar" del quiz, y con el modal de logro, el "¡Seguir!". Queda así: la
  celebración espera a que se cierre el quiz o el detalle, y si hay logro mayor el XP va dentro
  del modal. La regla de `globals.css` sigue para los toasts que sí aparecen con un diálogo
  abierto (errores, "Deshacer").
- **Se celebra al pasar a "Hecho" y también al pasar a "En curso", solo con insignias.** En el
  flujo natural (Pendiente → En curso → Hecho), "Primer paso" se gana en "En curso": si solo se
  celebrara "Hecho", la primera insignia del usuario casi nunca tendría festejo. "Explorador" (3
  rutas) sigue sin celebración, para no tocar la generación del spec 07.
- **Página `/profile` nueva, dashboard como resumen.** El dashboard sigue siendo sobre las rutas;
  el detalle (insignias, estadísticas) va al perfil, al que se llega desde el avatar. Ruta en
  inglés, como `/paths` y `/dashboard`. La racha del perfil es la `StreakCard` de `/paths/[id]`
  (reusar antes que crear), y por eso no hay estadística de "mejor racha": sería el mismo número dos
  veces.
- **Lo accesorio no bloquea lo esencial.** Mismo principio que la IA del spec 11: si la
  gamificación falla en una action, el resultado es `ok: true` sin celebración; en el dashboard, la
  fila de XP y racha no se muestra y la grilla de rutas sí. En `/profile` el error llega al
  `app/error.tsx` existente, porque ahí la gamificación es todo el contenido.
- **Una query repetida en el dashboard, aceptada.** El 09 ya lee las rutas con sus pasos, y
  `loadGamification` las vuelve a leer. Reusar las filas del 09 ataría el cálculo a la forma de esa
  query; una lectura más, filtrada por RLS e índice, es más barata que ese acoplamiento.
- **La orquestación vive en `use-celebration.ts`, no en `path-steps-view.tsx`.** La espera de la
  coreografía y la cola del modal detrás de otros diálogos son lógica del 14; dejarlas en el archivo
  del 08 agrandaría la excepción a la regla 5.
- **Sin tocar `components/ui/toast.tsx` ni `components/quizzes/*`.** `toast.add` ya acepta
  `ReactNode` en `title`, y el `QuizDialog` ya le pasa el `AttemptResult` completo a
  `onAttemptSaved`: basta con que `AttemptResult` sume `gamification?`.
- **Insignias como medallas (pedido durante el paso 11).** `AchievementMedal` es una composición
  nueva de `achievement-grid.tsx`: una roseta de premio (disco con el icono y dos cintas que
  cuelgan con la punta en V; con las cintas hacia arriba parecían orejas), solo con tokens (el
  degradado del botón `brand`, `muted`, `shadow-brand-glow`) y los iconos de Phosphor. Se usa en el perfil y en el modal de logro. La
  revisión del paso 11 midió el contraste: con `opacity-60` en toda la tarjeta, "Cómo ganarla" quedaba
  en 2.9:1 (claro) y 3.0:1 (oscuro), así que la atenuación va solo en el dibujo. Del confetti se
  cambió `--accent`, que casi no se veía sobre el fondo (1.2:1 y 1.4:1), por `--chart-2` (lavanda) y
  `--primary-end`.
- **`canvas-confetti` como dependencia nueva** (el 12 rechazó React Flow, este sí agrega una).
  Pesa ~6 KB, se carga con `import()` solo al celebrar y trae `disableForReducedMotion`. Un
  confetti hecho a mano sería más código propio para verse peor. Solo acepta colores HEX, así que
  `celebrate.ts` convierte los tokens OKLCH del tema al disparar en vez de fijar colores a mano.

## Riesgos

- **Conflicto con la coreografía del spec 12.** El modal no puede abrirse mientras la mascota viaja.
  Mitigación: la espera usa `ARRIVAL_DELAY_MS` de `lib/path-map/motion.ts`, contada desde el click,
  no un número propio.
- **Costo de `setStepStatus` y `submitQuizAttempt`.** Suman 2 queries en paralelo **antes** del
  update, así que agregan un viaje a la base a cada "En curso", "Hecho" y entrega de quiz.
  Mitigación: son lecturas livianas filtradas por RLS e índices existentes
  (`learning_paths_user_id_idx`); si en la prueba del paso 6 el toast tarda más de ~1 s, se revisa
  el plan de la query embebida antes de tocar el diseño.
- **El "después" en memoria se desalinea de la base.** Si algún día el update o los RPC hacen algo
  más que cambiar el estado y registrar el día, `celebrateStepChange` celebraría de más o de menos.
  Mitigación: la regla está escrita en el Modelo de datos, los tests del paso 4 la fijan, y con dos
  pestañas abiertas lo peor es una celebración de más o de menos, nunca un dato mal guardado.
- **El nombre del FK no es el esperado.** Si Postgres lo nombró distinto, el `drop constraint`
  falla en `db push`. Mitigación: el paso 1 lo confirma contra la base antes de escribir la
  migración.
- **Zona del navegador distinta entre dispositivos.** Un usuario que viaja o usa dos zonas puede
  ganar o perder un día en el borde. Aceptado: afecta a una racha, no a datos de la ruta.
- **`reminder.webp` con racha 0.** No se muestra: recordar "no pierdas tu racha" sin racha sería
  confuso. Solo aparece con racha ≥ 1 y sin avance hoy.
