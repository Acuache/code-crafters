# 0007: "Hecho" exige aprobar el quiz cuando el curso tiene uno

- **Fecha:** 2026-09-25
- **Estado:** aceptada

## Contexto

El ADR 0005 dejó dos formas de completar un curso: el toggle "Hecho" o aprobar su quiz. El quiz "no
puede ser más estricto que el toggle", y el 0006 lo mantuvo cuando el admin pasó a escribir los
quizzes. Al probar la celebración del spec 14 en el navegador, el estado del paso y el quiz se
sentían como dos cosas separadas: se podía marcar "Hecho" sin rendir nada, y aprobar el quiz no
significaba más que tocar un botón. Con XP e insignias atadas a "Hecho", el quiz quedaba de adorno.

## Opciones consideradas

1. **Dejarlo como está (ADR 0005)** — el toggle y el quiz valen lo mismo. Nada que migrar, pero el
   quiz no aporta nada al XP.
2. **"Hecho" exige el quiz solo si el curso tiene uno activo** — en esos cursos, "Hecho" abre el
   quiz y la action rechaza `done` directo. Los cursos sin quiz se siguen marcando con el toggle.
3. **"Hecho" exige siempre un quiz** — un curso sin quiz nunca se podría completar, ni tampoco su
   ruta, hasta que el admin escriba uno.
4. **La opción 2 más un trigger en `path_steps`** — bloquea `done` sin intento aprobado aunque se
   escriba directo por la API. Suma migración y pgTAP.

## Qué dijo el abogado del diablo

No se corrió `/critique`. La decisión la tomó el equipo mientras probaba el paso 8 del spec 14, con
las variantes de arriba a la vista.

## Decisión

La opción 2. "Hecho" en un curso con quiz activo abre el quiz, y `setStepStatus` rechaza `done` en
ese curso. La regla vive en la action y en la UI, como las demás reglas de transición del spec 08:
la RLS `path_steps_owner_all` ya deja escribir directo al dueño, y saltársela solo lo engaña a él.
Volver un paso aprobado a "En curso" o "Pendiente" obliga a aprobar el quiz otra vez para volver a
"Hecho".

## Consecuencias

- Se gana: con quiz, "Hecho" significa "lo aprobé", y el XP del spec 14 premia eso.
- Se sacrifica: desmarcar un paso aprobado por error cuesta rendir el quiz de nuevo. Tampoco se
  guarda qué pasos se completaron antes de esta regla sin quiz: siguen "Hecho".
- `submit_quiz_attempt` no cambia: aprobar ya marcaba el paso.
- Revisar si los usuarios desmarcan seguido pasos aprobados (habría que recordar el intento
  aprobado del paso) o si aparece una forma real de farmear XP por la API (ahí sí, trigger).
