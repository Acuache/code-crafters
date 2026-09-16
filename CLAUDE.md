# CLAUDE.md

Este archivo da contexto a Claude Code (claude.ai/code) para trabajar en este repositorio.

@AGENTS.md

> Nota: `AGENTS.md` está en inglés porque lo genera y reescribe automáticamente `next dev` (ver `node_modules/next/dist/server/lib/generate-agent-files.js`). No lo traduzcas ni lo edites a mano.

## Estado del proyecto

Este repo es por ahora un scaffold de `create-next-app` sin modificar (`app/page.tsx` y `app/layout.tsx` siguen siendo la plantilla por defecto). La aplicación real — **Code Quest**, un generador de rutas de aprendizaje sobre el catálogo de cursos de DevTalles — todavía no está construida. La planificación, los requisitos y la investigación viven en `docs/` y `data/` (contexto de proyecto real, no un scratchpad descartable):

- `docs/ENUNCIADO.md` — los requisitos oficiales del concurso. Cualquier feature debe cumplirlos.
- `docs/ROADMAP.md` — el plan MVP detallado: modelo de datos, estructura de carpetas (`src/app` con route groups, `src/lib/{supabase,ai,paths,gamification}`), cronograma día a día y el stack elegido (Next.js 16 App Router, Tailwind v4 + shadcn/ui, Supabase para auth/DB con Discord OAuth, Vercel AI SDK, React Flow para el mapa de la ruta).
- `docs/decisiones/` — historial de decisiones (formato ADR: contexto, opciones, decisión, consecuencias). `README.md` es el índice; `0000-plantilla.md` es el formato a copiar para una decisión nueva. Antes de proponer un cambio de arquitectura importante, revisar aquí si ya se debatió.
- `docs/investigacion/ANALISIS-IA.md` — reemplaza una decisión clave del roadmap: en vez de "la IA arma toda la ruta", recomienda un enfoque **híbrido**: un motor por reglas sobre los programas oficiales de DevTalles siempre genera una ruta funcional, y la IA solo personaliza encima (explica elecciones, cambia cursos opcionales, interpreta metas en texto libre). Esto existe para que la app funcione aunque falte o se agote la key de OpenAI — necesario porque, según `ENUNCIADO.md`, un proyecto que no funcione al clonarlo descalifica al equipo.
- `docs/investigacion/opcion-c.html` — demo interactiva en HTML del enfoque híbrido (reglas + IA); se abre directo en el navegador.
- `docs/investigacion/ideas-vagas.md` — notas iniciales sueltas (concurso de 18 equipos, 2 semanas de plazo, $10 de crédito de OpenAI).
- `data/` — el catálogo ya extraído: `courses.json` (74 cursos activos, sin Legacy), `programs.json` (las rutas/programas oficiales de DevTalles), `SUMMARY.md` (referencia de los campos de ambos JSON). Se regenera con `scripts/scrape-devtalles.mjs` (scraper con cheerio; cachea el HTML descargado en `.cache-devtalles/`).

Al implementar features, revisar primero `ROADMAP.md` + `ANALISIS-IA.md` + `docs/decisiones/` para la arquitectura y el modelo de datos previstos en vez de inventar uno nuevo — nada de eso está implementado todavía, así que no hay código existente que lo contradiga.

## Antes de decisiones importantes

Para debatir una decisión técnica o de producto antes de comprometerse con ella, usar el agente `devils-advocate` (vía `/critica <idea>`). Es de solo lectura por diseño: su trabajo es atacar la idea con los criterios de `ENUNCIADO.md` y el estado real del proyecto, no validarla. Cuando el usuario decida, el registro de la decisión se escribe a mano en `docs/decisiones/` — el agente no escribe ahí.

## Comandos

- `npm run dev` — levanta el servidor de desarrollo de Next.js (también regenera el bloque de reglas para agentes en `AGENTS.md` en cada corrida — ver la nota de arriba).
- `npm run build` — build de producción.
- `npm run start` — corre un build de producción.
- `npm run lint` — ESLint vía `eslint-config-next` (reglas core-web-vitals + TypeScript), flat config en `eslint.config.mjs`.
- Todavía no hay un test runner configurado.

## Notas de arquitectura

- Next.js **16.3.5** con React **19.2.8** — una versión más nueva que la mayoría de los datos de entrenamiento. Según `AGENTS.md`, hay que leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código relacionado con el framework (routing, middleware, data fetching, etc.), porque las convenciones pueden haber cambiado (por ejemplo, `middleware.ts` ahora es `proxy.ts`).
- Alias de TypeScript: `@/*` apunta a la raíz del repo (`tsconfig.json`), no a `src/*` — ojo que la arquitectura planeada en `ROADMAP.md` asume una estructura `src/`, así que este alias va a necesitar actualizarse si/cuando se haga esa reestructuración.
- Tailwind v4 vía `@tailwindcss/postcss` (sin `tailwind.config` separado; ver `postcss.config.mjs`).
- El estilo actual usa las fuentes Geist cargadas con `next/font/google` en `app/layout.tsx`.
