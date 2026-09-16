# Catálogo DevTalles (sin Legacy)

Extraído el 2026-09-15 desde https://cursos.devtalles.com con `scrape-devtalles.mjs`.

- Cursos activos: **74** (69 del listado principal + 5 enlazados desde la home o las rutas)
- Legacy excluidos: 3 · Tarjetas en el listado principal: 72
- Gratis: 6 · Exclusivos PRO: 10 · Nuevos: 6 · En construcción: 4
- Rutas oficiales: 15 en 13 programas

## courses.json

| Campo | Qué es |
|---|---|
| `slug`, `title`, `url`, `image_url` | Identidad del curso y link a DevTalles |
| `summary` | Descripción corta (1–2 frases) |
| `instructor`, `hours`, `lessons` | Datos del curso |
| `price` | USD; `0` si es gratis, `null` si solo se accede con PRO |
| `is_free`, `is_pro`, `is_new`, `in_construction` | Etiquetas para la UI y para filtrar recomendaciones |
| `areas` | Áreas que DevTalles le asigna en sus rutas (`bases`, `frontend`, `backend`…); vacío si no aparece en ninguna |
| `prerequisites` | Requisitos previos, tal como los escribe DevTalles |
| `topics` | Temas y proyectos del curso |
| `outcomes` | Qué logra el estudiante al terminar |
| `chapters` | Títulos de capítulos (sin "Sección N:", introducción/cierre ni capítulos archivados) |
| `related` | Slugs de "Cursos que podrían interesarte" |

## programs.json

Rutas que publica DevTalles. Cada paso tiene `stage` (orden de arriba hacia abajo; varios pasos pueden compartir etapa), `level` (`requerido` / `recomendado` / `opcional`), `note` (texto de la celda, por ejemplo "EN CUALQUIER MOMENTO") y `courses` (slugs; más de uno = cursos alternativos o complementarios del mismo paso).

## Cursos

| # | Curso | slug | Horas | Lecciones | Precio | Etiquetas |
|---|---|---|---:|---:|---:|---|
| 1 | GIT+GitHub: Control de versiones desde Cero | `git-github-control-versiones-desde-cero` | 11.5 | 132 | $60 | Nuevo |
| 2 | Golang: Backend Profesional | `golang-backend-profesional` | 25.5 | 257 | $60 | Nuevo |
| 3 | Laravel 13: AI, REST, JWT, Repository Pattern | `laravel-ai` | 13.5 | 160 | $60 | Nuevo |
| 4 | Spring AI: LLMs, Tools, RAG, Agentes y Deploy en AWS | `spring-AI` | 18.5 | 156 | $60 | Nuevo |
| 5 | OpenCode: Guía completa para desarrolladores de software | `open-code-guia-completa` | 14 | 153 | $60 | Nuevo |
| 6 | Claude Code: Guía completa para desarrolladores de software | `claude-code-guia-completa` | 17.5 | 187 | $60 | Nuevo |
| 7 | IA para Developers: Claude API, RAG y Agentes con Node | `ia-para-developers` | 8 | 114 | $60 |  |
| 8 | Python: Inteligencia artificial aplicada | `python-ia-aplicada` | 18.5 | 172 | $60 |  |
| 9 | Spring Boot 4: Patrones de arquitectura | `spring-boot-patrones-arquitectura` | 20.5 | 180 | $60 |  |
| 10 | Ingeniería de prompts: Para la vida real | `Ingeniería-de-prompts` | 2.5 | 42 | $9 |  |
| 11 | Vibe Coding: De forma responsable | `vibe-coding` | 4.5 | 63 | $60 |  |
| 12 | GoLang: Fundamentos del lenguaje | `golang-fundamentos-lenguaje` | 23 | 221 | $60 |  |
| 13 | PHP moderno: Empieza tu camino en el lenguaje | `PHP-moderno` | 10 | 131 | $60 |  |
| 14 | Spring Boot 4: Arquitectura de Microservicios | `spring-boot-microservicios` | 21 | 185 | $60 |  |
| 15 | Angular + Sockets: Aplicaciones en tiempo real con Bun | `Angular_socket_bun` | 14.5 | 148 | $60 |  |
| 16 | React+Sockets: Aplicaciones en tiempo real con Bun | `react-sockets` | 15 | 153 | $60 |  |
| 17 | TailwindCSS: Para desarrolladores de software | `tailwindcss-para-desarrolladores` | 4 | 51 | — | PRO |
| 18 | Python + n8n: Automatiza rutinas cotidianas | `python-n8n-automatiza-rutinas` | 9 | 90 | — | PRO |
| 19 | Spring Boot: De MVC a Hexagonal | `springboot-mvc-hexagonal` | 8.5 | 75 | — | PRO |
| 20 | .NET: Pruebas completas para minimal API | `net-pruebascompletas` | 6 | 98 | — | PRO |
| 21 | Nuxt: El marco de trabajo web progresivo (Nuxt 4+) | `nuxt` | 13.5 | 151 | $60 |  |
| 22 | Blazor: Desde cero con arquitectura limpia | `netfullstack` | 14 | 183 | $60 |  |
| 23 | FastAPI: Crea APIs eficientes con Python | `fastapi` | 36 | 336 | $60 |  |
| 24 | Java: Spring Boot - Guía definitiva | `spring-boot` | 35.5 | 314 | $60 |  |
| 25 | n8n + MCP: Automatización y agentes de IA inteligentes | `n8n-mcp` | 17.5 | 230 | $60 |  |
| 26 | React: de cero a experto | `react-de-cero` | 46 | 452 | $60 |  |
| 27 | Expo + Gemini: Aplicaciones con inteligencia artificial | `expo-gemini` | 7 | 95 | $60 |  |
| 28 | Java avanzado: reactividad, concurrencia y patrones | `java-avanzado` | 25 | 209 | $60 |  |
| 29 | .NET Backend: .NET Core, SQL Server y seguridad JWT | `NET-Backend` | 11 | 159 | $60 |  |
| 30 | Django: Crea aplicaciones web robustas con Python | `django` | 44 | 418 | $60 |  |
| 31 | Flutter + Gemini: Aplicaciones con inteligencia artificial | `Flutter-Gemini` | 8.5 | 105 | $60 |  |
| 32 | React Router: Navegación declarativa y framework | `react-router` | 7.5 | 87 | Gratis | Gratis |
| 33 | Python: Fundamentos hasta los detalles | `python` | 15.5 | 184 | $60 |  |
| 34 | C#: Empieza tu camino en el lenguaje | `csharp` | 11.5 | 120 | $60 |  |
| 35 | Java: Explora el lenguaje desde cero | `Java` | 15 | 145 | $60 |  |
| 36 | NestJS + Testing: Pruebas unitarias y end to end (e2e) | `NestJS-Testing` | 12.5 | 123 | $60 |  |
| 37 | Angular: De cero a experto | `angular-moderno` | 33.5 | 347 | $60 |  |
| 38 | Patrones de Diseño: Soluciones prácticas y eficientes | `patrones-diseno` | 10 | 116 | $60 |  |
| 39 | React Native Expo: Aplicaciones nativas para IOS y Android | `react-native-expo` | 25.5 | 271 | $60 |  |
| 40 | Angular Pro: Lleva tus bases al siguiente nivel | `angular-pro` | 21.5 | 220 | $60 |  |
| 41 | Astro: El framework para sitios web orientados al contenido | `Astro` | 25.5 | 263 | $60 |  |
| 42 | NestJs + Reportes: Genera PDFs desde Node | `nestjs-reportes` | 6.5 | 83 | $60 |  |
| 43 | Shadcn/ui: Componentes accesibles y personalizables | `shadcn-ui` | 6 | 74 | Gratis | Gratis |
| 44 | Vue.js - de Cero a Experto: Composition Api | `vue-cero-a-experto` | 37.5 | 340 | $60 |  |
| 45 | NestJS + Microservicios: Aplicaciones escalables y modulares | `nestjs-microservicios` | 21 | 199 | $60 |  |
| 46 | OpenAI: Ejercicios y asistentes con Angular + NestJS | `openai-angular-nestjs` | 11 | 154 | $60 |  |
| 47 | OpenAI: Ejercicios prácticos y asistentes con React + NestJS | `openai` | 10 | 148 | $60 |  |
| 48 | Zustand: Gestor de estado para React | `zustand-gestor-de-estado-para-react` | 6 | 78 | $9 |  |
| 49 | Node - Autenticación Rest con Clean Architecture | `node-clean-architecture` | 4 | 44 | — | PRO |
| 50 | Flutter BLoC | `flutter-bloc` | 3.5 | 34 | — | PRO |
| 51 | Node.Js: De cero a experto | `nodejs-de-cero-a-experto` | 37.5 | 390 | $60 |  |
| 52 | Riverpod providers con anotaciones | `riverpod-con-anotaciones` | 2 | 22 | Gratis | Gratis |
| 53 | SQL de cero: Tu guía práctica con PostgreSQL | `sql-con-postgres` | 16 | 184 | $60 |  |
| 54 | Next.js: El framework de React para producción | `nextjs` | 39 | 423 | $60 |  |
| 55 | Qwik: Introducción al Framework | `qwik-introduccion` | 8 | 96 | Gratis | Gratis |
| 56 | Flutter Móvil: Recursos Nativos - Nivel Intermedio | `flutter-movil-intermedio` | 16 | 180 | $60 |  |
| 57 | Flutter - Móvil: De cero a experto | `flutter-movil-cero-a-experto` | 50 | 463 | $60 |  |
| 58 | Angular clásico: con Módulos | `angular` | 45.5 | 454 | $60 |  |
| 59 | Docker - Guía práctica de uso para desarrolladores | `docker-guia-practica` | 14 | 134 | $60 |  |
| 60 | Nest + GraphQL: Evoluciona tus APIs. | `nest-graphql` | 18 | 164 | $60 |  |
| 61 | Programación para principiantes - Primeros pasos | `programacion-para-principiantes` | 8 | 99 | $60 |  |
| 62 | Nest: Desarrollo backend escalable con Node | `nest` | 24.5 | 228 | $60 |  |
| 63 | TanStack Query: Un poderoso gestor de estado asíncrono | `tanstack-query` | 6 | 83 | Gratis | Gratis |
| 64 | Visual Studio Code: Mejora tu velocidad para codificar | `visual-studio-code` | 2 | 51 | Gratis | Gratis |
| 65 | Dart: De cero hasta los detalles | `dart-cero-hasta-detalles` | 10 | 128 | $60 |  |
| 66 | JavaScript Moderno: Guía para dominar el lenguaje | `javascript-moderno` | 28.5 | 229 | $60 |  |
| 67 | TypeScript: Tu completa guía y manual de mano. | `typescript-guia-completa` | 8.5 | 115 | $60 |  |
| 68 | React PRO: Lleva tus bases al siguiente nivel | `react-pro` | 24.5 | 226 | $60 |  |
| 69 | Principios SOLID y Clean Code | `solid-clean-code` | 6.5 | 70 | $60 |  |
| 70 | Codex: agentes, skills, MCP y Spec-Driven Development | `codex` | 3.5 | 41 | — | PRO, En construcción |
| 71 | Go: aplicado a microservicios | `go-microservicios` | 2.5 | 30 | $90 | PRO, En construcción |
| 72 | Kafka y SpringBoot: Arquitectura Event-Driven | `kafka-springboot-event-driven` | 8 | 65 | $90 | PRO, En construcción |
| 73 | Patrones de diseño agéntico: Respuestas efectivas a desafíos | `patrones-diseno-agentico` | 7 | 88 | $90 | PRO, En construcción |
| 74 | Vue.js - Intermedio: Lleva tus bases al siguiente nivel | `Vue-intermedio` | 13.5 | 141 | $60 |  |

## Fuera del listado principal (incluidos)

- Codex: agentes, skills, MCP y Spec-Driven Development (`codex`)
- Go: aplicado a microservicios (`go-microservicios`)
- Kafka y SpringBoot: Arquitectura Event-Driven (`kafka-springboot-event-driven`)
- Patrones de diseño agéntico: Respuestas efectivas a desafíos (`patrones-diseno-agentico`)
- Vue.js - Intermedio: Lleva tus bases al siguiente nivel (`Vue-intermedio`)

## Legacy excluidos

- Legacy - Vue.js Tradicional: Options API (`vue-js`)
- Legacy - Flutter Web: Aplicaciones y páginas web profesionales (`flutter-web`)
- Legacy - GIT+GitHub: Todo un sistema de control de versiones de cero (`git-github-control-versiones`)
