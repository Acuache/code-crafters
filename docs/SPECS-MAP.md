# Mapa de specs (SDD)

Orden acordado de los specs de DevPathlles para el flujo `/spec` / `/spec-impl` (ver la sección
"Metodología: Spec-Driven Development (SDD)" de `CLAUDE.md`). **Este documento no crea specs** — los
specs los crea el usuario con `/spec`; este archivo solo fija el orden, las dependencias y qué decisión
pendiente cierra cada uno, para que la numeración y las referencias `**Depende de:**` queden
consistentes entre sí.

Decisiones de base para todo el mapa:

- El código vive en la raíz del repo (`app/`, `components/`, `lib/`, `proxy.ts`), no en `src/`. No hay
  spec de migración a `src/`.
- Granularidad fina: un spec por entregable, 16 en total.
- Rama única `master`. Cada spec sale de `master` y vuelve ahí como `spec-NN-slug`
  (`specs/.spec-config.yml` con `AutoCreateBranch: true`, el default que crea el primer `/spec`).
- **Dos roles: `user` y `admin`.** `ENUNCIADO.md` pide que la app "permita la adición de nuevas
  características en el futuro para brindar más opciones a los miembros de la comunidad" — se
  interpreta como que un administrador debe poder dar de alta un curso nuevo de DevTalles sin tocar
  código ni SQL a mano.
- **El admin gestiona cursos y su ubicación en programas, no solo cursos sueltos.** El motor de reglas
  arma la ruta a partir de los programas oficiales, no del catálogo suelto: un curso que no cuelga de
  ningún programa no puede aparecer nunca en una ruta generada — ya pasa hoy con `qwik-introduccion` y
  `go-microservicios`, que están en el catálogo pero en ningún programa. Un CRUD de solo cursos sería
  decorativo.
- **Los programas pasan a la base de datos.** `programs` y `program_courses` (el vínculo curso↔programa,
  con `stage`/`level`/`position`/`note`) nacen como tablas nuevas; `data/programs.json` queda como
  insumo del seed inicial, no como fuente de verdad en runtime, porque es en la base de datos donde
  escribe el admin.
- **El panel de administración se agenda después del Hito 1 (semana 2), no en la semana 1.** Es un
  requisito interpretado de la descripción de la quest, no uno de los 5 numerados en `ENUNCIADO.md`; el
  camino crítico (login → cuestionario → ruta → guardar → progreso) manda primero.

> ⚠️ `docs/ROADMAP.md` todavía no refleja que el panel de administración se agenda después del Hito 1
> en vez de quedar fuera del MVP: sigue listándolo en WON'T. Su modelo de datos ya incluye `role` y
> `programs`/`program_courses` desde el spec 02. Para el alcance y el orden de los specs manda este
> archivo.

---

## 1. Tabla de specs

| NN | Slug (archivo `specs/NN-slug.md`) | Objetivo en una frase | Depende de | Hito |
|---|---|---|---|---|
| 01 | `catalog-enrichment` | El agente añade `difficulty` y `outcome` a los 74 cursos, leyendo el catálogo, y deja `data/courses.enriched.json` revisado a mano en el repo | — | Semana 1 |
| 02 | `supabase-schema` | Migraciones, RLS, trigger de `profiles` (con `role`), tablas `programs`/`program_courses` (15 rutas oficiales), un lugar en `path_steps` para el curso que el motor o el usuario descartan (con motivo), y seed del catálogo enriquecido | 01 (solo el paso de seed) | Semana 1 |
| 03 | `discord-auth` | Login y logout con Discord de punta a punta, rol en sesión, sesión refrescada en `proxy.ts` y deploy en Vercel | 02 | Semana 1 |
| 04 | `path-engine` | `lib/paths/build-path.ts` + `lib/paths/interests.ts`: función pura que arma la ruta con presupuesto de horas, intereses transversales al catálogo y procedencia por paso, recibiendo catálogo y programas por parámetro | 02 | Semana 1 |
| 05 | `landing` | Página pública `app/(marketing)/page.tsx`: un recorrido "Cómo funciona" que se anima con el scroll (la mascota viaja de estación en estación: cuestionario, motor, IA, progreso y compartir), hero con easter egg, preguntas frecuentes y tarjeta OG | 03, 04, 12, 14, 15 (solo reusa piezas) | Semana 2 |
| 06 | `assessment-quiz` | Cuestionario multi-step validado con zod que guarda el `assessment` | 02, 03, 04 | Semana 1 |
| 07 | `path-generation` | Server action que corre el motor, persiste `learning_paths` + `path_steps` y redirige a `/paths/[id]` | 02, 04, 06 | Semana 1 |
| 08 | `path-progress-view` | Vista de la ruta en lista con chips de procedencia, acordeón "Qué quitamos y por qué", cambio de estado de cada paso y botón para descartar un paso pendiente (con deshacer) | 07 | Semana 1 |
| 09 | `paths-dashboard` | Dashboard con todas mis rutas, su progreso y el acceso a crear otra | 08 | **Hito 1** |
| 10 | `admin-catalog` | Panel `/admin`: CRUD de cursos y de su ubicación en programas, protegido por rol `admin` | 02, 03 | Semana 2 |
| 11 | `ai-personalization` | Capa 2: título, resumen y razones escritas por IA sobre la ruta ya guardada, con límite diario | 07 | Semana 2 |
| 12 | `visual-path-map` | Mapa de la ruta en zigzag estilo Duolingo (CSS + SVG, sin React Flow), por defecto en `/paths/[id]`, con modal de detalle por nodo | 08, 09 | Semana 2 |
| 13 | `course-quizzes` | Un quiz por curso escrito por el admin desde `/admin` (sin IA), con 3 preguntas de ejemplo por curso, feedback al instante, y aprobarlo marca el paso como hecho y suma racha (ADR 0005) | 08, 10, 12 | Semana 2 |
| 14 | `gamification` | XP por curso (10 por hora), niveles, 6 insignias como medallas en `/profile`, resumen en el dashboard y celebración (toast o modal con confetti) al completar; "Hecho" exige aprobar el quiz del curso (ADR 0007) | 02, 03, 08, 09, 12, 13 | Semana 2 |
| 15 | `path-sharing` | Ruta pública en `/shared/[slug]` con tarjeta OG para pegar en Discord, y "Hacer esta ruta": con sesión, otra persona la copia a su cuenta con el progreso en cero | 02, 03, 08, 11, 12, 14 | Semana 2 |
| 16 | `path-recalculation` | Botón "Ajustar mi ruta": cuestionario prellenado con las respuestas anteriores; con IA, un texto libre se traduce a cambios de chips (nunca de cursos) antes de confirmar; sin IA, se editan los chips a mano. Genera una ruta nueva, no pisa la anterior (COULD, primero en recortarse) | 08, 11 | Semana 2 |

Ramas resultantes: `spec-01-catalog-enrichment`, `spec-02-supabase-schema`, … (las deriva `/spec-impl`
del nombre del archivo).

## 2. Grafo de dependencias

```
01 catalog-enrichment
 └─► 02 supabase-schema ──┬─► 03 discord-auth ───┐
                          │                      │
                          └─► 04 path-engine ────┤
                                                 │
                                                 ▼
                                         06 assessment-quiz
                                                 │
                                                 ▼
                                         07 path-generation        (02 + 04 + 06)
                                                 │
                                                 ▼
                                         08 path-progress-view ──► 09 paths-dashboard   ◄── HITO 1
                                                 │
                ┌────────────────────────────────┼───────────────────────┐
                ▼                                ▼                       ▼
         12 visual-path-map ──► 13 course-quizzes ──► 14 gamification ──► 15 path-sharing

 05 landing             (se escribió al final: reusa piezas de 03, 04, 12, 14 y 15, no bloquea a nadie)
 10 admin-catalog       (depende de 02 + 03; agendado después del Hito 1)
 11 ai-personalization  (depende de 07)
 13 course-quizzes      (también depende de 10: el editor vive en /admin)
 16 path-recalculation  (depende de 08 + 11)   ← COULD
```

**Camino crítico:** 01 → 02 → 03 → 06 → 07 → 08 → 09. Todo lo demás cuelga de ahí.

**Qué corre en paralelo:** 04 con 03 (el motor es una función pura, no toca la DB; solo necesita el
vocabulario de 15 `programs.slug` que fija el 02, no sus migraciones ni su RLS); 05 con cualquiera de
los anteriores (no depende de nada); y 11 y 12 entre sí una vez cerrado el 08 (13 va después de 12,
14 después de 13, y 15 después de 11 y 14: copia los textos de la IA y cambia cómo cuenta "Explorador").

**Tres puntos de sincronización que hay que escribir dentro de los specs, no descubrirlos después:**

- **02 depende de 01 solo en su último paso.** Las migraciones, RLS y el trigger no necesitan el
  catálogo enriquecido; el seed sí. El plan del 02 debe dejar el seed como paso final para que el 02
  pueda arrancar el día 1 sin esperar a que el 01 esté cerrado.
- **06 depende de 04 solo por el contrato del perfil.** El primer paso del plan del 04 es definir
  `lib/paths/types.ts` (el tipo de las respuestas del cuestionario, la lista cerrada de metas, las 15
  tecnologías y la tabla `meta → programas`). En cuanto ese paso está commiteado, el 06 puede empezar
  sin esperar al presupuesto de horas. El contrato vive en el 04, no en el 06, porque las decisiones que
  lo forman son del motor (ADR 0001), no de la UI.
- **10 depende de 02 y 03 solo por el esquema y la sesión, no por el calendario.** Técnicamente podría
  escribirse tan pronto el 02 (tablas + RLS de escritura) y el 03 (rol en sesión) estén mergeados, en
  paralelo con la semana 1. El mapa lo agenda igual después del Hito 1 porque responde a un requisito
  interpretado del enunciado, no a uno de los 5 numerados — es una decisión de prioridad, no una
  dependencia técnica que falte.

## 3. Reglas de concordancia

1. **Se escriben en el orden del mapa.** `/spec` numera con el mayor existente + 1, así que el orden de
   creación fija los números. Crear el 08 antes que el 07 desalinea todo el mapa.
2. **Nunca un `Depende de:` hacia adelante.** El skill verifica que el spec referenciado exista en
   `specs/` y avisa si no. Si hace falta una dependencia que aún no existe, es señal de que el orden del
   mapa está mal, no de que haya que escribir la referencia igual.
3. **Por olas, no los 15 de golpe.** Ola 1 (01→09) antes de arrancar la semana 1; ola 2 (10→15) al
   cerrar el Hito 1, ya con lo aprendido implementando. Un spec escrito hoy para el día 11 se
   desactualiza antes de usarse.
4. **Idioma:** contenido en español, nombre de archivo y slug en inglés. Estados en español —
   `Borrador` / `En revisión` / `Aprobado` / `Implementado` / `Obsoleto` — y títulos de sección en
   español (`Alcance`, `Modelo de datos`, `Plan de implementación`, `Criterios de aceptación`,
   `Decisiones`, `Riesgos`, `Qué NO entra`). El **spec 01 fija la convención**: `/spec` lee los dos
   specs más recientes para copiar el formato, así que lo que quede ahí se propaga solo.
5. **Cada archivo pertenece a un solo spec.** Dos specs no editan el mismo archivo en ramas distintas.
   El 03 es dueño de `app/login/*`, `app/auth/callback/route.ts` y `lib/supabase/{actions,guards}.ts`
   (su placeholder `app/dashboard/page.tsx` ya no existe: el 09 lo movió y lo reescribió); el 04 es dueño
   de `lib/paths/*` (incluye `interests.ts`, la tabla de intereses transversales al catálogo — no vive
   en `data/` ni en `components/quiz/*`), el 05 de `app/(marketing)/*`, `components/landing/*`,
   `lib/landing/*` y `public/code-quest.webp`, el 06 de `components/quiz/*` y
   `app/(app)/quiz/*`, el 07 de `lib/catalog/*` y de `app/(app)/paths/` en su raíz (`actions.ts`) y,
   **temporalmente**, de `app/(app)/paths/[id]/*` (placeholder mínimo de sólo lectura: título, resumen y
   la lista de cursos vigentes, sin chips de procedencia ni acordeón de descartes), el 08 de
   `app/(app)/paths/[id]/*` (reescribe ese placeholder y agrega `actions.ts`), de `lib/progress/*`
   (el cálculo de progreso por horas que reusa el 09) y de `components/paths/{path-steps-view,
   budget-card,step-row,step-status-toggle,discarded-steps}.tsx` (`components/paths/generating-path.tsx`
   sigue siendo del 07; `step-status-toggle.tsx` lo reusa el 12 sin reescribirlo), el 09 de
   `app/(app)/dashboard/*`, `components/dashboard/*` y `lib/progress/next-step{,.test}.ts` (archivo
   propio dentro de la carpeta del 08: `findNextStep`, el "próximo curso" de una ruta), el 10 de
   `app/(admin)/*`, `components/admin/*`, `lib/admin/*` y `components/ui/checkbox.tsx` (primitiva de
   shadcn agregada por el 10), el 11 de `lib/ai/*` y `components/ai/*`, el 12 de `lib/path-map/*` y
   `components/paths/{path-map,path-map-node,step-detail-dialog}.tsx`, etc. Cada spec declara en su alcance los archivos que toca.
   **Excepción explícita a la propiedad temporal (dashboard), ya resuelta:** el spec 09
   (`paths-dashboard`) movió el placeholder `app/dashboard/page.tsx` del spec 03 a
   `app/(app)/dashboard/page.tsx` como primer paso de su plan y después lo reescribió; nunca
   coexistieron dos archivos que resuelvan `/dashboard`. **Excepción explícita a la propiedad
   temporal (`/paths/[id]`):** el spec 08 (`path-progress-view`), al construir la vista real (chips de
   procedencia, acordeón "Qué quitamos y por qué", cambio de estado), reescribe entero el placeholder de
   `app/(app)/paths/[id]/page.tsx` que dejó el spec 07 — mismo precedente que 03→09, no crea un archivo
   al lado del anterior. **Excepción explícita al link del dashboard:** el spec 06 agrega el
   botón "Crear mi ruta" en el `app/dashboard/page.tsx` del spec 03 — si no, `/quiz` solo se puede
   probar tecleando la URL a mano, y el concurso evalúa navegando la app desplegada. Fue barata porque
   el spec 09 reescribió ese archivo entero (hoy el acceso es "Crear nueva ruta" en el dashboard).
   **Excepción explícita al link del panel:** el spec 10 agrega en `app/(app)/dashboard/page.tsx`
   (del 09) solo el botón "Panel de administración", visible para `role = 'admin'` — el 09 lo dejó
   fuera de su alcance esperando al 10, y el jurado evalúa navegando la app, no tecleando `/admin`.
   **Excepciones explícitas del spec 11 (IA):** en `app/(app)/paths/actions.ts` (del 07), el ajuste de
   respuestas con IA justo antes de `buildPath()` y la columna `ai_adjustments` en el insert; en
   `app/(app)/paths/[id]/page.tsx` (del 08), la lectura de las columnas `ai_*`, el `AiBadge`, el
   aviso de ajustes y la personalización automática; en `app/(app)/dashboard/page.tsx` (del 09),
   mostrar `ai_title ?? title`; en `components/quiz/steps/free-text-step.tsx` (del 06), solo el texto
   de ayuda; y en `components/quiz/quiz-form.tsx` (del 06), una `key` distinta en los botones
   "Siguiente"/"Guardar" — bug del 06 que salteaba el paso de texto libre, encontrado al implementar
   el 11.
   **Excepciones explícitas del spec 12 (mapa):** en `components/paths/path-steps-view.tsx` (del 08),
   las pestañas "Mapa"/"Lista", el paso seleccionado, el modal de detalle, `isInterestGroup` en
   `StepGroup` y cerrar el modal al marcar "Hecho"; en `app/(app)/paths/[id]/page.tsx` (del 08), leer
   `searchParams.vista`; y en `app/globals.css`, solo el token `--animate-step-pop`.
   **Excepciones explícitas del spec 13 (quizzes de curso):** es dueño de `lib/quizzes/*`,
   `components/quizzes/*`, `components/admin/quiz-form.tsx`, `app/(admin)/admin/courses/[slug]/quiz/*`
   y `data/quizzes.json`. Fuera de eso, en `app/(app)/paths/[id]/page.tsx` y `actions.ts` (del 08),
   cargar los quizzes activos con la página y sacar `requestQuiz`; en
   `components/paths/{path-step,step-row,path-steps-list,path-steps-view}.ts(x)` (del 08) y
   `step-detail-dialog.tsx` (del 12), el campo `quiz` del paso y el botón "Rendir quiz del curso"; y en
   el panel del 10, las actions `saveCourseQuiz`/`setCourseQuizActive` en
   `app/(admin)/admin/courses/actions.ts`, la tarjeta "Quiz" de la edición del curso, la columna "Quiz"
   de `components/admin/courses-table.tsx` y el mensaje de `quizzes_course_id_key` en
   `lib/admin/postgres-errors.ts`.
   **Excepciones explícitas del spec 14 (gamificación):** es dueño de
   `lib/gamification/{xp,achievements,summary,load-gamification}` (con sus tests),
   `components/gamification/{streak-indicator,achievement-grid,celebration-dialog,celebrate,use-celebration}`
   y `app/(app)/profile/*`; `xp-bar.tsx`, `streak.ts` y `streak-card.tsx` se usan sin cambios. Fuera
   de eso, en `app/(app)/paths/[id]/actions.ts` (del 08), `gamification` en `setStepStatus` y
   `submitQuizAttempt` y el rechazo de "Hecho" en un curso con quiz activo (ADR 0007); en
   `components/paths/path-steps-view.tsx` (del 08), el hook de celebración, el modal y abrir el quiz
   al pedir "Hecho"; en `components/paths/step-status-toggle.tsx` (del 08), el estado activo con el
   color de marca; en `app/(app)/dashboard/page.tsx` (del 09), la fila de XP y racha y el link al
   perfil en la cabecera; en `proxy.ts` (del 03), `/profile` entre las rutas privadas; y en
   `app/globals.css`, solo la regla que sube el `ToastViewport` sobre los diálogos.
   **Excepciones explícitas del spec 15 (rutas compartidas):** es dueño de `lib/sharing/*`,
   `components/sharing/*`, `app/shared/[slug]/*`, `app/(app)/paths/[id]/share-actions{,.test}.ts`,
   `lib/supabase/next-path{,.test}.ts`, `lib/site-url.ts` y `public/og-logo.png` (el logo en PNG,
   porque la tarjeta OG no lee WebP). Fuera de eso, del 03: `next` en `app/login/page.tsx`,
   `signInWithProvider` (`lib/supabase/actions.ts`) y `app/auth/callback/route.ts`, y el patrón
   `/auth/callback**` en `supabase/config.toml`; en `app/layout.tsx`, solo el `metadataBase`. Del 08:
   en `app/(app)/paths/[id]/page.tsx`, `share_slug`/`is_public`, el botón "Compartir" y la línea
   "Basada en la ruta de nombre_apellido"; en `components/paths/{step-row,path-steps-list,step-group-heading}.tsx`,
   el modo de solo lectura (`ownerActions` opcional y `showDoneCount`); y `isPathView`/`writeViewToUrl`,
   que pasan de `path-steps-view.tsx` a `path-step.ts` para que los reuse la página pública. Del 12:
   `onOpenStep`/`onOpen` opcionales en `components/paths/{path-map,path-map-node}.tsx`. Del 14:
   `fromQuestionnaire` en `lib/gamification/{summary,load-gamification}.ts`, para que "Explorador" no
   cuente las copias.
   **Excepciones explícitas del spec 05 (landing):** borra `app/page.tsx` (el placeholder del
   scaffold, sin dueño), porque `app/(marketing)/page.tsx` resuelve `/` y no pueden coexistir. En
   `app/globals.css`, los tokens `--animate-float`, `--animate-marquee` y `--animate-twinkle`, la
   utilidad `starfield` y, en el tema claro, `--level-required`, `--level-recommended` y `--ai` más
   oscuros: los badges pintan el texto sobre el mismo token al 15 % y quedaban en 3.9–4.0:1 (ahora
   4.6:1, en toda la app). Del 03: el rediseño solo visual de `app/login/{page,provider-button}.tsx`
   (panel de marca en desktop, Discord como botón principal, "Volver al inicio"), sin tocar el OAuth,
   `next` ni los errores. Todo lo demás de otros specs (`step-meta`, `step-node-style`, `XpBar`,
   `AchievementMedal`, `StreakIndicator`, `launchConfetti`, `lib/path-map/motion.ts`,
   `lib/gamification/xp.ts`, `TECHNOLOGIES`) se importa sin cambios.
6. **Migraciones nuevas solo en 02, 11, 13, 14 y 15**, y esos cinco no se implementan en paralelo entre sí:
   el orden de los archivos de migración depende del orden de merge, y ramas simultáneas lo rompen. El
   02 crea el esquema base —incluye `profiles.role` y las tablas `programs`/`program_courses`—; 11, 13
   y 15 añaden cada uno sus columnas o tablas para poder recortarse sin dejar tablas muertas. El 10
   (`admin-catalog`) **no crea ninguna migración propia**: usa el esquema que ya dejó el 02. Fuera
   de la numeración, los quizzes y la racha de Ariel (`20260923120000_quizzes_progress_streak.sql`)
   y su integración (`20260924130000_unify_streak.sql`, ADR 0005) ya están en el repo. El 13 los
   simplifica con `20260925130000_course_quizzes.sql` y siembra los quizzes con
   `20260925140000_seed_course_quizzes.sql`. El 14 solo cambia un FK
   (`20260925150000_keep_streak_days_on_path_delete.sql`: borrar una ruta ya no borra días de racha).
   El 15 agrega `is_public`, `share_slug` y `copied_from_path_id` a `learning_paths` y tres funciones
   `security definer` acotadas por slug (`20260925160000_path_sharing.sql`).
7. **Antes de cada `/spec-impl`:** estar en `master`, con el árbol limpio y actualizado. La fase 3 del
   skill se detiene si `git status` no está vacío.
8. **Lo que aparezca fuera de alcance durante un `/spec-impl` va al spec que le toca según el mapa**, no
   a la rama actual. Si no le toca a ninguno, es un spec nuevo al final de la numeración.
9. **Toda pantalla nueva compone el sistema de diseño ya construido, no crea piezas visuales nuevas.**
   La regla completa vive en `CLAUDE.md` §"UI: componer, no crear" (specs 03, 05, 06, 08, 09, 10, 12,
   14); no se duplica acá. La única composición visual nueva del 14 es la medalla de las insignias
   (`AchievementMedal`, solo tokens), justificada en sus Decisiones.

## 4. Decisiones abiertas, asignadas al spec que las cierra

Las que siguen sin marcar en `docs/investigacion/ANALISIS-IA.md` §11 y en las consecuencias del ADR
0001. Cada una se resuelve en la fase de preguntas del spec indicado, no antes:

| Decisión pendiente | La cierra |
|---|---|
| Quién revisa el enriquecimiento de los 74 cursos y cuándo | 01 |
| ~~Cómo se bootstrapea el primer usuario `admin`~~ — **cerrada por el spec 02**: ninguna de las dos opciones originales. Todos los perfiles nacen `role = 'user'`; el primer admin se promueve a mano desde el panel de Supabase después de loguearse, sin credenciales ni IDs sembrados en el repo público | — |
| ~~Cómo se persiste un curso descartado por el motor (o por el usuario) y su motivo~~ — **cerrada por el spec 02**: fila de `path_steps` con `status = 'discarded'` + `discard_reason`, no `excluded_steps jsonb` en `learning_paths`; ver [ADR 0004](decisiones/0004-donde-vive-la-personalizacion.md) | — |
| ~~Qué es una fila de `programs`: un programa agrupado (13) o una ruta oficial (15)~~ — **cerrada por el spec 02**: 15 filas, una por ruta oficial. React aporta "React" y "React Native"; Dart aporta "Dart móvil" y "Dart Web" | — |
| ~~Qué preguntas tiene el cuestionario (máx. 6–8, una sola de texto libre)~~ — **cerrada por el spec 06**: seis pasos (meta con área + meta, nivel, tecnologías dominadas, intereses, tiempo con horas + plazo, texto libre), una sola de texto libre. El plazo es una lista cerrada de 3/6/9/12 meses (no un input numérico libre, ni los 3/5/6/12 de la maqueta) | — |
| ~~Tabla `meta → programas` para metas fullstack, **y tabla `interests.ts`** (~12 intereses transversales al catálogo completo → 1-3 slugs cada uno, cruzando programas)~~ — **cerrada por el spec 04**: `GOALS` (19 metas, no solo fullstack, en `lib/paths/goals.ts`) e `INTERESTS` (12 intereses, 20 slugs de curso, en `lib/paths/interests.ts`); ver [`docs/decisiones/0003-intereses-transversales-al-catalogo.md`](decisiones/0003-intereses-transversales-al-catalogo.md) | — |
| ~~Cómo se resuelven los 9 cursos que cambian de `level` según el programa (ADR 0001)~~ — **cerrada por el spec 04**: cuando un mismo curso aparece con `level` distinto en dos programas fusionados, gana el más exigente (`requerido` > `recomendado` > `opcional`), resuelto dentro de `mergeOfficialSteps` | — |
| ~~Qué se hace cuando la ruta no cabe en el presupuesto (orden de recorte): primero los cursos que entraron por interés (ADR 0003), después los opcionales oficiales, después los recomendados~~ — **cerrada por el spec 04**: `trimToBudget` recorta exactamente en ese orden (`interes` → `opcional` → `recomendado`) y nunca quita un `requerido`; si no alcanza, devuelve `fitsInBudget: false` + `overflowHours` | — |
| ~~Cuántas horas como máximo puede añadir el paso de intereses sobre la ruta oficial (hoy nada impide que 12 chips marcados dupliquen la ruta)~~ — **cerrada por el spec 04**: `Math.max(0.25 * budgetHours, budgetHours - officialHours)` en `applyInterests` — nunca menos del 25% del presupuesto, pero tampoco menos que el espacio libre real sobre la ruta oficial ya armada | — |
| ~~Qué campos de un curso son editables desde el panel (¿también `slug` y `url`, o solo los descriptivos?)~~ — **cerrada por el spec 10**: todos, incluidos `url`, horas y flags; el `slug` se escribe al crear y queda fijo, porque `INTERESTS` y `TECH_TO_SLUGS` (spec 04) lo nombran en el código. "Borrar" un curso es desactivarlo, y se rechaza mientras esté en algún programa o lo use el motor | — |
| ~~Si el rol `admin` puede crear programas nuevos o solo asignar cursos a los 13 ya existentes~~ — **cerrada por el spec 10**: puede crear programas y editar nombre y posición (no borrarlos), con un aviso visible cuando ninguna meta de `lib/paths/goals.ts` lo nombra: sumarlo al cuestionario sigue siendo un cambio de código | — |
| ~~Límite diario de personalizaciones por usuario (sugerido: 5)~~ — **cerrada por el spec 11**: 5 usos por usuario en una ventana móvil de 24 h, contados en la tabla `ai_personalizations` (un uso por llamada al modelo, salga bien o no). Generar una ruta nunca se bloquea: sin usos, se genera sin ajuste ni redacción de IA | — |
| ~~Mini-quiz de re-evaluación vs. "Recalcular mi ruta"~~ — **cerrada por el [ADR 0004](decisiones/0004-donde-vive-la-personalizacion.md)**: ninguna de las dos. Es un cuestionario prellenado que la IA puede ajustar por chips a partir de texto libre (nunca cursos); sin IA, los chips se editan a mano. Genera una ruta nueva | — |
| ~~Cuándo el motor descarta un slug de interés porque coincide con una tecnología que el usuario ya domina (ej. marcó Node como dominado y el interés "Microservicios" sugiere `nestjs-microservicios`)~~ — **cerrada por el spec 04**: `applyInterests` descarta solo el `courseSlug` puntual y prueba el siguiente del mismo interés; si ninguno queda libre, ese interés no aporta nada (no se pierde el interés completo por una coincidencia parcial) | — |
| ~~Qué se muestra en el paso de intereses cuando el programa solo tiene 1 curso opcional real (7 de 18 combinaciones de stack de la maqueta)~~ — **cerrada por el ADR 0003**: el paso de intereses dejó de depender del stack. Es una lista plana de ~12 intereses transversales al catálogo completo, igual para todos los perfiles; `STACK_INTERESTS` de la maqueta queda reemplazada, no se copia al app (ver `SPECS-MAP.md` §6) | — |
| Vencimiento de los créditos de OpenAI y dueño de la key | Ninguno — es gestión, no spec |

## 5. Qué NO pasa por SDD

README, `LICENSE` MIT, `.env.example`, capturas, guion y grabación del video, QA final del día 12 y
correcciones de una línea. Son trabajo de entrega, no features; van directo a `master` con commit
convencional.

## 6. Insumos que ya existen y cada spec debe reusar (no reinventar)

- `data/courses.json`, `data/SUMMARY.md` — catálogo ya extraído (74 cursos). Entrada de los specs 01, 02
  y 04.
- `data/programs.json` — las 15 rutas oficiales de DevTalles dentro de 13 programas (React y Dart
  aportan 2 rutas cada uno; ver spec 02) (`stage`/`level`/`note`/`courses`). Es
  **insumo del seed** de `programs`/`program_courses` en el spec 02, no fuente de verdad en runtime: una
  vez sembrado, `build-path.ts` (04) recibe los programas por parámetro, y quien lo invoca en producción
  (el spec 07, vía `lib/catalog/catalog.ts`) siempre los lee de Supabase — este JSON sólo se vuelve a
  leer como fixture de `lib/paths/build-path.test.ts` (04), no como fuente de runtime.
- `components/ui/*` (22 componentes shadcn), `components/brand/*` y `components/theme-*` — sistema de
  diseño ya construido, documentado en `/sistema-diseno` y en el ADR 0002. Entrada de 03, 05, 06, 08,
  09, 10 y 12. La regla general ("componer, no crear") vive en `CLAUDE.md` §"UI: componer, no crear";
  no se repite acá.
- `components/gamification/xp-bar.tsx` — lo conectó el spec 14 (dashboard y `/profile`) sin cambiarlo.
- `lib/gamification/summary.ts` y `load-gamification.ts` (spec 14) — XP, nivel, racha e insignias
  derivados al leer. Un spec que necesite mostrar el avance del usuario (p. ej. el 15) los reusa.
- `lib/supabase/{client,server}.ts` y `proxy.ts` — clientes SSR ya escritos con `getAll`/`setAll` y
  refresh con `getClaims()`. Entrada del 03; el 03 añade login/callback y el rol en sesión, no reescribe
  esto.
- `docs/maquetas/0001-motor-de-reglas-con-ia-encima/` — maqueta HTML del cuestionario y de la pantalla
  de ruta con sus tres estados (cargando, con IA, sin key). Entrada **visual** de 06, 07 y 08: sus
  tablas de datos (`META_STACKS`, `STACK_SKILLS`, `STACK_INTERESTS`) no se copian al código real.
  `STACK_INTERESTS` en particular queda **reemplazada** por la tabla plana de `lib/paths/interests.ts`
  (ADR 0003) — el paso de intereses del 06 no depende del stack elegido.
- `docs/decisiones/0001-*.md` — el diseño de dos capas y el presupuesto de horas ya están decididos; el
  spec 04 los implementa, no los rediscute. El ADR 0003 lo matiza en un punto (el presupuesto de horas
  no cierra el delta cero en perfiles de un solo stack), sin reemplazarlo.
- `docs/decisiones/0003-*.md` — vocabulario cerrado de ~12 intereses transversales al catálogo con sus
  slugs y horas, y las reglas de seguridad del motor para no contradecir la ruta oficial. Entrada del
  spec 04.
- `related` en `data/courses.json` (221 aristas entre los 74 cursos, 70 cruzan de programa) — tagging
  ya publicado por DevTalles, hoy sin uso ni spec dueño. Insumo disponible, no asignado.
- `public/logo.webp`, `public/astronauta.webp`, `public/streak/*.webp` — assets de marca ya
  optimizados, catalogados en `CLAUDE.md` §"Marca y assets". El logo es entrada de 05 (cabecera de la
  landing) y 15 (tarjeta OG); la mascota sola, de 07 (pantalla de "generando ruta"); las 5 imágenes de
  `streak/` (cuatro celebraciones + recordatorio de racha), del 14. El 05 reusa las 6 poses: una por
  estación del recorrido, el cohete en el hero y el CTA final, y el ciclo del easter egg.

## 7. Qué construye cada spec

Desarrollo en prosa de la columna "Objetivo" de la §1, para leer el mapa sin abrir `ROADMAP.md` ni los
ADRs. Fija expectativas, no alcance: cuando un spec ya está escrito en `specs/NN-slug.md`, manda el spec
y esto pasa a ser un resumen.

### 01 · `catalog-enrichment`

El agente recorre los 74 cursos de `data/courses.json` y les agrega, leyendo `prerequisites`, `summary`,
`topics`, `chapters` y su posición en `data/programs.json`, los dos campos que el scraping no pudo sacar
de Thinkific: `difficulty` (`principiante`/`intermedio`/`avanzado`) y `outcome` (una frase de qué logra
el alumno al terminarlo). No hay script ni dependencia de IA en `package.json`: el enriquecimiento se
escribe durante `/spec-impl` y viaja commiteado. Deja `data/courses.enriched.json` revisado a mano por
el usuario antes de mergear. No gasta créditos de OpenAI, que quedan reservados para la Capa 2 del spec
11. No toca base de datos ni UI. Además es el spec que **fija el formato de todos los siguientes**:
`/spec` copia el estilo de los dos specs más recientes, así que las secciones e idioma que queden aquí
se propagan solos.

### 02 · `supabase-schema`

Las migraciones SQL de las 7 tablas del modelo base (`profiles` con columna `role` —`user` por
defecto, `admin` a mano desde el panel de Supabase—, `courses`, `programs`, `program_courses`,
`assessments`, `learning_paths`, `path_steps`), sus políticas RLS —lectura pública del catálogo,
escritura solo para `role = 'admin'` vía la función `private.is_admin()`, datos de usuario solo por
su dueño, y `profiles` sin ninguna política de escritura para `authenticated` (así nadie se
auto-promueve a admin)—, el trigger que crea la fila de `profiles` leyendo los metadatos de
cualquiera de los tres proveedores OAuth del spec 03 (Discord, Google, GitHub), y el seed que carga
el catálogo enriquecido y las 15 rutas oficiales desde `data/programs.json`. `programs` tiene 15
filas, una por ruta oficial, no una por programa agrupado: React y Dart aportan 2 rutas cada uno. Es
el único spec que crea el esquema base; 11, 13 y 15 solo le añaden columnas o tablas encima, y 10
no crea ninguna. Todo salvo el
último paso es independiente del 01, por eso puede arrancar el día 1 con el enriquecimiento todavía
en curso.

Este spec también deja un lugar para el curso que el motor —o el usuario, desde el spec 08— descarta
de una ruta, con su motivo: una fila de `path_steps` con `status = 'discarded'` + `discard_reason`,
no una columna aparte en `learning_paths`. Es la pieza que responde a la objeción "esto ya está
hecho, es reinventar la rueda" del ADR 0001: sin un lugar donde guardarlo, el spec 08 no puede
mostrar qué se sacó de la ruta oficial y por qué — ver
[ADR 0004](decisiones/0004-donde-vive-la-personalizacion.md).

### 03 · `discord-auth`

El login real: página `/login` (única pantalla de login del proyecto — el botón de la landing del
spec 05 es un link a ella, no una copia) con los tres botones que ya soporta el trigger del 02
(Discord, Google, GitHub), el route handler `app/auth/callback/route.ts` con
`exchangeCodeForSession`, el logout y los helpers `requireUser()`/`requireAdmin()` — este último exige
rol `admin` para las rutas que construirá el spec 10, leyendo `profiles.role` (no el `role` del JWT,
que es el de Postgres). Compone enteramente el sistema de diseño ya construido, sin crear componentes
de UI nuevos salvo un wrapper mínimo de estado de carga (ver `CLAUDE.md` §"UI: componer, no crear").
Dejó un placeholder temporal en `app/dashboard/page.tsx` que el spec 09 ya resolvió (ver regla 5).
**Reusa** los clientes `lib/supabase/{client,server}.ts` y el refresco de sesión de `proxy.ts`, que ya
están escritos — este spec les añade el flujo de entrada, no los reescribe. Incluye el primer deploy en
Vercel y los dominios de redirect en Supabase, porque el OAuth no se puede dar por cerrado solo en
local.

### 04 · `path-engine`

`lib/paths/build-path.ts` y `lib/paths/interests.ts`: una función **pura** que arma la ruta sin tocar la
base de datos ni la UI — por eso puede desarrollarse en paralelo con 02 y 03 en vez de esperarlos. Recibe
el catálogo de cursos y los programas (con su `program_courses`) **como parámetros**, no importa
`data/*.json` directamente: el spec 07 (semana 1) ya le pasa catálogo y programas leídos de Supabase vía
`lib/catalog/catalog.ts`, nunca los JSON versionados — la única excepción es `build-path.test.ts`, que
sigue leyendo `data/*.json` como fixture de prueba, no como fuente de runtime.
Encadena seis pasos: mapear la meta a uno o más programas oficiales, tomar los pasos según nivel del
usuario, quitar tecnologías ya dominadas, deduplicar cursos repetidos entre programas, sumar los
intereses transversales de `interests.ts` y por último recortar contra el presupuesto de horas dejando
registrada la procedencia (por qué entró, salió o se fusionó cada paso). Su primer entregable,
`lib/paths/types.ts` (el contrato de la respuesta del cuestionario), es lo que desbloquea al 06 sin
esperar a que el motor esté terminado. Es también el spec que cierra la mayoría de las decisiones
pendientes de la §4: la tabla `meta → programas`, la tabla de intereses, el orden de recorte, el tope de
horas que pueden sumar los intereses y cuándo el motor descarta un interés por tecnología ya dominada.

### 05 · `landing`

> **Implementado distinto de lo que planeaba este mapa** — manda `specs/05-landing.md`. Se escribió
> después del 15, así que muestra el producto real en vez de describirlo.

La página pública `app/(marketing)/page.tsx`: presenta DevPathlles a alguien que todavía no inició
sesión, con botones a `/login` (del spec 03; el principal lleva `next=/quiz`, del 15) — no repite ahí
el formulario de OAuth. Con sesión, los botones pasan a "Ir a mi panel" y no hay redirect. El centro
es un recorrido "Cómo funciona" de 5 estaciones (cuestionario, motor, IA, progreso y compartir) que se
anima con el scroll: la estación que cruza el centro de la pantalla se enciende y el astronauta viaja
hasta ella, con los tiempos y los estilos de nodo del mapa del 12; cada estación tiene su pose y un
mockup con una ruta de ejemplo fija (cursos reales, verificados contra `data/courses.json`). Además:
hero con estrellas y una mascota que cambia de pose y lanza confetti al tocarla, franja con las 15
tecnologías de `TECHNOLOGIES`, preguntas frecuentes, footer con Code Quest 2026 y tarjeta OG solo
para `/`. Sin JS o con "reducir movimiento" todo se ve terminado. No agrega dependencias.

### 06 · `assessment-quiz`

El cuestionario multi-step (`components/quiz/*`) que **captura y guarda** las respuestas — no genera
nada todavía, eso es el 07. De 6 a 8 preguntas (meta, nivel por área, intereses, tecnologías dominadas,
horas por semana, plazo, y una sola de texto libre), validadas con zod y react-hook-form sobre el
contrato de tipos que ya dejó el 04. Persiste la fila en `assessments`. Depende de 02 y 03 solo porque
necesita usuario autenticado y tabla donde guardar, no por su contenido.

### 07 · `path-generation`

El punto de unión: una server action (`app/(app)/paths/actions.ts`) que toma el `assessment` recién
guardado, carga catálogo y programas desde Supabase vía `lib/catalog/catalog.ts` (dos queries: cursos
activos; `program_courses` con el slug del programa y del curso embebidos — nunca `data/*.json`, ni
siquiera en la semana 1: el split de 15 rutas sobre 13 programas sólo existe como filas separadas en la
base real) y se los pasa a `build-path.ts` del 04, persiste el resultado en `learning_paths` +
`path_steps`, y redirige a `/paths/[id]`. No añade lógica de negocio propia — combina la del 02, 04 y 06
— salvo la pantalla intermedia de "generando ruta" mientras corre y un placeholder mínimo y transitorio
en `/paths/[id]` que el spec 08 reescribe entero (ver regla 5). Es el primer spec en el que un usuario ve
una ruta completa de punta a punta.

### 08 · `path-progress-view`

La vista en **lista** de la ruta guardada (el mapa visual es el 12, un spec aparte): chips de
procedencia por paso (por qué entró ese curso), un acordeón "Qué quitamos y por qué" (por qué salió
uno que la ruta oficial sí tenía), el control para cambiar el estado de cada paso
(pending/in_progress/done) y un botón para descartar un paso todavía `pending`, con opción de
deshacer. Dueña de `app/(app)/paths/[id]/*`. Es la base sobre la que cuelgan 09, 12, 13, 14, 15 y 16 —
ninguno de esos repite esta vista, todos la extienden o la referencian.

### 09 · `paths-dashboard`

El dashboard con todas las rutas del usuario, el progreso de cada una y el acceso para crear otra desde
cero. Su primer paso movió el placeholder `app/dashboard/page.tsx` que dejó el spec 03 a
`app/(app)/dashboard/page.tsx` antes de reescribirlo (ver regla 5 de concordancia), para que nunca dos
rutas resolvieran `/dashboard`. El progreso de cada ruta
se calcula con `summarizePathProgress` de `lib/progress/path-progress.ts` (spec 08), por horas y sin
contar los pasos descartados — no se reimplementa en el dashboard. Cierra el **Hito 1**: con
este spec mergeado a `master`, los cinco requisitos obligatorios del `ENUNCIADO.md` (cuestionario,
rutas dinámicas con cursos reales, guardar varias rutas y marcar progreso, login con Discord,
tecnologías de DevTalles) ya están cumplidos — sin necesitar `OPENAI_API_KEY`, que recién entra en el
11, ni el rol `admin`, que recién se usa en el 10.

### 10 · `admin-catalog`

El panel `/admin`: CRUD de `courses` y de su ubicación en programas (`program_courses` — stage, level,
position, note), protegido por el helper de rol `admin` del spec 03. Responde a la línea de
`ENUNCIADO.md` sobre "adaptarse a las necesidades cambiantes de la comunidad": permite dar de alta un
curso nuevo de DevTalles sin tocar código ni SQL, y que ese curso pueda aparecer de verdad en una
ruta generada porque queda ligado a un programa — a diferencia de un CRUD de solo cursos, que sería
decorativo. **No crea ninguna migración propia**, usa las tablas y RLS que ya dejó el 02. Depende de 02 y
03 solo por el esquema y la sesión; el mapa lo agenda después del Hito 1 por prioridad de calendario, no
porque exista una dependencia técnica pendiente.

### 11 · `ai-personalization`

> **Implementado distinto de lo que sigue** — manda `specs/11-ai-personalization.md`. Resumen: la IA
> escucha el texto libre del cuestionario en dos momentos. Al generar, lo traduce a ajustes de meta,
> intereses y tecnologías dominadas (listas cerradas, nunca cursos) con los que el motor arma la
> ruta, y la ruta muestra "Ajustamos tu ruta por lo que contaste". Al abrir la ruta, redacta título,
> resumen y razones una sola vez, sin botón. Solo corre si el usuario escribió texto libre y hay
> `OPENAI_API_KEY`; modelo `gpt-6-luna`. El spec 16 reusa `requestProfileAdjustment` para su
> versión con confirmación.

La Capa 2 del diseño del ADR 0001: sobre una ruta que la Capa 1 (el motor del 04) ya armó y guardó, la
IA escribe título, resumen y las razones de cada paso. La IA **no agrega ni quita cursos** — los slugs
que puede mencionar están acotados con `z.enum` a los que ya están en la ruta, y el motor de reglas es
quien decide si acepta sus `programHints`. Si no hay key, hay timeout (~15s) o la respuesta no valida
contra el schema, la ruta se queda con las razones por plantilla de la Capa 1 sin mostrar error — nunca
es un camino que pueda romper la app. El límite diario de personalizaciones por usuario (decisión
pendiente que cierra este spec) **solo limita cuántas veces la IA reescribe una ruta ya generada** —
generar una ruta nueva es trabajo del motor de reglas (07), no gasta créditos y nunca queda bloqueado por
este límite.

### 12 · `visual-path-map`

> **Implementado distinto de lo que planeaba este mapa** — manda `specs/12-visual-path-map.md`.

Una vista alternativa sobre los mismos datos del 08, no un modelo nuevo, y la que se ve por defecto
en `/paths/[id]` (`?vista=lista` abre la lista). Sin React Flow ni dagre: la ruta es lineal, así que
el camino en zigzag estilo Duolingo sale de una función pura (`lib/path-map/zigzag-layout.ts`) y se
dibuja con CSS + SVG. Una unidad por programa con su banner y progreso, nodos por estado, conector
que se rellena al completar, y el astronauta con halo y globo en el próximo paso (`findNextStep` del
09). Tocar un nodo abre un modal de detalle que reusa `step-status-toggle.tsx` (spec 08); marcar
"Hecho" lo cierra y el progreso "viaja" al siguiente paso. Todas las animaciones respetan
`prefers-reduced-motion`.

### 13 · `course-quizzes`

Reemplaza los quizzes generados con IA del ADR 0005 por un quiz por curso que el admin escribe y
edita en `/admin/courses/[slug]/quiz` (spec 10). El seed trae 3 preguntas sencillas para cada uno
de los 74 cursos. Al elegir una opción se ve al instante si es correcta y por qué; aprobar marca el
paso como "Hecho" y suma a la racha. Saca la práctica por capítulo, la generación con IA y
`SUPABASE_SECRET_KEY`. Crea migración (simplifica `quizzes` y le da RLS solo-admin) y el seed.
Decisión registrada en el [ADR 0006](decisiones/0006-quizzes-de-curso-escritos-por-el-admin.md).

### 14 · `gamification`

10 XP por hora de cada curso distinto hecho, niveles con curva 100 × n, la racha del
[ADR 0005](decisiones/0005-quizzes-y-racha-unificados.md) y 6 insignias como medallas, todo derivado
al leer (sin columnas nuevas en `profiles`). Resumen en la cabecera del dashboard y detalle en
`/profile`. En `/paths/[id]`, un curso hecho da un toast de XP, y un logro mayor (ruta, nivel o
insignia) abre un solo modal con la pose de la mascota y confetti, que nunca tapa el quiz ni el
detalle. Con el [ADR 0007](decisiones/0007-done-requires-course-quiz.md), "Hecho" en un curso con
quiz abre el quiz. Migración chica: borrar una ruta ya no borra días de racha.

### 15 · `path-sharing`

El dueño publica su ruta desde `/paths/[id]` ("Compartir") y obtiene un link `/shared/[slug]` con tarjeta
OG (`opengraph-image.tsx`) para pegarlo en Discord. La página pública muestra título, resumen, autor y
los cursos en Mapa y Lista de solo lectura, sin el avance del autor. Con sesión, "Hacer esta ruta" la
copia a la cuenta de quien la mira (mismos cursos, orden y descartados, con el progreso en cero); sin
sesión, el login vuelve al link gracias a `next`. Las RLS no cambian: `anon` sigue sin leer
`learning_paths` ni `path_steps`, y lo que lee o copia una ruta ajena pasa por tres funciones
`security definer` acotadas por slug. Las copias no cuentan para "Explorador".

### 16 · `path-recalculation`

El único spec **COULD** del mapa — el primero en recortarse si el tiempo aprieta. Descartado tanto el
mini-quiz de re-evaluación adaptativa de `ROADMAP.md` como que la IA decida cursos sobre la ruta ya
armada (ver [ADR 0004](decisiones/0004-donde-vive-la-personalizacion.md)): la versión adoptada es un
botón "Ajustar mi ruta" que abre el cuestionario del spec 06 **prellenado** con las respuestas
anteriores, más un campo de texto libre. Si hay `OPENAI_API_KEY`, ese texto se traduce a cambios en
los chips del cuestionario (meta, intereses, horas) — nunca a cursos sueltos, acotado con `z.enum` a
las listas cerradas que ya existen — y el usuario confirma antes de aplicar nada. Sin key, el mismo
formulario prellenado se edita a mano. Al confirmar, el motor del 04 genera una **ruta nueva**; la
anterior no se toca, así que el progreso y el XP ya ganados no se pierden. Depende de 08 (necesita la
vista de progreso) y de 11 (comparte el límite diario de personalizaciones).
