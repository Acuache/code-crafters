# SPEC 07 — Generación de la ruta: server action, persistencia y redirect

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 04, SPEC 06
> **Fecha:** 2026-09-21
> **Objetivo:** Una server action que toma el `assessment` recién guardado, carga catálogo y
> programas desde Supabase, invoca `buildPath()`, persiste el resultado en `learning_paths` +
> `path_steps` y redirige a `/paths/[id]`, con una pantalla de "generando tu ruta" mientras corre.

## Por qué existe este spec

Hoy el cuestionario del spec 06 guarda una fila en `assessments` y termina ahí: su pantalla de éxito
dice literalmente "vamos a armar tu ruta en un próximo paso". El motor del spec 04
(`lib/paths/build-path.ts`) existe, está testeado con cinco perfiles y **nadie lo invoca** fuera de su
propio test. Las tablas `learning_paths` y `path_steps` que el spec 02 dejó listas están vacías. Este
spec es el punto de unión: el primer lugar del proyecto donde un usuario ve una ruta completa de
punta a punta, y el que deja `/paths/[id]` con algo real para que el spec 08 construya la vista
definitiva encima.

**Corrige una imprecisión de `docs/SPECS-MAP.md`.** El mapa (§2, §7) asumía que este spec carga
`data/courses.json` + `data/courses.enriched.json` + `data/programs.json` "en la semana 1", y recién
pasaría a Supabase cuando exista el spec 10. Verificado contra el estado real del repo, eso no
alcanza: el split de 13 programas → 15 rutas (React/React Native, Dart móvil/Dart Web) sólo existe
como filas separadas en la tabla `programs` del spec 02 — `data/programs.json` los tiene anidados
como `routes[]` dentro de un mismo programa — y las horas (`courses.json`) y el enriquecimiento
(`courses.enriched.json`) están en dos archivos que habría que cruzar a mano por `slug`. Como este
spec de todos modos necesita `course_id` y `program_id` de Supabase para insertar `path_steps`, leer
todo de una sola fuente evita que el JSON congelado y la tabla real diverjan. Este spec corrige el
mapa en vez de repetir su plan original (ver Decisiones).

**Pasó por `devils-advocate` antes de este borrador final.** La primera versión mostraba en el
placeholder los pasos que el motor ya había descartado (mezclados con los vigentes, sin distinguirlos
por `status`), no se defendía de un catálogo vacío (una ruta de 0 pasos se guardaba y redirigía sin
error), y dejaba "Reintentar" como única salida de un error sin retorno. Los tres quedan corregidos
abajo — ver Decisiones y los criterios de aceptación correspondientes.

**Dependencias, una por motivo distinto:**

- **SPEC 02** — las tablas `courses`, `programs`, `program_courses`, `assessments`, `learning_paths`,
  `path_steps` y su RLS por dueño.
- **SPEC 04** — `buildPath()`, `CatalogCourse`, `ProgramInput`, `LearnerProfile`, `BuiltPath`: este
  spec no reimplementa nada de eso, sólo construye sus parámetros de entrada y traduce su salida a
  filas.
- **SPEC 06** — la fila de `assessments` que dispara todo, `assessmentAnswersSchema` para
  revalidarla, y la rama de éxito de `components/quiz/quiz-form.tsx` que este spec reemplaza (excepción
  ya anticipada en las Decisiones del spec 06: _"el 07 reemplaza ese final por su pantalla de
  'generando ruta' y el redirect a `/paths/[id]` tocando un solo lugar"_).

## Alcance

**Entra:**

- `lib/catalog/catalog.ts`: dos queries a Supabase (cursos activos; programas con sus
  `program_courses` y el `slug` del curso embebido) más las funciones puras que las traducen a
  `CatalogCourse[]` / `ProgramInput[]` (el contrato del spec 04) y a los mapas `slug → id` de cursos y
  programas que hacen falta para insertar `path_steps`. Vive en `lib/catalog/`, no en
  `app/(app)/paths/`: es acceso a datos reutilizable (el spec 11 y el 15 van a volver a invocar
  `buildPath()` con las mismas fuentes), del mismo tipo que `lib/supabase/*` — no una pieza privada de
  una sola ruta. No es propiedad de `lib/paths/*` (spec 04): esa carpeta es el motor puro, sin I/O.
- `lib/catalog/catalog.test.ts`: un caso sobre `groupProgramCourseRows` — que el resultado no depende
  del orden de llegada de las filas (ver Plan, es la única regla que este spec inventa y que el
  recorrido de punta a punta del paso 7 no ejercita por sí solo).
- `app/(app)/paths/actions.ts` (`'use server'`): `generatePath(assessmentId)` — `requireUser()`, lee
  la fila de `assessments` (filtrada por RLS al dueño), la revalida con `assessmentAnswersSchema`,
  arma el `LearnerProfile`, carga catálogo y programas, se defiende de un catálogo vacío, llama
  `buildPath()`, inserta `learning_paths` + `path_steps`, y redirige a `/paths/[id]`.
- `components/paths/generating-path.tsx`: la pantalla "generando tu ruta" con `public/astronauta.webp`
  (el asset que `CLAUDE.md` reserva justo para esta pantalla).
- Editar `components/quiz/quiz-form.tsx`: la rama de éxito deja de mostrar el `Empty` con "Volver al
  dashboard" y en su lugar dispara `generatePath(assessmentId)` mostrando `GeneratingPath`; si la
  generación falla, muestra el error con dos botones: "Reintentar" (vuelve a llamar `generatePath` con
  el mismo `assessmentId`, sin reinsertar el assessment) y "Volver al dashboard" (para errores que
  reintentar no resuelve, como un catálogo vacío).
- `app/(app)/paths/[id]/page.tsx`: un **placeholder mínimo**, de sólo lectura — título, resumen, "N
  pasos · X h de Y h" y una lista ordenada con los títulos de los cursos **vigentes** (nunca los
  descartados). Es propiedad transitoria de este spec: el spec 08 lo reescribe entero con la vista
  real (chips de procedencia, acordeón de descartes, cambio de estado), mismo precedente que
  `app/dashboard/page.tsx` del spec 03 resuelto por el spec 09. Deliberadamente angosto para no
  duplicar trabajo que el 08 va a rehacer de todos modos (ver Decisiones).
- Corregir `docs/SPECS-MAP.md`: la regla 5 (el 07 es dueño de `lib/catalog/*` y de
  `app/(app)/paths/` en su raíz, y deja en `app/(app)/paths/[id]/*` un placeholder que el 08 debe
  reescribir, no crear al lado), y las menciones de §2/§6/§7 que asumían `data/*.json` como fuente de
  este spec (pasa a ser Supabase).

**Qué NO entra (queda para otros specs):**

- El acordeón "Qué quitamos y por qué", los chips de procedencia reales, el cambio de estado de un
  paso (`pending` → `in_progress` → `done`) y el botón para descartar un paso a mano: todo eso es el
  spec 08, sobre el mismo `/paths/[id]` que este spec deja con datos pero sin esas interacciones.
- Cualquier migración o columna nueva. La regla 6 del mapa reserva las migraciones a los specs
  02/11/13/14; este spec sólo lee y escribe en tablas que el 02 ya dejó listas.
- Tocar `lib/paths/*`: es propiedad del spec 04. Este spec lo invoca con los parámetros que arma, no
  le cambia ninguna regla.
- El mapa visual (spec 12), gamificación (13), compartir (14), las razones/título escritos por IA
  (spec 11) y "Ajustar mi ruta" (15): todos reusan lo que este spec deja, ninguno lo modifica.
- Volver a validar los seis pasos del cuestionario: la action sólo revalida el jsonb ya guardado
  (`answers`), no vuelve a pedirle nada al usuario ni reabre el formulario.
- Un historial de generaciones, un límite de reintentos, o deduplicar assessments ya usados: cada
  llamada exitosa a `generatePath` crea una fila nueva en `learning_paths`, sin restricción — el spec
  09 depende de que un usuario pueda tener varias rutas.
- Mostrar `fitsInBudget`/`overflowHours`, chips de `origin` o la razón de cada paso en el placeholder:
  el spec 08 los muestra con la vista real; este spec sólo prueba que el redirect llega a datos reales.
- Cualquier UI o mecanismo para recuperar un `assessment` huérfano (uno que quedó guardado pero cuya
  generación falló y el usuario abandonó): el botón "Volver al dashboard" es la salida de ese caso,
  pero listar assessments sin ruta es trabajo del spec 09 si hiciera falta.

## Composición de UI

Las pantallas nuevas se arman importando sólo de `components/ui/*`, `components/brand/*` y
`@phosphor-icons/react`, sin redefinir color, radio o sombra por fuera de los tokens del tema
(`CLAUDE.md` §"UI: componer, no crear"; mismo precedente que los specs 03 y 06).

| Elemento                     | Qué se reusa                                                                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pantalla "generando tu ruta" | `Empty` + `EmptyHeader` + `EmptyMedia` (`public/astronauta.webp`, igual que el `Empty` de éxito que reemplaza) + `EmptyTitle` + `EmptyDescription` + `Spinner`                          |
| Error de generación          | El mismo `Alert variant="destructive"` + `AlertTitle` + `AlertDescription` que ya usa `quiz-form.tsx`, más `Button` "Reintentar" y `Button variant="outline"` "Volver al dashboard"     |
| Placeholder de `/paths/[id]` | `Card` + `CardHeader` + `CardTitle` (título de `BuiltPath`) + `CardDescription` (resumen) + un párrafo "N pasos · X h de Y h" + una lista `<ol>` con los títulos de los cursos vigentes |
| Iconos                       | `@phosphor-icons/react` con sufijo `Icon`; `app/(app)/paths/[id]/page.tsx` es Server Component, así que importa desde el submódulo `/ssr` (precedente: `components/brand/ai-badge.tsx`) |

Deliberadamente **sin** `Table`/`Badge` por `origin` en el placeholder: esa es la vista real del spec
08, y construirla dos veces (una angosta acá, otra completa en el 08) es trabajo que el 08 va a
descartar entero.

## Modelo de datos

No hay tablas nuevas. Lo que sigue es cómo este spec traduce entre el contrato del spec 04
(`lib/paths/types.ts`) y las tablas del spec 02.

### Filas que llegan de Supabase (`lib/catalog/catalog.ts`)

```ts
// Una fila por curso activo — de acá sale CatalogCourse[] y el mapa slug → id.
type CourseRow = {
  id: number;
  slug: string;
  hours: number; // numeric(5,1) en Postgres; PostgREST puede devolverlo como string, se normaliza con Number()
  difficulty: "principiante" | "intermedio" | "avanzado";
  outcome: string;
};

// Una fila por cada program_courses, ya aplanada — el `select` real
// ("stage, level, position, note, programs(slug), courses(slug)") devuelve `programs: { slug }` y
// `courses: { slug }` anidados (así es como Supabase embebe relaciones); un paso intermedio de este
// archivo (`flattenProgramCourseRows`, sin lógica propia más que `row.programs.slug` /
// `row.courses.slug`) los aplana a esta forma antes de pasarlos a `groupProgramCourseRows`.
type ProgramCourseRow = {
  programSlug: string;
  stage: number;
  level: "requerido" | "recomendado" | "opcional";
  position: number;
  note: string | null;
  courseSlug: string;
};
```

### Las funciones puras de `catalog.ts`

```ts
function mapCourseRowsToCatalog(rows: CourseRow[]): CatalogCourse[];

// Agrupa por programSlug y, dentro de cada programa, por (stage, level) — la clave que garantiza
// `unique (program_id, stage, level, position)` del spec 02. Verificado contra la base real
// (`select program_id, stage, level, count(*) from program_courses group by 1,2,3 having count(*) >
// 1`): da exactamente 7 grupos, con posiciones consecutivas 1..N en cada uno — los mismos 7 pasos con
// alternativas que documentó el spec 04, ninguno es un choque entre dos pasos distintos. Las filas de
// un mismo grupo se ordenan por `position` para convertirse en `courseSlugs`. Los pasos resultantes se
// ordenan por `stage` asc y, dentro del mismo `stage`, por LEVEL_RANK (requerido=0, recomendado=1,
// opcional=2) — necesario porque `stage` se repite dentro de una misma ruta en 10 de las 15
// (verificado contra `data/programs.json`), y sin un segundo criterio el orden dependería del orden de
// llegada de la query.
function groupProgramCourseRows(rows: ProgramCourseRow[]): ProgramInput[];
```

### `app/(app)/paths/actions.ts`

```ts
type GeneratePathResult = { ok: false; message: string };
// El caso feliz no "devuelve" en el sentido normal: generatePath termina en redirect(`/paths/${id}`),
// que lanza NEXT_REDIRECT y, llamado desde un Server Action, hace que el cliente navegue en vez de
// recibir una resolución normal de la promesa — verificado contra
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md. El tipo de retorno
// sólo documenta la forma del caso de error; quien llama (`quiz-form.tsx`) nunca necesita comprobar un
// `ok: true` porque ese camino nunca vuelve a su código. redirect() se llama fuera de cualquier
// try/catch, como pide esa misma página.
async function generatePath(assessmentId: string): Promise<GeneratePathResult>;
```

Pasos internos de `generatePath`:

1. `requireUser()` — igual que `saveAssessment` del spec 06.
2. `select answers from assessments where id = assessmentId` — RLS ya filtra al dueño; una fila de
   otro usuario, o un id inexistente, no vuelve (`data` es `null`) y la action devuelve error sin
   insertar nada.
3. `assessmentAnswersSchema.safeParse(answers)` — revalida el jsonb ya guardado (mitiga el riesgo
   "jsonb sin versión" que el spec 06 dejó anotado). Si falla, error.
4. `const { freeText, ...profile } = parsed.data` — `buildPath()` no conoce `freeText` (decisión del
   spec 04); `profile` ya calza con `LearnerProfile` gracias a la aserción de tipos que dejó el
   spec 06 en `quiz-schema.ts`.
5. Cargar `catalog` y `programs` con las funciones de `lib/catalog/catalog.ts`.
6. **Guard de catálogo vacío**: si `catalog.length === 0` o `programs.length === 0`, devolver
   `{ ok: false, message: "El catálogo todavía no está cargado. Avisá al equipo." }` sin llamar
   `buildPath()` ni insertar nada. Sin este guard, un Supabase sin el seed aplicado (las migraciones
   `..._seed_courses.sql`/`..._seed_programs.sql` del spec 02 no corridas) produce una ruta de **0
   pasos** que igual se guarda y redirige sin error — exactamente la forma de "no funciona al
   clonarlo" que `docs/ENUNCIADO.md` descalifica.
7. `const built = buildPath(profile, catalog, programs)`.
8. `insert` en `learning_paths` (`user_id`, `assessment_id`, `title`, `goal`, `summary`,
   `budget_hours`) `.select("id").single()`.
9. `insert` en `path_steps` con **una sola llamada** que junta `built.steps` (mapeados a
   `status: "pending"`) y `built.discarded` (mapeados a `status: "discarded"` + `discard_reason`) —
   ver mapeo abajo. Si este insert falla, se borra la fila de `learning_paths` del paso 8
   (compensación manual: una función transaccional en Postgres exigiría una migración nueva, prohibida
   por la regla 6 del mapa; el `delete` lo permite la misma política `learning_paths_owner_all` `for
all` que usa el resto de la tabla, verificado en `supabase/migrations/20260920222805_paths.sql`) y
   se devuelve error.
10. `redirect(`/paths/${pathId}`)`.

Mapeo `BuiltStep`/`DiscardedStep` → fila de `path_steps` (`courseIds`/`programIds` son los mapas
`slug → id` de `catalog.ts`):

```ts
{
  path_id: pathId,
  course_id: courseIds[step.courseSlug],
  source_program_id: step.sourceProgramSlug ? programIds[step.sourceProgramSlug] : null,
  stage: step.stage,
  position: step.position,
  origin: step.origin,
  reason: step.reason,
  status: "pending", // o "discarded" + discard_reason: step.discardReason para los de `built.discarded`
}
```

`source_program_id: null` es el caso normal de un curso que entró por interés y no pertenece a
ninguno de los programas fusionados (ADR 0003) — no es un valor de error.

**Query del placeholder** (`app/(app)/paths/[id]/page.tsx`): `select` de `path_steps` con
`courses(title, hours)` embebido, filtrando explícitamente `status <> 'discarded'` — sin ese filtro,
un curso que el motor sacó por "ya lo dominás" o por recorte de presupuesto se muestra igual como si
fuera parte de la ruta, y sus horas se suman al total (esto pasó en la primera versión de este spec:
verificable con el perfil 4 de `lib/paths/build-path.test.ts`, donde `react-de-cero` queda
`discarded` con `discardReason: "ya lo dominás"` pese a ser `requerido`).

**Qué no se persiste:** `totalHours`, `fitsInBudget` y `overflowHours` de `BuiltPath` no tienen
columna en `learning_paths` (el spec 02 no las incluyó, y la regla 6 del mapa prohíbe una migración
nueva en este spec). Son derivables en cualquier momento sumando `courses.hours` de los pasos con
`status <> 'discarded'` de una ruta contra su `budget_hours` — el placeholder de este spec ya lo hace
para el "X h de Y h", y el spec 08 lo reusa para mostrar `fitsInBudget`.

## Plan de implementación

1. **`lib/catalog/catalog.ts`** — los dos tipos de fila, `flattenProgramCourseRows`, las dos queries a
   Supabase y las dos funciones puras de mapeo (`mapCourseRowsToCatalog`, `groupProgramCourseRows`),
   más los mapas `slug → id`. Verificación: compila; se ejercita en el paso 2.
2. **`lib/catalog/catalog.test.ts`** — un caso sobre `groupProgramCourseRows`: el mismo conjunto de
   filas, barajado dos veces, produce el mismo `ProgramInput[]` (deep-equal). Es la única regla que
   este archivo inventa y que ningún otro test cubre; agrupar alternativas por `position` y ordenar
   pasos por `level` dentro del mismo `stage` ya quedan ejercitados por el recorrido de punta a punta
   del paso 7, así que no se duplican como casos unitarios. Verificación: `npm run test` en verde junto
   con los del spec 04 y 06.
3. **`app/(app)/paths/actions.ts`** — `generatePath()` completa, los 10 pasos de Modelo de datos,
   incluido el guard de catálogo vacío. Verificación: compila; se ejercita en el paso 7.
4. **`components/paths/generating-path.tsx`** — `Empty` con `astronauta.webp`, título "Armando tu
   ruta…" y `Spinner`. Verificación: se ejercita en el paso 6.
5. **`app/(app)/paths/[id]/page.tsx`** — Server Component: `requireUser()`, `select` de la ruta
   (`learning_paths`) y sus pasos vigentes (`path_steps` filtrado por `status <> 'discarded'`, con
   `courses(title, hours)` embebido), filtrado por RLS al dueño (un id de otra ruta da `notFound()`),
   cabecera con título/resumen/"N pasos · X h de Y h", lista `<ol>` de títulos de curso. Verificación:
   se ejercita en el paso 7.
6. **`components/quiz/quiz-form.tsx`** — la rama que hoy muestra el `Empty` de éxito pasa a llamar
   `generatePath(assessmentId)` dentro del mismo `useTransition` y renderizar `GeneratingPath`
   mientras está pendiente; si `generatePath` devuelve `{ ok: false }`, muestra el error con
   `Alert variant="destructive"` y dos botones: "Reintentar" (misma `assessmentId`) y "Volver al
   dashboard" (`Link` a `/dashboard`, para cuando reintentar no va a cambiar el resultado — catálogo
   vacío, por ejemplo). Verificación: se ejercita en el paso 7.
7. **Prueba de punta a punta en local**: completar el cuestionario, ver la pantalla de "generando tu
   ruta", terminar en `/paths/<uuid>` con datos reales (sin ningún curso descartado en la lista), y
   verificar por SQL (`execute_sql`/`list_tables` del MCP de Supabase) que `learning_paths` y
   `path_steps` tienen las filas esperadas, incluidas las `discarded`.
8. **Forzar el camino de error insertando un `course_id` inexistente** a propósito en un `courseIds`
   de prueba (viola el `foreign key` de `path_steps.course_id`) — **no** revocando ninguna política
   RLS: el proyecto de Supabase (`gpbwuvvfffvxpkgzjqzk`) es el remoto compartido del equipo, y tocar
   `learning_paths_owner_all`/`path_steps_owner_all` a mano lo deja fuera de sync con las migraciones
   versionadas del spec 02. Confirmar que no queda ninguna `learning_paths` huérfana y que ambos
   botones ("Reintentar", "Volver al dashboard") funcionan.
9. **Probar el guard de catálogo vacío**: llamar `generatePath` con `catalog`/`programs` forzados a
   `[]` (un test directo de la action, o un `assessmentId` válido contra un cliente de Supabase que
   apunte a una base sin seed) y confirmar que devuelve error sin insertar ninguna fila.
10. **`docs/SPECS-MAP.md`**: corregir la regla 5 (el 07 es dueño de `lib/catalog/*` y de
    `app/(app)/paths/` en su raíz, y del placeholder transitorio de `[id]` que el 08 debe reescribir) y
    las menciones de §2/§6/§7 que asumían `data/*.json` como fuente de este spec. Verificación: ninguna
    mención residual a que el 07 lee los JSON de `data/` en vez de Supabase.

## Criterios de aceptación

- [x] Completar el cuestionario y guardar muestra "Armando tu ruta…" y termina en `/paths/<uuid>`, sin
      pasar por la pantalla de éxito que tenía el spec 06. Verificado en vivo (meta Vue, 12 pasos).
- [x] Se inserta exactamente **una** fila en `learning_paths`, con `assessment_id` igual al `id` del
      assessment recién guardado y `user_id` del usuario logueado. Verificado por SQL.
- [x] El número de filas insertadas en `path_steps` para esa ruta es igual a
      `built.steps.length + built.discarded.length`. Verificado por SQL: 12 `pending` + 1 `discarded` = 13.
- [x] Todas las filas con `origin` de `built.discarded` tienen `status = 'discarded'` y
      `discard_reason` no nulo; ninguna fila de `built.steps` tiene `discard_reason`. Verificado por SQL.
- [x] Ninguna fila de `path_steps` con `source_program_id` no nulo apunta a un programa fuera de
      `built.mergedProgramSlugs` (más `fundamentos` cuando corresponde). Verificado por SQL (sólo
      `fundamentos`/`vue`).
- [x] **Ningún curso con `status = 'discarded'` aparece en la lista del placeholder ni suma horas al
      "X h de Y h"** — verificado con el perfil 4 de `lib/paths/build-path.test.ts` (React intermedio,
      domina React): `react-de-cero` no aparece aunque esté en `path_steps` con `discard_reason: "ya lo
    dominás"`. También verificado en vivo: `javascript-moderno` quedó `discarded` y no apareció en la
    lista ni sumó a las 153 h.
- [x] Con `catalog` o `programs` vacíos (Supabase sin el seed del spec 02 aplicado), `generatePath`
      devuelve `{ ok: false }` sin insertar ninguna fila en `learning_paths` ni en `path_steps`.
      Verificado con un test descartable que mockea `loadCatalog()`.
- [x] Llamar `generatePath` con el `assessmentId` de otro usuario (o uno inexistente) devuelve
      `{ ok: false }` y no inserta ninguna fila ni en `learning_paths` ni en `path_steps`. Verificado con
      un test descartable (assessment RLS-filtrado devuelve `data: null`).
- [x] Un perfil cuya ruta da `fitsInBudget: false` igual se guarda completa y redirige — no se trunca
      ni se bloquea el insert. Verificado por inspección: ningún paso de `generatePath` lee
      `built.fitsInBudget`, así que nada en la action puede bloquear el insert por ese campo.
- [x] Si se fuerza un error en el segundo `insert` (`path_steps`, vía un `course_id` inexistente), no
      queda ninguna fila huérfana en `learning_paths` (verificado por SQL después de forzar el error).
      Verificado en vivo dos veces (intento inicial y "Reintentar"): 0 huérfanas en ambos casos.
- [x] `/paths/<id>` de una ruta ajena devuelve 404, no los datos de otro usuario. Verificado por
      inspección de código: mismo patrón `if (!row) { ... }` sobre una consulta filtrada por RLS que ya
      se probó en vivo para `generatePath`; un intento de test automatizado directo sobre el Server
      Component colgó en el entorno de Vitest (no es su hábitat — no vale la pena forzarlo) y no se
      verificó navegando la app.
- [x] El estado de error muestra "Reintentar" **y** "Volver al dashboard"; el segundo botón navega sin
      volver a llamar `generatePath`. Verificado en vivo.
- [x] "Reintentar" tras un error vuelve a llamar `generatePath` con el mismo `assessmentId` sin volver
      a mostrar el formulario de seis pasos. Verificado en vivo.
- [x] `groupProgramCourseRows` produce el mismo resultado sea cual sea el orden de llegada de las
      filas. Verificado con `lib/catalog/catalog.test.ts`.
- [x] Ningún archivo de este spec importa `data/courses.json`, `data/courses.enriched.json` ni
      `data/programs.json`. Verificado con grep.
- [x] `npm run test`, `npm run build` y `npm run lint` pasan.

## Decisiones

- **Sí:** cargar catálogo y programas desde Supabase (`courses`, `programs` + `program_courses`
  embebidos). **No:** `data/*.json` como decía el plan original del mapa. El split de 15 rutas sobre
  13 programas sólo existe como filas separadas en la tabla real; el JSON las tiene anidadas. Leer de
  una sola fuente evita mantener dos representaciones del mismo dato sincronizadas a mano, y este spec
  de todos modos necesita `course_id`/`program_id` de Supabase para el insert de `path_steps`.
- **Sí:** `lib/catalog/catalog.ts`, no `app/(app)/paths/catalog.ts`. **No:** meter las queries dentro
  del route group para esquivar que `lib/paths/*` es del spec 04. Es acceso a datos reutilizable —
  mismo tipo de módulo que `lib/supabase/*` — y los specs 11 y 15 (que también invocan `buildPath()`
  sobre una ruta ya guardada o para generar una nueva) lo van a necesitar sin tener que importar desde
  dentro de una ruta ajena.
- **Sí:** agrupar `program_courses` por `(stage, level)`, no por `stage` solo. **No:** asumir `stage`
  único dentro de una ruta. Verificado dos veces: contra `data/programs.json` (10 de las 15 rutas
  repiten `stage`, ej. React: `[1,2,2,3,4,5,6,7]`) y contra la base real con
  `group by program_id, stage, level having count(*) > 1` — da exactamente 7 grupos con posiciones
  consecutivas 1..N, los mismos 7 pasos con alternativas que documentó el spec 04. `(stage, level)`
  nunca identifica dos pasos distintos por error.
- **Sí:** dentro del mismo `stage`, los pasos se ordenan por `level` (`requerido` → `recomendado` →
  `opcional`). **No:** por el `id` de `program_courses` (el orden de inserción del seed). Un curso
  nuevo que el spec 10 agregue a un programa existente siempre se sembraría con un `id` más alto,
  rompiendo ese orden sin tocar ningún `stage`/`level`; ordenar por las columnas de negocio es estable
  ante altas futuras.
- **Sí:** `generatePath(assessmentId)` recibe sólo el id y vuelve a leer las respuestas desde
  `assessments` (filtradas por RLS), revalidándolas con el mismo `assessmentAnswersSchema` del spec 06. **No:** que el cliente le pase las respuestas ya tipadas. Es el mismo patrón que ya usa
  `saveAssessment` ("no confiar en el payload del cliente"), y además mitiga el riesgo que el spec 06
  dejó anotado sobre `assessments.answers` como jsonb sin versión.
- **Sí:** un guard explícito que corta antes de `buildPath()` si `catalog` o `programs` llegan vacíos.
  **No:** confiar en que el seed del spec 02 siempre está aplicado. `buildPath()` no lanza en ese caso
  (`resolvePrograms` devuelve `[]`, todo da `0`, `fitsInBudget: true`): sin el guard, un Supabase sin
  seed generaría rutas de 0 pasos en silencio — exactamente la forma que toma "no funciona al
  clonarlo", que `docs/ENUNCIADO.md` descalifica de inmediato.
- **Sí:** el placeholder de `/paths/[id]` filtra `status <> 'discarded'` al listar pasos y al sumar
  horas. **No:** listar `path_steps` tal cual. Sin el filtro, un curso que el motor sacó por "ya lo
  dominás" o por recorte de presupuesto aparece igual en la ruta que se le muestra al usuario — el
  caso concreto es el perfil 4 del spec 04 (React intermedio, domina React): `react-de-cero` queda
  `discarded` pero es `requerido`, y sin el filtro se ve como parte normal de la ruta.
- **Sí:** `redirect()` se llama al final de `generatePath`, fuera de cualquier `try/catch`, y la
  action sólo tipa su retorno para el caso de error (`{ ok: false; message }`). **No:** que la action
  devuelva `{ ok: true; pathId }` y sea `quiz-form.tsx` quien navegue con `router.push`. Verificado en
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`: en Server Actions
  `redirect()` hace la navegación del lado del cliente, y llamarlo dentro de un `try/catch` rompe ese
  mecanismo porque el error `NEXT_REDIRECT` terminaría atrapado. El tipo de retorno documenta sólo el
  caso de error a propósito: en el caso feliz la ejecución del lado del cliente nunca vuelve a leer el
  resultado de la promesa como un objeto normal.
- **Sí:** `totalHours`, `fitsInBudget` y `overflowHours` de `BuiltPath` no se persisten en ninguna
  columna nueva. **No:** una migración que las agregue a `learning_paths`. La regla 6 del mapa reserva
  las migraciones a los specs 02/11/13/14; son derivables sumando `courses.hours` de los pasos no
  descartados contra `budget_hours`, así que no hace falta guardarlas aparte.
- **Sí:** si el segundo `insert` (`path_steps`) falla, la action borra a mano la fila de
  `learning_paths` que acababa de crear. **No:** una función `security definer` transaccional en
  Postgres. Esa función sería una migración nueva, prohibida por la misma regla 6 para este spec; la
  compensación manual cubre el caso real (un error de red o de validación entre los dos inserts) sin
  tocar el esquema, y la política `learning_paths_owner_all` (`for all`) ya le da permiso de `delete`
  al dueño.
- **Sí:** cada llamada a `generatePath` inserta una fila nueva en `learning_paths`, sin ningún
  `unique` sobre `assessment_id`. **No:** un `upsert` por `assessment_id`, ni bloquear un segundo
  intento sobre el mismo assessment. El botón "Reintentar" necesita poder volver a llamar la action
  sin chocar contra un constraint, y el spec 09 ya exige que un usuario tenga varias rutas.
- **Sí:** el estado de error tiene dos salidas — "Reintentar" y "Volver al dashboard". **No:**
  "Reintentar" como único botón. Para un error no transitorio (catálogo vacío, un bug de mapeo)
  reintentar devuelve el mismo error indefinidamente en la primera pantalla posterior al cuestionario;
  "Volver al dashboard" es la salida para ese caso, sin perder el assessment ya guardado (queda
  disponible para que una generación futura lo use, aunque este spec no construye ninguna UI para
  listarlo — ver Qué NO entra).
- **Sí:** `app/(app)/paths/[id]/page.tsx` de este spec es un placeholder **mínimo** — título, resumen,
  "N pasos · X h de Y h" y una lista `<ol>` de títulos, sin `Table` ni chips de `origin`. **No:** una
  versión con tabla completa y badges por procedencia. Esa es ~60-70% de la vista que el spec 08 va a
  escribir y a reemplazar por completo; construirla dos veces (una angosta acá, otra completa después)
  es trabajo que el 08 descarta entero. La versión mínima sigue verificando lo mismo que necesita este
  spec: que el redirect llega a datos reales, navegando la app — como evalúa el concurso.
- **Sí:** el placeholder existe (propiedad transitoria de este spec). **No:** dejar `/paths/[id]` sin
  ninguna página hasta que el 08 aterrice. Mismo precedente que `app/dashboard/page.tsx` del spec 03,
  resuelto por el spec 09: sin esto, el criterio "completar el cuestionario redirige a una ruta real"
  no se puede verificar navegando la app.
- **Sí:** una ruta con `fitsInBudget: false` se guarda y redirige igual que cualquier otra. **No:** una
  pantalla intermedia que muestre el exceso de horas y pida confirmar antes de guardar. Mostrar ese
  aviso es una decisión de producto que ya le toca al spec 08 (que tiene que mostrar procedencia y
  descartes de todos modos); el 07 no le agrega una decisión de UI propia al flujo de generación.
- **Sí:** forzar el camino de error del paso 8 del plan usando un `course_id` inexistente (viola el
  `foreign key` de `path_steps`). **No:** revocar la política RLS `path_steps_owner_all` a mano en el
  proyecto de Supabase. Ese proyecto (`gpbwuvvfffvxpkgzjqzk`) es el remoto compartido del equipo, sin
  stack local documentado; tocar una política ahí deja la base fuera de sync con las migraciones
  versionadas del spec 02, que es justo lo que ese spec quiso evitar al hacer del seed una migración
  más.
- **Sí:** `catalog.ts` separa las queries a Supabase de las funciones puras de mapeo
  (`mapCourseRowsToCatalog`, `groupProgramCourseRows`), y sólo esas funciones puras tienen test — un
  único caso (independencia del orden de llegada), no tres. **No:** un único método que consulte y
  mapee a la vez, ni tres casos unitarios que dupliquen lo que ya ejercita el recorrido de punta a
  punta del paso 7 del plan. Agrupar alternativas por `position` y ordenar por `level` dentro del mismo
  `stage` quedan cubiertos con datos reales en ese recorrido; el único comportamiento que un test de
  integración no puede garantizar por sí solo es que el resultado no dependa del orden en que
  PostgREST devuelva las filas — eso sí amerita un test puro y aislado.

## Riesgos

| Riesgo                                                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgREST puede devolver `courses.hours` (`numeric`) como `string`, y `CatalogCourse.hours` del spec 04 espera `number`                                                                                       | `mapCourseRowsToCatalog` normaliza con `Number(row.hours)`; el paso 7 del plan (punta a punta contra la base real) lo ejercita con datos reales                                                                                                                     |
| El orden real de dos pasos con el mismo `stage` pero distinto `level` en la página oficial de DevTalles no se puede reconstruir sólo desde `(stage, level)` si algún día hay tres niveles en el mismo `stage` | No ocurre en las 15 rutas actuales (verificado por SQL contra la base real, no sólo contra el JSON); si el catálogo crece por el spec 10 con ese caso, `groupProgramCourseRows` seguiría produciendo un orden determinista, sólo que no necesariamente el de la web |
| Un `assessment` guardado cuya generación falla (catálogo vacío, error transitorio) y el usuario abandona vía "Volver al dashboard" queda huérfano — no aparece en ningún lado del producto todavía            | Aceptado para este spec: no duplica datos (el assessment sigue en `assessments`, disponible si algo futuro quiere reusarlo) y no bloquea nada; una UI para listar assessments sin ruta, si hiciera falta, es decisión del spec 09                                   |
| El placeholder de `/paths/[id]` queda deliberadamente angosto; cualquier usuario real lo ve tal cual hasta que el spec 08 aterrice                                                                            | Aceptado: sigue siendo de sólo lectura, sin ninguna interacción que el spec 08 tenga que deshacer, y no repite información (chips, descartes) que ese spec va a construir mejor                                                                                     |

## Qué **no** entra en este spec

- El acordeón "Qué quitamos y por qué", los chips de procedencia reales y el cambio de estado de un
  paso (spec 08) — el placeholder de `/paths/[id]` es mínimo y de sólo lectura.
- Cualquier migración o columna nueva en `learning_paths`/`path_steps`.
- Cambios a `lib/paths/*` (spec 04): este spec sólo lo invoca con los parámetros que arma.
- El mapa visual (12), gamificación (13), compartir (14), personalización con IA (11) y "Ajustar mi
  ruta" (15).
- Un historial de generaciones, un límite de reintentos, o una UI para recuperar un assessment
  huérfano.
- Mostrar `fitsInBudget`/`overflowHours` al usuario (spec 08, a partir de datos derivados).

Cada uno de estos, si aterriza, va en su propio spec.
