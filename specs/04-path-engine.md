# SPEC 04 — Motor de reglas: `build-path.ts` e `interests.ts`

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-09-20
> **Objetivo:** `lib/paths/build-path.ts` es una función pura que arma una ruta de aprendizaje
> combinando programas oficiales según la meta, quitando lo que el usuario ya domina, sumando
> intereses transversales al catálogo y recortando contra un presupuesto de horas sin tocar nunca
> un curso `requerido`, dejando procedencia y descarte explícitos en cada paso.

## Por qué existe este spec

Hoy no existe ninguna lógica de negocio en el repo: `data/courses.json` y `data/programs.json` son
datos crudos, y las decisiones de qué curso entra a una ruta y por qué viven repartidas en tres ADRs
(0001, 0003, 0004) sin una sola función que las implemente. Sin este spec, el spec 06 no tiene el
contrato de tipos que necesita para el cuestionario, y el spec 07 no tiene nada que invocar.

Este spec cierra **cinco de las decisiones abiertas** de `docs/SPECS-MAP.md` §4 (la tabla `meta →
programas`, la tabla de intereses, el orden de recorte, el tope de horas de los intereses, y cuándo
un interés se descarta por tecnología ya dominada) y dos que el ADR 0004 dejó pendientes para "cuando
se escriba `build-path.ts`" (si el motor antepone `fundamentos` a un principiante, y el vocabulario
final de `path_steps.origin` que el spec 02 dejó como `text` libre).

Es también el spec que **desbloquea al 06 antes de terminar**: su primer entregable,
`lib/paths/types.ts`, es el contrato de la respuesta del cuestionario. En cuanto ese archivo está
commiteado, el 06 puede empezar a construir el formulario sin esperar a que el motor esté completo
(`docs/SPECS-MAP.md` §2, punto de sincronización 2).

**Depende de SPEC 02**: las tablas `GOALS` y `TECH_TO_SLUGS` de este spec usan los 15 valores de
`programs.slug` (`dart-movil`/`dart-web`, `react`/`react-native` como filas separadas) que el spec 02
fijó como vocabulario canónico al sembrar la tabla real — `data/programs.json` por sí solo agrupa
esas rutas bajo un mismo programa, sin la separación en slugs que decidió el spec 02. Los fixtures de
los tests usan `data/courses.json` (no depende de ningún spec) para `slug`+`hours`;
`data/courses.enriched.json` (spec 01) solo aporta los campos opcionales `difficulty`/`outcome` de
`CatalogCourse`, que el motor no usa en ninguna regla — no hay una dependencia real con el spec 01.

El motor sigue siendo una función pura que no toca Supabase — lo único que toma del spec 02 es la
lista ya fijada de 15 `programs.slug`, no sus migraciones ni su RLS.

## Alcance

**Entra:**

- `lib/paths/types.ts`: todos los tipos del motor — el perfil de entrada, el resultado, y los tipos
  angostos que recibe por parámetro (`CatalogCourse`, `ProgramInput`). No importa
  `lib/supabase/database.types.ts`: el motor no conoce el esquema de Supabase, solo la forma mínima
  de datos que necesita para razonar.
- `lib/paths/goals.ts`: la tabla `meta → programas` (`AREAS`, `GOALS`).
- `lib/paths/interests.ts`: la tabla de ~12 intereses transversales del ADR 0003 (`INTERESTS`) y la
  tabla de las 15 tecnologías dominables (`TECHNOLOGIES`, `TECH_TO_SLUGS`).
- `lib/paths/build-path.ts`: la función `buildPath(profile, catalog, programs)` y sus pasos internos,
  cada uno una función nombrada y exportada solo para testing (`resolvePrograms`,
  `mergeOfficialSteps`, `dropMasteredTechnologies`, `applyInterests`, `trimToBudget`,
  `renumberStages`).
- Configurar Vitest (`vitest.config.mts`, script `npm run test`) — primera dependencia de test del
  repo.
- `lib/paths/build-path.test.ts`: los 5 perfiles de referencia (ver Plan, paso 7). Es el único
  archivo de `lib/paths/` que puede importar `data/*.json` (ver Criterios de aceptación).
- Corregir `docs/SPECS-MAP.md` §4 (marcar las cinco decisiones como cerradas por este spec), su
  mención de "11 tecnologías fijas" (pasan a ser 15, ver Decisiones) y la celda "Depende de" del 04
  en su tabla de la §1 (pasa de `01` a `02`).

**Qué NO entra (queda para otros specs):**

- Leer `data/*.json` o Supabase en tiempo de ejecución: el motor recibe `catalog` y `programs` por
  parámetro. Quién se los pasa (JSON versionado hoy, una consulta a Supabase después del spec 10) es
  responsabilidad de quien lo invoque (spec 07, y luego 15).
- El cuestionario (`components/quiz/*`, spec 06) y su validación con zod: este spec solo entrega el
  contrato de tipos que el 06 consume. La pregunta de texto libre que pide `docs/SPECS-MAP.md` §4/§7
  se guarda tal cual en `assessments.answers` (jsonb, spec 02); no pasa por `LearnerProfile` ni por
  `buildPath()` (ver Decisiones).
- Persistir nada: ninguna tabla, ninguna migración, ningún `insert`. `buildPath()` devuelve un
  objeto en memoria; el spec 07 lo traduce a filas de `learning_paths`/`path_steps`.
- Las razones que escribe la IA (Capa 2, spec 11): este spec solo escribe las razones por plantilla
  de la Capa 1 (ADR 0004, pieza 3), que son las que se muestran siempre que no hay
  personalización de IA. `programHints` (ADR 0001) tampoco entra: cuando el spec 11 lo necesite,
  extiende `LearnerProfile` con un campo opcional nuevo — una interfaz de TypeScript se extiende sin
  romper nada, a diferencia de una columna de Supabase (ver Decisiones).
- El botón "Ajustar mi ruta" (spec 15): reusa `buildPath()` tal cual, sin cambios de este spec.
- Cualquier UI, incluido el mapa visual (spec 12): este spec no importa React ni `components/*`.
- Un panel para editar `GOALS`/`INTERESTS`/`TECH_TO_SLUGS` desde el admin (spec 10): son tablas a
  mano en código, como ya decidió el ADR 0003; el spec 10 gestiona `courses`/`program_courses`, no
  estas tres tablas.

## Modelo de datos

No hay tablas nuevas — este spec no toca Supabase. Lo que sigue son los tipos y las tres tablas a
mano que quedan en `lib/paths/`.

### `lib/paths/types.ts`

```ts
type Area = "frontend" | "backend" | "fullstack" | "movil" | "ia";

// Mismas tres opciones que muestra el paso 3 del cuestionario (spec 06). No reusa
// course_difficulty (spec 02): ese es el nivel de un CURSO; este es el nivel que el usuario
// declara de sí mismo, y determina si se antepone `fundamentos` (ver Decisiones).
type ExperienceLevel = "empiezo_de_cero" | "tengo_bases" | "intermedio";

// Sin "base": un paso de Fundamentos tiene el origin que le corresponde por su propio `level`
// (`requerido`/`recomendado`), igual que cualquier otro programa. Se identifica como Fundamentos
// por `sourceProgramSlug: "fundamentos"`, no por un origin especial (ver Decisiones).
type StepOrigin = "requerido" | "recomendado" | "opcional" | "interes";

// Los tres alias siguientes son `string`, no una unión cerrada: este archivo se commitea antes de
// que existan GOALS/INTERESTS/TECHNOLOGIES (paso 1 del plan, para no bloquear al spec 06). La
// validación real pasa en dos lugares: el zod del spec 06 deriva su `z.enum` de
// `Object.keys(GOALS)` una vez que `goals.ts` existe, y `buildPath()` valida `profile.goal` en
// runtime (ver Decisiones) — no hay ningún punto donde un slug inválido pase inadvertido.
type GoalSlug = string; // una clave de GOALS, ver lib/paths/goals.ts
type TechnologySlug = string; // una clave de TECHNOLOGIES, ver lib/paths/interests.ts
type InterestSlug = string; // una clave de INTERESTS, ver lib/paths/interests.ts

// Lo que arma el cuestionario del spec 06 y persiste en assessments.answers.
type LearnerProfile = {
  goal: GoalSlug;
  level: ExperienceLevel;
  masteredTechnologies: TechnologySlug[];
  interests: InterestSlug[];
  hoursPerWeek: number; // 3-40, lo valida el zod del spec 06
  deadlineMonths: number; // lo valida el zod del spec 06 (ver Decisiones sobre los valores concretos)
};

// Forma mínima de un curso que el motor necesita — no la fila completa de `courses` (spec 02).
type CatalogCourse = {
  slug: string;
  hours: number;
  difficulty?: "principiante" | "intermedio" | "avanzado"; // pass-through, sin uso en la lógica
  outcome?: string; // pass-through, sin uso en la lógica
};

// Un paso de `programs.json`/`program_courses` tal como lo necesita el motor.
type ProgramStepInput = {
  stage: number;
  level: "requerido" | "recomendado" | "opcional";
  note: string | null;
  courseSlugs: string[]; // más de uno = alternativas (ver Decisiones)
};

type ProgramInput = {
  slug: string; // uno de los 15 valores de `programs.slug` (spec 02)
  steps: ProgramStepInput[];
};

type BuiltStep = {
  courseSlug: string;
  sourceProgramSlug: string | null; // null si el curso entró por interés y no pertenece a
  // ninguno de los programas fusionados de esta ruta (el caso normal, ver ADR 0003)
  stage: number; // ya renumerado 1..N sobre la ruta final, no el `stage` del programa de origen
  position: number; // orden dentro de la misma etapa
  origin: StepOrigin;
  reason: string; // frase parametrizada (ADR 0004 pieza 3), ej. "Requerido para llegar a React en 6 meses."
};

type DiscardedStep = {
  courseSlug: string;
  sourceProgramSlug: string | null;
  stage: number; // mismo criterio que en BuiltStep — el spec 07 lo inserta tal cual en `path_steps`
  position: number;
  origin: StepOrigin;
  reason: string; // igual que en BuiltStep: por qué este curso iba camino a la ruta
  discardReason: string; // "ya lo dominás" | "no cabía en tu tiempo" | "superaba el cupo de intereses"
};

type BuiltPath = {
  goal: GoalSlug;
  title: string;
  summary: string;
  mergedProgramSlugs: string[]; // los programSlugs de la meta, en el orden de GOALS
  budgetHours: number;
  totalHours: number;
  fitsInBudget: boolean;
  overflowHours: number; // 0 si fitsInBudget es true
  steps: BuiltStep[];
  discarded: DiscardedStep[];
};

// Lanza un Error si profile.goal no es una clave de GOALS — un slug de meta desconocido es un bug
// de quien invoca (el cuestionario ya restringe a las 19 metas cerradas), no un caso de negocio a
// tolerar en silencio. Un slug desconocido en masteredTechnologies o interests, en cambio, se
// ignora sin error: son arrays, y una entrada suelta que no matchea ninguna tabla simplemente no
// aporta nada (ver Decisiones).
function buildPath(
  profile: LearnerProfile,
  catalog: CatalogCourse[],
  programs: ProgramInput[],
): BuiltPath;
```

`budgetHours = Math.round(deadlineMonths * 4.33) * hoursPerWeek` — reproduce las 260 h del ejemplo
del ADR 0001 (6 meses × 10 h/semana → `Math.round(25.98) * 10 = 260`).

### `lib/paths/goals.ts`

`AREAS` (5, fijas): `frontend`, `backend`, `fullstack`, `movil`, `ia`.

`GOALS` (19 metas). Cada `programSlugs` usa únicamente los 15 valores de `programs.slug` que fijó el
spec 02; `fundamentos` y `dart-web` no son elegibles como meta (ver Decisiones):

| slug           | label                 | area        | programSlugs      |
| -------------- | --------------------- | ----------- | ----------------- |
| `react`        | React                 | `frontend`  | `[react]`         |
| `vue`          | Vue                   | `frontend`  | `[vue]`           |
| `angular`      | Angular               | `frontend`  | `[angular]`       |
| `node`         | Node                  | `backend`   | `[node]`          |
| `nest`         | NestJS                | `backend`   | `[nest]`          |
| `java`         | Java                  | `backend`   | `[java]`          |
| `csharp`       | C# / .NET             | `backend`   | `[csharp]`        |
| `python`       | Python                | `backend`   | `[python]`        |
| `php`          | PHP                   | `backend`   | `[php]`           |
| `go`           | Go                    | `backend`   | `[go]`            |
| `react-nest`   | React + Nest          | `fullstack` | `[react, nest]`   |
| `vue-node`     | Vue + Node            | `fullstack` | `[vue, node]`     |
| `angular-nest` | Angular + Nest        | `fullstack` | `[angular, nest]` |
| `java-angular` | Java + Angular        | `fullstack` | `[java, angular]` |
| `dart-movil`   | Flutter / Dart        | `movil`     | `[dart-movil]`    |
| `react-native` | React Native          | `movil`     | `[react-native]`  |
| `ia`           | IA / Automatizaciones | `ia`        | `[ia]`            |
| `ia-node`      | IA con Node           | `ia`        | `[ia, node]`      |
| `ia-python`    | IA con Python         | `ia`        | `[ia, python]`    |

Verificado: las 19 metas usan **13 `programSlugs` únicos** — los 15 de `programs.slug` (spec 02)
menos `fundamentos` y `dart-web`, excluidos a propósito (ver Decisiones).

### `lib/paths/interests.ts`

`INTERESTS` — la tabla del ADR 0003, copiada tal cual (12 intereses, 20 slugs de curso, verificados
de nuevo contra `data/courses.json` para este spec):

| slug (nuevo)          | label                 | courseSlugs                                                                | horas       |
| --------------------- | --------------------- | -------------------------------------------------------------------------- | ----------- |
| `docker`              | Docker                | `docker-guia-practica`                                                     | 14          |
| `solid-clean-code`    | SOLID y Clean Code    | `solid-clean-code`                                                         | 6.5         |
| `patrones-diseno`     | Patrones de diseño    | `patrones-diseno`                                                          | 10          |
| `control-versiones`   | Control de versiones  | `git-github-control-versiones-desde-cero`                                  | 11.5        |
| `bases-de-datos-sql`  | Bases de datos SQL    | `sql-con-postgres`                                                         | 16          |
| `testing`             | Testing               | `NestJS-Testing`, `net-pruebascompletas`                                   | 12.5, 6     |
| `tiempo-real`         | Tiempo real / sockets | `react-sockets`, `Angular_socket_bun`                                      | 15, 14.5    |
| `ia-aplicada`         | IA aplicada           | `openai`, `ia-para-developers`, `python-ia-aplicada`                       | 10, 8, 18.5 |
| `microservicios`      | Microservicios        | `nestjs-microservicios`, `spring-boot-microservicios`, `go-microservicios` | 21, 21, 2.5 |
| `sitios-de-contenido` | Sitios de contenido   | `Astro`, `qwik-introduccion`                                               | 25.5, 8     |
| `agentes-vibe-coding` | Agentes y vibe coding | `claude-code-guia-completa`, `codex`                                       | 17.5, 3.5   |
| `estilos`             | Estilos               | `tailwindcss-para-desarrolladores`                                         | 4           |

Cuando un interés tiene más de un `courseSlug`, el motor elige el **primero de la lista** salvo que
la regla de mastered-technologies descarte ese slug puntual (ver Decisiones) — el orden de la tabla
es la prioridad por defecto, no un empate a resolver por horas.

`TECHNOLOGIES` (15) y `TECH_TO_SLUGS` — una por tecnología-puerta de cada programa, verificadas contra
el `stage` 1 o 2 de cada ruta en `data/programs.json`:

| slug         | label      | courseSlug (TECH_TO_SLUGS)                | nivel en su programa                                  |
| ------------ | ---------- | ----------------------------------------- | ----------------------------------------------------- |
| `javascript` | JavaScript | `javascript-moderno`                      | recomendado (react/vue/angular/node/nest)             |
| `typescript` | TypeScript | `typescript-guia-completa`                | recomendado                                           |
| `git`        | Git        | `git-github-control-versiones-desde-cero` | requerido (fundamentos)                               |
| `sql`        | SQL        | `sql-con-postgres`                        | recomendado/opcional según ruta                       |
| `docker`     | Docker     | `docker-guia-practica`                    | recomendado/opcional según ruta                       |
| `react`      | React      | `react-de-cero`                           | requerido (react) / recomendado (ia)                  |
| `angular`    | Angular    | `angular-moderno`                         | requerido (angular) / recomendado (ia)                |
| `vue`        | Vue        | `vue-cero-a-experto`                      | requerido (vue) / recomendado (ia)                    |
| `node`       | Node       | `nodejs-de-cero-a-experto`                | requerido (node) / opcional (nest) / recomendado (ia) |
| `python`     | Python     | `python`                                  | requerido (python)                                    |
| `java`       | Java       | `Java`                                    | requerido (java)                                      |
| `csharp`     | C#         | `csharp`                                  | requerido (csharp)                                    |
| `dart`       | Dart       | `dart-cero-hasta-detalles`                | requerido (dart-movil, dart-web)                      |
| `go`         | Go         | `golang-fundamentos-lenguaje`             | requerido (go)                                        |
| `php`        | PHP        | `PHP-moderno`                             | requerido (php)                                       |

Nota que **la mayoría son `requerido`** en su programa principal: marcar "ya domino React" sí puede
quitar un paso `requerido` de la ruta (`react-de-cero`, 46 h) — es una regla distinta del recorte por
presupuesto, que nunca toca un `requerido` (ver Decisiones).

`INTERESTS` y `TECH_TO_SLUGS` comparten 3 `courseSlug` (`docker-guia-practica`,
`git-github-control-versiones-desde-cero`, `sql-con-postgres` son a la vez un interés y la
tecnología-puerta de un programa) — no es un error, es esperable que un curso "de entrada" a una
tecnología sea también algo que alguien marque como interés desde otra meta.

### `lib/paths/build-path.ts` — los seis pasos

Nombrados, cada uno una función pura con un solo propósito (sin `reduce` encadenados que haya que
descifrar):

1. **`resolvePrograms(profile, programs)`** — si `profile.goal` no es una clave de `GOALS`, lanza un
   `Error` (ver `types.ts`). Si lo es, busca sus `programSlugs` en `GOALS`; si
   `level === "empiezo_de_cero"`, antepone `fundamentos` a la lista. Devuelve los `ProgramInput`
   resueltos en orden.
2. **`mergeOfficialSteps(resolvedPrograms, profile)`** — recorre los pasos de cada programa **en el
   orden resuelto**, manteniendo un mapa `courseSlug → paso elegido` que se va completando:
   - Un paso con un solo curso se toma tal cual, con su `level` propio.
   - Un paso con varios cursos (las 7 alternativas verificadas en este spec) elige uno: primero el
     que coincida con un interés marcado o una tecnología dominada del perfil; si ninguno coincide,
     el de `position` 0 (el primero de la lista, que es el orden de la web).
   - Un paso `opcional` solo se considera si el curso elegido coincide con un interés marcado; si no
     coincide, se descarta sin registrar nada en `discarded` (ver Decisiones, no es un curso que la
     ruta "iba a incluir").
   - Si el `courseSlug` resultante **ya está en el mapa** (porque un programa anterior también lo
     traía), se compara su `level` contra el guardado y se conserva el más exigente
     (`requerido` > `recomendado` > `opcional`), actualizando `sourceProgramSlug`/`stage` al del
     programa que aporta el nivel ganador. Es un solo paso a propósito: separar "elegir alternativa",
     "resolver el conflicto de nivel entre programas" y "no repetir un curso" en funciones distintas
     deja sin dueño la pregunta de quién decide cuando las tres reglas tocan el mismo curso a la vez
     (ver Decisiones).
3. **`dropMasteredTechnologies(steps, profile)`** — quita cualquier paso cuyo `courseSlug` sea el
   `TECH_TO_SLUGS` de una tecnología marcada como dominada, sea cual sea su `level` — incluido un
   `requerido`. Cada uno que quita queda en `discarded` con `discardReason: "ya lo dominás"`,
   heredando `stage`/`position`/`reason` del paso que tenía antes de quitarse.
4. **`applyInterests(steps, profile, budgetHours, officialHours)`** — para cada interés marcado, toma
   su primer `courseSlug` que no esté ya en `steps` y cuyo slug no coincida con `TECH_TO_SLUGS` de una
   tecnología dominada (si coincide, prueba el siguiente `courseSlug` del mismo interés; si ninguno
   queda libre, ese interés no aporta nada — no es un error). El cupo de horas que pueden sumar los
   intereses es `Math.max(0.25 * budgetHours, budgetHours - officialHours)` — el mayor entre el 25 %
   del presupuesto total y el espacio que de verdad sobra sobre la ruta oficial ya armada (ver
   Decisiones, corrige la versión anterior de este spec, que aplicaba un 25 % fijo aunque sobrara
   presupuesto). Si la suma de los intereses coincidentes supera ese cupo, entran del más barato al
   más caro hasta llenarlo, y el resto se descarta con `discardReason: "superaba el cupo de
intereses"`. Cada uno que sí entra queda con `origin: "interes"`.
5. **`trimToBudget(steps, budgetHours)`** — si `totalHours > budgetHours`, recorta empezando por el
   `origin` menos prioritario (`interes` → `opcional` → `recomendado`) y, dentro de cada grupo, desde
   el final de la lista de `steps` (ya en su orden final) hacia el principio. **Nunca quita un
   `requerido`.** Si después de recortar todo lo recortable la ruta sigue sin caber, se detiene ahí:
   `fitsInBudget: false` y `overflowHours = totalHours - budgetHours` en el resultado, sin quitar
   ningún `requerido` (ver Decisiones). El curso concreto que se recorta en cada caso depende de la
   ruta real — este spec fija la regla, no un resultado numérico por perfil (ver Plan, paso 7).
6. **`renumberStages(steps)`** — asigna `stage` 1..N: primero Fundamentos si entró, después cada
   programa de la meta en el orden de `GOALS` (cada paso oficial conserva el orden relativo de su
   `stage` original dentro de su programa), y por último los cursos de interés, uno por etapa propia,
   en el orden en que aparecen en `INTERESTS` — sin depender de a qué programa pertenecen, porque la
   mayoría no pertenece a ninguno de los que entraron en esta ruta (ese es el punto del ADR 0003).
   `position` ordena cursos dentro de la misma etapa; fuera de ese caso es `0`. También compone
   `reason` por plantilla usando el plazo, las tecnologías dominadas y si la ruta fusiona más de un
   programa (ADR 0004, pieza 3) — nunca la misma frase fija para dos pasos de distinto origen.
   También arma `title` y `summary` por plantilla (el spec 11 los sobrescribe si hay
   `OPENAI_API_KEY`).

`buildPath()` es la composición de los seis pasos, sin lógica propia adicional.

## Plan de implementación

1. **`lib/paths/types.ts` solo, commit aparte.** Es el contrato que desbloquea al spec 06. Verificación:
   compila (`tsc --noEmit`); no importa nada de `lib/supabase/*` ni de `react`.
2. `lib/paths/goals.ts`: `AREAS` y las 19 `GOALS`. Verificación: un test rápido (o script ad-hoc)
   confirma que todo `programSlugs` está entre los 15 valores de `programs.slug` del spec 02 (13
   distintos usados), que ningún slug de `GOALS` se repite, y que ni `fundamentos` ni `dart-web`
   aparecen como meta.
3. `lib/paths/interests.ts`: `INTERESTS` (12) y `TECHNOLOGIES`/`TECH_TO_SLUGS` (15). Verificación:
   los 32 `courseSlug` distintos entre ambas tablas (20 + 15, con 3 compartidos) existen en
   `data/courses.enriched.json`.
4. Instalar Vitest: `npm install -D vitest vite-tsconfig-paths` (sin `jsdom` ni
   `@testing-library/*`: este spec no prueba componentes). `vitest.config.mts`:

   ```ts
   import { defineConfig } from "vitest/config";
   import tsconfigPaths from "vite-tsconfig-paths";

   export default defineConfig({
     plugins: [tsconfigPaths()],
     test: { environment: "node" },
   });
   ```

   `package.json`: `"test": "vitest run"`. Verificado contra
   `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` y Context7 (`/vercel/next.js`).
   Verificación: `npm run test` corre (sin tests todavía) sin error de configuración.

5. `lib/paths/build-path.ts`: los seis pasos de la sección anterior, cada uno exportado con su
   nombre para poder testearlo por separado. Verificación: compila; se ejercita en el paso 7.
6. Las razones parametrizadas y `title`/`summary` de `renumberStages` (ver paso 6 de la lista de
   arriba). Verificación: se ejercita en el paso 7.
7. `lib/paths/build-path.test.ts` — cinco perfiles fijos. El primero fija números exactos
   (verificados a mano contra `data/courses.json`/`data/programs.json` para este spec); los otros
   cuatro verifican invariantes, no un total de horas calculado a mano — el número exacto que
   produzca `trimToBudget` sobre una ruta real depende de qué queda disponible para recortar en esa
   ruta concreta, y fijarlo de antemano en el spec fue el error que corrigió la revisión de este
   documento (ver Decisiones):

   | #   | Perfil                                                                                                                        | Verifica                                                                                                                                                                                                                                                                  |
   | --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | 1   | Meta `react`, `empiezo_de_cero`, sin dominadas, intereses `docker`+`testing`+`bases-de-datos-sql`, 10 h/sem × 6 meses (260 h) | **Exacto:** Fundamentos se antepone; `sql-con-postgres` no se duplica entre Fundamentos y React; 12 cursos, **225 h de 260 h**; `fitsInBudget: true`                                                                                                                      |
   | 2   | Meta `react-nest`, `empiezo_de_cero`, sin dominadas, sin intereses, 260 h                                                     | Fusiona React + Nest + Fundamentos: `totalHours` antes de recortar es **276 h** (mayor que el presupuesto). Después de `trimToBudget`: `fitsInBudget: true`, `totalHours <= 260`, y ningún paso `requerido` aparece en `discarded`                                        |
   | 3   | Meta `php`, `tengo_bases`, sin dominadas, intereses `docker`+`testing`+`bases-de-datos-sql`, 8 h/sem × 4 meses (136 h)        | Sin Fundamentos (no es principiante); ruta oficial = 23.5 h; los tres intereses suman 42.5 h, dentro del cupo `max(34, 112.5) = 112.5 h` → **ninguno se descarta por cupo**, `fitsInBudget: true`                                                                         |
   | 4   | Meta `react`, `intermedio`, dominada `react`, sin intereses, 10 h/sem × 12 meses (520 h, sin margen a recortar)               | `react-de-cero` (**requerido**, 46 h) aparece en `discarded` con `discardReason: "ya lo dominás"` pese a ser requerido; los demás pasos oficiales de React (`javascript-moderno`, `typescript-guia-completa`, `react-pro`, `sql-con-postgres`, `nextjs`) siguen presentes |
   | 5   | Meta `ia`, `empiezo_de_cero`, sin dominadas, sin intereses, 5 h/sem × 2 meses (45 h)                                          | Solo los `requerido` de Fundamentos + IA (sin recortar nada, porque no se puede) ya superan 45 h; `fitsInBudget: false`, `overflowHours > 0`, y ningún paso `requerido` aparece en `discarded`                                                                            |

   Verificación: `npm run test` en verde con los 5 casos.

8. `docs/SPECS-MAP.md`: marcar en §4 las cinco decisiones de este spec como cerradas por el 04,
   corregir la mención de "11 tecnologías fijas" (§2, punto de sincronización 2) por 15, y corregir la
   celda "Depende de" del 04 en la tabla de la §1 (de `01` a `02`). Verificación: ninguna mención
   residual a un número de tecnologías o a una decisión de intereses/recorte como abierta, ni al 04
   dependiendo del 01.

## Criterios de aceptación

- [x] `npm run test` pasa con los 5 perfiles de la tabla del paso 7.
- [x] Los 32 `courseSlug` distintos entre `INTERESTS` y `TECH_TO_SLUGS` existen en
      `data/courses.enriched.json`.
- [x] Los 13 `programSlugs` únicos usados en `GOALS` son un subconjunto de los 15 de `programs.slug`
      del spec 02; ni `fundamentos` ni `dart-web` aparecen como meta.
- [x] Ningún archivo de **producción** de `lib/paths/` (`types.ts`, `goals.ts`, `interests.ts`,
      `build-path.ts`) importa `data/*.json`, `lib/supabase/*`, `next/*` ni `react`. Su test
      (`build-path.test.ts`) sí importa `data/courses.json`/`data/programs.json` para sus fixtures —
      eso no viola el aislamiento del motor, que sigue sin leer nada en tiempo de ejecución real.
- [x] `buildPath()` es determinista: el mismo `LearnerProfile` + el mismo `catalog`/`programs`
      producen siempre el mismo `BuiltPath` (sin `Math.random()`, sin `Date.now()` en la lógica).
- [x] `buildPath()` lanza un `Error` si `profile.goal` no es una de las 19 claves de `GOALS`; nunca
      devuelve una ruta vacía en silencio.
- [x] Todo `BuiltStep`/`DiscardedStep` tiene `origin` en `requerido | recomendado | opcional |
    interes` — ningún valor `"base"` en ninguna parte del resultado.
- [x] Ningún paso con `origin: "requerido"` aparece en `discarded` con `discardReason` relacionado al
      presupuesto o al cupo de intereses — solo `dropMasteredTechnologies` puede descartar un
      `requerido`, y siempre con el motivo `"ya lo dominás"`.
- [x] Un perfil cuya ruta no cabe ni recortando todo lo recortable devuelve `fitsInBudget: false` y
      `overflowHours > 0`, nunca lanza una excepción ni trunca la ruta a la fuerza.
- [x] `npm run build` y `npm run lint` pasan con `lib/paths/*` incluido.

## Decisiones

- **Sí:** `fundamentos` se antepone (`requerido` + `recomendado`) solo cuando `level ===
"empiezo_de_cero"`. **No:** anteponerlo siempre, ni antepenerlo solo con sus `requerido`. Es la
  base que asumió la medición del ADR 0004 para calcular el delta contra la página oficial; alguien
  que ya "tiene bases" no necesita que le impongan `programacion-para-principiantes`.
- **Sí:** un paso `opcional` de la ruta oficial entra solo si su slug coincide con un interés
  marcado; el resto **no se registra como descartado** (sería ruido: sobran ~20 opcionales por
  perfil que nadie marcó a propósito). **No:** que todos los opcionales entren y el presupuesto
  decida, ni que se ignoren por completo. Es lo que promete la maqueta ("los opcionales solo entran
  si te interesan") y lo que da contenido real al paso de intereses del spec 06.
- **Sí:** los 7 pasos con varios cursos se tratan como alternativas — entra uno, elegido por afinidad
  con el perfil y si no por el orden de la web (`position` 0). **No:** que entren todos. Los dos casos
  de la ruta de IA (Claude Code/OpenCode/Codex como agentes competidores; Angular/React/Vue como
  frontend de acompañamiento) sumarían horas de herramientas que se solapan entre sí sin que el
  usuario lo haya pedido. Esta regla es la más discutible de las 7 para un solo grupo (React etapa 3:
  `tanstack-query`/`zustand`/`shadcn-ui`/`react-router` son complementarios entre sí, no
  competidores, según la nota de `data/SUMMARY.md`) — se acepta igual porque ninguno de esos 4 cursos
  está en `INTERESTS`, así que ese paso nunca llega a activarse en la práctica (es `opcional` y
  ningún interés lo cubre).
- **Sí:** elegir la alternativa de un paso múltiple, resolver el conflicto de nivel entre programas
  fusionados, y no repetir un curso son **una sola función** (`mergeOfficialSteps`), no tres pasos
  separados del pipeline. **No:** una función que elige alternativas, después otra que dedupea por
  "primera aparición". Separarlas deja sin dueño qué gana cuando el mismo curso aparece con nivel
  distinto en dos programas fusionados: una función que solo "se queda con la primera aparición" en
  el orden de fusión puede quedarse con un `recomendado` visto antes en vez del `requerido` visto
  después, deshaciendo la regla de "gana el más exigente" sin que ninguna de las dos funciones sea
  responsable del error.
- **Sí:** entre programas fusionados, un mismo curso con `level` distinto se queda con el más
  exigente (`requerido` > `recomendado` > `opcional`), resuelto dentro de `mergeOfficialSteps`. **No:**
  que gane el programa principal de la meta ni el de `stage` más bajo. Es una regla de una línea, y
  coincide con el caso ya decidido en el ADR 0001 para `nodejs-de-cero-a-experto` en el perfil
  fullstack.
- **Sí:** la meta es una lista cerrada (`GOALS`, 19 entradas) con `area` + 1-3 `programSlugs`, no dos
  campos separados de área y stack como la maqueta (`META_STACKS`). **No:** reabrir el diseño de
  `META_STACKS`. Un solo campo `goal` evita el estado inválido de un área que no combina con su
  stack, y el spec 06 puede seguir mostrando dos selects (área → meta) leyendo de la misma tabla.
- **Sí:** `fundamentos` y `dart-web` quedan fuera de `GOALS`. **No:** una meta "Fundamentos" ni una
  meta "Dart Web" separada de "Dart móvil". `fundamentos` se antepone automáticamente (arriba), nunca
  se elige; `dart-web` es degenerado — su único curso (`dart-cero-hasta-detalles`) ya está en
  `dart-movil`, así que una meta separada sería idéntica a marcar Dart móvil y quedarse en la etapa
  1 (limitación conocida, ver Riesgos).
- **Sí:** el cupo de horas de los intereses es `Math.max(0.25 * budgetHours, budgetHours -
officialHours)` — nunca menos que el 25 % del presupuesto total, pero tampoco menos que el espacio
  libre real sobre la ruta oficial. **No:** un 25 % fijo del presupuesto sin importar cuánto ya ocupa
  la ruta oficial (la versión anterior de este spec). Con esa regla fija, el perfil #3 (PHP, ruta
  oficial de 23.5 h en un presupuesto de 136 h) descartaba un interés marcado por "falta de cupo" con
  86 h del presupuesto todavía libres — exactamente lo que el ADR 0003 diagnosticó como el problema a
  resolver ("el motor no sabe rellenar cuando sobra tiempo"), reintroducido por la propia regla que
  se escribió para arreglarlo. La fórmula nueva dejaría entrar los tres intereses de ese perfil sin
  tocar el techo del 25 % en presupuestos donde la ruta oficial sí ocupa casi todo el espacio.
- **Sí:** una tecnología dominada descarta el `TECH_TO_SLUGS` puntual de un interés, no el interés
  completo — si el interés tiene más de un `courseSlug`, se prueba el siguiente. **No:** que todo el
  interés se pierda por una coincidencia parcial. Es el caso literal de la decisión abierta del mapa
  (Node dominado + interés Microservicios → cae `nestjs-microservicios`, entra
  `spring-boot-microservicios`).
- **Sí:** solo se registra en `discarded` lo que el motor sacó de una ruta que **sí** iba a incluir
  (por dominio, por presupuesto o por cupo de intereses). **No:** registrar los opcionales nunca
  marcados ni las alternativas no elegidas de un paso múltiple. El acordeón "Qué quitamos y por qué"
  del spec 08 queda con señal real en vez de ~20 filas de ruido por perfil.
- **Sí:** Vitest, con `vite-tsconfig-paths` para resolver `@/*` y `environment: "node"` (sin
  `jsdom` ni testing-library). **No:** un script de demo sin runner, ni `node:test`. El ADR 0001 llama
  al motor "función pura y testeable"; este es el único spec donde eso se cobra, y deja el runner
  instalado para los specs que sigan (`npm run test` documentado en `CLAUDE.md` §Comandos, a
  actualizar en la entrega, no en este spec — ver `docs/SPECS-MAP.md` §5).
- **Sí:** cuatro archivos por responsabilidad (`types.ts`, `goals.ts`, `interests.ts`,
  `build-path.ts`). **No:** los tres archivos que sugería la lectura literal del ADR 0003, ni dos.
  Cada tabla se revisa a mano sin abrir el motor, y `types.ts` — lo que desbloquea al spec 06 — se
  commitea primero y solo (paso 1 del plan).
- **Sí:** si la ruta no cabe ni recortando todo lo recortable, el motor devuelve `fitsInBudget:
false` + `overflowHours`, sin tocar ningún `requerido`. **No:** recortar requeridos hasta que quepa,
  ni devolver la ruta completa sin ninguna marca de exceso. Quitar un curso requerido daría un plan
  que ya no lleva a la meta declarada — peor que admitir que el plazo no alcanza.
- **Sí:** los perfiles de prueba del paso 7 fijan un número exacto solo cuando se puede calcular sin
  ambigüedad (perfil #1, sin ningún recorte de por medio); los demás verifican invariantes
  (`fitsInBudget`, "ningún requerido en discarded", "el total antes de recortar supera el
  presupuesto"). **No:** fijar de antemano un total de horas exacto para una ruta que sí pasa por
  `trimToBudget`. La versión anterior de este spec hacía eso — afirmaba que el perfil fullstack
  "recorta 16 h" — y esa cifra no era reproducible aplicando la propia regla de recorte escrita en el
  mismo documento (el último `recomendado` de esa ruta fusionada es `react-pro`, 24.5 h, no 16 h).
  Fijar el número exacto de un perfil que sí recorta es una decisión que depende de la implementación
  real de `trimToBudget`, no algo que este documento pueda anticipar sin escribir el código primero.
- **Sí:** `path_steps.origin` (que el spec 02 dejó como `text` libre) es una unión cerrada de **4**
  valores en TypeScript (`requerido`/`recomendado`/`opcional`/`interes`); la columna sigue siendo
  `text` en la base, sin migración nueva. **No:** un quinto valor `"base"` para Fundamentos (la
  versión anterior de este spec lo declaraba en el tipo pero ninguna función del motor lo asignaba
  nunca), ni texto libre parametrizado (`"interés: docker"`) como sugería el ejemplo del spec 02. Un
  paso de Fundamentos se identifica por `sourceProgramSlug: "fundamentos"` y su `level` real
  (`requerido`/`recomendado`); el spec 08 mapea los 4 valores de `origin` a un chip fijo sin parsear
  texto, y el detalle ("por tu interés en Docker", "de la ruta base de Fundamentos") vive en
  `reason`, que ya es texto libre y parametrizado por diseño (pieza 3 del ADR 0004).
- **Sí:** `DiscardedStep` lleva `stage`/`position`/`reason` además de `discardReason` — los mismos
  cuatro campos NOT NULL que `path_steps` exige (spec 02) más el motivo del descarte. **No:** la
  versión angosta de la iteración anterior de este spec (solo `courseSlug`/`sourceProgramSlug`/
  `origin`/`discardReason`), que dejaba al spec 07 sin de dónde sacar tres columnas obligatorias de
  la tabla real sin inventar valores o pedir una migración nueva — prohibida por la regla 6 del mapa
  para cualquier spec que no sea 02/11/13/14.
- **Sí:** las 15 tecnologías dominables son una por tecnología-puerta de cada programa
  (`javascript`, `typescript`, `git`, `sql`, `docker`, `react`, `angular`, `vue`, `node`, `python`,
  `java`, `csharp`, `dart`, `go`, `php`). **No:** las "11 tecnologías" que mencionan los ADRs 0001 y
  0003 sin enumerarlas nunca, ni las 15 filtradas por stack de la maqueta (`STACK_SKILLS`). El número
  "11" no correspondía a ninguna lista escrita; estas 15 cubren los 15 `programs.slug` del spec 02
  (`fundamentos` no tiene tecnología propia) y cada una es, verificado en este spec, un curso que
  aparece en al menos una ruta oficial — marcarla siempre puede cambiar la ruta generada.
- **Sí:** `buildPath()` devuelve una forma alineada 1:1 con `path_steps` (mismos campos que la tabla
  del spec 02, con `courseSlug` en vez de `course_id`). **No:** una forma de dominio propia que el
  spec 07 tenga que traducir. El mapa pide que el 07 "no añada lógica de negocio propia" más que
  resolver slugs a ids e insertar — una forma distinta obligaría a una traducción que puede divergir
  del modelo real.
- **Sí:** el `stage` final se renumera 1..N sobre la ruta ya fusionada, con los cursos de interés al
  final en etapas propias (sin depender de a qué programa pertenecen, porque casi ninguno pertenece a
  uno de los fusionados). **No:** conservar el `stage` del programa de origen, ni ubicar un curso de
  interés "en la etapa del programa que lo originó" (la versión anterior de este spec lo decía así,
  pero `sourceProgramSlug` es `null` justamente en el caso normal de un interés — no hay programa de
  dónde tomar esa etapa).
- **Sí:** `LearnerProfile` no tiene un campo de texto libre. **No:** agregar uno ya. La respuesta de
  texto libre del cuestionario (spec 06, `docs/SPECS-MAP.md` §4/§7) se guarda tal cual en
  `assessments.answers` (jsonb, spec 02); el spec 11 la lee de ahí para producir `programHints` vía
  IA — no pasa por `LearnerProfile` ni por `buildPath()`. Cuando el spec 11 lo necesite, extiende
  `LearnerProfile` con un campo opcional `programHints?: string[]` sin romper este contrato: una
  interfaz de TypeScript se extiende después sin migración, a diferencia de una columna de Supabase.

## Riesgos

| Riesgo                                                                                                                                                                           | Mitigación                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La ruta de IA/Automatizaciones sola ya suma 160.5 h de `requerido`+`recomendado` (alternativas resueltas a un curso cada una, sin Fundamentos)                                   | Verificado en el perfil #5 de los tests con un presupuesto corto (45 h): cae en `fitsInBudget: false`. Con un presupuesto generoso (260 h) deja apenas ~99.5 h de margen para Fundamentos e intereses — información real que el spec 08 debe mostrar, no un bug del motor        |
| `dart-web` queda sin meta propia y su único curso ya lo cubre `dart-movil`                                                                                                       | Documentado en Decisiones como limitación conocida, igual que `qwik-introduccion`/`go-microservicios` ya lo eran para el ADR 0001                                                                                                                                                |
| Los niveles `tengo_bases` e `intermedio` no producen ninguna diferencia en la ruta bajo las reglas de este spec — solo `empiezo_de_cero` cambia algo (antepone Fundamentos)      | Aceptado para el MVP: la personalización fina por nivel la aporta `masteredTechnologies` (más granular que un autorreporte de 3 valores), no `level`. Si hace falta diferenciar `tengo_bases` de `intermedio`, es una decisión de producto nueva, no una corrección de este spec |
| Las tres tablas a mano (`GOALS`, `INTERESTS`, `TECH_TO_SLUGS`) envejecen si el panel del spec 10 agrega un curso nuevo o un programa nuevo                                       | Aceptado para el MVP: el spec 10 no gestiona estas tablas (ver Alcance); si el catálogo crece post-concurso, actualizarlas es un cambio de datos, no de lógica                                                                                                                   |
| Vitest es la primera dependencia de test del repo; una mala configuración de `vitest.config.mts` podría interferir con `npm run build` (que usa Vite/Webpack de Next, no Vitest) | El paso 4 del plan verifica `npm run test` y `npm run build` por separado antes de escribir el motor; `vite-tsconfig-paths` es una dependencia de test, no de producción                                                                                                         |
| `applyInterests` puede dejar un interés sin ningún `courseSlug` disponible (todos sus slugs coinciden con tecnologías dominadas)                                                 | Ya contemplado en el paso 4 del motor: ese interés simplemente no aporta nada, no es un error ni un caso a manejar aparte                                                                                                                                                        |

## Qué **no** entra en este spec

- El cuestionario y su validación con zod (`components/quiz/*`, spec 06), incluida la pregunta de
  texto libre — se guarda en `assessments.answers`, no en `LearnerProfile`.
- La server action que invoca `buildPath()` y persiste el resultado (spec 07).
- La vista de la ruta, el acordeón de descartes y el cambio de estado de un paso (spec 08).
- Las razones y el título escritos por IA, y `programHints` (spec 11) — reusa `buildPath()` sin
  cambios de este spec, extendiendo `LearnerProfile` cuando lo necesite.
- El botón "Ajustar mi ruta" (spec 15) — reusa `buildPath()` sin cambios de este spec.
- Leer `data/*.json` o Supabase en tiempo de ejecución — el motor solo recibe datos por parámetro.
- Un panel para editar las tres tablas a mano de `lib/paths/` — son código, no datos de Supabase.

Cada uno de estos, si aterriza, va en su propio spec.
