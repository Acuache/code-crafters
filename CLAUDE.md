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
- `data/` — el catálogo ya extraído: `courses.json` (74 cursos activos, sin Legacy), `programs.json` (las rutas/programas oficiales de DevTalles), `SUMMARY.md` (referencia de los campos de ambos JSON, incluida la procedencia). Se extrajo con un scraper de un solo uso que ya no vive en el repo — si hace falta regenerarlo, se vuelve a escribir.

Al implementar features, revisar primero `ROADMAP.md` + `ANALISIS-IA.md` + `docs/decisiones/` para la arquitectura y el modelo de datos previstos en vez de inventar uno nuevo — nada de eso está implementado todavía, así que no hay código existente que lo contradiga.

## Agentes

Definidos en `.claude/agents/`, con su comando en `.claude/commands/`:

| Agente | Comando | Cuándo usarlo | Herramientas |
|---|---|---|---|
| `devils-advocate` | `/critica <idea>` | Antes de comprometerse con una decisión técnica o de producto. Ataca la idea con los criterios de `ENUNCIADO.md` y el estado real del proyecto — no valida, no propone alternativas más grandes. | Solo lectura: `Read`, `Glob`, `Grep`, `WebSearch`, `WebFetch` (sin `Write`/`Edit`: no puede escribir el registro de la decisión, eso se hace a mano en `docs/decisiones/` una vez decidido). |
| `craft-reviewer` | `/revisa [ruta]` | Después de escribir código, para revisar legibilidad y buenas prácticas (criterio de evaluación #5, ver abajo). Sin ruta, revisa el diff actual. | `Read`, `Edit`, `Glob`, `Grep`, `Bash`, Context7 (sin `Write`: corrige archivos existentes, no crea nuevos). |

## Código limpio y buenas prácticas

Criterio de evaluación #5 del concurso (`docs/ENUNCIADO.md`): *"Código limpio y buenas prácticas: mientras más fácil sea leer y entender el código mucho mejor."*

**Esto no significa que menos código sea mejor.** Un ternario anidado ocupa una línea y es peor que un `if/else` de cinco. La métrica es "se entiende en una sola lectura", no "cuenta de líneas".

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

**Verificar antes de afirmar:** Next.js 16, React 19 y Tailwind v4 son más nuevos que la mayoría de los datos de entrenamiento. Antes de declarar algo "mala práctica" de una de estas librerías, consultar Context7 (`resolve-library-id` → `query-docs`). Una convención no verificada no se aplica.

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
