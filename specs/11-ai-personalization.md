# SPEC 11 — Personalización con IA: la IA escucha el texto libre para ajustar la ruta y explicarla

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 03, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-09-23
> **Objetivo:** Que la IA escuche el texto libre del cuestionario en dos momentos: **al generar**,
> traduciéndolo a ajustes de las respuestas cerradas (meta, intereses, tecnologías dominadas) con
> los que el motor arma la ruta, mostrando qué se ajustó; y **sobre la ruta ya guardada**,
> reescribiendo título, resumen y razones (una sola vez, sola, al abrirla si hubo texto libre; sin
> botón). La IA nunca elige cursos sueltos, hay un límite de 5 usos por usuario cada 24 h, y sin
> key o si la llamada falla la app funciona igual con las respuestas tal cual.

## Por qué existe este spec

Es la Capa 2 del ADR 0001. La Capa 1 (el motor del spec 04) ya arma y guarda una ruta completa con
razones por plantilla parametrizadas (ADR 0004, pieza 3). Esas razones usan lo que el motor sabe
(plazo, tecnologías dominadas, programas fusionados), pero **no leen la respuesta de texto libre**
del cuestionario: el spec 06 la guarda en `assessments.answers.freeText` y hoy nadie la usa. Este
spec es el primero que la lee. Con ella la IA escribe una razón del tipo "Como ya manejas HTML y CSS
y quieres trabajar de frontend en 6 meses, empiezas por JavaScript moderno", que es lo que más luce
en el video (`docs/investigacion/ANALISIS-IA.md` §3 y §9).

La IA **no agrega, no quita y no reordena cursos** (ADR 0001 punto 3 y ADR 0004 punto 5). Solo
escribe texto sobre los pasos que ya existen, y los slugs que puede nombrar están acotados con
`z.enum` a los de la ruta. Si no hay `OPENAI_API_KEY`, la llamada tarda más de 15 s o la respuesta
no valida contra el schema, la ruta queda exactamente como estaba. `docs/ENUNCIADO.md` descalifica un
proyecto que no funcione al clonarlo, y el evaluador lo clona sin key.

**Dependencias, una por motivo distinto:**

- **SPEC 02**: `learning_paths`, `path_steps` y `assessments` con RLS por dueño, sobre las que esta
  migración agrega columnas. También `courses.outcome`/`difficulty`, que la IA recibe como contexto.
- **SPEC 03**: `requireUser()` de `lib/supabase/guards.ts`.
- **SPEC 07**: las filas de `learning_paths` + `path_steps` (con `assessment_id`) que se
  personalizan.
- **SPEC 08**: `app/(app)/paths/[id]/page.tsx`, donde se agregan la personalización automática y
  la lectura de las columnas `ai_*` (excepción explícita a la regla 5, ver Decisiones).
- **SPEC 09**: `app/(app)/dashboard/page.tsx`, que pasa a mostrar el título de la IA cuando existe
  (excepción explícita a la regla 5, ver Decisiones).

## Alcance

**Entra:**

- Migración `supabase/migrations/<timestamp>_ai_personalization.sql` (regla 6 del mapa: el 11 es uno
  de los cuatro specs con migración propia):
  - Columnas `learning_paths.ai_title`, `learning_paths.ai_summary`,
    `learning_paths.personalized_at` y `path_steps.ai_reason`, todas nullable.
  - La tabla `ai_personalizations`: el registro de usos para el límite diario, con RLS.
  - La función `public.apply_ai_personalization(...)`, `security invoker`, que escribe el título, el
    resumen y las razones en una sola transacción.
- Regenerar `lib/supabase/database.types.ts` con el MCP de Supabase (`generate_typescript_types`)
  después de aplicar la migración. Es la única modificación a `lib/supabase/*`.
- Dependencias nuevas en `package.json`: `ai` y `@ai-sdk/openai` (Vercel AI SDK, el stack de
  `docs/ROADMAP.md`).
- `lib/ai/personalization-schema.ts`: `buildPersonalizationSchema(courseSlugs)`, el schema zod de la
  respuesta del modelo, con los slugs acotados a los de la ruta.
- `lib/ai/build-prompt.ts`: `buildPersonalizationPrompt(input)`, función pura que arma el prompt a
  partir del perfil, el texto libre y los pasos vigentes.
- `lib/ai/daily-limit.ts`: `DAILY_PERSONALIZATION_LIMIT = 5` y `remainingPersonalizations(usedCount)`.
- `lib/ai/personalize-path.ts` (solo servidor): `requestPersonalization(input)`, que llama al modelo
  con timeout de 15 s y devuelve el objeto validado o `null`. No lanza nunca.
- `lib/ai/actions.ts` (`'use server'`): `personalizePath(pathId)`.
- Los tests de las tres funciones puras: `lib/ai/{personalization-schema,build-prompt,daily-limit}.test.ts`.
- `components/ai/auto-personalizer.tsx` (cliente): dispara `personalizePath` una vez al montarse,
  con su `Spinner` y el `Alert` de falla. Sin botón. _(Durante la implementación empezó como
  `personalize-button.tsx`, con botón "Personalizar con IA" / "Volver a personalizar" y contador
  "Te quedan N de 5 hoy"; el usuario lo quitó, ver Decisiones.)_
- **Excepción a la regla 5 (spec 08):** en `app/(app)/paths/[id]/page.tsx`, leer las columnas
  `ai_*`, mostrar `ai_title ?? title`, `ai_summary ?? summary` y, por paso, `ai_reason ?? reason`;
  mostrar `AiBadge` en la cabecera cuando `personalized_at` no es `null`; y renderizar
  `AutoPersonalizer` en la cabecera cuando corresponde. No se toca nada más de ese archivo ni ningún componente de
  `components/paths/*`: `step-row.tsx` sigue mostrando `step.reason`, que ahora llega ya resuelto.
- **Excepción a la regla 5 (spec 09):** en `app/(app)/dashboard/page.tsx`, agregar `ai_title` al
  `select` y mostrar `ai_title ?? title` en la tarjeta. No se toca nada más de ese archivo.
- **Personalización automática una vez por ruta** _(agregado durante la implementación, decisión del
  usuario)_: si hay key, la ruta no está personalizada, el usuario escribió texto libre en el
  cuestionario, no hay ningún intento previo registrado para esa ruta en `ai_personalizations` y
  le quedan usos del día, `/paths/[id]` dispara la personalización sola al cargar. La ruta aparece
  al instante y el texto de la IA llega después. No hay forma de rehacerlo ni de pedirlo a mano.
- **Excepción a la regla 5 (spec 06):** en `components/quiz/steps/free-text-step.tsx`, solo el
  texto de ayuda del campo: tiene que decir la verdad con y sin key (con IA, ajustamos tu ruta
  según lo que cuentes y te mostramos qué cambió; los cursos siempre salen de las rutas oficiales).
- **Excepción a la regla 5 (spec 06), bug encontrado durante la implementación:** en
  `components/quiz/quiz-form.tsx`, una `key` distinta en los botones "Siguiente" y "Guardar mis
  respuestas". React reusaba el mismo `<button>` cambiándole el `type`, y el clic en "Siguiente" del
  paso 5 terminaba enviando el formulario: el paso de texto libre se salteaba y todas las rutas se
  generaban con `freeText = ""`. Sin esta corrección, nada de este spec que dependa del texto libre
  puede funcionar. Conviene commitearla aparte (`fix(quiz): …`), porque el bug es del spec 06.
- **La IA ajusta las respuestas al generar** _(agregado durante la implementación, decisión del
  usuario: "es irónico decirle a la IA que personalice si no escucha al usuario")_:
  - Migración nueva `supabase/migrations/<timestamp>_ai_profile_adjustments.sql`: columna
    `learning_paths.ai_adjustments jsonb` (nullable).
  - `lib/ai/profile-adjustment.ts` (puro): el schema de la respuesta, el prompt y
    `applyProfileAdjustment()`, que aplica los ajustes a las respuestas y devuelve solo los cambios
    que de verdad cambiaron algo. Con su test.
  - `lib/ai/personalize-path.ts`: `requestProfileAdjustment()`, misma política que
    `requestPersonalization` (nunca lanza, `null` ante cualquier falla) con timeout de 8 s.
  - **Excepción a la regla 5 (spec 07):** en `app/(app)/paths/actions.ts`, antes de `buildPath()`,
    si hay key, texto libre y usos disponibles: registrar el uso, pedir el ajuste, aplicarlo y
    generar con el perfil ajustado; guardar el cambio en `ai_adjustments`. Las respuestas originales
    de `assessments` no se tocan. Nada más de ese archivo cambia.
  - `components/ai/profile-adjustments-note.tsx` (Server Component): en `/paths/[id]`, un aviso
    "Ajustamos tu ruta por lo que contaste" con la explicación de la IA y cada cambio (meta, intereses
    y tecnologías sumados o quitados), con `AiBadge`.
- `.env.example`: agregar `OPENAI_API_KEY=` con un comentario que aclara que es opcional y solo del
  servidor.
- Actualizar `docs/SPECS-MAP.md`: en la regla 5, que el 11 es dueño de `lib/ai/*` y
  `components/ai/*`, más las dos excepciones; en la §4, cerrar la decisión del límite diario.

**Qué NO entra (queda para otros specs o fuera del MVP):**

- `programHints` como campo nuevo de `LearnerProfile`: el ajuste de respuestas cubre lo mismo (una
  meta distinta cambia los programas combinados) sin tocar `lib/paths/*`. `LearnerProfile` y
  `buildPath()` no cambian.
- `skip`/`add`: la IA no quita, no agrega y no reordena cursos sueltos (ADR 0001 y ADR 0004). Solo
  ajusta respuestas de listas cerradas; los cursos los sigue eligiendo el motor.
- Ajustar `level`, `hoursPerWeek` o `deadlineMonths` desde el texto libre: son datos que el usuario
  eligió explícitamente con controles numéricos o de nivel, y el presupuesto de horas depende de
  ellos.
- Confirmar el ajuste antes de generar: se muestra después, en la ruta. El spec 16 ("Ajustar mi
  ruta") es el que agrega confirmación y edición a mano.
- Reescribir los motivos de descarte (`discard_reason`) o las razones de los pasos descartados:
  solo se personalizan los pasos vigentes (`status <> 'discarded'`).
- Redactar título, resumen y razones dentro de `generatePath` (spec 07): eso corre después, desde
  `/paths/[id]`. Dentro de `generatePath` solo entra el ajuste de respuestas, con su propio timeout
  de 8 s y sin bloquear nunca la generación.
- Streaming de la respuesta.
- Un interruptor para ver el texto por plantilla una vez personalizada la ruta. Los textos originales
  se conservan en la base, pero no hay UI para verlos.
- Caché por hash de perfil (`ANALISIS-IA.md` §8): cada clic es una llamada nueva, acotada por el
  límite diario.
- El cuestionario prellenado con confirmación y edición a mano ("Ajustar mi ruta"): es del spec
  16, que reusará `requestProfileAdjustment`, el límite y la tabla `ai_personalizations` de este
  spec.
- Tocar `lib/paths/*`, `lib/catalog/*`, `lib/progress/*`, `app/(app)/paths/actions.ts` (salvo el
  ajuste antes de `buildPath()`), `app/(app)/paths/[id]/actions.ts`, `components/paths/*`, `components/quiz/*` (salvo el texto de
  ayuda de `free-text-step.tsx`), `components/dashboard/*`, `components/brand/*`, o de
  `lib/supabase/*` algo más que `database.types.ts`.

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*` y `@phosphor-icons/react` (sufijo `Icon`;
desde `/ssr` en `page.tsx`, y desde el módulo principal en `auto-personalizer.tsx`, que es de
cliente). El lima `--ai` se reserva para lo generado por la IA (comentario de
`components/brand/ai-badge.tsx`). Las piezas nuevas son `components/ai/auto-personalizer.tsx` (se
separa porque es la única parte con estado de cliente) y `components/ai/profile-adjustments-note.tsx`;
las dos son composiciones.

| Elemento                             | Qué se reusa                                                                                                                                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marca de ruta personalizada          | `AiBadge` ("Generado con IA") al lado del `Eyebrow` "Tu ruta de aprendizaje", solo si `personalized_at` no es `null`. Se usa tal cual, sin modificarlo                                                                                                    |
| Cargando                             | `Spinner` + "Personalizando tu ruta con lo que nos contaste…" en `text-muted-foreground`, debajo del resumen. La ruta sigue visible y usable debajo. Sin botón ni contador de usos                                                                            |
| Falla (timeout o respuesta inválida) | `Alert` (variante por defecto, no destructiva) con `InfoIcon`: "No pudimos personalizar el texto de tu ruta ahora. Tu ruta sigue igual." El uso igual se descuenta (ver Decisiones) y no se reintenta                                                      |
| Ajuste de respuestas                 | `components/ai/profile-adjustments-note.tsx`, ver "Ajuste de respuestas al generar"                                                                                                                                                                       |
| Éxito                                | Sin `Alert`: la página se revalida y aparecen el título, el resumen y las razones nuevas junto con el `AiBadge`                                                                                                                                           |
| Título en el dashboard               | `ai_title ?? title` en el `CardTitle` de la tarjeta existente. Nada más cambia                                                                                                                                                                            |

Antes de escribir la UI, confirmar en `components/ui/alert.tsx`, `button.tsx` y `badge.tsx` que
las variantes de la tabla existen. Si alguna no existe, se usa la más cercana que sí existe, sin
crear una nueva.

## Modelo de datos

### Migración `<timestamp>_ai_personalization.sql`

```sql
alter table public.learning_paths
  add column ai_title text,
  add column ai_summary text,
  add column personalized_at timestamptz;

alter table public.path_steps
  add column ai_reason text;

-- Un registro por intento que llega a llamar al modelo (éxito o falla). Es la base del límite
-- diario; el spec 16 lo reusa para la traducción de texto libre a chips.
create table public.ai_personalizations (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path_id uuid references public.learning_paths (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_personalizations_user_id_created_at_idx
  on public.ai_personalizations (user_id, created_at);
create index ai_personalizations_path_id_idx on public.ai_personalizations (path_id);

alter table public.ai_personalizations enable row level security;

-- Solo select + insert del dueño. Sin update ni delete: un usuario no puede borrar sus
-- registros para saltarse el límite.
create policy "ai_personalizations_owner_select" on public.ai_personalizations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_personalizations_owner_insert" on public.ai_personalizations
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Escribe título, resumen y razones en una sola transacción. security invoker: corre con los
-- permisos del usuario, así que la RLS de learning_paths/path_steps (spec 02) sigue aplicando.
create function public.apply_ai_personalization(
  p_path_id uuid,
  p_title text,
  p_summary text,
  p_reasons jsonb -- [{ "courseSlug": "...", "reason": "..." }]
) returns void
language plpgsql
security invoker
set search_path = ''
as $$ ... $$;
-- 1) update learning_paths set ai_title, ai_summary, personalized_at = now() where id = p_path_id;
--    si no tocó ninguna fila (ruta ajena o inexistente) → raise exception
-- 2) update path_steps set ai_reason = r.reason
--    from jsonb_to_recordset(p_reasons) r join courses c on c.slug = r."courseSlug"
--    where path_steps.path_id = p_path_id and path_steps.course_id = c.id
--      and path_steps.status <> 'discarded'
```

El cuerpo exacto de la función, las políticas y los índices se revisan con la skill
`supabase-postgres-best-practices` antes de aplicarlos, y después se corre `get_advisors` del MCP de
Supabase. `ai_reason` de un paso que la IA no nombró queda como estaba: si antes era `null`, la vista
sigue mostrando la razón por plantilla.

### `lib/ai/personalization-schema.ts`

```ts
export const MAX_TITLE_LENGTH = 80;
export const MAX_SUMMARY_LENGTH = 400;
export const MAX_REASON_LENGTH = 240;

export function buildPersonalizationSchema(courseSlugs: [string, ...string[]]) {
  return z.object({
    title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
    summary: z.string().trim().min(1).max(MAX_SUMMARY_LENGTH),
    reasons: z.array(
      z.object({
        courseSlug: z.enum(courseSlugs), // solo slugs de pasos vigentes de ESTA ruta
        reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
      }),
    ),
  });
}
export type Personalization = z.infer<
  ReturnType<typeof buildPersonalizationSchema>
>;
```

Si el modelo repite un slug, gana la última razón. Si omite alguno, ese paso conserva su razón
anterior. La forma exacta de `z.enum` con un arreglo dinámico en zod 4 se confirma con Context7 en
el paso 2 del plan.

### `lib/ai/build-prompt.ts`

```ts
export type PersonalizationInput = {
  profile: {
    goalLabel: string; // GOALS[goal].label, no el slug
    level: ExperienceLevel;
    masteredTechnologies: string[]; // labels de TECHNOLOGIES
    interests: string[]; // labels de INTERESTS
    hoursPerWeek: number;
    deadlineMonths: number;
  };
  freeText: string; // "" si el usuario no escribió nada
  budgetHours: number | null;
  steps: {
    courseSlug: string;
    courseTitle: string;
    hours: number;
    difficulty: string | null;
    outcome: string | null; // courses.outcome (spec 01): el ÚNICO contenido del curso que ve la IA
    origin: StepOrigin;
    programName: string | null;
    templateReason: string; // la razón de la Capa 1, como punto de partida
  }[];
};

export function buildPersonalizationPrompt(input: PersonalizationInput): {
  system: string;
  prompt: string;
};
```

El prompt de sistema fija, en español: tono cercano y de tú, no inventar contenido de un curso más
allá de su `outcome`, no sugerir cursos que no están en la lista, no prometer resultados laborales y
respetar los largos máximos. El `freeText` va delimitado como dato del usuario, no como instrucción,
para que un "ignora lo anterior" escrito en el cuestionario no cambie las reglas. En ningún caso
sale del schema: lo que el modelo escriba fuera de él se descarta.

### `lib/ai/daily-limit.ts`

```ts
export const DAILY_PERSONALIZATION_LIMIT = 5;
export function remainingPersonalizations(usedInLast24h: number): number; // nunca < 0
```

"Día" = ventana móvil de 24 h (`created_at > now() - interval '24 hours'`), no día calendario. Así no
depende de la zona horaria del usuario.

### `lib/ai/personalize-path.ts`

```ts
import "server-only";

export const PERSONALIZATION_MODEL = "..."; // modelo "mini" de OpenAI, fijado en el paso 1
export const PERSONALIZATION_TIMEOUT_MS = 15_000;

export function isAiConfigured(): boolean; // Boolean(process.env.OPENAI_API_KEY)

export async function requestPersonalization(
  input: PersonalizationInput,
): Promise<Personalization | null>;
// Llama al modelo con salida estructurada (schema de arriba) y abort a los 15 s.
// Sin key, timeout, error de red o de la API, o respuesta que no valida → null. Nunca lanza.
// Registra el motivo con console.error (sin el prompt ni la key) para depurar en los logs de Vercel.
```

La API exacta del AI SDK (salida estructurada con un schema de zod y `abortSignal`) y el nombre y el
precio del modelo se confirman con Context7 y en platform.openai.com en el paso 1, no de memoria.

### `lib/ai/actions.ts`

```ts
type PersonalizePathResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "limit_reached" | "failed" | "not_found" };

personalizePath(pathId: string): Promise<PersonalizePathResult>;
```

1. `pathId` revalidado con zod (uuid) y `requireUser()`.
2. `isAiConfigured()` es `false` → `not_configured`, sin llamar a nada.
3. Contar las filas propias de `ai_personalizations` de las últimas 24 h. Si
   `remainingPersonalizations(count) === 0` → `limit_reached`.
4. Cargar la ruta (RLS: ajena o inexistente → `not_found`), su `assessments.answers` (revalidado con
   `assessmentAnswersSchema` del spec 06) y sus pasos vigentes con `courses(slug, title, hours,
difficulty, outcome)` y `programs(name)`. Una ruta sin `assessment_id` (el assessment se borró)
   se personaliza igual, con `freeText = ""` y el perfil vacío.
5. Insertar la fila en `ai_personalizations` **antes** de llamar al modelo.
6. `requestPersonalization(...)`. `null` → `failed`.
7. `rpc("apply_ai_personalization", ...)`. Error → `failed`.
8. `revalidatePath("/paths/{id}")` y `revalidatePath("/dashboard")` → `{ ok: true }`.

El cliente traduce cada `reason` al texto de la tabla de UI. Nunca se muestra el error crudo.

### Lo que cambia en las dos páginas existentes

```ts
// /paths/[id]: el select de learning_paths suma "ai_title, ai_summary, personalized_at", el de
//   path_steps suma "ai_reason". En el mapeo: title = ai_title ?? title, summary = ai_summary ??
//   summary, reason = ai_reason ?? reason. Además, shouldAutoPersonalize(): key configurada, ruta
//   sin personalizar, texto libre escrito, usos disponibles y cero intentos previos sobre esa ruta.
// /dashboard: el select de learning_paths suma "ai_title"; title = ai_title ?? title.
```

### Ajuste de respuestas al generar _(agregado durante la implementación)_

Migración `<timestamp>_ai_profile_adjustments.sql`:

```sql
-- Qué cambió la IA en las respuestas antes de que el motor armara la ruta. null = no hubo ajuste
-- (sin key, sin texto libre, sin usos, falla, o la IA no cambió nada).
alter table public.learning_paths add column ai_adjustments jsonb;
```

`lib/ai/profile-adjustment.ts` (puro, con test):

```ts
// Respuesta del modelo. Sin .optional(): OpenAI no lo acepta en salida estructurada; "sin cambio"
// es null o [].
export const profileAdjustmentSchema = z.object({
  goal: z.enum(goalSlugs).nullable(), // null = la meta queda como la eligió
  addInterests: z.array(z.enum(interestSlugs)),
  removeInterests: z.array(z.enum(interestSlugs)),
  addMastered: z.array(z.enum(technologySlugs)),
  removeMastered: z.array(z.enum(technologySlugs)),
  explanation: z.string().trim().min(1).max(240), // qué entendió de su texto, de tú
});

export type AppliedAdjustment = {
  goal: { from: GoalSlug; to: GoalSlug } | null;
  addedInterests: InterestSlug[];
  removedInterests: InterestSlug[];
  addedMastered: TechnologySlug[];
  removedMastered: TechnologySlug[];
  explanation: string;
}; // lo que se guarda en learning_paths.ai_adjustments

export function applyProfileAdjustment(
  profile: LearnerProfile,
  adjustment: ProfileAdjustment,
): { profile: LearnerProfile; applied: AppliedAdjustment | null };
// Solo registra los cambios efectivos: sumar un interés que ya estaba, quitar uno que no estaba o
// "cambiar" la meta a la misma no cuenta. Si no queda ningún cambio efectivo → applied = null.
// Un slug que aparece en add y remove a la vez se ignora. No muta la entrada.

export function buildProfileAdjustmentPrompt(profile: LearnerProfile, freeText: string): {
  system: string;
  prompt: string;
};
// Le da al modelo las respuestas actuales y la lista cerrada de metas, intereses y tecnologías
// (slug + nombre). Regla: solo cambiar lo que el texto justifica de forma clara; ante la duda, no
// cambiar nada. El texto libre va delimitado como dato, igual que en build-prompt.ts.
```

En `generatePath` (spec 07), entre revalidar las respuestas y `buildPath()`:

```ts
// 1. Si isAiConfigured() && freeText.trim() !== "" && quedan usos (countPersonalizationsInLast24h):
//    insertar el uso en ai_personalizations (path_id null: la ruta todavía no existe),
//    requestProfileAdjustment(profile, freeText) con timeout de 8 s.
// 2. Si devuelve algo: applyProfileAdjustment → perfil ajustado + applied.
// 3. buildPath(perfilAjustado ?? profile, ...). learning_paths.insert suma ai_adjustments: applied.
// Cualquier falla en 1-2 → se genera con el perfil original, sin error visible.
```

`components/ai/profile-adjustments-note.tsx` (Server Component) en `/paths/[id]`, solo si
`ai_adjustments` no es `null`: `Alert` (variante por defecto) con `AiBadge`, título "Ajustamos tu
ruta por lo que contaste", la `explanation` y una lista de `Badge`: "Meta: React → React Native",
"+ IA aplicada", "− Docker", "Ya dominas: JavaScript". Nombres desde `GOALS`, `INTERESTS` y
`TECHNOLOGIES`, nunca slugs.

## Plan de implementación

1. **Dependencias y verificación de API.** Con Context7, confirmar la API actual del AI SDK
   (salida estructurada con zod 4, `abortSignal`, manejo de errores) y del provider de OpenAI.
   Elegir el modelo "mini" más barato que soporte salida estructurada, verificando precio y
   disponibilidad en platform.openai.com, y fijarlo en `PERSONALIZATION_MODEL`. Instalar `ai` y
   `@ai-sdk/openai`. Agregar `OPENAI_API_KEY=` a `.env.example`. Verificación: `npm run build` pasa;
   `OPENAI_API_KEY` está en `.env.local` (ya lo está) y `git status` no lo muestra.
2. **Funciones puras + tests**: `personalization-schema.ts`, `build-prompt.ts`, `daily-limit.ts`.
   Casos: el schema rechaza un slug que no está en la ruta, un título de 81 caracteres y una razón
   vacía, y acepta un `reasons` que omite pasos; el prompt incluye el `freeText` delimitado, los
   `outcome` de cada paso y ningún paso descartado, y con `freeText = ""` no menciona texto libre;
   `remainingPersonalizations` da 5, 1, 0 y 0 para 0, 4, 5 y 7 usos. Verificación: `npm run test`
   en verde junto con los tests de los specs anteriores.
3. **Migración.** Antes de escribirla, cargar la skill `supabase-postgres-best-practices`. Aplicarla
   con el MCP de Supabase (`apply_migration`), guardar el mismo SQL en `supabase/migrations/` y
   regenerar `lib/supabase/database.types.ts`. Verificación: `get_advisors` sin avisos nuevos de
   seguridad; con `execute_sql`, dentro de una transacción revertida y como `authenticated`,
   comprobar que (a) un usuario inserta y lee sus propias filas de `ai_personalizations` pero no las
   de otro, ni puede borrarlas, y (b) `apply_ai_personalization` sobre una ruta ajena lanza error y
   no cambia filas.
4. **`requestPersonalization`**: `lib/ai/personalize-path.ts`. Verificación: con un script
   descartable (no se commitea) sobre una ruta real, devuelve un objeto válido en menos de 15 s;
   con `PERSONALIZATION_TIMEOUT_MS` bajado a 1 ms temporalmente devuelve `null` sin lanzar; sin
   `OPENAI_API_KEY` devuelve `null`.
5. **`personalizePath`**: `lib/ai/actions.ts`, con los ocho pasos de arriba. Antes de escribirla,
   confirmar en `node_modules/next/dist/docs/` la firma actual de `revalidatePath` en una server
   action. Verificación: compila; se ejercita en el paso 6.
6. **UI**: `components/ai/auto-personalizer.tsx`, la excepción en
   `app/(app)/paths/[id]/page.tsx` (lee también `assessments(answers)` y decide con
   `shouldAutoPersonalize`) y el texto de ayuda de `free-text-step.tsx`. Verificación: con key, una
   ruta nueva generada con texto libre muestra "Personalizando tu ruta con lo que nos contaste…" al
   abrirla, la ruta sigue visible, y al terminar cambian el título, el resumen y las razones y
   aparece el `AiBadge`; al recargar no vuelve a correr; una ruta sin texto libre no se personaliza.
   Por SQL, `ai_title`, `ai_summary`, `personalized_at` y los `ai_reason` quedaron escritos,
   `title`, `summary` y `reason` no cambiaron, y los pasos descartados tienen `ai_reason` en `null`.
7. **Dashboard**: la excepción en `app/(app)/dashboard/page.tsx`. Verificación: la tarjeta de la
   ruta personalizada muestra el título de la IA y las demás siguen con el suyo.
8. **Ajuste de respuestas: lógica pura y llamada** _(agregado)_. `lib/ai/profile-adjustment.ts` +
   test y `requestProfileAdjustment()`. Casos del test: una meta nueva se aplica y se registra
   `from → to`; la misma meta no cuenta como cambio; sumar un interés ya presente o quitar uno
   ausente no cuenta; un slug en add y remove a la vez se ignora; sin cambios efectivos
   `applied = null`; la entrada no se muta; el prompt delimita el texto libre y lista las opciones
   cerradas. Verificación con llamada real (test descartable): "no me interesa Docker, quiero
   meterle IA a mis apps" sobre un perfil con Docker quita Docker y suma IA aplicada; un texto
   neutro ("quiero aprender") no cambia nada.
9. **Migración y generación** _(agregado)_. Aplicar `ai_profile_adjustments` con el MCP, guardar el
   SQL y regenerar los tipos; excepción en `generatePath`. Verificación: generar desde `/quiz` con
   texto libre que pida un cambio claro → `ai_adjustments` guardado (SQL), la ruta refleja el
   cambio (p. ej. aparece el curso del interés sumado) y `assessments.answers` queda intacto; sin
   texto libre → `ai_adjustments` null y no se registra uso.
10. **Aviso en la ruta y texto del cuestionario** _(agregado)_. `profile-adjustments-note.tsx` en
    `/paths/[id]` y el texto de ayuda de `free-text-step.tsx`. Verificación: la ruta del paso 9
    muestra "Ajustamos tu ruta por lo que contaste" con los cambios por nombre; una ruta sin ajuste
    no muestra nada.
11. **Caminos degradados.** (a) Sin `OPENAI_API_KEY` (comentada en `.env.local` y servidor
   reiniciado): `/quiz` (con texto libre) → `/paths/[id]` → marcar progreso → `/dashboard` funciona
   entero, sin ajuste, sin aviso y sin personalización, y una ruta ya personalizada sigue mostrando
   su texto de IA. (b) Con el timeout de la redacción a 1 ms: aparece el `Alert` de falla, la ruta
   no cambia (SQL), se registra el uso y al recargar no se reintenta; con el timeout del ajuste a 1
   ms, la ruta se genera igual con las respuestas originales. (c) Límite: con filas de prueba
   insertadas por SQL hasta 5, una ruta nueva con texto libre se genera sin ajuste y no se
   personaliza sola; llamar a `personalizePath` igual devuelve `limit_reached` sin insertar otra
   fila. Limpiar las filas de prueba al terminar.
12. **Seguridad de la key y cierre.** Verificar con `grep` sobre `.next/static` después de
   `npm run build` que el valor de la key no aparece en ningún bundle de cliente, y que
   `lib/ai/personalize-path.ts` importa `server-only`. Actualizar `docs/SPECS-MAP.md` (regla 5 y §4).
   Verificación: `npm run test`, `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [x] `/paths/[id]` no tiene botón de personalizar ni contador de usos. Sin la key, nada de la IA
      se ejecuta ni se muestra y el resto de la app funciona igual. *(sin key: 0 consultas a
      Supabase y `null` en las dos llamadas, test descartable del paso 11; flujo completo verificado
      por el usuario en el navegador)*
- [x] Personalizar una ruta escribe `ai_title`, `ai_summary`, `personalized_at` y el `ai_reason` de
      los pasos vigentes que nombró la IA (verificado por SQL), sin cambiar `title`, `summary`,
      `reason`, ni ningún `course_id`, `status`, `stage` o `position` de `path_steps`. *(SQL: 0
      rutas personalizadas incompletas y 0 pasos con `ai_reason = reason`; la función solo actualiza
      columnas `ai_*` y `personalized_at`, probado en bloque revertido en el paso 3)*
- [x] Tras personalizar, la vista muestra el texto de la IA donde existe y la razón por plantilla en
      los pasos que la IA no nombró, con el `AiBadge` en la cabecera. *(verificado por el usuario)*
- [x] Los pasos descartados nunca reciben `ai_reason` y el acordeón "Qué quitamos y por qué" no
      cambia. *(SQL: 0 descartados con `ai_reason`; la función filtra `status <> 'discarded'`)*
- [x] El schema rechaza cualquier `courseSlug` que no sea un paso vigente de esa ruta. Una respuesta
      que no valida no escribe nada y muestra el `Alert` de falla. *(test del schema; una respuesta
      inválida hace lanzar a `generateText`, que cae en el mismo `null` → `failed` que el timeout)*
- [x] Una llamada que supera los 15 s se corta, no escribe nada y muestra el `Alert` de falla. La
      ruta sigue usable en todo momento. *(timeout forzado: `null` en 4 ms, sin lanzar)*
- [x] Cada intento que llega a llamar al modelo inserta una fila en `ai_personalizations`. Con 5
      filas en las últimas 24 h no se ajusta ni se personaliza nada solo, y `personalizePath`
      devuelve `limit_reached` sin insertar otra ni llamar al modelo. *(test descartable con 5 usos:
      solo cuenta, no inserta; prueba con el usuario al límite: ruta sin ajuste ni personalización y
      sin usos nuevos por SQL)*
- [x] Un usuario no puede leer, modificar ni borrar las filas de `ai_personalizations` de otro, ni
      borrar las suyas; `apply_ai_personalization` sobre una ruta ajena no cambia filas (verificado
      como `authenticated` en una transacción revertida). *(paso 3: select ajeno 0, delete/update
      propios 0, insert con otro `user_id` 42501, apply ajeno P0002, `anon` 42501)*
- [x] Con key, una ruta cuyo cuestionario tiene texto libre se personaliza sola la primera vez que
      se abre `/paths/[id]`, y nunca más automáticamente (ni si ese intento falló). Una ruta sin
      texto libre no se personaliza sola. *(SQL: la ruta ajustada tiene exactamente 1 intento; 0
      rutas sin texto libre con IA)*
- [x] El texto de ayuda del último paso del cuestionario no promete nada que no pase sin key.
- [x] Con key, un texto libre que pide un cambio claro ajusta las respuestas antes de generar: la
      ruta refleja el cambio, `learning_paths.ai_adjustments` guarda solo los cambios efectivos y
      `assessments.answers` queda intacto (verificado por SQL). *("no me interesa Docker, quiero
      meterle IA a mis apps": − Docker / + IA aplicada, 2 cursos de IA en la ruta, `answers` sigue
      con `docker`)*
- [x] La IA solo puede ajustar meta, intereses y tecnologías dominadas, con valores de las listas
      cerradas; nunca nivel, horas, plazo ni cursos sueltos (garantizado por el schema). *(tests:
      interés y meta inventados se rechazan)*
- [x] `/paths/[id]` muestra "Ajustamos tu ruta por lo que contaste" con cada cambio por nombre
      cuando hubo ajuste, y nada cuando no. *(verificado por el usuario)*
- [x] Sin key, sin texto libre, sin usos disponibles o si el ajuste falla o tarda más de 8 s, la
      ruta se genera igual con las respuestas originales y `ai_adjustments` queda en `null`. Generar
      nunca queda bloqueado por el límite. *(los cuatro casos en el test descartable del paso 11)*
- [x] Cada ajuste que llega a llamar al modelo cuenta como un uso en `ai_personalizations`.
      *(timeout del ajuste: cuenta + insert antes de la llamada)*
- [x] El dashboard muestra `ai_title` en las rutas personalizadas y `title` en las demás.
- [x] Generar una ruta sin texto libre, sin key o sin usos disponibles nunca llama a la IA, y
      generar nunca queda bloqueado por el límite. _(Reescrito al cerrar el spec: la versión
      original decía "generar nunca llama a la IA", que dejó de ser cierto con el ajuste de
      respuestas al generar, decidido por el usuario durante la implementación.)_
- [x] La key no aparece en ningún archivo commiteado ni en `.next/static`; solo vive en
      `.env.local` (local) y en las variables de entorno de Vercel. *(0 coincidencias del valor en
      ambos; la única mención del nombre en `.next/static` es el texto de la demo de
      `/sistema-diseno`)*
- [x] `lib/ai/*.test.ts` cubre los casos del paso 2 del plan. *(más `profile-adjustment.test.ts`
      del paso 8)*
- [x] Ningún archivo de este spec modifica `lib/paths/*`, `lib/catalog/*`, `lib/progress/*`,
      `components/paths/*`, `components/dashboard/*` o `components/brand/*`; de `components/quiz/*`
      solo cambian el texto de ayuda de `free-text-step.tsx` y las `key` de los botones de
      `quiz-form.tsx`; de `lib/supabase/*` solo cambia `database.types.ts`; y en las tres
      excepciones (`app/(app)/paths/actions.ts`, `app/(app)/paths/[id]/page.tsx`,
      `app/(app)/dashboard/page.tsx`) solo cambia lo descrito en el Alcance (verificado con
      `git diff`). _(Ampliado al cerrar el spec para incluir la corrección de `quiz-form.tsx` y la
      excepción del spec 07.)_
- [x] `npm run test`, `npm run lint` y `npm run build` pasan. *(80/80 tests; lint: 0 errores, el
      único warning es previo, en `lib/supabase/actions.ts`)*

## Decisiones

- ~~**Sí:** la IA solo escribe texto. **No:** `programHints`.~~ _Reemplazada durante la
  implementación por el ajuste de respuestas al generar (ver más abajo)._ El campo opcional
  `programHints` que el spec 04 dejó previsto en `LearnerProfile` sigue sin agregarse: ajustar la
  meta cubre lo mismo sin tocar `lib/paths/*`.
- **Sí:** solo un arranque automático, una sola vez por ruta, cuando el usuario escribió texto
  libre. **No:** el botón manual "Personalizar con IA" / "Volver a personalizar" con su contador
  "Te quedan N de 5 hoy" (versión original de este spec, después botón + arranque automático). Con
  solo el botón, el último paso del cuestionario no servía para nada visible si el usuario no lo
  apretaba; una vez que la IA ajusta la ruta y la redacta sola a partir del texto libre, el botón
  ya no aportaba y el usuario lo quitó. Sin texto libre la ruta se queda con el texto de plantilla:
  la IA solo actúa cuando el usuario le contó algo. El arranque automático corre desde
  `/paths/[id]`, no dentro de `generatePath`: la ruta sigue apareciendo al instante y generar nunca
  depende de la IA. "Una sola vez" se decide por las filas de `ai_personalizations` de esa ruta, así
  que un intento fallido no se reintenta solo en cada visita. Decisión del usuario, tomada durante la
  implementación.
- **Sí:** al generar, la IA traduce el texto libre a ajustes de meta, intereses y tecnologías
  dominadas (listas cerradas, `z.enum`), el motor arma la ruta con eso y la ruta muestra qué se
  ajustó. **No:** que el texto libre solo cambie la redacción (versión anterior de este spec), ni
  solo `programHints`. Decisión del usuario durante la implementación: "es irónico decirle a la IA
  que personalice si no escucha al usuario". Con solo redacción, alguien que escribe "no quiero
  Docker" ve la misma ruta con Docker bien explicado. Esto recupera lo que el ADR 0001 ya había
  aceptado ("el texto libre sí puede cambiar qué programas se combinan") y que la primera versión
  de este spec había recortado. Se respeta lo esencial del ADR 0004: la IA nunca elige cursos
  sueltos ni rompe el presupuesto de horas, porque la ruta la sigue armando el motor con respuestas
  válidas.
- **Sí:** se acepta que, con key y texto libre, la ruta pueda ser distinta que sin key. **No:**
  mantener la ruta idéntica en los dos casos (objeción del ADR 0004). Sin key la ruta sigue siendo
  completa y válida (requisito de `ENUNCIADO.md`); con key se ajusta a algo que el usuario pidió
  explícitamente, y el aviso lo hace visible.
- **Sí:** el ajuste se muestra después, en la ruta, sin confirmación previa. **No:** confirmar
  antes de generar. Sumaría una pantalla al camino crítico del Hito 1; la confirmación y la edición
  a mano son del spec 16.
- **Sí:** las respuestas originales de `assessments` no se tocan y el ajuste va a
  `learning_paths.ai_adjustments`. **No:** reescribir `assessments.answers`. El spec 16 prellena el
  cuestionario con lo que el usuario respondió, no con lo que la IA interpretó.
- **Sí:** el ajuste cuenta como un uso del límite diario, pero sin usos la generación sigue sin
  ajuste. **No:** bloquear la generación. `docs/SPECS-MAP.md` §7: generar nunca queda bloqueado por
  el límite. Con texto libre, una ruta nueva gasta dos usos (ajuste + redacción).
- **Sí:** timeout de 8 s para el ajuste (no 15). Corre mientras el usuario mira "Armando tu ruta…",
  en el camino crítico; la redacción, en cambio, corre con la ruta ya en pantalla.
- **Sí:** corregir solo el texto de ayuda de `free-text-step.tsx` (excepción a la regla 5, spec 06).
  **No:** ocultar el paso sin key ni quitarlo. El texto libre es lo que más luce de la IA
  (`ANALISIS-IA.md` §3), y el texto honesto sirve con o sin key.
- **Sí:** columnas `ai_*` aparte y la vista muestra `ai_* ?? original`. **No:** sobrescribir
  `title`, `summary` y `reason`. Se conserva la versión por plantilla, un paso que la IA no nombró
  cae solo a su razón original, y el spec 16 o un futuro "ver original" la tienen disponible.
  Decisión del usuario.
- **Sí:** una tabla `ai_personalizations` con 5 usos por usuario en una ventana móvil de 24 h.
  **No:** contar `personalized_at`, que no cuenta los reintentos sobre la misma ruta. **No:** día
  calendario, que depende de la zona horaria. La tabla la puede reusar el spec 16 (ADR 0004 asume
  el límite compartido). Decisión del usuario. _(Cierra la decisión pendiente "límite diario de
  personalizaciones" de la §4 del mapa.)_
- **Sí:** el intento se registra antes de llamar al modelo y cuenta aunque falle. **No:** contar
  solo los éxitos. Una llamada fallida también gasta crédito, y contar solo los éxitos dejaría
  reintentar sin límite contra una API que está fallando.
- **Sí:** Vercel AI SDK (`ai` + `@ai-sdk/openai`) con salida estructurada validada con zod.
  **No:** el SDK oficial de OpenAI. Es el stack de `docs/ROADMAP.md`. Decisión del usuario.
- **Sí:** `gpt-6-luna` con `reasoningEffort: "low"`, y un prompt que exige retomar el texto libre
  y los datos concretos del perfil, sin frases de relleno. **No:** `gpt-4o-mini` (elegido en el
  paso 1) ni `gpt-4.1-mini`. Con el mismo perfil ("trabajo en soporte técnico, ya hice cosas con
  JavaScript"): `gpt-4o-mini` devolvía razones genéricas que no usaban lo que el usuario contó (8
  s); `gpt-4.1-mini` lo retomaba pero con alguna frase hecha (4.5 s); `gpt-6-luna` lo retoma en
  título, resumen y razones, cita las horas reales contra el presupuesto y no mete relleno (5.8 s),
  y es el más barato ($0.10/$0.50 por 1M tokens). Es un modelo de razonamiento: el esfuerzo por
  defecto (`medium`) arriesga el timeout, por eso `low`. La IA es un valor agregado para el concurso
  solo si la ruta se nota hecha para esa persona y es coherente con el último paso del
  cuestionario. Modelo elegido por el usuario durante la implementación.
- **Sí:** respuesta completa en una server action, con timeout de 15 s. **No:** streaming. Un
  objeto completo se valida y se guarda en un solo paso; con streaming haría falta un route handler
  y validar objetos parciales. La ruta ya está en pantalla mientras se espera, así que la latencia
  no bloquea nada. Decisión del usuario.
- **Sí:** sin key o sin usos, la IA simplemente no corre; si falla, `Alert` no destructivo. **No:**
  silencio total ante una falla: el usuario vio "Personalizando…" y tiene que saber que no se
  aplicó. Decisión del usuario.
- **Sí:** una sola personalización por ruta, sin interruptor para ver el original. **No:** volver a
  personalizar (se había decidido "sí" en la fase de preguntas; se revirtió al quitar el botón).
  `personalizePath` sigue sobrescribiendo las columnas `ai_*` si se la llama de nuevo, así que
  reintroducir un "rehacer" más adelante no necesita migración. Decisión del usuario.
- **Sí:** `apply_ai_personalization` como función `security invoker` en la migración. **No:** N
  `update` sueltos desde la action. Es atómico (no queda un título nuevo con razones viejas si falla
  a la mitad), es un solo viaje a la base y respeta la RLS del spec 02 porque corre con los permisos
  del usuario.
- **Sí:** la IA solo recibe el `outcome` de cada curso como contenido, y el prompt le prohíbe
  inventar más. **No:** pasarle `chapters` o `topics`. El riesgo más grave del ADR 0001 es una
  respuesta válida pero falsa sobre un curso, mostrada al instructor que lo grabó. `outcome` ya fue
  revisado a mano en el spec 01.
- **Sí:** las actions viven en `lib/ai/actions.ts` (`'use server'`), como `lib/supabase/actions.ts`
  del spec 03. **No:** agregarlas a `app/(app)/paths/[id]/actions.ts`, que es del spec 08 (regla
  5), ni crear otra carpeta de rutas.
- **Sí:** excepciones explícitas a la regla 5 en `/paths/[id]` (spec 08) y `/dashboard` (spec 09),
  limitadas a leer las columnas `ai_*` y, en `/paths/[id]`, al botón y el badge. **No:** modificar
  `step-row.tsx` ni `path-card.tsx`: el texto llega ya resuelto desde la página, así que esos
  componentes no se enteran de que existe la IA. **No:** dejar el dashboard con el título por
  plantilla: la misma ruta tendría dos nombres según la pantalla.
- **Sí:** reusar `AiBadge` tal cual ("Generado con IA"). **No:** cambiarle el texto a
  "Personalizada con IA". `components/brand/*` no es de este spec y el texto actual describe bien lo
  que pasó.

## Riesgos

| Riesgo                                                                               | Mitigación                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La key pegada en el chat queda en el historial de la conversación                    | Solo vive en `.env.local` (ignorado por `.gitignore`, regla `.env*`) y en Vercel. Conviene rotarla en platform.openai.com antes de la entrega y configurar un límite de gasto duro (`ANALISIS-IA.md` §8)                   |
| Los créditos se agotan o vencen antes de la evaluación                               | La app funciona entera sin IA (paso 8a del plan). Las rutas ya personalizadas conservan su texto porque queda guardado en la base                                                                                          |
| Respuesta válida pero falsa sobre el contenido de un curso                           | La IA solo ve `outcome` (revisado a mano en el spec 01) y el prompt le prohíbe inventar. El texto por plantilla sigue en la base                                                                                           |
| Prompt injection desde `freeText`                                                    | Va delimitado como dato del usuario. Aunque el modelo obedezca, la salida pasa por el schema: no puede nombrar cursos fuera de la ruta ni escribir fuera de las columnas `ai_*` de esa ruta. Solo afecta al propio usuario |
| Dos pestañas abiertas a la vez pasan el conteo y dan 6 usos en un día                | Se acepta: el exceso posible es de uno o dos usos. Un chequeo atómico en Postgres sería más código para un caso marginal                                                                                                    |
| El modelo nombrado o la API del AI SDK difieren de lo que suele aparecer en ejemplos | Paso 1 del plan: se verifica con Context7 y en platform.openai.com antes de escribir                                                                                                                                       |
| La key llega al bundle del cliente                                                   | `import "server-only"` en `personalize-path.ts`, sin prefijo `NEXT_PUBLIC_`, y el `grep` sobre `.next/static` del paso 9                                                                                                   |
| `numeric` (`hours`, `budget_hours`) llega como string desde PostgREST                | Se normaliza con `Number()` al armar el `PersonalizationInput`, igual que en los specs 07–10                                                                                                                               |
| La IA malinterpreta el texto libre y cambia la meta o los intereses sin que el usuario lo quisiera | El prompt exige cambiar solo lo que el texto justifica con claridad ("ante la duda, nada"); el aviso en la ruta muestra cada cambio; las respuestas originales quedan en `assessments` y el usuario puede generar otra ruta (y en el spec 16, ajustarla a mano) |
| El ajuste suma hasta 8 s a la pantalla "Armando tu ruta…" | Solo corre si el usuario escribió texto libre; timeout de 8 s y, si se corta, se genera sin ajuste |
| Migración en paralelo con 13 o 14 (regla 6)                                          | Este spec no se implementa en paralelo con 13 ni 14                                                                                                                                                                        |

## Qué **no** entra en este spec

- `programHints`, `skip`/`add` o cualquier cambio de cursos, orden o estado.
- Redactar el texto dentro de `generatePath`, streaming, caché por perfil, ver el texto original.
- Ajustar nivel, horas o plazo desde el texto libre, o confirmar el ajuste antes de generar (spec
  15).
- Reescribir los motivos de descarte.
- La traducción de texto libre a chips (spec 16).
- Cambios a `lib/paths/*`, `lib/catalog/*`, `lib/progress/*`, `components/paths/*`,
  `components/quiz/*` (salvo el texto de ayuda de `free-text-step.tsx`), `components/dashboard/*`,
  `components/brand/*`, ni a las páginas de `/paths/[id]` y `/dashboard` fuera de lo descrito en el
  Alcance.

Cada uno de estos, si aterriza, va en su propio spec.
