// Un requisito nuevo no puede cerrar un ciclo: el motor no podría ordenar esos cursos (spec 17).

export type PrerequisiteEdge = {
  courseId: number;
  prerequisiteCourseId: number;
};

// Cuentan los dos tipos de requisito: "conviene antes" también ordena.
export function wouldCreateCycle(edges: PrerequisiteEdge[], newEdge: PrerequisiteEdge): boolean {
  if (newEdge.courseId === newEdge.prerequisiteCourseId) {
    return true;
  }

  const prerequisitesByCourse = new Map<number, number[]>();
  for (const edge of edges) {
    const prerequisites = prerequisitesByCourse.get(edge.courseId) ?? [];
    prerequisites.push(edge.prerequisiteCourseId);
    prerequisitesByCourse.set(edge.courseId, prerequisites);
  }

  const visited = new Set<number>();
  const pending = [newEdge.prerequisiteCourseId];

  while (pending.length > 0) {
    const courseId = pending.pop();
    if (courseId === undefined || visited.has(courseId)) {
      continue;
    }
    if (courseId === newEdge.courseId) {
      return true;
    }
    visited.add(courseId);
    pending.push(...(prerequisitesByCourse.get(courseId) ?? []));
  }

  return false;
}
