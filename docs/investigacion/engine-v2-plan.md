# Plan: motor de rutas v2 — orden por requisitos, reglas en manos del admin

> **Estado (2026-09-27): implementado** en `specs/17-path-engine-v2.md` y el
> [ADR 0008](../decisiones/0008-motor-v2-requisitos-y-admin.md). Al revisar las muestras, el usuario
> decidió tres cosas:
> - con horas de sobra entran más cursos de sus intereses;
> - un curso de principiante que la ruta oficial pone tarde se queda en su etapa oficial;
> - los tramos no retroceden.
>
> El prototipo con el que se validó este plan ya no está en el repo: comparaba contra el motor del
> spec 04, que el 17 reemplazó. Sus muestras coincidían con el motor real, y los casos de React y Java
> pasaron a `lib/paths/build-path.test.ts`.

## Contexto

El usuario generó dos rutas reales (React y Java, principiante) y ninguna tiene sentido pedagógico:
Docker, SOLID y Patrones antes de ver una línea de Java; OpenAI con React + NestJS en una ruta de
Java; Git pegado apenas empieza. Pidió además, en texto libre, "cursos ordenados y que poco a poco
aumente la dificultad", y el sistema no puede cumplirlo.

Se corrió el motor actual (`lib/paths/build-path.ts`) contra el catálogo real de Supabase en las 19
metas, 3 niveles, varios presupuestos e intereses (script en el scratchpad, sin tocar el repo). El
problema es de diseño, no de una meta:

- **Fundamentos entra como bloque fijo de 66 h** delante de cualquier meta (spec 04, "se antepone
  requerido + recomendado").
- **El recorte por tiempo protege el nivel oficial, no lo que se necesita**: con 5 h/semana, React
  queda Programación → Git → SOLID → Patrones → React → Next.js, **sin JavaScript**. Lo mismo en
  `java-angular` (Angular sin JS) e `ia-node` (Nest GraphQL sin JS).
- **React Native entra sin React**, aunque el curso lo exige.
- **Los intereses no miran la meta**: Angular + "tiempo real" suma *React + Sockets*; PHP o Java + "IA"
  suman *OpenAI con React + NestJS*; IA + intereses suma *Python IA aplicada* sin Python.
- **Entran cursos en construcción** (Kafka, Patrones de diseño agéntico, Codex).
- **Dominar React no quita JavaScript**; "IA con Python" recorta FastAPI y Django y deja Node, Nest y
  Angular.

Causa raíz: el motor no sabe qué curso necesita a cuál; solo conoce etapa y nivel del programa
oficial. Se prototipó el motor v2 en memoria (6 rondas de prueba y corrección, más un revisor
independiente sobre 19 perfiles) y resuelve todos los casos anteriores en **0.1–1.2 ms por ruta**:
generar no tarda más que hoy.

Además, el usuario pidió que **el admin controle el motor** para que sea escalable (y la app tiene
que "adaptarse a las necesidades cambiantes de la comunidad").

## Decisiones tomadas con el usuario

- **Alcance del admin (esta etapa):** requisitos entre cursos, qué cursos sugiere cada interés, la
  base del principiante (programa Fundamentos) y cursos en construcción. Metas, intereses y
  tecnologías *nuevos* del cuestionario quedan para un spec 18.
- **Git:** siempre para el principiante, pero no apenas empieza el lenguaje: llega después de su
  primer curso intermedio/avanzado (React, Java avanzado), salvo que un curso lo pida antes (FastAPI,
  Go backend). Si falta tiempo, es el último recomendado que se recorta.
- **Intereses:** donde encajan por dificultad, no al final. La lista se agrupa en tramos
  "Primeros pasos / Intermedio / Avanzado".
- **IA:** no elige ni ordena cursos (sin espera extra, funciona sin key). Solo ayuda al admin: botón
  "Sugerir requisitos con IA" al editar un curso; el admin confirma.

## Cómo arma la ruta el motor v2

Sigue siendo una función pura (`buildPath`); todo entra por parámetro. Validado con un prototipo en
6 rondas + un revisor independiente sobre 19 perfiles. Pasos:

1. **Base del principiante (Fundamentos, editable por el admin), solo para "Empiezo de cero":** el
   curso de la etapa más baja (Programación) arranca la ruta, solo en su propia etapa. El resto de lo
   no-opcional (Git) llega **después de la primera etapa no-principiante** de la meta, salvo que un
   curso lo pida antes ("Conviene antes"). Lo `opcional` de Fundamentos entra solo si se marca ese
   interés. Se migra Fundamentos a: Programación `requerido`, Git `recomendado`,
   SOLID/Patrones/SQL/Docker/VS Code/Tailwind `opcional`. Para "Tengo bases"/"Intermedio", Programación
   cuenta como dominada y Git entra solo por interés o porque un curso lo necesita (probado: meterlo
   siempre desplazaba intereses que el usuario sí marcó).
2. **Programas de la meta:** como hoy, sin cursos en construcción (a "Qué quitamos" solo si su paso no
   tenía otra alternativa) ni los excluidos de la meta (`ia-python` excluye el stack JS del programa
   IA, en `goals.ts`). Entre alternativas gana la que ya está en la ruta / dominada / marcada y cuya
   base está cubierta; si no, el orden de la web.
3. **Dominadas:** dominar una tecnología cuenta también todo lo que ese curso necesita (React ⇒
   JavaScript).
4. **Requisitos obligatorios ("Necesita"):** todo curso requerido/recomendado trae lo que necesita y
   le hereda su nivel (JavaScript pasa a requerido porque React lo necesita). Razón: "Lo necesitas
   antes de {curso}".
5. **Opcionales del programa e intereses:** entran solo si su base ya está en la ruta; si no, se
   prueba la siguiente opción del interés; si ninguna sirve, "Qué quitamos": "tu interés en X no encaja
   todavía: sus cursos necesitan una base que tu ruta no tiene". Si el primer curso del interés ya está,
   queda cubierto. Así entran solos los de IA de cada stack (Spring AI, Flutter + Gemini, Expo +
   Gemini). Se mantiene el cupo de intereses (piso 25 %).
6. **Recorte por tiempo:** intereses → opcionales → recomendados del programa, desde el final, y la
   base (Git) al último; **nunca un curso que otro que se queda necesita**, y lo que queda huérfano sale
   también. Los requeridos no se tocan. Después, **relleno**: lo recortado que vuelva a caber (y tenga su
   base) regresa.
7. **Orden:** topológico ("Necesita" y "Conviene antes" siempre se respetan) con un ancla por curso:
   - curso de programa → su etapa oficial (baja si un curso requerido/recomendado lo necesita antes);
   - requisito arrastrado → justo antes del primero que lo necesita;
   - interés u opcional → antes del primer curso más difícil de la meta (o junto a los de su misma
     dificultad si no hay uno más difícil), y siempre después de su base; **nunca adelanta** los cursos
     que necesita (un opcional de React que pide Nest espera a Nest, no lo mete en medio de React);
   - desempate: dificultad, luego horas.
   Etapas consecutivas; dos cursos comparten etapa solo si vienen de la misma etapa oficial y ninguno
   necesita ni conviene después del otro.
8. **Vista:** la lista se agrupa en tramos por etapa (máxima dificultad alcanzada: Primeros pasos /
   Intermedio / Avanzado); una etapa nunca se parte entre dos tramos.

Descartado a propósito (propuestas del revisor): margen de 5 % para que Git quepa (rompe "la ruta cabe
en tu tiempo"; si no cabe, sale en "Qué quitamos") y Git antes de Go (contradice "no Git apenas
empiezas el lenguaje"; el admin puede agregarlo).

## Qué controla el admin

| Pieza | Dónde | Estado |
|---|---|---|
| Requisitos entre cursos ("Necesita" / "Conviene antes") | tabla `course_prerequisites`, tarjeta en `/admin/courses/[slug]` | nuevo |
| Cursos que sugiere cada interés (ordenados) | tabla `interest_courses`, página `/admin/interests` | nuevo |
| Base del principiante | niveles del programa Fundamentos (UI de ubicaciones que ya existe) | nueva semántica |
| En construcción / activo / horas / dificultad | formulario de curso | ya existe |
| Programas y ubicaciones | `/admin/programs` | ya existe |
| Metas, etiquetas de intereses, tecnologías | código (`goals.ts`, `interests.ts`) | spec 18 |

## Pasos de implementación

**Paso 0 — apenas se apruebe este plan, antes de cualquier código del producto:**

1. Copiar este plan a `docs/investigacion/engine-v2-plan.md`, para retomarlo después (lo pidió el
   usuario).
2. Guardar el prototipo del motor v2 en el scratchpad y generar en la raíz del repo la carpeta
   `engine-v2-samples/` con 15 archivos `.txt` (nombres en inglés, contenido en español; casos del
   Anexo D). Cada uno trae: las respuestas del quiz, la ruta con el motor actual, la ruta v2 por tramos
   con el porqué de cada curso, y "Qué quitamos y por qué". Revisarlos antes de entregarlos. No se
   commitean: es material de revisión. Después se decide si se borran o pasan a fixtures de tests.
3. Actualizar la memoria del proyecto con el estado y el siguiente paso.
4. Esperar la revisión del usuario sobre las muestras. Con sus ajustes, recién ahí ADR + spec.

Proceso SDD (CLAUDE.md): primero se escriben `docs/decisiones/0008-motor-v2-requisitos-y-admin.md`
(reemplaza las decisiones de Fundamentos, alternativas y recorte del spec 04; matiza ADR 0001 sobre
`prerequisite_slugs` y ADR 0003 sobre dónde vive la tabla de intereses) y `specs/17-path-engine-v2.md`
(Borrador) con este plan; se agrega la fila 17 (y la 18 como futura) a `docs/SPECS-MAP.md`. Con el
spec `Aprobado`, `/spec-impl 17-path-engine-v2` en la rama `spec-17-path-engine-v2`.

1. **Datos revisados:** `data/course-prerequisites.json` (Anexo A) y `data/interest-courses.json`
   (Anexo B + filas sin cambio). Mencionarlos en `data/SUMMARY.md`.
2. **Migración** `supabase/migrations/<ts>_engine_rules.sql`: enum `course_prerequisite_kind`
   (`necesita`, `conviene`); `course_prerequisites(course_id, prerequisite_course_id, kind)` con PK
   compuesta, `check` contra auto-referencia, índice en la FK; `interest_courses(interest_slug,
   course_id, position)`; RLS igual que `program_courses` en `20260920222218_catalog.sql` (select
   `anon, authenticated`; escritura con `private.is_admin()`); seed con `jsonb_to_recordset` como
   `20260920224310_seed_programs.sql`; `update` de niveles de Fundamentos. Aplicar con
   `npx supabase db push` y regenerar `lib/supabase/database.types.ts`. Test pgTAP
   `supabase/tests/engine_rules.sql` (lectura pública, escritura solo admin, auto-referencia falla).
3. **Contrato del motor** (`lib/paths/types.ts`): `CatalogCourse` suma `title`, `inConstruction`;
   nuevo `EngineRules = { prerequisites: Record<slug, { required: string[]; recommended: string[] }>;
   interestCourses: Record<interestSlug, string[]> }`; `buildPath(profile, catalog, programs, rules)`.
   `lib/catalog/catalog.ts` carga las dos tablas nuevas en el mismo `Promise.all` y las traduce.
4. **Motor** `lib/paths/build-path.ts`: reescribir el pipeline en funciones con nombre (una por paso
   de arriba; `orderSteps` reemplaza a `renumberStages`), razones nuevas por plantilla.
   `lib/paths/goals.ts`: `excludedCourseSlugs` en `ia-python`. `lib/paths/interests.ts`: `INTERESTS`
   queda solo con etiquetas (los cursos viven en la base).
5. **Tests del motor** `lib/paths/build-path.test.ts` (fixtures `data/*.json` con los niveles de
   Fundamentos migrados): invariantes sobre 19 metas × 3 niveles × 3 presupuestos × varios intereses —
   ningún curso antes de lo que necesita o conviene; nada queda sin su base; nada en construcción; el
   principiante empieza con Programación; dos cursos de la misma etapa no dependen entre sí; horas ≤
   presupuesto cuando `fitsInBudget`. Casos fijos: las dos rutas del Anexo C (React y Java) exactas, React
   Native incluye React, Angular + tiempo real no trae React, dominar React quita JavaScript.
6. **Vista de la ruta:** `lib/progress/group-steps.ts` agrupa por tramo (máxima dificultad alcanzada
   hasta ese paso) en vez de por programa; `PathStepView` suma `courseDifficulty` (cargarlo en
   `app/(app)/paths/[id]/page.tsx` y en la página compartida); actualizar `path-steps-view.tsx`,
   `components/sharing/shared-path-steps.tsx` y `group-steps.test.ts`. El mapa no cambia.
7. **Admin:** `components/admin/course-prerequisites.tsx` (mismo patrón que `course-placements.tsx`)
   + acciones `addPrerequisite`/`removePrerequisite` en `app/(admin)/admin/courses/actions.ts`, schema
   en `lib/admin/prerequisite-schema.ts` y chequeo de ciclos puro `lib/admin/prerequisite-cycles.ts`
   (con test). `app/(admin)/admin/interests/page.tsx` + `components/admin/interest-courses.tsx` +
   acciones (agregar, quitar, subir/bajar), entrada en `admin-nav.tsx`. `lib/admin/engine-references.ts`
   lee `interest_courses` en vez de `INTERESTS`. Texto de ayuda en el programa Fundamentos explicando
   su semántica.
8. **IA para el admin:** `lib/ai/suggest-prerequisites.ts` + botón en la tarjeta de requisitos: manda
   el texto de requisitos del curso y la lista de cursos, salida estructurada con `z.enum` de slugs
   reales; devuelve sugerencias que el admin agrega a mano; oculto sin `OPENAI_API_KEY`. Reusar la
   configuración de modelo de `lib/ai/personalize-path.ts`.
9. **Docs:** línea de estado en `CLAUDE.md` y estado del spec 17.

## Verificación

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run format:check`; `npx supabase test db`.
- MCP Supabase: conteo de filas de las tablas nuevas y `get_advisors` (security) sin avisos nuevos.
- Barrido del scratchpad contra la base real con el motor nuevo: las 19 metas deben coincidir con el
  Anexo C y cumplir las invariantes.
- En la app (`npm run dev`): generar las rutas de React y Java con las mismas respuestas del usuario;
  revisar lista por tramos, mapa y "Qué quitamos y por qué" (OpenAI "le falta la base", Kafka "en
  construcción"); el tiempo de generación se siente igual que hoy.
- En `/admin`: agregar "Astro necesita TypeScript" y regenerar (Astro pasa detrás de TypeScript);
  intentar un ciclo (JavaScript necesita React) → error claro; cambiar el orden del interés IA y
  regenerar.

## Fuera de alcance (anotado)

- Metas/intereses/tecnologías nuevos desde el admin (spec 18: tocan cuestionario, zod y la IA).
- La ruta de Java no tuvo título de IA porque el ajuste por texto libre y la personalización comparten
  el cupo de 5 usos/24 h (ADR 0004 lo dejó sin verificar): arreglo aparte.
- Las rutas ya guardadas no se regeneran.

## Anexo A — Borrador del mapa de requisitos entre cursos

Sacado del campo `prerequisites` (texto del instructor) de los 74 cursos activos en Supabase.
"Necesita" = el curso no se puede seguir sin eso. "Conviene antes" = solo ordena si los dos ya
están en la ruta; nunca agrega un curso. Los cursos que no aparecen no tienen requisitos de curso.

| Curso | Necesita antes | Conviene antes |
|---|---|---|
| `javascript-moderno` | | `programacion-para-principiantes` |
| `Java` | | `programacion-para-principiantes` |
| `python` | | `programacion-para-principiantes` |
| `csharp` | | `programacion-para-principiantes` |
| `PHP-moderno` | | `programacion-para-principiantes` |
| `dart-cero-hasta-detalles` | | `programacion-para-principiantes` |
| `typescript-guia-completa` | `javascript-moderno` | |
| `react-de-cero` | `javascript-moderno` | |
| `react-pro` | `react-de-cero` | |
| `nextjs` | `react-de-cero` | |
| `react-router` | `react-de-cero` | |
| `tanstack-query` | `react-de-cero`, `typescript-guia-completa` | |
| `zustand-gestor-de-estado-para-react` | `react-de-cero` | |
| `shadcn-ui` | `react-de-cero`, `typescript-guia-completa` | `tailwindcss-para-desarrolladores` |
| `react-sockets` | `react-de-cero` | |
| `react-native-expo` | `react-de-cero` | |
| `expo-gemini` | `react-de-cero` | `react-native-expo` |
| `openai` | `react-de-cero`, `nest` | `typescript-guia-completa` |
| `openai-angular-nestjs` | `angular-moderno`, `nest` | |
| `vue-cero-a-experto` | `javascript-moderno` | |
| `Vue-intermedio` | `vue-cero-a-experto` | |
| `nuxt` | `javascript-moderno` | `vue-cero-a-experto` |
| `angular-moderno` | `javascript-moderno` | `typescript-guia-completa` |
| `angular` | `javascript-moderno` | |
| `angular-pro` | `angular-moderno` | `git-github-control-versiones-desde-cero` |
| `Angular_socket_bun` | `angular-moderno` | |
| `Astro` | `javascript-moderno` | |
| `qwik-introduccion` | `typescript-guia-completa` | `react-de-cero` |
| `nodejs-de-cero-a-experto` | `javascript-moderno` | |
| `node-clean-architecture` | `nodejs-de-cero-a-experto` | `sql-con-postgres` |
| `nest` | `javascript-moderno` | `typescript-guia-completa`, `nodejs-de-cero-a-experto` |
| `nest-graphql` | `nest` | |
| `nestjs-microservicios` | `nest`, `typescript-guia-completa` | `docker-guia-practica` |
| `nestjs-reportes` | `nest` | |
| `NestJS-Testing` | `nest` | |
| `java-avanzado` | `Java` | |
| `spring-boot` | `Java` | `java-avanzado` |
| `spring-boot-patrones-arquitectura` | `spring-boot` | |
| `spring-boot-microservicios` | `spring-boot`, `sql-con-postgres` | `docker-guia-practica` |
| `springboot-mvc-hexagonal` | `spring-boot` | |
| `kafka-springboot-event-driven` | `spring-boot` | |
| `spring-AI` | `spring-boot` | `java-avanzado` |
| `NET-Backend` | `csharp` | `sql-con-postgres` |
| `net-pruebascompletas` | `csharp` | `NET-Backend` |
| `netfullstack` | `csharp` | `NET-Backend` |
| `fastapi` | `python`, `sql-con-postgres` | `git-github-control-versiones-desde-cero` |
| `django` | `python` | `sql-con-postgres` |
| `python-ia-aplicada` | `python`, `sql-con-postgres` | `Ingeniería-de-prompts` |
| `python-n8n-automatiza-rutinas` | `python` | `n8n-mcp`, `fastapi` |
| `laravel-ai` | `PHP-moderno` | |
| `golang-fundamentos-lenguaje` | | `programacion-para-principiantes` |
| `golang-backend-profesional` | `golang-fundamentos-lenguaje`, `sql-con-postgres` | `git-github-control-versiones-desde-cero` |
| `flutter-movil-cero-a-experto` | | `dart-cero-hasta-detalles` |
| `flutter-movil-intermedio` | `flutter-movil-cero-a-experto`, `dart-cero-hasta-detalles` | |
| `riverpod-con-anotaciones` | `flutter-movil-cero-a-experto` | |
| `flutter-bloc` | `flutter-movil-cero-a-experto` | |
| `Flutter-Gemini` | `flutter-movil-cero-a-experto` | |
| `solid-clean-code` | `typescript-guia-completa` | |
| `patrones-diseno` | | `typescript-guia-completa` |
| `ia-para-developers` | `typescript-guia-completa` | `Ingeniería-de-prompts`, `nodejs-de-cero-a-experto` |
| `claude-code-guia-completa` | | `programacion-para-principiantes`, `git-github-control-versiones-desde-cero` |
| `open-code-guia-completa` | | `git-github-control-versiones-desde-cero` |
| `docker-guia-practica` | | `git-github-control-versiones-desde-cero` |
| `vibe-coding` | | `javascript-moderno`, `python` |

## Anexo B — Intereses v2 (orden de preferencia)

Solo cambian dos filas; el resto queda como hoy en `lib/paths/interests.ts`.

| Interés | Cursos |
|---|---|
| `ia-aplicada` | `Ingeniería-de-prompts`, `spring-AI`, `python-ia-aplicada`, `ia-para-developers`, `Flutter-Gemini`, `expo-gemini`, `openai`, `openai-angular-nestjs` |
| `agentes-vibe-coding` | `claude-code-guia-completa`, `open-code-guia-completa`, `vibe-coding` |

## Anexo C — Cómo está vs cómo debería estar (principiante, 10 h × 6 meses salvo aclaración)

**React** (IA, SQL, sitios de contenido)
- Hoy (256 h): Programación → Git → SOLID → Patrones → SQL → Docker → JavaScript → React → TypeScript →
  React PRO → OpenAI React+Nest → Next.js → IA para Developers → Astro
- v2 (210 h): *Primeros pasos:* Programación → JavaScript → Ingeniería de prompts · *Intermedio:*
  TypeScript ∥ React → Git → Astro · *Avanzado:* React PRO → SQL → Next.js. Quitado: OpenAI (le falta
  Nest).

**Java** (IA, SQL, agentes)
- Hoy (237 h): Programación → Git → SOLID → Patrones → SQL → Docker → Java → Java avanzado → Spring
  Boot → Patrones de arquitectura → Microservicios → Kafka (en construcción) → Spring AI → OpenAI
  React+Nest → Claude Code
- v2 (191 h): *Primeros pasos:* Programación → Java → Ingeniería de prompts → SQL · *Avanzado:* Java
  avanzado → Git → Claude Code → Spring Boot → Patrones de arquitectura → Microservicios → Spring AI.

**React con 5 h/semana** (130 h)
- Hoy: Programación → Git → SOLID → Patrones → React → Next.js (sin JavaScript)
- v2: Programación → JavaScript → TypeScript ∥ React → Next.js. Quitado por tiempo: SQL, React PRO, Git.

**React Native**
- Hoy: … → JavaScript → TypeScript → React Native (sin React)
- v2: Programación → JavaScript → TypeScript → Git → React → React Native.

**Angular** (IA, tiempo real)
- Hoy: … → Angular → TypeScript → Angular + Sockets → Angular Pro → React + Sockets → OpenAI React+Nest
- v2: Programación → JavaScript → Ingeniería de prompts → TypeScript → Angular → Git → Angular +
  Sockets → Angular Pro.

**IA con Python**
- Hoy: … Fundamentos … → n8n → prompts → (en construcción) → Vibe coding → Node → Claude Code → IA para
  Developers → Nest → Angular → Python; quitados FastAPI, Django, Python IA
- v2: Programación → n8n → prompts → Python → Vibe coding → SQL → Git → Claude Code → FastAPI →
  Django → Python IA aplicada.

**Vue + Node** (Testing, Docker; 12 h × 8 meses)
- v2: Programación → JavaScript · TypeScript ∥ Vue → Git → Docker · Nuxt ∥ Vue intermedio → Node →
  Nest → NestJS + Testing → Nest + GraphQL.

**Flutter** (IA aplicada)
- Hoy: … Fundamentos … → Dart → Flutter → Riverpod → Flutter intermedio → OpenAI React+Nest
- v2: Programación → Dart → prompts · Flutter → Git · Riverpod → Flutter + Gemini → Flutter intermedio.

## Anexo D — Los 15 casos de muestra (entradas del quiz)

Formato: meta · nivel · domina · intereses · horas/semana × meses.

1. `react` · empiezo de cero · — · IA aplicada, SQL, sitios de contenido · 10 × 6 (primer ejemplo del usuario)
2. `java` · empiezo de cero · — · IA aplicada, SQL, agentes y vibe coding · 10 × 6 (segundo ejemplo)
3. `react` · empiezo de cero · — · — · 5 × 6
4. `angular` · empiezo de cero · — · IA aplicada, tiempo real · 8 × 6
5. `vue-node` · empiezo de cero · — · testing, docker · 12 × 8
6. `node` · tengo bases · javascript, git · microservicios, SQL · 10 × 4
7. `nest` · intermedio · javascript, typescript, node · testing, microservicios · 6 × 3
8. `python` · empiezo de cero · — · IA aplicada, SQL · 10 × 6
9. `ia-python` · empiezo de cero · — · agentes y vibe coding · 10 × 6
10. `ia` · empiezo de cero · — · IA aplicada · 6 × 6
11. `csharp` · empiezo de cero · — · testing, SQL, docker · 10 × 4
12. `php` · empiezo de cero · — · SQL, IA aplicada · 5 × 3
13. `go` · tengo bases · git · microservicios, docker · 8 × 4
14. `dart-movil` · empiezo de cero · — · IA aplicada · 10 × 6
15. `react-native` · tengo bases · javascript · IA aplicada, estilos · 10 × 3
