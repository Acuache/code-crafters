# SPEC 17 — Motor de rutas v2: orden por requisitos entre cursos y reglas en manos del admin

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 04, SPEC 07, SPEC 08, SPEC 10, SPEC 11, SPEC 12, SPEC 15
> **Fecha:** 2026-09-27
> **Objetivo:** Que el motor arme rutas con orden pedagógico, sin que ningún curso llegue antes de lo
> que necesita y con la dificultad subiendo de a poco, y que el admin edite desde `/admin` los
> requisitos entre cursos y los cursos de cada interés.

## Por qué existe este spec

Las rutas reales de React y Java desde cero no tenían sentido pedagógico: Fundamentos entero antes
del lenguaje, OpenAI con React + NestJS en una ruta de Java y Git apenas empezaba la ruta. La causa
raíz es que el motor del spec 04 no sabe qué curso necesita a cuál. El diagnóstico completo, las
alternativas y la decisión están en el
[ADR 0008](../docs/decisiones/0008-motor-v2-requisitos-y-admin.md). El plan, con los anexos del mapa
de requisitos y las 15 rutas de muestra que revisó el usuario, está en
`docs/investigacion/engine-v2-plan.md`.

**Se implementó sin pasar por `Borrador` → `Aprobado`.** El usuario lo pidió así por falta de tiempo:
aprobó el plan y revisó las muestras en vez del spec. Este archivo queda como registro de lo que se
hizo, con el mismo formato que los demás.

## Alcance

**Entra:**

- Dos tablas nuevas, `course_prerequisites` e `interest_courses`, con RLS y seed, más los niveles
  nuevos de Fundamentos, en una sola migración.
- `get_shared_path` devuelve la dificultad de cada curso.
- El motor reescrito (`lib/paths/build-path.ts`) con el contrato nuevo:
  `buildPath(profile, catalog, programs, rules)`.
- `loadCatalog` carga las reglas y los títulos de los cursos.
- La lista y el mapa de `/paths/[id]` y de `/shared/[slug]` se agrupan por tramo (Primeros pasos,
  Intermedio o Avanzado) y ya no por programa.
- "Qué quitamos y por qué" explica qué base le falta a un curso.
- En `/admin/courses/[slug]`, la tarjeta "Qué pide antes", con el chequeo de ciclos y el botón
  "Sugerir con IA".
- La página `/admin/interests` para agregar, quitar y reordenar los cursos de cada interés, con su
  entrada en la navegación del panel.
- Desactivar un curso que sugiere un interés remite a `/admin/interests`, y ya no a código.
- La ruta de ejemplo de la landing (`lib/landing/example-path.ts`) sigue el orden y las razones del
  motor nuevo: Docker, TypeScript y React. El mockup de la IA toma React (`EXAMPLE_MAIN_COURSE`).
- En el prompt de la personalización (`lib/ai/build-prompt.ts`), un curso que entró como requisito
  dice "lo necesita otro curso de la ruta", y no "requerido en la ruta oficial".
- **Arreglo del spec 11, encontrado al probar:** con el cupo diario de IA agotado (5 usos en 24 h), la
  ruta se generaba sin IA y sin avisar. Ahora `/paths/[id]` muestra "Ya usaste la IA 5 veces en las
  últimas 24 h" y en cuánto tiempo vuelve ("Ábrela de nuevo en 4 h 38 min"). El tiempo es relativo
  porque el servidor no conoce la zona horaria del navegador. El límite sigue en 5, por decisión del
  usuario.

**Fuera de alcance (para specs futuros):**

- Crear metas, intereses o tecnologías dominables desde el panel. Tocan el cuestionario, su zod y los
  prompts de la IA.
- Regenerar las rutas ya guardadas.
- Mostrar en el panel qué cursos piden a este ("lo necesitan").
- Límite diario para "Sugerir con IA": lo usa solo el admin.
- El cupo compartido entre el ajuste por texto libre y la personalización (5 usos en 24 h, ADR 0004),
  que dejó la ruta de Java del usuario sin título de IA.

## Composición de UI

Todo se arma con `components/ui/*`. No hay componentes visuales nuevos: las dos piezas nuevas del
panel componen `Card`, `Table`, `Select`, `Dialog`, `Badge` y `ConfirmDialog`, igual que
`course-placements.tsx`.

- **Ruta (`/paths/[id]` y `/shared/[slug]`):**
  - Cada unidad del mapa y cada grupo de la lista es un tramo.
  - `StepGroupHeading` muestra el eyebrow "Tramo N" y el título "Primeros pasos", "Intermedio" o
    "Avanzado".
  - Un tramo nunca retrocede: después del primer curso avanzado, lo que sigue queda en "Avanzado",
    aunque sea de principiante (Git en Java). Cada curso sigue mostrando su propia dificultad.
- **"Qué quitamos y por qué":**
  - El badge sigue corto: "le falta la base".
  - Debajo, en `text-xs`, dice qué falta: "Coincide con tu interés en IA aplicada, pero necesita
    Nest…, que no está en tu ruta."
- **Tarjeta "Qué pide antes"** (`components/admin/course-prerequisites.tsx`):
  - Una tabla con el curso (link a su edición), el tipo ("Necesita" en el badge `required` o
    "Conviene antes" en `outline`) y un botón para quitarlo, con confirmación.
  - "Agregar requisito" abre un diálogo con curso y tipo.
  - "Sugerir con IA" solo aparece con `OPENAI_API_KEY`. Lista las sugerencias con su razón y un
    botón "Agregar" en cada una. Si falla, muestra un error inline.
- **`/admin/interests`** (`components/admin/interest-courses.tsx`):
  - Una `Card` por interés, en grilla de dos columnas desde `lg`.
  - Cada `Card` tiene la lista numerada con subir, bajar y quitar, y un `Select` más "Agregar" al pie.
  - Los cursos en construcción llevan el badge "En construcción": el motor los salta.

## Casos borde

| Caso | Qué pasa |
|---|---|
| Un opcional o un interés cuya base no está en la ruta (OpenAI en React, sin Nest) | No entra: va a "Qué quitamos" con "le falta la base" y el detalle de qué falta |
| Un interés cuyo primer curso ya está en la ruta | Queda cubierto: el curso lo menciona en su porqué ("Coincide con tu interés en…") |
| Sobra tiempo | Entran más cursos de cada interés marcado, por turnos, si tienen su base y caben ("te sobraba tiempo para sumarlo") |
| El tiempo no alcanza | Se recortan desde el final intereses, opcionales y recomendados, y la base (Git) al último. Nunca un curso que otro necesita, ni un requerido. Lo que vuelve a caber regresa |
| La meta domina React | También cuenta JavaScript como dominado: dominar un curso incluye lo que necesita |
| Un paso de la meta solo tiene cursos en construcción (Kafka) | Va a "Qué quitamos" con "está en construcción". Si el paso tenía otra alternativa, entra esa y no se anota nada |
| Un requisito apunta a un curso inactivo | Se ignora: el curso no llega en el catálogo |
| Un curso "necesita" otro que está en construcción | El requisito no entra y aparece en "Qué quitamos" con "está en construcción" y "Lo necesitas antes de…" |
| Hay que recortar y el usuario marcó Docker (un opcional de Fundamentos) | Docker se recorta antes que los recomendados de la meta: cuenta como un opcional más. Solo la base no opcional (Git) espera al final |
| El admin pone primero, en un interés, un curso que la meta excluye (IA para Developers en IA con Python) | No entra: el interés prueba la siguiente opción |
| El admin cambia la base y Programación deja de ser el primer paso | El nuevo primer paso dice "Tu primer paso antes de {meta}.", sin hablar de programación |
| El admin intenta un ciclo (JavaScript necesita React) | Se rechaza: "Ese curso ya depende de este, directa o indirectamente". Los ciclos por `conviene` también cuentan |
| El admin agrega un requisito que ya existe | Mensaje de `course_prerequisites_pkey`: "Ese curso ya es requisito de este. Quítalo para cambiar el tipo." |
| El admin desactiva un curso que sugiere un interés | Se rechaza y remite a «Intereses» |
| Aun así queda un ciclo en la base (SQL a mano) | El orden topológico no se cuelga: lo que queda va en su orden de llegada |
| Rutas guardadas con el motor viejo | No se regeneran. Se ven agrupadas por tramo con el orden en que se guardaron |
| Sin `OPENAI_API_KEY` | El motor funciona igual. En el panel no aparece "Sugerir con IA" |

## Modelo de datos

### Migración `supabase/migrations/20260927120000_engine_rules.sql`

```sql
create type public.course_prerequisite_kind as enum ('necesita', 'conviene');

create table public.course_prerequisites (
  course_id bigint not null references public.courses (id) on delete cascade,
  prerequisite_course_id bigint not null references public.courses (id) on delete cascade,
  kind public.course_prerequisite_kind not null,
  primary key (course_id, prerequisite_course_id),
  constraint course_prerequisites_not_self check (course_id <> prerequisite_course_id)
);

create table public.interest_courses (
  interest_slug text not null,  -- sin FK: los intereses viven en lib/paths/interests.ts
  course_id bigint not null references public.courses (id) on delete cascade,
  position integer not null,
  primary key (interest_slug, course_id),
  constraint interest_courses_interest_slug_format check (interest_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
```

- Índices en `course_prerequisites (prerequisite_course_id)` e `interest_courses (course_id)`.
- RLS igual que `program_courses`: `select` para `anon, authenticated`, y escritura con
  `private.is_admin()`.
- Seed con `jsonb_to_recordset`: `data/course-prerequisites.json` (64 cursos, 101 requisitos) y
  `data/interest-courses.json` (12 intereses, 26 cursos). En ia-aplicada y agentes-vibe-coding cambian
  los cursos respecto de `INTERESTS` del spec 04 (Anexo B del plan).
- `update` de Fundamentos: Programación `requerido`, Git `recomendado` y el resto `opcional`.
- `create or replace function get_shared_path`: igual que en el spec 15, más `courseDifficulty`.

### Contrato del motor (`lib/paths/types.ts`)

```ts
type CatalogCourse = {
  slug: string;
  title: string;
  hours: number;
  difficulty: CourseDifficulty;
  inConstruction: boolean;
  outcome?: string;
};
type ProgramInput = { slug: string; name: string; steps: ProgramStepInput[] };
type CoursePrerequisites = { needs: string[]; bestAfter: string[] };
type EngineRules = {
  prerequisites: Record<string, CoursePrerequisites>;
  interestCourses: Record<InterestSlug, string[]>;
};
```

- `GoalDefinition` suma `excludedCourseSlugs?`. `ia-python` excluye el stack JavaScript del programa
  IA: Node, Nest, IA para Developers, Angular, React y Vue.
- `INTERESTS` queda solo con etiquetas.
- `lib/paths/discard-reasons.ts` fija los motivos cortos: "ya lo dominas", "está en construcción",
  "le falta la base", "superaba el cupo de intereses" y "no cabía en tu tiempo".

### El motor (`lib/paths/build-path.ts`), en orden

1. **Dominadas:** la puerta de cada tecnología marcada, más todo lo que ese curso necesita. Quien no
   empieza de cero ya sabe programar, y eso no se anota en "Qué quitamos".
2. **Base del principiante** (Fundamentos): Programación abre la ruta. El resto de lo no opcional se
   acomoda después. Lo opcional espera a ver si coincide con un interés.
3. **Programas de la meta:** un curso por paso requerido o recomendado. No entran los cursos en
   construcción ni los excluidos por la meta. Entre alternativas gana la que ya está en la ruta, la
   dominada o la marcada.
4. **Saca lo dominado.**
5. **Requisitos:** todo curso requerido o recomendado trae lo que necesita, con su nivel.
6. **Opcionales marcados por interés:** entran si su base está. Si no, "le falta la base".
7. **Intereses:** el primer curso de cada interés marcado que tenga su base, hasta el cupo del spec 04.
8. **Recorte y relleno** (ver Casos borde).
9. **Tiempo sobrante:** más cursos de los intereses, por turnos.
10. **Orden:**
    - Es topológico: `needs` y `bestAfter` siempre se respetan.
    - Cada curso tiene un ancla. Un curso de la meta va en su etapa oficial. Un requisito va justo
      antes del primero que lo necesita. Un interés u opcional va antes del primer curso más difícil
      de la meta y después de su base. La base (Git) va después del primer curso no principiante.
    - Desempate: dificultad y después horas.
11. **Etapas 1..N:** dos cursos comparten etapa solo si vienen de la misma etapa oficial y ninguno
    pide al otro.

### Vista (`lib/progress/group-steps.ts`)

- `groupStepsByTier` reemplaza a `groupStepsByProgram`.
- El tramo de cada etapa es la dificultad más alta alcanzada hasta ella. Nunca retrocede, y una etapa
  no se parte.
- `StepGroup` cambia `isInterestGroup` por `tierNumber`.
- `PathStepView` y `SharedPathStep` suman `courseDifficulty`.

## Plan de implementación

1. **Datos:** `data/course-prerequisites.json` y `data/interest-courses.json`, generados desde los
   anexos A y B del plan y verificados contra `data/courses.json`. Se describen en `data/SUMMARY.md`.
2. **Migración y test pgTAP** (`supabase/tests/engine_rules.sql`, 18 aserciones):
   - Aplicar con `npx supabase db push`.
   - Sumar las tablas y el enum nuevos a `lib/supabase/database.types.ts`.
3. **Contrato y motor:** `types.ts`, `goals.ts`, `interests.ts`, `discard-reasons.ts` y
   `build-path.ts`.
   - Se validó contra el prototipo del plan, que el usuario había revisado: el orden, las etapas y los
     descartes son idénticos en 5130 perfiles.
4. **Carga:** `lib/catalog/catalog.ts` (`buildEngineRules`, títulos, nombres de programa) y
   `generatePath`, que pasa `rules`.
5. **Tests del motor** (`build-path.test.ts`):
   - Casos fijos: las rutas de React y Java de las muestras, React con 5 h, React Native con React,
     Angular con tiempo real, React dominado, IA con Python y un interés sin base.
   - Invariantes sobre 19 × 3 × 3 × 4 perfiles.
6. **Vista por tramos:** `group-steps.ts`, `path-step.ts`, `/paths/[id]/page.tsx`, `path-steps-view`,
   `shared-path-steps`, `shared-path.ts`, `step-group-heading` y `discarded-steps`.
7. **Admin, requisitos:**
   - `prerequisite-schema.ts` y `prerequisite-cycles.ts`, con su test.
   - Las actions `addPrerequisite`, `removePrerequisite` y `suggestPrerequisites`.
   - `course-prerequisites.tsx` y su lugar en `/admin/courses/[slug]`.
8. **Admin, intereses:** `/admin/interests` (página y actions), `interest-courses.tsx` y
   `admin-nav.tsx`.
   - `engine-references.ts` recibe los intereses leídos de la base.
9. **IA para el admin:**
   - `lib/ai/prerequisite-suggestion.ts`, con test: el prompt y el schema con `z.enum` de slugs reales.
   - `requestPrerequisiteSuggestions` en `personalize-path.ts`, con el mismo modelo y el mismo timeout
     que la personalización.
10. **Docs:** el ADR 0008, este spec, las filas 17 y 18 de `docs/SPECS-MAP.md`, el estado en
    `CLAUDE.md` y el plan.

## Criterios de aceptación

- [x] React desde cero (IA, SQL, sitios; 10 h × 6 meses) arranca Programación → JavaScript, pone
      TypeScript en paralelo con React, Git después y Next.js al final. OpenAI aparece en "Qué quitamos"
      con "le falta la base".
- [x] Java desde cero no trae OpenAI con React + NestJS, y Kafka aparece en "Qué quitamos" con "está
      en construcción".
- [x] React con 5 h por semana incluye JavaScript, y Git sale por tiempo.
- [x] React Native incluye React antes de React Native Expo.
- [x] Angular con tiempo real suma Angular + Sockets, no React + Sockets.
- [x] Dominar React quita JavaScript.
- [x] En 19 metas × 3 niveles × 3 presupuestos × 4 conjuntos de intereses se cumple lo siguiente:
      - ningún curso llega antes de lo que necesita o conviene;
      - nada queda sin su base;
      - no hay cursos en construcción ni repetidos;
      - el principiante empieza con Programación;
      - las etapas son consecutivas y sin dependencias internas;
      - si dice que cabe, las horas no superan el presupuesto.
- [x] La migración se aplicó: 101 requisitos, 26 cursos de intereses y Fundamentos con los niveles
      nuevos (verificado por la API).
- [x] `loadCatalog` real contra Supabase devuelve las reglas, y el motor arma las rutas de React y Java
      igual que las muestras.
- [x] Un revisor independiente (subagente, solo lectura) estresó el motor con ~56.000 perfiles y
      ediciones del admin, sin romper ninguna invariante. Sus hallazgos medios y bajos se corrigieron:
      - el recorte ya no protege los opcionales de Fundamentos por encima de los recomendados;
      - un requisito en construcción se avisa;
      - un interés no suma un curso que la meta excluye;
      - la razón del primer paso ya no asume Programación;
      - la landing y el prompt de la IA se alinearon con el motor.
- [x] `npm run typecheck`, `npm run lint`, `npm run test` (348 tests), `npm run format:check` y
      `npm run build` pasan.
- [ ] `npx supabase test db` pasa con `engine_rules.sql`. No se corrió: Docker Desktop estaba apagado.
- [ ] Revisión en el navegador de la lista y el mapa por tramos, de "Qué quitamos", de
      `/admin/interests` y de la tarjeta de requisitos (agregar, ciclo, sugerir con IA). No se hizo: la
      extensión de Chrome no estaba conectada.

## Decisiones

- **Sí:** los requisitos entre cursos son datos (tabla) que edita el admin. **No:** parchear el motor
  por meta, porque cada meta nueva traería otro caso (ADR 0008).
- **Sí:** dos tipos, "necesita" (suma y ordena) y "conviene" (solo ordena). **No:** uno solo, porque
  "conviene" sumaría cursos que nadie pidió, y sin él no habría cómo ordenar TypeScript antes de
  Angular sin obligarlo.
- **Sí:** Fundamentos queda como programa editable con otra semántica: la base del principiante.
  **No:** una tabla aparte para la base, porque el panel de programas ya sabe editar niveles.
- **Sí:** Git llega después del primer curso intermedio o avanzado de la meta, y es lo último que se
  recorta. **No:** Git apenas empieza el lenguaje. **No:** darle un margen del 5 % para que siempre
  quepa (rompería "la ruta cabe en tu tiempo"). Lo decidió el usuario.
- **Sí:** con tiempo de sobra entran más cursos de los intereses marcados, por turnos y si tienen su
  base. **No:** dejar el tiempo sin usar. **No:** rellenar con opcionales de la meta, que en Angular
  traerían Astro y el curso viejo de Angular. Lo decidió el usuario al revisar las muestras.
- **Sí:** un curso de programa se queda en su etapa oficial aunque sea de principiante (SQL antes de
  Next.js). **No:** subirlo por dificultad, porque llegaría mucho antes de usarse. Lo decidió el
  usuario.
- **Sí:** el tramo es la dificultad más alta alcanzada y nunca retrocede. **No:** el tramo de cada
  etapa por su cuenta, porque la lista iría de Avanzado a Intermedio y de vuelta a Avanzado. Lo decidió
  el usuario.
- **Sí:** el mismo agrupamiento por tramo en la lista y en el mapa. **No:** dejar el mapa por programa,
  porque las dos vistas deben contar lo mismo (spec 12).
- **Sí:** "le falta la base" como badge corto y el detalle debajo. **No:** el detalle en el badge, que
  es `whitespace-nowrap` y lo cortaría.
- **Sí:** un interés sin base se anota sobre su primer curso. **No:** una fila "Tu interés en X" sin
  curso: `path_steps` exige `course_id`.
- **Sí:** la IA solo sugiere requisitos al admin, que confirma uno por uno. **No:** que la IA ordene o
  elija cursos al generar, porque sumaría espera y sin key no habría ruta (ADR 0001).
- **Sí:** los ciclos se chequean en la action, sobre las ~100 filas, con los dos tipos. **No:** un
  trigger en Postgres, porque la action ya es el único camino de escritura del panel y el motor tolera
  un ciclo sin colgarse.
- **Sí:** se implementó directo, sin el ciclo `Borrador` → `Aprobado`, a pedido del usuario por falta
  de tiempo. El plan aprobado y las muestras revisadas hicieron de spec.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El mapa inicial interpreta el texto de los instructores y puede equivocarse (Expo + Gemini pide "React Native o React", y entra en React web cuando sobra tiempo) | Se corrige desde `/admin/courses/[slug]` sin desplegar. "Sugerir con IA" ayuda a revisar |
| El admin crea requisitos contradictorios que no son ciclos | El motor sigue respetando todos los requisitos. El peor caso es una ruta más larga, no una rota |
| El orden por anclas es difícil de seguir leyendo el código | Cada paso es una función con nombre y comentario, y lo cubren invariantes con cientos de perfiles |
| Las rutas con mucho tiempo libre se inflan con cursos de interés | Solo entran cursos de intereses marcados y con su base. Si molesta, basta con recortar la lista del interés desde el panel |
| El spec toca archivos de otros specs (04, 07, 08, 10, 11, 12, 15) | Listados en las excepciones de `docs/SPECS-MAP.md` |
