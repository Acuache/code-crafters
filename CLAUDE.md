# CLAUDE.md

Este archivo da contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

@AGENTS.md

> Nota: `AGENTS.md` está en inglés porque lo genera y reescribe automáticamente `next dev` (ver `node_modules/next/dist/server/lib/generate-agent-files.js`). No lo traduzcas ni lo edites a mano.

## Estado del proyecto

Dos nombres, dos cosas distintas — no confundirlos: **DevPathlles** es el producto (este repo) y **Code Crafters** es el equipo que lo construye. Se trabaja sobre la rama `master`. `README.md` es la presentación pública del proyecto (qué es, cómo funciona, llaves, cómo probarlo): si cambia algo que describe, se actualiza en el mismo cambio.

**DevPathlles** es un generador de rutas de aprendizaje sobre el catálogo de cursos de DevTalles. Ya están implementados los specs 01–15 y el 17: la landing pública con el recorrido "Cómo funciona" animado con el scroll (spec 05, `components/landing/`, `lib/landing/`), esquema de Supabase y seed del catálogo, login OAuth, motor de rutas por reglas (`lib/paths/`), cuestionario, generación y vista de la ruta (lista + mapa en zigzag), dashboard, panel `/admin`, y la personalización con IA (`lib/ai/`). Encima, los quizzes y la racha, integrados según `docs/decisiones/0005-quizzes-y-racha-unificados.md` (`lib/quizzes/`, `lib/gamification/streak.ts`, `components/quizzes/`); desde el spec 13 los quizzes ya no se generan con IA: el admin los escribe en `/admin/courses/[slug]/quiz` (`docs/decisiones/0006-quizzes-de-curso-escritos-por-el-admin.md`). El spec 14 suma XP, niveles e insignias derivados al leer (`lib/gamification/`, `components/gamification/`), la página `/profile` y la celebración al completar; con `docs/decisiones/0007-done-requires-course-quiz.md`, "Hecho" en un curso con quiz exige aprobarlo. El spec 15 deja compartir una ruta con un link público `/shared/[slug]` (con tarjeta OG para Discord) y copiarla a otra cuenta con el progreso en cero (`lib/sharing/`, `components/sharing/`). El spec 17 (motor v2, `docs/decisiones/0008-motor-v2-requisitos-y-admin.md`) reescribe `lib/paths/build-path.ts`: la ruta se ordena por requisitos entre cursos (`course_prerequisites`: "necesita" / "conviene") y por dificultad, Fundamentos es la base editable del principiante, los cursos de cada interés viven en `interest_courses`, la ruta se agrupa por tramos (Primeros pasos / Intermedio / Avanzado), y el admin edita esas reglas en `/admin/courses/[slug]` (con sugerencias de IA) y `/admin/interests`. El 16 (`path-recalculation`) sigue sin escribir y conserva su número. Qué spec sigue y en qué estado está cada uno: `docs/SPECS-MAP.md` y la línea `**Estado:**` de cada `specs/NN-slug.md`. Toda feature respeta tres principios del producto:

- **Funciona entera al clonarla, sin `OPENAI_API_KEY`.** El motor por reglas es el plan A; la IA es un valor agregado que nunca bloquea nada.
- **Usa el catálogo real de DevTalles** (sus cursos y rutas oficiales), nunca cursos inventados.
- **Se juzga navegando la app y leyendo el repo público:** UI clara y consistente, código limpio.

La planificación y la investigación viven en `docs/` y `data/` (contexto de proyecto real, no un scratchpad descartable):

- `specs/` y `docs/SPECS-MAP.md` — un spec por feature, y el mapa con su orden, sus dependencias y qué archivo es de qué spec. El roadmap original ya no está en el repo: la referencia son el código y los specs implementados.
- `docs/decisiones/` — historial de decisiones (formato ADR: contexto, opciones, decisión, consecuencias). `README.md` es el índice; `0000-plantilla.md` es el formato a copiar para una decisión nueva. Antes de proponer un cambio de arquitectura importante, revisar aquí si ya se debatió.
- `docs/investigacion/ANALISIS-IA.md` — reemplazó una decisión clave del roadmap original: en vez de "la IA arma toda la ruta", recomienda un enfoque **híbrido**: un motor por reglas sobre los programas oficiales de DevTalles siempre genera una ruta funcional, y la IA solo personaliza encima (explica elecciones, cambia cursos opcionales, interpreta metas en texto libre). Esto existe para que la app funcione aunque falte o se agote la key de OpenAI: quien clone el repo tiene que poder usarla sin keys de IA.
- `data/` — el catálogo ya extraído y las reglas iniciales del motor: `courses.json` (74 cursos activos, sin Legacy), `courses.enriched.json` (dificultad y resultado de cada curso), `programs.json` (las rutas/programas oficiales de DevTalles), `course-prerequisites.json`, `interest-courses.json` y `quizzes.json`. Son la fuente de los seeds de `supabase/migrations/` y los fixtures de varios tests (`lib/paths/build-path.test.ts`, `lib/quizzes/seed-data.test.ts`, `lib/landing/example-path.test.ts`): no se borran aunque la app lea todo de Supabase. `SUMMARY.md` es la referencia de sus campos, incluida la procedencia. El catálogo se extrajo con un scraper de un solo uso que ya no vive en el repo — si hace falta regenerarlo, se vuelve a escribir.

Al implementar features, revisar primero el spec que toca, `docs/SPECS-MAP.md` (qué archivo es de qué spec y sus excepciones) y `docs/decisiones/` en vez de inventar arquitectura o modelo de datos nuevos. Si un documento contradice al código, mandan el código y los specs implementados.

## Metodología: Spec-Driven Development (SDD)

Las features de tamaño no trivial se desarrollan con las skills `spec` / `spec-impl` (instaladas en `.claude/skills/`, contenido real en `.agents/skills/`, origen y hash en `skills-lock.json`). El flujo es obligatorio para ese tipo de trabajo — no arrancar a codear una feature grande directo sobre `main` sin pasar por esto:

1. **`/spec <descripción>`** — hace preguntas de aclaración (alcance, modelo de datos, integración, riesgos) y escribe `specs/NN-slug.md` con estado `Draft`. No escribe código.
2. El usuario revisa el spec y cambia manualmente su estado a `Approved` cuando está conforme — el agente nunca se auto-aprueba.
3. **`/spec-impl NN-slug`** — valida que el estado sea `Approved`, crea (o retoma) la rama `spec-NN-slug` según `specs/.spec-config.yml` (`AutoCreateBranch`, default `true`), y luego implementa el plan del spec paso a paso, pausando después de cada paso para revisión. Nunca commitea automáticamente.

Los specs viven en `specs/NN-slug.md` (estados en español: `Borrador`, `Aprobado`, `Implementado`). El detalle completo de fases y reglas vive en `.agents/skills/spec/SKILL.md` y `.agents/skills/spec-impl/SKILL.md`; no lo dupliques aquí, ya se carga solo al invocar la skill.

El orden acordado de los 16 specs del MVP — numeración, dependencias entre ellos y qué decisión pendiente cierra cada uno — vive en [`docs/SPECS-MAP.md`](docs/SPECS-MAP.md). Consultarlo antes de correr `/spec` para saber qué feature sigue y qué specs previos debe listar en `**Depende de:**`.

## Agentes y skills

Subagentes propios del proyecto, definidos en `.claude/agents/` con su comando en `.claude/commands/`:

| Agente | Comando | Cuándo usarlo | Herramientas |
|---|---|---|---|
| `devils-advocate` | `/critique <idea>` | Antes de comprometerse con una decisión técnica o de producto. Ataca la idea con los principios del producto y el estado real del proyecto — no valida, no propone alternativas más grandes. | Solo lectura: `Read`, `Glob`, `Grep`, `WebSearch`, `WebFetch` (sin `Write`/`Edit`: no puede escribir el registro de la decisión, eso se hace a mano en `docs/decisiones/` una vez decidido). |
| `craft-reviewer` | `/review [ruta]` | Después de escribir código, para revisar legibilidad y buenas prácticas (ver la sección de abajo). Sin ruta, revisa el diff actual. | `Read`, `Edit`, `Glob`, `Grep`, `Bash`, Context7 (sin `Write`: corrige archivos existentes, no crea nuevos). |

Skills de terceros instaladas vía `skills-lock.json` (símlinks en `.claude/skills/` → contenido real en `.agents/skills/`; no editar el contenido a mano, se resincroniza desde la fuente):

| Skill | Fuente | Para qué |
|---|---|---|
| `spec` / `spec-impl` | `Klerith/fernando-skills` | El flujo SDD descrito arriba. |
| `shadcn` | `shadcn-ui/ui` | Agregar/editar componentes de `shadcn/ui`, convenciones de composición y estilos — reglas detalladas en `.agents/skills/shadcn/rules/`. Consultarla en vez de improvisar sobre `components/ui/`. |
| `supabase` | `supabase/agent-skills` | Cualquier trabajo con Supabase: auth (OAuth con Discord, Google y GitHub), DB, RLS, `@supabase/ssr` en Next.js, CLI y depuración. |
| `supabase-postgres-best-practices` | `supabase/agent-skills` | Antes de crear o cambiar tablas, migraciones, índices, políticas RLS o funciones en Postgres. |
| `next-best-practices` | `vercel-labs/openreview` | Al escribir o revisar código de Next.js: convenciones de archivos (incluye el rename `middleware` → `proxy` en v16), límites RSC, patrones async (`cookies()`/`headers()`/`params` con `await`), metadata, route handlers, optimización de imagen/fuentes y bundling. |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | Al diseñar, construir o revisar UI: accesibilidad, layout responsive, tipografía/color, animación, formularios, navegación y charts, con guía específica por stack. No aplica a lógica de backend ni trabajo no visual. |

Las migraciones se aplican con `npx supabase db push` (CLI vinculada al proyecto), no con `apply_migration` del MCP: el MCP registra la migración con otra versión que la del archivo, y el historial remoto deja de coincidir con `supabase/migrations/`.

El MCP de Supabase está configurado en `.mcp.json` (server remoto `https://mcp.supabase.com/mcp`, apunta al proyecto `gpbwuvvfffvxpkgzjqzk`) y requiere autenticarse una vez por sesión con `/mcp`. Da acceso directo al proyecto real: `list_tables`, `execute_sql`, `apply_migration`, `get_advisors`, `search_docs`, `get_project_url`/`get_publishable_keys` (para no tener que copiar esos valores a mano), logs (`query_logs`) y Edge Functions — preferirlo sobre pedirle al usuario que pegue esos datos.

## Context7

Todo código que toque una librería o framework externo — Next.js 16, React 19, Tailwind v4, shadcn/ui, Supabase, Vercel AI SDK, zod — se consulta **siempre** en Context7 (`resolve-library-id` → `query-docs`) antes de escribirlo, corregirlo o criticarlo, aunque creas que ya sabes la respuesta: estas versiones son más nuevas que la mayoría de los datos de entrenamiento. Una API o una convención que no verificaste no se escribe ni se aplica en una revisión. Si no se puede verificar, decirlo explícitamente en vez de improvisar.

## Código limpio y buenas prácticas

**Legible no es sinónimo de corto.** Un ternario anidado ocupa una línea y es peor que un `if/else` de cinco. La métrica es "se entiende en una sola lectura", no "cuenta de líneas".

**No hacer, aunque acorte el código:**
- Colapsar un `if/else` claro en ternarios anidados.
- Convertir un bucle legible en una cadena de `reduce`/`map`/`filter` que hay que descifrar.
- Quitar variables intermedias con nombre descriptivo solo para ahorrar líneas.
- Crear una abstracción para no repetir tres líneas — tres líneas repetidas son mejores que una abstracción prematura.
- Comentarios que explican *qué* hace el código en vez de *por qué*.

**Sí hacer:**
- Nombres descriptivos aunque sean largos. Identificadores en inglés; textos de UI y comentarios en español (el modelo de datos ya usa `courses`, `learning_paths`, `path_steps`).
- Textos de UI en español neutro y tuteando al usuario ("Prueba de nuevo", "Elige un plazo"), nunca voseo. Los prompts de la IA piden lo mismo.
- Early returns en vez de anidar condicionales.
- Funciones con un solo propósito y un nombre que lo diga.
- Descomponer expresiones largas en pasos con nombre.
- `tsconfig.json` tiene `"strict": true`: nada de `any` sin comentar por qué hizo falta.

## UI: componer, no crear

Toda pantalla nueva (specs 03, 05, 06, 08, 09, 10, 12, 13, 14) se arma reusando `components/ui/*`,
`components/brand/*` y los assets ya catalogados — si algo parece faltar, primero se busca en
`/sistema-diseno` antes de maquetarlo a mano. Motivo: la app se juzga navegándola (una UI agradable
y entendible) y leyendo el repo público (código limpio); una pantalla que improvisa sus propios
botones o colores pierde en las dos vías a la vez.

- Un componente visual nuevo solo se crea si ningún componente existente sirve, y el spec que lo
  crea lo justifica en su sección de Decisiones.
- Iconos siempre desde `@phosphor-icons/react` con sufijo `Icon` (`DiscordLogoIcon`, no
  `DiscordLogo`, que está deprecado); desde el submódulo `@phosphor-icons/react/ssr` cuando el
  componente es un Server Component (precedente: `components/brand/ai-badge.tsx`).
- No importar desde el `_components/` privado de otra ruta (p. ej. `app/sistema-diseno/_components/`)
  — es implementación interna de esa página, no una API pública.
- Esto no contradice "tres líneas repetidas son mejores que una abstracción prematura" (abajo): es
  sobre *qué piezas visuales existen*, no sobre extraer una abstracción de código por repetirse tres
  veces.

## Comandos

- `npm run dev` — levanta el servidor de desarrollo de Next.js (también regenera el bloque de reglas para agentes en `AGENTS.md` en cada corrida — ver la nota de arriba).
- `npm run build` — build de producción.
- `npm run start` — corre un build de producción.
- `npm run lint` — ESLint vía `eslint-config-next` (reglas core-web-vitals + TypeScript), flat config en `eslint.config.mjs`.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run format` / `npm run format:check` — Prettier (`.prettierrc.json`, con el plugin de Tailwind que ordena las clases). `components/ui/` y `database.types.ts` quedan fuera por ser generados.
- `npm run test` — Vitest (`vitest.config.mts`; los tests de componentes usan `// @vitest-environment jsdom` + Testing Library). Los tests viven junto al archivo (`*.test.ts(x)`).
- `npx supabase test db` — tests pgTAP de `supabase/tests/`. Necesita Docker Desktop corriendo.
- `npx supabase db push` — aplica las migraciones nuevas al proyecto vinculado (usa `SUPABASE_DB_PASSWORD` y `SUPABASE_ACCESS_TOKEN` de `.env.local`).

## Notas de arquitectura

- Next.js **16.3.5** con React **19.2.8** — una versión más nueva que la mayoría de los datos de entrenamiento. Según `AGENTS.md`, hay que leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código relacionado con el framework (routing, middleware, data fetching, etc.), porque las convenciones pueden haber cambiado (por ejemplo, `middleware.ts` ahora es `proxy.ts`).
- Alias de TypeScript: `@/*` apunta a la raíz del repo (`tsconfig.json`), no a `src/*` — de ahí resuelven tanto imports propios como los alias de `components.json` (`@/components`, `@/lib`, `@/components/ui`, `@/hooks`) que usa `shadcn/ui`. Se decidió no migrar a `src/` (ver `docs/SPECS-MAP.md`), así que no hace falta tocar `tsconfig.json` ni `components.json` por esto.
- Tailwind v4 vía `@tailwindcss/postcss` (sin `tailwind.config` separado; ver `postcss.config.mjs`).
- `shadcn/ui` inicializado (`components.json`): estilo `base-vega`, `baseColor` neutral, íconos con `@phosphor-icons/react`, RSC habilitado. El tema (`app/globals.css`) usa la paleta de DevTalles en variables OKLCH (violeta, lavanda, lima; ver `docs/decisiones/0002-sistema-de-diseno-devtalles.md`), con tema claro y oscuro vía `next-themes` (`defaultTheme="dark"`) más `tw-animate-css`; `app/layout.tsx` combina las fuentes Space Grotesk (`--font-heading`) y DM Sans (`--font-sans`) — las mismas que usa cursos.devtalles.com — con Geist Mono (`--font-mono`) vía `next/font/google`, unidas con el helper `cn` (`lib/utils.ts`). La galería completa de tokens, tipografía y ~22 componentes vive en la ruta `/sistema-diseno` (`app/sistema-diseno/`).
- Clientes de Supabase (`@supabase/ssr` 0.12.7) siguiendo el patrón oficial `getAll`/`setAll` (los métodos `get`/`set`/`remove` están deprecados): `lib/supabase/client.ts` para Client Components (`createBrowserClient`, cookies vía `document.cookie` automático) y `lib/supabase/server.ts` para Server Components/Actions (`createServerClient` + `cookies()` de `next/headers`, con el `setAll` envuelto en `try/catch` porque los Server Components no pueden escribir cookies). `proxy.ts` en la raíz (no `middleware.ts`, ver nota de arriba) hace el refresh de sesión en cada request con `supabase.auth.getClaims()` — método recomendado actualmente por sobre `getSession()`/`getUser()` porque valida el JWT contra las claves de firma en vez de confiar ciegamente en la cookie — y redirige a `/login` las rutas privadas sin sesión. Ese chequeo es optimista: cada página y cada action sigue llamando a `requireUser()`/`requireAdmin()`. Variables de entorno en `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la publishable key reemplaza a la legacy `anon` key), `SUPABASE_DB_PASSWORD` (CLI), y dos opcionales: `OPENAI_API_KEY` (personalización del spec 11; sin ella la ruta se genera igual) y `NEXT_PUBLIC_SITE_URL` (la URL pública, para el `redirectTo` del login y la tarjeta OG del spec 15; sin ella se deduce del entorno). Los quizzes (spec 13) no necesitan ninguna clave extra: el admin los escribe y el usuario los lee con su sesión, protegidos por RLS. Estos tres archivos se quedan en `lib/supabase/` (no `src/lib/supabase/`): no hay migración a `src/` planeada.

## Marca y assets

Los assets de marca de DevPathlles viven en `public/` (y `app/` para los iconos), ya optimizados a WebP/PNG comprimido. Un feature nueva usa el asset que le toca de esta tabla en vez de generar o pedir uno nuevo:

| Asset | Qué es | Dónde se usa |
|---|---|---|
| `public/logo.webp` | Lockup completo: mascota + wordmark "DevPathlles" | Cabeceras (incluida la de la landing, spec 05 `landing`), cabecera de `/shared/[slug]` (spec 15 `path-sharing`) |
| `public/og-logo.png` | El mismo lockup en PNG, 360 × 128 | Solo las tarjetas OG de `/` (spec 05) y de `/shared/[slug]` (spec 15): `ImageResponse` no decodifica WebP |
| `public/astronauta.webp` | La mascota sola, recorte cuadrado | README, avatares, estados vacíos, páginas de error y 404, ilustraciones pequeñas, la pose que saluda de la landing y la estación "Cuestionario" (spec 05) |
| `public/astronauta-vuelo.png` | La mascota volando | Pantalla de "generando ruta" (spec 07 `path-generation`), el mapa de la ruta y el astronauta que viaja por el recorrido de la landing |
| `public/astronauta-primera-ruta.png` | La mascota invitando a crear la primera ruta | Estado vacío de `/dashboard` |
| `public/astronauta-eliminar-ruta.png` | La mascota con una papelera | Diálogo de confirmación al borrar una ruta (`components/dashboard/delete-path-button.tsx`) |
| `public/languages-icons/*.svg` | Logos de tecnologías e iconos de áreas e intereses | Pasos Meta, Ya dominas y Te interesa del cuestionario (`components/quiz/steps/`) y la franja de tecnologías de la landing (`components/landing/tech-strip.tsx`) |
| `app/icon.png`, `app/apple-icon.png` | Icono de la app | Los engancha Next por convención de archivo — no se referencian a mano ni van en `metadata.icons` |
| `public/streak/celebration-{1,2,3,4}.webp` | Cuatro poses de celebración de la mascota | Spec 14 `gamification`: paso completado, ruta completada, subida de nivel, insignia nueva. Spec 05: el cohete (`-1`) en el hero y el CTA final; el orbe (`-2`), la antorcha (`-3`) y la órbita (`-4`) en las estaciones IA, Motor y Compartir |
| `public/streak/reminder.webp` | La mascota con la llama de la racha | Spec 14 `gamification`: racha activa / recordatorio de volver. Spec 05: la estación "Progreso" |
| `public/code-quest.webp` | Logo externo, 288 × 124, texto blanco | Solo el footer de la landing (spec 05), dentro de `bg-logo-backdrop` como el wordmark |

Reglas:

- El wordmark de `logo.webp` es blanco y se pierde sobre fondo claro: siempre va envuelto en un contenedor con la clase `bg-logo-backdrop` (token definido en `app/globals.css`, fijo en los dos temas — no usar `dark:` para esto). Por eso el README usa `astronauta.webp`: GitHub no tiene ese fondo.
- Todo `<Image>` lleva `alt` descriptivo, salvo cuando la imagen es puramente decorativa y el texto equivalente ya está al lado (`alt=""`).
- No se vuelve a meter un PNG sin optimizar en `public/`: mismo patrón que se usó para estos (`sharp`, `trim` del margen transparente, redimensionar al tamaño real de uso, `webp` calidad ~82 salvo iconos que van en PNG con paleta). Pendiente: los tres `astronauta-*.png` (0,8–1 MB cada uno) todavía no pasaron por ese proceso.
- `isotipo.png` y `logotipo.png` (la marca del equipo Code Crafters, no la del producto) ya no están en el repo — no se reintroducen en la app.
