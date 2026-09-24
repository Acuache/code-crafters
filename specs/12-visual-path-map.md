# SPEC 12 — Mapa visual de la ruta: un camino en zigzag estilo Duolingo sobre los mismos pasos

> **Estado:** Aprobado
> **Depende de:** SPEC 08, SPEC 09
> **Fecha:** 2026-09-24
> **Objetivo:** Agregar a `/paths/[id]` una vista "Mapa", la que se ve por defecto, que muestra la
> ruta como un camino en zigzag con unidades por programa, nodos por estado, la mascota en el
> próximo paso y un modal de detalle para cambiar el estado. Se arma con CSS y SVG sobre los mismos
> datos y actions del spec 08, sin React Flow ni dependencias nuevas.

## Por qué existe este spec

La lista del spec 08 es completa, pero se lee como un documento: diez tarjetas iguales una debajo de
otra. El concurso se evalúa **navegando la app desplegada** (`docs/ENUNCIADO.md`, criterio 4, "UI
agradable y entendible"), y una ruta de aprendizaje se entiende mejor como un camino que se recorre
que como una tabla. Durante el spec 08 el usuario pidió explícitamente un recorrido estilo Duolingo.

`docs/SPECS-MAP.md` planeaba este spec con **React Flow + dagre**. Se descarta (ver Decisiones): la
ruta es **lineal** (un orden `stage`/`position`, sin ramas ni aristas cruzadas), así que un motor de
grafos con layout automático resuelve un problema que no existe y suma ~200 KB de cliente. Un zigzag
determinista se calcula con una función pura de pocas líneas y se dibuja con CSS + un SVG.

**Dependencias, una por motivo distinto:**

- **SPEC 08** — `PathStepView`, el estado optimista de `components/paths/path-steps-view.tsx`, las
  actions `setStepStatus` / `discardStep` / `restoreStep`, `StepStatusToggle` (que el 08 dejó en
  archivo propio justamente para este spec), `BudgetCard`, `DiscardedSteps` y `summarizePathProgress`.
- **SPEC 09** — `findNextStep` de `lib/progress/next-step.ts`: el "próximo curso" del mapa es
  exactamente el mismo que el dashboard muestra en la tarjeta de la ruta, no una segunda definición.

## Alcance

**Entra:**

- `lib/path-map/zigzag-layout.ts`: funciones puras sin I/O ni DOM — posición de cada nodo en la
  pista y el `d` de la curva SVG entre dos nodos. Carpeta nueva, propiedad de este spec.
- `lib/path-map/zigzag-layout.test.ts`: casos del layout (ver Plan, paso 2).
- `lib/path-map/motion.ts`: los tiempos de la coreografía al marcar un paso como hecho, compartidos
  por el mapa y el nodo _(agregado durante la implementación, ver Decisiones)_.
- `components/paths/path-map.tsx`: la vista de mapa — una unidad por grupo (mismo agrupado que la
  lista), banner de unidad, pista con nodos y conectores, mascota en el próximo paso y scroll inicial
  hasta él.
- `components/paths/path-map-node.tsx`: un nodo — botón circular con número o check, título corto
  debajo, halo pulsante si es el próximo paso, globo "Empezar"/"Continuar" y animación de "pop" al
  pasar a hecho.
- `components/paths/step-detail-dialog.tsx`: el modal de detalle de un paso, centrado en
  escritorio y en móvil _(cambiado durante la implementación: era un Sheet lateral, ver
  Decisiones)_.
- `app/globals.css`: **solo** el token de animación `--animate-step-pop` y su `@keyframes` dentro de
  `@theme` (Tailwind v4). Ningún color, radio ni sombra nuevos.
- **Excepción a la regla 5 del mapa en `components/paths/path-steps-view.tsx` (spec 08):** agregar
  las `Tabs` "Mapa" / "Lista", el estado del paso seleccionado, montar `StepDetailDialog` y pasar
  `groupByProgram` + `stepNumbers` también a `PathMap`. La lógica optimista, las actions y el
  agrupado no se reescriben: se reusan tal cual.
- **Excepción a la regla 5 en `app/(app)/paths/[id]/page.tsx` (spec 08, ya tocado por el 11):**
  leer `searchParams.vista` y pasar `initialView` a `PathStepsView`. Nada más.
- Actualizar `docs/SPECS-MAP.md` (fila 12 de la tabla, §7 "12 · visual-path-map", regla 5 con la
  propiedad de los archivos nuevos y las dos excepciones de arriba) y la mención a React Flow en el
  stack de `CLAUDE.md`.

**Qué NO entra (queda para otros specs o fuera):**

- React Flow, dagre o cualquier dependencia nueva en `package.json`.
- Confetti, XP, niveles, insignias o racha (spec 13). El "pop" de este spec es una animación del
  nodo, no una celebración: el spec 13 decide si le suma algo encima.
- Bloquear pasos pendientes hasta completar el anterior (ver Decisiones).
- Mostrar los pasos descartados en el camino: siguen en el acordeón "Qué quitamos y por qué" del
  08, debajo de las dos vistas.
- Reordenar pasos arrastrando nodos, zoom o paneo del mapa.
- Mapa en el dashboard o en la ruta pública (spec 14): solo `/paths/[id]`.
- Cualquier migración, columna o action nueva (regla 6 del mapa).
- Tocar `lib/progress/*` (08/09), `lib/paths/*` (04) o `components/paths/step-row.tsx`.

## Composición de UI

Todo se arma con `components/ui/*`, `components/brand/*`, `public/astronauta.webp` y
`@phosphor-icons/react` (sufijo `Icon`), sin colores, radios ni sombras fuera de los tokens del tema
(`CLAUDE.md` §"UI: componer, no crear"). Los tres componentes nuevos son **composiciones**: el
nodo circular reusa exactamente las clases de estado del nodo de la línea de tiempo de
`step-row.tsx` (lima para hecho, violeta + `shadow-brand-glow` para en curso, borde gris para
pendiente), en tamaño mayor.

La skill `ui-ux-pro-max` no tiene en su base un estilo "gamificado" (dos búsquedas sin
coincidencias); el estilo sale del sistema de diseño ya existente (ADR 0002). De la skill sí se
aplican estas reglas de UX: respetar `prefers-reduced-motion`, nodos como `<button>` nativos con
nombre accesible y foco visible, no transmitir el estado solo por color, y al menos 8 px entre
objetivos táctiles.

| Elemento           | Qué se reusa                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selector de vista  | `Tabs` + `TabsList` + `TabsTrigger` × 2: "Mapa" (`MapTrifoldIcon`) · "Lista" (`ListBulletsIcon`), arriba de los pasos y debajo de `BudgetCard`                                                                                                                                                                                                                                                       |
| Banner de unidad   | `<section>` con `brand-gradient-soft` + borde + `rounded-3xl`: `Eyebrow` ("Programa oficial" / "Extra") + `programs.name` como `h2` + "N de M hechos · X h" + `Progress` del grupo (mismo cálculo por grupo que ya hace la lista)                                                                                                                                                                    |
| Pista              | `<ol>` con alto calculado por el layout; los nodos se posicionan en absoluto con las coordenadas de `zigzag-layout.ts`; un `<svg aria-hidden>` detrás con un `<path>` por tramo                                                                                                                                                                                                                      |
| Conector           | Tramo recorrido: trazo sólido en `var(--primary-bright)`; tramo por recorrer: trazo punteado en `var(--border)`. Colores por token, sin hex                                                                                                                                                                                                                                                          |
| Nodo               | `<button>` circular de 64 px: número (`font-heading`, `tabular-nums`) o `CheckIcon weight="bold"`; título del curso debajo en `text-xs`, `line-clamp-2`, ancho fijo del layout                                                                                                                                                                                                                       |
| Próximo paso       | Halo (`motion-safe:animate-ping` en un anillo detrás del nodo), globo encima con "Empezar" (si está pendiente) o "Continuar" (si está en curso) y `astronauta.webp` a 72 px del lado opuesto al desplazamiento del nodo (`alt=""`: el globo ya dice qué es)                                                                                                                                          |
| Detalle            | `Dialog` + `DialogContent` (modal centrado) + `DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`, con un `DialogClose` propio sobre la portada: portada (`next/image`, mismo `remotePatterns` del 08), `LevelBadge` / `Badge` "interés", horas, razón, `StepStatusToggle`, `Button variant="ghost"` "Quitar" (solo `pending`, `TrashIcon`) y `Button` "Ver curso en DevTalles" (`ArrowSquareOutIcon`, pestaña nueva) |
| Deshacer / errores | Los mismos `toast` que ya dispara `path-steps-view.tsx`; "Quitar" desde el modal cierra el modal y muestra el toast con "Deshacer"                                                                                                                                                                                                                                                                   |

## Modelo de datos

No hay tablas, columnas ni actions nuevas. El mapa lee el mismo arreglo de `PathStepView` que ya
arma `page.tsx` para la lista, con el estado optimista de `path-steps-view.tsx`.

### `lib/path-map/zigzag-layout.ts`

```ts
// Medidas en px de la pista. La pista tiene ancho fijo y se centra: cabe en un móvil de 360 px
// (360 − 2 × 16 de gutter = 328 ≥ 320).
export const TRACK_WIDTH = 320;
export const NODE_SIZE = 64;
export const LABEL_WIDTH = 128;
export const ROW_HEIGHT = 128; // nodo + título de dos líneas + aire

// Máximo desplazamiento horizontal desde el centro: el título (el elemento más ancho del nodo)
// nunca se sale de la pista.
export const MAX_OFFSET = (TRACK_WIDTH - LABEL_WIDTH) / 2; // 96

// Patrón de ida y vuelta, en fracciones de MAX_OFFSET.
const ZIGZAG_PATTERN = [0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5] as const;

export type NodePosition = { x: number; y: number }; // centro del nodo dentro de la pista

// `firstStepNumber` es el número corrido (1..N) del primer paso de la unidad: el zigzag sigue
// su patrón a través de las unidades en vez de reiniciarse en cada banner.
export function computeNodePositions(
  count: number,
  firstStepNumber: number,
): NodePosition[];

export function trackHeight(count: number): number; // count × ROW_HEIGHT

// `d` de una curva cúbica vertical entre dos centros (tangentes verticales en los dos extremos).
export function buildSegmentPath(from: NodePosition, to: NodePosition): string;
```

### Qué calcula `path-map.tsx`

- **Unidades:** el mismo `groupByProgram(activeSteps)` de `path-steps-view.tsx`, que se le pasa ya
  calculado; el mapa no agrupa por su cuenta.
- **Tramo recorrido:** el tramo entre el nodo `i` y el `i + 1` de una unidad se pinta como recorrido
  si el paso `i` está `done`. Los conectores no cruzan banners.
- **Próximo paso:** `findNextStep` (spec 09) sobre los pasos vigentes. Devuelve `courseTitle`, no
  `id`; el nodo se identifica por título, que es único dentro de una ruta porque el motor deduplica
  cursos (spec 04). Sin próximo paso (todo hecho), no hay halo, globo ni mascota.

### Cambios en `path-steps-view.tsx` y `page.tsx`

```ts
export type PathView = "mapa" | "lista";

// page.tsx
type PathPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string }>;
};
// initialView = vista === "lista" ? "lista" : "mapa"   — cualquier otro valor cae en "mapa"

// PathStepsView
type PathStepsViewProps = {
  steps: PathStepView[];
  budgetHours: number | null;
  initialView: PathView;
};
// estado nuevo: view (PathView) y selectedStepId (string | null)
```

Cambiar de pestaña actualiza la URL con `window.history.replaceState` (`?vista=lista`; en "mapa" se
quita el parámetro), para que recargar o compartir el link conserve la vista _(cambiado durante la
implementación: era `router.replace`, ver Decisiones)_. El modal lee el paso seleccionado de
`optimisticSteps`, así que el toggle de estado se refleja al instante en el modal, en el nodo y en el
conector a la vez.

## Plan de implementación

1. **Verificación de APIs.** Con Context7: `Tabs` y `Sheet`/`Dialog` de shadcn sobre Base UI (API
   controlada, `side`), keyframes/animaciones en `@theme` de Tailwind v4 y la variante
   `motion-safe:`, y utilidades de `tw-animate-css` para la entrada escalonada. En
   `node_modules/next/dist/docs/`: `searchParams` como `Promise` en una página y
   `useRouter().replace` con `scroll: false`. Verificación: anotar en el paso qué se confirmó; nada
   se escribe sin verificar.
2. **Layout puro + tests.** `lib/path-map/zigzag-layout.ts` y su test. Casos: con
   `firstStepNumber = 1` los primeros 8 nodos siguen el patrón `0, .5, 1, .5, 0, −.5, −1, −.5` ×
   `MAX_OFFSET` desde el centro; con `firstStepNumber = 4` el primer nodo arranca en `0.5`
   (continuidad entre unidades); para cualquier conteo, todo `x ± LABEL_WIDTH / 2` queda dentro de
   `[0, TRACK_WIDTH]`; los `y` crecen de a `ROW_HEIGHT`; `buildSegmentPath` empieza en `from` y
   termina en `to`. Verificación: `npm run test` en verde junto con los tests de los specs
   anteriores.
3. **Nodo.** `path-map-node.tsx`: estados, título, nombre accesible
   ("Paso 3 de 12: React desde cero, en curso. Abrir detalle"), `focus-visible:ring`, halo, globo y
   "pop". El "pop" solo corre cuando el paso **cambia** a `done` en la sesión, no al cargar un paso
   que ya estaba hecho. Verificación: se ejercita en el paso 5.
4. **Token de animación.** `--animate-step-pop` + `@keyframes` en `app/globals.css`. Verificación:
   `npm run build` pasa y la clase `animate-step-pop` existe en el CSS generado.
5. **Mapa.** `path-map.tsx`: banners, pista, SVG de conectores (con transición de
   `stroke-dashoffset` al rellenarse un tramo, `motion-safe`), mascota, entrada escalonada
   (`motion-safe`, una sola vez al montar) y scroll suave hasta el próximo nodo al montar (instantáneo
   con `prefers-reduced-motion`). Verificación: montado temporalmente en lugar de la lista, una ruta
   real se ve en zigzag con los estados correctos.
6. **Modal de detalle.** `step-detail-dialog.tsx`: contenido de la tabla de Composición, con
   `finalFocus` apuntando al nodo que lo abrió (no hay `DialogTrigger`). Verificación: se ejercita
   en el paso 7.
7. **Integración.** Las excepciones en `path-steps-view.tsx` (Tabs, `selectedStepId`, modal) y en
   `page.tsx` (`searchParams.vista`). Verificación: `/paths/[id]` abre en "Mapa"; tocar un nodo o el
   globo abre el modal; cambiar el estado en el modal actualiza nodo, conector y `BudgetCard` sin
   recargar y persiste al recargar (SQL o recarga); "Quitar" cierra el modal, el nodo desaparece,
   los números se corren, y "Deshacer" lo devuelve; `?vista=lista` abre la lista del 08 intacta.
8. **Pulido visual y accesibilidad.** Revisión con la skill `ui-ux-pro-max` (checklist de
   `references/pro-rules.md` aplicable a web): contraste en tema claro y oscuro, foco visible,
   orden de tabulación = orden de estudio, 8 px mínimos entre nodos. En el navegador a 360 px de
   ancho, en tema claro y oscuro, y con "reducir movimiento" emulado en DevTools.
9. **Cierre.** Actualizar `docs/SPECS-MAP.md` y `CLAUDE.md` (ver Alcance). Verificación:
   `npm run test`, `npm run lint` y `npm run build` pasan; `package.json` no cambió.

## Criterios de aceptación

- [ ] `/paths/[id]` sin parámetros muestra la vista "Mapa"; `?vista=lista` muestra la lista del spec
      08 sin cambios visibles; cualquier otro valor de `vista` muestra el mapa.
- [ ] Cambiar de pestaña actualiza la URL sin saltar al principio de la página, y recargar conserva
      la vista elegida.
- [ ] El mapa tiene un banner por programa, en el mismo orden que la lista, con "Por tus intereses"
      al final cuando existe; cada banner muestra "N de M hechos · X h" y una barra de progreso del
      grupo.
- [ ] Los nodos siguen el zigzag sin reiniciarse en cada banner, y el número de cada nodo coincide
      con el de la lista para el mismo paso.
- [ ] Un nodo hecho muestra check en lima, uno en curso se ve en violeta con brillo, y uno
      pendiente en gris con su número: el estado se distingue sin depender del color (check vs.
      número, y el nombre accesible lo dice).
- [ ] El tramo de conector que sale de un paso hecho es sólido; el resto es punteado; no hay
      conector entre dos unidades.
- [ ] El próximo paso (el mismo que el dashboard muestra para esa ruta) tiene halo, globo
      "Empezar" o "Continuar" y la mascota al lado; con todos los pasos hechos no aparece ninguno de
      los tres.
- [ ] Al abrir el mapa, la página hace scroll hasta el próximo paso.
- [ ] Tocar un nodo o el globo abre el modal del paso, centrado en escritorio y en móvil; muestra
      portada, procedencia, horas, razón, toggle de estado, "Ver curso en
      DevTalles" y "Quitar" solo si está pendiente.
- [ ] Cambiar el estado desde el modal actualiza al instante el modal, el nodo, el conector, el
      banner y `BudgetCard`, y el cambio persiste al recargar.
- [ ] Marcar "Hecho" desde el modal cierra el modal y el nodo hace "pop"; "Pendiente" y "En curso"
      lo dejan abierto.
- [ ] Después del pop, el tramo hacia el siguiente nodo se rellena mientras la mascota viaja hasta
      el próximo paso y la página la acompaña con scroll suave; al llegar aparecen el halo y el
      globo. Con "reducir movimiento" todo eso pasa sin animación.
- [ ] "Quitar" desde el modal cierra el modal, saca el nodo del mapa, lo agrega al acordeón "Qué
      quitamos y por qué" y muestra el toast con "Deshacer", que lo restaura.
- [ ] Si una action falla, el nodo vuelve a su estado anterior y aparece el toast de error del 08.
- [ ] Al marcar un paso como hecho, el nodo hace "pop" una vez; al recargar, los pasos ya hechos no
      lo repiten.
- [ ] Con "reducir movimiento" activado no hay halo animado, pop, entrada escalonada ni scroll
      suave, y el mapa se ve completo y legible.
- [ ] A 360 px de ancho no hay scroll horizontal y ningún título de nodo se corta fuera de la
      pista, en tema claro y oscuro.
- [ ] Con teclado solo: Tab recorre los nodos en orden de estudio con foco visible, Enter abre el
      modal y Escape lo cierra devolviendo el foco al nodo.
- [ ] `package.json` no tiene dependencias nuevas; `npm run test`, `npm run lint` y
      `npm run build` pasan.
- [ ] `docs/SPECS-MAP.md` y `CLAUDE.md` ya no mencionan React Flow para el mapa.

## Decisiones

- **Sin React Flow ni dagre (cambia lo que decía `SPECS-MAP.md`).** La ruta es una secuencia: no
  hay ramas, ni aristas que se crucen, ni necesidad de zoom o paneo. Un motor de grafos agrega peso
  de cliente, un canvas que hay que hacer accesible a mano y una API más para verificar, a cambio de
  un layout que acá sale de un patrón fijo de 8 valores. Descartado a pedido del usuario: "agregarle
  dificultad por las puras".
- **Zigzag por patrón fijo, no aleatorio ni medido del DOM.** Posiciones deterministas: el SVG y los
  nodos salen de la misma función pura, se testean sin navegador y no hay saltos de layout al
  hidratar.
- **Pista de ancho fijo (320 px), no fluida.** Con ancho fijo las curvas del SVG no se deforman y el
  mismo layout sirve de 360 px a escritorio. En pantallas anchas el mapa queda centrado, como en
  Duolingo.
- **Unidades por programa**, igual que la lista: mapa y lista cuentan la misma historia y comparten
  `groupByProgram`. Descartado: un camino continuo sin cortes, que pierde el "de qué programa oficial
  viene esto" que el ADR 0001 usa como argumento.
- **Nodo con número + estado, no con la portada.** Las portadas de Thinkific tienen texto y a 64 px
  se leen mal; la portada va en el modal, donde tiene tamaño.
- **Detalle en modal, no en Sheet lateral ni en popover** _(cambiado durante la implementación a
  pedido del usuario)_. El spec aprobado decía Sheet a la derecha en escritorio y desde abajo en
  móvil; el usuario prefirió un modal centrado. `Dialog` ya existe en `components/ui/`, y de paso
  desaparece el `matchMedia` para elegir el lado. El popover sigue descartado: en móvil tapa el
  camino y no tiene lugar para el toggle de tres estados.
- **Sin bloqueo de pasos.** Los cursos están en DevTalles, no en la app: bloquear un nodo no impide
  cursar nada y contradiría la lista, donde todo se puede marcar.
- **Marcar "Hecho" cierra el modal** _(agregado durante la implementación, a pedido del usuario)_.
  Un paso hecho no necesita nada más, y al cerrarse se ve el pop del nodo y el tramo que se
  rellena. "Pendiente" y "En curso" lo dejan abierto porque el usuario puede seguir mirando el
  curso.
- **Coreografía "vas al siguiente paso"** _(agregado durante la implementación, a pedido del
  usuario: "que se sienta fluido")_. Al marcar "Hecho": pop del nodo (0 ms); a los 250 ms el tramo
  se rellena, la mascota viaja al próximo nodo y la página la acompaña, todo en 600 ms; a los
  850 ms aparecen el halo y el globo. Los tiempos viven en `lib/path-map/motion.ts` porque los usan
  el mapa y el nodo. Para que la mascota pueda viajar, deja de montarse dentro del nodo: hay una
  por unidad en `path-map.tsx` que se mueve con `transform`; si el próximo paso queda en otra
  unidad, aparece allí con una entrada corta. Se suma a las tres animaciones de abajo, pero es una
  sola secuencia disparada por una acción del usuario, no animación ambiental.
- **El globo abre el modal, no cambia el estado.** Un solo camino para cambiar estado (el toggle), y
  ningún cambio por un toque accidental.
- **"Próximo paso" = `findNextStep` del spec 09**, no una definición nueva: el mapa y el dashboard no
  pueden discrepar sobre cuál es el próximo curso. Se identifica por título porque `findNextStep`
  no devuelve `id` y cambiar su firma tocaría un archivo del 09.
- **Mapa por defecto, vista en la URL.** El mapa es lo que más luce en la evaluación; la lista queda
  a un toque. `?vista=` en la URL (no `localStorage`) permite compartir el link y hace que el botón
  atrás se comporte de forma predecible.
- **`window.history.replaceState`, no `router.replace`** _(cambiado durante la implementación)_. La
  página es dinámica: `router.replace` volvería a pedir el Server Component (las queries de la ruta
  y el chequeo de IA del spec 11) solo por cambiar de pestaña. La guía de Next 16
  (`01-getting-started/04-linking-and-navigating.md`) soporta `replaceState` de forma nativa y lo
  sincroniza con su router.
- **Tres animaciones, aunque la skill sugiere 1–2 por vista.** Se aceptó porque no compiten en el
  tiempo: la entrada corre una vez al cargar, el halo es un solo elemento, y el pop solo responde a
  una acción del usuario. Todas se apagan con `prefers-reduced-motion`.
- **Mapa y lista comparten el estado optimista de `path-steps-view.tsx`** en vez de que el mapa
  tenga el suyo: cambiar de pestaña nunca muestra datos distintos. Por eso son necesarias las
  excepciones a la regla 5 sobre archivos del 08.
- **`path-map.tsx` y `path-map-node.tsx` sin `"use client"`**, mismo criterio que
  `step-status-toggle.tsx`: reciben callbacks y solo se importan desde `path-steps-view.tsx`, que ya
  es cliente. `step-detail-dialog.tsx` igual.

## Riesgos

- **Títulos largos en nodos desplazados.** Un título de dos líneas en el extremo del zigzag podría
  tocar el borde. Mitigación: `MAX_OFFSET` se deriva de `LABEL_WIDTH` y el test del paso 2 lo
  comprueba para cualquier conteo; `line-clamp-2` corta el resto (el título completo está en el
  nombre accesible y en el modal).
- **Dos pasos con el mismo título.** Rompería la identificación del próximo paso por título. Hoy no
  pasa porque el motor deduplica por curso; si pasara, se marcaría el primero en orden de estudio,
  que igual es el correcto según `findNextStep`.
- **Conflicto con el spec 13**, que probablemente también toque `path-steps-view.tsx` para la
  celebración. Mitigación: este spec deja el `onStatusChange` en un solo lugar
  (`handleStatusChange`) para que el 13 se enganche ahí sin tocar el mapa; no se implementan en
  paralelo.
