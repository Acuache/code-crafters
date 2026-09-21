# SPEC 06 — Cuestionario multi-step que guarda el `assessment`

> **Estado:** Implementado
> **Depende de:** SPEC 02, SPEC 03, SPEC 04
> **Fecha:** 2026-09-21
> **Objetivo:** Un cuestionario de seis pasos en `/quiz`, validado con zod sobre el contrato
> `LearnerProfile` del spec 04, que guarda las respuestas del usuario autenticado en una fila de
> `assessments` y no genera ninguna ruta todavía.

## Por qué existe este spec

El motor del spec 04 es una función pura que espera un `LearnerProfile`, y hoy no hay nada que lo
produzca: nadie puede describir su meta, su nivel, lo que ya domina ni cuánto tiempo tiene. Sin este
spec, el spec 07 no tiene qué pasarle a `buildPath()` y la tabla `assessments` del spec 02 queda
vacía para siempre.

Este spec cierra la decisión abierta **"Qué preguntas tiene el cuestionario (máx. 6–8, una sola de
texto libre)"** de `docs/SPECS-MAP.md` §4, y de paso tres que el mapa no explicita: dónde vive la
página del cuestionario (el mapa sólo le asigna `components/quiz/*`), qué valores concretos admite
`deadlineMonths` (el spec 04 lo dejó como "lo valida el zod del spec 06") y qué ve el usuario al
enviar, dado que el 07 —quien genera y redirige— todavía no existe.

Es el primer spec que escribe un formulario en el repo: instala `react-hook-form`, `zod` y
`@hookform/resolvers`, que el `ROADMAP.md` §stack ya había elegido y que los specs 07, 11 y 15 van a
reusar.

**Dependencias, una por motivo distinto:**

- **SPEC 02** — la tabla `assessments` y su RLS de dueño; es el único lugar donde este spec escribe.
- **SPEC 03** — `requireUser()` para proteger `/quiz`, y el placeholder `app/dashboard/page.tsx`
  donde se agrega la entrada al cuestionario.
- **SPEC 04** — `LearnerProfile`, `GOALS`, `INTERESTS` y `TECHNOLOGIES`: el cuestionario no inventa
  su propio vocabulario, deriva cada opción de esas tres tablas.

## Alcance

**Entra:**

- Instalar `react-hook-form`, `zod` y `@hookform/resolvers`, y traer `textarea` del registry de
  `shadcn` (estilo `base-vega`, el ya configurado en `components.json`).
- `components/quiz/quiz-schema.ts`: el schema zod de las respuestas, derivado en runtime de `GOALS`,
  `INTERESTS` y `TECHNOLOGIES`, más la tabla `STEP_FIELDS` que dice qué campos valida cada paso.
- `components/quiz/quiz-schema.test.ts`: cuatro casos sobre el schema (Vitest ya está configurado
  por el spec 04).
- `components/quiz/quiz-form.tsx`: el Client Component con `useForm` + `zodResolver`, la navegación
  entre pasos, la barra de progreso, el envío y el estado de éxito.
- `components/quiz/steps/`: los seis pasos (`goal-step.tsx`, `level-step.tsx`,
  `technologies-step.tsx`, `interests-step.tsx`, `time-step.tsx`, `free-text-step.tsx`).
- `app/(app)/quiz/page.tsx`: Server Component protegido con `requireUser()` que compone la cabecera
  y monta el formulario.
- `app/(app)/quiz/actions.ts` (`'use server'`): `saveAssessment(answers)` — revalida con el mismo
  schema en el servidor e inserta la fila en `assessments`.
- Una línea en `app/dashboard/page.tsx` (spec 03): el botón "Crear mi ruta" que lleva a `/quiz`.
- Corregir `docs/SPECS-MAP.md`: marcar la decisión del cuestionario como cerrada por el 06 y anotar
  en la regla 5 que este spec es dueño de `app/(app)/quiz/*` además de `components/quiz/*`.

**Qué NO entra (queda para otros specs):**

- Generar la ruta: llamar a `buildPath()`, persistir `learning_paths`/`path_steps` y redirigir a
  `/paths/[id]` es el spec 07. Este spec termina en la fila de `assessments`.
- Leer `data/courses.json` o `data/programs.json`: el cuestionario sólo necesita el vocabulario de
  `lib/paths/goals.ts` e `interests.ts`, no el catálogo ni las horas de cada curso.
- Usar la respuesta de texto libre para algo: se guarda en `answers.freeText` y nadie la lee todavía;
  el spec 11 la consume para producir `programHints`.
- Prellenar el cuestionario con las respuestas anteriores (spec 15): este formulario siempre arranca
  vacío e **inserta** una fila nueva, nunca actualiza una existente.
- Persistir un borrador a medio completar (`localStorage`, autosave, volver donde quedaste): recargar
  la página vacía el formulario (ver Decisiones).
- El route group `(app)` como layout: este spec crea la carpeta `app/(app)/quiz/`, pero no un
  `app/(app)/layout.tsx` ni mueve el `app/dashboard/page.tsx` del spec 03 — eso sigue siendo del
  spec 09 (regla 5 del mapa).
- Documentar el `Textarea` nuevo en la galería `/sistema-diseno`: es trabajo de presentación, va
  directo a `master` (`docs/SPECS-MAP.md` §5).
- Editar las tablas `GOALS`/`INTERESTS`/`TECHNOLOGIES`: son código del spec 04 y este spec sólo las
  lee.

## Composición de UI

Las pantallas nuevas se arman importando sólo de `components/ui/*`, `components/brand/*` y
`@phosphor-icons/react`, sin ningún `className` que redefina color, radio o sombra por fuera de los
tokens del tema (`CLAUDE.md` §"UI: componer, no crear"; precedente del spec 03).

| Elemento                    | Qué se reusa                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| Marco del cuestionario      | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                 |
| Indicador de paso           | `Progress` + `ProgressTrack` + `ProgressIndicator` + `ProgressLabel` ("Paso 3 de 6 — Ya dominás") |
| Etiquetas, ayudas y errores | `FieldSet`, `FieldLegend`, `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`  |
| Área y meta (paso 1)        | `Select` + `SelectTrigger` + `SelectValue` + `SelectContent` + `SelectItem`, dos veces            |
| Nivel (paso 2)              | `ToggleGroup` (simple) + `ToggleGroupItem`, una tarjeta por nivel                                 |
| Chips (pasos 3 y 4)         | `ToggleGroup multiple` + `ToggleGroupItem`, con `flex-wrap`                                       |
| Horas y plazo (paso 5)      | `Input type="number"` y `Select`                                                                  |
| Texto libre (paso 6)        | `Textarea` (traído del registry en el paso 1 del plan)                                            |
| Navegación                  | `Button variant="outline"` ("Atrás") y `Button` ("Siguiente" / "Guardar mis respuestas")          |
| Estado de éxito             | `Empty` + `EmptyMedia` (`public/astronauta.webp`) + `EmptyTitle` + `EmptyDescription` + `Button`  |
| Error de guardado           | `Alert variant="destructive"` + `AlertTitle` + `AlertDescription`                                 |
| Iconos                      | `@phosphor-icons/react` con sufijo `Icon`; import de raíz (los pasos son Client Components)       |

No se extrae ningún componente compartido nuevo. En particular, los pasos 3 y 4 repiten el mismo
bloque de ~12 líneas de `ToggleGroup multiple` sobre un `Record` distinto: eso es repetición
aceptada, no una abstracción pendiente (`CLAUDE.md` §"Código limpio").

## Modelo de datos

No hay tablas ni migraciones nuevas: la fila va a `assessments` tal como la creó el spec 02
(`id`, `user_id`, `answers jsonb`, `created_at`). Lo que este spec fija es la **forma del jsonb**,
porque los specs 07, 11 y 15 la leen.

```ts
// components/quiz/quiz-schema.ts
// Las tres listas se derivan de las tablas del spec 04 — el cuestionario no mantiene su propia
// copia del vocabulario. z.enum() sobre un string[] valida en runtime e infiere `string`, que es
// exactamente lo que declaran GoalSlug/InterestSlug/TechnologySlug en lib/paths/types.ts.
const goalSlugs = Object.keys(GOALS);
const interestSlugs = Object.keys(INTERESTS);
const technologySlugs = Object.keys(TECHNOLOGIES);

const assessmentAnswersSchema = z.object({
  goal: z.enum(goalSlugs),
  // ExperienceLevel (lib/paths/types.ts) es un tipo, no un valor en runtime — el spec 04 no
  // exporta una lista de sus tres literales. Es la única excepción reconocida a "todo el
  // vocabulario se deriva de las tablas del spec 04": una copia manual, no un descuido.
  level: z.enum(["empiezo_de_cero", "tengo_bases", "intermedio"]),
  masteredTechnologies: z.array(z.enum(technologySlugs)),
  interests: z.array(z.enum(interestSlugs)),
  hoursPerWeek: z.number().int().min(3).max(40),
  deadlineMonths: z.union([
    z.literal(3),
    z.literal(6),
    z.literal(9),
    z.literal(12),
  ]),
  freeText: z.string().max(500),
});

type AssessmentAnswers = z.infer<typeof assessmentAnswersSchema>;

// Qué campos valida cada paso antes de dejar avanzar (form.trigger(STEP_FIELDS[i])).
const STEP_FIELDS: readonly (keyof AssessmentAnswers)[][] = [
  ["goal"],
  ["level"],
  ["masteredTechnologies"],
  ["interests"],
  ["hoursPerWeek", "deadlineMonths"],
  ["freeText"],
];

// Valores iniciales del formulario (useForm({ defaultValues: QUIZ_DEFAULT_VALUES })). Sin esto,
// react-hook-form arranca los arrays en `undefined` (no `[]`) y `hoursPerWeek` en `NaN` con
// `valueAsNumber` — lo que en la práctica rompe los criterios de aceptación "Los pasos 3 y 4
// avanzan con cero chips marcados" y "El texto libre acepta quedar vacío". `hoursPerWeek` y
// `deadlineMonths` arrancan en el caso de referencia del ADR 0001 (6 meses × 10 h/semana): el
// extremo corto del rango del paso 5 (3 meses × 3 h = 39 h de presupuesto) no alcanza ni para el
// primer curso requerido de casi ninguna meta (ver Decisiones).
const QUIZ_DEFAULT_VALUES: Partial<AssessmentAnswers> = {
  masteredTechnologies: [],
  interests: [],
  hoursPerWeek: 10,
  deadlineMonths: 6,
  freeText: "",
};

// Aserción de tipos: si LearnerProfile (spec 04) cambia sin que este schema lo siga, tsc falla
// acá — no en el spec 07, adentro de buildPath(). No se importa en ningún otro archivo.
type AssessmentAnswersMatchLearnerProfile =
  Omit<AssessmentAnswers, "freeText"> extends LearnerProfile ? true : never;
const _typeCheck: AssessmentAnswersMatchLearnerProfile = true;
```

`AssessmentAnswers` es `LearnerProfile` más `freeText`. Es deliberado que **no** sea el mismo tipo:
`buildPath()` no recibe ni conoce el texto libre (spec 04, Decisiones), así que el spec 07 le pasa
las seis claves restantes y deja `freeText` para el spec 11.

Ejemplo de la fila que se inserta:

```json
{
  "goal": "react-nest",
  "level": "empiezo_de_cero",
  "masteredTechnologies": ["javascript", "git"],
  "interests": ["docker", "testing"],
  "hoursPerWeek": 10,
  "deadlineMonths": 6,
  "freeText": "Sé HTML y CSS pero nunca toqué backend."
}
```

`freeText` siempre está presente: es `""` cuando el usuario no escribe nada, nunca `null` ni ausente.
El área (`frontend`/`backend`/…) **no** se guarda: es estado local del paso 1 para filtrar el segundo
select, y quien la necesite la deriva de `GOALS[goal].area`.

```ts
// app/(app)/quiz/actions.ts
type SaveAssessmentResult =
  | { ok: true; assessmentId: string }
  | { ok: false; message: string };

async function saveAssessment(answers: unknown): Promise<SaveAssessmentResult>;
```

`answers` entra como `unknown` y se valida con `assessmentAnswersSchema` **en el servidor**, aunque
el cliente ya haya validado: la server action es un endpoint público y el `user_id` lo pone la
action desde `requireUser()`, nunca el cliente.

## Plan de implementación

1. **Dependencias.** `npm install react-hook-form zod @hookform/resolvers` y
   `npx shadcn@latest add textarea`. Verificación: `components/ui/textarea.tsx` existe con el estilo
   `base-vega`; y, antes de seguir, un archivo temporal (`components/quiz/_zod-gate.ts`, se borra al
   pasar) que importe `zodResolver` de `@hookform/resolvers/zod` y haga
   `z.enum(Object.keys({ a: 1, b: 2 }))` compila con `tsc --noEmit`. Un `npm run build` sin ningún
   import de `zodResolver` no ejercita esa combinación de versiones (zod 3 no acepta
   `z.enum(string[])`, sólo zod 4 — ver Riesgos).
2. **`components/quiz/quiz-schema.ts`** — el schema y `STEP_FIELDS` de la sección anterior.
   Verificación: compila y no importa nada de `react` ni de `components/ui/*`.
3. **`components/quiz/quiz-schema.test.ts`** — cuatro casos: (a) el objeto de ejemplo de arriba
   parsea; (b) `goal: "kotlin"` falla; (c) `hoursPerWeek: 41` falla; (d) un `freeText` de 501
   caracteres falla. Verificación: `npm run test` en verde con los tests del spec 04 incluidos.
4. **`app/(app)/quiz/actions.ts`** — `saveAssessment()`: `requireUser()`, `safeParse`, `insert` en
   `assessments` con `user_id`, devuelve el `id`. Verificación: compila; se ejercita en el paso 8.
5. **Pasos 1 y 2** (`goal-step.tsx`, `level-step.tsx`). El paso 1 tiene dos selects: el área es
   `useState` local y filtra las metas de `GOALS`; cambiar de área limpia la meta elegida. El paso 2
   usa `ToggleGroup` simple, cuyo `value` es `string[]` aun en modo simple, así que el `Controller`
   adapta en ambos sentidos (`[field.value]` al entrar, `value[0] ?? ""` al salir). Verificación: se
   ejercitan en el paso 8.
6. **Pasos 3 y 4** (`technologies-step.tsx`, `interests-step.tsx`): `ToggleGroup multiple` sobre
   `TECHNOLOGIES` y sobre `INTERESTS`, con `aria-label` y `flex-wrap`. Ambos aceptan cero
   selecciones. Verificación: ídem.
7. **Pasos 5 y 6** (`time-step.tsx`, `free-text-step.tsx`): `Input type="number"` (3–40, con
   `valueAsNumber`) y `Select` de 3/6/9/12 meses (se guarda como número, no como texto), ambos
   mostrando los valores de `QUIZ_DEFAULT_VALUES` (10 h, 6 meses) en vez de arrancar vacíos, con un
   `FieldDescription` que da el orden de magnitud real ("las rutas oficiales completas rondan
   150–280 h; con 10 h/semana y 6 meses tenés 260 h de presupuesto"). El `Textarea` opcional con
   contador de caracteres. Verificación: ídem.
8. **`components/quiz/quiz-form.tsx`** — `useForm` con `zodResolver` y `mode: "onTouched"`,
   `currentStep` en estado, "Siguiente" llama `form.trigger(STEP_FIELDS[currentStep])` y sólo avanza
   si pasa, `Progress` arriba, y en el último paso el botón envía con `form.handleSubmit` dentro de
   `useTransition`. Al resolver `{ ok: true }` guarda el `assessmentId` en estado y renderiza el
   `Empty` de éxito; al resolver `{ ok: false }` muestra el `Alert` sin perder lo tipeado.
   Verificación: recorrer los seis pasos en local y ver la fila nueva en Supabase.
9. **`app/(app)/quiz/page.tsx`** (Server Component con `requireUser()` y la cabecera) y el botón
   "Crear mi ruta" en `app/dashboard/page.tsx`. Verificación: desde `/dashboard` se llega a `/quiz`
   en un clic; `/quiz` sin sesión redirige a `/login`.
10. **`docs/SPECS-MAP.md`**: marcar en §4 la decisión del cuestionario como cerrada por el 06 (con
    los seis pasos y los valores de plazo) y agregar `app/(app)/quiz/*` a la propiedad del 06 en la
    regla 5, junto con la excepción del link en el dashboard del spec 03. Verificación: ninguna
    mención residual a esa decisión como abierta.

## Criterios de aceptación

- [x] `/quiz` sin sesión redirige a `/login`; con sesión muestra el paso 1. (redirect confirmado con
      `curl`; con sesión, el usuario recorrió el wizard tres veces de punta a punta)
- [x] El cuestionario tiene seis pasos, con un indicador "Paso N de 6 — <título>" y la barra de
      progreso avanzando en cada uno. (confirmado por el usuario al completar los seis pasos)
- [x] "Siguiente" en el paso 1 sin meta elegida no avanza y muestra el mensaje de error del campo.
      (el usuario lo probó y encontró el bug del mensaje crudo de zod; ya corregido — ver Riesgos)
- [x] El select de meta sólo lista las metas del área elegida, y cambiar de área limpia la meta que
      hubiera seleccionada. (confirmado por el usuario)
- [x] Los pasos 3 y 4 avanzan con cero chips marcados, y permiten marcar varios. (confirmado con datos
      reales en `assessments`: una fila con `interests: []` y otra con `masteredTechnologies` de 2
      elementos)
- [x] `hoursPerWeek` fuera de 3–40 bloquea el avance con un mensaje visible. (confirmado por el
      usuario)
- [x] El plazo ofrece exactamente 3, 6, 9 y 12 meses, y se guarda como número. (`DEADLINE_ITEMS` fija
      esos cuatro valores; una fila real tiene `"deadlineMonths":6` como número JSON, no string)
- [x] El texto libre acepta quedar vacío y bloquea el envío con más de 500 caracteres. (una fila real
      tiene `"freeText":""`; el bloqueo por >500 caracteres lo cubre `quiz-schema.test.ts`)
- [x] Enviar inserta exactamente **una** fila en `assessments`, con el `user_id` del usuario logueado
      y las siete claves del ejemplo de Modelo de datos. (verificado por SQL: 3 filas del mismo
      `user_id`, que corresponde al perfil real del usuario, cada una con las 7 claves)
- [x] `assessmentAnswersSchema.safeParse(fila.answers)` devuelve `success: true`, y `goal` es una
      clave de `GOALS`, `interests` un subconjunto de `INTERESTS` y `masteredTechnologies` uno de
      `TECHNOLOGIES`. (verificado con un test puntual contra la fila real más reciente)
- [x] Llamar `saveAssessment` con un `goal` inventado devuelve `{ ok: false }` y **no** inserta fila
      (verificable desde la consola del navegador o con un test manual de la action).
- [x] Tras enviar, `/quiz` muestra el estado de éxito con link al dashboard, sin recargar la página.
      (confirmado con captura del usuario: astronauta, título, descripción y botón "Volver al
      dashboard")
- [x] `/dashboard` tiene un botón "Crear mi ruta" que lleva a `/quiz`. (confirmado por el usuario, lo
      usó para volver a `/quiz` en sus otros dos envíos)
- [x] Ningún archivo nuevo importa fuera de `components/ui/*`, `components/brand/*`, `lib/paths/*`,
      `lib/supabase/*`, `next/*`, `react*`, `@phosphor-icons/react`, `zod`, `react-hook-form`,
      `@hookform/resolvers` y `vitest` (los dos últimos quedaron afuera de la lista original por un
      olvido: el propio paso 1 del plan los instala y el resto del spec los da por obligatorios —
      `@hookform/resolvers` para `zodResolver`, `vitest` para los tests).
- [x] Las seis pantallas se ven correctas en tema claro y oscuro, y a 360 px de ancho. (confirmado
      por el usuario; la captura del estado de éxito ya mostraba el tema oscuro sin problemas)
- [x] `npm run test`, `npm run build` y `npm run lint` pasan.

## Decisiones

- **Sí:** seis pasos — meta (área + meta), nivel, tecnologías dominadas, intereses, tiempo (horas +
  plazo), texto libre. **No:** siete pasos separando área y meta como la maqueta, ni cinco metiendo
  el texto libre junto a la meta. Seis cubre los seis campos de `LearnerProfile` más la única
  pregunta libre que pide `docs/SPECS-MAP.md` §4, con una sola idea por pantalla y sin un paso que
  sea sólo un clic.
- **Sí:** el área es estado local del paso 1 y no se guarda en `answers`. **No:** un campo `area` en
  el jsonb. `GOALS[goal].area` ya lo dice; guardarlo aparte crea la posibilidad de un estado inválido
  (área que no corresponde a la meta), exactamente lo que el spec 04 evitó al descartar `META_STACKS`.
- **Sí:** `react-hook-form` + `zod` + `@hookform/resolvers`, con `Controller` sobre los componentes
  de `components/ui/*`. **No:** estado propio con `useState` y `safeParse` a mano. Es el stack que ya
  eligió `ROADMAP.md` y el patrón que documenta shadcn hoy para el `Field` que ya está en el repo
  (verificado en Context7); además `form.trigger(campos)` resuelve la validación por paso de un
  wizard sin escribir el estado de "tocado" campo por campo.
- **Sí:** el plazo es una lista cerrada de 3, 6, 9 y 12 meses (`z.union` de literales). **No:** un
  input numérico libre, ni los 3/5/6/12 de la maqueta. Una lista cerrada impide que llegue al motor
  un presupuesto absurdo (0.5 meses, 400 meses) y mantiene alcanzable el caso de referencia del ADR
  0001 (6 meses × 10 h = 260 h); el 9 reemplaza al 5 para que los saltos sean regulares.
- **Sí:** el texto libre es opcional, con tope de 500 caracteres, y se guarda siempre (`""` si está
  vacío). **No:** obligatorio, ni omitido del jsonb cuando está vacío. El motor de reglas no lo
  necesita para nada, así que exigirlo sería fricción pura; y una clave siempre presente le ahorra al
  spec 11 distinguir entre "no escribió" y "campo inexistente".
- **Sí:** la server action revalida con el mismo schema aunque el cliente ya haya validado, y toma el
  `user_id` de `requireUser()`. **No:** confiar en el payload del cliente. Una server action es un
  endpoint público: sin esa revalidación, un `goal` inventado llegaría a `assessments` y reventaría
  en el spec 07, cuando `buildPath()` lanza por meta desconocida.
- **Sí:** el vocabulario de los pasos 1, 3 y 4 se deriva en runtime de `GOALS`, `TECHNOLOGIES` e
  `INTERESTS`. **No:** listas de opciones copiadas en `components/quiz/*`. Una copia se desincroniza
  en silencio la primera vez que el spec 04 agregue una meta, y el `z.enum` derivado garantiza que la
  UI y la validación nunca discrepen.
- **Sí:** `app/(app)/quiz/page.tsx`, creando la carpeta del route group pero sin `layout.tsx` propio.
  **No:** `app/quiz/page.tsx` plano. Es la ubicación que ya describe `ROADMAP.md`, el 08 tiene
  asignado `app/(app)/paths/[id]/*` en la misma carpeta, y un route group sin layout no invade la
  decisión de layout que le toca al spec 09 — mientras que un archivo plano más sería un segundo
  placeholder que el 09 debería mover.
- **Sí:** al enviar, el estado de éxito se muestra dentro de `/quiz` sin cambiar de ruta. **No:**
  redirigir a `/dashboard`, ni dejar el formulario sin confirmación. Todo queda en archivos de este
  spec, y el 07 reemplaza ese final por su pantalla de "generando ruta" y el redirect a `/paths/[id]`
  tocando un solo lugar.
- **Sí:** este spec agrega el botón "Crear mi ruta" en `app/dashboard/page.tsx`, que es del spec 03.
  **No:** dejar `/quiz` accesible sólo tecleando la URL. Es una excepción consciente a la regla 5 del
  mapa, barata porque el spec 09 reescribe ese archivo entero de todos modos, y sin ella no hay forma
  de verificar el flujo navegando la app — que es como el concurso la evalúa.
- **Sí:** cada paso es su propio archivo en `components/quiz/steps/`. **No:** un único archivo con
  los seis, ni un componente genérico parametrizado por tipo de pregunta. Cada paso tiene su propio
  control (dos selects, toggle simple, chips múltiples, número + select, textarea): un componente
  genérico terminaría siendo un `switch` sobre el tipo de campo, que es más difícil de leer que seis
  archivos de 40 líneas.
- **Sí:** los pasos 3 y 4 repiten el bloque de `ToggleGroup multiple`. **No:** extraer un
  `chip-group.tsx` compartido. Son ~12 líneas repetidas dos veces sobre `Record`s distintos: la regla
  del proyecto prefiere eso a una abstracción prematura, y si el spec 15 necesita un tercer grupo de
  chips, ahí habrá señal real para extraerlo.
- **Sí:** recargar `/quiz` vacía el formulario. **No:** guardar un borrador en `localStorage` ni una
  fila parcial en `assessments`. Son seis pasos de una sentada; el autosave agrega estado que
  invalidar (¿qué pasa si cambian las metas entre sesión y sesión?) para un problema que nadie
  reportó todavía.
- **Sí:** cada envío **inserta** una fila nueva en `assessments`. **No:** actualizar la última fila
  del usuario, ni impedir un segundo cuestionario. El spec 09 exige varias rutas por usuario, y cada
  ruta nace de su propio assessment; además el historial de respuestas es lo que el spec 15 va a
  prellenar.
- **Sí:** `AssessmentAnswers` (siete claves) es un tipo propio de este spec, distinto de
  `LearnerProfile` (seis). **No:** extender `LearnerProfile` con `freeText` en `lib/paths/types.ts`.
  El spec 04 decidió explícitamente que el motor no conoce el texto libre; meterlo en su contrato
  obligaría a `buildPath()` a ignorar un campo que recibe, que es justo la ambigüedad que ese spec
  evitó.
- **Sí:** el `Textarea` se trae del registry de `shadcn` con el estilo `base-vega` ya configurado.
  **No:** maquetar un `<textarea>` a mano con clases sueltas, ni reusar `Input` para 500 caracteres.
  Traer la pieza que falta del mismo sistema de diseño no es "crear un componente visual nuevo" en el
  sentido de `CLAUDE.md`: es completar el catálogo con la misma fuente que generó los otros 22.
- **Sí:** `QUIZ_DEFAULT_VALUES` fija los arrays en `[]`, `freeText` en `""` y preselecciona 6 meses /
  10 h (el caso de referencia del ADR 0001). **No:** dejar los campos sin default, ni preseleccionar
  el extremo más corto del rango del paso 5 (3 meses × 3 h = 39 h, insuficiente para el primer curso
  requerido de casi cualquier meta). Sin estos defaults, react-hook-form arranca los arrays en
  `undefined` y el número de horas en `NaN`, lo que hace literalmente incumplibles dos criterios de
  aceptación de este mismo spec ("avanza con cero chips marcados", "el texto libre acepta quedar
  vacío"); y sin preseleccionar el caso de referencia, la primera ruta que ve un evaluador que no
  toca los valores por defecto cae en `fitsInBudget: false` por diseño del propio formulario, no del
  motor.
- **Sí:** el paso 1 del plan verifica compilando un archivo real que ejercita `zodResolver` y
  `z.enum(Object.keys(...))`. **No:** verificar sólo con un `npm run build` sin ningún import nuevo.
  Un build que no importa `zodResolver` en ningún lado no puede detectar una incompatibilidad de
  versiones entre zod y su resolver — ese fallo aparecería recién en el paso 8, con los seis pasos
  del formulario ya escritos encima.
- **Sí:** una aserción de tipos (`AssessmentAnswersMatchLearnerProfile`) ata en tiempo de compilación
  que `Omit<AssessmentAnswers, "freeText">` sea asignable a `LearnerProfile`. **No:** dejarlo como una
  afirmación en prosa sin ningún mecanismo que la haga cumplir. Si el spec 04 cambia `LearnerProfile`
  sin que este spec se entere, el error debe salir acá (`tsc` sobre este archivo), no en el spec 07 al
  invocar `buildPath()` con un objeto que ya no calza.

## Riesgos

| Riesgo                                                                                                                                                               | Mitigación                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assessments.answers` es jsonb sin versión: si un spec futuro cambia las preguntas, las filas viejas quedan con otra forma y el spec 15 las leería mal               | Quien lea una fila vieja la pasa por `assessmentAnswersSchema.safeParse()` y descarta lo que no valide. Es más barato que un campo `version` que igual habría que interpretar, y el schema ya es la fuente de verdad de la forma |
| Base UI devuelve `string[]` en `ToggleGroup` incluso en modo simple; un `Controller` mal adaptado guardaría `["empiezo_de_cero"]` en vez de `"empiezo_de_cero"`      | El paso 5 del plan fija la adaptación en ambos sentidos, y el criterio de aceptación sobre `safeParse` de la fila real lo detecta: un array donde el schema espera un enum falla                                                 |
| `@hookform/resolvers` y `zod` tienen combinaciones de versiones incompatibles (el resolver de zod v3 no sirve para v4, que es justo lo que exige `z.enum(string[])`) | El paso 1 del plan compila un archivo real que importa `zodResolver` y llama `z.enum(Object.keys(...))` antes de escribir ninguna pantalla — un `npm run build` sin ese import no detecta la incompatibilidad (ver Decisiones)   |
| El spec 09 reescribe `app/dashboard/page.tsx` y borra el botón "Crear mi ruta" sin querer                                                                            | El dashboard real del 09 tiene "crear otra ruta" como requisito propio (`docs/SPECS-MAP.md` §7), así que el botón no se pierde: cambia de dueño                                                                                  |
| Nadie valida que los 19 `GOALS` produzcan una ruta razonable: el cuestionario acepta metas que el motor podría resolver con muy pocos cursos                         | Fuera de alcance por diseño — el motor ya devuelve `fitsInBudget` y su lista de descartes (spec 04), y es el spec 08 quien muestra esa información al usuario                                                                    |

## Qué **no** entra en este spec

- Generar la ruta, persistir `learning_paths`/`path_steps` y redirigir a `/paths/[id]` (spec 07).
- Usar el texto libre para algo (spec 11).
- Prellenar el cuestionario con respuestas anteriores (spec 15).
- Guardar un borrador a medio completar.
- El `app/(app)/layout.tsx` y mover el placeholder `app/dashboard/page.tsx` (spec 09).
- Documentar el `Textarea` nuevo en `/sistema-diseno` (trabajo de entrega, fuera de SDD).
- Cualquier migración o cambio de esquema: este spec sólo inserta en una tabla que ya existe.

Cada uno de estos, si aterriza, va en su propio spec.
