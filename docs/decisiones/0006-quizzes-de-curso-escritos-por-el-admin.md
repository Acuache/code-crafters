# 0006: Quizzes de curso escritos por el admin, sin IA

- **Fecha:** 2026-09-24
- **Estado:** aceptada

## Contexto

El [ADR 0005](0005-quizzes-y-racha-unificados.md) integró los quizzes de Ariel: OpenAI generaba un
quiz de 10 preguntas por curso y una práctica de 3 por capítulo la primera vez que alguien los
abría, y el resultado se compartía entre todos los usuarios. Al probarlo aparecieron cuatro
problemas:

- **Tardaba.** El primer usuario de cada curso esperaba entre 15 y 45 s ("Preparando tu quiz…"). En
  la demo del concurso, ese primero es el jurado.
- **La IA no conocía el curso.** Solo veía el título, el resumen, los temas y los *títulos* de los
  capítulos de `data/courses.json`: preguntaba cosas genéricas, podía inventar y nadie revisaba lo
  que se publicaba.
- **La práctica por capítulo sobraba.** DevTalles ya evalúa varias secciones, y con solo el título
  de un capítulo las preguntas eran casi adivinanzas.
- **Pedía una variable de entorno más.** Guardar el quiz compartido necesitaba `SUPABASE_SECRET_KEY`,
  porque `quizzes` no tenía políticas para usuarios. `ENUNCIADO.md` descalifica un proyecto que no
  funcione al clonarlo.

## Opciones consideradas

1. **Seguir generando con IA, con un modelo más rápido** — baja la espera, pero el contenido sigue
   sin revisión y la secret key sigue haciendo falta.
2. **Que la IA sugiera preguntas desde el panel y el admin las revise** — contenido revisado, pero
   suma una pantalla y un flujo con IA que no hacen falta para tener quizzes; queda para otro spec.
3. **El admin escribe un quiz por curso desde `/admin`, con un seed inicial** — contenido revisado y
   editable, sin IA ni secret key. El seed trae 3 preguntas básicas por curso para que el jurado vea
   quizzes en los 74 cursos apenas clona.

## Qué dijo el abogado del diablo

No hay registro de un `/critique` para esta decisión: se tomó al escribir el
[spec 13](../../specs/13-course-quizzes.md), a partir de lo que se vio al probar los quizzes con IA.

## Decisión

Opción 3. El contenido lo escribe el admin igual que carga los cursos (spec 10), así escala con el
catálogo sin tocar código y la app funciona sin ninguna clave de IA. En detalle:

- **Un quiz por curso** (`unique (course_id)`), sin capítulos ni versiones: se edita en el lugar. Los
  intentos viejos conservan su puntaje; solo su detalle por pregunta podría no coincidir, y no se
  muestra en ningún lado.
- **Desactivar, no borrar.** Los intentos referencian el quiz con `on delete restrict`.
- **RLS en vez de secret key.** Cualquier usuario autenticado lee los quizzes activos y solo el admin
  escribe, con `private.is_admin()` como el catálogo. Salen `lib/supabase/admin.ts` y
  `SUPABASE_SECRET_KEY`.
- **Feedback al instante, con las respuestas en el navegador.** El quiz completo viaja con la página
  de la ruta: al elegir una opción queda fija y se ve si es correcta y por qué. Esto revierte a
  propósito el "sin corrección antes de entregar" del ADR 0005. Leer las respuestas en devtools no da
  nada que no dé el toggle "Hecho", y `submit_quiz_attempt` vuelve a corregir en Postgres al
  entregar.
- **Aprobar** (el `pass_percentage` de cada quiz, 60 % por defecto) marca el paso como hecho y suma
  el día a la racha. El resto del ADR 0005 sigue igual: una sola racha, sin bloqueo por orden y el
  toggle como la otra forma de completar un curso.
- **Seed:** `data/quizzes.json` (74 × 3 preguntas, redactadas por el agente a partir del resumen,
  los temas y los resultados de cada curso, y revisadas por el equipo) generó una sola vez
  `20260925140000_seed_course_quizzes.sql`. Lo que cambie después va por el panel.

## Consecuencias

- Abrir un quiz no espera a nadie: no hay "Preparando tu quiz…" ni llamada a OpenAI. La app funciona
  entera sin `OPENAI_API_KEY`, quizzes incluidos, y `.env.example` tiene una variable menos.
- Se retiraron `lib/quizzes/{generate,repository}.ts`, `lib/supabase/admin.ts`, la action
  `requestQuiz` y la práctica por capítulo. `20260925130000_course_quizzes.sql` borró los datos de
  prueba de la etapa con IA (el quiz generado y sus intentos, con los días de racha que salieron de
  ellos).
- La calidad del contenido depende de quien lo escribe: las preguntas del seed son deliberadamente
  básicas y cualquiera se corrige desde `/admin/courses/[slug]/quiz`.
- Las respuestas correctas son visibles para quien las busque en el navegador. Aceptado: el quiz no
  da nada que no dé el toggle.
- Revisar esta decisión si el panel se queda corto para mantener 74 quizzes (entonces, la opción 2
  como spec propio) o si hace falta que un quiz certifique algo, porque ahí las respuestas no
  pueden viajar al navegador.
