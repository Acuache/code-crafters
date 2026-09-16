# 0001: Motor de reglas sobre programas oficiales + IA que personaliza encima

- **Fecha:** 2026-09-15
- **Estado:** propuesta

## Contexto

`docs/ROADMAP.md` (sección "Decisiones ya tomadas") parte de que "la IA arma la ruta": el modelo recibe el catálogo completo y el perfil del usuario, y decide cursos, orden y etapas, con un plan B por reglas solo para cuando falla.

`docs/investigacion/ANALISIS-IA.md` se escribió después, ya con los 74 cursos y 15 programas oficiales extraídos (`data/courses.json`, `data/programs.json`), y cuestiona esa decisión: se tomó **antes** de tener los datos, y los datos cambian el panorama — 72 de 74 cursos ya están en una ruta oficial de DevTalles, con nivel (`requerido`/`recomendado`/`opcional`) explícito. Formalmente nadie ha cerrado esto todavía: la sección 11 de `ANALISIS-IA.md` deja la pregunta en un checkbox sin marcar.

## Opciones consideradas

Las tres que compara `ANALISIS-IA.md` (sección 5):

1. **A — La IA arma la ruta** (lo que dice el roadmap hoy): el modelo decide cursos, orden y etapas desde el catálogo completo; reglas solo como plan B.
2. **B — Sin IA**: cuestionario → reglas → rutas oficiales filtradas, razones por plantilla.
3. **C — Híbrido**: un motor por reglas sobre las rutas oficiales arma la ruta siempre (Capa 1); la IA solo personaliza encima dentro de límites — explica, cambia opcionales, interpreta la meta en texto libre (Capa 2). Si la IA falla, la Capa 1 ya dejó una ruta usable.

## Qué dijo el abogado del diablo

Pendiente — correr `/critica` sobre esta decisión (o sobre la opción A, para ver si sobrevive al ataque) antes de marcarla como aceptada.

## Decisión

Sin cerrar. `ANALISIS-IA.md` recomienda C por menor riesgo de descalificación (la app funciona sin `OPENAI_API_KEY`, requisito explícito de `docs/ENUNCIADO.md`) y por ser, en la práctica, menos trabajo que A (que igual exige el motor por reglas para el plan B, más una validación de coherencia adicional).

## Consecuencias

Si se acepta C: cambia el roadmap (día 2 sube de prioridad el enriquecimiento offline del catálogo; desaparece "plan B" como tarea separada porque el motor por reglas pasa a ser la Capa 1 obligatoria, no un respaldo). Qué haría revisar esto: que el enriquecimiento manual de los 74 cursos (nivel, skills, prerequisite_slugs) resulte más lento de lo estimado, o que el equipo decida que el riesgo de A vale la pena por diferenciarse más en el pitch.
