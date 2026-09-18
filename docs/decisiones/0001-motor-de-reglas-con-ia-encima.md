# 0001: Motor de reglas sobre el catálogo + plan con presupuesto de horas + IA como capa de texto

- **Fecha:** 2026-09-18
- **Estado:** aceptada

## Contexto

`docs/ROADMAP.md` (sección "Decisiones ya tomadas") partía de que "la IA arma la ruta": el modelo
recibe el catálogo completo y el perfil del usuario, y decide cursos, orden y etapas, con un plan B
por reglas solo para cuando falla. Esa decisión se tomó **antes** de extraer los datos.

`docs/investigacion/ANALISIS-IA.md` se escribió después, ya con los 74 cursos y los 13 programas
oficiales extraídos (`data/courses.json`, `data/programs.json`), y la contradice: propone un híbrido
donde un motor por reglas arma la ruta siempre y la IA solo personaliza encima. Formalmente nadie
había cerrado esto: la sección 11 de `ANALISIS-IA.md` dejaba la pregunta en un checkbox sin marcar, y
el agente `devils-advocate` (que existe para justamente este tipo de decisión) se creó **un día
después** de que se escribiera el análisis — la arquitectura central de la app nunca pasó por revisión
adversarial.

En la sesión que cierra este ADR se corrió `devils-advocate` dos veces, sobre dos preguntas distintas:

1. **¿Dónde va la IA?** — la pregunta original.
2. **¿La ruta que genera el motor de reglas aporta algo sobre la ruta oficial que ya publica
   DevTalles?** — objeción levantada por un miembro del equipo durante la revisión: *"la ruta de
   aprendizaje ya está hecha; al final solo vamos a reinventar todo y no le da un valor agregado"*.

Las dos corridas devolvieron **ARRÉGLALA**, no MÁTALA ni SÓLIDA, y la segunda resultó más grave que la
primera: cambió qué construye la app, no solo dónde interviene el modelo.

## Opciones consideradas

### Sobre dónde va la IA (las tres de `ANALISIS-IA.md` §5)

1. **A — La IA arma la ruta** (lo que decía el ROADMAP): el modelo decide cursos, orden y etapas desde
   el catálogo completo; reglas solo como plan B.
2. **B — Sin IA**: cuestionario → reglas → rutas oficiales filtradas, razones por plantilla.
3. **C — Híbrido, tal como lo describía `ANALISIS-IA.md`**: motor por reglas siempre + IA que en la
   Capa 0 enriquece offline 4 campos (`level`, `skills`, `prerequisite_slugs`, `outcome`) y en la
   Capa 2 puede quitar cursos opcionales y agregar hasta 2, dentro de límites.
4. **C recortada** (la que se adopta): igual columna vertebral, pero la IA enriquece offline solo 2
   campos, no quita ni agrega cursos, y el texto libre del usuario sí puede influir en qué programas
   se combinan — a través de `programHints`, no de decidir cursos sueltos.

### Sobre qué entrega la app

1. **Filtrar la ruta oficial y mostrarla** (lo implícito en A, B y C tal como estaban descritas): el
   motor toma un programa oficial, quita lo que el usuario ya domina y muestra la lista resultante.
2. **Un plan con presupuesto de horas** (la que se adopta): el cuestionario pregunta plazo además de
   horas por semana; el motor combina programas según la meta, deduplica, y si el total de horas no
   cabe en el presupuesto, recorta opcionales y después recomendados explicándolo en pantalla.

## Qué dijo el abogado del diablo

**Corrida 1 — dónde va la IA. Veredicto: ARRÉGLALA.** La columna vertebral (reglas primero) es
correcta y A es peor que C, pero C tal como estaba escrita concentraba toda su diferenciación en la
capa que el evaluador puede no ver nunca. Fallos más graves:

- La propia demo del equipo, `docs/investigacion/opcion-c.html`, produce el efecto completo de la
  Capa 2 (título personalizado, razones, skip, add) **sin llamar a ninguna API** — `fetch(` aparece 0
  veces en el archivo; es una función `personalize()` de ~100 líneas con plantillas y un `setTimeout`
  que simula la latencia. Si la demo que convence al equipo no necesita IA, la pregunta no es "¿IA sí
  o no?" sino "¿qué compra la Capa 2 que las plantillas no dan gratis?".
- Contradicción interna de `ANALISIS-IA.md`: vende "entender metas en texto libre" como beneficio
  estrella (§3.2), pero en su propio diseño (§6) el programa se elige por el **stack marcado**, antes
  de que la IA vea el texto. El campo de meta libre quedaba decorativo.
- La validación con zod y el timeout de 15s cubren el fallo binario (respuesta rota o lenta), no el
  peligroso: una **respuesta válida y falsa** sobre el contenido de un curso, mostrada al instructor
  que lo grabó. 36 de 74 cursos no tienen `outcomes` — justo donde el modelo rellena.
- Los 4 campos de la Capa 0 costaban más de lo estimado: "1 hora entre 3" son 296 juicios (74 cursos ×
  4 campos), 12 segundos cada uno — hojear, no revisar. Y `skills`/`prerequisite_slugs` resuelven
  preguntas que el cuestionario, con 11 tecnologías fijas, casi no hace.
- Verificado con datos: 9 cursos cambian de nivel según el programa (`nodejs-de-cero-a-experto` es
  `requerido` en Node y `opcional` en Nest), lo que hace que "la IA nunca puede tocar un requerido" sea
  una regla más frágil de lo que parece.

**Corrida 2 — la propuesta de valor. Veredicto: ARRÉGLALA**, y confirmó la objeción del equipo con un
cálculo verificado en este repo: aplicando las reglas del motor al perfil "React desde cero" (sin
tecnologías previas), el resultado es
`javascript-moderno → react-de-cero → typescript-guia-completa → react-pro → sql-con-postgres →
nextjs` — **idéntico, en el mismo orden**, a `/pages/programas-react`. Delta: cero cursos. Y React es
lo primero que un evaluador de DevTalles va a teclear.

El agente fue explícito en que esto no se arregla con una feature nueva, sino con qué output enseña la
app: de "una lista de cursos" a "un plan que cabe en tu tiempo", verificado con otro cálculo — el
perfil "sé JS y Git, fullstack React+Nest, 6 meses a 10h/semana" fusiona 3 programas, deduplica 2
cursos repetidos y resuelve el conflicto de nivel de `nodejs-de-cero-a-experto`, dando 12 cursos y
265.5h contra un presupuesto de 260h: **no cabe por 5.5 horas**; quitando Docker (recomendado, 14h)
cabe en 251.5h. Ninguna página de DevTalles responde "¿me da el tiempo?" — es la pregunta real del
estudiante y la única que hace que el cuestionario mande sobre el resultado.

Las dos corridas cambiaron la decisión: la primera recortó el tamaño de las capas de IA; la segunda
añadió una pieza (presupuesto de horas + procedencia visible) que no estaba en ninguna versión previa
del ADR.

## Decisión

Se adoptan las tres piezas siguientes, aceptadas por el usuario tras revisar el veredicto verificado
contra `data/courses.json` y `data/programs.json`:

**1. El motor por reglas es el plan A, no el plan B.** Corre siempre, sobre los programas oficiales de
DevTalles. `lib/paths/fallback.ts` deja de existir como tarea de respaldo separada: pasa a ser
`lib/paths/build-path.ts`, función pura y testeable, y es la única vía por la que se genera una ruta.
La app funciona entera sin `OPENAI_API_KEY` — requisito literal de `ENUNCIADO.md` ("al clonar el
proyecto este debe funcionar") y lo que evita el riesgo de descalificación.

**2. El output es un plan con presupuesto de horas, con procedencia visible, no una lista de cursos.**
Este es el cambio que responde a la objeción "esto ya está hecho, es reinventar la rueda": mientras el
motor solo filtrara un programa oficial y lo mostrara, el delta con la web de DevTalles podía ser
cero, medido. `ENUNCIADO.md` obliga a usar **los cursos** de DevTalles (requisito 2, literal), no sus
**rutas**: los 13 programas oficiales son un insumo que el equipo eligió, no un requisito, y la
descripción de la quest pide una ruta basada en *"intereses, metas profesionales y nivel de
conocimientos actual"* — las tres entradas que la página oficial no usa (está organizada por
tecnología: el estudiante entra a "React" porque ya sabe que quiere React). Que
`qwik-introduccion` y `go-microservicios` estén disponibles en el catálogo pero en ningún programa
confirma que las rutas oficiales son insumo, no límite — el motor no podrá recomendarlos nunca; se
registra como limitación conocida.

**3. La IA queda como capa de texto encima, en su versión recortada**, no en la que describía
`ANALISIS-IA.md` §6:

| | `ANALISIS-IA.md` (original) | Se adopta |
|---|---|---|
| Campos que la IA rellena offline (Capa 0) | 4: `level`, `skills`, `prerequisite_slugs`, `outcome` | **2**: `level`, `outcome` |
| `skills` | generado por IA | tabla `TECH_TO_SLUGS` escrita a mano, 11 entradas (las del cuestionario) |
| `prerequisite_slugs` | generado por IA para los 74 cursos | tabla a mano solo entre programas (para metas fullstack); dentro de un programa manda el `stage` oficial |
| La IA quita cursos opcionales / agrega hasta 2 | sí, con límites (`skip`, `add`) | **no** — se elimina `skip`/`add` por completo |
| El texto libre del usuario puede cambiar qué programas se combinan | no (el stack marcado decide antes) | **sí**, vía `programHints: z.enum(slugsDePrograma)[]` que el motor por reglas acepta o descarta |
| Caché de personalización | tabla nueva con hash de perfil | columna en `learning_paths`, sin migración extra |

## Consecuencias

Se gana: la app deja de arriesgarse a que un evaluador de DevTalles vea, en el primer caso que
prueba, su propia ruta oficial con login encima — el presupuesto de horas y la procedencia visible son
algo que la página oficial no ofrece. La Capa 0 pasa de 296 juicios a 148, lo que hace creíble
revisarla a mano en el tiempo estimado. El motor por reglas, al ser el plan A y no un respaldo, es
también lo único que hay que tener listo para el Hito 1 — desaparece el trabajo doble de mantener dos
implementaciones de "elegir cursos" en la semana 1.

Se sacrifica generalidad en la Capa 2: sin `skip`/`add`, la IA ya no puede ajustar cursos individuales
dentro de la ruta — solo escribe texto y sugiere qué programas combinar.

El día 10 del roadmap (compartir ruta con `share_slug` + `opengraph-image`) se había recortado en un
primer borrador de esta sesión para pagar las ~4-6h que cuesta el presupuesto de horas, pero el usuario
revirtió ese trueque el 2026-09-18: prefiere mantener "compartir" en el alcance y encontrar el tiempo
del presupuesto de horas por otra vía (sin especificar cuál todavía). Queda como riesgo de cronograma,
no como decisión de arquitectura — ver "Qué haría revisar esto".

Qué haría revisar esto:

- Que llegando al día 9-10 el buffer de los días 6-7 ya esté gastado y "compartir" (que el usuario
  decidió mantener) no quepa sin tocar el freeze del día 12 — en ese caso, es el primer candidato a
  recortar de nuevo, antes que el mapa visual o la gamificación.
- Que el enriquecimiento manual de `level` + `outcome` para 74 cursos resulte más lento de lo
  estimado, o que el equipo decida que el riesgo de la Capa 0 original (4 campos) vale la pena por
  diferenciarse más.
- Que los créditos de OpenAI tengan fecha de vencimiento anterior a la evaluación (pendiente de
  verificar en platform.openai.com — sección 11 de `ANALISIS-IA.md`), lo que forzaría a tratar toda la
  Capa 2 como opcional desde el diseño, no solo como fallback técnico.
- Que una prueba a ciegas de `opcion-c.html` con personas ajenas al equipo muestre que sí distinguen y
  prefieren claramente las razones "con IA" sobre las de plantilla — en ese caso, el recorte de la
  Capa 2 del punto 3 se puede revertir con evidencia real en vez de la sola sospecha del agente.
- Que al implementar `build-path.ts` se decida cómo resolver, en general, los 9 casos donde un curso
  cambia de nivel según el programa (hoy solo se decidió el caso de ejemplo, `nodejs-de-cero-a-experto`
  en el perfil fullstack) — es una decisión del motor de reglas, no de esta arquitectura, y queda
  pendiente para cuando se escriba ese archivo.
