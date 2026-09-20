# Roadmap MVP: DevPathlles, generador de rutas de aprendizaje (DevTalles)

## Contexto
- Es un concurso de DevTalles con 18 equipos. Tenemos **2 semanas**, somos **3 personas** y trabajaremos con apoyo de IA (Claude Code y similares).
- Requisitos obligatorios (`docs/ENUNCIADO.md`):
  1. Cuestionario de habilidades e intereses.
  2. Rutas dinámicas armadas **con cursos reales de DevTalles**.
  3. Guardar varias rutas y marcar el progreso.
  4. Login y registro, como mínimo con **Discord**.
  5. Tecnologías que se enseñen en DevTalles.
- Qué hay que entregar: repo público, README, licencia MIT, deploy, video de 1 a 1:30 min y uso de ramas. **Si la solución está a medias o no funciona, la descartan**, así que primero va lo funcional y después lo vistoso.
- Decisiones ya tomadas (ver
  [`docs/decisiones/0001-motor-de-reglas-con-ia-encima.md`](decisiones/0001-motor-de-reglas-con-ia-encima.md)):
  - **Un motor por reglas arma siempre la ruta**, sobre los programas oficiales de DevTalles. La IA
    (API de OpenAI, $10 de crédito) es una capa de texto opcional encima: escribe título, resumen y
    razones, y solo si hay `OPENAI_API_KEY`.
  - El output es **un plan con presupuesto de horas** (cabe en el plazo del usuario), no una lista de
    cursos filtrada — es lo que diferencia la ruta generada de la página oficial de DevTalles.
  - **Scraping único + seed** del catálogo.
  - Diferenciadores:
    - Gamificación.
    - Mapa visual.
    - Compartir la ruta.
    - Re-evaluación adaptativa.
- Lo que encontré en la investigación:
  - `cursos.devtalles.com` corre sobre **Thinkific**.
  - `/pages/todos-los-cursos` lista los cursos en **HTML estático**, fácil de extraer con cheerio.
  - **Los cursos Legacy NO entran** en el catálogo. Se reconocen por la sección "Legacy" o por el título que empieza con "Legacy -", por ejemplo "Legacy - Vue.js Tradicional", "Legacy - Flutter Web" o "Legacy - GIT+GitHub".
  - No fijamos una cifra: el total de cursos activos lo da el scraper después de filtrar, y ese número queda en el README.
  - Cada página `/courses/[slug]` trae descripción, horas, cantidad de lecciones, módulos y requisitos, pero **no trae nivel**, así que lo generamos con IA una sola vez (junto con un `outcome` de una frase; ver ADR 0001).
  - DevTalles ya agrupa sus cursos en "programas" (en `/pages/programas-fundamentos` están Fundamentos, React, Node, IA, etc.). Nos sirve de referencia para ordenar las rutas.
  - Hoy la versión actual es **Next.js 16**: el antiguo `middleware.ts` ahora se llama `proxy.ts`.

---

## Stack y librerías (para avanzar rápido)
| Necesidad | Librería | Por qué |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | DevTalles tiene curso de Next.js ✔ |
| UI | **Tailwind v4 + shadcn/ui** + lucide-react + sonner | Cursos de Tailwind y shadcn en DevTalles ✔; componentes listos |
| Auth + DB | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) + Supabase CLI | Discord OAuth nativo, Postgres y RLS (curso de SQL/PostgreSQL ✔) |
| IA | **Vercel AI SDK** (`ai`, `@ai-sdk/openai`) + **zod** | `generateText` + `Output.object({ schema })` devuelve JSON validado (cursos de OpenAI en DevTalles ✔) |
| Formularios | react-hook-form + zod (shadcn Form) | Cuestionario de varios pasos con validación |
| Mapa de la ruta | **@xyflow/react (React Flow)** + `@dagrejs/dagre` | Roadmap tipo roadmap.sh con layout automático |
| Animaciones / celebración | motion + canvas-confetti | Hace que la gamificación se sienta en la demo |
| Imagen para compartir | `next/og` (ImageResponse), ya viene en Next | Tarjeta OG al pegar el link en Discord |
| Scraping | cheerio + tsx (script de un solo uso) | El catálogo es HTML estático |
| Deploy | Vercel | Deploy de previews por rama |

> ⚠️ Conviene confirmar con la organización que Supabase y React Flow cuentan como "tecnología de DevTalles". Supabase es Postgres, que sí tiene curso.

---

## Arquitectura

### Modelo de datos (Supabase, todas las tablas con RLS)
- `courses`: slug, title, description, url, image_url, hours, lessons, category, difficulty (principiante/intermedio/avanzado), outcome, tags text[], prerequisites text[] (slugs). Solo cursos activos: los Legacy no se cargan.
- `profiles`: id (= auth.users.id), username, avatar_url, role (`user`/`admin`, `user` por defecto), xp, level, streak, last_activity_at. Se crea con un trigger al registrarse, leyendo los metadatos del proveedor OAuth (Discord, Google o GitHub).
- `programs`: slug, source_slug (agrupación oficial de DevTalles: `react` agrupa las rutas `react` y `react-native`), name, position. 15 filas — una por ruta oficial, no una por programa agrupado (ver spec 02).
- `program_courses`: program_id, course_id, stage, level (requerido/recomendado/opcional), position, note. El vínculo curso↔programa que arma el motor.
- `assessments`: user_id, answers jsonb, created_at.
- `learning_paths`: user_id, assessment_id, title, goal, summary, is_public, share_slug, created_at.
- `path_steps`: path_id, course_id, source_program_id, stage, position, origin (por qué entró: requerido, interés, etc.), reason (redactada por el motor; la IA la reescribe si hay key), depends_on, status (pending/in_progress/done/discarded), discard_reason (motivo si se descarta), completed_at.
- `achievements` y `user_achievements`: insignias.
- (Stretch) `checkpoints`: step_id, questions jsonb, score.

### Cómo se genera la ruta (ver ADR 0001 para el porqué de este diseño)

**Capa 1 — motor por reglas (`lib/paths/build-path.ts`), siempre corre, sin IA:**
1. Una server action recibe las respuestas del cuestionario y las valida con zod: meta profesional
   (de una lista cerrada), nivel por área, intereses, tecnologías que ya domina, horas por semana y
   **plazo** (ej. "6 meses").
2. La meta mapea a uno o más programas oficiales vía una tabla escrita a mano (`meta → programas`,
   ej. "fullstack" → `react` + `nest`).
3. Toma los pasos `requerido` siempre, `recomendado` por defecto y `opcional` según intereses; quita
   cursos cuyas tecnologías el usuario ya domina; deduplica los cursos que aparecen en más de un
   programa.
4. Compara el total de horas contra el presupuesto (semanas del plazo × horas/semana). Si no cabe,
   recorta primero opcionales y después recomendados, y registra en cada paso **por qué** entró, salió
   o se fusionó (para mostrarlo en la UI: procedencia y descarte, no solo el resultado final).
5. Se guardan el path y los steps, y se redirige a `/paths/[id]`. El usuario ya tiene una ruta completa
   en menos de un segundo, **sin `OPENAI_API_KEY`**.

**Capa 2 — personalización con IA (`lib/ai/generate-path.ts`), opcional, encima de la ruta ya guardada:**
1. Solo corre si hay `OPENAI_API_KEY`. Recibe el perfil, la meta en texto libre y la ruta ya armada por
   la Capa 1 (no el catálogo completo).
2. Llama a `generateText` con un modelo **mini** de OpenAI y `Output.object`. El schema es:
   `{ title, summary, reasons: [{ courseSlug, reason }], programHints: string[] }`, con `courseSlug`
   como **`z.enum`** de los slugs que ya están en la ruta y `programHints` como **`z.enum`** de los 13
   slugs de programa — la Capa 1 decide si los acepta y recalcula. La IA **no** quita ni agrega cursos.
3. Timeout (~15s) o respuesta inválida → se queda la ruta de la Capa 1 con razones por plantilla, sin
   error visible.
4. El resultado se guarda en la misma fila de `learning_paths` (sin tabla de caché aparte): mismo
   perfil no vuelve a llamar al modelo.
5. Para cuidar los $10: límite de N personalizaciones por usuario al día. Con un modelo mini, cada una
   cuesta una fracción de centavo (verificar el precio actual en platform.openai.com).

### Estructura de carpetas

> El código vive en la raíz del repo, no en `src/` (decisión tomada al planificar el flujo SDD, ver
> `docs/SPECS-MAP.md`): `tsconfig.json` y `components.json` ya apuntan ahí (`@/*` → raíz) y no hay
> spec de reestructuración en el mapa.

```
app/
  (marketing)/page.tsx          landing
  login/page.tsx                botón "Entrar con Discord"
  auth/callback/route.ts        exchangeCodeForSession
  (app)/dashboard/page.tsx      mis rutas + XP + insignias
  (app)/quiz/page.tsx           cuestionario multi-step
  (app)/paths/[id]/page.tsx     mapa React Flow / vista lista + progreso
  r/[slug]/page.tsx             ruta pública (solo lectura)
  r/[slug]/opengraph-image.tsx  tarjeta para compartir
components/{ui,quiz,path-map,gamification}/
lib/supabase/{client,server}.ts
lib/ai/{schemas,prompts,generate-path}.ts
lib/paths/build-path.ts
lib/gamification/{xp,achievements}.ts
proxy.ts                        refresco de sesión Supabase (Next 16)
scripts/scrape-courses.ts
data/courses.json               catálogo versionado en el repo
supabase/migrations/*.sql, supabase/seed.sql
CLAUDE.md                       convenciones para que la IA de los 3 escriba igual
```

---

## Prioridades (MoSCoW)
- **MUST (semana 1), los requisitos:**
  - Login con Discord.
  - Cuestionario (incluye plazo, no solo horas/semana).
  - Ruta generada por reglas que cabe en el plazo del usuario, con personalización de IA si hay key.
  - Guardar varias rutas.
  - Marcar progreso.
  - Deploy.
- **SHOULD (semana 2):**
  - Mapa visual con React Flow.
  - Gamificación: XP por curso según horas, niveles, 5 o 6 insignias, racha y confetti.
  - Compartir la ruta con link público y tarjeta OG.
- **COULD (solo si todo lo anterior está sólido):**
  - Re-evaluación adaptativa: al terminar un curso, un mini-quiz de 5 preguntas generado por IA a partir del temario.
    - Puntaje bajo: se sugiere un curso de refuerzo.
    - Puntaje alto: XP extra.
  - Versión mínima alternativa: botón "Recalcular mi ruta" que manda el progreso a la IA.
- **WON'T (fuera del MVP):** panel de administración, chat mentor, notificaciones, i18n.

---

## Roles (3 personas)
- **P1, Backend y datos:**
  - Proyecto Supabase, migraciones, RLS y Discord OAuth.
  - Scraper, enriquecimiento y seed.
  - Deploy en Vercel.
- **P2, reglas y IA:**
  - `build-path.ts` (motor por reglas, incluye el presupuesto de horas): la prioridad del día 2-4.
  - Prompt, schema y límites de uso de la Capa 2 (personalización con IA).
  - Lógica de XP e insignias.
  - Re-evaluación adaptativa.
- **P3, Frontend y UX:**
  - Design system con shadcn, landing y cuestionario.
  - Dashboard, mapa con React Flow y página pública.
  - Guion y grabación del video.

**Ramas** (es criterio de evaluación):
- `main` es producción y `develop` es integración, con preview en Vercel.
- Cada tarea va en `feature/<tarea>`.
- Todo entra por PR a `develop` con al menos una revisión.
- Commits con formato convencional.

---

## Roadmap día a día

### Día 0: reunión de equipo
- Cerrar nombre, alcance (esta lista MoSCoW) y roles.
- Crear repo en GitHub, proyecto Supabase, **app de Discord Developer** (client id/secret en Supabase > Auth > Providers), proyecto en Vercel y API key de OpenAI.
- Wireframes rápidos: landing, cuestionario, ruta y dashboard.

### Semana 1: núcleo funcional
| Día | P1 Backend | P2 IA | P3 Frontend |
|---|---|---|---|
| 1 | Scaffold Next 16 + Supabase SSR + `proxy.ts`; **login Discord de punta a punta; deploy en Vercel** | Scraper → `data/courses.json` (**solo cursos activos; los Legacy se excluyen**) + revisión manual rápida de la lista | shadcn + tema + layout + landing |
| 2 | Migraciones, RLS, trigger de `profiles` | Script de enriquecimiento con IA (`level` + `outcome` de cada curso) → seed | Componentes del cuestionario multi-step |
| 3 | Server actions: guardar assessment, CRUD de rutas | `build-path.ts`: elegir programa(s) por meta, tomar pasos por nivel, deduplicar | Cuestionario completo con validación zod (incluye plazo) |
| 4 | Límite de personalizaciones por usuario | `build-path.ts`: presupuesto de horas (recorte si no cabe) + procedencia/descarte por paso | Pantalla "generando ruta" + vista lista con chips de procedencia |
| 5 | Actualización de status de steps | Capa 2: `generate-path` con `Output.object`, `programHints` y pruebas con 5 perfiles | Dashboard con varias rutas + barra de progreso |
| 6-7 | **Integración + buffer** | | |

**🎯 Hito 1 (fin del día 7), en producción:** Discord → cuestionario → ruta por reglas (con cursos reales, dentro del plazo) → guardada → marcar progreso → crear una segunda ruta. Se hace merge de `develop` a `main`. **Con esto ya cumplimos los requisitos**, sin necesitar `OPENAI_API_KEY`.

### Semana 2: diferenciadores y pulido
| Día | Tarea |
|---|---|
| 8 | Mapa con React Flow + dagre: nodos coloreados por estado, clic en un nodo abre un Sheet con detalle, link a DevTalles y cambio de estado. Toggle entre mapa y lista. |
| 9 | Gamificación: XP por curso (según horas), nivel, insignias ("Primer paso", "3 rutas", "Primer curso", "Racha 7 días"...), toast + confetti. |
| 10 | Compartir: `is_public` + `share_slug`, página `/r/[slug]` y `opengraph-image`. |
| 11 | *(COULD)* Re-evaluación adaptativa, versión mínima. Solo si el Hito 1 está estable. |
| 12 | **FEATURE FREEZE.** QA completo: responsive, estados vacíos, loading y error, clonar desde cero siguiendo el README. |
| 13 | README (setup Supabase + Discord + env + seed), `LICENSE` MIT, `.env.example`, capturas. Grabar el video. |
| 14 | Buffer y entrega: repo público, link del deploy, video al Discord del equipo. |

**Guion del video (90 s)** — con el perfil combinado (ADR 0001), no "quiero React" a secas, porque en
ese caso la ruta generada es indistinguible de la oficial:
- 0-10 s: el problema.
- 10-35 s: login con Discord y cuestionario (meta fullstack, plazo, horas/semana).
- 35-65 s: la ruta en el mapa fusionando programas, el presupuesto de horas recortando un opcional
  para que quepa en el plazo, marcar un curso, XP e insignia.
- 65-90 s: compartir la ruta y cierre con el "valor único": procedencia oficial + plan que cabe en tu
  tiempo.

---

## Riesgos y cómo mitigarlos
- **La IA inventa cursos:** `z.enum` de slugs de la ruta ya armada por el motor de reglas + validación.
- **Se acaban los $10:** modelo mini, ruta ya filtrada (no el catálogo completo), límite diario por usuario y enriquecimiento offline hecho una sola vez.
- **El evaluador clona sin keys:** el motor por reglas es el plan A, no un respaldo — la app funciona entera sin OpenAI. El catálogo va en `data/courses.json` + seed, y el README explica paso a paso.
- **Los créditos de OpenAI vencen o se agotan antes de la evaluación:** verificar fecha de expiración en platform.openai.com (pendiente, ver `ANALISIS-IA.md` §11) y fijar un límite de gasto duro en el dashboard.
- **Redirect de Discord en producción o preview:** agregar los dominios de Vercel en Supabase > Auth > URL Configuration.
- **La ruta generada se parece demasiado a la oficial:** medido en el ADR 0001 — para un perfil sin tecnologías previas, coincide con la página oficial. Mitigado con el presupuesto de horas y la procedencia/descarte visibles; si igual ocurre, priorizar en el video un perfil que combine programas.
- **Se agranda el alcance:** freeze el día 12; la re-evaluación adaptativa es lo primero que se recorta.

## Referencias para inspirarse
- roadmap.sh: mapa visual.
- Duolingo: rachas y XP.
- Codecademy Career Paths y Platzi: rutas por meta profesional.
- Los "programas" de DevTalles: agrupación oficial de cursos.

---

## Verificación (definición de "listo")
- **Hito 1:** en la URL de producción, un usuario nuevo entra con Discord, completa el cuestionario, recibe una ruta cuyos cursos existen todos en `courses` y abren la URL correcta de DevTalles, marca un curso como hecho y ve el % actualizado. Además crea una segunda ruta y ambas aparecen en el dashboard.
- **Funciona sin key:** quitar `OPENAI_API_KEY` y verificar que igual se genera una ruta coherente, con presupuesto de horas y razones por plantilla (no es un "plan B" — es el comportamiento normal del motor).
- **RLS:** con otro usuario, no se pueden leer rutas ajenas privadas; `/r/[slug]` solo funciona si `is_public`.
- **Antes de entregar:** clonar el repo en una carpeta limpia, seguir solo el README y levantar la app sin ayuda.
