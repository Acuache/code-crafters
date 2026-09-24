# SPEC 14 — Gamificación: XP por curso, niveles, racha, insignias y celebración al completar

> **Estado:** Borrador
> **Depende de:** SPEC 02, SPEC 08, SPEC 09, SPEC 12, SPEC 13, ADR 0005 (quizzes y racha de Ariel)
> **Fecha:** 2026-09-24
> **Objetivo:** Darle al usuario XP por cada curso completado (10 XP por hora), niveles, una racha
> de días con avance (la de `streak_activities`, ya integrada por el ADR 0005) y 6 insignias, todo
> derivado de sus datos reales al leer. Se muestra en el
> dashboard y en una página `/profile` nueva, y marcar un paso como "Hecho" en `/paths/[id]` se
> celebra con un toast, o con confetti y la mascota cuando hay un logro mayor.

## Por qué existe este spec

`docs/ROADMAP.md` lo pone en SHOULD ("XP por curso según horas, niveles, 5 o 6 insignias, racha y
confetti") y el guion del video lo usa en el segundo 45: "marcar un curso, XP e insignia". Una ruta
de 100 horas se recorre en semanas, y sin un premio intermedio marcar un paso como hecho no
cambia nada visible fuera de una barra. El concurso se evalúa navegando la app (`ENUNCIADO.md`,
criterio 4), y el patrón de Duolingo (XP + racha) es el que ya inspira el mapa del spec 12.

**Dependencias, una por motivo distinto:**

- **SPEC 02** — `path_steps.status` / `completed_at`, `learning_paths` y la RLS por dueño sobre las
  que se deriva todo. `profiles` sigue **sin** política de update (ver Decisiones).
- **SPEC 08** — `setStepStatus` en `app/(app)/paths/[id]/actions.ts` (ya escribe `completed_at`
  "para la gamificación") y el estado optimista de `components/paths/path-steps-view.tsx`.
- **SPEC 09** — la cabecera de `app/(app)/dashboard/page.tsx`, donde va el resumen.
- **SPEC 12** — `handleStatusChange` como único punto de enganche y los tiempos de
  `lib/path-map/motion.ts`: la celebración espera a que termine la coreografía del mapa.
- **ADR 0005** — la racha ya existe: `streak_activities` (suma al aprobar un quiz y, vía
  `record_step_activity`, al pasar un paso a "En curso"/"Hecho"), `profiles.timezone` y
  `lib/gamification/streak.ts` (`computeStreak`, `todayInTimeZone`, con tests). `setStepStatus` ya
  recibe `timeZone`. Aprobar el quiz del curso (`submitQuizAttempt`) es la otra forma de completar
  un paso.

## Alcance

**Entra:**

- **Sin migración**: la racha ya vive en `streak_activities` (ADR 0005) y XP, nivel e insignias
  se derivan al leer.
- `lib/gamification/xp.ts` — XP por curso y nivel a partir del XP total. Puro.
- `lib/gamification/streak.ts` — **ya existe** (ADR 0005); se reusa tal cual.
- `lib/gamification/achievements.ts` — el catálogo de las 6 insignias y su evaluación. Puro.
- `lib/gamification/summary.ts` — `summarizeGamification` (arma el resumen completo) y
  `diffGamification` (qué hay que celebrar entre un antes y un después). Puro.
- `lib/gamification/load-summary.ts` — única pieza con I/O: las dos queries a Supabase y la llamada
  a `summarizeGamification`. Solo servidor.
- Tests: `xp.test.ts`, `achievements.test.ts`, `summary.test.ts` en `lib/gamification/`
  (`streak.test.ts` ya existe).
- `components/gamification/xp-bar.tsx` — **ya existe**: se conecta a datos reales y sus props pasan
  a inglés (`level`, `currentXp`, `nextLevelXp`), con el ajuste del único uso en
  `app/sistema-diseno/_components/patterns-section.tsx`.
- `components/gamification/streak-indicator.tsx` — versión compacta de la racha para la cabecera
  del dashboard: `FireIcon`, o `public/streak/reminder.webp` + "Avanzá hoy para no perder tu racha"
  si hoy todavía no hubo avance. En `/paths/[id]` y `/profile` se reusa la `StreakCard` de Ariel.
- `components/gamification/achievement-grid.tsx` — las 6 insignias: ganadas a color, bloqueadas en
  gris con la condición para ganarlas.
- `components/gamification/celebration-dialog.tsx` — el modal de logro mayor con la pose de la
  mascota que corresponda.
- `components/gamification/celebrate.ts` — dispara el confetti con `import()` dinámico de
  `canvas-confetti`.
- `app/(app)/profile/page.tsx` — página nueva `/profile` (ver Composición de UI).
- `package.json`: `canvas-confetti` y `@types/canvas-confetti` (dev).
- **Excepción a la regla 5 en `app/(app)/paths/[id]/actions.ts` (spec 08):** `setStepStatus` (que
  ya recibe `timeZone` y registra la racha, ADR 0005) devuelve `gamification` cuando el paso pasa a
  `done`; `submitQuizAttempt` lo devuelve cuando el quiz del curso completa el paso. `discardStep` y
  `restoreStep` no cambian.
- **Excepción a la regla 5 en `components/paths/path-steps-view.tsx` (spec 08, ya tocado por el
  12 y el ADR 0005):** con el resultado de `handleStatusChange` o de `onAttemptSaved` del quiz,
  mostrar el toast o el modal de celebración. Nada del mapa ni de la lista cambia.
- **Excepción a la regla 5 en `app/(app)/dashboard/page.tsx` (spec 09, ya tocado por el 10 y el
  11):** en la cabecera, nivel + `XpBar` + `StreakIndicator`, y el avatar/nombre como link a
  `/profile`. La grilla de rutas no cambia.
- Actualizar `docs/SPECS-MAP.md` (fila 14, §7 "14 · gamification", regla 5 con la propiedad y las
  tres excepciones de arriba, regla 6 y §6) y el modelo de datos de `docs/ROADMAP.md` (ya no hay
  `profiles.xp/level/streak` ni tablas `achievements`/`user_achievements`).

**Qué NO entra (queda para otros specs o fuera):**

- Columnas `xp` o `level` en `profiles`, y las tablas `achievements` / `user_achievements` que
  preveía el mapa (ver Decisiones). Cualquier cambio a la racha o a los quizzes (ADR 0005).
- Bonus de XP por completar una ruta, por racha o por cualquier otra cosa: solo los cursos dan XP.
- Celebrar insignias que no salen de marcar un paso ("Explorador" al crear la 3.ª ruta): aparecen
  en el perfil, pero la action de generación del spec 07 no se toca.
- Aviso o toast al desmarcar un paso hecho: el XP y el nivel bajan en silencio.
- Tabla de posiciones, XP visible para otros usuarios, compartir insignias (el spec 15 decide si
  la ruta pública muestra algo).
- "Congelar" la racha, recordatorios por mail o notificaciones.
- Editar el perfil (nombre, avatar): `/profile` es de solo lectura.
- Gamificación en la ruta pública (spec 15) o en el panel de admin (spec 10).
- Tocar `lib/progress/*` (08/09), `lib/paths/*` (04) o `lib/path-map/*` (12): se leen, no se
  modifican.

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*`, los assets de `public/streak/` y
`@phosphor-icons/react` (sufijo `Icon`; `@phosphor-icons/react/ssr` en los Server Components), sin
colores, radios ni sombras fuera de los tokens del tema (`CLAUDE.md` §"UI: componer, no crear").
Los cuatro componentes nuevos de `components/gamification/` son **composiciones** con nombre propio
porque se usan en dos pantallas (dashboard y perfil) o encapsulan una librería (confetti); ninguno
agrega una pieza visual que no exista.

| Elemento               | Qué se reusa                                                                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nivel + XP             | `XpBar` (existente, sobre `Progress`): "Nivel N" y "X / Y XP" del nivel actual                                                                                                                                                                                 |
| Racha                  | `StreakIndicator`: `FireIcon weight="fill"` + "N días" en `font-heading tabular-nums`. Con racha viva y sin avance hoy, `reminder.webp` a 48 px (`alt=""`) + texto de recordatorio. Racha 0: "Empezá tu racha hoy", sin imagen                                 |
| Cabecera del dashboard | La `header` del 09 intacta; debajo del saludo, una fila con `XpBar` y `StreakIndicator`. Avatar + nombre envueltos en `Link href="/profile"` con `focus-visible:ring`                                                                                          |
| Perfil — cabecera      | Mismo patrón de la cabecera del dashboard (`brand-gradient-soft`, `Avatar`, `Eyebrow` "Tu perfil", nombre como `h1`), `XpBar` y `StreakIndicator` en grande, `Button variant="outline"` "Volver al panel" (`ArrowLeftIcon`)                                    |
| Perfil — estadísticas  | 4 `Card` pequeñas: cursos hechos, horas completadas, mejor racha, rutas creadas. Número en `text-title tabular-nums`, etiqueta en `text-muted-foreground`                                                                                                      |
| Perfil — insignias     | `AchievementGrid`: grilla de 6 `Card`; icono Phosphor por insignia (ver Modelo de datos), nombre, descripción. Bloqueada: `opacity-60`, `LockSimpleIcon` y "Cómo ganarla: …". Ganada vs. bloqueada se distingue por icono y texto, no solo color               |
| Toast de paso hecho    | `toast.add` del `Toaster` que ya monta `path-steps-view.tsx`: "+N XP · «Curso»" con `celebration-1.webp` a 40 px. Si el curso ya contaba en otra ruta: "«Curso» ya sumaba XP en otra de tus rutas", sin imagen                                                 |
| Modal de logro mayor   | `Dialog` + `DialogContent` + `DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`: pose de la mascota a 160 px, título según el logro principal, lista de todo lo ganado (ruta, nivel, insignias con su icono), `Button variant="brand"` "¡Seguir!" |
| Confetti               | `canvas-confetti` con los colores del tema leídos de las variables CSS (`--primary`, `--primary-bright`, `--accent`) en el momento de disparar, `disableForReducedMotion: true`                                                                                |

**Qué pose va en cada caso** (`public/streak/`, `CLAUDE.md` §"Marca y assets"):

| Evento            | Pose                             | Confetti |
| ----------------- | -------------------------------- | -------- |
| Paso hecho (solo) | `celebration-1.webp` en el toast | No       |
| Ruta completa     | `celebration-2.webp`             | Sí       |
| Subida de nivel   | `celebration-3.webp`             | Sí       |
| Insignia nueva    | `celebration-4.webp`             | Sí       |

Si un mismo click dispara varios (último paso de una ruta que además sube de nivel y da
"Ruta completa"), se abre **un solo** modal que lista todo, con la pose del evento de mayor
prioridad: ruta completa > nivel > insignia. El toast de XP se muestra igual.

## Modelo de datos

### Racha (ya existe, ADR 0005)

No hay migración. Los días con avance están en `streak_activities` (un día por fecha local, sumado
por `submit_quiz_attempt` al aprobar un quiz y por `record_step_activity` al pasar un paso a "En
curso" o "Hecho"); la última zona usada queda en `profiles.timezone`. `lib/gamification/streak.ts`
ya expone `computeStreak(days, today)` → `{ current, best, isActiveToday }` y
`todayInTimeZone(timeZone, now?)`.

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
  howToEarn: string; // "Marcá un paso como En curso o Hecho"
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
// Entrada ya normalizada por load-summary.ts (horas como number, no string de numeric).
export type GamificationInput = {
  paths: {
    id: string;
    steps: { courseId: number; status: PathStepStatus; hours: number }[];
  }[];
  activityDays: string[];
  today: string;
};

export type GamificationSummary = {
  totalXp: number;
  level: LevelProgress;
  streak: StreakSummary;
  stats: AchievementStats;
  earned: AchievementId[];
  completedPathIds: string[];
};

export function summarizeGamification(
  input: GamificationInput,
): GamificationSummary;

export type CelebrationEvents = {
  gainedXp: number; // 0 si el curso ya contaba por otra ruta
  completedPathId: string | null; // solo si ESTA acción completó la ruta
  levelUp: number | null; // nivel nuevo
  newAchievements: AchievementId[];
};

export function diffGamification(
  before: GamificationSummary,
  after: GamificationSummary,
  pathId: string,
): CelebrationEvents;
```

**Reglas del cálculo:**

- El XP cuenta **cursos distintos**: el mismo curso hecho en dos rutas suma una vez
  (`courseId` como clave). Las horas son las del curso (`courses.hours`), no las del paso.
- Los pasos `discarded` no suman nada, aunque tengan `completed_at` viejo.
- Borrar una ruta (spec 09) resta el XP de los cursos que solo estaban hechos en ella. Los días de
  `streak_activities` no se borran: son del usuario, no de la ruta.

### `lib/gamification/load-summary.ts`

```ts
import "server-only"; // si ya se usa en el repo; si no, se verifica en el paso 1

export async function loadGamificationSummary(
  supabase: SupabaseServerClient,
): Promise<GamificationSummary>;
```

Dos queries, filtradas por la RLS del dueño: (1) `learning_paths` con
`path_steps(course_id, status, courses(hours))` embebido; (2) `streak_activities` con
`activity_date`, más `profiles.timezone` para calcular "hoy" con `todayInTimeZone` (la misma carga
que ya hace `loadStreak` en `app/(app)/paths/[id]/page.tsx`).

### Cambio en `setStepStatus` y `submitQuizAttempt`

```ts
export type StepActionResult =
  | { ok: true; gamification?: CelebrationEvents }
  | { ok: false; message: string };
// AttemptResult (quiz) suma `gamification?: CelebrationEvents` cuando `stepCompleted`.
```

Orden dentro de `setStepStatus` cuando el estado nuevo es `done`: `loadGamificationSummary` (antes)
→ update del paso → `record_step_activity` (ya existe) → `loadGamificationSummary` (después) →
`diffGamification`. En `submitQuizAttempt`, lo mismo alrededor del RPC, solo si el quiz es de curso.
Si una de las cargas falla, el cambio **igual se confirma** (`ok: true` sin `gamification`) y el
error se registra con `console.error`: la gamificación nunca rompe marcar un paso ni entregar un quiz.

## Plan de implementación

1. **Verificación de APIs.** Con Context7: `canvas-confetti` (opciones, `disableForReducedMotion`,
   colores, import dinámico en Next), `Dialog` y `toast` de los componentes de `components/ui/`
   sobre Base UI, y `Intl.DateTimeFormat().resolvedOptions().timeZone`. En
   `node_modules/next/dist/docs/`: server actions con varios argumentos y `server-only`. Confirmar
   que existen los 7 iconos de Phosphor nombrados. Verificación: anotar qué se confirmó; nada se
   escribe sin verificar.
2. **Racha (sin trabajo nuevo).** Confirmar que la migración `20260924130000_unify_streak.sql`
   (ADR 0005) está aplicada y que `supabase/tests/quizzes_progress_streak.sql` pasa.
3. **XP y niveles + tests.** `xp.ts` y `xp.test.ts`: `courseXp(10) = 100`, `courseXp(2.5) = 25`;
   `levelFromXp(0)` es nivel 1 con 0/100; `levelFromXp(100)` es nivel 2 con 0/200;
   `levelFromXp(1200)` es nivel 5 con 200/500. Verificación: `npm run test` en verde.
4. **Racha.** Ya hecha en el ADR 0005 (`streak.ts` + `streak.test.ts` cubren estos casos).
   Verificación: `npm run test`.
5. **Insignias y resumen + tests.** `achievements.ts`, `summary.ts` y sus tests: curso repetido en
   dos rutas suma una vez; un paso descartado no suma; una ruta con un paso `done` y uno
   `discarded` cuenta como completa; una ruta sin pasos vigentes no; `diffGamification` detecta
   subida de nivel, insignias nuevas y ruta completada solo cuando cambian entre antes y después,
   y `gainedXp = 0` cuando el curso ya contaba. Verificación: `npm run test`.
6. **Carga del servidor.** `load-summary.ts`. Verificación: llamado temporalmente desde el
   dashboard con un usuario real, el XP coincide con `sum(round(hours × 10))` calculado a mano con
   SQL sobre sus cursos distintos hechos.
7. **Actions.** Excepción en `setStepStatus` y `submitQuizAttempt` (ver Modelo de datos).
   Verificación: marcar "Hecho" o aprobar el quiz del curso devuelve `gamification` con el XP del
   curso; desmarcar no devuelve nada; una falla en la carga no rompe el cambio de estado.
8. **Componentes.** `XpBar` (props en inglés + su uso en `/sistema-diseno`), `StreakIndicator`,
   `AchievementGrid`, `CelebrationDialog` y `celebrate.ts`; `npm install canvas-confetti` y
   `@types/canvas-confetti`. Verificación: `/sistema-diseno` sigue mostrando `XpBar`;
   `npm run build` pasa y `canvas-confetti` no está en el bundle inicial de `/paths/[id]` (solo en
   un chunk aparte).
9. **Celebración en la ruta.** Excepción en `path-steps-view.tsx`: con `gamification` en el
   resultado de `handleStatusChange` o del quiz, muestra
   el toast y, si hay logro mayor, abre `CelebrationDialog` + confetti **después** de la coreografía
   del spec 12 (los tiempos de `lib/path-map/motion.ts`; en la lista, sin espera). Verificación: en
   el navegador, los cuatro casos de la tabla de poses, y marcar el último paso de una ruta abre un
   solo modal.
10. **Dashboard.** Excepción en la cabecera del 09. Verificación: el nivel, el XP y la racha
    coinciden con el paso 6; el avatar lleva a `/profile`.
11. **Perfil.** `app/(app)/profile/page.tsx` con `requireUser()`. Verificación: un usuario sin
    rutas ve nivel 1, 0 XP, racha 0, las 6 insignias bloqueadas y las estadísticas en 0; uno con
    datos ve lo mismo que el dashboard.
12. **Pulido visual y accesibilidad.** Revisión con la skill `ui-ux-pro-max`: contraste de las
    insignias bloqueadas en tema claro y oscuro, foco del modal, 360 px de ancho, y "reducir
    movimiento" emulado (sin confetti, el modal igual aparece).
13. **Cierre.** Actualizar `docs/SPECS-MAP.md` y `docs/ROADMAP.md` (ver Alcance). Verificación:
    `npm run test`, `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] Completar un curso de N horas suma `round(N × 10)` XP; el mismo curso hecho en otra ruta no
      vuelve a sumar.
- [ ] Desmarcar un paso hecho resta su XP (y baja de nivel si corresponde) sin mostrar ningún aviso;
      volver a marcarlo lo suma y lo celebra de nuevo.
- [ ] Borrar una ruta resta el XP de los cursos que solo estaban hechos en ella; la racha no cambia.
- [ ] Los niveles siguen la curva 0 / 100 / 300 / 600 / 1000 XP para los niveles 1 a 5, y `XpBar`
      muestra el XP dentro del nivel actual sobre el costo de ese nivel.
- [ ] Pasar un paso a "En curso" o "Hecho" cuenta el día para la racha en la zona horaria del
      navegador; varios avances el mismo día cuentan una vez.
- [ ] La racha actual es la cantidad de días seguidos que terminan hoy o ayer; si el último avance
      fue hace dos días o más, es 0. La mejor racha nunca baja.
- [ ] Las 6 insignias se ganan exactamente con las condiciones de la tabla y se muestran en
      `/profile`: ganadas a color, bloqueadas con candado y "Cómo ganarla".
- [ ] Marcar un paso "Hecho" muestra el toast "+N XP · «Curso»" con la mascota; si el curso ya
      contaba en otra ruta, el toast lo dice y no muestra XP.
- [ ] Completar una ruta, subir de nivel o ganar una insignia al marcar un paso abre un solo modal
      con confetti, la pose correspondiente y la lista de todo lo ganado.
- [ ] En el mapa, el modal aparece después de que la mascota llegó al próximo paso; en la lista,
      enseguida.
- [ ] Con "reducir movimiento" no hay confetti, y el toast y el modal aparecen igual.
- [ ] Si falla el registro de actividad o el cálculo de gamificación, el paso igual queda marcado y
      no aparece ningún error al usuario.
- [ ] El dashboard muestra nivel, `XpBar` y racha en la cabecera, con el recordatorio de
      `reminder.webp` cuando la racha está viva y hoy todavía no hubo avance; el avatar lleva a
      `/profile`.
- [ ] `/profile` muestra nivel, XP, racha, las 4 estadísticas y las 6 insignias, con un link de
      vuelta al panel; sin sesión redirige a `/login`.
- [ ] `/profile` y la cabecera del dashboard no tienen scroll horizontal a 360 px, en tema claro y
      oscuro.
- [ ] `canvas-confetti` se carga solo al celebrar (chunk aparte, no en el bundle inicial).
- [ ] `profiles` sigue sin política de update y este spec no le agrega columnas.
- [ ] Aprobar el quiz del curso da el mismo XP y la misma celebración que marcarlo "Hecho".
- [ ] `npm run test`, `npm run lint` y `npm run build` pasan.

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
- **Día local del navegador.** La comunidad de DevTalles está repartida por LATAM y España: cortar
  el día en UTC o en Lima rompe rachas a media tarde o a la mañana. La zona viaja en cada
  `setStepStatus` y en cada entrega de quiz, y queda en `profiles.timezone`; al leer, "hoy" se
  calcula con esa zona, porque el Server Component del dashboard no conoce la del navegador (ya
  resuelto por el ADR 0005).
- **10 XP por hora y curva de 100 × n.** El XP respeta el esfuerzo real (un curso de 30 h vale
  tres veces uno de 10 h), y una ruta típica de ~120 h lleva a nivel 5: se sube seguido al
  principio y se frena después. Descartados: XP fijo por curso y bonus por ruta completa (crear
  rutas cortas se volvería una forma de farmear).
- **Celebración escalonada.** Toast en cada paso, confetti solo para logros mayores: si todo
  dispara confetti, deja de significar algo. Un solo modal por click, con la pose del logro de
  mayor prioridad.
- **La celebración se calcula en la action (antes y después), no en el cliente.** El XP depende de
  todas las rutas del usuario y el cliente solo conoce la ruta abierta. Cuesta 4 queries extra solo
  cuando el paso pasa a "Hecho".
- **La gamificación nunca rompe marcar un paso.** Si algo falla después del update, el resultado
  es `ok: true` sin celebración. Mismo principio que la IA del spec 11: lo accesorio no bloquea lo
  esencial.
- **Solo se celebra al completar un paso** (toggle o quiz del curso). "Explorador" (3 rutas) se
  ve en el perfil sin celebración, para no tocar la generación del spec 07.
- **Página `/profile` nueva, dashboard como resumen.** El dashboard sigue siendo sobre las rutas;
  el detalle (insignias, estadísticas) va al perfil, al que se llega desde el avatar. Ruta en
  inglés, como `/paths` y `/dashboard`.
- **`canvas-confetti` como dependencia nueva** (el 12 rechazó React Flow, este sí agrega una).
  Pesa ~6 KB, se carga con `import()` solo al celebrar y trae `disableForReducedMotion`. Un
  confetti hecho a mano sería más código propio para verse peor.
- **Props de `XpBar` a inglés.** `CLAUDE.md` pide identificadores en inglés y el componente todavía
  no tenía datos reales: es el momento más barato de corregirlo.

## Riesgos

- **Conflicto con la coreografía del spec 12.** El modal no puede abrirse mientras la mascota viaja.
  Mitigación: la espera usa las constantes de `lib/path-map/motion.ts`, no un número propio.
- **Costo de `setStepStatus`.** Pasa de 1 query a 6 al marcar "Hecho". Mitigación: las cargas son
  dos queries livianas filtradas por RLS e índices existentes (`learning_paths_user_id_idx`); si en
  la prueba del paso 7 el toast tarda más de ~1 s, el "antes" se calcula en paralelo con la lectura
  del paso.
- **Zona del navegador distinta entre dispositivos.** Un usuario que viaja o usa dos zonas puede
  ganar o perder un día en el borde. Aceptado: afecta a una racha, no a datos de la ruta.
- **`reminder.webp` con racha 0.** No se muestra: recordar "no pierdas tu racha" sin racha sería
  confuso. Solo aparece con racha ≥ 1 y sin avance hoy.
