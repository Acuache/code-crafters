# CLAUDE.md

Este archivo da contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

@AGENTS.md

> Nota: `AGENTS.md` está en inglés porque lo genera y reescribe automáticamente `next dev` (ver `node_modules/next/dist/server/lib/generate-agent-files.js`). No lo traduzcas ni lo edites a mano.

## Estado del proyecto

Tres nombres, tres cosas distintas — no confundirlos: **DevPathlles** es el producto (este repo), **Code Crafters** es el equipo que lo construye, y **Code Quest** es el concurso de DevTalles para el que se construye (`docs/ENUNCIADO.md`).

**DevPathlles** es un generador de rutas de aprendizaje sobre el catálogo de cursos de DevTalles. Ya están implementados los specs 01–12 (menos el 05, la landing): esquema de Supabase y seed del catálogo, login OAuth, motor de rutas por reglas (`lib/paths/`), cuestionario, generación y vista de la ruta (lista + mapa en zigzag), dashboard, panel `/admin`, y la personalización con IA (`lib/ai/`). Encima, los quizzes y la racha que aportó Ariel, integrados según `docs/decisiones/0005-quizzes-y-racha-unificados.md` (`lib/quizzes/`, `lib/gamification/streak.ts`, `components/quizzes/`). Qué spec sigue y en qué estado está cada uno: `docs/SPECS-MAP.md` y la línea `**Estado:**` de cada `specs/NN-slug.md`. La planificación, los requisitos y la investigación viven en `docs/` y `data/` (contexto de proyecto real, no un scratchpad descartable):

- `docs/ENUNCIADO.md` — los requisitos oficiales del concurso. Cualquier feature debe cumplirlos.
- `docs/ROADMAP.md` — el plan MVP detallado: modelo de datos, estructura de carpetas (`app` con route groups, `lib/{supabase,ai,paths,gamification}`, en la raíz del repo — ver **Notas de arquitectura**), cronograma día a día y el stack elegido (Next.js 16 App Router, Tailwind v4 + shadcn/ui, Supabase para auth/DB con Discord OAuth, Vercel AI SDK; el roadmap preveía React Flow para el mapa de la ruta, pero el spec 12 lo resolvió con CSS + SVG, sin dependencias nuevas).
- `docs/decisiones/` — historial de decisiones (formato ADR: contexto, opciones, decisión, consecuencias). `README.md` es el índice; `0000-plantilla.md` es el formato a copiar para una decisión nueva. Antes de proponer un cambio de arquitectura importante, revisar aquí si ya se debatió.
- `docs/investigacion/ANALISIS-IA.md` — reemplaza una decisión clave del roadmap: en vez de "la IA arma toda la ruta", recomienda un enfoque **híbrido**: un motor por reglas sobre los programas oficiales de DevTalles siempre genera una ruta funcional, y la IA solo personaliza encima (explica elecciones, cambia cursos opcionales, interpreta metas en texto libre). Esto existe para que la app funcione aunque falte o se agote la key de OpenAI — necesario porque, según `ENUNCIADO.md`, un proyecto que no funcione al clonarlo descalifica al equipo.
- `docs/investigacion/opcion-c.html` — demo interactiva en HTML del enfoque híbrido (reglas + IA); se abre directo en el navegador.
- `docs/investigacion/ideas-vagas.md` — notas iniciales sueltas (concurso de 18 equipos, 2 semanas de plazo, $10 de crédito de OpenAI).
- `data/` — el catálogo ya extraído: `courses.json` (74 cursos activos, sin Legacy), `programs.json` (las rutas/programas oficiales de DevTalles), `SUMMARY.md` (referencia de los campos de ambos JSON, incluida la procedencia). Se extrajo con un scraper de un solo uso que ya no vive en el repo — si hace falta regenerarlo, se vuelve a escribir.

Al implementar features, revisar primero el spec que toca, `docs/SPECS-MAP.md` (qué archivo es de qué spec y sus excepciones) y `docs/decisiones/` en vez de inventar arquitectura o modelo de datos nuevos. Si el código existente contradice a `ROADMAP.md`, manda el código y los specs implementados: el roadmap es el plan original.

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
- Nombres descriptivos aunque sean largos. Identificadores en inglés; textos de UI y comentarios en español (el modelo de datos del `ROADMAP.md` ya usa `courses`, `learning_paths`, `path_steps`).
- Textos de UI en español neutro y tuteando al usuario ("Prueba de nuevo", "Elige un plazo"), nunca voseo. Los prompts de la IA piden lo mismo.
- Early returns en vez de anidar condicionales.
- Funciones con un solo propósito y un nombre que lo diga.
- Descomponer expresiones largas en pasos con nombre.
- `tsconfig.json` tiene `"strict": true`: nada de `any` sin comentar por qué hizo falta.

## UI: componer, no crear

Toda pantalla nueva (specs 03, 05, 06, 08, 09, 10, 12, 13, 14) se arma reusando `components/ui/*`,
`components/brand/*` y los assets ya catalogados — si algo parece faltar, primero se busca en
`/sistema-diseno` antes de maquetarlo a mano. Motivo: el concurso se evalúa navegando la app
desplegada (`ENUNCIADO.md`, criterio 4, "UI agradable y entendible") y leyendo el repo público
(criterio 5, "código limpio"); una pantalla que improvisa sus propios botones o colores pierde en
las dos vías a la vez.

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
- `npm run test` — Vitest (`vitest.config.mts`; los tests de componentes usan `// @vitest-environment jsdom` + Testing Library). Los tests viven junto al archivo (`*.test.ts(x)`).
- `npx supabase test db` — tests pgTAP de `supabase/tests/`. Necesita Docker Desktop corriendo.
- `npx supabase db push` — aplica las migraciones nuevas al proyecto vinculado (usa `SUPABASE_DB_PASSWORD` y `SUPABASE_ACCESS_TOKEN` de `.env.local`).

## Notas de arquitectura

- Next.js **16.3.5** con React **19.2.8** — una versión más nueva que la mayoría de los datos de entrenamiento. Según `AGENTS.md`, hay que leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código relacionado con el framework (routing, middleware, data fetching, etc.), porque las convenciones pueden haber cambiado (por ejemplo, `middleware.ts` ahora es `proxy.ts`).
- Alias de TypeScript: `@/*` apunta a la raíz del repo (`tsconfig.json`), no a `src/*` — de ahí resuelven tanto imports propios como los alias de `components.json` (`@/components`, `@/lib`, `@/components/ui`, `@/hooks`) que usa `shadcn/ui`. Se decidió no migrar a `src/` (ver `docs/SPECS-MAP.md`), así que `ROADMAP.md` ya describe la estructura en la raíz y no hace falta tocar `tsconfig.json` ni `components.json` por esto.
- Tailwind v4 vía `@tailwindcss/postcss` (sin `tailwind.config` separado; ver `postcss.config.mjs`).
- `shadcn/ui` inicializado (`components.json`): estilo `base-vega`, `baseColor` neutral, íconos con `@phosphor-icons/react`, RSC habilitado. El tema (`app/globals.css`) usa la paleta de DevTalles en variables OKLCH (violeta, lavanda, lima; ver `docs/decisiones/0002-sistema-de-diseno-devtalles.md`), con tema claro y oscuro vía `next-themes` (`defaultTheme="dark"`) más `tw-animate-css`; `app/layout.tsx` combina las fuentes Space Grotesk (`--font-heading`) y DM Sans (`--font-sans`) — las mismas que usa cursos.devtalles.com — con Geist Mono (`--font-mono`) vía `next/font/google`, unidas con el helper `cn` (`lib/utils.ts`). La galería completa de tokens, tipografía y ~22 componentes vive en la ruta `/sistema-diseno` (`app/sistema-diseno/`).
- Clientes de Supabase (`@supabase/ssr` 0.12.7) siguiendo el patrón oficial `getAll`/`setAll` (los métodos `get`/`set`/`remove` están deprecados): `lib/supabase/client.ts` para Client Components (`createBrowserClient`, cookies vía `document.cookie` automático) y `lib/supabase/server.ts` para Server Components/Actions (`createServerClient` + `cookies()` de `next/headers`, con el `setAll` envuelto en `try/catch` porque los Server Components no pueden escribir cookies). `proxy.ts` en la raíz (no `middleware.ts`, ver nota de arriba) hace el refresh de sesión en cada request con `supabase.auth.getClaims()` — método recomendado actualmente por sobre `getSession()`/`getUser()` porque valida el JWT contra las claves de firma en vez de confiar ciegamente en la cookie. Variables de entorno en `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la publishable key reemplaza a la legacy `anon` key), `SUPABASE_DB_PASSWORD` (CLI), y dos opcionales: `OPENAI_API_KEY` (personalización del spec 11; sin ella la ruta se genera igual) y `SUPABASE_SECRET_KEY` (hoy la usan los quizzes generados con IA; el spec 13 la elimina). Estos tres archivos se quedan en `lib/supabase/` (no `src/lib/supabase/`): `ROADMAP.md` ya refleja esa ubicación, no hay migración a `src/` planeada.

## Marca y assets

Los assets de marca de DevPathlles viven en `public/` (y `app/` para los iconos), ya optimizados a WebP/PNG comprimido. Un feature nueva usa el asset que le toca de esta tabla en vez de generar o pedir uno nuevo:

| Asset | Qué es | Dónde se usa |
|---|---|---|
| `public/logo.webp` | Lockup completo: mascota + wordmark "DevPathlles" | Cabeceras, hero de la landing (spec 05 `landing`), README, tarjeta OG al compartir (spec 15 `path-sharing`) |
| `public/astronauta.webp` | La mascota sola, recorte cuadrado | Avatares, estados vacíos, ilustraciones pequeñas, pantalla de "generando ruta" (spec 07 `path-generation`) |
| `app/icon.png`, `app/apple-icon.png` | Icono de la app | Los engancha Next por convención de archivo — no se referencian a mano ni van en `metadata.icons` |
| `public/streak/celebration-{1,2,3,4}.webp` | Cuatro poses de celebración de la mascota | Spec 14 `gamification`: paso completado, ruta completada, subida de nivel, insignia nueva |
| `public/streak/reminder.webp` | La mascota con la llama de la racha | Spec 14 `gamification`: racha activa / recordatorio de volver |

Reglas:

- El wordmark de `logo.webp` es blanco y se pierde sobre fondo claro: siempre va envuelto en un contenedor con la clase `bg-logo-backdrop` (token definido en `app/globals.css`, fijo en los dos temas — no usar `dark:` para esto).
- Todo `<Image>` lleva `alt` descriptivo, salvo cuando la imagen es puramente decorativa y el texto equivalente ya está al lado (`alt=""`).
- No se vuelve a meter un PNG sin optimizar en `public/`: mismo patrón que se usó para estos (`sharp`, `trim` del margen transparente, redimensionar al tamaño real de uso, `webp` calidad ~82 salvo iconos que van en PNG con paleta).
- `isotipo.png` y `logotipo.png` (la marca del equipo Code Crafters, no la del producto) ya no están en el repo — no se reintroducen en la app.
