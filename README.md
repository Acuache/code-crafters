# DevPathlles

Generador de rutas de aprendizaje sobre el catálogo real de cursos de [DevTalles](https://cursos.devtalles.com), hecho para el concurso **Code Quest**.

## Estado actual

| Hecho | Pendiente |
|---|---|
| Next.js 16, Supabase, autenticación y catálogo persistente | Módulos posteriores descritos en el roadmap |
| Cuestionario inicial y generación de rutas por reglas | Deploy y validación de producción |
| Ruta interactiva con progreso persistente | — |
| Quizzes por curso escritos desde el panel, intentos privados y racha diaria | — |

El detalle del plan está en [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Requisitos previos

- Node.js **20.9.0 o superior** (lo exige Next.js 16).
- npm.
- Docker, para Supabase local.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa las variables de Supabase. La clave de OpenAI es opcional: sin ella la ruta se genera y se recorre igual, con quizzes incluidos.

```dotenv
OPENAI_API_KEY=tu_clave_de_openai          # personalización de la ruta con IA
```

Es un secreto exclusivo del servidor: nunca uses el prefijo `NEXT_PUBLIC_` para ella ni la expongas al navegador.

## Cómo levantarlo

```bash
npm install
npx supabase start
npx supabase migration up
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Otros comandos:

```bash
npm run build   # build de producción
npm run start   # correr un build de producción
npm run lint    # ESLint
npm test        # Vitest
npx supabase test db # pruebas pgTAP
```

## Quizzes, progreso y racha

Los quizzes y la racha los diseñó Ariel Tonato. Cómo se integraron con el mapa de la ruta está en [`docs/decisiones/0005-quizzes-y-racha-unificados.md`](docs/decisiones/0005-quizzes-y-racha-unificados.md), y por qué los quizzes pasaron a escribirse desde el panel, sin IA, en [`docs/decisiones/0006-quizzes-de-curso-escritos-por-el-admin.md`](docs/decisiones/0006-quizzes-de-curso-escritos-por-el-admin.md).

- Cada curso tiene un quiz que el admin escribe y edita en `/admin/courses/[slug]/quiz`. Las migraciones traen 3 preguntas básicas para cada uno de los 74 cursos.
- El quiz se abre al instante desde el detalle de cada paso del mapa o desde la lista. Al elegir una opción queda fija y se ve si es correcta, cuál era la correcta y por qué.
- Se aprueba con el porcentaje de cada quiz (60 % por defecto). Aprobar marca el curso como hecho; también se puede marcar a mano con el selector de estado.
- Al entregar, Postgres vuelve a corregir y guarda el intento. Los intentos y el progreso son privados mediante RLS; los quizzes los lee cualquier usuario con sesión y solo los escribe el admin.
- La racha suma como máximo un día por fecha local (zona del navegador) al aprobar un quiz o al pasar un paso a "En curso" o "Hecho".

## Estructura del repo

- `app/` — la aplicación Next.js (App Router).
- `docs/` — requisitos del concurso, roadmap e historial de decisiones.
- `data/` — catálogo de cursos y programas de DevTalles, ya extraído.
- `.claude/` — agentes y comandos de Claude Code para este proyecto.

## El catálogo de cursos

`data/courses.json` tiene **74 cursos activos** de DevTalles (los cursos "Legacy" quedan fuera) y `data/programs.json` tiene sus **15 rutas oficiales**. El detalle de los campos y la procedencia están en [`data/SUMMARY.md`](data/SUMMARY.md). Se extrajo con un scraper de un solo uso que ya cumplió su función y no se conservó en el repo.

## Documentación

- [`docs/ENUNCIADO.md`](docs/ENUNCIADO.md) — requisitos oficiales del concurso.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — plan de desarrollo.
- [`docs/decisiones/`](docs/decisiones/) — historial de decisiones de arquitectura y producto.

## Cómo trabajamos

- `main` es producción, `develop` es integración.
- Cada tarea en una rama `feature/<tarea>`.
- Todo entra a `develop` por PR con al menos una revisión.
- Commits con formato convencional.

## Licencia

MIT. El archivo `LICENSE` se agrega antes de la entrega final.
