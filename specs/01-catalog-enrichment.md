# SPEC 01 — Enriquecimiento del catálogo: dificultad y frase de resultado

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-09-19
> **Objetivo:** Dejar en el repo `data/courses.enriched.json` con los dos campos que el scraping no
> pudo obtener de los 74 cursos —`difficulty` y `outcome`—, escritos y revisados a mano.

## Por qué existe este spec

`data/courses.json` tiene 19 campos por curso, ninguno de los cuales dice **para quién es** el curso.
El motor del spec 04 compara el nivel que el usuario declara en el cuestionario contra el curso: sin
un campo de dificultad esa comparación no existe, y un principiante puede recibir un curso avanzado
solo porque el programa oficial lo lista como requerido.

Además, 36 de los 74 cursos vienen sin `outcomes` del scraping, y los 38 que sí los tienen traen
cuatro frases largas ("Dominarás Git para controlar el historial y la evolución de tus proyectos.")
pensadas para una página de ventas, no para la tarjeta de un paso de la ruta.

El ADR 0001 recortó la Capa 0 de cuatro campos a estos dos, y este spec es la única vez que se
escriben: el catálogo está congelado y un curso nuevo entrará con sus dos campos desde el panel de
administración del spec 10.

## Alcance

**Entra:**

- Crear `data/courses.enriched.json` con 74 entradas de cuatro campos: `slug`, `title`, `difficulty`
  y `outcome`.
- Asignar `difficulty` a cada curso leyendo sus `prerequisites`, `summary`, `topics`, `chapters` y
  `hours`, y su posición en `data/programs.json`.
- Escribir `outcome` para cada curso a partir de sus propios `outcomes`, `topics` y `chapters`.
- Revisión humana de las 74 filas antes de mergear.
- Documentar los dos campos nuevos en `data/SUMMARY.md`.
- Corregir las dos menciones que quedan desactualizadas: la línea de `docs/ROADMAP.md` que define
  `courses` con `level (beginner/intermediate/advanced)`, y las filas del spec 01 en
  `docs/SPECS-MAP.md` (§1 y §7), que hablan de `level` y de un script.

**Qué NO entra (queda para otros specs):**

- Los campos `skills` y `prerequisite_slugs` que proponía `ANALISIS-IA.md`: el ADR 0001 los sacó de la
  Capa 0 y los reemplazó por tablas a mano que define el spec 04.
- Cargar nada en Supabase: el seed es el último paso del spec 02.
- Usar los dos campos en el motor o en la UI: specs 04 y 08.
- Un script `scripts/enrich-courses.ts` y cualquier dependencia de IA en `package.json`.
- Volver a scrapear o corregir los otros 19 campos de `data/courses.json`.
- Los 3 cursos Legacy, que quedaron fuera del catálogo a propósito.

## Modelo de datos

Archivo nuevo `data/courses.enriched.json`, un array de 74 objetos:

```json
[
  {
    "slug": "programacion-para-principiantes",
    "title": "Programación para principiantes - Primeros pasos",
    "difficulty": "principiante",
    "outcome": "Escribes tus primeros programas y entiendes la lógica de programar."
  },
  {
    "slug": "react-de-cero",
    "title": "React: de cero a experto",
    "difficulty": "intermedio",
    "outcome": "Construyes aplicaciones completas con React, hooks y rutas."
  }
]
```

Reglas del archivo:

- 74 entradas, en el mismo orden que `data/courses.json`, para que el diff sea comparable.
- `slug` existe en `data/courses.json`. Es la clave con la que el spec 02 cruza los dos archivos al
  sembrar la tabla `courses`.
- `title` se copia literal de `data/courses.json`. Está solo para reconocer el curso al revisar; la
  fuente de verdad del título sigue siendo `courses.json`.
- `difficulty` es exactamente uno de estos tres valores: `principiante`, `intermedio`, `avanzado`.
- `outcome` es una sola frase en español, de 120 caracteres o menos, terminada en punto, en segunda
  persona del presente ("Construyes…", "Despliegas…"). No nombra el curso, no usa la palabra "curso",
  y no promete empleo ni salario.

Criterio para `difficulty`:

- `principiante`: no exige haber programado antes. Sus `prerequisites` no nombran ningún lenguaje ni
  framework.
- `intermedio`: exige saber programar, o un lenguaje, pero no la tecnología que el curso enseña.
- `avanzado`: exige la misma tecnología que profundiza, o es continuación declarada de otro curso
  ("PRO", "avanzado" o "intermedio" en el título).

Desempate cuando `prerequisites` no alcanza: manda la posición en `data/programs.json`. Un curso que
aparece en la etapa 1 de algún programa no se marca `avanzado`.

## Plan de implementación

1. Crear `data/courses.enriched.json` con las 74 entradas de `slug` y `title` copiadas de
   `data/courses.json`, en el mismo orden, sin los dos campos nuevos. Verificación: el archivo tiene
   74 entradas y los mismos 74 slugs que `courses.json`.
2. Lote piloto de 8 cursos elegidos por ser los extremos del catálogo (el más básico, el más largo,
   uno sin `outcomes`, uno PRO, uno en construcción, uno gratuito de 2 horas, uno que cambia de
   etiqueta según el programa, y uno que no está en ningún programa). El usuario revisa estas 8 filas
   y ahí se fija el tono antes de seguir.
3. Tanda `bases`: los 17 cursos cuyo `areas` incluye `bases`, menos los ya hechos en el piloto.
4. Tanda `frontend`: los 23 cursos de `frontend`, menos los del piloto.
5. Tanda `backend`: los 23 cursos de `backend`, menos los del piloto.
6. Tanda final: los 11 restantes (`agentes ia`, `móvil`, `fullstack` y los dos sin área,
   `qwik-introduccion` y `go-microservicios`, que además no aparecen en ningún programa).
7. Revisión humana de las 74 filas completas y aplicación de las correcciones.
8. Documentar `difficulty` y `outcome` en la tabla de campos de `data/SUMMARY.md`, y corregir las
   menciones a `level` y al script en `docs/ROADMAP.md` y `docs/SPECS-MAP.md`.

## Criterios de aceptación

- [ ] `data/courses.enriched.json` existe y tiene exactamente 74 entradas.
- [ ] El conjunto de `slug` del archivo es idéntico al de `data/courses.json`: ninguno nuevo, ninguno
      faltante.
- [ ] Cada `title` coincide literalmente con el de `data/courses.json`.
- [ ] Los 74 `difficulty` son uno de los tres valores exactos en español.
- [ ] Los 74 `outcome` tienen 120 caracteres o menos y una sola frase (un solo punto).
- [ ] Ningún `outcome` contiene la palabra "curso" ni el título del curso.
- [ ] Los 36 cursos que hoy no tienen `outcomes` en `courses.json` tienen su `outcome` escrito.
- [ ] Ningún curso que aparezca en la etapa 1 de algún programa quedó marcado `avanzado`.
- [ ] `data/SUMMARY.md` documenta los dos campos nuevos.
- [ ] `docs/ROADMAP.md` ya no define `courses` con `level (beginner/intermediate/advanced)`.
- [ ] El usuario revisó las 74 filas y sus correcciones están aplicadas.

Los ocho primeros criterios se verifican con este comando:

```bash
node -e "const e=require('./data/courses.enriched.json'),c=require('./data/courses.json');const v=['principiante','intermedio','avanzado'];const s=new Set(c.map(x=>x.slug));const err=[];if(e.length!==74)err.push('no son 74 entradas: '+e.length);e.forEach(x=>{if(!s.has(x.slug))err.push('slug desconocido: '+x.slug);if(!v.includes(x.difficulty))err.push('difficulty invalida: '+x.slug);if(!x.outcome||x.outcome.length>120||(x.outcome.match(/\./g)||[]).length!==1)err.push('outcome invalido: '+x.slug);});console.log(err.length?err.join('\n'):'OK: 74 entradas validas')"
```

## Decisiones

- **Sí:** los dos campos los escribe el agente durante `/spec-impl`, leyendo el catálogo. No gasta los
  créditos de OpenAI, que quedan reservados para la Capa 2 del spec 11, y el resultado viaja
  commiteado igual.
- **No:** `scripts/enrich-courses.ts` con `@ai-sdk/openai`, como proponían `ANALISIS-IA.md` y
  `SPECS-MAP.md` §7. Su único valor extra es poder re-correrlo, y eso no va a pasar: el catálogo está
  congelado y los cursos nuevos entrarán por el panel del spec 10.
- **Sí:** archivo compacto de cuatro campos. El archivo **es** el artefacto de revisión; 74 entradas
  de cuatro líneas se leen de corrido, 74 objetos de 21 campos no.
- **No:** copia completa del catálogo con los dos campos encima. Duplicaría los 19 campos originales y
  cualquier corrección futura dejaría dos versiones del mismo curso.
- **Sí:** el campo se llama `difficulty`. `level` ya significa otras dos cosas en el modelo de datos:
  `program_courses.level` (requerido/recomendado/opcional) y `profiles.level` (gamificación).
- **Sí:** los valores van en español porque se muestran tal cual en pantalla. El identificador queda en
  inglés, como pide `CLAUDE.md`.
- **No:** `skills` ni `prerequisite_slugs`. El ADR 0001 ya los sacó de la Capa 0 y los reemplazó por
  tablas escritas a mano en el spec 04.
- **No:** un archivo de revisión aparte en markdown. Con el formato compacto el JSON ya es legible, y
  un segundo archivo se desincroniza del primero.
- **No:** un campo de confianza o una marca de "generado por IA" por fila. Las 74 filas pasan por
  revisión humana; después de eso la procedencia deja de importar.

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un `outcome` promete algo que el curso no enseña y lo lee el instructor que lo grabó              | Cada frase se escribe solo a partir de los `outcomes`, `topics` y `chapters` del propio curso, y las 74 pasan por revisión humana antes de mergear |
| `difficulty` mal calibrado hace que el motor del spec 04 le dé cursos avanzados a un principiante | Criterio escrito arriba, desempate por etapa, y un criterio de aceptación que verifica que ningún curso de etapa 1 quedó `avanzado`                |
| Los dos archivos se desincronizan si algún día cambia `courses.json`                              | El spec 02 cruza por `slug` al sembrar; si falta un slug el seed falla en vez de cargar el catálogo a medias                                       |
| Revisar 74 filas se posterga y bloquea el spec 02                                                 | El seed es el último paso del spec 02, así que el 02 puede arrancar sin esperar a este                                                             |

## Qué **no** entra en este spec

- El script de enriquecimiento y cualquier dependencia de IA.
- `skills` y `prerequisite_slugs`.
- El seed de Supabase (spec 02).
- El uso de los dos campos en el motor (spec 04) y en la vista de la ruta (spec 08).
- Cualquier corrección de los otros 19 campos del catálogo.

Cada uno de estos, si aterriza, va en su propio spec.
