import { describe, expect, it } from "vitest";

import { buildEngineRules, groupProgramCourseRows, type ProgramCourseRow } from "./catalog";

// Dos pasos en el mismo `stage` (2) con distinto `level` — el caso que obliga a ordenar por
// LEVEL_RANK y no sólo por `stage` — más un paso con dos alternativas (`react-de-cero`/`react-pro`)
// para ejercitar el orden por `position` dentro de un mismo grupo.
const rows: ProgramCourseRow[] = [
  {
    programSlug: "react",
    programName: "React",
    stage: 1,
    level: "requerido",
    position: 1,
    note: null,
    courseSlug: "javascript-moderno",
  },
  {
    programSlug: "react",
    programName: "React",
    stage: 2,
    level: "requerido",
    position: 1,
    note: null,
    courseSlug: "react-de-cero",
  },
  {
    programSlug: "react",
    programName: "React",
    stage: 2,
    level: "requerido",
    position: 2,
    note: "elige una de las dos",
    courseSlug: "react-pro",
  },
  {
    programSlug: "react",
    programName: "React",
    stage: 2,
    level: "recomendado",
    position: 1,
    note: null,
    courseSlug: "testing",
  },
  {
    programSlug: "nest",
    programName: "NestJS",
    stage: 1,
    level: "requerido",
    position: 1,
    note: null,
    courseSlug: "nodejs",
  },
];

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

describe("groupProgramCourseRows", () => {
  it("produce el mismo resultado sea cual sea el orden de llegada de las filas", () => {
    const first = groupProgramCourseRows(shuffled(rows));
    const second = groupProgramCourseRows(shuffled(rows));

    expect(first).toEqual(second);
    expect(first).toEqual([
      {
        slug: "nest",
        name: "NestJS",
        steps: [{ stage: 1, level: "requerido", note: null, courseSlugs: ["nodejs"] }],
      },
      {
        slug: "react",
        name: "React",
        steps: [
          { stage: 1, level: "requerido", note: null, courseSlugs: ["javascript-moderno"] },
          {
            stage: 2,
            level: "requerido",
            note: null,
            courseSlugs: ["react-de-cero", "react-pro"],
          },
          { stage: 2, level: "recomendado", note: null, courseSlugs: ["testing"] },
        ],
      },
    ]);
  });
});

describe("buildEngineRules", () => {
  it("agrupa los requisitos por curso y separa 'necesita' de 'conviene'", () => {
    const rules = buildEngineRules(
      [
        { courseSlug: "react-de-cero", prerequisiteSlug: "javascript-moderno", kind: "necesita" },
        { courseSlug: "nest", prerequisiteSlug: "javascript-moderno", kind: "necesita" },
        { courseSlug: "nest", prerequisiteSlug: "typescript-guia-completa", kind: "conviene" },
      ],
      [],
    );

    expect(rules.prerequisites).toEqual({
      "react-de-cero": { needs: ["javascript-moderno"], bestAfter: [] },
      nest: { needs: ["javascript-moderno"], bestAfter: ["typescript-guia-completa"] },
    });
  });

  it("ordena los cursos de cada interés por posición, sin importar el orden de llegada", () => {
    const rules = buildEngineRules(
      [],
      [
        { interestSlug: "testing", courseSlug: "net-pruebascompletas", position: 2 },
        { interestSlug: "docker", courseSlug: "docker-guia-practica", position: 1 },
        { interestSlug: "testing", courseSlug: "NestJS-Testing", position: 1 },
      ],
    );

    expect(rules.interestCourses).toEqual({
      docker: ["docker-guia-practica"],
      testing: ["NestJS-Testing", "net-pruebascompletas"],
    });
  });
});
