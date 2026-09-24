# 0004: Dónde vive la personalización — descarte visible, plantillas parametrizadas, ajuste por chips

- **Fecha:** 2026-09-20
- **Estado:** aceptada

## Contexto

Un miembro del equipo planteó, durante la revisión de `specs/01-catalog-enrichment.md`, una objeción
sobre el diseño de dos capas del ADR 0001: *"creo que hay poca personalización porque la IA solo va a
explicar un resumen, el título y la razón"*. La preocupación es directa contra `docs/ENUNCIADO.md`,
que pide una ruta *"basada en sus intereses, metas profesionales y nivel de conocimientos actual"*, y
contra el hecho de competir con otros 18 equipos.

La misma conversación derivó en una segunda propuesta, también del equipo: que una ruta ya generada se
pueda ajustar hablando con la IA en texto libre, y que sea la IA quien decida cómo cambiarla.

Las dos preguntas se sometieron a `devils-advocate` por separado, y entre medio se verificó con datos
del repo si la objeción tenía base real.

## La medición

Antes de discutir si "hay poca personalización", se calculó cuánto difiere una ruta generada de la
página oficial de DevTalles, ruta por ruta (las 15 rutas dentro de los 13 programas de
`data/programs.json` — varios programas, como `react` y `dart`, contienen más de una ruta), para un
perfil principiante que marca 3 intereses de la tabla del ADR 0003 (Docker, Testing, Bases de datos
SQL) con un presupuesto de 260 h (10 h/semana × 6 meses):

| Ruta | Cursos en la página oficial | Cursos que genera la app | Se sacan | Se agregan | Diferencia total |
|---|---:|---:|---:|---:|---:|
| React | 12 | 13 | 6 | 7 | 13 |
| React Native | 6 | 11 | 3 | 8 | 11 |
| Vue | 6 | 13 | 1 | 8 | 9 |
| Angular | 8 | 12 | 4 | 8 | 12 |
| NodeJs | 9 | 13 | 4 | 8 | 12 |
| NestJS | 10 | 13 | 4 | 7 | 11 |
| Dart móvil | 6 | 12 | 2 | 8 | 10 |
| Dart Web | 1 | 9 | 0 | 8 | 8 |
| Python | 5 | 12 | 1 | 8 | 9 |
| Java | 8 | 15 | 1 | 8 | 9 |
| C# | 4 | 11 | 0 | 7 | 7 |
| IA/Automatizaciones | 20 | 21 | 4 | 5 | 9 (no cabe en 260 h → recorta) |
| PHP | 2 | 10 | 0 | 8 | 8 |
| GO | 2 | 10 | 0 | 8 | 8 |

Método: para cada ruta oficial se tomó lo `requerido` + `recomendado` (el motor las incluye siempre),
se antepuso la base de Fundamentos (`requerido` + `recomendado`, asumiendo que el motor lo hace para
un principiante — decisión aún abierta, ver "Qué haría revisar esto"), se sumaron los cursos de los 3
intereses marcados que no estuvieran ya presentes, y se comparó el conjunto resultante contra el total
de cursos que la página oficial de esa ruta lista (`requerido` + `recomendado` + `opcional`).

**En ninguna de las 15 rutas el delta da cero.** El caso "React desde cero sin intereses" que el ADR
0001 había medido en 0 —el fantasma que motivó esta discusión— desaparece en cuanto el usuario marca
2 o 3 intereses, algo esperable de cualquier persona real llenando el cuestionario.

## Opciones consideradas

### Sobre si la Capa 2 (IA) necesita más poder para que la personalización sea real

1. **Dejarlo como está**: la IA solo redacta título, resumen y razones; el motor decide todo lo demás.
2. **Devolverle a la IA `skip`/`add`** (lo que el ADR 0001 ya había descartado): quitar opcionales y
   agregar hasta 2 cursos sobre la ruta ya armada.
3. **Que la IA arma la ruta entera** (opción A original de `ANALISIS-IA.md`, ya descartada por el ADR
   0001).
4. **Subir la personalización por vías que no son IA** (la que se adopta): descarte visible + razones
   parametrizadas.

### Sobre cómo ajustar una ruta ya generada si el usuario no queda conforme

1. **La IA decide cursos sobre la ruta guardada**, a partir de una petición en texto libre (la
   propuesta original del equipo).
2. **La IA traduce el texto libre a chips del cuestionario** (meta, intereses, horas, plazo), nunca a
   cursos; el usuario confirma y el motor genera una ruta nueva (la que se adopta).
3. **Sin ajuste conversacional**: solo volver a llenar el cuestionario desde cero.

## Qué dijo el abogado del diablo

**Corrida 1 — ¿la Capa 2 necesita más poder? Veredicto: ARRÉGLALA.** La sospecha del equipo es
correcta —la personalización se percibe fina— pero la causa no es el techo de la IA:

- La tabla de intereses del ADR 0003 tiene 20 slugs; 18 de los 20 ya están en algún programa oficial.
  Para el perfil "React desde cero", varios de los chips más obvios (SQL, OpenAI, sockets) ya son
  opcionales o recomendados de la propia ruta React o de Fundamentos — devuelven delta cero por chip
  individual, aunque el conjunto de varios chips sí sume diferencia, como confirma la medición de
  arriba.
- La pieza que el ADR 0001 declaró como respuesta a "esto ya está hecho" —procedencia **y descarte**
  visibles, mencionado tres veces en `docs/ROADMAP.md`— no tiene dónde vivir: `path_steps` no modela
  un paso descartado, y `docs/SPECS-MAP.md` describía el spec 08 solo con "por qué entró" un curso. Si
  el spec 02 se escribía sin esto, la pieza se volvía imposible de construir sin romper la regla 6 del
  mapa (migraciones solo en 02, 11, 13 y 15).
- Darle a la IA `skip`/`add` (opción 2) cuesta una migración y ~11-15 h de trabajo de P2, y produce una
  ruta distinta según haya o no `OPENAI_API_KEY` — exactamente lo que el criterio 3 del `ENUNCIADO.md`
  evalúa al clonar el proyecto sin key.
- Lo que sí hace ver poca la personalización es la plantilla: en la maqueta, la razón por defecto
  repite la misma frase para varios pasos ("Requerido en la ruta oficial de Fundamentos.") cuando el
  motor ya tiene, sin llamar a nadie, el plazo del usuario, qué tecnologías domina y si fusionó más de
  un programa.

**Corrida 2 — ¿la IA debe decidir el ajuste de una ruta ya generada? Veredicto: MÁTALA** en la forma
original, con una versión mínima que sobrevive:

- Los 5 ejemplos de petición en texto libre que motivaron la propuesta ("no quiero tanto backend",
  "sácame Docker", "tengo menos tiempo", "agrégame testing", "empezar más fácil") ya tienen respuesta
  sin IA: la pregunta de meta, el chip de interés correspondiente, el presupuesto de horas y el nivel
  declarado, respectivamente. Y "generar otra ruta" no es una feature a construir: es el requisito 3
  del `ENUNCIADO.md`, ya cubierto por los specs 06, 07 y 09 del Hito 1.
- Si la IA agrega cursos después de que el motor ya recortó contra el presupuesto de horas, se rompe
  el invariante que sostiene la única frase de venta del producto ("un plan que cabe en tu tiempo"): o
  el cartel de horas deja de ser cierto, o el motor recorta en silencio lo que el usuario acaba de
  pedir.
- Riesgo verificado: pedir "agrégame testing" sobre una ruta de React solo puede resolverse con
  `NestJS-Testing` o `net-pruebascompletas` —los únicos cursos de testing del catálogo—, porque el
  testing de React vive **dentro** de `react-de-cero`, no en un curso aparte. Un `z.enum` acotado
  obligaría al modelo a recomendar un curso de Nest o .NET a alguien haciendo React puro.
- Si un curso ya marcado `done` desaparece de la ruta al ajustarla, el spec 14 ya le dio XP por ese
  curso: revocar cursos completados puede bajar de nivel o quitar una insignia ya celebrada.
- La versión que sobrevive —la IA traduce texto libre a chips del cuestionario, nunca a cursos, y el
  resultado es una ruta nueva que no reemplaza a la anterior— no tiene ninguno de estos problemas: no
  compite con el motor por la autoridad sobre las horas, no toca el progreso ni el XP de la ruta vieja,
  y sin key el mismo formulario prellenado se edita a mano.

## Decisión

Se adoptan cinco piezas:

**1. La Capa 2 se queda como está.** La IA no elige cursos, ni al generar ni al ajustar una ruta. El
ADR 0001 no se reabre en este punto.

**2. El descarte se persiste y se muestra.** El spec 02 deja un lugar en el modelo de datos para el
curso que el motor —o, desde el spec 16, el usuario— saca de una ruta, con su motivo (`"no cabía en tu
tiempo"`, `"ya lo dominás"`, `"lo quitaste vos"`). El spec 08 lo muestra en un acordeón "Qué quitamos y
por qué", junto a los chips de procedencia que ya tenía planeados, y agrega un botón para descartar un
paso `pending` a mano, con opción de deshacer — sin IA, sin migración nueva más allá de la que ya deja
el 02.

**3. Las razones por plantilla se escriben parametrizadas.** El spec 04 arma la razón de cada paso
usando datos que el motor ya tiene (plazo, tecnologías dominadas, programas fusionados), no la frase
fija de la maqueta. Es la parte más barata de esta decisión —horas de redacción, no créditos de IA— y
la que más pesa en la sensación de personalización, según la Corrida 1.

**4. "Ajustar mi ruta" (spec 16) es un cuestionario prellenado, con o sin IA.** Con
`OPENAI_API_KEY`, un campo de texto libre se traduce a cambios en los chips existentes (meta,
intereses, horas, plazo) — acotados con `z.enum` a las listas cerradas del cuestionario, nunca a
slugs de curso — y el usuario confirma antes de aplicar nada. Sin key, el mismo formulario prellenado
se edita a mano. Al confirmar, el motor genera una **ruta nueva**; la anterior no se toca.

**5. `skip`/`add` para la IA sigue descartado**, tanto al generar (ya decidido en el ADR 0001) como al
ajustar una ruta existente (la propuesta original de esta discusión).

## Consecuencias

Se gana: evidencia medida de que el motor de reglas ya personaliza (delta de 7 a 13 cursos en las 15
rutas, sin gastar IA), un lugar para la pieza que el ADR 0001 había prometido como respuesta a "esto ya
está hecho" y que se había perdido en la traducción al mapa de specs, y una versión de "ajustar mi
ruta" que cabe en 3-4 h de P2 en vez de las 11-15 h que costaba la versión con `skip`/`add` — sin
arriesgar el spec 14 (XP) ni el 15 (compartir), que la regla 6 del mapa no deja correr en paralelo con
una migración del 16.

Se sacrifica: la sensación de "hablar con la IA y que actúe directo" que tenía la propuesta original.
El usuario que ajusta su ruta ve primero los chips que la IA cambió y confirma, no un cambio inmediato
sobre la lista de cursos.

Esta decisión **matiza** al ADR 0001 y al ADR 0003, no los reemplaza: el diseño de dos capas, el
presupuesto de horas y la tabla de intereses transversales siguen aceptados tal cual.

Qué haría revisar esto:

- Que al implementar el spec 04 se decida que el motor **no** antepone el programa `fundamentos` a un
  perfil principiante — la medición de este ADR lo asume, y de esa línea dependen varios de los chips
  de interés más comunes. Sigue siendo decisión abierta del spec 04 (`docs/SPECS-MAP.md` §4).
- Que los $10 de crédito de OpenAI tengan fecha de vencimiento anterior a la evaluación —pendiente de
  verificar desde el 2026-09-15 (`docs/investigacion/ANALISIS-IA.md` §11)—, lo que no cambia esta
  decisión pero sí la urgencia de que el spec 16 funcione igual de bien sin key.
- Que al implementar el spec 16 se necesite decidir si el límite diario de personalizaciones del spec
  11 se comparte con la traducción de texto a chips, o si cada uno tiene el suyo — hoy se asume
  compartido, sin verificar contra el costo real por llamada.
