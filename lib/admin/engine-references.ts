// Chequeos puros del panel de administración (SPEC 10) contra las tablas a mano del motor
// (spec 04). Solo lee GOALS, INTERESTS, TECHNOLOGIES y TECH_TO_SLUGS; no los modifica.

import { GOALS } from "@/lib/paths/goals";
import { INTERESTS, TECHNOLOGIES, TECH_TO_SLUGS } from "@/lib/paths/interests";

export type EngineReference =
  | { kind: "interest"; interestSlug: string; label: string }
  | { kind: "technology"; technology: string; label: string };

// Dónde el motor apunta a este curso por su slug fijo. Si la lista no está vacía, desactivar el
// curso haría que el motor proponga un slug que loadCatalog (spec 07) ya no carga.
export function findEngineReferences(courseSlug: string): EngineReference[] {
  const references: EngineReference[] = [];

  for (const [interestSlug, interest] of Object.entries(INTERESTS)) {
    if (interest.courseSlugs.includes(courseSlug)) {
      references.push({ kind: "interest", interestSlug, label: interest.label });
    }
  }

  for (const [technology, technologyCourseSlug] of Object.entries(TECH_TO_SLUGS)) {
    if (technologyCourseSlug === courseSlug) {
      const label = TECHNOLOGIES[technology]?.label ?? technology;
      references.push({ kind: "technology", technology, label });
    }
  }

  return references;
}

// `fundamentos` no está en ninguna meta porque el motor lo antepone solo a quien empieza de cero.
export function isProgramReachable(programSlug: string): boolean {
  if (programSlug === "fundamentos") {
    return true;
  }
  return Object.values(GOALS).some((goal) => goal.programSlugs.includes(programSlug));
}
