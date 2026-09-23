# SPEC 10 — Panel de administración: cursos, programas y la ubicación de cada curso en su ruta

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 03, SPEC 04, SPEC 09
> **Fecha:** 2026-09-23
> **Objetivo:** Construir el panel `/admin`, protegido por rol `admin`, para crear, editar y
> desactivar cursos, crear y editar programas, y ubicar cada curso en uno o más programas. Así un
> curso nuevo de DevTalles puede aparecer en una ruta generada sin tocar código ni SQL.

## Por qué existe este spec

`docs/ENUNCIADO.md` pide que la app "permita la adición de nuevas características en el futuro" y
que se adapte "a las necesidades cambiantes de la comunidad". Hoy, sumar un curso nuevo de
DevTalles exige escribir SQL a mano contra `courses` y `program_courses`. El motor de reglas (spec 04) arma las rutas a partir de los programas oficiales, no del catálogo suelto, así que un curso que
no está ubicado en ningún programa nunca aparece en una ruta generada. Ya pasa con
`qwik-introduccion` y `go-microservicios`. Por eso este panel gestiona cursos **y** su ubicación en
programas: un CRUD de solo cursos sería decorativo.

El esquema ya existe. El spec 02 dejó `courses`, `programs` y `program_courses` con lectura pública
y escritura solo para `private.is_admin()`. Este spec **no crea ninguna migración** (regla 6 del
mapa).

**Dependencias, una por motivo distinto:**

- **SPEC 02**: las tres tablas del catálogo, sus `unique` (`courses.slug`, `programs.slug`,
  `(program_id, stage, level, position)`, `(program_id, course_id)`), sus FK (`path_steps.course_id`
  y `program_courses.course_id` son `on delete restrict`, `path_steps.source_program_id` es
  `on delete set null`) y las políticas RLS de escritura solo admin.
- **SPEC 03**: `requireAdmin()` de `lib/supabase/guards.ts`, que lee `profiles.role`.
- **SPEC 04**: `GOALS` (`lib/paths/goals.ts`), `INTERESTS` y `TECH_TO_SLUGS`
  (`lib/paths/interests.ts`). Este spec **solo los importa** para dos chequeos: si un programa es
  alcanzable desde alguna meta y si el motor usa un curso por su slug. No los modifica.
- **SPEC 09**: `app/(app)/dashboard/page.tsx`, que recibe el link "Panel de administración" para
  los usuarios `admin` (excepción explícita a la regla 5, ver Decisiones).

## Alcance

**Entra:**

- `app/(admin)/admin/layout.tsx`: la estructura del panel, con cabecera, navegación "Cursos" /
  "Programas" y "Volver al dashboard". No hace el chequeo de rol: ese va en cada página y en cada
  action (ver Decisiones).
- `app/(admin)/admin/page.tsx`: la lista de cursos (activos e inactivos) con búsqueda por título o
  slug vía `?q=`, columna "Programas" y badge "Sin programa".
- `app/(admin)/admin/courses/new/page.tsx`: el formulario de alta de curso.
- `app/(admin)/admin/courses/[slug]/page.tsx`: el formulario de edición del curso,
  activar/desactivar, y debajo sus ubicaciones en programas.
- `app/(admin)/admin/courses/actions.ts` (`'use server'`): `createCourse`, `updateCourse`,
  `setCourseActive`, `addPlacement`, `updatePlacement` y `removePlacement`.
- `app/(admin)/admin/programs/page.tsx`: la lista de programas, cada uno con su cantidad de cursos y
  si es alcanzable desde el cuestionario.
- `app/(admin)/admin/programs/new/page.tsx`: el alta de programa.
- `app/(admin)/admin/programs/[slug]/page.tsx`: la edición del programa (nombre y posición) y sus
  cursos ordenados por etapa y nivel, de solo lectura, con link a cada curso.
- `app/(admin)/admin/programs/actions.ts` (`'use server'`): `createProgram` y `updateProgram`.
- `lib/admin/course-schema.ts`: el schema zod del curso (compartido entre cliente y servidor),
  `parseLines()` (textarea → `string[]`) y la regla del host de `image_url`.
- `lib/admin/program-schema.ts`: el schema zod del programa y de una ubicación (placement).
- `lib/admin/engine-references.ts`: funciones puras `findEngineReferences(courseSlug)` (qué
  intereses o tecnologías del motor usan ese slug) e `isProgramReachable(programSlug)` (si alguna
  meta de `GOALS` lo elige o es `fundamentos`).
- Los tests de las tres anteriores: `lib/admin/*.test.ts`.
- `components/admin/course-form.tsx` (cliente), `components/admin/course-placements.tsx` (cliente),
  `components/admin/program-form.tsx` (cliente) y `components/admin/courses-table.tsx`
  (presentacional).
- `components/ui/checkbox.tsx`: se agrega con `npx shadcn add checkbox`, en la variante Base UI del
  proyecto (ver Decisiones).
- *Agregados durante la implementación:* `components/admin/admin-nav.tsx` (cliente, marca la sección
  activa con `usePathname`; el layout no se re-renderiza al navegar), `components/admin/course-status-card.tsx`
  (la `Card` "Estado" con el botón que llama a `setCourseActive`), `lib/admin/postgres-errors.ts` +
  test (la tabla de mensajes de errores de Postgres, compartida por las dos `actions.ts` — un archivo
  `'use server'` solo puede exportar funciones async) y `courseUpdateSchema` en `course-schema.ts`
  (el schema sin `slug`, para que un slug heredado que no es kebab-case — `PHP-moderno`,
  `NestJS-Testing` — no bloquee editar el resto del curso). `EngineReference` de tecnología lleva
  también `label`, para nombrarla en el mensaje de rechazo.
- **Excepción a la regla 5:** en `app/(app)/dashboard/page.tsx` (spec 09) se agrega un botón
  "Panel de administración" en la cabecera, solo cuando `role === 'admin'`. No se toca nada más de
  ese archivo.
- Actualizar `docs/SPECS-MAP.md`: en la regla 5, que el 10 es dueño de `app/(admin)/*`,
  `components/admin/*`, `lib/admin/*` y `components/ui/checkbox.tsx`, más la excepción del
  dashboard; en la §4, cerrar las dos decisiones pendientes del 10.

**Qué NO entra (queda para otros specs o fuera del MVP):**

- Cualquier migración, columna, política RLS o función nueva (regla 6 del mapa).
- Borrar cursos o programas con `DELETE`. Un curso se desactiva y un programa no se borra.
- Editar el `slug` de un curso o de un programa después de crearlo.
- Editar `GOALS`, `INTERESTS` o `TECH_TO_SLUGS` desde el panel: siguen siendo código. Un programa
  nuevo no aparece en el cuestionario hasta que alguien edite `lib/paths/goals.ts` (el panel lo
  avisa).
- Reordenar las alternativas de un mismo paso (la `position` dentro de programa + etapa + nivel) a
  mano: se asigna sola.
- Gestionar usuarios o roles desde el panel. El primer admin se sigue promoviendo desde el panel de
  Supabase (decisión del spec 02).
- Recalcular las rutas ya generadas cuando cambia un curso o un programa. Las rutas viejas conservan
  sus `path_steps`.
- Subir imágenes: `image_url` se pega como URL.
- Tocar `lib/paths/*`, `lib/catalog/*`, `lib/supabase/*`, `next.config.ts`, `app/layout.tsx`,
  `app/(app)/paths/*`, `components/paths/*`, `components/quiz/*`, `components/dashboard/*`, ni el
  resto de `app/(app)/dashboard/page.tsx` fuera del link.

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*` y `@phosphor-icons/react` (sufijo `Icon`;
se importan desde `/ssr` en las páginas y en `courses-table.tsx`, que son Server Components). No se
usan colores, radios ni sombras fuera de los tokens del tema (`CLAUDE.md` §"UI: componer, no
crear"). La única pieza nueva es `components/ui/checkbox.tsx`, la primitiva oficial de shadcn, no un
componente propio. Los archivos de `components/admin/` son composiciones.

| Elemento                    | Qué se reusa                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estructura del panel        | `<header>` con `brand-gradient-soft` + `shadow-brand` (mismos tokens que el dashboard): `Eyebrow` "Administración", `h1` "Panel de administración", `Button variant="ghost"` + `Link` "Volver al dashboard" (`ArrowLeftIcon`); navegación con `Button variant="ghost"` + `Link` "Cursos" / "Programas", marcando el activo                                                                                              |
| Lista de cursos             | `<form method="get">` con `Input` "Buscar por título o slug" + `Button` "Buscar"; `Button variant="brand"` + `Link` "Nuevo curso" (`PlusIcon`); `Table` con título (link a la edición), slug (`font-mono`), horas, `LevelBadge` o `Badge` de dificultad, "Programas" (N, o `Badge variant="destructive"` "Sin programa") y `Badge variant="secondary"` "Inactivo" si corresponde                                        |
| Formulario de curso         | `Field` + `Label` + `Input` (texto, número, URL); `Textarea` para `summary`, `outcome` y los seis arreglos ("uno por línea", como texto de ayuda); `Select` para `difficulty`; `Checkbox` para `is_free`, `is_pro`, `is_new` e `in_construction`; `slug` como `Input` deshabilitado en la edición; `Button variant="brand"` "Guardar" (`Spinner` mientras guarda); `Alert variant="destructive"` si el servidor rechaza |
| Activar / desactivar        | `Card` "Estado" con `Badge` "Activo" / "Inactivo" y `Button variant="outline"` "Desactivar" / "Reactivar"; si el servidor lo rechaza, `Alert variant="destructive"` que lista los programas, intereses o tecnologías que usan el curso                                                                                                                                                                                  |
| Ubicaciones del curso       | `Card` "Dónde aparece este curso" + `Table` (programa, etapa, `LevelBadge` del nivel, nota) con `Button variant="ghost" size="icon-sm"` editar (`PencilSimpleIcon`) y quitar (`TrashIcon`), cada uno con `aria-label`; "Agregar a un programa" abre un `Dialog` con `Select` de programa, `Input` de etapa, `Select` de nivel y `Textarea` de nota. Quitar pide confirmación en un `Dialog`                             |
| Lista de programas          | `Table` con posición, nombre, slug, cantidad de cursos y `Badge variant="secondary"` "No está en el cuestionario" si `isProgramReachable` es `false`; `Button variant="brand"` "Nuevo programa"                                                                                                                                                                                                                         |
| Formulario de programa      | `Field` + `Input` para slug (solo al crear), nombre y posición; `Alert` (variante no destructiva) "Este programa no aparece en ninguna meta del cuestionario…" cuando no es alcanzable                                                                                                                                                                                                                                  |
| Detalle de programa         | Debajo del formulario, `Card` con los cursos agrupados por etapa: cada fila con `LevelBadge`, título (link a `/admin/courses/[slug]`), nota y horas                                                                                                                                                                                                                                                                     |
| Link desde el dashboard     | `Button variant="outline"` + `Link` "Panel de administración" (`ShieldCheckIcon`) en la cabecera de `/dashboard`, al lado de "Cerrar sesión", solo si `role === 'admin'`                                                                                                                                                                                                                                                |
| Estado vacío de la búsqueda | `Empty` + `EmptyTitle` "Ningún curso coincide con «{q}»" + `Button variant="outline"` "Ver todos"                                                                                                                                                                                                                                                                                                                       |

Antes de escribir cada pantalla, confirmar en el código de `components/ui/*` que las piezas y
variantes de la tabla existen (en particular `Badge variant="destructive"`, `Button size="icon-sm"`,
`Field` y `Table`). Si alguna no existe, se usa la más cercana que sí existe, sin crear una nueva.

## Modelo de datos

No hay tablas, columnas ni políticas nuevas. Este spec lee y escribe `courses`, `programs` y
`program_courses` del spec 02, siempre con el cliente de sesión (`lib/supabase/server.ts`): la RLS
de admin es la segunda barrera. No se usa la service role key.

### `lib/admin/course-schema.ts`

```ts
export const THINKIFIC_IMAGE_HOST = "import.cdn.thinkific.com"; // el mismo host de next.config.ts

export function parseLines(text: string): string[];
// divide por salto de línea, recorta cada línea y descarta las vacías

export const courseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), // kebab-case; solo se usa al crear
  title: z.string().trim().min(1),
  summary: z.string().trim().nullable(), // "" → null
  url: z.url(), // https
  imageUrl: z.url().nullable(), // "" → null; si no es null, host === THINKIFIC_IMAGE_HOST
  instructor: z.string().trim().nullable(),
  hours: z.number().positive().max(9999.9), // numeric(5,1)
  lessons: z.number().int().nonnegative(),
  price: z.number().nonnegative().max(9999.99).nullable(), // numeric(6,2); null = solo PRO
  isFree: z.boolean(),
  isPro: z.boolean(),
  isNew: z.boolean(),
  inConstruction: z.boolean(),
  difficulty: z.enum(["principiante", "intermedio", "avanzado"]),
  outcome: z.string().trim().min(1),
  areas: z.array(z.string()),
  prerequisites: z.array(z.string()),
  topics: z.array(z.string()),
  outcomes: z.array(z.string()),
  chapters: z.array(z.string()),
  related: z.array(z.string()),
});
```

La forma exacta de la API de zod (`z.url()` y cómo se transforma `""` en `null`) se confirma con
Context7 antes de escribirla, en el paso 1 del plan. `is_active` no está en el schema: se cambia
solo con `setCourseActive`, que tiene su propio chequeo.

### `lib/admin/program-schema.ts`

```ts
export const programSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), // solo se usa al crear
  name: z.string().trim().min(1),
  position: z.number().int().positive(),
});

export const placementSchema = z.object({
  programId: z.number().int().positive(),
  stage: z.number().int().positive(),
  level: z.enum(["requerido", "recomendado", "opcional"]),
  note: z.string().trim().nullable(), // "" → null
});
```

### `lib/admin/engine-references.ts`

```ts
export type EngineReference =
  | { kind: "interest"; interestSlug: string; label: string }
  | { kind: "technology"; technology: string };

export function findEngineReferences(courseSlug: string): EngineReference[];
// intereses de INTERESTS cuyo courseSlugs incluye el slug + tecnologías de TECH_TO_SLUGS que lo
// apuntan

export function isProgramReachable(programSlug: string): boolean;
// programSlug === "fundamentos" (el motor lo antepone solo) || alguna meta de GOALS lo incluye
// Hoy: los 15 son alcanzables salvo dart-web (degenerado, fuera de GOALS a propósito, spec 04).
```

### Actions de cursos (`app/(admin)/admin/courses/actions.ts`)

```ts
type AdminActionResult = { ok: true } | { ok: false; message: string };

createCourse(input: CourseInput): Promise<AdminActionResult | never>; // con éxito: redirect a /admin/courses/{slug}
updateCourse(courseId: number, input: CourseInput): Promise<AdminActionResult>; // ignora input.slug
setCourseActive(courseId: number, isActive: boolean): Promise<AdminActionResult>;
addPlacement(courseId: number, input: PlacementInput): Promise<AdminActionResult>;
updatePlacement(placementId: number, input: PlacementInput): Promise<AdminActionResult>;
removePlacement(placementId: number): Promise<AdminActionResult>;
```

Todas siguen el patrón de los specs 06, 08 y 09: argumentos revalidados con zod en el servidor,
`requireAdmin()` al entrar, la operación con el cliente de sesión y `.select()` para saber si se
tocó alguna fila (cero filas → `{ ok: false }`). Los errores de Postgres se traducen a mensajes en
español, sin exponer el texto crudo:

| Código / caso                                        | Mensaje                                             |
| ---------------------------------------------------- | --------------------------------------------------- |
| `23505` en `courses_slug_key`                        | "Ya existe un curso con ese slug."                  |
| `23505` en `program_courses (program_id, course_id)` | "Este curso ya está en ese programa."               |
| `23505` en `(program_id, stage, level, position)`    | "Otro cambio ocupó esa posición. Intentá de nuevo." |
| Cualquier otro error                                 | "No se pudo guardar. Intentá de nuevo."             |

Reglas propias de cada action:

- **`setCourseActive(id, false)`** se rechaza si el curso tiene alguna fila en `program_courses`
  **o** si `findEngineReferences(slug)` no está vacío. El mensaje lista cuáles son. Motivo:
  `loadCatalog` (spec 07) solo carga cursos activos, pero sí carga todos los `program_courses`, e
  `INTERESTS` / `TECH_TO_SLUGS` apuntan a slugs fijos. En cualquiera de los dos casos el motor
  devolvería un paso con un slug sin id y `generatePath` fallaría al insertar el `path_steps`.
  Reactivar (`true`) no tiene restricciones.
- **`addPlacement`** calcula `position = max(position) + 1` dentro de (`program_id`, `stage`,
  `level`), o `1` si el grupo está vacío, y después inserta. Si el curso está inactivo, se rechaza
  ("Reactivá el curso antes de ubicarlo en un programa"), por el mismo motivo que la regla anterior.
- **`updatePlacement`**: si cambian `stage` o `level`, la `position` se recalcula en el grupo
  destino con la misma regla. Si solo cambia `note`, la `position` se conserva.
- **`removePlacement`**: `delete` de la fila. Deja un hueco en las posiciones del grupo, lo cual es
  aceptable: `groupProgramCourseRows` (spec 07) ordena por `position` y no exige que sean
  contiguas.

Con éxito, cada action llama a `revalidatePath` sobre `/admin`, `/admin/courses/{slug}` y, si toca
una ubicación, `/admin/programs/{programSlug}`.

### Actions de programas (`app/(admin)/admin/programs/actions.ts`)

```ts
createProgram(input: ProgramInput): Promise<AdminActionResult | never>; // con éxito: redirect a /admin/programs/{slug}
updateProgram(programId: number, input: ProgramInput): Promise<AdminActionResult>; // solo name y position
```

`createProgram` inserta `source_slug = slug`. `source_slug` identifica la entrada de nivel superior
de `data/programs.json` de donde salió el seed, y un programa creado desde el panel no sale de ahí.
`23505` en `programs_slug_key` se traduce a "Ya existe un programa con ese slug.".

### Lo que carga cada página

```ts
// /admin — una query:
//   courses.select("id, slug, title, hours, difficulty, is_active, program_courses(count)")
//   con .or(title.ilike.%q%, slug.ilike.%q%) si hay ?q=, ordenado por title
// /admin/courses/[slug] — el curso completo por slug (notFound() si no existe) + sus
//   program_courses con programs(id, slug, name) embebido + la lista de programas para el Select
// /admin/programs — programs.select("id, slug, name, position, program_courses(count)")
//   ordenado por position
// /admin/programs/[slug] — el programa por slug (notFound() si no existe) + sus program_courses
//   con courses(slug, title, hours) embebido, ordenados en Node por (stage, LEVEL_RANK, position)
```

La sintaxis de PostgREST para `count` embebido y para `.or()` con `ilike` se confirma con Context7
antes de escribir las queries. El `q` se escapa para que una coma o un paréntesis no rompan el
filtro de `.or()`.

## Plan de implementación

1. **`lib/admin/course-schema.ts`, `program-schema.ts`, `engine-references.ts` y sus tests.**
   Antes de escribirlos, confirmar la API actual de zod con Context7. Casos: `parseLines` recorta y
   descarta líneas vacías (también con `\r\n`); `courseSchema` rechaza un slug que no es kebab-case,
   `hours <= 0`, `image_url` de otro host y `url` que no es URL, y acepta `image_url` vacío como
   `null`; `findEngineReferences` encuentra un slug de `INTERESTS`, uno de `TECH_TO_SLUGS` y
   devuelve `[]` para `nextjs` (no `qwik-introduccion`, como decía el borrador: está en el interés
   "Sitios de contenido"); `isProgramReachable` es `true` para `fundamentos` y
   `react`, y `false` para `dart-web` y un slug inventado. Verificación: `npm run test` en verde
   junto con los tests de los specs anteriores.
2. **`components/ui/checkbox.tsx`.** Se agrega con la skill `shadcn` (`npx shadcn add checkbox`),
   verificando que respete el estilo `base-vega` / Base UI de `components.json`. No se agrega a
   `/sistema-diseno`, que no es de este spec. Verificación: compila; se ejercita en el paso 5.
3. **Estructura y guardas.** `app/(admin)/admin/layout.tsx` con la cabecera y la navegación, y
   `app/(admin)/admin/page.tsx` mínimo con `requireAdmin()`. Antes, confirmar en
   `node_modules/next/dist/docs/` la guía de autenticación (dónde conviene hacer el chequeo de rol
   con renderizado parcial de layouts) y la convención de route groups. Verificación: `/admin` sin
   sesión redirige a `/login`; con un usuario `user` redirige a `/dashboard`; con `admin` muestra
   la estructura. El usuario promueve su cuenta desde el panel de Supabase para probar.
4. **Lista de cursos**: `components/admin/courses-table.tsx` + la query de `/admin` con `?q=`.
   Verificación: aparecen los 74 cursos; `qwik-introduccion` y `go-microservicios` muestran
   "Sin programa"; `?q=react` filtra; una búsqueda sin resultados muestra el `Empty`. Los números de
   la columna "Programas" se comparan con SQL (MCP de Supabase, `execute_sql`) en tres cursos.
5. **Alta y edición de curso**: `components/admin/course-form.tsx` (react-hook-form + `zodResolver`
   con `courseSchema`, el mismo patrón que `components/quiz/quiz-form.tsx`), `createCourse`,
   `updateCourse` y las páginas `courses/new` y `courses/[slug]`. Antes de escribir las actions,
   confirmar en `node_modules/next/dist/docs/` la firma actual de `revalidatePath` y de `redirect`
   dentro de una server action. Verificación: crear un curso de prueba, editar su título y dos
   arreglos, y comparar la fila por SQL. Crear otro con un slug repetido muestra "Ya existe un curso
   con ese slug."; el slug aparece deshabilitado en la edición.
6. **Ubicaciones**: `components/admin/course-placements.tsx`, `addPlacement`, `updatePlacement` y
   `removePlacement`. Verificación: ubicar el curso de prueba en `react` (etapa y nivel de una
   alternativa existente) y comprobar por SQL que su `position` es `max + 1` del grupo; ubicarlo
   dos veces en `react` muestra "Este curso ya está en ese programa."; moverlo de etapa recalcula la
   `position`; quitarlo borra la fila.
7. **Activar / desactivar**: `setCourseActive` y su `Card`. Verificación: desactivar el curso de
   prueba mientras está en `react` se rechaza y lista "React"; tras quitarlo, se desactiva y la
   lista lo muestra "Inactivo". Desactivar un curso usado por un interés (por ejemplo, uno de
   `INTERESTS`) se rechaza y nombra el interés. Reactivarlo funciona siempre.
8. **Programas**: `components/admin/program-form.tsx`, `createProgram`, `updateProgram` y las tres
   páginas de `programs/`. Verificación: la lista muestra 15 programas en el orden de `position`,
   con `dart-web` marcado "No está en el cuestionario"; el detalle de `react` lista sus cursos por
   etapa igual que SQL; crear un programa `prueba-admin` muestra el `Alert` de "no aparece en
   ninguna meta" y queda con `source_slug = 'prueba-admin'`; editar su nombre persiste.
9. **Prueba de punta a punta (la razón del spec)**: con el curso de prueba reactivado y ubicado como
   `requerido` en una etapa temprana de `react`, generar una ruta con la meta React desde `/quiz` y
   comprobar que el curso aparece en `/paths/[id]` con su procedencia. Después, limpiar los datos de
   prueba por SQL: quitar las ubicaciones, borrar la ruta de prueba desde el dashboard y dejar el
   curso inactivo (no se puede borrar si quedó en un `path_steps`) o borrarlo por SQL si no quedó en
   ninguno. Borrar también el programa `prueba-admin` por SQL.
10. **Caminos de rechazo del servidor**: con un test descartable o un Client Component de prueba (no
    se commitea), llamar a cada action siendo un usuario `user`. Todas devuelven `{ ok: false }` o
    redirigen, sin cambiar filas (verificado por SQL). Aunque se saltee `requireAdmin()` en el test,
    la RLS rechaza la escritura: se verifica con `execute_sql` como `authenticated` sin rol admin,
    dentro de una transacción revertida.
11. **Link desde el dashboard y `docs/SPECS-MAP.md`**: el botón "Panel de administración" en
    `app/(app)/dashboard/page.tsx`, visible solo para `admin`; y en el mapa, la regla 5 (propiedad y
    excepción) y la §4 (las dos decisiones del 10 cerradas). Verificación: un `user` no ve el botón
    y un `admin` sí; `npm run test`, `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] `/admin` y todas sus subrutas redirigen a `/login` sin sesión y a `/dashboard` con un usuario
      `role = 'user'`. *(sin sesión: verificado, las 6 rutas dan 307 → `/login`; con `user`: verificado
      por el usuario)*
- [x] Un `admin` ve en `/dashboard` el botón "Panel de administración", que lleva a `/admin`; un
      `user` no lo ve.
- [x] `/admin` lista todos los cursos, activos e inactivos, con horas, dificultad, cantidad de
      programas y el badge "Inactivo" cuando corresponde. `qwik-introduccion` y `go-microservicios`
      muestran "Sin programa". La búsqueda `?q=` filtra por título o slug.
- [x] Crear un curso desde `/admin/courses/new` inserta una fila en `courses` con los valores del
      formulario (verificado por SQL), incluidos los seis arreglos parseados línea por línea sin
      líneas vacías, y redirige a su página de edición.
- [x] Editar un curso actualiza su fila. El slug no se puede cambiar desde la UI, y `updateCourse`
      lo ignora aunque llegue en el input.
- [x] El formulario rechaza, en cliente y en servidor, un slug que no es kebab-case, `hours <= 0` y
      una `image_url` que no es de `import.cdn.thinkific.com`. Un slug repetido muestra "Ya existe un
      curso con ese slug.".
- [x] Ubicar un curso en un programa inserta un `program_courses` con `position` = siguiente libre
      del grupo (programa, etapa, nivel); ubicarlo dos veces en el mismo programa se rechaza con un
      mensaje legible; editar su etapa o nivel recalcula la `position`; quitarlo borra la fila.
- [x] Desactivar un curso que está en algún programa o que usan `INTERESTS` / `TECH_TO_SLUGS` se
      rechaza con un mensaje que nombra dónde se usa, sin cambiar la fila. Uno sin esos usos pasa a
      `is_active = false`. Reactivar funciona siempre.
- [x] No hay ningún camino en la UI ni en las actions que ejecute un `DELETE` sobre `courses` o
      `programs`. *(el único `.delete()` del spec es sobre `program_courses`, en `removePlacement`)*
- [x] `/admin/programs` lista los 15 programas por `position`, con su cantidad de cursos. `dart-web`
      aparece marcado "No está en el cuestionario".
- [x] Crear un programa inserta la fila con `source_slug = slug` y muestra el aviso de que no
      aparece en ninguna meta. Editar nombre y posición persiste; el slug no se edita.
- [x] `/admin/programs/[slug]` lista los cursos del programa por etapa y nivel, igual que SQL sobre
      `program_courses`.
- [x] **Punta a punta:** un curso creado y ubicado desde el panel como `requerido` en `react` aparece
      en una ruta generada con la meta React (verificado en `/paths/[id]` y por SQL en `path_steps`).
- [x] Cada action llamada por un `user` no modifica filas (verificado por SQL), y la RLS rechaza las
      mismas escrituras hechas directo como `authenticated` sin rol admin. *(RLS: verificado con un
      bloque revertido — los insert dan 42501 y los update/delete 0 filas en las tres tablas; el mismo
      bloque con el usuario promovido a admin sí escribe. Las actions llamadas por un `user`: verificado
      por el usuario)*
- [x] Los errores de Postgres se muestran como mensajes en español, nunca el texto crudo del error.
- [x] Los botones de ícono de la tabla de ubicaciones tienen `aria-label`, y los diálogos se pueden
      operar con teclado (Tab, Enter, Escape).
- [x] `lib/admin/*.test.ts` cubre los casos del paso 1 del plan. *(más `postgres-errors.test.ts`;
      53/53 tests en verde)*
- [x] Ningún archivo de este spec crea una migración ni modifica `lib/paths/*`, `lib/catalog/*`,
      `lib/supabase/*`, `next.config.ts`, `app/layout.tsx`, `app/(app)/paths/*`,
      `components/paths/*`, `components/quiz/*` o `components/dashboard/*`. En
      `app/(app)/dashboard/page.tsx` solo cambia el link del admin (verificado con `git diff`).
      *(`git diff --stat`: solo `dashboard/page.tsx` +9/−1 y `docs/SPECS-MAP.md`)*
- [x] `npm run test`, `npm run lint` y `npm run build` pasan. *(lint: 0 errores; el único warning es
      previo, en `lib/supabase/actions.ts`)*

## Decisiones

- **Sí:** el admin gestiona cursos **y** su ubicación en programas. **No:** un CRUD de solo cursos.
  El motor arma las rutas a partir de los programas, así que un curso sin ubicación nunca aparece
  (decisión de base de `docs/SPECS-MAP.md`).
- **Sí:** todos los campos del curso son editables, y el `slug` queda fijo una vez creado. **No:**
  editar también el slug, ni limitarse a los campos descriptivos. `INTERESTS` y `TECH_TO_SLUGS`
  (spec 04) apuntan a slugs fijos en el código: renombrar uno rompería esos cruces sin error. Y sin
  `url`, `hours` y los flags, un curso nuevo quedaría incompleto. _(Cierra la decisión pendiente
  "qué campos son editables" de la §4 del mapa.)_
- **Sí:** el admin puede crear programas nuevos y editar su nombre y posición, con un aviso visible
  cuando el programa no es alcanzable desde ninguna meta. **No:** limitarse a los 15 existentes.
  Decisión del usuario: deja la estructura lista para una ruta oficial nueva de DevTalles, aunque
  sumarla al cuestionario siga exigiendo editar `lib/paths/goals.ts`. El aviso se calcula con
  `isProgramReachable`, no con un texto fijo, así que también marca el caso real de `dart-web`.
  _(Cierra la decisión pendiente "si el admin puede crear programas" de la §4 del mapa.)_
- **Sí:** los programas no se borran. **No:** `DELETE`, ni siquiera cuando no se usa.
  `path_steps.source_program_id` es `on delete set null`, así que borrar un programa desarmaría la
  agrupación de las rutas viejas en `/paths/[id]` (spec 08).
- **Sí:** "borrar" un curso significa desactivarlo (`is_active = false`). **No:** `DELETE`.
  `path_steps.course_id` es `on delete restrict` y las rutas viejas tienen que seguir mostrando ese
  curso.
- **Sí:** desactivar se rechaza mientras el curso esté en algún programa o lo usen `INTERESTS` /
  `TECH_TO_SLUGS`, y el mensaje dice dónde se usa. **No:** desactivar y quitar las ubicaciones solo,
  ni filtrar inactivos en `loadCatalog`. Quitar las ubicaciones en silencio pierde dónde estaba el
  curso; filtrar en `loadCatalog` toca un archivo del spec 07 (regla 5) y no cubre las referencias de
  `INTERESTS`, que no pasan por ahí.
- **Sí:** la `position` de una ubicación se asigna sola (`max + 1` en el grupo programa + etapa +
  nivel). **No:** que el admin la escriba. Solo ordena alternativas de un mismo paso, y así nunca
  choca con el `unique`.
- **Sí:** `image_url` solo acepta el host `import.cdn.thinkific.com`, o vacío. **No:** cualquier
  `https` ampliando `remotePatterns`. `next/image` en `/paths/[id]` (spec 08) falla con un host no
  configurado, `next.config.ts` es del spec 08 y todas las portadas de DevTalles salen de ese CDN.
- **Sí:** agregar `components/ui/checkbox.tsx` (shadcn, Base UI). **No:** reusar `ToggleGroup` o
  `Select` con "Sí/No". Es la primitiva correcta para cuatro booleanos de un formulario, es la oficial
  del sistema de diseño ya elegido (no una pieza propia) y `ToggleGroup` / `Select` pesarían más y
  pedirían más clics. `CLAUDE.md` pide justificar un componente nuevo en el spec, y esta es la
  justificación.
- **Sí:** una lista de cursos y una página por curso (`/admin/courses/[slug]`), y lo mismo para
  programas. **No:** un `Sheet` lateral, ni pestañas en una sola página. El formulario tiene unos 20
  campos, más las ubicaciones debajo; cada pantalla tiene su URL y se puede recargar.
- **Sí:** la lista marca "Sin programa". **No:** una tabla neutra. Hace visible justo el problema
  que motiva el panel.
- **Sí:** los arreglos se editan en un `Textarea`, un elemento por línea. **No:** ocultar los menos
  usados. Un curso nuevo tiene que poder quedar completo, y el `Textarea` ya existe.
- **Sí:** `requireAdmin()` en cada página y en cada action, y la RLS de admin del spec 02 como
  segunda barrera. **No:** confiar solo en el layout ni usar la service role key. Las server actions
  son endpoints públicos, y los layouts no se vuelven a renderizar en cada navegación (se confirma
  en la doc de Next en el paso 3).
- **Sí:** las actions viven en `app/(admin)/admin/{courses,programs}/actions.ts`, y los schemas y
  chequeos puros en `lib/admin/*`. **No:** schemas dentro de `components/admin/`. El formulario
  (cliente) y la action (servidor) comparten el mismo schema, y las funciones puras merecen test.
- **Sí:** `createProgram` guarda `source_slug = slug`. **No:** dejarlo vacío, porque la columna es
  `not null` y no hay migración. Un programa creado desde el panel no sale de ninguna entrada de
  `data/programs.json`, así que se le toma a sí mismo como origen.
- **Sí:** excepción explícita a la regla 5 para agregar el link en `app/(app)/dashboard/page.tsx`.
  **No:** entrar solo tecleando `/admin`. El jurado evalúa navegando la app desplegada, y el spec 09
  ya dejó este link fuera de su alcance "para el 10".
- **Sí:** las rutas ya generadas no se recalculan cuando cambia el catálogo. **No:** propagar
  cambios. Los `path_steps` ya guardados son el plan del usuario; "Ajustar mi ruta" (spec 15)
  genera una ruta nueva.

## Riesgos

| Riesgo                                                                                                                                             | Mitigación                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar `hours` de un curso cambia el progreso y el "X h de Y h" de rutas viejas, porque `/paths/[id]` y el dashboard leen `courses.hours` en vivo | Se acepta: es el dato real del curso. No se recalcula el `budget_hours` de ninguna ruta                                                                                         |
| Desactivar un curso con referencias rompería `generatePath`                                                                                        | `setCourseActive` lo rechaza en el servidor (programas + `INTERESTS` + `TECH_TO_SLUGS`), y `addPlacement` rechaza ubicar un curso inactivo. Ambos casos se prueban en el paso 7 |
| Si el spec 04 agrega otro lugar con slugs de curso fijos, `findEngineReferences` no lo ve                                                          | El chequeo vive en un solo archivo con test. Si aparece un tercer registro de slugs en `lib/paths/*`, se agrega ahí                                                             |
| Dos admins agregando la misma ubicación a la vez calculan la misma `position`                                                                      | El `unique` de la base lo frena y la action devuelve "Otro cambio ocupó esa posición. Intentá de nuevo." Se acepta para un panel de un solo admin                               |
| Un programa nuevo queda en la base sin aparecer en ninguna ruta                                                                                    | Aviso visible en la lista y en el detalle, calculado con `isProgramReachable`. Sumarlo al cuestionario es un cambio de código deliberado                                        |
| Los datos de prueba del paso 9 quedan en la base de producción (hay un solo proyecto de Supabase)                                                  | El paso 9 incluye la limpieza por SQL. El curso de prueba se desactiva, o se borra por SQL si no quedó en ningún `path_steps`                                                   |
| La API de zod, de `Checkbox` (Base UI) o de PostgREST (`count` embebido, `.or()` con `ilike`) puede diferir de la que suele aparecer en ejemplos   | Pasos 1, 2 y 4 del plan: se verifica con Context7 y la skill `shadcn` antes de escribir, no de memoria                                                                          |
| `?q=` con comas o paréntesis rompe el filtro `.or()` de PostgREST                                                                                  | Se escapa el término antes de armar el filtro. Se prueba con `?q=c#` y `?q=a,b` en el paso 4                                                                                    |
| `hours` y `price` (`numeric`) llegan como string desde PostgREST                                                                                   | Se normalizan con `Number()` al cargar el formulario, igual que en los specs 07–09                                                                                              |

## Qué **no** entra en este spec

- Migraciones, columnas, políticas o funciones nuevas.
- `DELETE` de cursos o programas, editar slugs, reordenar alternativas a mano, subir imágenes.
- Editar `GOALS`, `INTERESTS` o `TECH_TO_SLUGS`, gestionar usuarios o roles, recalcular rutas viejas.
- Cambios a `lib/paths/*`, `lib/catalog/*`, `lib/supabase/*`, `next.config.ts`, `app/layout.tsx`,
  `app/(app)/paths/*`, `components/paths/*`, `components/quiz/*`, `components/dashboard/*`, ni al
  dashboard fuera del link del admin.

Cada uno de estos, si aterriza, va en su propio spec.
