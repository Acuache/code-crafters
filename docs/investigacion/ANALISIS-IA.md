# ¿Vale la pena meter IA? Análisis crítico

> Documento para la reunión de equipo. La idea es decidir **dónde** usar IA, no **si** suena bien.

## Veredicto corto

**Sí, pero no como motor de la ruta.** La IA vale la pena como capa de personalización encima de un motor por reglas basado en las rutas oficiales de DevTalles, y como herramienta *offline* para enriquecer el catálogo.

Esto corrige lo que decidimos en `ROADMAP.md` ("la IA arma la ruta"). Esa decisión se tomó antes de extraer los datos, y los datos cambian el panorama (ver abajo).

---

## 1. Lo que dice el enunciado (y lo que no dice)

- **La IA no es requisito ni criterio de evaluación.** Ningún punto del enunciado la menciona. Suma solo si mejora la **Idea**, la **UI** o la experiencia; no suma por existir.
- **"Al clonar el proyecto este debe funcionar siguiendo las instrucciones".** El evaluador clona el repo. Si la ruta depende de una API key que no tiene, la función principal de la app no funciona en su máquina.
- **"Las soluciones parciales o que no funcionen serán descartadas de inmediato".** Una llamada a OpenAI que falla, tarda 20 s o devuelve algo raro durante la evaluación puede costarnos el concurso entero, no solo puntos.
- **"Adaptarse a las necesidades cambiantes… adición de nuevas características".** Aquí la IA sí ayuda: cuando DevTalles publique un curso nuevo, se re-extrae y se re-enriquece sin reescribir reglas a mano.
- **Evaluadores = gente de DevTalles.** Conocen sus propias rutas. Una ruta inventada por IA que contradiga la ruta oficial del instructor se ve mal; una que la **respeta y la personaliza** se ve muy bien.

## 2. Lo que dicen los datos que ya extrajimos

| Dato | Implicación |
|---|---|
| **72 de 74 cursos** ya están en alguna ruta oficial (`programs.json`) | DevTalles ya hizo el trabajo difícil: qué va primero y qué es requerido. La IA no necesita "descubrir" el orden. |
| Cada paso trae `level`: `requerido` / `recomendado` / `opcional` | Un motor por reglas puede armar rutas buenas **sin IA**: requeridos siempre, recomendados por defecto, opcionales según interés. |
| **16 cursos** aparecen en más de un programa | Combinar rutas (ej. React + Nest = fullstack) requiere deduplicar. Es lógica simple, no IA. |
| `prerequisites` es **texto libre** ("Haber completado un curso de Java y Java Avanzado…") | Convertir ese texto en slugs (`java`, `java-avanzado`) es una tarea **ideal para IA offline**. |
| **No existe nivel** (principiante/intermedio/avanzado) | Otra tarea ideal para IA offline. |
| **36 cursos** sin `outcomes`, **10** sin `topics` | Si la IA genera razones a partir de estos campos, en esos cursos van a salir genéricas. Hay que rellenarlos offline o darle `chapters`. |
| Catálogo compacto completo ≈ **9 000 tokens**; solo slug + título + áreas + horas ≈ **1 600 tokens** | Cabe entero en un prompt. **No hace falta RAG, embeddings ni pgvector.** Meter eso sería complejidad sin beneficio. |

---

## 3. Beneficios reales de la IA (sin inflarlos)

1. **El "¿por qué este curso?" personalizado.** Es lo más visible en el video: "Como ya manejas HTML y CSS, saltamos Programación para principiantes y empiezas por JavaScript moderno". Las reglas solo pueden decir "Requerido en la ruta oficial".
2. **Entender metas en texto libre.** "Quiero hacer apps móviles que usen IA para mi emprendimiento" → mezcla Dart/Flutter + IA. Con reglas esto se vuelve un árbol de `if` frágil.
3. **Enriquecer el catálogo una sola vez.** Nivel, skills normalizadas y prerrequisitos como slugs. Costo casi cero, se revisa a mano y se versiona. **Es el uso con mejor relación valor/riesgo de todo el proyecto.**
4. **Mantenimiento a futuro.** Curso nuevo → scraper + enriquecimiento → el motor lo toma. Encaja con "adaptarse a las necesidades cambiantes".
5. **Narrativa del pitch.** "Rutas oficiales de DevTalles, personalizadas con IA" es una frase fácil de entender en 90 segundos.

## 4. Riesgos reales (ordenados por gravedad)

1. **La app no funciona al clonar o en la fecha de evaluación.** Sin key, key revocada, créditos agotados o vencidos (revisar si los $10 tienen fecha de expiración). Es el riesgo que puede **descalificar**.
2. **Rutas incoherentes.** Aunque `z.enum` evita cursos inventados, no evita el orden malo (NestJS antes que Node), quitar un curso requerido o meter 30 cursos. Validar esto bien cuesta casi lo mismo que escribir el motor por reglas.
3. **Dos motores que mantener.** El roadmap actual pide "IA arma la ruta" **y** "plan B por reglas". Son dos implementaciones de lo mismo en la semana 1, a cargo de una sola persona (P2). Y el plan B es obligatorio igual, por el punto 1.
4. **Latencia.** Generar una ruta completa puede tardar 5–20 s. En el video se nota y en la evaluación se siente como app lenta.
5. **No determinismo.** Mismas respuestas, ruta distinta. Complica probar, depurar y grabar el video.
6. **Abuso del deploy público.** Si alguien encuentra el endpoint, quema los créditos. Se mitiga, pero hay que hacerlo.
7. **Parecer "otro wrapper de ChatGPT".** Con 18 equipos y un reto de "generador de rutas", es probable que varios usen IA para lo mismo. La IA sola **no diferencia**; diferencia cómo se integra.

> **Lo que NO es un riesgo:** el costo. Con un modelo "mini" y prompts de pocos miles de tokens, $10 alcanza para miles de generaciones. El problema con el dinero no es gastarlo con uso normal, es el abuso o quedarse sin crédito justo cuando evalúan.

---

## 5. Los tres caminos

### A. La IA arma la ruta (lo que dice el roadmap hoy)
El modelo recibe el catálogo completo y el perfil, y decide cursos, orden y etapas. Reglas solo como plan B.

### B. Sin IA
Cuestionario → reglas → rutas oficiales filtradas. Razones con plantillas.

### C. Híbrido: las reglas deciden, la IA personaliza ⭐ recomendado
Motor por reglas sobre las rutas oficiales (siempre funciona) + IA que explica, ajusta dentro de límites y entiende la meta en texto libre. Si la IA falla, el usuario igual tiene su ruta.

### Comparación con los criterios del concurso

| Criterio | A. IA arma | B. Sin IA | C. Híbrido |
|---|---|---|---|
| Idea / creatividad | Media (idea común) | Baja-media | **Alta** (oficial + personal) |
| Cumplimiento de requisitos | Sí | Sí | Sí |
| Funciona al clonar sin key | Solo si el plan B está a la altura | **Siempre** | **Siempre** |
| Impacto en el video | Alto si sale bien, variable | Medio | **Alto y predecible** |
| Código limpio | Lógica duplicada (IA + fallback) | Simple | **Un motor + una capa** |
| Esfuerzo semana 1 | Alto | Bajo | Medio |
| Riesgo de descalificación | Medio-alto | Muy bajo | **Muy bajo** |

**Por qué C y no B:** B es seguro pero se parece a lo que hará cualquiera, y pierde justo lo que más luce en la demo (razones personalizadas y meta en texto libre).
**Por qué C y no A:** A exige el mismo motor por reglas (por el plan B) más una validación compleja, con más riesgo y peor coherencia con las rutas oficiales. C es, en la práctica, **menos trabajo** que A.

---

## 6. Camino recomendado en detalle (tres capas)

> **Demo interactiva:** `docs/investigacion/opcion-c.html` (ábrelo en el navegador). Cambia el perfil y mira cómo se rearma la ruta con los 74 cursos reales; después pulsa "Personalizar con IA" y fíjate en qué cambia y qué no. Incluye un interruptor para simular que no hay `OPENAI_API_KEY`.

### Capa 0: Enriquecimiento offline (una vez, antes de programar la app)
Script `scripts/enrich-courses.ts`, corre en local y guarda `data/courses.enriched.json` en el repo.

| Campo nuevo | Sale de | Para qué |
|---|---|---|
| `level`: principiante / intermedio / avanzado | summary, prerequisites, chapters | Filtrar según el nivel del cuestionario |
| `skills`: `["react", "typescript", "testing"]` | topics, chapters, title | Saltar cursos que el usuario ya domina |
| `prerequisite_slugs` | texto de `prerequisites` + catálogo de slugs | Ordenar por dependencias (orden topológico) |
| `outcome` (1 frase) | outcomes o, si falta, chapters | Tarjetas de la UI y razones por plantilla |

- **Revisión humana obligatoria:** 74 filas, ~1 hora repartida entre los 3. Así lo que ve el evaluador está controlado.
- El evaluador **no necesita key**: el JSON enriquecido ya viene en el repo y va al seed.

### Capa 1: Motor por reglas (el que genera la ruta, siempre)
`lib/paths/build-path.ts`, función pura y testeable:

1. Del cuestionario: meta, stack preferido, nivel, tecnologías que ya domina, horas por semana.
2. Elegir programa(s): stack → programa (`react`, `nest`…); meta fullstack → combinar front + back; principiante → anteponer `fundamentos`.
3. Tomar pasos: `requerido` siempre, `recomendado` por defecto, `opcional` solo si coincide con intereses.
4. Quitar cursos cuyas `skills` ya domina (nunca un `requerido` de nivel superior al del usuario).
5. Deduplicar (16 cursos compartidos) y ordenar por etapa + `prerequisite_slugs`.
6. Estimar semanas = horas totales / horas por semana.
7. Razón por plantilla: "Requerido en la ruta oficial de React", "Opcional: coincide con tu interés en testing".

**La ruta se guarda de inmediato.** El usuario ya tiene algo usable en menos de un segundo.

### Capa 2: Personalización con IA (opcional, encima de la ruta ya guardada)
Solo si hay `OPENAI_API_KEY`. Recibe perfil + meta en texto libre + **la ruta base** (15–30 cursos, no el catálogo entero) + un pequeño pool de cursos extra del mismo área.

Devuelve (schema validado con zod):
```ts
{
  title: string,                 // "De CSS a Frontend con React en 6 meses"
  summary: string,
  reasons: { courseSlug: SlugDeLaRuta, reason: string }[],
  skip:    { courseSlug: SlugNoRequerido, reason: string }[],  // solo recomendados/opcionales
  add:     { courseSlug: SlugDelPool,     reason: string }[]   // máximo 2
}
```

Reglas de seguridad (en nuestro código, no en el prompt):
- La IA **no ordena**: el orden lo vuelve a calcular la Capa 1 con los prerrequisitos.
- La IA **solo puede quitar cursos opcionales**, nunca requeridos ni recomendados, y agrega como máximo 2.
  Los recomendados también se protegen porque un solape parcial engaña: saber JavaScript no vuelve redundante un curso de Node, y con la regla floja la capa de IA cortaba justo esa clase de curso.
- Timeout (~15 s) o respuesta inválida → se queda la ruta base con razones por plantilla. El usuario no ve un error.
- Las razones se muestran con streaming o aparecen al terminar, sobre una ruta que **ya está en pantalla**. La latencia deja de ser un problema.
- En la UI, una etiqueta honesta: "Basada en la ruta oficial de DevTalles" y, si aplicó, "Personalizada con IA".

---

## 7. Dónde sí y dónde no usar IA

| Uso | Valor | Riesgo | Decisión |
|---|---|---|---|
| Enriquecer catálogo offline (nivel, skills, prerrequisitos) | Alto | Muy bajo | **Sí, primero** |
| Razones personalizadas por curso | Alto (luce en video) | Bajo | **Sí** |
| Interpretar meta en texto libre | Alto | Bajo con límites | **Sí** |
| Título y resumen de la ruta / texto para compartir | Medio | Muy bajo | Sí (sale en la misma llamada) |
| Saltar / agregar cursos dentro de límites | Medio | Bajo con validación | Sí |
| Decidir cursos y orden desde cero | Medio | Alto | **No** |
| Preguntas del cuestionario generadas por IA | Bajo | Medio | **No**: cuestionario fijo, más claro y testeable |
| Mini-quiz de re-evaluación generado en vivo | Medio | **Alto** | **No**. Preguntas hechas desde títulos de capítulos salen genéricas o incorrectas, y los instructores lo notan |
| Chat mentor / asistente | Bajo para el concurso | Alto (tiempo) | **No** (ya estaba en WON'T) |
| RAG, embeddings, pgvector | Nulo con 74 cursos | Complejidad | **No** |

**Alternativa a la re-evaluación adaptativa:** botón "Recalcular mi ruta". El usuario actualiza lo que ya domina, la Capa 1 regenera, se conserva el progreso y (si hay key) la Capa 2 re-explica. Reutiliza el mismo motor, es adaptativo de verdad y cuesta un día en vez de tres.

---

## 8. Cuidar los $10 y la disponibilidad

- **Límite de gasto duro** en el dashboard de OpenAI (ej. $8) para que nunca pase de ahí.
- La key solo en el servidor (`OPENAI_API_KEY`, **nunca** `NEXT_PUBLIC_`), y en Vercel como variable de entorno.
- Solo usuarios logueados con Discord pueden disparar la Capa 2, con **máximo N personalizaciones por día** por usuario (tabla o conteo en `learning_paths`).
- **Caché por perfil:** mismo hash de respuestas + meta → reutilizar la personalización guardada.
- Enviar la ruta base, no el catálogo completo: prompts de pocos miles de tokens.
- Un modelo mini alcanza para esto. Verificar precio y modelos disponibles en platform.openai.com antes de elegir.
- **Antes de entregar:** probar la app con la key borrada (debe funcionar entera) y con la key puesta.

---

## 9. Cómo se ve la IA en el video (90 s)

El momento IA debería durar **10–15 segundos**, no más:

1. El usuario escribe su meta: *"Sé HTML y CSS, quiero trabajar como frontend en 6 meses"*.
2. Aparece la ruta en el mapa **al instante** (Capa 1).
3. Se completan las razones: *"Saltamos Programación para principiantes porque ya tienes bases…"* y el título personalizado.
4. Texto en pantalla: **"Rutas oficiales de DevTalles + personalización con IA"**.

Lo que más impresiona no es "la IA generó algo", sino que la ruta **se nota hecha para esa persona** y a la vez **coincide con lo que enseña DevTalles**.

---

## 10. Qué cambiaría en `ROADMAP.md` si elegimos C

- **Decisiones ya tomadas:** "La IA arma la ruta" → "Motor por reglas sobre rutas oficiales + personalización con IA".
- **Día 2 (P2):** enriquecimiento offline + revisión humana (se mantiene, sube de prioridad).
- **Días 3–4 (P2):** primero `build-path.ts` (Capa 1) con tests de 5 perfiles; después la Capa 2. Desaparece el "plan B" como tarea separada: **el motor por reglas es el plan A**.
- **Hito 1:** se cumple solo con la Capa 1. La Capa 2 puede entrar al final de la semana 1 o al inicio de la 2 sin bloquear nada.
- **COULD:** reemplazar "mini-quiz generado por IA" por "Recalcular mi ruta".
- **Riesgos:** agregar "créditos vencidos o agotados en la fecha de evaluación" y "límite de gasto duro".

---

## 11. Decisiones para cerrar en la reunión

- [ ] ¿Camino A, B o C? (recomendación: **C**)
- [ ] ¿Quién revisa el enriquecimiento de los 74 cursos y cuándo? (sugerido: los 3, 20 min cada uno, día 2)
- [ ] ¿Qué preguntas tiene el cuestionario? (máx. 6–8, una sola de texto libre: la meta)
- [ ] ¿Cómo combinamos programas para metas fullstack? (tabla meta → programas)
- [ ] ¿Límite diario de personalizaciones por usuario? (sugerido: 5)
- [ ] ¿Re-evaluación con mini-quiz o "Recalcular mi ruta"? (recomendación: recalcular)
- [ ] ¿Los $10 tienen fecha de vencimiento? ¿Quién es dueño de la key?
- [ ] Confirmar con la organización si los créditos o la key deben quedar activos durante la evaluación.
