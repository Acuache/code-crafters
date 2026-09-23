# SPEC 08 — Vista de progreso de la ruta: procedencia, descartes y estado de cada paso

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 04, SPEC 07
> **Fecha:** 2026-09-23
> **Objetivo:** Reescribir `/paths/[id]` como la vista real de la ruta guardada — pasos agrupados por
> programa con su procedencia, tarjeta de horas y avance, acordeón "Qué quitamos y por qué", cambio de
> estado de cada paso y descarte manual de un paso pendiente con deshacer.

## Por qué existe este spec

El spec 07 deja `/paths/[id]` como un placeholder de sólo lectura: título, resumen, "N pasos · X h de
Y h" y una lista de títulos. El usuario ve su ruta, pero no puede hacer nada con ella, y la pieza que
el ADR 0001 y el ADR 0004 prometen como respuesta a "esto ya está hecho, es reinventar la rueda" — la
procedencia **y el descarte** visibles — está guardada en `path_steps` (`origin`, `reason`,
`status = 'discarded'` + `discard_reason`) sin que ninguna pantalla la muestre.

Este spec cierra ese hueco y cumple la mitad de "guardar varias rutas y **marcar progreso**" del
`docs/ENUNCIADO.md` (la otra mitad, ver todas las rutas, es el spec 09). Es la base sobre la que
cuelgan 09 (reusa el cálculo de progreso), 12 (reusa el control de estado), 13 (reusa
`completed_at`), 14 y 15.

**Dependencias, una por motivo distinto:**

- **SPEC 02** — `path_steps` con `status` (`pending`/`in_progress`/`done`/`discarded`),
  `discard_reason` (con el `check` que lo exige cuando `status = 'discarded'`), `completed_at`, y la
  política `path_steps_owner_all` (`for all`) que ya permite el `update` al dueño.
- **SPEC 04** — `StepOrigin` (`requerido`/`recomendado`/`opcional`/`interes`) y los tres motivos de
  descarte del motor (`"ya lo dominás"`, `"no cabía en tu tiempo"`, `"superaba el cupo de
intereses"`), que este spec muestra tal cual, sin reinterpretarlos.
- **SPEC 07** — las filas de `learning_paths` + `path_steps` que este spec lee y modifica, y el
  placeholder de `app/(app)/paths/[id]/page.tsx` que este spec reescribe entero (regla 5 de
  `docs/SPECS-MAP.md`).

## Alcance

**Entra:**

- `lib/progress/path-progress.ts`: funciones puras sin I/O — `summarizePathProgress()` (horas
  vigentes, horas hechas, porcentaje de avance por horas, `fitsInBudget` y `overflowHours` derivados),
  la constante `USER_DISCARD_REASON = "lo quitaste vos"` y `isUserDiscarded()`. Carpeta nueva,
  propiedad de este spec; el spec 09 la importa para el progreso de cada ruta en el dashboard.
- `lib/progress/path-progress.test.ts`: casos de `summarizePathProgress` e `isUserDiscarded`.
- `app/(app)/paths/[id]/actions.ts` (`'use server'`): `setStepStatus`, `discardStep`, `restoreStep`.
- `app/(app)/paths/[id]/page.tsx`: **reescritura completa** del placeholder del spec 07 — Server
  Component que carga la ruta y todos sus pasos (vigentes y descartados) en dos queries y se los pasa a
  la vista cliente. Cabecera con degradado de marca y `public/astronauta.webp`.
- `next.config.ts`: `images.remotePatterns` para `https://import.cdn.thinkific.com/**`, el CDN de
  donde vienen las portadas de los cursos (`courses.image_url`, las 74 tienen una).
- `components/paths/path-steps-view.tsx` (cliente): dueño del estado optimista de los pasos, monta el
  `Toaster`, agrupa los pasos por programa y compone las piezas de abajo.
- `components/paths/budget-card.tsx`: "X h de Y h", barra de avance por horas y `Alert` si la ruta no
  cabe en el presupuesto.
- `components/paths/step-row.tsx`: una fila de paso — título, horas, badge de procedencia, programa,
  razón, link al curso en DevTalles, control de estado y botón "Quitar" (sólo en `pending`).
- `components/paths/step-status-toggle.tsx`: `ToggleGroup` de tres estados. Archivo propio porque el
  spec 12 (panel de detalle del mapa) lo reusa.
- `components/paths/discarded-steps.tsx`: acordeón "Qué quitamos y por qué", con "Restaurar" sólo en
  los pasos que quitó el usuario.
- Actualizar `docs/SPECS-MAP.md` regla 5: el 08 es dueño de `app/(app)/paths/[id]/*`,
  `lib/progress/*` y de los archivos nuevos de `components/paths/*` listados arriba
  (`generating-path.tsx` sigue siendo del 07), y el 09 importa `lib/progress/path-progress.ts` en vez
  de recalcular el progreso.

**Qué NO entra (queda para otros specs):**

- El dashboard con todas las rutas (spec 09). Este spec sólo deja un link "Volver al dashboard" al
  placeholder de `app/dashboard/page.tsx` que ya existe.
- Mapa visual con React Flow (12), XP / niveles / insignias / racha / confetti al completar (13),
  compartir (14), razones y título escritos por IA (11) y "Ajustar mi ruta" (15).
- Restaurar un paso que descartó **el motor** ("ya lo dominás", "no cabía en tu tiempo", "superaba el
  cupo de intereses"): se muestran de sólo lectura (ver Decisiones).
- Descartar un paso `in_progress` o `done`: sólo se descarta un `pending`.
- Reordenar pasos, agregar cursos a mano, editar la razón o el título de la ruta, borrar una ruta.
- Cualquier migración o columna nueva (regla 6 del mapa): todo cabe en las columnas que ya dejó el 02.
- Tocar `lib/paths/*` (spec 04) o `lib/catalog/*` (spec 07).
- Montar el `Toaster` en `app/layout.tsx`: se monta dentro de la vista de la ruta (ver Decisiones).

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*` y `@phosphor-icons/react` (sufijo `Icon`;
desde `/ssr` en `page.tsx`, que es Server Component), sin colores, radios ni sombras fuera de los
tokens del tema (`CLAUDE.md` §"UI: componer, no crear"). Los cinco archivos nuevos de
`components/paths/` son **composiciones** de piezas existentes, no primitivas visuales nuevas: se
separan en archivos porque la vista tiene estado optimista compartido y porque el spec 12 reusa el
control de estado.

| Elemento                  | Qué se reusa                                                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabecera                  | `<header>` con `brand-gradient-soft` + `shadow-brand` (tokens del tema): `Eyebrow` "Tu ruta de aprendizaje", título (`text-title`), resumen y `public/astronauta.webp` decorativa (`alt=""`, oculta en móvil); arriba, `Button variant="ghost"` con `Link` "Volver al dashboard" (`ArrowLeftIcon`) |
| Tarjeta de horas y avance | `Card` con tres indicadores ("Tu plan" X h de Y h, "Cursos hechos" N de M, "Avance" %) + `Progress` (avance por horas); si no cabe, `Alert` (variante no destructiva) "Tu ruta se pasa por Z h de tu tiempo disponible"                     |
| Bloque por programa       | `<section>` por grupo: `Eyebrow` ("Programa oficial" / "Extra") + `programs.name` como `h2` + "N de M hechos · X h" del grupo; el último grupo es "Por tus intereses"                                                                   |
| Fila de paso              | Línea de tiempo: nodo circular con el número corrido del paso (1..N sobre los vigentes), relleno en `in_progress` y con check en `done`. Tarjeta con la portada del curso (`next/image`, `courses.image_url`, en gris si está hecho) + `LevelBadge` / `Badge` "interés" + horas + título + `reason` + link "Ver curso" a `courses.url` (`ArrowSquareOutIcon`, pestaña nueva) |
| Control de estado         | `ToggleGroup` + `ToggleGroupItem` × 3: "Pendiente" · "En curso" · "Hecho"                                                                                                                                                          |
| Quitar un paso            | `Button variant="ghost" size="sm"` "Quitar" (`TrashIcon`), sólo en filas `pending`                                                                                                                                                 |
| Deshacer / errores        | `Toaster` + `toast` de `components/ui/toast.tsx`: "Quitaste «X» de tu ruta" con acción "Deshacer"; errores con el tipo de toast de error                                                                                           |
| "Qué quitamos y por qué"  | `Accordion` + `AccordionItem` + `AccordionTrigger` + `AccordionContent`; cada fila: miniatura de la portada en gris + título del curso + motivo en `Badge variant="secondary"` + horas; `Button variant="outline" size="sm"` "Restaurar" sólo si `isUserDiscarded` |

## Modelo de datos

No hay tablas ni columnas nuevas. Este spec lee y actualiza `path_steps` del spec 02.

### Lo que carga `page.tsx`

```ts
// 1) La ruta — RLS filtra al dueño; sin fila → notFound().
//    select("id, title, summary, budget_hours").eq("id", id).single()

// 2) Todos sus pasos, vigentes y descartados, en una sola query:
//    select("id, stage, position, origin, reason, status, discard_reason,
//            courses(title, hours, url, image_url), programs(slug, name)")
//    .eq("path_id", id).order("stage").order("position")
//    `programs` se embebe por `source_program_id` (única FK de path_steps hacia programs);
//    es null para un paso de interés que no pertenece a ningún programa fusionado (ADR 0003).

type PathStepView = {
  id: string;
  stage: number;
  position: number;
  origin: "requerido" | "recomendado" | "opcional" | "interes";
  reason: string;
  status: "pending" | "in_progress" | "done" | "discarded";
  discardReason: string | null;
  courseTitle: string;
  courseHours: number; // Number(courses.hours): numeric(5,1) puede llegar como string (mismo riesgo que el spec 07)
  courseUrl: string;
  courseImageUrl: string | null; // courses.image_url: nullable en el esquema, hoy poblada en los 74
  programSlug: string | null;
  programName: string | null;
};
```

`page.tsx` aplana cada fila a `PathStepView` y le pasa el arreglo completo + `budget_hours` a
`PathStepsView`. La separación vigentes/descartados la hace la vista cliente, no la query, para que
el estado optimista pueda mover un paso de un lado al otro sin recargar.

### `lib/progress/path-progress.ts`

```ts
export const USER_DISCARD_REASON = "lo quitaste vos";

// Forma mínima que necesita el cálculo: el 09 la arma desde su propia query sin depender de
// PathStepView.
type ProgressStep = { status: PathStepStatus; hours: number };

export type PathProgress = {
  activeHours: number; // suma de horas de los pasos con status <> 'discarded'
  doneHours: number; // suma de horas de los pasos con status = 'done'
  percentDone: number; // Math.round(doneHours / activeHours * 100); 0 si activeHours es 0
  activeCount: number;
  doneCount: number;
  fitsInBudget: boolean; // activeHours <= budgetHours; true si budgetHours es null
  overflowHours: number; // max(0, activeHours - budgetHours); 0 si budgetHours es null
};

export function summarizePathProgress(
  steps: ProgressStep[],
  budgetHours: number | null,
): PathProgress;

export function isUserDiscarded(step: {
  status: PathStepStatus;
  discardReason: string | null;
}): boolean;
// status === 'discarded' && discardReason === USER_DISCARD_REASON
```

`in_progress` no suma a `doneHours`: el avance sólo cuenta cursos terminados.

### `app/(app)/paths/[id]/actions.ts`

```ts
type StepActionResult = { ok: true } | { ok: false; message: string };

setStepStatus(stepId: string, status: "pending" | "in_progress" | "done"): Promise<StepActionResult>;
discardStep(stepId: string): Promise<StepActionResult>;
restoreStep(stepId: string): Promise<StepActionResult>;
```

Las tres siguen el mismo patrón que `saveAssessment` del spec 06: argumentos revalidados con zod
(`stepId` uuid, `status` enum de tres valores — `discarded` **no** es un valor válido de
`setStepStatus`), `requireUser()`, `update` filtrado por RLS, y `.select("path_id")` para saber si se
tocó alguna fila. Cero filas actualizadas (paso ajeno, inexistente o en un estado que no permite la
transición) → `{ ok: false }`. Con éxito, `revalidatePath(`/paths/${pathId}`)`.

| Action          | `update`                                                                              | Filtro además de `id`                                               |
| --------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `setStepStatus` | `status`, `completed_at = now()` si `done`, `completed_at = null` si no               | `status <> 'discarded'`                                             |
| `discardStep`   | `status = 'discarded'`, `discard_reason = USER_DISCARD_REASON`, `completed_at = null` | `status = 'pending'`                                                |
| `restoreStep`   | `status = 'pending'`, `discard_reason = null`                                         | `status = 'discarded'` **y** `discard_reason = USER_DISCARD_REASON` |

Los filtros por estado viven en el servidor, no sólo en qué botones muestra la UI: una llamada directa
a la action no puede descartar un paso `done` ni restaurar uno que sacó el motor.

### Agrupación en `path-steps-view.tsx`

Los pasos vigentes se agrupan en el orden en que llegan (ya ordenados por `stage`, `position`):

- `origin === "interes"` → grupo "Por tus intereses", siempre el último.
- si no, un grupo por `programSlug`, titulado con `programName`.

El motor numera los `stage` de forma contigua por programa — Fundamentos, después cada programa de la
meta, después los intereses (`renumberStages` en `lib/paths/build-path.ts`) —, así que agrupar por
programa no altera el orden de estudio.

## Plan de implementación

1. **`lib/progress/path-progress.ts` + `path-progress.test.ts`** — `summarizePathProgress`,
   `USER_DISCARD_REASON`, `isUserDiscarded`. Casos: los descartados no suman ni a `activeHours` ni a
   `doneHours`; `in_progress` no suma a `doneHours`; `hours` con decimales (`8.5 + 6.5`) suma bien;
   `activeHours = 0` da `percentDone = 0` sin `NaN`; `budgetHours = null` da `fitsInBudget: true` y
   `overflowHours: 0`; un exceso da `overflowHours` correcto; `isUserDiscarded` es `false` para los
   tres motivos del motor. Verificación: `npm run test` en verde junto con los del 04, 06 y 07.
2. **`app/(app)/paths/[id]/actions.ts`** — las tres actions con la tabla de transiciones de arriba.
   Antes de escribirlas, confirmar en `node_modules/next/dist/docs/` la firma actual de
   `revalidatePath`. Verificación: compila; se ejercitan en los pasos 6–8.
3. **`components/paths/step-status-toggle.tsx`** — `ToggleGroup` de tres ítems, controlado
   (`value` + `onValueChange`), sin lógica de datos propia. Confirmar la API del `ToggleGroup` de
   Base UI con la skill `shadcn` / Context7 antes de escribirlo (selección única, no permitir
   deseleccionar). Verificación: se ejercita en el paso 6.
4. **`components/paths/budget-card.tsx`, `step-row.tsx`, `discarded-steps.tsx`** — presentacionales,
   reciben datos y callbacks por props, sin llamar actions directamente. Verificación: se ejercitan en
   el paso 6.
5. **`components/paths/path-steps-view.tsx`** — `useOptimistic` sobre el arreglo de pasos con un
   reducer de tres acciones (`status`, `discard`, `restore`) y `startTransition` alrededor de cada
   llamada a una action; `summarizePathProgress` sobre el estado optimista (la tarjeta de horas se
   actualiza al instante); agrupación por programa; `Toaster` montado acá; toast de "Deshacer" tras
   `discardStep` exitoso que llama `restoreStep`; toast de error cuando una action devuelve
   `{ ok: false }` — el estado optimista vuelve solo al terminar la transición porque el servidor no
   cambió el dato (verificado en `node_modules/next/dist/docs/01-app/02-guides/interactive-apps.md`).
   Confirmar con Context7 la API de `toast.add` de Base UI para una acción dentro del toast.
6. **`app/(app)/paths/[id]/page.tsx`** — reescritura: `requireUser()`, las dos queries, aplanado a
   `PathStepView[]`, `notFound()` si la ruta no es del usuario, cabecera + `PathStepsView`.
   Verificación: `npm run dev`, abrir una ruta real generada por el spec 07 y recorrer los criterios
   de aceptación de UI.
7. **Prueba de punta a punta de estado y descarte** — marcar un paso `in_progress`, otro `done`,
   volver uno de `done` a `pending`; quitar un paso `pending` y deshacerlo desde el toast; quitar otro
   y restaurarlo desde el acordeón después de recargar. Tras cada acción, verificar por SQL (MCP de
   Supabase, `execute_sql`) `status`, `discard_reason` y `completed_at` de la fila.
8. **Caminos de rechazo del servidor** — con un test descartable o llamando la action desde la consola
   de un Client Component de prueba (no se commitea): `discardStep` sobre un paso `done`,
   `restoreStep` sobre un paso descartado por el motor, `setStepStatus` con el `stepId` de una ruta de
   otro usuario, y `setStepStatus(id, "discarded")`. Los cuatro devuelven `{ ok: false }` y no
   cambian ninguna fila (verificado por SQL).
9. **`docs/SPECS-MAP.md`** — regla 5: ownership de `app/(app)/paths/[id]/*`, `lib/progress/*` y los
   cinco archivos nuevos de `components/paths/*`; y en la §7 del 09, que reusa
   `summarizePathProgress`. Verificación: `npm run test`, `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] `/paths/<id>` ya no muestra el placeholder del spec 07: muestra los pasos vigentes agrupados por
      programa (con `programs.name` como título) y un grupo final "Por tus intereses" si la ruta tiene
      pasos con `origin = 'interes'`. Verificado en vivo por el usuario (ruta de React: Fundamentos y React).
- [x] Cada paso vigente muestra su número en la línea de tiempo, la portada del curso, título, horas,
      badge de procedencia (`LevelBadge` o badge "interés"), su `reason` y un link "Ver curso" que abre
      `courses.url` en una pestaña nueva. Verificado en vivo por el usuario.
- [x] La tarjeta de horas muestra "X h de Y h", el avance por horas en un `Progress` y "N de M pasos
      hechos", con números iguales a `summarizePathProgress` sobre los pasos de la base. Verificado en vivo por el usuario contra SQL (164 h de 260 h · 0 de 8 · 0 %).
- [x] Una ruta cuyas horas vigentes superan `budget_hours` muestra el `Alert` con las horas de exceso;
      una que cabe no lo muestra. Caso "cabe" verificado en vivo; caso "no cabe" cubierto por el test de `summarizePathProgress`.
- [x] Cambiar un paso a "En curso" o "Hecho" se refleja al instante en la fila y en la tarjeta de
      horas, y persiste tras recargar. En la base: `status` actualizado, `completed_at` no nulo sólo
      cuando `status = 'done'` y `null` al volver a `pending` o `in_progress`. Verificado en vivo por el usuario; `completed_at` verificado por SQL.
- [x] El botón "Quitar" aparece sólo en pasos `pending`. Quitar uno lo saca de la lista, lo muestra en
      "Qué quitamos y por qué" con el motivo "lo quitaste vos", descuenta sus horas de la tarjeta y
      deja la fila con `status = 'discarded'` y `discard_reason = 'lo quitaste vos'`. Verificado en vivo por el usuario; la fila, por SQL.
- [x] El toast de "Deshacer" tras quitar un paso lo devuelve a su grupo y posición originales con
      `status = 'pending'` y `discard_reason = null`. Verificado en vivo por el usuario; la fila, por SQL.
- [x] Tras recargar la página, "Restaurar" en el acordeón hace lo mismo que "Deshacer". Verificado en vivo por el usuario.
- [x] Los pasos descartados por el motor ("ya lo dominás", "no cabía en tu tiempo", "superaba el cupo
      de intereses") aparecen en el acordeón con su motivo y **sin** botón "Restaurar". Verificado en vivo por el usuario (3 "ya lo dominás").
- [x] El acordeón no se renderiza si la ruta no tiene ningún paso descartado. Verificado por el usuario.
- [x] `discardStep` sobre un paso no `pending`, `restoreStep` sobre un descarte del motor,
      `setStepStatus` con `"discarded"` y cualquier action sobre un paso de otro usuario devuelven
      `{ ok: false }` sin modificar filas (verificado por SQL). Verificado por SQL como `authenticated` con RLS dentro de una transacción revertida: 0 filas en cada caso; `"discarded"` lo rechaza zod.
- [x] Si una action falla, la fila vuelve a su estado anterior y aparece un toast de error. Verificado por el usuario.
- [x] `/paths/<id>` de una ruta ajena o inexistente devuelve 404. Verificado por el usuario; sin sesión redirige a `/login`.
- [x] `lib/progress/path-progress.test.ts` cubre los siete casos del paso 1 del plan. 11 casos, 22/22 tests en verde.
- [x] Ningún archivo de este spec crea una migración ni modifica `lib/paths/*`, `lib/catalog/*` o
      `app/layout.tsx`. Verificado con `git diff`: 0 archivos.
- [x] `npm run test`, `npm run lint` y `npm run build` pasan. Verificado.

## Decisiones

- **Sí:** deshacer con dos vías — toast "Deshacer" inmediato **y** "Restaurar" permanente en el
  acordeón. **No:** sólo toast (el arrepentimiento de mañana no tendría salida) ni sólo acordeón (menos
  descubrible justo después de quitar). Con deshacer disponible no hace falta un diálogo de
  confirmación antes de quitar.
- **Sí:** sólo se restauran los pasos que quitó el usuario. **No:** restaurar también los que sacó el
  motor. Devolver un "no cabía en tu tiempo" rompe el invariante "un plan que cabe en tu tiempo" del
  ADR 0004, y devolver un "ya lo dominás" contradice la respuesta del propio usuario; para cambiar eso
  está "Ajustar mi ruta" (spec 15), que genera una ruta nueva.
- **Sí:** distinguir el descarte del usuario por `discard_reason = USER_DISCARD_REASON` ("lo quitaste
  vos", la frase del ADR 0004). **No:** una columna `discarded_by`. Una columna nueva sería una
  migración, prohibida para este spec por la regla 6 del mapa; la constante vive en un solo lugar
  (`lib/progress/path-progress.ts`) y `restoreStep` filtra por ella en el servidor.
- **Sí:** `ToggleGroup` de tres estados siempre visible, con transiciones libres en cualquier
  dirección. **No:** `Select` (dos clics, estado menos visible) ni un botón que sólo avanza (corregir un
  "Hecho" por error exigiría otro control). Volver de `done` a otro estado limpia `completed_at`.
- **Sí:** progreso por horas (`doneHours / activeHours`). **No:** por cantidad de pasos. Es coherente
  con el presupuesto de horas que arma el motor y con el XP por horas del spec 13; un curso de 46 h no
  pesa lo mismo que uno de 6 h. El conteo "N de M pasos" se muestra igual como texto.
- **Sí:** `in_progress` no suma al avance. **No:** contarlo como medio curso. "En curso" no dice cuánto
  falta; sumar una fracción inventaría un dato.
- **Sí:** agrupar por programa con un grupo final "Por tus intereses", como la maqueta del ADR 0001.
  **No:** una lista plana. Verificado en `renumberStages`: los `stage` ya son contiguos por programa,
  así que agrupar no reordena nada, y el grupo hace visible la fusión de programas que la lista plana
  escondería en un chip.
- **Sí:** `fitsInBudget` y `overflowHours` se derivan en `summarizePathProgress`. **No:** leerlos de
  una columna (no existe, el spec 07 decidió no persistirlos). Derivarlos además refleja al instante un
  paso quitado o restaurado por el usuario.
- **Sí:** `lib/progress/path-progress.ts`, carpeta nueva de este spec. **No:** `lib/paths/*` (motor
  puro del spec 04) ni un archivo privado de `app/(app)/paths/[id]/`, que obligaría al 09 a duplicar el
  cálculo o importar de una ruta ajena.
- **Sí:** actualización optimista con `useOptimistic` + `startTransition`, y rollback implícito cuando
  la action falla. **No:** deshabilitar el control con `Spinner` hasta que responda el servidor. Marcar
  varios pasos seguidos se sentiría lento, y el rollback no cuesta código propio: el valor optimista
  deja de aplicarse al terminar la transición y la página vuelve a mostrar lo que dice el servidor.
- **Sí:** las reglas de transición (sólo `pending` se descarta, sólo el descarte del usuario se
  restaura, `discarded` no es un estado válido de `setStepStatus`) se aplican en el `update` del
  servidor. **No:** confiar en que la UI no muestra el botón. Las server actions son endpoints públicos
  (mismo criterio que `saveAssessment` del spec 06).
- **Sí:** el `Toaster` se monta dentro de `path-steps-view.tsx`. **No:** en `app/layout.tsx`. El
  layout raíz no pertenece a ningún spec del mapa y esta es la única pantalla que necesita toasts
  hoy; subirlo al layout el día que otra pantalla los necesite es mover una línea.
- **Sí:** una sola query trae vigentes y descartados, y la vista los separa. **No:** dos queries con
  filtros por `status`. El estado optimista necesita mover un paso de la lista al acordeón (y de
  vuelta) sin recargar, así que la vista tiene que tener los dos conjuntos juntos.
- **Sí:** la vista usa la portada de cada curso (`courses.image_url`, servida desde el CDN de
  Thinkific vía `next/image` + `remotePatterns`) y la mascota `astronauta.webp` en la cabecera.
  **No:** una lista sólo de texto, ni las poses de `public/streak/`. Las portadas ya existen para los 74
  cursos y son las mismas que el usuario reconoce en cursos.devtalles.com; las poses de celebración y
  racha están reservadas para el spec 13 (`CLAUDE.md` §"Marca y assets"). Pedido del usuario durante la
  implementación ("más visual, usá las imágenes").
- **Sí:** línea de tiempo vertical con nodos numerados dentro de la lista. **No:** un camino estilo
  Duolingo en zigzag. Ese recorrido es un mapa, y el mapa es el spec 12 (`visual-path-map`); el
  usuario decidió hacerlo ahí en vez de adelantarlo acá.
- **Sí:** `step-status-toggle.tsx` como archivo propio. **No:** inline en `step-row.tsx`. El spec 12
  lo reusa en el panel de detalle del mapa; es la excepción que justifica un archivo más, no una
  abstracción por repetir tres líneas.

## Riesgos

| Riesgo                                                                                                                                         | Mitigación                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identificar el descarte del usuario por un string es frágil: si el motor algún día usa la misma frase, sus descartes se volverían restaurables | La constante vive en un solo lugar y el test verifica que `isUserDiscarded` es `false` para los tres motivos actuales del motor; un motivo nuevo del motor que coincida rompería ese test si se agrega al caso |
| Restaurar un paso quitado por el usuario puede dejar la ruta por encima del presupuesto                                                        | Aceptado: el paso estaba en la ruta original; el `Alert` de exceso lo refleja al instante con las horas exactas                                                                                                |
| Dos pestañas abiertas sobre la misma ruta pueden mostrar estados distintos hasta recargar                                                      | Aceptado: el `update` es idempotente y los filtros de estado del servidor impiden transiciones inválidas; la pestaña vieja se corrige en la siguiente acción o recarga                                         |
| La API de `toast` / `ToggleGroup` de Base UI puede diferir de la de Radix que suele aparecer en ejemplos                                       | Pasos 3 y 5 del plan: verificarla con la skill `shadcn` y Context7 antes de escribir, no de memoria                                                                                                            |
| `courses.hours` (`numeric`) puede llegar como string desde PostgREST                                                                           | `page.tsx` normaliza con `Number()` al aplanar a `PathStepView`, igual que el spec 07                                                                                                                          |

## Qué **no** entra en este spec

- Dashboard con todas las rutas (09), mapa visual (12), gamificación (13), compartir (14),
  personalización con IA (11) y "Ajustar mi ruta" (15).
- Restaurar descartes del motor, descartar pasos `in_progress`/`done`, reordenar pasos, agregar cursos
  a mano, editar título o razones, borrar una ruta.
- Cualquier migración o columna nueva, y cualquier cambio a `lib/paths/*`, `lib/catalog/*` o
  `app/layout.tsx`.

Cada uno de estos, si aterriza, va en su propio spec.
