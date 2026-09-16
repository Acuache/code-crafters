# CLAUDE.md

Este archivo da contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

@AGENTS.md

> Nota: `AGENTS.md` está en inglés porque lo genera y reescribe automáticamente `next dev` (ver `node_modules/next/dist/server/lib/generate-agent-files.js`). No lo traduzcas ni lo edites a mano.

## Estado del proyecto

Este repo es todavía mayormente un scaffold de `create-next-app`: `app/page.tsx` sigue siendo la plantilla por defecto y la aplicación real — **Code Quest**, un generador de rutas de aprendizaje sobre el catálogo de cursos de DevTalles — todavía no está construida. Lo que ya salió del scaffold es la base visual (`shadcn/ui` inicializado: `components.json`, `components/ui/`, `lib/utils.ts`; `app/layout.tsx` / `app/globals.css` ya cargan su tema) y los utils de cliente de Supabase (`lib/supabase/{client,server}.ts`, `proxy.ts`) — ver **Notas de arquitectura** para el detalle de ambos. La planificación, los requisitos y la investigación viven en `docs/` y `data/` (contexto de proyecto real, no un scratchpad descartable):

- `docs/ENUNCIADO.md` — los requisitos oficiales del concurso. Cualquier feature debe cumplirlos.
- `docs/ROADMAP.md` — el plan MVP detallado: modelo de datos, estructura de carpetas (`src/app` con route groups, `src/lib/{supabase,ai,paths,gamification}`), cronograma día a día y el stack elegido (Next.js 16 App Router, Tailwind v4 + shadcn/ui, Supabase para auth/DB con Discord OAuth, Vercel AI SDK, React Flow para el mapa de la ruta).
- `docs/decisiones/` — historial de decisiones (formato ADR: contexto, opciones, decisión, consecuencias). `README.md` es el índice; `0000-plantilla.md` es el formato a copiar para una decisión nueva. Antes de proponer un cambio de arquitectura importante, revisar aquí si ya se debatió.
- `docs/investigacion/ANALISIS-IA.md` — reemplaza una decisión clave del roadmap: en vez de "la IA arma toda la ruta", recomienda un enfoque **híbrido**: un motor por reglas sobre los programas oficiales de DevTalles siempre genera una ruta funcional, y la IA solo personaliza encima (explica elecciones, cambia cursos opcionales, interpreta metas en texto libre). Esto existe para que la app funcione aunque falte o se agote la key de OpenAI — necesario porque, según `ENUNCIADO.md`, un proyecto que no funcione al clonarlo descalifica al equipo.
- `docs/investigacion/opcion-c.html` — demo interactiva en HTML del enfoque híbrido (reglas + IA); se abre directo en el navegador.
- `docs/investigacion/ideas-vagas.md` — notas iniciales sueltas (concurso de 18 equipos, 2 semanas de plazo, $10 de crédito de OpenAI).
- `data/` — el catálogo ya extraído: `courses.json` (74 cursos activos, sin Legacy), `programs.json` (las rutas/programas oficiales de DevTalles), `SUMMARY.md` (referencia de los campos de ambos JSON, incluida la procedencia). Se extrajo con un scraper de un solo uso que ya no vive en el repo — si hace falta regenerarlo, se vuelve a escribir.

Al implementar features, revisar primero `ROADMAP.md` + `ANALISIS-IA.md` + `docs/decisiones/` para la arquitectura y el modelo de datos previstos en vez de inventar uno nuevo — nada de eso está implementado todavía, así que no hay código existente que lo contradiga.

## Metodología: Spec-Driven Development (SDD)

Las features de tamaño no trivial se desarrollan con las skills `spec` / `spec-impl` (instaladas en `.claude/skills/`, contenido real en `.agents/skills/`, origen y hash en `skills-lock.json`). El flujo es obligatorio para ese tipo de trabajo — no arrancar a codear una feature grande directo sobre `main` sin pasar por esto:

1. **`/spec <descripción>`** — hace preguntas de aclaración (alcance, modelo de datos, integración, riesgos) y escribe `specs/NN-slug.md` con estado `Draft`. No escribe código.
2. El usuario revisa el spec y cambia manualmente su estado a `Approved` cuando está conforme — el agente nunca se auto-aprueba.
3. **`/spec-impl NN-slug`** — valida que el estado sea `Approved`, crea (o retoma) la rama `spec-NN-slug` según `specs/.spec-config.yml` (`AutoCreateBranch`, default `true`), y luego implementa el plan del spec paso a paso, pausando después de cada paso para revisión. Nunca commitea automáticamente.

`specs/` todavía no existe en este repo — se crea con el primer `/spec`. El detalle completo de fases y reglas vive en `.agents/skills/spec/SKILL.md` y `.agents/skills/spec-impl/SKILL.md`; no lo dupliques aquí, ya se carga solo al invocar la skill.

## Agentes y skills

Subagentes propios del proyecto, definidos en `.claude/agents/` con su comando en `.claude/commands/`:

| Agente | Comando | Cuándo usarlo | Herramientas |
|---|---|---|---|
| `devils-advocate` | `/critique <idea>` | Antes de comprometerse con una decisión técnica o de producto. Ataca la idea con los criterios de `ENUNCIADO.md` y el estado real del proyecto — no valida, no propone alternativas más grandes. | Solo lectura: `Read`, `Glob`, `Grep`, `WebSearch`, `WebFetch` (sin `Write`/`Edit`: no puede escribir el registro de la decisión, eso se hace a mano en `docs/decisiones/` una vez decidido). |
| `craft-reviewer` | `/review [ruta]` | Después de escribir código, para revisar legibilidad y buenas prácticas (ver la sección de abajo). Sin ruta, revisa el diff actual. | `Read`, `Edit`, `Glob`, `Grep`, `Bash`, Context7 (sin `Write`: corrige archivos existentes, no crea nuevos). |

Skills de terceros instaladas vía `skills-lock.json` (símlinks en `.claude/skills/` → contenido real en `.agents/skills/`; no editar el contenido a mano, se resincroniza desde la fuente):

| Skill | Fuente | Para qué |
|---|---|---|
| `spec` / `spec-impl` | `Klerith/fernando-skills` | El flujo SDD descrito arriba. |
| `shadcn` | `shadcn-ui/ui` | Agregar/editar componentes de `shadcn/ui`, convenciones de composición y estilos — reglas detalladas en `.agents/skills/shadcn/rules/`. Consultarla en vez de improvisar sobre `components/ui/`. |
| `supabase` | `supabase/agent-skills` | Cualquier trabajo con Supabase: auth (Discord OAuth del `ROADMAP.md`), DB, RLS, `@supabase/ssr` en Next.js, CLI y depuración. |
| `supabase-postgres-best-practices` | `supabase/agent-skills` | Antes de crear o cambiar tablas, migraciones, índices, políticas RLS o funciones en Postgres. |
| `next-best-practices` | `vercel-labs/openreview` | Al escribir o revisar código de Next.js: convenciones de archivos (incluye el rename `middleware` → `proxy` en v16), límites RSC, patrones async (`cookies()`/`headers()`/`params` con `await`), metadata, route handlers, optimización de imagen/fuentes y bundling. |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | Al diseñar, construir o revisar UI: accesibilidad, layout responsive, tipografía/color, animación, formularios, navegación y charts, con guía específica por stack. No aplica a lógica de backend ni trabajo no visual. |

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
- Nombres descriptivos aunque sean largos. Identificadores en inglés; textos de UI y comentarios en español (el modelo de datos del `ROADMAP.md` ya usa `courses`, `learning_paths`, `path_steps`).
- Early returns en vez de anidar condicionales.
- Funciones con un solo propósito y un nombre que lo diga.
- Descomponer expresiones largas en pasos con nombre.
- `tsconfig.json` tiene `"strict": true`: nada de `any` sin comentar por qué hizo falta.

## Comandos

- `npm run dev` — levanta el servidor de desarrollo de Next.js (también regenera el bloque de reglas para agentes en `AGENTS.md` en cada corrida — ver la nota de arriba).
- `npm run build` — build de producción.
- `npm run start` — corre un build de producción.
- `npm run lint` — ESLint vía `eslint-config-next` (reglas core-web-vitals + TypeScript), flat config en `eslint.config.mjs`.
- Todavía no hay un test runner configurado.

## Notas de arquitectura

- Next.js **16.3.5** con React **19.2.8** — una versión más nueva que la mayoría de los datos de entrenamiento. Según `AGENTS.md`, hay que leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código relacionado con el framework (routing, middleware, data fetching, etc.), porque las convenciones pueden haber cambiado (por ejemplo, `middleware.ts` ahora es `proxy.ts`).
- Alias de TypeScript: `@/*` apunta a la raíz del repo (`tsconfig.json`), no a `src/*` — de ahí resuelven tanto imports propios como los alias de `components.json` (`@/components`, `@/lib`, `@/components/ui`, `@/hooks`) que usa `shadcn/ui`. La arquitectura planeada en `ROADMAP.md` asume una estructura `src/`, así que si se hace esa reestructuración hay que actualizar `tsconfig.json` **y** `components.json` a la vez.
- Tailwind v4 vía `@tailwindcss/postcss` (sin `tailwind.config` separado; ver `postcss.config.mjs`).
- `shadcn/ui` inicializado (`components.json`): estilo `base-vega`, `baseColor` neutral, íconos con `@phosphor-icons/react`, RSC habilitado. El tema (`app/globals.css`) usa variables OKLCH inyectadas por shadcn más `tw-animate-css`; `app/layout.tsx` combina las fuentes Geist (mono) con IBM Plex Sans (`--font-sans`) y Source Sans 3 (`--font-heading`, para encabezados) vía `next/font/google`, unidas con el helper `cn` (`lib/utils.ts`).
- Clientes de Supabase (`@supabase/ssr` 0.12.7) siguiendo el patrón oficial `getAll`/`setAll` (los métodos `get`/`set`/`remove` están deprecados): `lib/supabase/client.ts` para Client Components (`createBrowserClient`, cookies vía `document.cookie` automático) y `lib/supabase/server.ts` para Server Components/Actions (`createServerClient` + `cookies()` de `next/headers`, con el `setAll` envuelto en `try/catch` porque los Server Components no pueden escribir cookies). `proxy.ts` en la raíz (no `middleware.ts`, ver nota de arriba) hace el refresh de sesión en cada request con `supabase.auth.getClaims()` — método recomendado actualmente por sobre `getSession()`/`getUser()` porque valida el JWT contra las claves de firma en vez de confiar ciegamente en la cookie. Variables de entorno en `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la publishable key reemplaza a la legacy `anon` key) y `SUPABASE_DB_PASSWORD` (CLI). Estos tres archivos siguen la ubicación (`lib/supabase/`, no `src/lib/supabase/`) y ROADMAP.md los da por planeados en `src/`; si se hace la reestructuración a `src/` hay que moverlos junto con todo lo demás.
