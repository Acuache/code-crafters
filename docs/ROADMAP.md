# Roadmap MVP: Code Quest, generador de rutas de aprendizaje (DevTalles)

## Contexto
- Es un concurso de DevTalles con 18 equipos. Tenemos **2 semanas**, somos **3 personas** y trabajaremos con apoyo de IA (Claude Code y similares).
- Requisitos obligatorios (`docs/ENUNCIADO.md`):
  1. Cuestionario de habilidades e intereses.
  2. Rutas dinámicas armadas **con cursos reales de DevTalles**.
  3. Guardar varias rutas y marcar el progreso.
  4. Login y registro, como mínimo con **Discord**.
  5. Tecnologías que se enseñen en DevTalles.
- Qué hay que entregar: repo público, README, licencia MIT, deploy, video de 1 a 1:30 min y uso de ramas. **Si la solución está a medias o no funciona, la descartan**, así que primero va lo funcional y después lo vistoso.
- Decisiones ya tomadas:
  - **La IA arma la ruta** con la API de OpenAI (tenemos $10 de crédito).
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
  - Cada página `/courses/[slug]` trae descripción, horas, cantidad de lecciones, módulos y requisitos, pero **no trae nivel ni tags**, así que los generamos con IA una sola vez.
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
- `courses`: slug, title, description, url, image_url, hours, lessons, category, level (beginner/intermediate/advanced), tags text[], prerequisites text[] (slugs). Solo cursos activos: los Legacy no se cargan.
- `profiles`: id (= auth.users.id), username, avatar_url, xp, level, streak, last_activity_at. Se crea con un trigger al registrarse, usando los datos de Discord.
- `assessments`: user_id, answers jsonb, created_at.
- `learning_paths`: user_id, assessment_id, title, goal, summary, is_public, share_slug, created_at.
- `path_steps`: path_id, course_id, stage, position, reason (por qué la IA eligió ese curso), depends_on, status (pending/in_progress/done), completed_at.
- `achievements` y `user_achievements`: insignias.
- (Stretch) `checkpoints`: step_id, questions jsonb, score.

### Cómo se genera la ruta con IA (`lib/ai/generate-path.ts`)
1. Una server action recibe las respuestas del cuestionario y las valida con zod:
   - meta profesional
   - nivel por área
   - intereses
   - horas por semana
   - stack preferido
2. Trae de la base un catálogo compacto: slug, título, nivel, tags, horas y prerrequisitos.
3. Llama a `generateText` con un modelo **mini** de OpenAI y `Output.object`. El schema es:
   `{ title, summary, estimatedWeeks, stages: [{ name, goal, steps: [{ courseSlug, reason, dependsOn[] }] }] }`.
   `courseSlug` va como **`z.enum(slugsDelCatalogo)`** para que la IA no invente cursos.
4. Validación posterior: se descartan los slugs inválidos y se reordena respetando los prerrequisitos.
5. **Plan B por reglas** (`lib/paths/fallback.ts`): si la IA falla o no hay `OPENAI_API_KEY`, la ruta se arma por match de tags y nivel más orden topológico. Así la app **funciona aunque el evaluador la clone sin key**.
6. Se guardan el path y los steps, y se redirige a `/paths/[id]`.
7. Para cuidar los $10: límite de N generaciones por usuario al día y catálogo compacto. Con un modelo mini, cada ruta cuesta una fracción de centavo (verificar el precio actual en platform.openai.com).

### Estructura de carpetas
```
src/app/
  (marketing)/page.tsx          landing
  login/page.tsx                botón "Entrar con Discord"
  auth/callback/route.ts        exchangeCodeForSession
  (app)/dashboard/page.tsx      mis rutas + XP + insignias
  (app)/quiz/page.tsx           cuestionario multi-step
  (app)/paths/[id]/page.tsx     mapa React Flow / vista lista + progreso
  r/[slug]/page.tsx             ruta pública (solo lectura)
  r/[slug]/opengraph-image.tsx  tarjeta para compartir
src/components/{ui,quiz,path-map,gamification}/
src/lib/supabase/{client,server}.ts
src/lib/ai/{schemas,prompts,generate-path}.ts
src/lib/paths/fallback.ts
src/lib/gamification/{xp,achievements}.ts
src/proxy.ts                    refresco de sesión Supabase (Next 16)
scripts/{scrape-courses,enrich-courses}.ts
data/courses.json               catálogo versionado en el repo
supabase/migrations/*.sql, supabase/seed.sql
CLAUDE.md                       convenciones para que la IA de los 3 escriba igual
```

---

## Prioridades (MoSCoW)
- **MUST (semana 1), los requisitos:**
  - Login con Discord.
  - Cuestionario.
  - Ruta generada por IA con plan B.
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
- **P2, IA y lógica:**
  - Prompt, schema, plan B por reglas y límites de uso.
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
| 2 | Migraciones, RLS, trigger de `profiles` | Script de enriquecimiento con IA (nivel, tags, prerrequisitos) → seed | Componentes del cuestionario multi-step |
| 3 | Server actions: guardar assessment, CRUD de rutas | `generate-path` con `Output.object` + enum de slugs | Cuestionario completo con validación zod |
| 4 | Límite de generaciones por usuario | Plan B por reglas + validación posterior de orden | Pantalla "generando ruta" + vista lista de la ruta |
| 5 | Actualización de status de steps | Pruebas de prompt con 5 perfiles distintos | Dashboard con varias rutas + barra de progreso |
| 6-7 | **Integración + buffer** | | |

**🎯 Hito 1 (fin del día 7), en producción:** Discord → cuestionario → ruta de IA con cursos reales → guardada → marcar progreso → crear una segunda ruta. Se hace merge de `develop` a `main`. **Con esto ya cumplimos los requisitos.**

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

**Guion del video (90 s):**
- 0-10 s: el problema.
- 10-35 s: login con Discord y cuestionario.
- 35-65 s: la ruta de la IA en el mapa, marcar un curso, XP e insignia.
- 65-90 s: compartir la ruta y cierre con el "valor único".

---

## Riesgos y cómo mitigarlos
- **La IA inventa cursos:** `z.enum` de slugs + validación + plan B por reglas.
- **Se acaban los $10:** modelo mini, catálogo compacto, límite diario por usuario y enriquecimiento hecho una sola vez.
- **El evaluador clona sin keys:** el plan B funciona sin OpenAI, el catálogo va en `data/courses.json` + seed, y el README explica paso a paso.
- **Redirect de Discord en producción o preview:** agregar los dominios de Vercel en Supabase > Auth > URL Configuration.
- **Se agranda el alcance:** freeze el día 12; la re-evaluación adaptativa es lo primero que se recorta.

## Referencias para inspirarse
- roadmap.sh: mapa visual.
- Duolingo: rachas y XP.
- Codecademy Career Paths y Platzi: rutas por meta profesional.
- Los "programas" de DevTalles: agrupación oficial de cursos.

---

## Verificación (definición de "listo")
- **Hito 1:** en la URL de producción, un usuario nuevo entra con Discord, completa el cuestionario, recibe una ruta cuyos cursos existen todos en `courses` y abren la URL correcta de DevTalles, marca un curso como hecho y ve el % actualizado. Además crea una segunda ruta y ambas aparecen en el dashboard.
- **Plan B:** quitar `OPENAI_API_KEY` y verificar que igual se genera una ruta coherente.
- **RLS:** con otro usuario, no se pueden leer rutas ajenas privadas; `/r/[slug]` solo funciona si `is_public`.
- **Antes de entregar:** clonar el repo en una carpeta limpia, seguir solo el README y levantar la app sin ayuda.
