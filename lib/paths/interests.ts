// Intereses transversales (ADR 0003) y tecnologías dominables (SPEC 04). Tablas a mano, no de
// Supabase: se revisan a mano sin abrir el motor.

import type { InterestSlug, TechnologySlug } from "./types";

export type InterestDefinition = {
  label: string;
  // Alternativas en orden de prioridad — el motor elige la primera libre (ver Decisiones del spec).
  // Las horas de cada curso se leen del `catalog` recibido por `buildPath()`, no se duplican acá.
  courseSlugs: string[];
};

// 12 intereses, 20 slugs de curso (verificados contra `data/courses.json` para este spec).
export const INTERESTS: Record<InterestSlug, InterestDefinition> = {
  docker: { label: "Docker", courseSlugs: ["docker-guia-practica"] },
  "solid-clean-code": { label: "SOLID y Clean Code", courseSlugs: ["solid-clean-code"] },
  "patrones-diseno": { label: "Patrones de diseño", courseSlugs: ["patrones-diseno"] },
  "control-versiones": {
    label: "Control de versiones",
    courseSlugs: ["git-github-control-versiones-desde-cero"],
  },
  "bases-de-datos-sql": { label: "Bases de datos SQL", courseSlugs: ["sql-con-postgres"] },
  testing: { label: "Testing", courseSlugs: ["NestJS-Testing", "net-pruebascompletas"] },
  "tiempo-real": {
    label: "Tiempo real / sockets",
    courseSlugs: ["react-sockets", "Angular_socket_bun"],
  },
  "ia-aplicada": {
    label: "IA aplicada",
    courseSlugs: ["openai", "ia-para-developers", "python-ia-aplicada"],
  },
  microservicios: {
    label: "Microservicios",
    courseSlugs: ["nestjs-microservicios", "spring-boot-microservicios", "go-microservicios"],
  },
  "sitios-de-contenido": {
    label: "Sitios de contenido",
    courseSlugs: ["Astro", "qwik-introduccion"],
  },
  "agentes-vibe-coding": {
    label: "Agentes y vibe coding",
    courseSlugs: ["claude-code-guia-completa", "codex"],
  },
  estilos: { label: "Estilos", courseSlugs: ["tailwindcss-para-desarrolladores"] },
};

export type TechnologyDefinition = {
  label: string;
};

// 15 tecnologías dominables — una por tecnología-puerta de cada programa (ver Decisiones del spec:
// reemplaza a las "11 tecnologías" sin lista escrita de los ADRs 0001/0003).
export const TECHNOLOGIES: Record<TechnologySlug, TechnologyDefinition> = {
  javascript: { label: "JavaScript" },
  typescript: { label: "TypeScript" },
  git: { label: "Git" },
  sql: { label: "SQL" },
  docker: { label: "Docker" },
  react: { label: "React" },
  angular: { label: "Angular" },
  vue: { label: "Vue" },
  node: { label: "Node" },
  python: { label: "Python" },
  java: { label: "Java" },
  csharp: { label: "C#" },
  dart: { label: "Dart" },
  go: { label: "Go" },
  php: { label: "PHP" },
};

// Curso "de entrada" de cada tecnología — lo que `dropMasteredTechnologies`/`applyInterests`
// usan para reconocer un curso ya dominado (ver los seis pasos del motor en el spec).
export const TECH_TO_SLUGS: Record<TechnologySlug, string> = {
  javascript: "javascript-moderno",
  typescript: "typescript-guia-completa",
  git: "git-github-control-versiones-desde-cero",
  sql: "sql-con-postgres",
  docker: "docker-guia-practica",
  react: "react-de-cero",
  angular: "angular-moderno",
  vue: "vue-cero-a-experto",
  node: "nodejs-de-cero-a-experto",
  python: "python",
  java: "Java",
  csharp: "csharp",
  dart: "dart-cero-hasta-detalles",
  go: "golang-fundamentos-lenguaje",
  php: "PHP-moderno",
};
