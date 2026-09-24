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

Copiá `.env.example` a `.env.local` y completá las variables de Supabase. Las dos claves de IA son opcionales: sin ellas la ruta se genera y se recorre igual.

```dotenv
OPENAI_API_KEY=tu_clave_de_openai          # personalización de la ruta y quizzes
SUPABASE_SECRET_KEY=tu_clave_secreta       # guardar los quizzes compartidos
```

Las dos son secretos exclusivos del servidor: nunca uses el prefijo `NEXT_PUBLIC_` para ellas ni las expongas al navegador. Sin alguna de las dos, los botones de quiz no aparecen.

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

Los quizzes y la racha los diseñó Ariel Tonato; cómo se integraron con el mapa de la ruta está en [`docs/decisiones/0005-quizzes-y-racha-unificados.md`](docs/decisiones/0005-quizzes-y-racha-unificados.md).

- Desde el detalle de cada paso del mapa: un quiz de 10 preguntas del curso y una práctica de 3 preguntas por capítulo, generados con OpenAI.
- Un quiz generado se reutiliza entre todos los usuarios para el mismo curso o capítulo; los intentos, resultados y progreso son privados mediante RLS.
- Se aprueba con 60 %. Aprobar el quiz del curso lo marca como hecho; también se puede marcar a mano con el selector de estado.
- La corrección por pregunta se ve recién al entregar, calculada en Postgres.
- La racha suma como máximo un día por fecha local (zona del navegador) al aprobar un quiz o al pasar un paso a "En curso" o "Hecho".
- Si falta una clave o OpenAI falla, la ruta sigue funcionando y el diálogo permite reintentar.

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
