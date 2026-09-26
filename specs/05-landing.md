# SPEC 05 — Landing: recorrido animado con la mascota, del cuestionario a compartir la ruta

> **Estado:** Implementado
> **Depende de:** SPEC 03, SPEC 04, SPEC 12, SPEC 14, SPEC 15 (solo reusa piezas ya implementadas; no
> bloquea a ningún otro spec)
> **Fecha:** 2026-09-25
> **Objetivo:** Que alguien que llega a `/` sin conocer DevPathlles entienda en un solo scroll cómo
> funciona —cuestionario, motor por reglas, IA encima, progreso con gamificación y compartir—, guiado
> por la mascota, que viaja de estación en estación a medida que baja por la página, y que empiece su
> ruta con un clic.

## Por qué existe este spec

La landing de hoy (`app/page.tsx`) es el placeholder del scaffold: un título, un botón hacia
`/sistema-diseno` y "Empezar el cuestionario" deshabilitado. Es la primera pantalla que ve el jurado
(`ENUNCIADO.md`, criterio 4: "UI agradable y entendible") y la que más puntos da en el criterio 1
("Idea"), porque es donde se explica que la ruta no la inventa una IA, sino que sale de un motor sobre
las rutas oficiales de DevTalles, con la IA encima (`docs/investigacion/ANALISIS-IA.md`, ADR 0001).

El mapa agendaba el 05 sin dependencias y "sobre el sistema de diseño". Ahora, con los specs 01–15
implementados, la landing puede **mostrar** el producto real en vez de describirlo: las poses de la
mascota del 14, los tiempos y los estilos de nodo del mapa del 12, la `XpBar` y las medallas del 14,
el `next` del login del 15. Por eso lista esas dependencias, aunque solo reusa piezas.

La interacción es a propósito **pasiva**: el scroll dispara las animaciones y el usuario no tiene que
manipular nada para entender (pedido explícito durante la definición). La única interacción manual es
un easter egg con la mascota del hero.

## Alcance

**Entra:**

- **Mover la landing a su route group:** `app/(marketing)/page.tsx` reemplaza a `app/page.tsx`, que se
  borra (regla 5 de `docs/SPECS-MAP.md`: el 05 es dueño de `app/(marketing)/*`). Metadata propia
  (`title`, `description`, `openGraph`).
- **Cabecera fija** con el logo, anclas a "Cómo funciona" y "Preguntas", `ThemeToggle` y un CTA que
  cambia según haya sesión o no.
- **Hero** con fondo espacial (estrellas en CSS sobre `brand-gradient-soft`), título, bajada, dos CTAs y
  la mascota flotando. Tocarla (clic, Enter o Espacio) cambia de pose y lanza confetti.
- **Franja de tecnologías** bajo el hero: las 15 de `TECHNOLOGIES` (`lib/paths/interests.ts`, spec 04),
  en un marquee lento que se detiene al pasar el puntero.
- **Recorrido "Cómo funciona"**: un riel vertical con 5 estaciones (Cuestionario → Motor → IA →
  Progreso → Compartir). Cada una tiene texto, una pose de la mascota y un mini-mockup estático. Al
  hacer scroll, la estación que cruza el centro de la pantalla pasa a ser la actual: su nodo se
  enciende, el tramo del riel se rellena hasta ella y el astronauta viaja hasta su nodo.
- **Preguntas frecuentes** con `Accordion` (6 preguntas).
- **CTA final** con la pose del cohete.
- **Footer** con el logo de Code Quest 2026, el crédito "Hecho por Code Crafters" y los links al repo, a
  los cursos de DevTalles, al sistema de diseño y a la licencia MIT.
- **Tarjeta OG** de la landing: `app/(marketing)/opengraph-image.tsx`.
- **Asset:** `public/code-quest.webp`, generado con `sharp` a partir de `codequest-logo_sin_sombra.png`.
  Se borran los dos PNG sin commitear (`LOGO_2026_CODE-QUEST.png` y `codequest-logo_sin_sombra.png`).
- **Excepción en `app/globals.css`:** los tokens `--animate-float`, `--animate-marquee` y
  `--animate-twinkle` (con sus `@keyframes` dentro de `@theme`) y la utilidad `@utility starfield`.
  Agregado en el paso 9: en el tema claro, `--level-required`, `--level-recommended` y `--ai` más
  oscuros (ver Decisiones). Nada más en ese archivo.
- **Excepción en `app/login/*` (del spec 03), agregada después del paso 10 a pedido del usuario:**
  rediseño solo visual del login para que siga el lenguaje de la landing, adonde lleva su botón
  principal. En desktop, pantalla dividida: a la izquierda un panel de marca centrado (estrellas, la
  pose de la órbita que flota —la que saluda ya se repite en el logo, el mapa y la landing—, el título
  del hero y 3 beneficios en píldoras), a la derecha una `Card` centrada con el acceso; en móvil,
  solo la `Card`, con el logo. Discord va como botón principal (`variant="brand"`) con la nota
  "Recomendado: la comunidad de DevTalles está en Discord"; debajo, "o continúa con" y Google/GitHub
  lado a lado en outline (`isCompact`: se ve solo el nombre y el `aria-label` dice "Continuar con …").
  Suma "Volver al inicio", `ThemeToggle` y una nota de privacidad. `signInWithProvider`, `next`, el
  redirect con sesión y los mensajes de error no cambian.
- Tests: `lib/landing/cta.test.ts`, `lib/landing/example-path.test.ts`,
  `lib/landing/journey-state.test.ts` y `components/landing/hero-mascot.test.tsx`.
- Actualizar `docs/SPECS-MAP.md` y `CLAUDE.md` (ver el paso 10 del plan).

**Fuera de alcance:**

- Una demo en vivo del motor (elegir meta y ver la ruta real): se descartó en la definición, ver
  Decisiones.
- Interacción manual en el recorrido (stepper, interruptor "Sin IA / Con IA", mapa jugable).
- Cifras del catálogo ("74 cursos", "15 rutas"), fijas o leídas de Supabase.
- Prellenar el cuestionario desde la landing: tocaría `components/quiz/*` (spec 06).
- Redirigir a `/dashboard` a quien ya tiene sesión.
- Scroll suave global para las anclas: haría falta tocar el `<html>` de `app/layout.tsx` (ver
  Decisiones).
- Crear el archivo `LICENSE`: es trabajo de entrega (`docs/SPECS-MAP.md` §5), no pasa por SDD.
- Testimonios, galería de rutas públicas, video embebido o newsletter.
- Tocar `components/paths/*`, `lib/path-map/*`, `components/gamification/*`, `lib/gamification/*`,
  `lib/paths/*` o `components/ui/*`: se importan, no se modifican.

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*`, piezas exportadas de los specs 12, 14 y 15,
los assets de `public/` y `@phosphor-icons/react` (sufijo `Icon`, `/ssr` en Server Components), sin
colores, radios ni sombras fuera de los tokens (`CLAUDE.md` §"UI: componer, no crear"). Los componentes
de `components/landing/*` son **composiciones** propias de esta página. La única pieza visual nueva es
el fondo de estrellas, justificada en Decisiones.

### Reparto de poses (`public/streak/*` y `public/astronauta.webp`)

| Lugar | Pose | Archivo |
|---|---|---|
| Hero (inicial) y CTA final | Cohete despegando | `streak/celebration-1.webp` |
| Viajero del riel | Astronauta clásico (el mismo del mapa del 12) | `astronauta.webp` |
| 1 · Cuestionario | Astronauta grande, saludando | `astronauta.webp` |
| 2 · Motor | Antorcha sobre un asteroide ("ilumina el camino") | `streak/celebration-3.webp` |
| 3 · IA | Orbe de energía | `streak/celebration-2.webp` |
| 4 · Progreso | La llama de la racha | `streak/reminder.webp` |
| 5 · Compartir | Órbita y estrellas | `streak/celebration-4.webp` |

Ciclo del easter egg del hero: cohete → astronauta → orbe → antorcha → órbita → llama → cohete.

### Cabecera (`components/landing/landing-header.tsx`)

- `header` con `sticky top-0 z-40`, `bg-background/80 backdrop-blur` y `border-b`.
- A la izquierda, `logo.webp` dentro de `bg-logo-backdrop`, con link a `/` (`alt="DevPathlles"`,
  `loading="eager"`: está arriba del fold).
- Un `nav aria-label="Principal"` con anclas a `#como-funciona` y `#preguntas`, oculto por debajo de
  `sm`.
- `ThemeToggle`, y un `Button` con `landingCtas(isSignedIn).header`: "Entrar" → `/login`, o "Ir a mi
  panel" → `/dashboard`.

### Hero (`components/landing/landing-hero.tsx` + `hero-mascot.tsx`)

- Fondo: `brand-gradient-soft` + una capa `starfield` (`aria-hidden`) con
  `motion-safe:animate-twinkle`.
- `Eyebrow`: "Rutas de aprendizaje · Cursos de DevTalles".
- `h1` (`text-display`): "Tu ruta de aprendizaje en DevTalles, **trazada para ti**". El resaltado va con
  un degradado de texto hecho solo con tokens, medido en los dos temas (ver Criterios).
- Bajada: "Cuéntanos tu meta, tu nivel y cuánto tiempo tienes. DevPathlles arma una ruta con cursos
  reales de DevTalles, te explica por qué va cada uno y te acompaña hasta terminarla."
- CTAs:
  - `Button variant="brand" size="lg"` con `landingCtas(isSignedIn).primary`: "Arma tu ruta" →
    `/login?next=/quiz`, o "Ir a mi panel" → `/dashboard`.
  - `Button variant="outline" size="lg"` "Mira cómo funciona" (`ArrowDownIcon`) → `#como-funciona`.
- Sin sesión, debajo de los CTAs: "Gratis · Entra con Discord, Google o GitHub"
  (`text-sm text-muted-foreground`).
- Layout: dos columnas desde `lg` (texto a la izquierda, mascota a la derecha). En móvil, primero el
  texto y los CTAs y debajo la mascota, para que el CTA principal quede visible sin scroll a 360 × 640.
- **`HeroMascot`** (`"use client"`):
  - Un `button` con `aria-label="Cambiar la pose de la mascota"` que envuelve la pose actual
    (`alt=""`) y tiene `focus-visible:ring`.
  - El wrapper flota con `motion-safe:animate-float`.
  - Cada clic avanza con `nextHeroPose`: la imagen nueva entra con `motion-safe:animate-step-pop` (el
    token del spec 12) y se llama a `launchConfetti()` (spec 14, que ya trae
    `disableForReducedMotion`).
  - La pose siguiente queda montada e invisible, para que el cambio no parpadee.
  - Un globo "¡Tócame!" (`aria-hidden`, solo tokens) junto a la mascota, que desaparece después del
    primer clic.
  - La imagen inicial usa `loading="eager"` + `fetchPriority="high"`, porque es el LCP. `priority` está
    deprecado en Next 16 (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`).

### Franja de tecnologías (`components/landing/tech-strip.tsx`)

- Un `Eyebrow` ("Rutas con cursos de") y un `ul aria-label="Tecnologías de las rutas"` con los `label`
  de `TECHNOLOGIES` en `Badge variant="secondary"`.
- Marquee: la lista va duplicada (la copia con `aria-hidden`) dentro de un contenedor con
  `overflow-hidden`, con `motion-safe:animate-marquee` y
  `hover:[animation-play-state:paused]`.
- Con "reducir movimiento" se muestra una sola copia, quieta y envuelta (`flex-wrap`).

### Recorrido "Cómo funciona" (`components/landing/how-it-works.tsx` + `journey.tsx`)

- Sección `id="como-funciona"` (`scroll-mt-20` por la cabecera fija), con `Eyebrow` "Tu ruta, paso a
  paso" y `h2` "Cómo funciona".
- **`Journey`** (`"use client"`) dibuja un `ol` de 5 estaciones. Cada `li` tiene un nodo, un `h3` y su
  contenido. El riel, los nodos y el astronauta viajero son decorativos (`aria-hidden`): el orden y los
  títulos ya los da el `ol`.
- **Layout:**
  - Desde `lg`: riel en el centro, con la tarjeta (texto + mockup) de un lado y la pose del otro,
    alternando de lado en cada estación.
  - En móvil: riel a la izquierda, contenido a la derecha y la pose más chica junto al título.
- **Estado de cada estación**, en atributos `data-*` del `li`:
  - `data-state`: `visited`, `current` o `upcoming`. Sigue al scroll en los dos sentidos. Los estilos
    del nodo salen de `stepNodeClassName` (spec 12): `visited` → estilo `done`, `current` → estilo
    `in_progress` (con glow) y `upcoming` → estilo `pending`.
  - `data-reached="true"`: se pone la primera vez que la estación es la actual, y no se quita.
- **Cuál es la actual:** un `IntersectionObserver` con `rootMargin: "-50% 0px -50% 0px"` (una línea en
  el centro de la ventana) observa cada `li`. La que cruza esa línea es la actual. Si ninguna la cruza
  (el espacio entre dos estaciones), queda la anterior. Al montar, la actual es la primera. El
  observer no avisa cuando una estación salta de abajo a arriba de la línea sin cruzarla (un salto de
  ancla, un scroll brusco), así que en `hashchange` y `scrollend` se aplica la misma regla midiendo:
  la actual es la última estación que ya pasó el centro (agregado en el paso 5).
- **Riel:**
  - Un tramo punteado de fondo (`var(--border)`, como los conectores del 12), y encima una barra
    `bg-primary-bright`.
  - La barra se rellena desde el primer nodo hasta el actual con `transform: scaleY(ratio)`
    (`origin-top`), nunca animando `height`.
  - `ratio` sale de `railFillRatio` sobre los centros de los nodos, medidos del DOM (`offsetTop`) y
    remedidos con un `ResizeObserver` (cambios de ancho, carga de imágenes o rotación).
- **Astronauta viajero:** `astronauta.webp` a 48 px en móvil y 64 px en desktop, posicionado con
  `translate` hacia el nodo actual, con `motion-safe:transition-transform` de `TRAVEL_DURATION_MS`
  (`lib/path-map/motion.ts`, la misma duración que en el mapa). En desktop va al costado del nodo, del
  lado de la pose; en móvil se posa sobre el nodo.
- **Pose con el puntero encima:** flota (`motion-safe:hover:animate-float`, en el contenedor de la
  pose para no pisar la transición con la que aparece). Pedido después del paso 10.
- **Coreografía:** cuando una estación pasa a `reached`, primero viaja el astronauta, y la pose (fade +
  slide) y el mockup se animan después, con un retraso de `TRAVEL_DURATION_MS`. Así hay 1 o 2 cosas
  moviéndose a la vez, no todas juntas (skill `ui-ux-pro-max`, "Excessive Motion").
- **Mejora progresiva:** el `ol` recibe `data-journey-ready` recién al montar en el cliente, y solo si
  no hay `prefers-reduced-motion`. Los estados "antes de animar" (texto de la IA oculto, `XpBar` en 0,
  la tachadura sin dibujar) solo aplican bajo `[data-journey-ready]`. Sin JS, o con "reducir
  movimiento", todo se ve en su estado final.
- Los iconos de los nodos pasan de `how-it-works.tsx` (servidor) a `Journey` (cliente) como elementos
  ya renderizados (`ReactNode`), no como componentes: una función no cruza de un Server Component a uno
  cliente.

**Las 5 estaciones** (datos de ejemplo en `lib/landing/example-path.ts`, ver Modelo de datos):

| # | Nodo (Phosphor) | `h3` | Texto | Mockup (se anima al llegar) |
|---|---|---|---|---|
| 1 | `ChatCircleTextIcon` | Cuéntanos a dónde vas | "Seis preguntas: tu meta, tu nivel, lo que ya dominas, lo que te interesa, cuánto tiempo tienes y, si quieres, qué buscas con tus palabras." | `quiz-mockup.tsx`: `Card` con los chips de `EXAMPLE_ANSWERS` como `Badge`, que aparecen uno tras otro |
| 2 | `PathIcon` | El motor arma tu ruta | "Parte de las rutas oficiales de DevTalles: quita lo que ya dominas, suma tus intereses y recorta hasta que quepa en tu tiempo. Cada curso dice por qué entró, y los que salieron, por qué salieron." | `engine-mockup.tsx`: `Card` "Los primeros pasos de una ruta de ejemplo" con los 3 `EXAMPLE_COURSES` (título, `StepOriginBadge` y horas, de `components/paths/step-meta.tsx`) y el curso de `EXAMPLE_DISCARDED`, cuya tachadura se dibuja al llegar y que muestra su motivo ("ya lo dominas") |
| 3 | `SparkleIcon` | La IA la hace tuya | "Si escribes qué buscas, la IA ajusta tu ruta a eso y te la explica con tus palabras. ¿Sin IA? Tu ruta se arma igual: la IA suma, nunca decide sola." | `ai-mockup.tsx`: la cita de `EXAMPLE_FREE_TEXT`; debajo, "Motor:" con la razón por plantilla del primer curso (`text-muted-foreground`), y después `AiBadge` con el título y la razón que escribe la IA, que aparecen después de la línea del motor |
| 4 | `TrophyIcon` | Avanza curso a curso | "Tu ruta es un mapa: marca tu avance, aprueba el quiz de cada curso, gana XP, sube de nivel, desbloquea insignias y cuida tu racha." | `progress-mockup.tsx` (cliente): `XpBar`, que se llena de 0 al XP de ejemplo; `AchievementMedal` de `first-course` ganada con su nombre; "+N XP · «curso»"; y `FireIcon` con "5 días de racha" |
| 5 | `ShareNetworkIcon` | Compártela en Discord | "Publica tu ruta con un link. En Discord se ve con su tarjeta, y quien la abra puede copiarla a su cuenta y empezarla desde cero." | `share-mockup.tsx`: una tarjeta de link genérica (borde izquierdo `border-primary-bright`, "DevPathlles", el título de la IA de ejemplo y "de tu_nombre"). No imita la interfaz de Discord |

### Preguntas frecuentes (`components/landing/landing-faq.tsx`)

Sección `id="preguntas"` (`scroll-mt-20`), con `h2` "Preguntas frecuentes" y un `Accordion` de una
sola apertura:

1. **¿DevPathlles es gratis?** Sí. Solo necesitas entrar con Discord, Google o GitHub para guardar tus
   rutas. Los cursos se toman en cursos.devtalles.com, con sus propias condiciones.
2. **¿De dónde salen los cursos?** Del catálogo de DevTalles y de sus rutas oficiales. Cuando DevTalles
   publica un curso nuevo, se suma desde el panel de administración, sin tocar código.
3. **¿Qué hace la IA y qué pasa si no está disponible?** Lee lo que escribiste en la última pregunta,
   ajusta tu ruta a eso y la explica con tus palabras. Si no está disponible, la ruta se arma igual con
   el motor.
4. **¿Puedo tener más de una ruta?** Sí, todas las que quieras, cada una con su propio avance.
5. **¿Cómo marco mi avance?** En el mapa o en la lista de tu ruta. Cada curso pasa por "Pendiente", "En
   curso" y "Hecho", y los que tienen quiz se completan al aprobarlo.
6. **¿Puedo compartir mi ruta?** Sí, con un link público que puedes apagar cuando quieras. Tu avance no
   se muestra.

### CTA final (`components/landing/final-cta.tsx`)

`Card` con `brand-gradient-soft`: `celebration-1.webp` (lazy, `alt=""`, flotando con
`motion-safe:animate-float` como en el hero; pedido después del paso 10), `h2` "Tu próxima meta empieza
hoy", "Seis preguntas y tienes tu ruta con cursos reales de DevTalles." y un `Button variant="brand"
size="lg"` con `landingCtas(isSignedIn).primary`.

### Footer (`components/landing/landing-footer.tsx`)

- `code-quest.webp` dentro de `bg-logo-backdrop`, porque su texto es blanco igual que el del wordmark
  (`alt="Code Quest 2026, desafío de programación"`).
- "Hecho por el equipo Code Crafters para Code Quest 2026, el desafío de programación de DevTalles."
- Links:
  - "Código en GitHub" (`GithubLogoIcon`) → `https://github.com/Acuache/code-crafters`.
  - "Cursos de DevTalles" → `https://cursos.devtalles.com`.
  - "Sistema de diseño" → `/sistema-diseno`.
  - "Licencia MIT" → `https://github.com/Acuache/code-crafters/blob/master/LICENSE`.
  - Los externos llevan `target="_blank"`, `rel="noopener noreferrer"` y un `sr-only` "(se abre en
    otra pestaña)".
- "Proyecto independiente de la comunidad. Los cursos y la marca DevTalles pertenecen a DevTalles."
  (`text-xs text-muted-foreground`).

### Tarjeta OG (`app/(marketing)/opengraph-image.tsx`, 1200 × 630)

- Mismo patrón que la del 15: `public/og-logo.png` en base64 sobre el color literal de
  `bg-logo-backdrop` y fondo con el degradado de marca en hex.
- El título del hero y "Cuestionario · Motor de reglas · IA · Progreso".
- `alt`: "DevPathlles: rutas de aprendizaje sobre los cursos de DevTalles".
- Vive en el route group, así que solo aplica a `/` (`/login` y `/sistema-diseno` no la heredan).

## Casos borde

| Caso | Qué pasa |
|---|---|
| Sin sesión | Cabecera: "Entrar" → `/login`. Hero y CTA final: "Arma tu ruta" → `/login?next=/quiz`. Después del OAuth, la persona llega a `/quiz` |
| Con sesión | Los tres CTAs dicen "Ir a mi panel" → `/dashboard`, y la línea "Gratis · Entra con…" no aparece. No hay redirect |
| La sesión venció o `getClaims()` devuelve error (Supabase caído) | Se trata como sin sesión. La landing no depende de ninguna otra query |
| JS deshabilitado o todavía sin hidratar | Todo el texto y los mockups se ven en su estado final. Sin `data-journey-ready` no hay estados ocultos |
| `prefers-reduced-motion` | Sin flotar, titilar, marquee, confetti ni "pop". El astronauta cambia de nodo sin transición y los mockups se ven terminados |
| Una pantalla alta muestra varias estaciones a la vez | La actual es la que cruza la línea central. El resto queda `visited` o `upcoming` |
| Scroll muy rápido, o clic en "Preguntas" (salto de ancla) | El astronauta termina en la última estación. Las transiciones intermedias se redirigen (CSS), no se encolan |
| El usuario vuelve a subir | El astronauta retrocede hasta la estación que está en pantalla. Las poses y los mockups ya animados no se repiten (`data-reached`) |
| Cambia el ancho de la ventana, rota el celular o terminan de cargar imágenes | El `ResizeObserver` vuelve a medir los nodos y el astronauta y el riel se recolocan |
| Clics seguidos en la mascota del hero | Cada clic avanza una pose. Los confetti se superponen sin romper nada |
| Falla el `import()` de `canvas-confetti` | La pose cambia igual: `launchConfetti` sí propaga el error, y `HeroMascot` lo atrapa con `.catch(console.error)`, como `use-celebration.ts` del spec 14 |
| Tema claro | Los logos de DevPathlles y Code Quest van sobre `bg-logo-backdrop`. El degradado del `h1` y los textos mantienen el contraste medido |
| 360 px de ancho | El marquee queda dentro de `overflow-hidden`. El riel pasa a la izquierda. No hay scroll horizontal |
| Se pega el link del deploy en Discord | Muestra la tarjeta OG de la landing |
| El admin desactiva o renombra un curso del ejemplo | La landing no cambia: el ejemplo es fijo y está rotulado como ejemplo (ver Riesgos) |

## Modelo de datos

Este spec **no crea tablas, columnas, migraciones ni funciones SQL**: la landing no guarda nada. La
única lectura de Supabase es `getClaims()`, para elegir los CTAs. Las estructuras nuevas son constantes
y funciones puras en TypeScript.

### `lib/landing/cta.ts`

```ts
export type LandingLink = { label: string; href: string };

// Sin sesión: header "Entrar" → /login; primary "Arma tu ruta" → /login?next=/quiz.
// Con sesión: los dos "Ir a mi panel" → /dashboard.
export function landingCtas(isSignedIn: boolean): { header: LandingLink; primary: LandingLink };
```

La usan la cabecera, el hero y el CTA final, para no repetir la misma condición en tres archivos. El
`next=/quiz` lo acepta `parseNextPath` (spec 15).

### `lib/landing/example-path.ts`

```ts
import type { StepOrigin } from "@/lib/paths/types";

export type ExampleCourse = {
  slug: string;
  title: string; // igual que en data/courses.json
  hours: number; // igual que en data/courses.json
  origin: StepOrigin;
  engineReason: string; // con la misma plantilla que build-path.ts
};

export type ExampleDiscardedCourse = {
  slug: string;
  title: string;
  hours: number;
  discardReason: string; // el mismo texto que usa build-path.ts
};

export const EXAMPLE_ANSWERS: readonly string[];
// ["Meta: React", "Nivel: tengo bases", "Ya domino: JavaScript", "Interés: Docker",
//  "6 h por semana", "Plazo: 6 meses"]

export const EXAMPLE_FREE_TEXT: string;
// "Quiero conseguir mi primer trabajo como frontend y ya sé algo de JavaScript."

export const EXAMPLE_COURSES: readonly ExampleCourse[];
// react-de-cero       "React: de cero a experto"                         46 h  requerido
//   "Requerido para llegar a React en 6 meses."
// typescript-guia-completa "TypeScript: Tu completa guía y manual de mano." 8.5 h recomendado
//   "Recomendado para llegar a React en 6 meses."
// docker-guia-practica "Docker - Guía práctica de uso para desarrolladores" 14 h interes
//   "Sumado por tu interés en Docker."

export const EXAMPLE_DISCARDED: readonly ExampleDiscardedCourse[];
// javascript-moderno "JavaScript Moderno: Guía para dominar el lenguaje" 28.5 h "ya lo dominas"

export const EXAMPLE_AI: { title: string; firstCourseReason: string };
// title: "Tu camino a tu primer empleo frontend con React"
// firstCourseReason: "Es la base que piden las ofertas junior de frontend: con él armas tus
//   primeros proyectos de portafolio."
```

- La IA de ejemplo retoma visiblemente el texto libre ("primer trabajo como frontend"), igual que exige
  el spec 11.
- El XP del mockup de progreso **no se escribe a mano**: sale de `courseXp` y `levelFromXp`
  (`lib/gamification/xp.ts`, spec 14) sobre el primer curso (46 h → 460 XP → nivel 3, 160 / 300).

### `lib/landing/journey-state.ts`

```ts
export type StationState = "visited" | "current" | "upcoming";

export function stationState(index: number, currentIndex: number): StationState;

// Qué fracción del riel (del primer al último nodo) va rellena hasta el nodo actual. Con un solo
// nodo, o con centros iguales, devuelve 0.
export function railFillRatio(nodeCenters: readonly number[], currentIndex: number): number;
```

### `components/landing/mascot-poses.ts`

```ts
export type MascotPoseId = "rocket" | "wave" | "orb" | "torch" | "orbit" | "flame";

export type MascotPose = { src: string; width: number; height: number };

// Tamaños reales de los archivos: 512×728, 384×384, 512×506, 512×554, 512×481, 512×637.
export const MASCOT_POSES: Record<MascotPoseId, MascotPose>;

export const HERO_POSE_CYCLE: readonly MascotPoseId[]; // rocket, wave, orb, torch, orbit, flame

export function nextHeroPose(current: MascotPoseId): MascotPoseId; // después de la última, la primera
```

## Plan de implementación

1. **Verificar las APIs.** Con Context7:
   - Tailwind v4: `@theme` con `--animate-*` y `@keyframes`, `@utility`, `motion-safe`/`motion-reduce`,
     variantes `group-data-[…]` y arbitrarias como `[animation-play-state:paused]`.
   - Base UI: `Accordion` de una sola apertura y si el indicador de `Progress` anima el cambio de
     `value`.
   - shadcn: `Button` con `render={<Link />}` y `nativeButton={false}`.

   En `node_modules/next/dist/docs/`: route groups, `opengraph-image` dentro de un route group,
   metadata de página y `next/image` (`preload`, `loading`, `fetchPriority`).

   Además: confirmar que existen los iconos de Phosphor que nombra el spec (`ChatCircleTextIcon`,
   `PathIcon`, `SparkleIcon`, `TrophyIcon`, `ShareNetworkIcon`, `GithubLogoIcon`, `ArrowDownIcon` y
   `FireIcon`). `IntersectionObserver` y `ResizeObserver` se verifican en MDN.

   Verificación: queda anotado qué se confirmó. Si algo no existe, se reemplaza antes de escribirlo.
2. **Mover la landing y conectar los CTAs.**
   - `lib/landing/cta.ts` + `cta.test.ts`.
   - `app/(marketing)/page.tsx` (Server Component: `createClient()` + `getClaims()` → `isSignedIn`, y
     `metadata`), con la cabecera y un hero mínimo (título, bajada y CTAs, todavía sin mascota ni
     estrellas).
   - Borrar `app/page.tsx`.

   Verificación: `/` responde con los CTAs correctos con y sin sesión, `npm run build` no se queja de
   dos páginas para `/`, y el login desde "Arma tu ruta" termina en `/quiz`.
3. **Tokens y hero completo.**
   - En `app/globals.css`: `--animate-float`, `--animate-marquee`, `--animate-twinkle` y
     `@utility starfield`.
   - `components/landing/mascot-poses.ts`, `hero-mascot.tsx` y `hero-mascot.test.tsx` (clic → siguiente
     pose, vuelta al inicio, `launchConfetti` mockeado y llamado, el globo desaparece).
   - El hero con fondo, layout de dos columnas y la franja `tech-strip.tsx`.

   Verificación: `npm run test` pasa. En el navegador, la mascota flota, cambia de pose y lanza confetti.
   Con "reducir movimiento" emulado, nada se mueve y la pose igual cambia.
4. **Datos de ejemplo.** `lib/landing/example-path.ts` + `example-path.test.ts`: cada `slug` existe en
   `data/courses.json` con el mismo `title` y las mismas `hours`, los `origin` son válidos y
   `discardReason` es `"ya lo dominas"`.

   Verificación: `npm run test`.
5. **Recorrido.**
   - `lib/landing/journey-state.ts` + test (`stationState` en los tres casos, y `railFillRatio` con 1
     nodo, en el primero, en el medio y en el último).
   - `components/landing/journey.tsx`: observer, `data-state`, `data-reached`, `data-journey-ready`,
     riel, astronauta y `ResizeObserver`.
   - `how-it-works.tsx` con las 5 estaciones, sus poses y textos.

   Verificación en el navegador, a 360 × 640, 1366 × 768 y 1920 × 1080:
   - al bajar, cada estación se enciende y el astronauta viaja;
   - al subir, retrocede;
   - no hay scroll horizontal.
6. **Mockups.** `components/landing/mockups/{quiz,engine,ai,progress,share}-mockup.tsx`, con sus
   animaciones al llegar bajo `[data-journey-ready]`.

   Verificación:
   - con JS desactivado, los 5 mockups se ven terminados;
   - con JS, se animan una sola vez y después del viaje del astronauta;
   - la `XpBar` muestra los valores calculados con `xp.ts`.
7. **Preguntas, CTA final y footer.**
   - `landing-faq.tsx` y `final-cta.tsx`.
   - `public/code-quest.webp`, con `sharp`: `trim`, redimensionar al doble del ancho de uso y `webp` con
     calidad ~82 (patrón de `CLAUDE.md` §"Marca y assets"), ≤ 40 KB. Borrar los dos PNG.
   - `landing-footer.tsx`.

   Verificación: el `Accordion` se usa con el teclado, el logo de Code Quest se lee en los dos temas y
   los links externos abren en otra pestaña.
8. **Tarjeta OG.** `app/(marketing)/opengraph-image.tsx`.

   Verificación: `/opengraph-image` devuelve el PNG y el `<head>` de `/` lo referencia, pero el de
   `/login` no. Pegar la URL del preview de Vercel en Discord muestra la tarjeta.
9. **Pulido visual y accesibilidad** con la skill `ui-ux-pro-max` (su checklist previo a la entrega):
   - contraste de texto ≥ 4.5:1 y del degradado del `h1` ≥ 3:1 en los dos temas;
   - foco visible en la cabecera, la mascota, el `Accordion` y el footer;
   - jerarquía de encabezados h1 → h2 → h3;
   - 360 px de ancho;
   - "reducir movimiento" emulado;
   - Lighthouse móvil sobre `npm run build && npm run start`.

   Verificación: los criterios de accesibilidad y rendimiento de abajo se cumplen.
10. **Cierre y documentación.**
    - `docs/SPECS-MAP.md`:
      - la fila 05 (objetivo y "Depende de");
      - §7 "05 · landing";
      - regla 5, con la propiedad de `app/(marketing)/*`, `components/landing/*`, `lib/landing/*` y
        `public/code-quest.webp`, más las excepciones de `app/globals.css` y del borrado de
        `app/page.tsx`;
      - §6, con las poses que ahora usa la landing.
    - `CLAUDE.md`:
      - "Estado del proyecto" pasa a "specs 01–15";
      - en la tabla de §"Marca y assets", la fila de `code-quest.webp` y los nuevos usos de
        `logo.webp`, `astronauta.webp` y las poses de `streak/`.

    Verificación: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` y
    `npm run format:check` pasan.

## Criterios de aceptación

- [ ] `app/page.tsx` ya no existe y `app/(marketing)/page.tsx` resuelve `/`.
- [ ] Sin sesión: la cabecera muestra "Entrar" → `/login`, y el hero y el CTA final muestran "Arma tu
      ruta" → `/login?next=/quiz`. Después del login con Discord, la persona llega a `/quiz`.
- [ ] Con sesión: los tres CTAs dicen "Ir a mi panel" → `/dashboard`, y `/` no redirige.
- [ ] Si `getClaims()` falla, la landing se ve completa, con los CTAs de sin sesión.
- [ ] Al hacer scroll por "Cómo funciona", la estación que cruza el centro de la pantalla queda como
      actual: su nodo con glow, el riel relleno hasta ella y el astronauta junto a ella, que llega con
      una transición de `TRAVEL_DURATION_MS`. Al subir, el astronauta vuelve a la estación en pantalla.
- [ ] La pose y el mockup de cada estación se animan solo la primera vez que llega, después del viaje
      del astronauta.
- [ ] Las 5 estaciones y el hero usan las poses de la tabla de reparto.
- [ ] La mascota del hero cambia de pose con clic, Enter o Espacio, en el orden del ciclo, vuelve a la
      primera después de la sexta y lanza confetti. El globo "¡Tócame!" desaparece después del primer
      cambio.
- [ ] La franja muestra las 15 tecnologías de `TECHNOLOGIES`. El marquee se detiene con el puntero
      encima.
- [ ] Con "reducir movimiento" no hay flotar, titilar, marquee, confetti ni "pop". El astronauta cambia
      de nodo sin transición y todo el contenido se ve terminado.
- [ ] Con JS desactivado, los 5 mockups y todos los textos se ven en su estado final.
- [ ] Las 6 preguntas frecuentes abren y cierran con el teclado.
- [ ] El footer muestra `code-quest.webp` legible en los dos temas, el crédito de Code Crafters y los 4
      links. Los externos abren en otra pestaña con `rel="noopener noreferrer"`.
- [ ] `public/LOGO_2026_CODE-QUEST.png` y `public/codequest-logo_sin_sombra.png` no existen, y
      `public/code-quest.webp` pesa ≤ 40 KB.
- [ ] El `<head>` de `/` referencia su tarjeta OG y el de `/login` no. En Discord, el link del deploy se
      ve con la tarjeta.
- [ ] A 360 px no hay scroll horizontal, y a 360 × 640 el CTA principal se ve sin hacer scroll.
- [ ] En los dos temas, el texto normal tiene contraste ≥ 4.5:1 y los dos extremos del degradado del
      `h1`, ≥ 3:1.
- [ ] Lighthouse móvil sobre el build de producción: Accesibilidad ≥ 95 y CLS < 0.1.
- [ ] Todo `<Image>` tiene `alt` descriptivo, o `alt=""` si es decorativo y el texto equivalente está al
      lado.
- [ ] `package.json` no suma dependencias.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` y `npm run format:check`
      pasan.

## Decisiones

- **Sí:** interacción pasiva, disparada por el scroll. **No:** una demo en vivo del motor, un stepper,
  un interruptor "Sin IA / Con IA" ni un mapa jugable. Se pidió así en la definición: que la página se
  anime cuando el usuario llega a cada parte, no que tenga que manipular nada para entender.
- **Sí:** riel vertical que baja con la página (en desktop, con las tarjetas alternadas). **No:** el
  zigzag fijo (sticky) del spec 12 en una columna, porque su pista mide ~690 px (`trackHeight(5)`) y se
  corta en laptops de 768 px de alto.
- **Sí:** el astronauta sigue al scroll en los dos sentidos y el riel funciona como indicador de
  progreso. **No:** que solo avance. Las animaciones de las poses y los mockups sí corren una sola vez,
  para que no parpadeen al subir y bajar.
- **Sí:** la coreografía reusa `TRAVEL_DURATION_MS` y `stepNodeClassName` del spec 12, así que el
  recorrido se mueve y se ve como el mapa real. **No:** duración ni colores propios.
- **Sí:** datos de ejemplo fijos en código, con cursos reales, y un test contra `data/courses.json`.
  **No:** leerlos de Supabase: la landing no depende de la base (solo `getClaims()`, que falla sin
  romper nada).
- **Sí:** la IA de ejemplo retoma el texto libre. Es la regla del spec 11: el valor de la IA tiene que
  verse coherente con lo que escribió el usuario.
- **Sí:** sin dependencias nuevas (tokens CSS, `IntersectionObserver`, `ResizeObserver` y el
  `canvas-confetti` que ya está). **No:** `motion`/framer-motion (~30 KB solo para la landing), mismo
  criterio que usó el 12 para rechazar React Flow.
- **Sí:** mejora progresiva con `data-journey-ready`: los estados ocultos solo existen si hay JS y
  movimiento permitido. **No:** partir de `opacity-0` en el HTML del servidor, porque sin JS la sección
  quedaría en blanco.
- **Sí:** con sesión, la landing se ve igual y los CTAs pasan a "Ir a mi panel". **No:** redirigir a
  `/dashboard`, porque el jurado y quien ya entró no podrían volver a ver la landing.
- **Sí:** el CTA principal va a `/login?next=/quiz`, porque una persona nueva llega un clic antes a su
  ruta. "Entrar" en la cabecera sigue yendo a `/login` → `/dashboard`, para quien vuelve.
- **Sí:** `landingCtas` en `lib/landing/cta.ts`, porque la misma condición se decidía en tres
  componentes y así queda con un test. No es una abstracción por repetición: es una regla con dos
  estados.
- **Sí:** el fondo de estrellas (`@utility starfield` + `--animate-twinkle`), la única pieza visual
  nueva. Pega con la mascota astronauta, usa solo tokens del tema y se apaga con "reducir movimiento".
  Ningún componente existente da un fondo con textura.
- **Sí:** el logo de Code Quest en el footer, en su versión sin sombra, optimizado a
  `public/code-quest.webp` (nombre en inglés, como el resto de `public/`) y sobre `bg-logo-backdrop`.
  **No:** en el hero, porque competiría con el logo de DevPathlles.
- **Sí:** la franja de tecnologías lee `TECHNOLOGIES` (spec 04). **No:** una lista escrita a mano que
  se desincronice del cuestionario.
- **Sí:** sin cifras del catálogo. Los cursos cambian desde el panel del spec 10, y un "74 cursos" fijo
  quedaría viejo. Los contadores también se descartaron en la definición.
- **Sí:** la tarjeta OG en `app/(marketing)/`, que solo aplica a `/`. **No:** en `app/`, porque la
  heredarían `/login`, `/sistema-diseno` y cualquier ruta sin tarjeta propia.
- **Sí:** las anclas saltan sin animación. **No:** `scroll-behavior: smooth` global, porque Next 16
  pide marcar el `<html>` de `app/layout.tsx` para no animar las navegaciones, y ese archivo no es de
  este spec.
- **Sí:** `loading="eager"` + `fetchPriority="high"` en la imagen LCP. **No:** `priority`, deprecado en
  Next 16. Los `priority` que ya existen en otras páginas no se tocan.
- **Sí:** la landing es dinámica, porque lee la sesión en cada request. `proxy.ts` ya llama a
  `getClaims()` en cada request, así que no suma un viaje nuevo al auth.
- **Sí:** el número 05 y el slug `landing`, como fija `docs/SPECS-MAP.md`, aunque se escribe después
  del 15. La regla "el mayor + 1" del skill habría dado 16, que el mapa reserva para
  `path-recalculation`.
- **Sí (decidido en el paso 9):** oscurecer en el tema claro `--level-required` (L 0.57 → 0.525),
  `--level-recommended` (0.55 → 0.515) y `--ai` (0.545 → 0.505), con el mismo hue y chroma. axe-core
  marcó los badges "requerido", "recomendado" y "Generado con IA" en 3.91, 4.00 y 3.96:1: los tokens
  del ADR 0002 se midieron contra el fondo de la página, pero el badge pinta el texto sobre el mismo
  token al 15 %. Ahora dan 4.6:1, en toda la app. **No:** dejarlo como deuda fuera del 05, porque la
  landing no habría cumplido su propio criterio de contraste en tema claro. Los `--chart-*` y el tema
  oscuro no cambian.
- **Sí:** el bloque de la IA del mockup va sin fondo propio, con un borde `border-ai`. **No:**
  `bg-ai/10` ni `bg-surface`, porque el `AiBadge` ya trae su tinta y sobre otro fondo bajaba a 3.5–4.1:1.
- **Sí:** los mockups que usan `step-meta` o el contexto del recorrido son Client Components
  (`engine-mockup`, `progress-mockup`), igual que `landing-faq` por el `Accordion`. Los iconos de
  Phosphor sin `/ssr` usan un contexto de React que no corre en el servidor.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| La línea central del `IntersectionObserver` elige mal la estación en viewports extremos | Probarlo en el paso 5 a 360 × 640, 1366 × 768 y 1920 × 1080. Si una estación es más alta que la ventana, igual cruza la línea: la regla no depende de la altura |
| Las posiciones medidas se desalinean cuando cargan las imágenes o cambian las fuentes | `ResizeObserver` sobre el `ol` y dimensiones fijas (`width`/`height`) en todas las `Image`, para no mover el layout (CLS) |
| El `h1` con degradado no llega al contraste en el tema oscuro (`--primary` sobre el fondo da ~2.5:1) | El degradado usa tokens claros en oscuro (`--primary-bright`, `--chart-2`) y se miden los dos extremos en el paso 9. Si no llegan a 3:1, el resaltado va en color sólido `text-primary-bright` |
| `opengraph-image` dentro de un route group no se resuelve para `/` | Resuelto en el paso 8: funciona, y Next le agrega un sufijo a la URL (`/opengraph-image-<hash>`) para no chocar con otros grupos. El `<head>` de `/` la referencia y el de `/login` no |
| El link "Licencia MIT" da 404 mientras no exista `LICENSE` | Resuelto: `LICENSE` (MIT, "Code Crafters", 2026) se agregó en esta rama a pedido del usuario. El link funciona cuando la rama llega a `master` |
| El ejemplo queda viejo si el admin cambia el curso en Supabase | El test compara contra `data/courses.json`, no contra la base, y los mockups están rotulados como ejemplo. Una diferencia de nombre u horas no rompe nada |
| Peso de las poses (6 imágenes de 45–83 KB) | Las poses de las estaciones cargan lazy. El hero solo carga la pose actual y la siguiente |
| Demasiado movimiento junto (flotar, titilar, marquee y el recorrido) | En cada vista hay como mucho 1 o 2 cosas animándose (el hero y la franja quedan arriba, fuera de la vista del recorrido), y todo se apaga con "reducir movimiento" |
