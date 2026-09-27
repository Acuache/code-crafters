// Chequeos puros del panel (SPEC 10) contra las referencias del motor.

import { GOALS } from "@/lib/paths/goals";
import { INTERESTS, TECHNOLOGIES, TECH_TO_SLUGS } from "@/lib/paths/interests";

export type EngineReference =
  | { kind: "interest"; interestSlug: string; label: string }
  | { kind: "technology"; technology: string; label: string };

// `interestSlugs`: los intereses que lo sugieren, leídos de interest_courses.
export function findEngineReferences(
  courseSlug: string,
  interestSlugs: string[],
): EngineReference[] {
  const references: EngineReference[] = [];

  for (const interestSlug of interestSlugs) {
    const label = INTERESTS[interestSlug]?.label ?? interestSlug;
    references.push({ kind: "interest", interestSlug, label });
  }

  for (const [technology, technologyCourseSlug] of Object.entries(TECH_TO_SLUGS)) {
    if (technologyCourseSlug === courseSlug) {
      const label = TECHNOLOGIES[technology]?.label ?? technology;
      references.push({ kind: "technology", technology, label });
    }
  }

  return references;
}

// `fundamentos` no está en ninguna meta porque es la base de quien empieza de cero.
export function isProgramReachable(programSlug: string): boolean {
  if (programSlug === "fundamentos") {
    return true;
  }
  return Object.values(GOALS).some((goal) => goal.programSlugs.includes(programSlug));
}
