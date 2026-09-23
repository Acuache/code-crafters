# Quizzes, progreso y racha persistentes

**Fecha:** 2026-09-23

**Estado:** Aprobado en conversación; pendiente de revisión del documento

**Producto:** DevPathlles (`code-crafters`)

## Objetivo

Integrar en el producto final la experiencia de ruta interactiva, los quizzes de cursos y capítulos y la racha diaria demostrados en `DEVPATHLLES_PROTOTIPO`, sin reemplazar el cuestionario inicial, el motor de reglas ni la generación de rutas ya implementados en `code-crafters`.

El resultado debe ofrecer un recorrido persistente de punta a punta: el usuario abre una ruta guardada, practica un capítulo o presenta la evaluación de un curso, recibe retroalimentación, conserva su racha y, al aprobar la evaluación final, completa el paso y desbloquea el siguiente. Supabase será la fuente de verdad; no se usará `localStorage` para progreso, intentos ni rachas.

## Decisiones confirmadas

- Se conserva el cuestionario inicial de seis pasos y el motor de rutas actual.
- Se traslada la experiencia del prototipo, no su arquitectura ni sus estilos CSS.
- Un quiz de capítulo aprobado registra actividad para la racha, pero no completa un curso.
- Un quiz de curso aprobado completa el `path_step` correspondiente y desbloquea el siguiente paso principal.
- El porcentaje mínimo para aprobar es 60%.
- Todos los intentos se guardan en Supabase.
- La racha aumenta como máximo una vez por fecha local del usuario.
- Vercel AI SDK será la capa de generación y OpenRouter el proveedor, autenticado mediante `OPENROUTER_API_KEY` solo en el servidor.
- El quiz activo de cada curso o capítulo se comparte entre usuarios; los intentos y resultados son privados.
- La zona horaria se detecta en el navegador como identificador IANA y se conserva en el perfil.

## Alcance

### Incluye

- Reemplazar el placeholder de `/paths/[id]` por una vista interactiva y responsive de la ruta.
- Mostrar progreso, estados de pasos, procedencia, cursos descartados, cursos bonus y detalle del curso seleccionado.
- Generar, validar, versionar y reutilizar quizzes compartidos por curso o capítulo.
- Registrar intentos privados y calificar respuestas en el servidor.
- Completar un paso de ruta después de aprobar su quiz de curso.
- Registrar actividad diaria y mantener racha actual, mejor racha y calendario reciente.
- Mostrar retroalimentación por pregunta, resultado final y celebraciones con los assets existentes.
- Manejar fallos y reintentos de OpenRouter sin afectar la ruta ni el progreso.
- Actualizar migraciones, tipos de Supabase, `.env.example`, pruebas y documentación.

### No incluye

- Reemplazar o rediseñar el assessment inicial.
- Cambiar el motor `buildPath()` ni permitir que la IA seleccione cursos.
- Copiar el almacenamiento local, los controles de fecha simulada o el CSS del prototipo.
- XP, niveles, insignias o confetti genérico; este incremento se limita a progreso, quizzes, racha y las celebraciones de mascota ya existentes.
- Un editor administrativo de quizzes.
- Generar un quiz diferente por usuario o por intento.

## Arquitectura

La implementación se divide en tres incrementos verticales, cada uno verificable:

1. **Ruta y progreso persistente.** La vista consume `learning_paths`, `path_steps` y `courses`; presenta los estados reales y permite iniciar el siguiente paso elegible.
2. **Quizzes compartidos e intentos privados.** Una capa de servidor recupera la versión activa o reclama su generación, llama a OpenRouter mediante Vercel AI SDK y persiste la salida validada. El cliente recibe las preguntas sin las respuestas correctas.
3. **Finalización transaccional y racha.** Al enviar un intento, una operación de base de datos califica, guarda el resultado, registra la actividad diaria y, cuando corresponde, completa el paso.

### Límites de responsabilidad

- `lib/quizzes/*`: contratos, schemas, proveedor de IA y orquestación de generación.
- `lib/gamification/*`: cálculos puros de fechas/racha y contratos de presentación.
- `app/(app)/paths/[id]/*`: carga protegida de la ruta y acciones del flujo.
- `components/paths/*`: recorrido, detalle de curso y estados de progreso.
- `components/quizzes/*`: diálogo, preguntas, retroalimentación y resultado.
- `components/gamification/*`: tarjeta y celebración de racha.
- Postgres: integridad, aislamiento por usuario y mutaciones atómicas.

## Modelo de datos

La migración usará las tablas y columnas descritas a continuación; el plan de implementación no debe renombrarlas sin actualizar primero este documento.

### `quizzes`

Representa una versión compartida de un quiz.

- Identidad del objetivo: `course_id`, `kind` (`course | chapter`) y `chapter_title` (`null` para curso).
- `target_key`, derivada de curso, tipo y capítulo, identifica el objetivo sin depender del comportamiento de `NULL` en restricciones únicas.
- Estado `status`: `generating | ready | failed`.
- `version` e `is_active` identifican la versión vigente.
- `questions` contiene preguntas, opciones, respuestas correctas y explicaciones validadas.
- `model`, `created_at`, `updated_at` y `failure_message` registran la generación.
- Restricción única que permita una sola versión activa por objetivo.

El contenido completo no tendrá una política de lectura directa para clientes autenticados. Las preguntas se entregarán mediante una interfaz de servidor que elimine `correctOption` y cualquier otro dato que permita conocer la respuesta.

### `quiz_attempts`

Registra cada presentación:

- `user_id`, `quiz_id`, `path_id` y `path_step_id`.
- `answers` contiene los índices seleccionados.
- `correct_count`, `score_percentage`, `pass_percentage` y `passed` guardan la calificación calculada.
- `started_at` y `submitted_at` registran el intento.
- `timezone` y `activity_date` conservan la zona y fecha local efectivas usadas para la actividad.

RLS limita lectura al dueño. La inserción y calificación se realizan a través de una operación controlada; el cliente no envía puntuación, resultado ni respuestas correctas.

### `streak_activities`

Guarda una fila por `user_id` y fecha local en la que hubo al menos un quiz aprobado. Una restricción única sobre ambas columnas hace idempotente la actividad diaria.

### `profiles`

Se amplía con:

- `timezone`, como identificador IANA.
- `current_streak`.
- `best_streak`.
- `last_activity_date`, como fecha local y no como timestamp UTC.

Los valores resumidos evitan recalcular todo el historial en cada carga. `streak_activities` sigue siendo el historial auditable.

### `path_steps`

Continúa siendo la fuente de verdad del progreso. Un quiz de curso aprobado cambia el paso a `done` y completa `completed_at`. Un quiz de capítulo nunca cambia este estado. Los pasos `discarded` no admiten intentos y los pasos principales bloqueados no pueden completar su evaluación antes de que los anteriores estén terminados. Los cursos opcionales no bloquean ni son bloqueados por la secuencia principal.

## Generación compartida

1. El usuario solicita un quiz desde un paso que pertenece a una ruta propia.
2. El servidor normaliza el objetivo y busca una versión activa `ready`.
3. Si existe, devuelve inmediatamente su representación segura.
4. Si no existe, intenta insertar el registro único en estado `generating`. El ganador de esa reclamación genera; solicitudes concurrentes observan el mismo registro y esperan o reciben un estado reintentable.
5. Vercel AI SDK llama a OpenRouter con `OPENROUTER_API_KEY` y un modelo configurable por variable de entorno no pública.
6. Un schema estricto exige exactamente 3 preguntas para capítulo o 10 para curso, cuatro opciones distintas, un índice correcto válido y una explicación acotada.
7. Una salida válida cambia el registro a `ready`; un fallo lo cambia a `failed` sin crear intentos.
8. Un fallo puede reclamarse de nuevo de forma controlada. Nunca se sustituyen silenciosamente versiones ya utilizadas por intentos; una regeneración futura crea otra versión.

El contexto del prompt se limita a los datos reales del curso guardados en Supabase: título, resumen, temas, requisitos, resultados y capítulos. La IA no altera la ruta.

## Presentación y flujo

### Vista de ruta

`/paths/[id]` muestra:

- Título, resumen, horas presupuestadas y progreso porcentual.
- Pasos ordenados con estados `locked`, `available`, `in_progress`, `done` y `discarded` derivados de los datos existentes.
- Procedencia y razón de cada curso.
- Un detalle del curso seleccionado con capítulos y enlace a DevTalles.
- Cursos opcionales como misiones bonus separadas.
- Cursos descartados en una sección explicativa.
- Tarjeta de racha con racha actual, mejor racha y actividad reciente.

En escritorio se usa un recorrido visual inspirado en el prototipo. En pantallas pequeñas se transforma en una lista vertical legible. La UI compone `components/ui/*`, `components/brand/*`, `components/gamification/xp-bar.tsx` cuando sea pertinente y los tokens existentes. No se importan las clases globales del prototipo.

### Diálogo de quiz

- Presenta estado de carga/generación, error recuperable, preguntas y resultado.
- Muestra una pregunta a la vez.
- Permite seleccionar una opción y comprobarla. Una acción de servidor recibe `quizId`, `questionId` y el índice elegido, y devuelve si es correcta junto con la explicación; las respuestas no se precargan en el bundle del cliente.
- Muestra la explicación después de responder.
- Al final, registra el intento y muestra porcentaje, cantidad correcta y aprobación.
- Permite reintentar después de reprobar.
- Al aprobar, muestra una de las cuatro celebraciones existentes. En un quiz de curso, actualiza el paso y el desbloqueo siguiente sin recargar toda la página.

## Operación transaccional

La entrega final de respuestas ejecuta una función de servidor/base de datos que:

1. Verifica al usuario autenticado y la propiedad de la ruta.
2. Verifica que el paso corresponda al curso y que el quiz corresponda al objetivo solicitado.
3. Verifica elegibilidad del paso principal o la condición de bonus/práctica.
4. Califica contra la versión persistida.
5. Inserta `quiz_attempts` con datos calculados en servidor.
6. Si el intento aprobó, inserta idempotentemente la actividad de la fecha local.
7. Recalcula los resúmenes de racha solo si apareció una nueva fecha activa.
8. Si es quiz de curso aprobado, marca el `path_step` como `done` y establece `completed_at`.
9. Devuelve resultado, cambio de racha, paso actualizado y siguiente paso disponible.

Todos los efectos ocurren juntos o ninguno ocurre. Reenviar la misma solicitud no duplica actividad ni descompleta pasos.

## Zona horaria

El navegador obtiene `Intl.DateTimeFormat().resolvedOptions().timeZone`. El servidor valida que sea una zona IANA admitida por Postgres antes de guardarla. La fecha de actividad se deriva en el servidor usando esa zona y la hora actual; el cliente no puede elegir arbitrariamente la fecha que aumenta la racha.

Si no se puede obtener o validar una zona, se usa `UTC` como fallback explícito. Un cambio de zona afecta actividades futuras, no reescribe el historial.

## Seguridad

- `OPENROUTER_API_KEY` nunca usa prefijo `NEXT_PUBLIC_` ni se lee desde Client Components.
- Cada acceso comprueba autenticación, propiedad de ruta y pertenencia del curso/paso.
- RLS protege rutas, pasos, perfiles, actividades e intentos.
- Las respuestas correctas no se exponen mediante consultas directas ni payloads iniciales.
- Los campos calculados (`score`, `passed`, racha y estado del paso) nunca son aceptados como autoridad desde el cliente.
- Se limita el tamaño y forma de prompts, respuestas de modelo y respuestas del usuario.
- Los errores de proveedor se registran en servidor; la UI recibe mensajes accionables sin secretos ni cuerpos crudos.

## Manejo de errores

- **OpenRouter no configurado:** la ruta permanece usable y el diálogo explica que la evaluación no está disponible.
- **Timeout, cuota o modelo no disponible:** el registro pasa a `failed`, se ofrece reintentar y no se crea un intento.
- **Salida inválida:** se rechaza por schema y se trata como fallo de generación.
- **Generación concurrente:** una sola versión termina activa; las demás solicitudes consumen esa misma versión.
- **Envío repetido:** la operación es idempotente para actividad diaria y finalización del paso.
- **Ruta o paso ajeno/inexistente:** se devuelve no encontrado o no autorizado sin revelar datos.
- **Cambio de estado durante un quiz:** el servidor vuelve a validar antes de guardar el intento.

## Estrategia de pruebas

### Unitarias

- Schema de salida de IA: forma válida, cantidad exacta, opciones únicas e índice correcto.
- Cálculo de puntuación y umbral de 60%.
- Continuidad, repetición diaria y reinicio de racha.
- Derivación de estados bloqueado/disponible/completado/bonus.
- Transformación del quiz persistido a su representación segura.

### Base de datos e integración

- Restricciones únicas de quiz activo y actividad diaria.
- RLS de intentos, rutas y rachas.
- Generación concurrente reutiliza la misma versión activa.
- Intento reprobado no modifica paso ni racha.
- Quiz de capítulo aprobado actualiza racha, no paso.
- Quiz de curso aprobado actualiza intento, racha y paso atómicamente.
- Usuario no dueño no puede consultar ni mutar el flujo.

### Aplicación

- Tests de acciones y componentes para carga, error, pregunta, explicación y resultado.
- Verificación de responsive y navegación por teclado.
- `npm run lint`, `npm run test` y `npm run build`.
- Recorrido manual autenticado: ruta → quiz de capítulo → racha → quiz de curso → paso completado → siguiente paso disponible.

## Criterios de aceptación

- Dos usuarios que solicitan el mismo objetivo reciben la misma versión activa del quiz.
- Un usuario solo puede ver sus propios intentos, progreso y racha.
- Ninguna respuesta correcta aparece en el payload inicial del quiz.
- Aprobar con 60% o más produce un intento aprobado; menos de 60% no altera progreso ni racha.
- Aprobar un quiz de capítulo registra como máximo una actividad diaria y no completa el curso.
- Aprobar un quiz de curso completa su paso y desbloquea el siguiente principal.
- Cursos bonus no bloquean la ruta principal.
- La actividad se asigna a la fecha local de la zona IANA guardada.
- Recargar o iniciar sesión en otro dispositivo conserva progreso, intentos y racha.
- Sin `OPENROUTER_API_KEY` o ante un fallo del proveedor, la ruta sigue siendo navegable y no se corrompen datos.
- La vista funciona en escritorio y móvil usando el sistema de diseño existente.

## Riesgos y mitigaciones

- **Costo o latencia de IA:** reutilización global por objetivo, modelo configurable y estado de generación visible.
- **Calidad factual:** prompt limitado al catálogo real, schema estricto, explicaciones obligatorias y versión regenerable.
- **Filtración de respuestas:** separación entre contenido persistido y DTO seguro; calificación exclusiva en servidor.
- **Carreras de generación:** reclamación mediante fila única y estados explícitos.
- **Manipulación de racha:** fecha derivada en servidor y actividad diaria con restricción única.
- **Alcance excesivo:** se excluyen XP, niveles, insignias y administración; los tres incrementos conservan límites claros.

## Orden de entrega

1. Migración y tipos para quizzes, intentos y rachas.
2. Consultas y vista real de ruta con estados persistentes.
3. Contratos, schemas y generación compartida con OpenRouter.
4. Diálogo de quiz y retroalimentación.
5. Calificación transaccional, actualización de paso y racha.
6. Celebraciones, estados de error y responsive.
7. Pruebas automatizadas, build y recorrido manual.
