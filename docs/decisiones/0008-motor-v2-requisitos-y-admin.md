# 0008: Motor v2: la ruta se ordena por requisitos entre cursos, y las reglas las edita el admin

- **Fecha:** 2026-09-27
- **Estado:** aceptada

## Contexto

El 2026-09-26 el equipo generó dos rutas reales, React y Java desde cero, y ninguna tenía sentido
pedagógico:

- Docker, SOLID y Patrones aparecían antes de ver una línea de Java.
- La ruta de Java traía OpenAI con React + NestJS.
- Git aparecía apenas empezaba la ruta.
- El texto libre pedía "que poco a poco aumente la dificultad", y el motor no podía cumplirlo.

Se corrió el motor del spec 04 contra el catálogo real en las 19 metas, 3 niveles, varios
presupuestos e intereses. El problema es de diseño y no de una meta
(`docs/investigacion/engine-v2-plan.md`, sección Contexto):

- Fundamentos entraba como un bloque fijo de 66 h delante de cualquier meta.
- El recorte por tiempo protegía el nivel oficial y no lo que un curso necesita. React con 5 h por
  semana quedaba sin JavaScript, y Angular y Nest GraphQL, igual.
- React Native entraba sin React.
- Los intereses no miraban la meta: Angular con tiempo real sumaba React + Sockets.
- Entraban cursos en construcción (Kafka, Patrones de diseño agéntico, Codex).

La causa raíz: el motor no sabe qué curso necesita a cuál. Solo conoce la etapa y el nivel de cada
programa oficial. El ADR 0001 había descartado a propósito un `prerequisite_slugs` por curso ("dentro
de un programa manda el `stage` oficial"), y eso es justo lo que falló.

Además, el usuario pidió que el admin controle el motor, para que sea escalable. `ENUNCIADO.md` pide
"adaptarse a las necesidades cambiantes de la comunidad".

## Opciones consideradas

1. **Parchear el motor del spec 04**: sacar Fundamentos para quien no empieza de cero y prohibir un
   par de combinaciones. Es rápido, pero cada meta nueva trae otro caso, y el admin sigue sin control.
2. **Que la IA arme y ordene la ruta.** Rompe el ADR 0001: sin key no hay ruta, suma espera al
   generar y la respuesta no es reproducible.
3. **Un mapa de requisitos entre cursos editable por el admin, con el motor ordenando por
   requisitos y dificultad.** Hay que escribir el mapa inicial (101 requisitos) y reescribir el
   motor. A cambio, los arreglos pasan a ser datos y no código.

## Qué dijo el abogado del diablo

No se corrió `/critique`. El diseño se validó con un prototipo en memoria (6 rondas de prueba y
corrección) y con un revisor independiente sobre 19 perfiles. Después, el usuario revisó 15 rutas
de muestra (Anexo D de `docs/investigacion/engine-v2-plan.md`) y tomó tres decisiones:
- con el tiempo que sobra entran más cursos de sus intereses;
- un curso de principiante que la ruta oficial pone tarde se queda en su etapa oficial;
- los tramos no retroceden.

## Decisión

La opción 3.

- **Dos tablas nuevas, editables en `/admin`:**
  - `course_prerequisites` (curso, requisito, `necesita` | `conviene`). "Necesita" suma el requisito
    a la ruta y lo pone antes. "Conviene" solo ordena, si los dos cursos ya están en la ruta.
  - `interest_courses` (interés, curso, posición): qué cursos sugiere cada interés. Las etiquetas de
    los intereses siguen en `lib/paths/interests.ts`.
- **Fundamentos pasa a ser la base editable del principiante:** Programación `requerido`, Git
  `recomendado` y el resto `opcional`. Programación abre la ruta. Git llega después del primer curso
  no principiante de la meta, salvo que un curso lo pida antes, y es lo último que se recorta. Lo
  opcional entra solo si se marca ese interés.
- **El motor sigue siendo una función pura** (`buildPath(profile, catalog, programs, rules)`). Hace
  lo siguiente:
  - Da por dominado, junto con cada tecnología marcada, todo lo que ese curso necesita: React incluye
    JavaScript.
  - Trae lo que necesita cada curso requerido o recomendado, con el mismo nivel.
  - Suma los opcionales e intereses solo si su base ya está en la ruta. Si no, lo explica en "Qué
    quitamos".
  - Recorta sin sacar nunca un curso que otro necesita.
  - Ordena de forma topológica, con un ancla por curso: la etapa oficial o la dificultad.
- **La IA no elige ni ordena cursos.** Solo le sugiere requisitos al admin, que los agrega a mano.
- **La lista y el mapa se agrupan por tramo** (Primeros pasos, Intermedio o Avanzado): la dificultad
  más alta alcanzada hasta cada etapa.

## Consecuencias

- **Se gana:**
  - Ningún curso llega antes de lo que necesita. Lo comprueban tests de invariantes sobre
    19 metas × 3 niveles × 3 presupuestos × 4 conjuntos de intereses.
  - La dificultad sube de a poco.
  - El admin corrige una ruta mala editando datos, sin desplegar código.
  - Generar sigue tardando lo mismo (0,5–2 ms por ruta; la carga suma dos consultas en paralelo).
- **Se sacrifica:**
  - El motor es más complejo que el del spec 04, porque el orden se calcula con anclas iterativas.
  - El mapa inicial de requisitos lo interpretó el equipo desde el texto de cada instructor, y puede
    tener errores. Por ejemplo, *Expo + Gemini* pide "React Native o React", así que entra en una ruta
    de React web cuando sobra tiempo.
  - Las rutas ya guardadas no se regeneran.
- **Qué reemplaza o matiza:**
  - Reemplaza, del spec 04, anteponer Fundamentos entero, el recorte que ignora dependencias, los
    intereses al final en etapas propias y `renumberStages`.
  - Matiza el ADR 0001: ahora sí hay requisitos por curso, escritos a mano y editables, no generados
    por IA.
  - Matiza el ADR 0003: los cursos de cada interés viven en la base y no en `interests.ts`.
- **Qué haría revisar esto:**
  - Que el admin empiece a crear ciclos o requisitos contradictorios. El panel rechaza los ciclos,
    pero no las contradicciones de criterio.
  - Que las rutas con mucho tiempo libre se sientan infladas por los cursos de interés que se suman
    para rellenar.
  - Que haga falta crear metas o intereses nuevos desde el panel. Eso queda para un spec futuro,
    porque toca el cuestionario, su zod y los prompts de la IA.
