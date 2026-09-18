# 0003: Intereses transversales al catálogo, no taxonomía por curso

- **Fecha:** 2026-09-18
- **Estado:** aceptada

## Contexto

`data/` es hoy un volcado fiel del catálogo público de DevTalles: `courses.json` trae los campos que
la web muestra (`slug`, `title`, `hours`, `areas`, `prerequisites` en texto libre, `topics`,
`outcomes`, `related`) y `programs.json` los 13 programas oficiales con `stage`/`level`/`note`/
`courses`. No contiene ninguna regla propia del proyecto: ni etiquetas normalizadas por curso, ni
slugs de tecnologías, ni un mapeo interés → cursos que cruce programas.

Esas reglas existen, pero escritas a mano dentro de una maqueta
(`docs/maquetas/0001-motor-de-reglas-con-ia-encima/0001-motor-de-reglas-con-ia-encima.js`:
`META_STACKS`, `STACK_SKILLS`, `STACK_INTERESTS`), que declara en su primera línea que no calcula
nada — es solo para ver cómo se vería la pantalla.

La consecuencia, planteada por un miembro del equipo: el cuestionario, tal como está especificado,
elige **un programa oficial y lo filtra**. No puede recomendar un curso que ese programa no contenga.
`docs/ENUNCIADO.md` pide una ruta basada en *"intereses, metas profesionales y nivel de conocimientos
actual"*, y el ADR 0001 ya había medido el caso peor: para el perfil "React desde cero" el motor
devuelve una ruta **idéntica y en el mismo orden** a `/pages/programas-react`.

Se sometió al agente `devils-advocate` (vía `/critique`) la propuesta original del equipo: construir
una taxonomía completa en `data/` (etiquetas normalizadas por los 74 cursos, más los cuatro mapeos
`tecnología → slugs`, `interés → cursos`, `meta → programas` y `prerequisite_slugs` entre programas).

## Opciones consideradas

1. **Taxonomía completa en `data/`** (la propuesta original): etiquetar los 74 cursos con un
   vocabulario normalizado y derivar de ahí los mapeos de interés, más los otros tres mapeos.
2. **No tocar nada**: dejar la decisión para cuando se escriba `lib/paths/build-path.ts` en el spec
   04, sin registrar el problema.
3. **Tabla de intereses transversales, sin etiquetar cursos** (la que se adopta): un mapeo directo
   `interés → 1-3 slugs del catálogo completo`, de ~12 entradas, escrito a mano, que vive en
   `lib/paths/interests.ts` junto a la tabla `meta → programas` que el spec 04 ya tenía asignada.

## Qué dijo el abogado del diablo

**Veredicto: ARRÉGLALA.** Confirmó el diagnóstico de la objeción original, pero rechazó la solución
propuesta y aportó dos hallazgos verificados contra `data/courses.json` y `data/programs.json`:

- **El presupuesto de horas del ADR 0001 no cierra el delta cero**, al contrario de lo que ese ADR
  daba por hecho. Cálculo verificado: la ruta React (pasos `requerido` + `recomendado`) suma **162.5
  h**, contra un presupuesto de ejemplo de 6 meses × 10 h/semana = **260 h** — no recorta nada, sobran
  97.5 h. PHP entero son 23.5 h (9 % del presupuesto); C# 36.5 h; Go 48.5 h. El motor sabe **recortar**
  cuando algo no cabe, pero no sabe **rellenar** cuando sobra tiempo, y en perfiles de un solo stack
  el presupuesto queda inerte. Solo muerde cuando se combinan programas (el caso fullstack del ADR
  0001: 265.5 h contra 260 h).
- **Etiquetar los 74 cursos produce recomendaciones falsas, no solo texto genérico.** Verificado en
  `react-de-cero`: sus `topics` reales incluyen Docker, tres líneas de testing especializado
  (componentes, mocks/spies/snapshots, integración), Tailwind, Zustand, React Router y JWT. Cualquier
  taxonomía honesta lo etiqueta `testing` y `docker`. Con esas etiquetas, el chip "me interesa Docker"
  recomendaría **46 horas de React completo** a un evaluador que sabe exactamente qué enseña ese
  curso — un fallo peor que el que el ADR 0001 ya había anticipado para el texto generado por IA
  ("una respuesta válida y falsa sobre el contenido de un curso, mostrada al instructor que lo
  grabó"), porque aquí el error sale del párrafo y entra en la lista de cursos de la ruta.
- **Costo mal repartido.** De los cuatro entregables de la propuesta original, dos ya estaban
  decididos y no aportan delta (`TECH_TO_SLUGS` de 11 entradas del ADR 0001, y la tabla
  `meta → programas` ya asignada al spec 04). Etiquetar los 74 cursos —el 80 % del esfuerzo propuesto—
  no añade ni un curso a ninguna ruta por sí solo. Lo que sí produce el delta es el mapeo
  interés → cursos cruzando programas, que son ~12 juicios, no 74. Serían además ~4-6 horas de trabajo
  de P2 en semana 1, contra un déficit ya reconocido por el ADR 0001: las 4-6 horas del presupuesto de
  horas "no tienen financiación".
- **Colocación en el mapa de specs.** Insertar la taxonomía en el spec 01 ensancha el primer nodo del
  camino crítico (01 → 02 → 03 → 05 → 06 → 07 → 08). El mapeo de intereses, en cambio, cabe en el
  spec 04, que ya corre en paralelo a 02/03 y no bloquea a nadie — ahí cuesta cero días de camino
  crítico.

La versión mínima que propuso el agente: ~45 minutos de trabajo, en el spec 04, con una tabla de ~12
intereses del catálogo completo, reglas de seguridad simples en el motor, y sin tocar `data/` ni la
numeración de `docs/SPECS-MAP.md`. Es la que se adopta.

## Decisión

**Se crea `lib/paths/interests.ts` (propiedad del spec 04), no una taxonomía en `data/`.** Contiene
una tabla a mano de ~12 intereses transversales al catálogo completo, cada uno con 1-3 slugs de
curso, verificados hoy contra `data/courses.json`:

| Interés | Slugs | Horas |
|---|---|---|
| Docker | `docker-guia-practica` | 14 h |
| SOLID y Clean Code | `solid-clean-code` | 6.5 h |
| Patrones de diseño | `patrones-diseno` | 10 h |
| Control de versiones | `git-github-control-versiones-desde-cero` | 11.5 h |
| Bases de datos SQL | `sql-con-postgres` | 16 h |
| Testing | `NestJS-Testing`, `net-pruebascompletas` | 12.5 h, 6 h |
| Tiempo real / sockets | `react-sockets`, `Angular_socket_bun` | 15 h, 14.5 h |
| IA aplicada | `openai`, `ia-para-developers`, `python-ia-aplicada` | 10 h, 8 h, 18.5 h |
| Microservicios | `nestjs-microservicios`, `spring-boot-microservicios`, `go-microservicios` | 21 h, 21 h, 2.5 h |
| Sitios de contenido | `Astro`, `qwik-introduccion` | 25.5 h, 8 h |
| Agentes y vibe coding | `claude-code-guia-completa`, `codex` | 17.5 h, 3.5 h |
| Estilos | `tailwindcss-para-desarrolladores` | 4 h |

Reglas de seguridad del motor, para que un interés nunca contradiga la ruta del instructor:

- Un curso que entra por interés entra siempre como **`opcional`**, nunca reordena ni sustituye un
  paso `requerido` o `recomendado` de la ruta oficial.
- Lleva procedencia explícita en la UI, distinta de la de un opcional oficial — por ejemplo: *"no
  está en la ruta oficial de PHP; lo añadimos por tu interés en Docker"*.
- Es **lo primero que se recorta** cuando la ruta no cabe en el presupuesto de horas, antes que los
  opcionales y recomendados oficiales (precisa la fila correspondiente de `docs/SPECS-MAP.md` §4).
- El motor descarta un slug de interés si coincide con una tecnología que el usuario ya marcó como
  dominada, igual que hace con los pasos de la ruta oficial.

**El paso "intereses" del cuestionario (spec 05) deja de depender del stack elegido.** Es una lista
plana de las ~12 entradas de la tabla, igual para cualquier perfil — no las 18 entradas de
`STACK_INTERESTS` de la maqueta, que quedan reemplazadas. Esto cierra, sin necesidad de etiquetar
nada, el problema registrado en `docs/SPECS-MAP.md` §4 de que 7 de las 18 combinaciones de stack de
la maqueta tenían 0 o 1 curso opcional real y el paso se quedaba casi sin chips.

**No se crea ninguna taxonomía por curso ni columna nueva en `data/`.** El spec 01 sigue siendo
únicamente `level` + `outcome`, como ya decidía el ADR 0001.

**La numeración y el grafo de `docs/SPECS-MAP.md` no cambian.** El trabajo entero cabe como una
precisión en la fila del spec 04 y en las decisiones abiertas de §4; no se inserta ningún spec nuevo
ni se renumeran los 13 existentes.

## Consecuencias

Se gana: el motor deja de tener delta cero garantizado en perfiles de un solo stack. Con los números
verificados, React pasa de 0 a ~5 cursos de diferencia con la página oficial (162.5 h → 219.5 h,
dentro de 260 h) usando horas que hoy quedaban sin usar; PHP pasa de 2 cursos y 0 chips de interés a 7
cursos y ~8 chips (81.5 h). Los dos cursos que el ADR 0001 registraba como "el motor no podrá
recomendarlos nunca" (`qwik-introduccion`, `go-microservicios`) dejan de ser inalcanzables. El spec 05
pierde trabajo, no lo gana: una lista plana de 12 chips sustituye las 18 entradas condicionadas al
stack de la maqueta.

Se sacrifica: granularidad. No hay una recomendación fina por curso basada en lo que el estudiante
sabe o no sabe más allá de las 11 tecnologías del cuestionario y estos ~12 intereses; ningún curso
individual fuera de esta tabla puede ser sugerido por interés. Este es el trade-off deliberado que
señaló el abogado del diablo: etiquetar más fino cuesta 74 juicios y arriesga recomendaciones
incorrectas y verificables por el propio instructor del curso.

Esta decisión **matiza** el ADR 0001, no lo reemplaza: el diseño de dos capas y el presupuesto de
horas siguen aceptados tal cual, salvo por la afirmación de que el presupuesto de horas por sí solo
resuelve la objeción "esto ya está hecho" — no la resuelve en perfiles de un solo stack; lo que la
resuelve es esta tabla de intereses.

Qué haría revisar esto:

- Que la tabla de intereses, probada contra 5 perfiles distintos, dé delta cero o produzca un
  añadido que alguien de DevTalles señale como incorrecto — en ese caso, la granularidad por curso
  deja de ser un lujo y pasa a ser la única vía, con el costo que eso implica.
- Que el spec 05 termine necesitando filtrar *en negativo* ("no me muestres nada de testing") o que
  el cuestionario abandone las 11 tecnologías fijas por texto libre sin restricciones — ahí
  `TECH_TO_SLUGS` y esta tabla dejan de escalar.
- Que al implementarse `lib/paths/interests.ts` en el spec 04 se necesite responder cuántas horas como
  máximo puede añadir el paso de intereses sobre la ruta oficial (queda como decisión abierta en
  `docs/SPECS-MAP.md` §4, asignada al mismo spec).
