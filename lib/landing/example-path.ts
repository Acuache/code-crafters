// La ruta de ejemplo que cuentan los mockups de la landing. Fija a propósito: la landing no lee la
// base. Los títulos y las horas son los de data/courses.json (lo comprueba example-path.test.ts), y
// las razones usan las mismas plantillas que lib/paths/build-path.ts.

import type { StepOrigin } from "@/lib/paths/types";

export type ExampleCourse = {
  slug: string;
  title: string;
  hours: number;
  origin: StepOrigin;
  engineReason: string;
};

export type ExampleDiscardedCourse = {
  slug: string;
  title: string;
  hours: number;
  discardReason: string;
};

export const EXAMPLE_ANSWERS: readonly string[] = [
  "Meta: React",
  "Nivel: tengo bases",
  "Ya domino: JavaScript",
  "Interés: Docker",
  "6 h por semana",
  "Plazo: 6 meses",
];

export const EXAMPLE_FREE_TEXT =
  "Quiero conseguir mi primer trabajo como frontend y ya sé algo de JavaScript.";

export const EXAMPLE_COURSES: readonly ExampleCourse[] = [
  {
    slug: "react-de-cero",
    title: "React: de cero a experto",
    hours: 46,
    origin: "requerido",
    engineReason: "Requerido para llegar a React en 6 meses.",
  },
  {
    slug: "typescript-guia-completa",
    title: "TypeScript: Tu completa guía y manual de mano.",
    hours: 8.5,
    origin: "recomendado",
    engineReason: "Recomendado para llegar a React en 6 meses.",
  },
  {
    slug: "docker-guia-practica",
    title: "Docker - Guía práctica de uso para desarrolladores",
    hours: 14,
    origin: "interes",
    engineReason: "Sumado por tu interés en Docker.",
  },
];

export const EXAMPLE_DISCARDED: readonly ExampleDiscardedCourse[] = [
  {
    slug: "javascript-moderno",
    title: "JavaScript Moderno: Guía para dominar el lenguaje",
    hours: 28.5,
    discardReason: "ya lo dominas",
  },
];

// Retoma el texto libre, como exige el spec 11: el valor de la IA tiene que verse en lo que escribió.
export const EXAMPLE_AI = {
  title: "Tu camino a tu primer empleo frontend con React",
  firstCourseReason:
    "Es la base que piden las ofertas junior de frontend: con él armas tus primeros proyectos de portafolio.",
};
