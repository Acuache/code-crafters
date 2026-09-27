// Tabla `meta → programas` (SPEC 04). Tabla a mano, no una tabla de Supabase (ver ADR 0003):
// se revisa a mano sin abrir el motor.

import type { Area, GoalSlug } from "./types";

export const AREAS: Area[] = ["frontend", "backend", "fullstack", "movil", "ia"];

export type GoalDefinition = {
  label: string;
  area: Area;
  programSlugs: string[]; // uno de los 15 valores de `programs.slug` (spec 02) por entrada
  // Cursos de esos programas que no encajan con la meta (spec 17): nunca entran por el programa.
  excludedCourseSlugs?: string[];
};

// 19 metas. `fundamentos` y `dart-web` quedan fuera a propósito (ver Decisiones del spec 04):
// `fundamentos` es la base del principiante (spec 17), nunca se elige; `dart-web` es degenerado, su único
// curso ya está en `dart-movil`.
export const GOALS: Record<GoalSlug, GoalDefinition> = {
  react: { label: "React", area: "frontend", programSlugs: ["react"] },
  vue: { label: "Vue", area: "frontend", programSlugs: ["vue"] },
  angular: { label: "Angular", area: "frontend", programSlugs: ["angular"] },
  node: { label: "Node", area: "backend", programSlugs: ["node"] },
  nest: { label: "NestJS", area: "backend", programSlugs: ["nest"] },
  java: { label: "Java", area: "backend", programSlugs: ["java"] },
  csharp: { label: "C# / .NET", area: "backend", programSlugs: ["csharp"] },
  python: { label: "Python", area: "backend", programSlugs: ["python"] },
  php: { label: "PHP", area: "backend", programSlugs: ["php"] },
  go: { label: "Go", area: "backend", programSlugs: ["go"] },
  "react-nest": { label: "React + Nest", area: "fullstack", programSlugs: ["react", "nest"] },
  "vue-node": { label: "Vue + Node", area: "fullstack", programSlugs: ["vue", "node"] },
  "angular-nest": { label: "Angular + Nest", area: "fullstack", programSlugs: ["angular", "nest"] },
  "java-angular": { label: "Java + Angular", area: "fullstack", programSlugs: ["java", "angular"] },
  "dart-movil": { label: "Flutter / Dart", area: "movil", programSlugs: ["dart-movil"] },
  "react-native": { label: "React Native", area: "movil", programSlugs: ["react-native"] },
  ia: { label: "IA / Automatizaciones", area: "ia", programSlugs: ["ia"] },
  "ia-node": { label: "IA con Node", area: "ia", programSlugs: ["ia", "node"] },
  // El programa IA trae un stack JavaScript (Node, Nest, frontends) que choca con Python.
  "ia-python": {
    label: "IA con Python",
    area: "ia",
    programSlugs: ["ia", "python"],
    excludedCourseSlugs: [
      "nodejs-de-cero-a-experto",
      "nest",
      "ia-para-developers",
      "angular-moderno",
      "react-de-cero",
      "vue-cero-a-experto",
    ],
  },
};
