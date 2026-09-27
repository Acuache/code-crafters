// Intereses (ADR 0003) y tecnologías dominables (SPEC 04). Sus cursos viven en interest_courses.

import type { InterestSlug, TechnologySlug } from "./types";

export type InterestDefinition = {
  label: string;
};

// 12 intereses.
export const INTERESTS: Record<InterestSlug, InterestDefinition> = {
  docker: { label: "Docker" },
  "solid-clean-code": { label: "SOLID y Clean Code" },
  "patrones-diseno": { label: "Patrones de diseño" },
  "control-versiones": { label: "Control de versiones" },
  "bases-de-datos-sql": { label: "Bases de datos SQL" },
  testing: { label: "Testing" },
  "tiempo-real": { label: "Tiempo real / sockets" },
  "ia-aplicada": { label: "IA aplicada" },
  microservicios: { label: "Microservicios" },
  "sitios-de-contenido": { label: "Sitios de contenido" },
  "agentes-vibe-coding": { label: "Agentes y vibe coding" },
  estilos: { label: "Estilos" },
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

// Curso "de entrada" de cada tecnología: dominarlo incluye lo que ese curso necesita (spec 17).
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
