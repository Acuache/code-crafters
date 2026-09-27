// Único archivo de lib/paths/ que puede importar data/*.json: sus fixtures, no el motor en
// tiempo de ejecución real (ver Criterios de aceptación del spec 04).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildPath } from "./build-path";
import { DISCARD_REASONS } from "./discard-reasons";
import { GOALS } from "./goals";
import { INTERESTS, TECH_TO_SLUGS } from "./interests";
import { EXPERIENCE_LEVELS } from "./levels";
import type {
  BuiltPath,
  CatalogCourse,
  EngineRules,
  LearnerProfile,
  ProgramInput,
  ProgramLevel,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function readDataFile<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fileName), "utf8")) as T;
}

type RawCourse = { slug: string; title: string; hours: number; in_construction: boolean };
type RawEnrichedCourse = { slug: string; difficulty: CatalogCourse["difficulty"] };

const difficultyBySlug = new Map(
  readDataFile<RawEnrichedCourse[]>("courses.enriched.json").map((course) => [
    course.slug,
    course.difficulty,
  ]),
);

const catalog: CatalogCourse[] = readDataFile<RawCourse[]>("courses.json").map((course) => ({
  slug: course.slug,
  title: course.title,
  hours: course.hours,
  difficulty: difficultyBySlug.get(course.slug) ?? "principiante",
  inConstruction: course.in_construction,
}));

type RawStep = { stage: number; level: ProgramLevel; note: string | null; courses: string[] };
type RawRoute = { title: string; steps: RawStep[] };
type RawProgram = { slug: string; routes: RawRoute[] };

// Los niveles de Fundamentos después de la migración 20260927120000_engine_rules.sql: el JSON
// conserva los de la web de DevTalles.
const MIGRATED_FUNDAMENTOS_LEVELS: Record<string, ProgramLevel> = {
  "programacion-para-principiantes": "requerido",
  "git-github-control-versiones-desde-cero": "recomendado",
};

function toProgramInput(slug: string, route: RawRoute): ProgramInput {
  return {
    slug,
    name: route.title,
    steps: route.steps.map((step) => {
      const [firstCourse] = step.courses;
      const level =
        slug === "fundamentos"
          ? (MIGRATED_FUNDAMENTOS_LEVELS[firstCourse] ?? "opcional")
          : step.level;
      return { stage: step.stage, level, note: step.note, courseSlugs: step.courses };
    }),
  };
}

// data/programs.json agrupa react/react-native y dart-movil/dart-web bajo un mismo programa; la
// base los separa en programs.slug distintos (spec 02).
const programs: ProgramInput[] = [];
for (const program of readDataFile<RawProgram[]>("programs.json")) {
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

type RawPrerequisites = { course: string; needs: string[]; bestAfter: string[] };

const rules: EngineRules = {
  prerequisites: Object.fromEntries(
    readDataFile<RawPrerequisites[]>("course-prerequisites.json").map((entry) => [
      entry.course,
      { needs: entry.needs, bestAfter: entry.bestAfter },
    ]),
  ),
  interestCourses: readDataFile<Record<string, string[]>>("interest-courses.json"),
};

const coursesBySlug = new Map(catalog.map((course) => [course.slug, course]));

function makeProfile(overrides: Partial<LearnerProfile> & Pick<LearnerProfile, "goal">) {
  const profile: LearnerProfile = {
    level: "empiezo_de_cero",
    masteredTechnologies: [],
    interests: [],
    hoursPerWeek: 10,
    deadlineMonths: 6,
    ...overrides,
  };
  return profile;
}

function build(profile: LearnerProfile): BuiltPath {
  return buildPath(profile, catalog, programs, rules);
}

function slugsOf(built: BuiltPath): string[] {
  return built.steps.map((step) => step.courseSlug);
}

function discardOf(built: BuiltPath, courseSlug: string) {
  return built.discarded.find((step) => step.courseSlug === courseSlug);
}

// Lo que el motor da por dominado: la puerta de cada tecnología más todo lo que ese curso necesita.
function masteredClosure(profile: LearnerProfile): Set<string> {
  const mastered = new Set<string>();
  const pending = profile.masteredTechnologies.map((technology) => TECH_TO_SLUGS[technology]);
  while (pending.length > 0) {
    const courseSlug = pending.pop();
    if (!courseSlug || mastered.has(courseSlug)) {
      continue;
    }
    mastered.add(courseSlug);
    pending.push(...(rules.prerequisites[courseSlug]?.needs ?? []));
  }
  if (profile.level !== "empiezo_de_cero") {
    mastered.add("programacion-para-principiantes");
  }
  return mastered;
}

describe("buildPath — rutas de las muestras revisadas (Anexo D del plan)", () => {
  it("React desde cero: el lenguaje antes del framework, Git después del primer curso intermedio", () => {
    const built = build(
      makeProfile({
        goal: "react",
        interests: ["ia-aplicada", "bases-de-datos-sql", "sitios-de-contenido"],
      }),
    );

    expect(slugsOf(built)).toEqual([
      "programacion-para-principiantes",
      "javascript-moderno",
      "Ingeniería-de-prompts",
      "typescript-guia-completa",
      "react-de-cero",
      "git-github-control-versiones-desde-cero",
      "expo-gemini",
      "ia-para-developers",
      "qwik-introduccion",
      "Astro",
      "react-pro",
      "sql-con-postgres",
      "nextjs",
    ]);
    const stageOf = (slug: string) => built.steps.find((step) => step.courseSlug === slug)?.stage;
    expect(stageOf("typescript-guia-completa")).toBe(stageOf("react-de-cero"));
    expect(built.fitsInBudget).toBe(true);
    expect(discardOf(built, "openai")?.discardReason).toBe(DISCARD_REASONS.missingBase);
    expect(discardOf(built, "openai")?.reason).toContain("Nest");
  });

  it("Java desde cero: nada de otro stack y sin cursos en construcción", () => {
    const built = build(
      makeProfile({
        goal: "java",
        interests: ["ia-aplicada", "bases-de-datos-sql", "agentes-vibe-coding"],
      }),
    );

    expect(slugsOf(built)).toEqual([
      "programacion-para-principiantes",
      "Java",
      "Ingeniería-de-prompts",
      "vibe-coding",
      "sql-con-postgres",
      "java-avanzado",
      "git-github-control-versiones-desde-cero",
      "open-code-guia-completa",
      "claude-code-guia-completa",
      "spring-boot",
      "spring-boot-patrones-arquitectura",
      "spring-boot-microservicios",
      "spring-AI",
    ]);
    expect(slugsOf(built)).not.toContain("openai");
    expect(discardOf(built, "kafka-springboot-event-driven")?.discardReason).toBe(
      DISCARD_REASONS.inConstruction,
    );
  });

  it("React con 5 h por semana conserva JavaScript y recorta Git al último", () => {
    const built = build(makeProfile({ goal: "react", hoursPerWeek: 5 }));

    expect(slugsOf(built)).toEqual([
      "programacion-para-principiantes",
      "javascript-moderno",
      "typescript-guia-completa",
      "react-de-cero",
      "nextjs",
    ]);
    expect(discardOf(built, "git-github-control-versiones-desde-cero")?.discardReason).toBe(
      DISCARD_REASONS.budget,
    );
  });

  it("React Native incluye React, aunque el programa oficial no lo nombre", () => {
    const built = build(
      makeProfile({
        goal: "react-native",
        level: "tengo_bases",
        masteredTechnologies: ["javascript"],
      }),
    );
    const slugs = slugsOf(built);

    expect(slugs.indexOf("react-de-cero")).toBeGreaterThanOrEqual(0);
    expect(slugs.indexOf("react-de-cero")).toBeLessThan(slugs.indexOf("react-native-expo"));
  });

  it("Angular con tiempo real suma Angular + Sockets, no React + Sockets", () => {
    const built = build(
      makeProfile({ goal: "angular", hoursPerWeek: 8, interests: ["tiempo-real"] }),
    );

    expect(slugsOf(built)).toContain("Angular_socket_bun");
    expect(slugsOf(built)).not.toContain("react-sockets");
  });

  it("dominar React da por dominado JavaScript", () => {
    const built = build(
      makeProfile({ goal: "react-native", level: "tengo_bases", masteredTechnologies: ["react"] }),
    );

    expect(slugsOf(built)).not.toContain("javascript-moderno");
    expect(slugsOf(built)).not.toContain("react-de-cero");
    expect(discardOf(built, "javascript-moderno")?.discardReason).toBe(DISCARD_REASONS.mastered);
  });

  it("IA con Python no trae el stack de JavaScript del programa IA", () => {
    const built = build(makeProfile({ goal: "ia-python", interests: ["agentes-vibe-coding"] }));

    for (const excludedSlug of GOALS["ia-python"].excludedCourseSlugs ?? []) {
      expect(slugsOf(built)).not.toContain(excludedSlug);
    }
    expect(slugsOf(built)).toEqual(expect.arrayContaining(["python", "fastapi", "django"]));
  });

  it("un interés sin base explica qué le falta", () => {
    const built = build(
      makeProfile({
        goal: "go",
        level: "tengo_bases",
        masteredTechnologies: ["git"],
        interests: ["microservicios"],
      }),
    );
    const discard = discardOf(built, "nestjs-microservicios");

    expect(discard?.discardReason).toBe(DISCARD_REASONS.missingBase);
    expect(discard?.reason).toContain("Microservicios");
  });

  it("lanza un Error si profile.goal no es una clave de GOALS", () => {
    expect(() => build(makeProfile({ goal: "meta-inventada" }))).toThrow(/Meta desconocida/);
  });
});

describe("buildPath — recorte y reglas editadas desde el panel", () => {
  it("recorta los opcionales que entraron por interés antes que los recomendados de la meta", () => {
    const built = build(
      makeProfile({ goal: "react", hoursPerWeek: 7, interests: ["docker", "patrones-diseno"] }),
    );

    expect(slugsOf(built)).toEqual(expect.arrayContaining(["react-pro", "sql-con-postgres"]));
    expect(discardOf(built, "docker-guia-practica")?.discardReason).toBe(DISCARD_REASONS.budget);
    expect(discardOf(built, "patrones-diseno")?.discardReason).toBe(DISCARD_REASONS.budget);
  });

  it("un requisito en construcción no entra, pero aparece en 'Qué quitamos'", () => {
    const catalogWithReactInConstruction = catalog.map((course) =>
      course.slug === "react-de-cero" ? { ...course, inConstruction: true } : course,
    );
    const built = buildPath(
      makeProfile({
        goal: "react-native",
        level: "tengo_bases",
        masteredTechnologies: ["javascript"],
      }),
      catalogWithReactInConstruction,
      programs,
      rules,
    );

    expect(slugsOf(built)).not.toContain("react-de-cero");
    expect(discardOf(built, "react-de-cero")?.discardReason).toBe(DISCARD_REASONS.inConstruction);
  });

  it("un interés no suma un curso que la meta excluye, aunque el admin lo ponga primero", () => {
    const reorderedRules: EngineRules = {
      ...rules,
      interestCourses: { ...rules.interestCourses, "ia-aplicada": ["ia-para-developers"] },
    };
    const built = buildPath(
      makeProfile({
        goal: "ia-python",
        level: "tengo_bases",
        masteredTechnologies: ["typescript"],
        interests: ["ia-aplicada"],
      }),
      catalog,
      programs,
      reorderedRules,
    );

    expect(slugsOf(built)).not.toContain("ia-para-developers");
  });

  it("si el admin cambia la base, el primer paso no habla de programación", () => {
    const programsWithoutProgramming = programs.map((program) =>
      program.slug === "fundamentos"
        ? {
            ...program,
            steps: program.steps.map((step) =>
              step.courseSlugs.includes("programacion-para-principiantes")
                ? { ...step, level: "opcional" as const }
                : step,
            ),
          }
        : program,
    );
    const built = buildPath(
      makeProfile({ goal: "react" }),
      catalog,
      programsWithoutProgramming,
      rules,
    );

    expect(built.steps[0].reason).toBe("Tu primer paso antes de React.");
  });
});

const BUDGETS: Array<Pick<LearnerProfile, "hoursPerWeek" | "deadlineMonths">> = [
  { hoursPerWeek: 5, deadlineMonths: 3 },
  { hoursPerWeek: 10, deadlineMonths: 6 },
  { hoursPerWeek: 20, deadlineMonths: 12 },
];

const INTEREST_SETS: string[][] = [
  [],
  ["ia-aplicada", "bases-de-datos-sql", "sitios-de-contenido"],
  ["testing", "docker", "microservicios"],
  Object.keys(INTERESTS),
];

function* allProfiles(): Generator<LearnerProfile> {
  for (const goal of Object.keys(GOALS)) {
    for (const level of EXPERIENCE_LEVELS) {
      for (const budget of BUDGETS) {
        for (const interests of INTEREST_SETS) {
          const masteredTechnologies = level === "empiezo_de_cero" ? [] : ["javascript", "git"];
          yield { goal, level, masteredTechnologies, interests, ...budget };
        }
      }
    }
  }
}

describe("buildPath — invariantes sobre 19 metas × 3 niveles × 3 presupuestos × 4 intereses", () => {
  it("ningún curso llega antes de lo que necesita o conviene hacer antes", () => {
    for (const profile of allProfiles()) {
      const slugs = slugsOf(build(profile));
      for (const [index, courseSlug] of slugs.entries()) {
        const prerequisites = rules.prerequisites[courseSlug];
        const mustComeBefore = [
          ...(prerequisites?.needs ?? []),
          ...(prerequisites?.bestAfter ?? []),
        ];
        for (const prerequisiteSlug of mustComeBefore) {
          const prerequisiteIndex = slugs.indexOf(prerequisiteSlug);
          if (prerequisiteIndex !== -1) {
            expect(
              prerequisiteIndex,
              `${profile.goal}: ${prerequisiteSlug} antes de ${courseSlug}`,
            ).toBeLessThan(index);
          }
        }
      }
    }
  });

  it("nada queda sin su base: lo que un curso necesita está en la ruta o ya se domina", () => {
    for (const profile of allProfiles()) {
      const slugs = new Set(slugsOf(build(profile)));
      const mastered = masteredClosure(profile);
      for (const courseSlug of slugs) {
        for (const prerequisiteSlug of rules.prerequisites[courseSlug]?.needs ?? []) {
          const isCovered = slugs.has(prerequisiteSlug) || mastered.has(prerequisiteSlug);
          expect(isCovered, `${profile.goal}: ${courseSlug} sin ${prerequisiteSlug}`).toBe(true);
        }
      }
    }
  });

  it("no entra ningún curso en construcción ni se repite un curso", () => {
    for (const profile of allProfiles()) {
      const built = build(profile);
      const slugs = slugsOf(built);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const courseSlug of slugs) {
        expect(coursesBySlug.get(courseSlug)?.inConstruction, courseSlug).toBe(false);
      }
      for (const discarded of built.discarded) {
        expect(slugs).not.toContain(discarded.courseSlug);
      }
    }
  });

  it("el principiante empieza con Programación", () => {
    for (const profile of allProfiles()) {
      if (profile.level !== "empiezo_de_cero") {
        continue;
      }
      expect(slugsOf(build(profile))[0]).toBe("programacion-para-principiantes");
    }
  });

  it("las etapas son consecutivas y dos cursos de la misma etapa no dependen entre sí", () => {
    for (const profile of allProfiles()) {
      const built = build(profile);
      let previousStage = 0;
      for (const step of built.steps) {
        expect(step.stage - previousStage).toBeLessThanOrEqual(1);
        previousStage = step.stage;

        const sameStage = built.steps.filter(
          (other) => other.stage === step.stage && other !== step,
        );
        const prerequisites = rules.prerequisites[step.courseSlug];
        for (const other of sameStage) {
          expect(prerequisites?.needs ?? []).not.toContain(other.courseSlug);
          expect(prerequisites?.bestAfter ?? []).not.toContain(other.courseSlug);
        }
      }
    }
  });

  it("si dice que cabe, las horas no superan el presupuesto", () => {
    for (const profile of allProfiles()) {
      const built = build(profile);
      let totalHours = 0;
      for (const courseSlug of slugsOf(built)) {
        totalHours += coursesBySlug.get(courseSlug)?.hours ?? 0;
      }
      expect(built.totalHours).toBeCloseTo(totalHours);
      if (built.fitsInBudget) {
        expect(built.totalHours).toBeLessThanOrEqual(built.budgetHours);
      }
    }
  });
});
