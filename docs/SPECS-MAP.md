# Mapa de specs (SDD)

Orden acordado de los specs de Code Quest para el flujo `/spec` / `/spec-impl` (ver la sección
"Metodología: Spec-Driven Development (SDD)" de `CLAUDE.md`). **Este documento no crea specs** — los
specs los crea el usuario con `/spec`; este archivo solo fija el orden, las dependencias y qué decisión
pendiente cierra cada uno, para que la numeración y las referencias `**Depende de:**` queden
consistentes entre sí.

Decisiones de base para todo el mapa:

- El código vive en la raíz del repo (`app/`, `components/`, `lib/`, `proxy.ts`), no en `src/`. No hay
  spec de migración a `src/`.
- Granularidad fina: un spec por entregable, 13 en total.
- Rama única `master`. Cada spec sale de `master` y vuelve ahí como `spec-NN-slug`
  (`specs/.spec-config.yml` con `AutoCreateBranch: true`, el default que crea el primer `/spec`).

---

## 1. Tabla de specs

| NN | Slug (archivo `specs/NN-slug.md`) | Objetivo en una frase | Depende de | Hito |
|---|---|---|---|---|
| 01 | `catalog-enrichment` | Script que añade `level` y `outcome` a los 74 cursos y deja `data/courses.enriched.json` revisado a mano en el repo | — | Semana 1 |
| 02 | `supabase-schema` | Migraciones, RLS, trigger de `profiles` y seed del catálogo enriquecido | 01 (solo el paso de seed) | Semana 1 |
| 03 | `discord-auth` | Login y logout con Discord de punta a punta, sesión refrescada en `proxy.ts` y deploy en Vercel | 02 | Semana 1 |
| 04 | `path-engine` | `lib/paths/build-path.ts`: función pura que arma la ruta con presupuesto de horas y procedencia por paso | 01 | Semana 1 |
| 05 | `assessment-quiz` | Cuestionario multi-step validado con zod que guarda el `assessment` | 02, 03, 04 | Semana 1 |
| 06 | `path-generation` | Server action que corre el motor, persiste `learning_paths` + `path_steps` y redirige a `/paths/[id]` | 02, 04, 05 | Semana 1 |
| 07 | `path-progress-view` | Vista de la ruta en lista con chips de procedencia y cambio de estado de cada paso | 06 | Semana 1 |
| 08 | `paths-dashboard` | Dashboard con todas mis rutas, su progreso y el acceso a crear otra | 07 | **Hito 1** |
| 09 | `ai-personalization` | Capa 2: título, resumen y razones escritas por IA sobre la ruta ya guardada, con límite diario | 06 | Semana 2 |
| 10 | `visual-path-map` | Mapa de la ruta con React Flow + dagre y panel de detalle por nodo | 07 | Semana 2 |
| 11 | `gamification` | XP por curso, niveles, insignias, racha y celebración al completar | 07 | Semana 2 |
| 12 | `path-sharing` | Ruta pública en `/r/[slug]` con tarjeta OG para pegar en Discord | 07 | Semana 2 |
| 13 | `path-recalculation` | Recalcular la ruta con el progreso actual (COULD, primero en recortarse) | 07, 09 | Semana 2 |

Ramas resultantes: `spec-01-catalog-enrichment`, `spec-02-supabase-schema`, … (las deriva `/spec-impl`
del nombre del archivo).

## 2. Grafo de dependencias

```
01 catalog-enrichment
 ├─► 02 supabase-schema ──► 03 discord-auth ──┐
 │                                            │
 └─► 04 path-engine ───────────┬──────────────┘
                               │
                               ▼
                       05 assessment-quiz
                               │
                               ▼
                       06 path-generation        (02 + 04 + 05)
                               │
                               ▼
                       07 path-progress-view ──► 08 paths-dashboard   ◄── HITO 1
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
 10 visual-path-map     11 gamification        12 path-sharing

 09 ai-personalization  (depende de 06)
 13 path-recalculation  (depende de 07 + 09)   ← COULD
```

**Camino crítico:** 01 → 02 → 03 → 05 → 06 → 07 → 08. Todo lo demás cuelga de ahí.

**Qué corre en paralelo:** 04 con 02/03 (el motor es una función pura sobre `data/`, no toca la DB); y
09, 10, 11, 12 entre sí una vez cerrado el 07.

**Dos puntos de sincronización que hay que escribir dentro de los specs, no descubrirlos después:**

- **02 depende de 01 solo en su último paso.** Las migraciones, RLS y el trigger no necesitan el
  catálogo enriquecido; el seed sí. El plan del 02 debe dejar el seed como paso final para que el 02
  pueda arrancar el día 1 sin esperar a que el 01 esté cerrado.
- **05 depende de 04 solo por el contrato del perfil.** El primer paso del plan del 04 es definir
  `lib/paths/types.ts` (el tipo de las respuestas del cuestionario, la lista cerrada de metas, las 11
  tecnologías y la tabla `meta → programas`). En cuanto ese paso está commiteado, el 05 puede empezar
  sin esperar al presupuesto de horas. El contrato vive en el 04, no en el 05, porque las decisiones que
  lo forman son del motor (ADR 0001), no de la UI.

## 3. Reglas de concordancia

1. **Se escriben en el orden del mapa.** `/spec` numera con el mayor existente + 1, así que el orden de
   creación fija los números. Crear el 07 antes que el 06 desalinea todo el mapa.
2. **Nunca un `Depende de:` hacia adelante.** El skill verifica que el spec referenciado exista en
   `specs/` y avisa si no. Si hace falta una dependencia que aún no existe, es señal de que el orden del
   mapa está mal, no de que haya que escribir la referencia igual.
3. **Por olas, no los 13 de golpe.** Ola 1 (01→08) antes de arrancar la semana 1; ola 2 (09→13) al
   cerrar el Hito 1, ya con lo aprendido implementando. Un spec escrito hoy para el día 11 se
   desactualiza antes de usarse.
4. **Idioma:** contenido en español, nombre de archivo y slug en inglés. Estados en español —
   `Borrador` / `En revisión` / `Aprobado` / `Implementado` / `Obsoleto` — y títulos de sección en
   español (`Alcance`, `Modelo de datos`, `Plan de implementación`, `Criterios de aceptación`,
   `Decisiones`, `Riesgos`, `Qué NO entra`). El **spec 01 fija la convención**: `/spec` lee los dos
   specs más recientes para copiar el formato, así que lo que quede ahí se propaga solo.
5. **Cada archivo pertenece a un solo spec.** Dos specs no editan el mismo archivo en ramas distintas.
   El 04 es dueño de `lib/paths/*`, el 05 de `components/quiz/*`, el 07 de `app/(app)/paths/[id]/*`,
   etc. Cada spec declara en su alcance los archivos que toca.
6. **Migraciones nuevas solo en 02, 09, 11 y 12**, y esos cuatro no se implementan en paralelo entre sí:
   el orden de los archivos de migración depende del orden de merge, y ramas simultáneas lo rompen. El
   02 crea el esquema base; 09, 11 y 12 añaden cada uno sus columnas o tablas para poder recortarse sin
   dejar tablas muertas.
7. **Antes de cada `/spec-impl`:** estar en `master`, con el árbol limpio y actualizado. La fase 3 del
   skill se detiene si `git status` no está vacío.
8. **Lo que aparezca fuera de alcance durante un `/spec-impl` va al spec que le toca según el mapa**, no
   a la rama actual. Si no le toca a ninguno, es un spec nuevo al final de la numeración.

## 4. Decisiones abiertas, asignadas al spec que las cierra

Las que siguen sin marcar en `docs/investigacion/ANALISIS-IA.md` §11 y en las consecuencias del ADR
0001. Cada una se resuelve en la fase de preguntas del spec indicado, no antes:

| Decisión pendiente | La cierra |
|---|---|
| Quién revisa el enriquecimiento de los 74 cursos y cuándo | 01 |
| Qué preguntas tiene el cuestionario (máx. 6–8, una sola de texto libre) | 05, con el contrato definido en 04 |
| Tabla `meta → programas` para metas fullstack | 04 |
| Cómo se resuelven los 9 cursos que cambian de `level` según el programa (ADR 0001) | 04 |
| Qué se hace cuando la ruta no cabe en el presupuesto (orden de recorte) | 04 |
| Límite diario de personalizaciones por usuario (sugerido: 5) | 09 |
| Mini-quiz de re-evaluación vs. "Recalcular mi ruta" (recomendado: recalcular) | 13 |
| Ocultar un interés cuyo curso de respaldo ya está entre las tecnologías dominadas (ej. Vue + "ya domino Node" vs. chip "Backend con Node") | 04 |
| Qué se muestra en el paso de intereses cuando el programa solo tiene 1 curso opcional real (7 de 18 combinaciones de stack de la maqueta: `php`, `go`, `vue`, `java`, `csharp`, `python`, `dotnet-blazor`) | 05 |
| Vencimiento de los créditos de OpenAI y dueño de la key | Ninguno — es gestión, no spec |

## 5. Qué NO pasa por SDD

README, `LICENSE` MIT, `.env.example`, capturas, guion y grabación del video, QA final del día 12 y
correcciones de una línea. Son trabajo de entrega, no features; van directo a `master` con commit
convencional.

## 6. Insumos que ya existen y cada spec debe reusar (no reinventar)

- `data/courses.json`, `data/programs.json`, `data/SUMMARY.md` — catálogo ya extraído (74 cursos, 13
  programas con `stage`/`level`/`note`/`courses`). Entrada de los specs 01, 02 y 04.
- `components/ui/*` (22 componentes shadcn), `components/brand/*` y `components/theme-*` — sistema de
  diseño ya construido, documentado en `/sistema-diseno` y en el ADR 0002. Entrada de 05, 07, 08, 10.
- `components/gamification/xp-bar.tsx` — **ya existe**; el spec 11 lo conecta, no lo crea.
- `lib/supabase/{client,server}.ts` y `proxy.ts` — clientes SSR ya escritos con `getAll`/`setAll` y
  refresh con `getClaims()`. Entrada del 03; el 03 añade login/callback, no reescribe esto.
- `docs/maquetas/0001-motor-de-reglas-con-ia-encima/` — maqueta HTML del cuestionario y de la pantalla
  de ruta con sus tres estados (cargando, con IA, sin key). Entrada visual de 05, 06 y 07.
- `docs/decisiones/0001-*.md` — el diseño de dos capas y el presupuesto de horas ya están decididos; el
  spec 04 los implementa, no los rediscute.
