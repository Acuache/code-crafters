# SPEC 15 — Compartir rutas: link público `/shared/[slug]`, tarjeta OG y "Hacer esta ruta"

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 03, SPEC 08, SPEC 11, SPEC 12, SPEC 14
> **Fecha:** 2026-09-25
> **Objetivo:** Que el dueño de una ruta pueda publicarla con un link `/shared/[slug]` que se vea bien al
> pegarlo en Discord, y que otra persona, con la sesión iniciada, la copie a su cuenta con un clic y
> la haga desde cero.

## Por qué existe este spec

Para el 15, `docs/SPECS-MAP.md` preveía solo una vista pública de solo lectura con tarjeta OG. Este spec
la amplía: quien recibe el link también puede **hacer** la ruta, es decir, copiarla a su cuenta con el
progreso en cero. Así, una ruta armada por alguien de la comunidad de DevTalles le sirve de receta a
otra persona, sin que tenga que pasar por el cuestionario.

Tres restricciones del proyecto dan forma al diseño:

- Desde el spec 02, las rutas son privadas por RLS (`*_all_owner`) y `profiles` solo deja leer el perfil
  propio. La página pública tiene que leer una ruta ajena y el nombre de su autor sin abrirle esas
  tablas a `anon`.
- El proyecto no tiene cliente service-role: se quitó en el spec 13 para que el repo funcione al
  clonarlo. Lo que necesite saltarse RLS vive en funciones SQL `security definer` acotadas.
- El login del spec 03 siempre vuelve a `/dashboard`. Para que alguien sin sesión pueda hacer la ruta,
  el login tiene que saber volver al link.

## Alcance

**Entra:**

- Las columnas `is_public`, `share_slug` y `copied_from_path_id` en `learning_paths`, en una sola
  migración.
- Tres funciones SQL: `get_shared_path`, `copy_shared_path` y `get_path_origin`.
- Un botón "Compartir" en `/paths/[id]`, con un diálogo para crear el link, copiarlo y dejar de
  compartir.
- La página pública `/shared/[slug]`. Tiene una cabecera con título, resumen, autor, cursos y horas, y las
  pestañas Mapa y Lista en solo lectura.
- El botón "Hacer esta ruta", que **exige sesión**. Sin sesión, lleva al login y después vuelve al link.
- El parámetro `next` en `/login` y en `/auth/callback`, validado para que solo acepte rutas internas.
- La tarjeta OG (`opengraph-image.tsx`), la metadata de `/shared/[slug]` y un `metadataBase` en el layout
  raíz.
- La línea "Basada en la ruta de nombre_apellido" en la copia.
- La insignia "Explorador" deja de contar las copias.
- Un modo de solo lectura en `PathMap`, `PathMapNode`, `StepGroupHeading`, `PathStepsList` y `StepRow`,
  sin cambios para el dueño.

**Fuera de alcance (para specs futuros):**

- Un contador de copias ("N personas hicieron esta ruta").
- Una galería o listado de rutas públicas: una ruta solo se encuentra con su link.
- Regenerar el link para invalidar el anterior.
- Mostrar el progreso del autor en la página pública.
- Sincronizar la copia con los cambios que el autor haga después en el original.
- Marcar como hechos en la copia los cursos que el usuario ya completó en otra ruta.
- Un indicador de "Compartida" en la tarjeta del dashboard.
- Usar `next` en el redirect de `proxy.ts` para las rutas privadas.
- Likes, comentarios o seguir a un autor.

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*` y `components/paths/*`. Los tres componentes
nuevos (`components/sharing/*`) solo **componen** piezas existentes. Existen porque ninguno de los
actuales cubre tres cosas: el diálogo del dueño, el botón de copia con sus estados y las pestañas de
solo lectura, que tienen que ser Client Component.

**En `/paths/[id]` (vista del dueño):**

- En la cabecera, un `Button` outline "Compartir" con `ShareNetworkIcon`. Abre
  `components/sharing/share-path-dialog.tsx` (`Dialog`).
  - Si la ruta es privada, el diálogo explica qué se publica: "Se verán el título, el resumen y los
    cursos de tu ruta tal como los ves, con tu nombre y tu avatar de Discord. Tu avance no se muestra."
    Debajo va el botón "Crear enlace público".
  - Si la ruta es pública, el diálogo muestra un `Input` de solo lectura con la URL
    (`window.location.origin` + `/shared/<slug>`) y un botón "Copiar enlace" (`CopyIcon`).
    - Al copiar, el botón pasa 2 s a "Copiado" con `CheckIcon`.
    - Si el portapapeles falla, se selecciona el texto del input y aparece "Copia el enlace a mano".
    - Un botón ghost "Dejar de compartir" vuelve la ruta privada.
  - Si la action falla, aparece inline "No pudimos cambiar la visibilidad. Prueba de nuevo." Mientras
    corre, los botones quedan deshabilitados.
- Si la ruta es una copia y su original todavía existe, bajo el título se lee "Basada en la ruta de
  nombre_apellido" (`text-sm text-muted-foreground`), con el nombre corto de `authorHandle`.

**En `/shared/[slug]` (página pública, sin el layout de `(app)`):**

- **Cabecera:**
  - `logo.webp` dentro de `bg-logo-backdrop`, con link a `/`.
  - `Eyebrow` "Ruta compartida", más `AiBadge` si la ruta está personalizada.
  - Un `h1` con el título y un `p` con el resumen.
  - `Avatar` (con fallback de inicial) y "de nombre_apellido" (`authorHandle`: el perfil guarda el
    nombre completo del proveedor, y acá solo va el primer nombre y el primer apellido, en minúsculas y
    sin tildes). Sin username: "de alguien de DevPathlles".
  - "N cursos · H h", con `formatHours`.
- **Botón principal, según quién mira:**

  | Visitante | Qué ve |
  |---|---|
  | Sin sesión | `Button` "Inicia sesión para hacer esta ruta" → `/login?next=/shared/<slug>` |
  | Con sesión, sin copia | `components/sharing/copy-path-button.tsx`: "Hacer esta ruta". Mientras corre, dice "Creando tu copia…" y queda deshabilitado. Si falla, muestra el error inline |
  | Con sesión, ya copió | `Button` link "Ir a mi copia" → `/paths/<copia>` |
  | Dueño | Texto "Es tu ruta" + `Button` link "Ir a mi ruta" → `/paths/<id>` |

- `components/sharing/shared-path-steps.tsx` (`"use client"`):
  - Tiene las pestañas `Tabs` Mapa/Lista. La vista por defecto es Mapa, y `?vista=lista` abre la Lista,
    igual que en `/paths/[id]`.
  - Usa `PathMap` y `PathStepsList` en modo solo lectura.
- Si la ruta no tiene ningún curso activo, la página muestra el estado vacío "Esta ruta no tiene cursos
  activos" y no muestra el botón principal.
- `app/shared/[slug]/not-found.tsx` muestra "Este link no existe o su autor dejó de compartirlo", con
  `astronauta.webp` y un `Button` "Ir al inicio".

**Modo de solo lectura en los componentes de `components/paths/`:**

- `PathMap` vuelve opcional `onOpenStep`. Sin él:
  - no hay próximo paso, así que no aparecen la mascota, el halo, el globo "Empezar" ni el scroll
    automático;
  - `UnitBanner` no muestra la barra de progreso.
- `PathMapNode` vuelve opcional `onOpen`. Sin él, el círculo es un `span`:
  - no tiene hover, foco ni "Abrir detalle";
  - su `aria-label` es "Paso N de M: <curso>".
- `StepGroupHeading` recibe `showDoneCount` (por defecto `true`). Con `false` muestra "N cursos · H h" en
  vez de "0 de N hechos".
- `PathStepsList` y `StepRow` agrupan los tres callbacks del dueño en un prop opcional `ownerActions`.
  Sin él, la fila muestra solo "Ver curso".

**Tarjeta OG** (`app/shared/[slug]/opengraph-image.tsx`, 1200×630):

- Fondo con el color de marca.
- El logo sobre el color literal de `bg-logo-backdrop` (en `ImageResponse` no hay clases).
- El título, "de nombre_apellido" y "N cursos · H h".
- Usa la fuente por defecto de `ImageResponse`.

## Casos borde

| Caso | Qué pasa |
|---|---|
| El slug tiene un formato inválido (no cumple `^[0-9a-f]{16}$`) | 404, sin consultar la base |
| El slug no existe | 404 |
| La ruta existe pero es privada, porque nunca se compartió o se dejó de compartir | 404: no se distingue de "no existe" |
| El autor borró la ruta | 404 en el link. Las copias siguen intactas (`on delete set null`) y pierden la línea de atribución |
| El autor borró su cuenta | Sus rutas se borran en cascada: 404 |
| Alguien sin sesión pulsa el botón | Va a `/login?next=/shared/<slug>`. Tras el OAuth vuelve a `/shared/<slug>` y ya ve "Hacer esta ruta" |
| La sesión expira entre cargar la página y pulsar | `copySharedPath` no encuentra claims y redirige a `/login?next=/shared/<slug>`, no a `/dashboard` |
| El OAuth falla con `next` | `/auth/callback` redirige a `/login?error=…&next=…`, así que el reintento no pierde el link |
| Alguien que ya tiene sesión entra a `/login?next=…` | Redirige directo a `next` |
| `next` externo o malicioso (`https://evil.com`, `//evil.com`, `/\evil.com`, vacío o largo) | `parseNextPath` lo descarta y se usa `/dashboard` |
| El dueño abre su propio link | Ve "Es tu ruta" e "Ir a mi ruta". Si fuerza la copia, la RPC devuelve su propia ruta y no crea nada |
| El visitante ya copió la ruta | Ve "Ir a mi copia". Si fuerza la copia, la RPC devuelve la copia existente |
| Doble clic, o dos pestañas pulsando a la vez | El botón se deshabilita mientras corre. Además, el índice único parcial `(user_id, copied_from_path_id)` impide la segunda copia, y la RPC atrapa `unique_violation` y devuelve la existente |
| El autor deja de compartir mientras alguien tiene la página abierta | La RPC lanza "no disponible": no se crea la copia y aparece inline "Esta ruta ya no está disponible." |
| La copia falla a mitad de camino | No puede quedar a medias: la función SQL corre en una sola transacción |
| El visitante borró su copia y vuelve al link | No tiene copia: ve "Hacer esta ruta" y puede copiarla de nuevo |
| El autor cambia la ruta después de que alguien la copió | La copia no cambia: es una foto del momento de copiar |
| El autor la personaliza con IA después de compartirla | La página pública muestra los textos nuevos (lee en vivo). Las copias ya hechas no cambian |
| La ruta tiene cursos descartados (por el motor o a mano) | La página pública muestra solo los activos. La copia los trae como descartados, con el mismo motivo, así que el copiador ve los mismos activos y puede restaurar los que "lo quitaste tú" |
| La ruta no tiene cursos activos | Estado vacío, sin botón principal |
| El autor no tiene username o avatar | "de alguien de DevPathlles", y en el avatar la inicial o un icono |
| El copiador ya completó cursos de la ruta en otra ruta suya | En la copia arrancan pendientes ("desde cero"). El XP no se duplica, porque cuenta cursos distintos (spec 14) |
| La copia tiene cursos con quiz | Hay que aprobarlos de nuevo, porque los intentos van por `path_step_id` (ADR 0007) |
| El visitante copia tres rutas | "Explorador" no se gana: cuenta solo las rutas generadas con el cuestionario propio |
| La copia se comparte a su vez | Está permitido: una copia es una ruta como cualquier otra. Su `copied_from_path_id` apunta a la ruta de la que salió |
| La IA personaliza la copia | Nunca pasa: la copia no tiene `assessment_id` ni texto libre, así que `shouldAutoPersonalize` da `false` y no consume el límite diario |
| El dueño apaga y vuelve a encender el link | El link es el mismo, porque `share_slug` no cambia |
| Discord ya cacheó la tarjeta y el autor deja de compartir | La tarjeta vieja sigue en los mensajes ya enviados, pero el link da 404. Se acepta (ver Riesgos) |
| El portapapeles no está disponible | Se selecciona el texto del input y aparece "Copia el enlace a mano" |
| `anon` consulta `learning_paths` o `path_steps` por la API | 0 filas: no se agrega ninguna política para `anon` |

## Modelo de datos

### Migración `supabase/migrations/20260925160000_path_sharing.sql`

```sql
alter table public.learning_paths
  add column is_public boolean not null default false,
  add column share_slug text not null unique
    default encode(extensions.gen_random_bytes(8), 'hex'),
  add column copied_from_path_id uuid
    references public.learning_paths (id) on delete set null;

create index learning_paths_copied_from_path_id_idx
  on public.learning_paths (copied_from_path_id);

-- Una sola copia por usuario y ruta de origen.
create unique index learning_paths_one_copy_per_user_idx
  on public.learning_paths (user_id, copied_from_path_id)
  where copied_from_path_id is not null;
```

- El default es volátil, así que Postgres calcula un slug distinto para cada fila existente al agregar
  la columna.
- 16 caracteres hex son 64 bits de azar: el slug no se puede adivinar.
- Las RLS no cambian. `learning_paths_all_owner` ya le permite al dueño hacer `update` de `is_public`.

### `public.get_shared_path(p_slug text) returns jsonb`

- `security definer`, `stable`, `set search_path = ''`. Se le revoca a `public` y se le concede a
  `anon, authenticated`.
- Devuelve `null` si no existe ninguna ruta con ese `share_slug` y `is_public = true`.
- Si existe, devuelve este JSON (camelCase armado con `jsonb_build_object`):

```ts
{
  title: string;            // coalesce(ai_title, title)
  summary: string | null;   // coalesce(ai_summary, summary)
  budgetHours: number | null;
  isPersonalized: boolean;  // personalized_at is not null
  author: { username: string | null; avatarUrl: string | null };
  viewer: {
    isOwner: boolean;              // auth.uid() = user_id (false para anon)
    ownPathId: string | null;      // dueño: la ruta; si no: su copia; si no: null
  };
  steps: Array<{            // solo los no descartados, por stage y position
    courseId: number;
    stage: number;
    position: number;
    origin: string;
    reason: string;         // coalesce(ai_reason, reason)
    courseTitle: string;
    courseHours: number;
    courseUrl: string;
    courseImageUrl: string | null;
    programSlug: string | null;
    programName: string | null;
  }>;
}
```

- Nunca devuelve `user_id`, `assessment_id`, `ai_adjustments` ni el `id` del original, salvo al dueño.

### `public.copy_shared_path(p_slug text) returns uuid`

- `security definer`, `volatile`, `set search_path = ''`. Se le revoca a `public` y `anon` y se le concede
  a `authenticated`.
- Sigue estos pasos:
  1. Si `auth.uid()` es null, lanza `42501`.
  2. Busca el original por `share_slug` con `is_public`. Si no existe, lanza `P0002` ("ruta no
     disponible").
  3. Si el que llama es el dueño, devuelve el `id` del original.
  4. Si ya tiene una copia (`copied_from_path_id = original.id`), devuelve esa copia.
  5. Inserta la ruta y sus pasos según la tabla de abajo y devuelve el `id` nuevo. Si hay
     `unique_violation` (carrera), relee y devuelve la copia existente.

| Columna | En la copia |
|---|---|
| `user_id` | `auth.uid()` |
| `title`, `goal`, `summary`, `budget_hours` | Iguales al original |
| `ai_title`, `ai_summary`, `personalized_at` | Iguales al original |
| `assessment_id`, `ai_adjustments` | `null` |
| `is_public` | `false` |
| `share_slug` | Uno nuevo (default) |
| `copied_from_path_id` | `original.id` |
| `path_steps.course_id`, `source_program_id`, `stage`, `position`, `origin`, `reason`, `ai_reason` | Iguales |
| `path_steps.status` | `discarded` si lo era; si no, `pending` |
| `path_steps.discard_reason` | Igual si está descartado; si no, `null` |
| `path_steps.completed_at`, `depends_on` | `null`, `'{}'` |

### `public.get_path_origin(p_path_id uuid) returns text`

- `security definer`, `stable`, `set search_path = ''`. Solo para `authenticated`.
- Devuelve el `username` del autor del original, si se cumplen las dos condiciones:
  - `auth.uid()` es dueño de `p_path_id`;
  - `copied_from_path_id` todavía apunta a una ruta existente.
- En cualquier otro caso devuelve `null`.

### `lib/sharing/shared-path.ts`

- `SHARE_SLUG_PATTERN = /^[0-9a-f]{16}$/` e `isValidShareSlug(slug)`.
- `sharedPathSchema` (zod) y el tipo `SharedPath`, que validan el JSON de `get_shared_path`.
- `loadSharedPath(slug)`, envuelto en `cache` de React para que `generateMetadata` y la página hagan una
  sola consulta:
  - si el slug es inválido o la RPC devuelve `null`, devuelve `null`;
  - si el JSON no valida, lo loguea y devuelve `null` (404);
  - si la RPC falla, lanza el error: lo muestra `app/error.tsx`, con reintento, y no un 404 engañoso.
- `authorHandle(username)`: el nombre corto del autor, "YELTSIN MICHAEL ACUACHE YALLE" →
  `yeltsin_acuache`. Con 4 palabras o más toma la 1.ª y la penúltima; con 2 o 3, la 1.ª y la 2.ª; con una
  (un usuario de Discord), la deja igual.
- `authorLabel(author)` ("de yeltsin_acuache") y `describePathSize(steps)` ("3 cursos · 12 h"), que
  comparten la página, la metadata y la tarjeta OG.

### `lib/supabase/next-path.ts`

- `parseNextPath(value: unknown): string | null`. Acepta solo strings de hasta 200 caracteres que
  empiecen con `/`, no con `//` ni con `/\`, y sin esquema.

### `lib/site-url.ts`

- `getSiteUrl()`: `NEXT_PUBLIC_SITE_URL`, si no `https://${VERCEL_PROJECT_PRODUCTION_URL}`, y si no
  `http://localhost:3000`. Lo usa el `metadataBase` del layout raíz.
- `getOrigin()` de `lib/supabase/actions.ts` no se toca: resuelve el origen del OAuth con otras reglas.

### Cambio en `lib/gamification`

- `GamificationPath` gana `fromQuestionnaire: boolean` (`assessment_id !== null`), y
  `load-gamification.ts` agrega `assessment_id` al `select`.
- `summary.ts` calcula `createdPaths` contando solo las rutas con `fromQuestionnaire`.
- XP, niveles, racha y "ruta completa" no cambian.

## Plan de implementación

1. **Migración y tests de base de datos.**
   - Escribir `20260925160000_path_sharing.sql` con las columnas, los índices y las tres funciones.
   - Escribir `supabase/tests/path_sharing.sql` (pgTAP), siguiendo el patrón de
     `quizzes_progress_streak.sql` y agregando `set local role anon`.
   - Correr `npx supabase test db`, `npx supabase db push`, y regenerar
     `lib/supabase/database.types.ts` con el MCP `generate_typescript_types`.
   - La app sigue igual.
2. **`lib/sharing/shared-path.ts` y sus tests** (`shared-path.test.ts`: slug válido e inválido, JSON
   válido e inválido). Todavía no la usa nada.
3. **Modo de solo lectura en `components/paths/`.**
   - `ownerActions` opcional en `PathStepsList`/`StepRow` y `onOpenStep`/`onOpen` opcionales en
     `PathMap`/`PathMapNode`. `showDoneCount` en `StepGroupHeading`.
   - Ajustar la llamada en `path-steps-view.tsx`.
   - Test jsdom: `StepRow` sin `ownerActions` no renderiza el toggle.
   - `/paths/[id]` se ve y funciona igual que antes.
4. **La página `/shared/[slug]`**: `page.tsx`, `not-found.tsx` y `components/sharing/shared-path-steps.tsx`,
   con cabecera, pestañas y estado vacío.
   - `generateMetadata` con título, descripción y `robots: { index: false }`.
   - El botón principal ya distingue los cuatro casos, pero "Hacer esta ruta" todavía no copia.
5. **`next` en el login.**
   - `lib/supabase/next-path.ts` + `next-path.test.ts`.
   - `app/login/page.tsx` lee `next`: si hay sesión, redirige a él; si no, se lo pasa a
     `signInWithProvider`.
   - `lib/supabase/actions.ts`: `signInWithProvider(provider, nextPath)` agrega
     `?next=<encodeURIComponent>` al `redirectTo`.
   - `app/auth/callback/route.ts` redirige a `next` o a `/dashboard`, y conserva `next` en los redirects
     de error.
   - Antes de escribirlo, verificar con Context7 (Supabase) cómo matchea la allowlist de Redirect URLs
     con query string.
6. **Copiar.**
   - `app/shared/[slug]/actions.ts` con `copySharedPath(slug: unknown)`:
     - valida el slug;
     - sin claims, redirige a `/login?next=/shared/<slug>`;
     - llama a `copy_shared_path`, mapea `P0002` a "Esta ruta ya no está disponible.";
     - si sale bien, hace `revalidatePath('/dashboard')` y `redirect('/paths/<id>')`.
   - `components/sharing/copy-path-button.tsx`.
   - Test: `app/shared/[slug]/actions.test.ts`.
7. **Compartir desde `/paths/[id]`.**
   - `app/(app)/paths/[id]/share-actions.ts` con `setPathSharing(pathId: unknown, isPublic: unknown)`.
     Hace `update` por RLS, trata 0 filas como "no encontrada" y hace `revalidatePath`.
   - `components/sharing/share-path-dialog.tsx`.
   - La línea de atribución vía `get_path_origin` en `page.tsx`.
   - Test: `share-actions.test.ts`.
8. **Tarjeta OG.**
   - `lib/site-url.ts` y `metadataBase` en `app/layout.tsx`.
   - `app/shared/[slug]/opengraph-image.tsx` con `ImageResponse` de `next/og` (leer antes
     `node_modules/next/dist/docs/` sobre `opengraph-image`). Si la ruta no está disponible, llama a
     `notFound()`.
   - Documentar `NEXT_PUBLIC_SITE_URL` (opcional) en `.env.example`.
9. **Explorador sin copias.** Cambiar `load-gamification.ts` y `summary.ts`, y agregar un caso a
   `summary.test.ts` (tres copias no suman al `createdPaths`).
10. **Docs.**
    - `docs/SPECS-MAP.md`: la fila y la sección del 15 (ahora con la copia), las excepciones de archivos
      de otros specs (03, 08, 12 y 14) y la migración en la regla 6.
    - `CLAUDE.md`: "Estado del proyecto" pasa a 01–15.

## Criterios de aceptación

- [ ] Una ruta recién generada tiene `is_public = false` y un `share_slug` de 16 caracteres hex.
- [ ] En `/paths/[id]`, "Compartir" → "Crear enlace público" muestra la URL `/shared/<slug>`, y "Copiar
      enlace" la deja en el portapapeles.
- [ ] Después de "Dejar de compartir", `/shared/<slug>` responde 404. Al volver a compartir, el link es el
      mismo.
- [ ] Sin sesión, `/shared/<slug>` de una ruta pública muestra el título, el resumen, el autor, "N cursos · H h"
      y las pestañas Mapa y Lista, sin toggles, sin "Quitar" y sin quiz.
- [ ] La página pública no muestra el avance del autor: todos los nodos se ven pendientes y no aparece
      ningún "N de M hechos".
- [ ] Sin sesión, el botón dice "Inicia sesión para hacer esta ruta". Tras el login con Discord, la
      persona vuelve a `/shared/<slug>`, no a `/dashboard`.
- [ ] Con sesión, "Hacer esta ruta" crea una ruta nueva en la cuenta del visitante con los mismos cursos
      activos, en el mismo orden, todos en "Pendiente", y lo lleva a `/paths/<copia>`.
- [ ] En la copia se lee "Basada en la ruta de nombre_apellido". Si el autor borra su ruta, la copia sigue y la
      línea desaparece.
- [ ] Volver al link después de copiar muestra "Ir a mi copia". Un segundo intento de copia no crea otra
      ruta.
- [ ] El dueño ve "Es tu ruta" en su propio link, y no puede copiársela.
- [ ] Un slug inexistente, uno privado o uno con formato inválido dan la página 404 de `/shared/[slug]`.
- [ ] `/login?next=https://evil.com` y `/login?next=//evil.com` terminan en `/dashboard` después del
      login.
- [ ] Pegar el link en Discord muestra una tarjeta con el logo, el título, el autor y "N cursos · H h".
- [ ] Copiar tres rutas compartidas no otorga la insignia "Explorador".
- [ ] Como `anon`, `select` sobre `learning_paths` y `path_steps` devuelve 0 filas, y `copy_shared_path`
      no se puede ejecutar (pgTAP).
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` y `npx supabase test db` pasan.

## Decisiones

- **Sí:** copia exacta (los mismos cursos, orden y descartados, con el progreso en cero). **No:**
  regenerar la ruta con el cuestionario del autor, porque si el catálogo cambió saldría distinta a lo que
  se vio en el link.
- **Sí:** compartir es opt-in, con un botón en `/paths/[id]`. **No:** que toda ruta sea pública desde que
  se crea, porque rompe la privacidad del spec 08.
- **Sí:** la página pública muestra la estructura y el autor. **No:** el progreso del autor. **No:** una
  página anónima.
- **Sí:** se muestran y se copian los textos de la IA (`ai_title`, `ai_summary`, `ai_reason`,
  `personalized_at`), porque el usuario los prefirió a los del motor. **No:** copiar `ai_adjustments`:
  describe cómo la IA ajustó el cuestionario del autor, y en la copia diría algo falso ("tu perfil").
- **Sí:** tres funciones `security definer` acotadas por slug. **No:** políticas RLS `to anon` sobre
  `learning_paths` y `path_steps`, porque dejarían listar todas las rutas públicas con todas sus
  columnas por la API, y habría que abrir `profiles`.
- **Sí:** el `share_slug` es aleatorio, lo genera la base para toda ruta y nunca cambia. **No:** un slug
  derivado del título, porque cambia si la IA lo reescribe. **No:** un slug nullable generado al primer
  "Compartir", porque sería código de generación de más sin beneficio.
- **Sí:** se guarda `copied_from_path_id` (`on delete set null`). **No:** un contador de copias, por
  ahora.
- **Sí:** una sola copia por usuario y ruta de origen, con "Ir a mi copia". **No:** crear una copia nueva
  en cada clic.
- **Sí:** "Explorador" cuenta solo las rutas con `assessment_id`, es decir, las generadas con el
  cuestionario propio. **No:** usar `copied_from_path_id` para esto, porque se vuelve `null` si el autor
  borra el original y la copia pasaría a contar.
- **Sí:** hacer la ruta exige sesión, y ver la ruta no. La tarjeta de Discord necesita leer la página sin
  sesión.
- **Sí:** `next` en el login, validado con `parseNextPath`. **No:** mandar al dashboard después del
  login, porque la persona perdería el link.
- **Sí:** Mapa y Lista con pestañas, reusando los componentes del 08 y del 12 con un modo de solo
  lectura. **No:** duplicar `StepRow` y el mapa en componentes públicos, porque serían dos versiones de
  la misma fila.
- **Sí:** `robots: { index: false }` en `/shared/[slug]`, porque el link es para compartir, no para
  buscadores.
- **Sí:** `metadataBase` desde `lib/site-url.ts`, con `VERCEL_PROJECT_PRODUCTION_URL`. **No:** el
  `NEXT_PUBLIC_VERCEL_URL` por despliegue, que puede estar protegido por Vercel Authentication, y Discord
  no podría bajar la imagen.
- **Sí:** feedback inline al copiar el link. **No:** un toast, porque el único `Toaster` vive dentro de
  `PathStepsView`.
- **Sí:** la copia no tiene `assessment_id`, así que nunca se autopersonaliza. **No:** crear un
  assessment falso para la copia.
- **Sí:** el link es `/shared/[slug]`, en inglés como `/paths` y `/profile`. **No:** `/r/[slug]`, más
  corto pero no se entiende de qué es la "r".
- **Sí:** el autor se ve como `nombre_apellido` (`authorHandle`). **No:** el nombre completo del
  perfil, que con Google trae los dos nombres y los dos apellidos en mayúsculas. La regla no adivina qué
  nombre usa cada persona: elegir el propio nombre visible sería otro spec.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Supabase rechaza un `redirectTo` con `?next=` si la allowlist de Redirect URLs no lo cubre | Verificarlo con Context7 en el paso 5 y agregar el patrón `/auth/callback**` en el dashboard y en `additional_redirect_urls`. Si no alcanza, guardar `next` en una cookie httpOnly de vida corta antes del OAuth |
| `ImageResponse` (Satori) no acepta WebP | Verificarlo en la documentación del paso 8. Si no lo acepta, generar `public/og-logo.png` con `sharp`, siguiendo el patrón de assets de `CLAUDE.md` |
| Discord cachea la tarjeta OG: dejar de compartir no la borra de los mensajes ya enviados | Se acepta. El link da 404 y la tarjeta no expone nada más que lo que ya se compartió |
| Los textos de la IA del autor pueden mencionar lo que escribió en el texto libre | El diálogo de compartir avisa que se publican "tal como los ves" antes de crear el link |
| Por la API, el dueño puede cambiar `share_slug` o `copied_from_path_id` de su propia ruta (la RLS es por fila) | El slug es `unique` y solo afecta a su ruta. `get_path_origin` solo revela el username de una ruta cuyo uuid se conoce, y ninguna función expone uuids de rutas ajenas |
| El JSON de la RPC pierde los tipos de `database.types.ts` | Se valida con zod en `lib/sharing/shared-path.ts`. Si no valida, se loguea y se responde 404 |
| El spec toca archivos de otros specs (03, 08, 12 y 14) | Los cambios son aditivos (props opcionales, un campo nuevo) y quedan listados en las excepciones de `docs/SPECS-MAP.md` |
