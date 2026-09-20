# SPEC 02 — Esquema de Supabase: catálogo, roles y rutas de aprendizaje

> **Estado:** Implementado
> **Depende de:** SPEC 01 (solo el último paso, el seed)
> **Fecha:** 2026-09-20
> **Objetivo:** Dejar en Supabase las 7 tablas del modelo de datos —`profiles` con rol,
> `courses`, `programs`/`program_courses`, `assessments`, `learning_paths`, `path_steps`—, sus
> políticas RLS, el trigger que crea el perfil al registrarse, y el seed del catálogo enriquecido
> y las 15 rutas oficiales de DevTalles.

## Por qué existe este spec

Hoy el proyecto Supabase (`gpbwuvvfffvxpkgzjqzk`) tiene 0 tablas en `public` y 0 migraciones: no
hay dónde guardar un assessment, una ruta o un curso. Sin este spec, los specs 03 (login), 04
(motor), 06 (cuestionario) y 07 (generación) no tienen base de datos contra la que escribir.

Es también el spec que cierra tres decisiones que el mapa (`docs/SPECS-MAP.md` §4) dejó abiertas:
cómo se bootstrapea el primer admin, dónde vive un curso descartado de una ruta y su motivo
(ADR 0004 pieza 2), y —una que el mapa no había marcado como pregunta pero que apareció al revisar
`data/programs.json`— qué es exactamente una fila de `programs`, porque el archivo tiene 13
programas que contienen 15 rutas (React agrupa "React" y "React Native"; Dart agrupa "Dart móvil"
y "Dart Web").

## Alcance

**Entra:**

- Inicializar `supabase/` en el repo (`supabase init`) y vincularlo al proyecto
  `gpbwuvvfffvxpkgzjqzk`.
- Migraciones SQL versionadas para las 7 tablas: `profiles`, `courses`, `programs`,
  `program_courses`, `assessments`, `learning_paths`, `path_steps`.
- Cuatro enums de Postgres para los vocabularios cerrados: `user_role`, `course_difficulty`,
  `program_course_level`, `path_step_status`.
- Función `private.is_admin()` (`security definer`, esquema no expuesto) y las políticas RLS de
  las 7 tablas: lectura pública del catálogo, escritura solo admin, datos de usuario solo por su
  dueño.
- Trigger `handle_new_user` sobre `auth.users` que crea la fila de `profiles` leyendo los
  metadatos de cualquiera de los tres proveedores OAuth que traerá el spec 03 (Discord, Google,
  GitHub).
- Un lugar en `path_steps` para el curso que el motor —o el usuario, desde el spec 08— descarta de
  una ruta, con su motivo.
- Seed: los 74 cursos (`courses.json` + `courses.enriched.json` cruzados por `slug`) y las 15
  rutas con sus 107 vínculos (`programs.json`).
- `lib/supabase/database.types.ts` generado con `generate_typescript_types`, y los dos clientes
  existentes (`lib/supabase/{client,server}.ts`) tipados con `Database`.
- Corregir `docs/SPECS-MAP.md` §4 (decisiones cerradas) y §7 (la ficha del 02 hoy dice que crea
  `achievements`/`user_achievements`, al revés de su propia regla 6) y el modelo de datos de
  `docs/ROADMAP.md`.

**Qué NO entra (queda para otros specs):**

- Cualquier UI: login (03), cuestionario (06), vista de ruta (08), panel (10).
- `build-path.ts` y cualquier lógica del motor de reglas (04) — este spec solo deja las tablas.
- Columnas de gamificación (`xp`, `level`, `streak` en `profiles`; `achievements`,
  `user_achievements`): las añade el spec 13, en su propia migración, sobre el esquema base que
  deja este spec.
- `is_public` / `share_slug` en `learning_paths`: los añade el spec 14.
- Columnas de personalización con IA en `learning_paths`: las añade el spec 11.
- El botón de descartar un paso desde la UI y el acordeón "Qué quitamos y por qué": los construye
  el spec 08 sobre la columna que este spec deja lista.
- Usuarios de email/contraseña. El login es solo OAuth (spec 03); el primer admin se promueve a
  mano desde el panel de Supabase, no por credenciales sembradas.
- Storage de Supabase (avatares, imágenes): no hace falta, `avatar_url` guarda la URL que ya da el
  proveedor OAuth.

## Modelo de datos

Cuatro enums:

```sql
create type public.user_role as enum ('user', 'admin');
create type public.course_difficulty as enum ('principiante', 'intermedio', 'avanzado');
create type public.program_course_level as enum ('requerido', 'recomendado', 'opcional');
create type public.path_step_status as enum ('pending', 'in_progress', 'done', 'discarded');
```

`path_steps.origin` (por qué el motor eligió ese curso: `"requerido"`, `"interés: docker"`, etc.)
queda como `text` sin enum — su vocabulario lo fija el spec 04 y no debe costar una migración.

**`profiles`** — un perfil por usuario, creado por el trigger:

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);
```

**`courses`** — los 74 del catálogo, más los que el panel del spec 10 agregue después:

```sql
create table public.courses (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  summary text,
  url text not null,
  image_url text,
  instructor text,
  hours numeric(5,1) not null,
  lessons integer not null,
  price numeric(6,2),          -- único campo del catálogo con nulos: los 7 cursos solo-PRO
  is_free boolean not null default false,
  is_pro boolean not null default false,
  is_new boolean not null default false,
  in_construction boolean not null default false,
  is_active boolean not null default true,
  areas text[] not null default '{}',
  prerequisites text[] not null default '{}',
  topics text[] not null default '{}',
  outcomes text[] not null default '{}',
  chapters text[] not null default '{}',
  related text[] not null default '{}',
  difficulty public.course_difficulty not null,
  outcome text not null,
  created_at timestamptz not null default now()
);
```

`is_active` es borrado lógico: `path_steps.course_id` es `on delete restrict`, así que el panel
del spec 10 nunca puede borrar un curso que ya esté en una ruta guardada; lo desactiva.

**`programs`** — 15 filas, una por ruta oficial, no 13. Los 15 valores exactos de `slug` /
`source_slug` / `name`, verificados contra `data/programs.json`, para que el spec 04 los consuma
sin inventarlos de nuevo:

| slug           | source_slug   | name                | pasos |
| -------------- | ------------- | ------------------- | ----: |
| `fundamentos`  | `fundamentos` | Fundamentos         |     8 |
| `react`        | `react`       | React               |     8 |
| `react-native` | `react`       | React Native        |     5 |
| `vue`          | `vue`         | Vue                 |     6 |
| `angular`      | `angular`     | Angular             |     7 |
| `node`         | `node`        | NodeJs              |     9 |
| `nest`         | `nest`        | NestJS              |    10 |
| `dart-movil`   | `dart`        | Dart móvil          |     6 |
| `dart-web`     | `dart`        | Dart Web            |     1 |
| `python`       | `python`      | Python              |     5 |
| `java`         | `java`        | Java                |     8 |
| `csharp`       | `csharp`      | C#                  |     4 |
| `ia`           | `ia`          | IA/Automatizaciones |    13 |
| `php`          | `php`         | PHP                 |     2 |
| `go`           | `go`          | GO                  |     2 |

```sql
create table public.programs (
  id bigint generated always as identity primary key,
  slug text not null unique,           -- 'react', 'react-native', 'dart-movil', 'dart-web', ...
  source_slug text not null,           -- el slug de nivel superior en programs.json: 'react', 'dart'
  name text not null,                  -- 'React', 'React Native'
  position integer not null,
  created_at timestamptz not null default now()
);
```

`source_slug` conserva la agrupación original de DevTalles (React y React Native son dos filas
con el mismo `source_slug = 'react'`) para cuando el spec 04 necesite razonar sobre el programa
padre, sin obligar al motor a tratarlas como una sola ruta.

**`program_courses`** — el vínculo curso↔programa, 107 filas del seed:

```sql
create table public.program_courses (
  id bigint generated always as identity primary key,
  program_id bigint not null references public.programs (id) on delete cascade,
  course_id bigint not null references public.courses (id) on delete restrict,
  stage integer not null,
  level public.program_course_level not null,
  position integer not null,           -- orden dentro de un paso con varios cursos (máx. 4 en el catálogo)
  note text,
  unique (program_id, stage, level, position),
  unique (program_id, course_id)       -- un curso no se repite dentro de una misma ruta (verificado en los 107 vínculos)
);
```

**`assessments`**, **`learning_paths`**, **`path_steps`** — lo que genera el spec 06/07:

```sql
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_id uuid references public.assessments (id) on delete set null,
  title text not null,
  goal text not null,
  summary text,
  budget_hours numeric(6,1),
  created_at timestamptz not null default now()
);

create table public.path_steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  course_id bigint not null references public.courses (id) on delete restrict,
  source_program_id bigint references public.programs (id) on delete set null,
  stage integer not null,
  position integer not null,
  origin text not null,
  reason text not null,
  status public.path_step_status not null default 'pending',
  discard_reason text,
  depends_on uuid[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (path_id, course_id),         -- red de seguridad de la deduplicación que promete el spec 04
  check (status <> 'discarded' or discard_reason is not null)
);
```

`status = 'discarded'` + `discard_reason` es dónde vive el curso que el motor —o el usuario— sacó
de la ruta oficial (ADR 0004 pieza 2). Deshacer el descarte es un `update` de esas dos columnas,
no un `insert`/`delete`. `depends_on` queda listo para las aristas del mapa visual del spec 12.

**RLS**, resumen (la política exacta de cada tabla la escribe `/spec-impl`, siguiendo el patrón
verificado en Context7 de envolver `auth.uid()` en subconsulta e indexar la columna que filtra):

| Tabla                                         | Lectura                                                                              | Escritura                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `profiles`                                    | el propio dueño (`id = (select auth.uid())`)                                         | **ninguna política de `update`/`insert`/`delete` para `authenticated`** |
| `courses`, `programs`, `program_courses`      | pública (`anon` + `authenticated`)                                                   | solo `(select private.is_admin())`                                      |
| `assessments`, `learning_paths`, `path_steps` | el propio dueño (`user_id = (select auth.uid())`, o vía `path_id` para `path_steps`) | el propio dueño                                                         |

`profiles` no es de lectura pública: expondría el `role` de todos a `anon`. El spec 14, si necesita
mostrar el autor de una ruta compartida, amplía esta política en su propia migración.

`profiles` tampoco tiene política de escritura para `authenticated`, ni siquiera "el propio dueño":
RLS filtra filas, no columnas, así que una política `update using (id = auth.uid())` deja que
cualquiera se ponga `role = 'admin'` a sí mismo. El trigger `handle_new_user` escribe la fila al
registrarse; el rol se cambia después desde el panel de Supabase, que corre como `postgres` y
salta RLS. Cuando el spec 13 necesite que el propio usuario actualice `xp`/`level`/`streak`, debe
hacerlo por una función `security definer` que solo puede tocar esas tres columnas — no abriendo
una política de `update` sobre toda la fila.

`private.is_admin()` es `security definer`, `set search_path = ''`, y vive en el esquema `private`,
que no está en "Exposed schemas" de la API — eso es lo que impide llamarla desde el cliente, no un
revoke. Su `execute` se revoca de `public` y `anon`, pero se otorga a `authenticated`
(`grant execute on function private.is_admin() to authenticated`): es el rol que evalúan las
políticas `for all to authenticated using ((select private.is_admin()))`, y sin ese grant hasta un
admin real recibe _permission denied for function_ al intentar escribir el catálogo.

## Plan de implementación

1. `supabase init` en la raíz del repo; `supabase link --project-ref gpbwuvvfffvxpkgzjqzk`.
   Verificación: `supabase/config.toml` existe y `supabase migration list` conecta sin error.
2. Migración `..._profiles_and_roles.sql`: esquema `private`, enum `user_role`, tabla `profiles`,
   `private.is_admin()`, trigger `handle_new_user` + `on_auth_user_created`, RLS de `profiles`.
   Verificación: registrar un usuario de prueba crea su fila en `profiles` con `role = 'user'`.
3. Migración `..._catalog.sql`: enums `course_difficulty` y `program_course_level`, tablas
   `courses`, `programs`, `program_courses`, índices en las FK, RLS de las tres. Verificación: las
   tres tablas existen vacías y `get_advisors(security)` no marca RLS faltante.
4. Migración `..._paths.sql`: enum `path_step_status`, tablas `assessments`, `learning_paths`,
   `path_steps`, índices, RLS por dueño. Verificación: idéntica a la anterior.
5. Migración `..._seed_courses.sql`: los 74 cursos, cruzando `data/courses.json` con
   `data/courses.enriched.json` por `slug`, embebidos como literal `jsonb` y expandidos con
   `jsonb_to_recordset`. Cabecera del archivo: qué inserta, de qué dos archivos sale y la fecha de
   extracción (`data/SUMMARY.md`). Verificación: `select count(*) from courses` = 74.
6. Migración `..._seed_programs.sql`: las 15 rutas de `data/programs.json` como `programs`, y sus
   107 vínculos como `program_courses`. Verificación: `select count(*) from programs` = 15,
   `select count(*) from program_courses` = 107.
7. `generate_typescript_types` → `lib/supabase/database.types.ts`; tipar
   `createBrowserClient<Database>` en `lib/supabase/client.ts` y
   `createServerClient<Database>` en `lib/supabase/server.ts`. Verificación: `npm run build` sin
   errores de tipos.
8. Corregir `docs/SPECS-MAP.md` (§4: marcar las tres decisiones como cerradas por el 02; §7: quitar
   `achievements`/`user_achievements` de la ficha del 02) y el modelo de datos de
   `docs/ROADMAP.md` (reflejar `role`, `programs`/`program_courses` y las 15 rutas). Verificación:
   ninguna mención residual a que el 02 crea tablas de gamificación.

**Paso 9 (post-review):** `/review` con `craft-reviewer` sobre las migraciones y los dos clientes
tipados encontró 5 problemas reales en el paso 2 (`private.is_admin()` no era `stable`, rompiendo el
cacheo de `(select ...)` en las políticas; faltaba `grant usage on schema private`; el `revoke` no
cubría `anon` como decía el spec; el trigger no tenía `on conflict` de red de seguridad) y 1 en el
paso 4 (el `check` de `path_steps` sin nombre). Se corrigieron con la migración
`..._harden_review_findings.sql` (`create or replace` sobre las dos funciones, más un `grant`, un
`revoke`, un `rename constraint` y tres `rename policy` para alinear el nombrado con las 12
políticas del catálogo). No se editaron los archivos ya aplicados, para no dejar diferencias entre
lo que dice el repo y lo que corre en el proyecto real. Verificación: `provolatile = 's'` en
`is_admin`, `has_schema_privilege`/`has_function_privilege` en `true` para `authenticated`, ciclo
completo de promoción a admin repetido con éxito, y `get_advisors(security)` en 0 hallazgos.

## Criterios de aceptación

- [x] `list_tables` devuelve las 7 tablas, todas con `rls_enabled: true`.
- [x] `get_advisors(security)` no devuelve hallazgos de nivel `ERROR`.
- [x] `select count(*) from courses` = 74, y el conjunto de `slug` es idéntico al de
      `data/courses.json`.
- [x] Los 74 cursos tienen `difficulty` y `outcome` no nulos.
- [x] `select count(*) from programs` = 15; `select count(*) from program_courses` = 107.
- [x] Un usuario con `role = 'user'` puede `select` el catálogo pero un `insert`/`update`/`delete`
      sobre `courses`, `programs` o `program_courses` falla por RLS.
- [x] Un usuario no puede `select` los `assessments`, `learning_paths` ni `path_steps` de otro
      usuario.
- [x] Un usuario autenticado no puede cambiar su propio `role` (ni ningún otro campo de su fila en
      `profiles`) con un `update` desde el cliente: no existe política que lo permita.
- [x] El catálogo (`courses`, `programs`, `program_courses`) se puede leer sin sesión, con la clave
      pública y rol `anon` — lo que necesitan la landing (spec 05) y la ruta compartida (spec 14).
- [x] Cambiar a mano el `role` de un perfil a `admin` desde el SQL Editor de Supabase habilita el
      `insert`/`update` sobre el catálogo para ese usuario.
- [x] El trigger `handle_new_user` crea la fila de `profiles` al registrarse, con `username` y
      `avatar_url` completados a partir de los metadatos del proveedor OAuth (verificable en el
      primer login real del spec 03 si la simulación manual en `auth.users` resulta frágil).
- [x] `npm run build` compila con `lib/supabase/database.types.ts` generado y los dos clientes
      tipados.
- [x] `docs/SPECS-MAP.md` y `docs/ROADMAP.md` ya no contradicen el esquema que este spec deja.

## Decisiones

- **Sí:** el primer admin se promueve a mano desde el panel de Supabase (`update profiles set
role = 'admin' where id = '...'`) después del primer login. **No:** ni credenciales de
  email/contraseña sembradas, ni un Discord ID fijo en el repo, ni una lista de correos admin en
  configuración. El repo es público (requisito del concurso): cualquier secreto ahí es un secreto
  de los otros 17 equipos también, y el login es solo OAuth, así que no hay "primer registro
  garantizado" en el que confiar sin riesgo.
- **Sí:** `programs` tiene 15 filas, una por ruta oficial (`react` y `react-native` separados,
  igual `dart-movil`/`dart-web`). **No:** 13 filas con la ruta como columna extra de
  `program_courses`. El motor del spec 04 necesita filtrar por ruta, no por programa agrupado:
  alguien que pide React web no debe recibir los cursos de React Native.
- **Sí:** el curso descartado es una fila de `path_steps` con `status = 'discarded'` +
  `discard_reason`. **No:** una columna `excluded_steps jsonb` en `learning_paths` ni una tabla
  aparte `path_discarded_steps`. Es una fila más de la misma tabla: se consulta, se indexa y se
  deshace con un `update`, sin migración adicional para el spec 08 ni el 15.
- **Sí:** este spec no crea nada de gamificación (`xp`, `level`, `streak`, `achievements`,
  `user_achievements`). **No:** crearlas ya y dejarlas sin uso hasta el spec 13. La regla 6 del
  mapa exige que cada spec de migración pueda recortarse sin dejar tablas muertas; crearlas aquí
  rompe esa garantía si la semana 2 no llega.
- **Sí:** migraciones versionadas en `supabase/migrations/*.sql`, aplicadas durante `/spec-impl`
  con `apply_migration` del MCP de Supabase. **No:** solo Supabase CLI local sin versionar. El
  repo público necesita que clonar + `supabase link` + `db push` reproduzca el esquema completo
  sin depender de que alguien corra comandos manuales no documentados.
- **Sí:** la tabla `courses` sube los 21 campos completos (los 19 de `courses.json` más
  `difficulty` y `outcome`). **No:** un subconjunto de ~15 campos "para lo que usa la UI hoy". La
  regla 6 del mapa prohíbe migraciones nuevas fuera de 02/11/13/14: un campo que no suba ahora
  (por ejemplo `related`, insumo disponible sin spec dueño) no se puede agregar después sin romper
  el orden.
- **Sí:** el seed es una migración SQL más, con los JSON embebidos como literal `jsonb` y
  expandidos con `jsonb_to_recordset`, repartida en dos archivos (`..._seed_courses.sql`,
  `..._seed_programs.sql`) con una cabecera que explica qué inserta cada uno y de qué archivo de
  `data/` sale. **No:** un script TypeScript aparte que lea `data/*.json` y haga upsert. Un script
  suma `tsx` y la service role key al setup; la migración solo necesita `db push`, que el README ya
  pide para el esquema.
- **Sí:** cuatro enums de Postgres (`user_role`, `course_difficulty`, `program_course_level`,
  `path_step_status`) para los cuatro vocabularios cerrados. **No:** `text` + `check constraint`
  para estos cuatro. `generate_typescript_types` convierte un enum en una unión de TypeScript
  automáticamente; con `check` habría que mantener esa unión a mano en `lib/paths/types.ts`.
- **Sí:** `profiles` no tiene ninguna política de escritura para `authenticated`, ni siquiera "el
  propio dueño puede editar su fila". **No:** `update using (id = auth.uid())`, que parece la
  política obvia para "cada uno edita su perfil". RLS filtra filas, no columnas: esa política deja
  que cualquier usuario se ponga `role = 'admin'` a sí mismo. El rol se cambia solo desde el panel
  de Supabase (que salta RLS); cuando el spec 13 necesite que el usuario actualice su propio
  `xp`/`level`/`streak`, lo hace por una función `security definer` acotada a esas columnas.
- **Sí:** `profiles` es de lectura solo del propio dueño. **No:** lectura pública, como el
  catálogo. El catálogo no tiene datos personales; `profiles.role` sí revela quién es admin, y
  `anon` no necesita verlo para nada del MVP.
- **Sí:** `path_steps.origin` queda como `text` libre, sin enum. **No:** enum también para esto. Su
  vocabulario ("requerido", "interés: docker", etc.) lo define el spec 04, que todavía no se
  escribió; cerrarlo aquí obligaría a una migración nueva en el 04 si el motor necesita un valor
  que este spec no previó.
- **Sí:** lectura pública (`anon` + `authenticated`) del catálogo (`courses`, `programs`,
  `program_courses`). **No:** catálogo visible solo con sesión. La landing del spec 05 y la ruta
  pública del spec 14 (`/r/[slug]`) necesitan mostrar cursos sin que el visitante haya iniciado
  sesión.
- **Sí:** `courses.is_active` para borrado lógico. **No:** `delete` real desde el panel del spec 10. `path_steps.course_id` es `on delete restrict`: un curso que ya está en una ruta guardada de
  algún usuario no puede borrarse sin romper esa ruta.

## Riesgos

| Riesgo                                                                                                                                                                       | Mitigación                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El trigger falla en producción y bloquea el registro (el patrón oficial de Supabase lo advierte explícitamente)                                                              | Probar el trigger con un insert manual en `auth.users` antes de mergear, y como segunda verificación en el primer login real del spec 03                                                    |
| Cambiar el rol a mano se olvida u ocurre sobre el usuario equivocado                                                                                                         | El criterio de aceptación lo deja como paso explícito del README; no bloquea ningún requisito del `ENUNCIADO.md`, que no exige panel admin en el Hito 1                                     |
| El JSON de `courses.json` (170 KB) embebido en una migración hace pesado el diff y el historial de `supabase/migrations/`                                                    | Aceptado: es una sola vez por catálogo congelado (spec 01), y la alternativa (script aparte) suma una dependencia y un paso manual que el evaluador puede saltarse                          |
| Un curso nuevo del panel del spec 10 no puede unirse a ningún programa porque `program_courses.course_id` es `on delete restrict` pero no impide un curso sin ningún vínculo | Aceptado como limitación conocida, igual que hoy `qwik-introduccion` y `go-microservicios`: un curso sin programa nunca aparece en una ruta generada, y el spec 10 debe advertirlo en su UI |
| `programs.slug` no coincide con ningún vocabulario todavía escrito (el spec 04 define `meta → programas` sobre estos 15 slugs)                                               | El spec 04 depende del 02 solo por este vocabulario; queda documentado aquí para que el 04 lo consuma sin inventarlo de nuevo                                                               |

## Qué **no** entra en este spec

- Cualquier UI o server action: login (03), cuestionario (06), server action de generación (07),
  vista de ruta (08), panel de administración (10).
- El motor de reglas (`lib/paths/build-path.ts`, spec 04): este spec solo deja las tablas que el
  motor va a leer y escribir.
- Columnas de gamificación, personalización con IA, o de compartir ruta pública: las suman los
  specs 13, 11 y 14 respectivamente, cada uno en su propia migración.
- Usuarios de email/contraseña o cualquier credencial sembrada para el primer admin.

Cada uno de estos, si aterriza, va en su propio spec.
