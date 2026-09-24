# DevPathlles

Generador de rutas de aprendizaje sobre el catálogo real de cursos de [DevTalles](https://cursos.devtalles.com), hecho para el concurso **Code Quest**.

## Estado actual

| Hecho | Pendiente |
|---|---|
| Next.js 16, Supabase, autenticación y catálogo persistente | Módulos posteriores descritos en el roadmap |
| Cuestionario inicial y generación de rutas por reglas | Deploy y validación de producción |
| Ruta interactiva con progreso persistente | — |
| Quizzes compartidos, intentos privados y racha diaria | — |

El detalle del plan está en [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Requisitos previos

- Node.js **20.9.0 o superior** (lo exige Next.js 16).
- npm.
- Docker, para Supabase local.

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá las variables de Supabase. Para generar quizzes también necesitás:

```dotenv
OPENROUTER_API_KEY=tu_clave_de_servidor
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
SUPABASE_SECRET_KEY=tu_clave_secreta_de_supabase
```

`OPENROUTER_MODEL` es opcional y usa `google/gemma-4-26b-a4b-it:free` por defecto porque admite salida estructurada. Si ese endpoint está limitado, OpenRouter intenta otro modelo gratuito compatible y aplica reparación de JSON antes de la validación Zod. La disponibilidad y los límites de los modelos gratuitos dependen de OpenRouter. `OPENROUTER_API_KEY` y `SUPABASE_SECRET_KEY` son secretos exclusivos del servidor: nunca uses el prefijo `NEXT_PUBLIC_` para ellos ni los expongas al navegador.

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

- Cada curso tiene una evaluación de 10 preguntas y cada capítulo una práctica de 3 preguntas.
- Un quiz generado se reutiliza entre todos los usuarios para el mismo curso o capítulo; los intentos, resultados y progreso siguen siendo privados mediante RLS.
- Se aprueba con 60%. Aprobar un capítulo registra actividad, pero solo aprobar el quiz de curso completa el paso y desbloquea el siguiente.
- La racha suma como máximo una vez por fecha local, usando la zona IANA del navegador. El servidor deriva la fecha efectiva y no confía en una fecha enviada por el cliente.
- Si falta `OPENROUTER_API_KEY` o el proveedor falla, la ruta permanece disponible y el diálogo permite reintentar sin alterar el progreso.

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
