// Único archivo de lib/paths/ que puede importar data/*.json: sus fixtures, no el motor en
// tiempo de ejecución real (ver Criterios de aceptación del spec 04).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyInterests,
  buildPath,
  dropMasteredTechnologies,
  mergeOfficialSteps,
  resolvePrograms,
} from "./build-path";
import type { CatalogCourse, LearnerProfile, ProgramInput, ProgramStepInput } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

type RawCourse = { slug: string; hours: number };

const catalog: CatalogCourse[] = (
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, "courses.json"), "utf8")) as RawCourse[]
).map((course) => ({ slug: course.slug, hours: course.hours }));

type RawStep = {
  stage: number;
  level: "requerido" | "recomendado" | "opcional";
  note: string | null;
  courses: string[];
};
type RawRoute = { title: string; steps: RawStep[] };
type RawProgram = { slug: string; name: string; routes: RawRoute[] };

// data/programs.json agrupa react/react-native y dart-movil/dart-web bajo un mismo programa
// (una entrada de `routes` por ruta); el spec 02 los separó en programs.slug distintos al
// sembrar la tabla real (ver "Depende de SPEC 02" del spec). Se replica esa separación acá para
// que el fixture use el mismo vocabulario de 15 slugs que GOALS/TECH_TO_SLUGS.
function toProgramInput(slug: string, route: RawRoute): ProgramInput {
  const steps: ProgramStepInput[] = route.steps.map((step) => ({
    stage: step.stage,
    level: step.level,
    note: step.note,
    courseSlugs: step.courses,
  }));
  return { slug, steps };
}

const rawPrograms = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "programs.json"), "utf8")) as RawProgram[];

const programs: ProgramInput[] = [];
for (const program of rawPrograms) {
  if (program.slug === "react") {
    programs.push(toProgramInput("react", program.routes[0]));
    programs.push(toProgramInput("react-native", program.routes[1]));
  } else if (program.slug === "dart") {
    programs.push(toProgramInput("dart-movil", program.routes[0]));
    programs.push(toProgramInput("dart-web", program.routes[1]));
  } else {
    programs.push(toProgramInput(program.slug, program.routes[0]));
  }
}

function totalHoursOf(courseSlugs: string[]): number {
  let total = 0;
  for (const slug of courseSlugs) {
    total += catalog.find((course) => course.slug === slug)?.hours ?? 0;
  }
  return total;
}

describe("buildPath", () => {
  it("perfil 1: React desde cero con 3 intereses cabe en 260 h con 12 cursos exactos", () => {
    const profile: LearnerProfile = {
      goal: "react",
      level: "empiezo_de_cero",
      masteredTechnologies: [],
      interests: ["docker", "testing", "bases-de-datos-sql"],
      hoursPerWeek: 10,
      deadlineMonths: 6,
    };

    const result = buildPath(profile, catalog, programs);

    expect(result.steps.some((step) => step.sourceProgramSlug === "fundamentos")).toBe(true);
    expect(result.steps.filter((step) => step.courseSlug === "sql-con-postgres")).toHaveLength(1);
    expect(result.steps).toHaveLength(12);
    expect(result.budgetHours).toBe(260);
    expect(result.totalHours).toBe(225);
    expect(result.fitsInBudget).toBe(true);
  });

  it("perfil 2: React + Nest fusiona 276 h y recorta hasta caber en 260 h sin tocar requeridos", () => {
    const profile: LearnerProfile = {
      goal: "react-nest",
      level: "empiezo_de_cero",
      masteredTechnologies: [],
      interests: [],
      hoursPerWeek: 10,
      deadlineMonths: 6,
    };
    const budgetHours = Math.round(profile.deadlineMonths * 4.33) * profile.hoursPerWeek;

    const resolvedPrograms = resolvePrograms(profile, programs);
    const merged = mergeOfficialSteps(resolvedPrograms, profile);
    const { steps: afterMastery } = dropMasteredTechnologies(merged, profile);
    const officialHours = totalHoursOf(afterMastery.map((step) => step.courseSlug));
    const { steps: beforeTrim } = applyInterests(afterMastery, profile, budgetHours, officialHours, catalog);
    const totalBeforeTrim = totalHoursOf(beforeTrim.map((step) => step.courseSlug));

    expect(totalBeforeTrim).toBe(276);
    expect(totalBeforeTrim).toBeGreaterThan(budgetHours);

    const result = buildPath(profile, catalog, programs);

    expect(result.fitsInBudget).toBe(true);
    expect(result.totalHours).toBeLessThanOrEqual(260);
    expect(result.discarded.every((step) => step.origin !== "requerido")).toBe(true);
  });

  it("perfil 3: PHP con bases no antepone Fundamentos y los 3 intereses entran sin tocar el cupo", () => {
    const profile: LearnerProfile = {
      goal: "php",
      level: "tengo_bases",
      masteredTechnologies: [],
      interests: ["docker", "testing", "bases-de-datos-sql"],
      hoursPerWeek: 8,
      deadlineMonths: 4,
    };

    const result = buildPath(profile, catalog, programs);

    expect(result.steps.some((step) => step.sourceProgramSlug === "fundamentos")).toBe(false);

    const officialSteps = result.steps.filter((step) => step.origin !== "interes");
    const interestSteps = result.steps.filter((step) => step.origin === "interes");

    expect(totalHoursOf(officialSteps.map((step) => step.courseSlug))).toBe(23.5);
    expect(totalHoursOf(interestSteps.map((step) => step.courseSlug))).toBe(42.5);
    expect(result.discarded.filter((step) => step.discardReason === "superaba el cupo de intereses")).toHaveLength(0);
    expect(result.fitsInBudget).toBe(true);
  });

  it("perfil 4: dominar React descarta react-de-cero aunque sea requerido", () => {
    const profile: LearnerProfile = {
      goal: "react",
      level: "intermedio",
      masteredTechnologies: ["react"],
      interests: [],
      hoursPerWeek: 10,
      deadlineMonths: 12,
    };

    const result = buildPath(profile, catalog, programs);

    const discardedReactDeCero = result.discarded.find((step) => step.courseSlug === "react-de-cero");
    expect(discardedReactDeCero?.discardReason).toBe("ya lo dominás");
    expect(discardedReactDeCero?.origin).toBe("requerido");

    const remainingCourseSlugs = result.steps.map((step) => step.courseSlug).sort();
    expect(remainingCourseSlugs).toEqual(
      ["javascript-moderno", "nextjs", "react-pro", "sql-con-postgres", "typescript-guia-completa"].sort(),
    );
  });

  it("perfil 5: IA con presupuesto corto no cabe ni recortando todo lo recortable", () => {
    const profile: LearnerProfile = {
      goal: "ia",
      level: "empiezo_de_cero",
      masteredTechnologies: [],
      interests: [],
      hoursPerWeek: 5,
      deadlineMonths: 2,
    };

    const result = buildPath(profile, catalog, programs);

    expect(result.fitsInBudget).toBe(false);
    expect(result.overflowHours).toBeGreaterThan(0);
    expect(result.overflowHours).toBe(result.totalHours - result.budgetHours);
    expect(result.discarded.every((step) => step.origin !== "requerido")).toBe(true);
  });

  it("lanza un Error si profile.goal no es una clave de GOALS", () => {
    const profile: LearnerProfile = {
      goal: "meta-inexistente",
      level: "intermedio",
      masteredTechnologies: [],
      interests: [],
      hoursPerWeek: 5,
      deadlineMonths: 2,
    };

    expect(() => buildPath(profile, catalog, programs)).toThrow();
  });
});
