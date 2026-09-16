# Code Quest

Generador de rutas de aprendizaje sobre el catálogo real de cursos de [DevTalles](https://cursos.devtalles.com), hecho para el concurso **Code Quest**.

## Estado actual

| Hecho | Pendiente |
|---|---|
| Scaffold de Next.js 16 (App Router, TypeScript, Tailwind v4) | Cuestionario de habilidades e intereses |
| Catálogo de DevTalles extraído y versionado (`data/`) | Motor de rutas (reglas + personalización con IA) |
| Documentación del proyecto y decisiones (`docs/`) | Login y registro con Discord |
| — | Guardar rutas, marcar progreso, deploy |

El detalle del plan está en [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Requisitos previos

- Node.js **20.9.0 o superior** (lo exige Next.js 16).
- npm.

## Cómo levantarlo

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Otros comandos:

```bash
npm run build   # build de producción
npm run start   # correr un build de producción
npm run lint    # ESLint
```

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
