# SPEC 09 — Dashboard de rutas: todas mis rutas, su progreso y crear o borrar una

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 03, SPEC 07, SPEC 08
> **Fecha:** 2026-09-23
> **Objetivo:** Reemplazar el placeholder de `/dashboard` por el dashboard real — cabecera con el
> usuario, grilla de todas sus rutas con su avance por horas y su próximo curso, acceso a crear una
> ruta nueva y borrar una ruta con confirmación.

## Por qué existe este spec

Hoy `/dashboard` es el placeholder del spec 03 (`app/dashboard/page.tsx`): una tarjeta con avatar,
el rol, "Crear mi ruta" (agregado por el 06) y "Cerrar sesión". Un usuario puede generar varias rutas
(spec 07) y marcar su progreso en cada una (spec 08), pero **no tiene ninguna pantalla que las
liste**: la única forma de volver a una ruta vieja es guardar su URL. La mitad de "guardar varias
rutas y marcar progreso" de `docs/ENUNCIADO.md` está hecha en datos y falta en pantalla.

Con este spec mergeado se cierra el **Hito 1** de `docs/SPECS-MAP.md`: los cinco requisitos
obligatorios del enunciado quedan cumplidos sin `OPENAI_API_KEY` ni rol `admin`.

**Dependencias, una por motivo distinto:**

- **SPEC 02** — `learning_paths` y `path_steps` con la política `for all` por dueño (el `delete` del
  dueño ya está permitido) y el `on delete cascade` de `path_steps.path_id`, que hace que borrar una
  ruta no necesite borrar sus pasos a mano.
- **SPEC 03** — `requireUser()` (con `username`, `avatarUrl`), `signOut` y el placeholder
  `app/dashboard/page.tsx` que este spec borra (regla 5 del mapa).
- **SPEC 07** — las filas de `learning_paths` + `path_steps` que se listan, y la ruta `/quiz` →
  generación que el botón "Crear nueva ruta" dispara.
- **SPEC 08** — `summarizePathProgress` y `formatHours` de `lib/progress/path-progress.ts`: el avance
  de cada tarjeta se calcula con esas funciones, no se reimplementa. Y `/paths/[id]`, destino de cada
  tarjeta.

## Alcance

**Entra:**

- **Borrar** `app/dashboard/page.tsx` (placeholder del spec 03) y crear
  `app/(app)/dashboard/page.tsx`: Server Component que carga todas las rutas del usuario con sus
  pasos en una sola query y compone la cabecera, el botón "Crear nueva ruta", la grilla de tarjetas o
  el estado vacío. La URL sigue siendo `/dashboard`, así que el callback de OAuth, `/login`,
  `requireAdmin()`, `quiz-form.tsx` y el "Volver al dashboard" de `/paths/[id]` no cambian.
- `app/(app)/dashboard/actions.ts` (`'use server'`): `deletePath(pathId)`.
- `lib/progress/next-step.ts`: función pura `findNextStep()` — el próximo curso de una ruta (el
  primer `in_progress` en orden de estudio; si no hay, el primer `pending`; si no hay, `null`).
  Archivo nuevo, propiedad de este spec, dentro de la carpeta del 08 (ver Decisiones).
- `lib/progress/next-step.test.ts`: casos de `findNextStep`.
- `components/dashboard/path-card.tsx`: la tarjeta de una ruta (presentacional).
- `components/dashboard/delete-path-button.tsx` (cliente): botón "Eliminar" + `Dialog` de
  confirmación que llama a `deletePath`.
- Actualizar `docs/SPECS-MAP.md` regla 5: el 09 es dueño de `app/(app)/dashboard/*`,
  `components/dashboard/*` y `lib/progress/next-step{,.test}.ts`, y el placeholder
  `app/dashboard/page.tsx` ya no existe.

**Qué NO entra (queda para otros specs):**

- Borrar la fila de `assessments` que originó la ruta: se conserva (ver Decisiones).
- Borrar una ruta desde `/paths/[id]`: sólo desde el dashboard.
- Totales agregados arriba de la lista (rutas activas, horas hechas en total), XP, nivel, insignias
  y racha: la barra `components/gamification/xp-bar.tsx` la conecta el spec 14, no este.
- Un layout compartido `app/(app)/layout.tsx` con barra superior para dashboard, quiz y paths: la
  cabecera con avatar y "Cerrar sesión" vive sólo en el dashboard.
- Link al panel `/admin` para usuarios `admin` (spec 10) y el badge del rol que mostraba el
  placeholder.
- Renombrar, duplicar, archivar, filtrar, buscar o paginar rutas; ordenar por última actividad.
- Cualquier migración o columna nueva (regla 6 del mapa).
- Tocar `lib/progress/path-progress.ts`, `app/(app)/paths/*`, `components/paths/*`,
  `components/quiz/*`, `lib/supabase/*` o `app/layout.tsx`.

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*` y `@phosphor-icons/react` (sufijo `Icon`;
desde `/ssr` en `page.tsx` y `path-card.tsx`, que son Server Components), sin colores, radios ni
sombras fuera de los tokens del tema (`CLAUDE.md` §"UI: componer, no crear"). Los dos archivos de
`components/dashboard/` son composiciones, no primitivas nuevas: `path-card.tsx` se separa porque se
repite por ruta, y `delete-path-button.tsx` porque es la única parte con estado de cliente.

| Elemento             | Qué se reusa                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabecera             | `<header>` con `brand-gradient-soft` + `shadow-brand` (mismos tokens que la cabecera de `/paths/[id]`): `Avatar` (+ `AvatarImage` / `AvatarFallback` con iniciales), `Eyebrow` "Tu panel", saludo "Hola, {username}" como `h1`, y a la derecha un `<form action={signOut}>` con `Button variant="outline"` "Cerrar sesión" (`SignOutIcon`)                                                                                                                       |
| Título de la lista   | `h2` "Tus rutas" + "N rutas" en `text-muted-foreground`, y `Button variant="brand"` + `Link` "Crear nueva ruta" (`PlusIcon`) a `/quiz`; sólo cuando hay al menos una ruta                                                                                                                                                                                                                                                                                        |
| Tarjeta de ruta      | `Card` + `CardHeader` (`CardTitle` = `title`, `CardDescription` = "Creada el {fecha}") + `CardAction` con el botón de borrar; `CardContent` con `Progress` (avance por horas) + "{percentDone} %" y "N de M cursos hechos · X h de Y h" (`formatHours`); bloque "Próximo curso": `Badge variant="secondary"` "En curso" o "Pendiente" + título del curso; si no hay próximo, `Badge` "Ruta completada" (`CheckCircleIcon`)                                       |
| Acción de la tarjeta | `CardFooter` con `Button` + `Link` a `/paths/{id}`: "Continuar" (`ArrowRightIcon`) si hay algún paso `done` o `in_progress`, "Empezar" si no hay ninguno, "Ver ruta" si está completada                                                                                                                                                                                                                                                                          |
| Borrar               | `Button variant="ghost" size="icon-sm"` con `TrashIcon` y `aria-label="Eliminar ruta {title}"` → `Dialog` + `DialogContent` + `DialogHeader` (`DialogTitle` "¿Eliminar esta ruta?", `DialogDescription` con el título y "Se pierde el progreso marcado. No se puede deshacer.") + `DialogFooter` con `DialogClose` "Cancelar" y `Button variant="destructive"` "Eliminar" (`Spinner` mientras borra); si falla, `Alert variant="destructive"` dentro del diálogo |
| Estado vacío         | `Empty` + `EmptyHeader` + `EmptyMedia` con `public/astronauta.webp` (`next/image`, `alt=""`) + `EmptyTitle` "Todavía no tienes rutas" + `EmptyDescription` "Responde el cuestionario y armamos tu primera ruta con los cursos de DevTalles." + `EmptyContent` con `Button variant="brand"` "Crear mi primera ruta" a `/quiz`                                                                                                                                     |
| Grilla               | `grid` de una columna en móvil, dos en `md`, tres en `xl`                                                                                                                                                                                                                                                                                                                                                                                                        |

Antes de escribir la cabecera y la tarjeta, confirmar en el código de `components/ui/card.tsx`,
`button.tsx` (variantes y tamaños reales, incluido `icon-sm` y `destructive`) y `empty.tsx` que las
piezas y variantes de la tabla existen; si alguna no existe, se usa la más cercana que sí existe, no
se crea una.

## Modelo de datos

No hay tablas ni columnas nuevas. Este spec lee `learning_paths` + `path_steps` + `courses` y borra
filas de `learning_paths`.

### Lo que carga `page.tsx`

```ts
// Una sola query: RLS filtra al dueño.
// supabase.from("learning_paths")
//   .select("id, title, created_at, budget_hours,
//            path_steps(status, stage, position, courses(title, hours))")
//   .order("created_at", { ascending: false })
//
// Los pasos embebidos se ordenan en el servidor de Node con findNextStep (stage, position), no con
// un .order() sobre la tabla embebida: así el orden no depende de la sintaxis de PostgREST para
// ordenar recursos embebidos.

type DashboardPath = {
  id: string;
  title: string;
  createdAt: string; // ISO; se formatea con locale fijo "es-ES" (mismo motivo que formatHours)
  progress: PathProgress; // summarizePathProgress(steps, budgetHours) del spec 08
  nextStep: NextStep | null; // findNextStep(steps)
};
```

`page.tsx` aplana cada fila a `DashboardPath`, normalizando `courses.hours` y `budget_hours` con
`Number()` (numeric puede llegar como string, mismo riesgo que en los specs 07 y 08). Una sola query
para todas las rutas, no una por tarjeta: con N rutas serían N+1 viajes a Supabase.

### `lib/progress/next-step.ts`

```ts
type NextStepCandidate = {
  status: PathStepStatus;
  stage: number;
  position: number;
  courseTitle: string;
};

export type NextStep = {
  courseTitle: string;
  status: "pending" | "in_progress";
};

export function findNextStep(steps: NextStepCandidate[]): NextStep | null;
// 1) ordena una copia por (stage, position) — no muta la entrada
// 2) el primer in_progress, si existe
// 3) si no, el primer pending
// 4) si no (todo done o discarded), null
```

`in_progress` gana sobre un `pending` anterior porque es lo que el usuario ya está cursando.

### `app/(app)/dashboard/actions.ts`

```ts
type DeletePathResult = { ok: true } | { ok: false; message: string };

deletePath(pathId: string): Promise<DeletePathResult>;
```

Mismo patrón que las actions del spec 08: `pathId` revalidado con zod (uuid), `requireUser()`,
`delete().eq("id", pathId).select("id")` filtrado por RLS; cero filas borradas (ruta ajena o
inexistente) → `{ ok: false }`. Con éxito, `revalidatePath("/dashboard")`. Los `path_steps` se van
por el `on delete cascade` del spec 02; la fila de `assessments` no se toca.

## Plan de implementación

1. **Mover el placeholder** — borrar `app/dashboard/page.tsx` y crear
   `app/(app)/dashboard/page.tsx` con el mismo contenido del placeholder, sin cambios. Es el primer
   paso obligatorio del mapa (regla 5): nunca coexisten dos archivos que resuelvan `/dashboard`.
   Verificación: `npm run build` pasa; `/dashboard` sigue mostrando el placeholder; login con OAuth
   sigue aterrizando en `/dashboard`.
2. **`lib/progress/next-step.ts` + `next-step.test.ts`** — `findNextStep`. Casos: un `in_progress`
   gana sobre un `pending` con `stage` menor; sin `in_progress`, el `pending` de menor
   (`stage`, `position`); entrada desordenada da el mismo resultado que ordenada; los `discarded` se
   ignoran; todo `done`/`discarded` da `null`; arreglo vacío da `null`; la entrada no se muta.
   Verificación: `npm run test` en verde junto con los de specs anteriores.
3. **`app/(app)/dashboard/actions.ts`** — `deletePath` con el patrón de arriba. Antes de escribirla,
   confirmar en `node_modules/next/dist/docs/` la firma actual de `revalidatePath` y con Context7 que
   `.delete().select()` de supabase-js devuelve las filas borradas. Verificación: compila; se ejercita
   en los pasos 6 y 7.
4. **`components/dashboard/path-card.tsx`** — presentacional, recibe un `DashboardPath` y renderiza
   el botón de borrar por composición. Verificación: se ejercita en el paso 6.
5. **`components/dashboard/delete-path-button.tsx`** — `Dialog` controlado, `useTransition` alrededor
   de `deletePath`; cierra el diálogo con `{ ok: true }` (la tarjeta desaparece por el
   `revalidatePath`), muestra el `Alert` con `{ ok: false }` y deja el diálogo abierto. Confirmar con
   la skill `shadcn` / Context7 la API del `Dialog` de Base UI (control `open` / `onOpenChange`,
   `DialogClose` con `render`) antes de escribirlo. Verificación: se ejercita en el paso 6.
6. **Reescribir `app/(app)/dashboard/page.tsx`** — `requireUser()`, la query, aplanado a
   `DashboardPath[]`, cabecera, título de la lista, grilla o estado vacío. Verificación:
   `npm run dev` con un usuario con 0 rutas (estado vacío → `/quiz`), luego generar dos rutas, marcar
   progreso en una desde `/paths/[id]` y comparar cada tarjeta con SQL (MCP de Supabase,
   `execute_sql`): porcentaje, "N de M", horas y próximo curso.
7. **Borrado de punta a punta y caminos de rechazo** — borrar una ruta desde el diálogo y verificar
   por SQL que la fila de `learning_paths` y sus `path_steps` ya no existen y que la fila de
   `assessments` sigue; "Cancelar" no borra nada. Con un test descartable o desde un Client Component
   de prueba (no se commitea): `deletePath` con el id de una ruta de otro usuario, con un uuid
   inexistente y con un string que no es uuid devuelven `{ ok: false }` sin borrar filas (verificado
   por SQL).
8. **`docs/SPECS-MAP.md`** — regla 5: ownership de `app/(app)/dashboard/*`, `components/dashboard/*`
   y `lib/progress/next-step{,.test}.ts`, y quitar las menciones al placeholder de
   `app/dashboard/page.tsx` como vigente. Verificación: `npm run test`, `npm run lint` y
   `npm run build` pasan.

## Criterios de aceptación

- [x] `app/dashboard/page.tsx` no existe y `app/(app)/dashboard/page.tsx` sí; `/dashboard` responde y
      el login con OAuth sigue redirigiendo ahí.
- [x] `/dashboard` sin sesión redirige a `/login`.
- [x] La cabecera muestra el avatar (o las iniciales si no hay `avatar_url`), "Hola, {username}" y un
      botón "Cerrar sesión" que cierra la sesión y lleva a `/login`.
- [x] Un usuario sin rutas ve el estado vacío con la mascota y "Crear mi primera ruta", que lleva a
      `/quiz`; no ve la grilla ni el botón "Crear nueva ruta".
- [x] Un usuario con rutas ve una tarjeta por cada una de **sus** rutas (ninguna ajena), la más nueva
      primero, y el botón "Crear nueva ruta" que lleva a `/quiz`.
- [x] En cada tarjeta, el porcentaje, "N de M cursos hechos" y "X h de Y h" coinciden con
      `summarizePathProgress` sobre los pasos de esa ruta en la base (descartados excluidos),
      verificado por SQL en al menos una ruta con progreso y una sin progreso. *(verificado en dos rutas sin pasos `done`: la base no tiene ninguna con pasos hechos)*
- [x] El "Próximo curso" de cada tarjeta coincide con `findNextStep` (verificado por SQL); una ruta sin
      pasos `pending` ni `in_progress` muestra "Ruta completada" y el botón "Ver ruta". *("Ruta completada" no se ejercitó: ninguna ruta de la base está completa)*
- [x] El botón de la tarjeta dice "Empezar" si ningún paso está `done` ni `in_progress`, y "Continuar"
      si alguno lo está; en todos los casos lleva a `/paths/{id}`.
- [x] Marcar un paso como hecho en `/paths/[id]` y volver con "Volver al dashboard" muestra la tarjeta
      con el avance actualizado.
- [x] "Eliminar" abre un diálogo de confirmación; "Cancelar" lo cierra sin borrar nada.
- [x] Confirmar el borrado cierra el diálogo, la tarjeta desaparece sin recargar a mano, y por SQL: la
      fila de `learning_paths` y sus `path_steps` no existen, la de `assessments` sí. Borrar la última
      ruta muestra el estado vacío.
- [x] `deletePath` con el id de una ruta ajena, un uuid inexistente o un string que no es uuid
      devuelve `{ ok: false }` y no borra filas (verificado por SQL); si falla desde la UI, el diálogo
      queda abierto con un `Alert` de error.
- [x] El botón de borrar tiene `aria-label` con el título de la ruta y el diálogo se puede operar con
      teclado (Tab, Enter, Escape).
- [x] La página carga todas las rutas con una sola query a `learning_paths` (sin una query por
      tarjeta).
- [x] `lib/progress/next-step.test.ts` cubre los siete casos del paso 2 del plan.
- [x] Ningún archivo de este spec crea una migración ni modifica `lib/progress/path-progress.ts`,
      `app/(app)/paths/*`, `components/paths/*`, `components/quiz/*`, `lib/supabase/*` o
      `app/layout.tsx` (verificado con `git diff --stat`).
- [x] `npm run test`, `npm run lint` y `npm run build` pasan.

## Decisiones

- **Sí:** mover el placeholder a `app/(app)/dashboard/page.tsx` y borrar el original, como primer
  paso del plan. **No:** reescribirlo en `app/dashboard/`. Queda junto a `quiz/` y `paths/` en el
  route group de la app autenticada, y la URL `/dashboard` no cambia, así que ningún redirect ni link
  existente se toca. Moverlo sin cambios antes de reescribirlo aísla el riesgo de dos rutas que
  resuelven `/dashboard` (regla 5 del mapa) en un paso verificable por sí solo.
- **Sí:** cabecera propia del dashboard con avatar, saludo y "Cerrar sesión". **No:** un
  `app/(app)/layout.tsx` compartido con barra superior. Un layout cambiaría la presentación de
  `/quiz` y `/paths/[id]`, que son de los specs 06 y 08; si hace falta una barra global, es un spec
  propio.
- **Sí:** tarjeta completa — avance por horas, "N de M", horas, próximo curso y botón con texto según
  el estado. **No:** tarjeta mínima sólo con porcentaje. El próximo curso responde "¿por dónde sigo?"
  sin abrir la ruta, que es la razón de volver al dashboard.
- **Sí:** el avance se calcula con `summarizePathProgress` del spec 08. **No:** recalcularlo en el
  dashboard ni leer un porcentaje persistido (no existe). El dashboard y `/paths/[id]` muestran
  siempre el mismo número.
- **Sí:** `findNextStep` en `lib/progress/next-step.ts`, archivo nuevo de este spec. **No:** agregarla
  a `path-progress.ts` (archivo del spec 08; regla 5, un archivo pertenece a un solo spec) ni dejarla
  inline en `page.tsx` (es lógica con casos borde que merece test, y el spec 14 puede querer el mismo
  "próximo curso").
- **Sí:** "próximo curso" = primer `in_progress`, y si no hay, primer `pending`. **No:** siempre el
  primer `pending`. Si el usuario ya está cursando algo, eso es lo que sigue, aunque haya un
  pendiente anterior.
- **Sí:** borrar una ruta desde el dashboard con un `Dialog` de confirmación. **No:** borrar sin
  confirmar con "Deshacer" como en el spec 08. Allá quitar un paso es reversible (`status =
'discarded'`); acá es un `delete` real con cascade y no hay forma de volver, así que la confirmación
  va antes.
- **Sí:** al borrar una ruta se conserva su fila de `assessments`. **No:** borrarla también. Es un solo
  `delete`, no hay que verificar si otra ruta la referencia, y el spec 16 ("Ajustar mi ruta") prellena
  el cuestionario con respuestas anteriores. El usuario no ve la diferencia.
- **Sí:** el error del borrado se muestra con un `Alert` dentro del diálogo. **No:** un toast. El
  `Toaster` sólo está montado dentro de la vista de `/paths/[id]` (decisión del spec 08) y moverlo a
  `app/layout.tsx` queda fuera de este spec; el diálogo ya está abierto y es el lugar natural del
  mensaje.
- **Sí:** sin update optimista al borrar; el diálogo muestra `Spinner` hasta que responde el servidor.
  **No:** `useOptimistic` como en el 08. Borrar es una acción rara y destructiva: esperar la
  confirmación del servidor antes de hacer desaparecer la tarjeta es más honesto que hacerla volver
  si falla.
- **Sí:** orden por `created_at` descendente. **No:** por última actividad. No hay columna de
  actividad, y derivarla de `path_steps.completed_at` ignora los cambios a `in_progress`; agregar una
  columna es una migración, prohibida para este spec por la regla 6 del mapa.
- **Sí:** una sola query con `path_steps` embebidos. **No:** una query por ruta. Evita N+1 viajes a
  Supabase con muchas rutas.
- **Sí:** sin totales agregados arriba de la lista ni la `xp-bar`. **No:** adelantar indicadores de
  gamificación. XP, nivel y racha son del spec 14; unos totales sin XP serían una pieza que el 14
  tendría que rehacer.
- **Sí:** se quita el badge del rol que mostraba el placeholder. **No:** conservarlo. Era un
  artefacto de depuración del spec 03; el acceso de un `admin` a su panel lo resuelve el spec 10.

## Riesgos

| Riesgo                                                                                                                     | Mitigación                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Durante el paso 1, si se crea el archivo nuevo antes de borrar el viejo, dos rutas resuelven `/dashboard` y el build falla | El paso 1 borra y crea en el mismo cambio y su verificación es `npm run build`                                                                                                                                                                                              |
| El Router Cache puede mostrar un dashboard viejo al volver desde `/paths/[id]` después de marcar progreso                  | La página es dinámica (lee cookies vía `requireUser()`); el paso 6 lo verifica con un criterio de aceptación explícito. Si aun así falla, se resuelve dentro de este spec sin tocar las actions del 08 — y si no se puede, se anota como hallazgo para el spec que le toque |
| Un usuario con muchas rutas largas trae muchos `path_steps` en una sola query                                              | Aceptado para el MVP: una ruta tiene decenas de pasos, no miles, y sólo se piden cuatro columnas por paso; paginar queda fuera de alcance                                                                                                                                   |
| La API del `Dialog` de Base UI puede diferir de la de Radix que suele aparecer en ejemplos                                 | Paso 5 del plan: verificarla con la skill `shadcn` y Context7 antes de escribir, no de memoria                                                                                                                                                                              |
| `courses.hours` y `budget_hours` (`numeric`) pueden llegar como string desde PostgREST                                     | `page.tsx` normaliza con `Number()` al aplanar, igual que los specs 07 y 08                                                                                                                                                                                                 |
| Borrar una ruta es irreversible                                                                                            | Diálogo de confirmación con el título de la ruta y la advertencia explícita de que se pierde el progreso                                                                                                                                                                    |

## Qué **no** entra en este spec

- Borrar el `assessment` de una ruta borrada, borrar desde `/paths/[id]`, renombrar, duplicar,
  archivar, filtrar, buscar, paginar u ordenar por actividad.
- Layout compartido de `(app)`, totales agregados, XP / nivel / racha (14), link a `/admin` (10).
- Cualquier migración o columna nueva, y cualquier cambio a `lib/progress/path-progress.ts`,
  `app/(app)/paths/*`, `components/paths/*`, `components/quiz/*`, `lib/supabase/*` o
  `app/layout.tsx`.

Cada uno de estos, si aterriza, va en su propio spec.
