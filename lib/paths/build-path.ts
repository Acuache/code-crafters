// Motor de reglas: arma una ruta combinando programas oficiales, quitando lo que el usuario ya
// domina, sumando intereses y recortando contra un presupuesto de horas. Es puro: todo entra por
// parámetro, sin leer Supabase.

import { GOALS, type GoalDefinition } from "./goals";
import { INTERESTS, TECH_TO_SLUGS } from "./interests";
import type {
  BuiltPath,
  BuiltStep,
  CatalogCourse,
  DiscardedStep,
  LearnerProfile,
  ProgramInput,
  ProgramLevel,
  StepOrigin,
} from "./types";

// Una meta desconocida es un bug de quien llama, no un caso a tolerar en silencio.
function requireGoal(goalSlug: string): GoalDefinition {
  const goal = GOALS[goalSlug];
  if (!goal) {
    throw new Error(`Meta desconocida: "${goalSlug}".`);
  }
  return goal;
}

// Se arma una vez por función pública: buscar en el array en cada paso haría crecer el costo con
// el tamaño del catálogo multiplicado por el de la ruta.
type HoursBySlug = Map<string, number>;

function indexHoursBySlug(catalog: CatalogCourse[]): HoursBySlug {
  return new Map(catalog.map((course) => [course.slug, course.hours]));
}

function sumHours(steps: { courseSlug: string }[], hoursBySlug: HoursBySlug): number {
  let total = 0;
  for (const step of steps) {
    total += hoursBySlug.get(step.courseSlug) ?? 0;
  }
  return total;
}

function isMarkedInterest(courseSlug: string, interests: string[]): boolean {
  return interests.some((interestSlug) =>
    INTERESTS[interestSlug]?.courseSlugs.includes(courseSlug),
  );
}

function isMasteredCourse(courseSlug: string, masteredTechnologies: string[]): boolean {
  return masteredTechnologies.some((technology) => TECH_TO_SLUGS[technology] === courseSlug);
}

// Los cursos "puerta de entrada" de las tecnologías que el usuario domina. Una tecnología que no
// está en TECH_TO_SLUGS se ignora.
function collectMasteredCourseSlugs(masteredTechnologies: string[]): Set<string> {
  const masteredCourseSlugs = new Set<string>();

  for (const technology of masteredTechnologies) {
    const courseSlug = TECH_TO_SLUGS[technology];
    if (courseSlug) {
      masteredCourseSlugs.add(courseSlug);
    }
  }

  return masteredCourseSlugs;
}

/**
 * 1. Resuelve la meta a su lista de programas, anteponiendo Fundamentos para un principiante.
 */
export function resolvePrograms(profile: LearnerProfile, programs: ProgramInput[]): ProgramInput[] {
  const goal = requireGoal(profile.goal);

  const programSlugs =
    profile.level === "empiezo_de_cero" ? ["fundamentos", ...goal.programSlugs] : goal.programSlugs;

  const programsBySlug = new Map<string, ProgramInput>(
    programs.map((program): [string, ProgramInput] => [program.slug, program]),
  );

  return programSlugs
    .map((slug) => programsBySlug.get(slug))
    .filter((program): program is ProgramInput => program !== undefined);
}

// Si un curso llega por dos programas, se queda con el origen más exigente.
const ORIGIN_PRIORITY: Record<StepOrigin, number> = {
  requerido: 3,
  recomendado: 2,
  opcional: 1,
  interes: 0,
};

// Entre varias alternativas de un mismo paso, prioriza la que coincide con un interés marcado o
// una tecnología dominada; si ninguna coincide, la primera de la lista (el orden de la web).
function chooseAlternative(courseSlugs: string[], profile: LearnerProfile): string {
  if (courseSlugs.length === 1) {
    return courseSlugs[0];
  }

  const slugCloseToProfile = courseSlugs.find(
    (slug) =>
      isMarkedInterest(slug, profile.interests) ||
      isMasteredCourse(slug, profile.masteredTechnologies),
  );

  return slugCloseToProfile ?? courseSlugs[0];
}

const OFFICIAL_LEVEL_LABEL: Record<ProgramLevel, string> = {
  requerido: "Requerido",
  recomendado: "Recomendado",
  opcional: "Opcional",
};

function composeOfficialReason(
  level: ProgramLevel,
  sourceProgramSlug: string,
  profile: LearnerProfile,
  goal: GoalDefinition,
  mergesMultiplePrograms: boolean,
): string {
  const levelLabel = OFFICIAL_LEVEL_LABEL[level];

  if (sourceProgramSlug === "fundamentos") {
    return `${levelLabel} en la ruta base de Fundamentos, antes de arrancar con ${goal.label}.`;
  }

  const monthsLabel = profile.deadlineMonths === 1 ? "mes" : "meses";
  const deadlineLabel = `en ${profile.deadlineMonths} ${monthsLabel}`;
  const fusionSuffix = mergesMultiplePrograms ? " (tu ruta fusiona más de un programa)" : "";

  return `${levelLabel} para llegar a ${goal.label} ${deadlineLabel}${fusionSuffix}.`;
}

/**
 * 2. Fusiona los pasos oficiales de los programas resueltos: elige una alternativa por paso
 * múltiple, filtra los opcionales que no coinciden con un interés, y no repite un curso que ya
 * entró por otro programa (gana el nivel más exigente).
 */
export function mergeOfficialSteps(
  resolvedPrograms: ProgramInput[],
  profile: LearnerProfile,
): BuiltStep[] {
  const goal = requireGoal(profile.goal);

  // Fundamentos no cuenta como "fusión": se antepone a cualquier meta, no es parte de la meta.
  const goalProgramSlugs = resolvedPrograms
    .map((program) => program.slug)
    .filter((slug) => slug !== "fundamentos");
  const mergesMultiplePrograms = new Set(goalProgramSlugs).size > 1;

  const stepsBySlug = new Map<string, BuiltStep>();

  for (const program of resolvedPrograms) {
    for (const step of program.steps) {
      const chosenCourseSlug = chooseAlternative(step.courseSlugs, profile);

      if (step.level === "opcional" && !isMarkedInterest(chosenCourseSlug, profile.interests)) {
        continue;
      }

      const existing = stepsBySlug.get(chosenCourseSlug);
      if (existing && ORIGIN_PRIORITY[existing.origin] >= ORIGIN_PRIORITY[step.level]) {
        continue;
      }

      stepsBySlug.set(chosenCourseSlug, {
        courseSlug: chosenCourseSlug,
        sourceProgramSlug: program.slug,
        stage: step.stage,
        position: 0,
        origin: step.level,
        reason: composeOfficialReason(
          step.level,
          program.slug,
          profile,
          goal,
          mergesMultiplePrograms,
        ),
      });
    }
  }

  return [...stepsBySlug.values()];
}

/**
 * 3. Quita cualquier paso cuyo curso sea la puerta de entrada de una tecnología ya dominada,
 * sea cual sea su nivel — incluido un requerido.
 */
export function dropMasteredTechnologies(
  steps: BuiltStep[],
  profile: LearnerProfile,
): { steps: BuiltStep[]; discarded: DiscardedStep[] } {
  const masteredCourseSlugs = collectMasteredCourseSlugs(profile.masteredTechnologies);

  const kept: BuiltStep[] = [];
  const discarded: DiscardedStep[] = [];

  for (const step of steps) {
    if (masteredCourseSlugs.has(step.courseSlug)) {
      discarded.push({ ...step, discardReason: "ya lo dominas" });
    } else {
      kept.push(step);
    }
  }

  return { steps: kept, discarded };
}

// Piso del cupo de intereses: aunque la ruta oficial ocupe todo el presupuesto, un cuarto de las
// horas queda reservado para lo que el usuario marcó (ver Decisiones del spec).
const INTEREST_BUDGET_FLOOR_RATIO = 0.25;

/**
 * 4. Suma cursos de interés hasta el cupo de horas disponible (el mayor entre el piso del 25% del
 * presupuesto y lo que sobra sobre la ruta oficial ya armada); el resto se descarta por cupo.
 */
export function applyInterests(
  steps: BuiltStep[],
  profile: LearnerProfile,
  budgetHours: number,
  officialHours: number,
  catalog: CatalogCourse[],
): { steps: BuiltStep[]; discarded: DiscardedStep[] } {
  const hoursBySlug = indexHoursBySlug(catalog);
  const takenCourseSlugs = new Set(steps.map((step) => step.courseSlug));
  const masteredCourseSlugs = collectMasteredCourseSlugs(profile.masteredTechnologies);

  type InterestCandidate = { courseSlug: string; interestSlug: string; hours: number };
  const candidates: InterestCandidate[] = [];

  for (const interestSlug of profile.interests) {
    const interest = INTERESTS[interestSlug];
    if (!interest) {
      continue; // interés desconocido: se ignora
    }

    const availableCourseSlug = interest.courseSlugs.find(
      (slug) => !takenCourseSlugs.has(slug) && !masteredCourseSlugs.has(slug),
    );
    if (!availableCourseSlug) {
      continue; // ningún courseSlug libre: este interés no aporta nada
    }

    // Se marca ya como tomado para que dos intereses que comparten un curso no lo propongan dos
    // veces (p. ej. Docker y "Bases de datos SQL" contra un mismo slug).
    takenCourseSlugs.add(availableCourseSlug);
    candidates.push({
      courseSlug: availableCourseSlug,
      interestSlug,
      hours: hoursBySlug.get(availableCourseSlug) ?? 0,
    });
  }

  const minimumInterestHours = INTEREST_BUDGET_FLOOR_RATIO * budgetHours;
  const hoursLeftOverOfficialPath = budgetHours - officialHours;
  const interestBudget = Math.max(minimumInterestHours, hoursLeftOverOfficialPath);

  const cheapestFirst = [...candidates].sort((a, b) => a.hours - b.hours);

  const added: BuiltStep[] = [];
  const discarded: DiscardedStep[] = [];
  let spent = 0;

  for (const candidate of cheapestFirst) {
    const reason = `Sumado por tu interés en ${INTERESTS[candidate.interestSlug].label}.`;
    const step: BuiltStep = {
      courseSlug: candidate.courseSlug,
      sourceProgramSlug: null,
      stage: 0,
      position: 0,
      origin: "interes",
      reason,
    };

    if (spent + candidate.hours <= interestBudget) {
      spent += candidate.hours;
      added.push(step);
    } else {
      discarded.push({ ...step, discardReason: "superaba el cupo de intereses" });
    }
  }

  return { steps: [...steps, ...added], discarded };
}

// `requerido` queda fuera de la lista a propósito: el recorte por presupuesto nunca lo toca (ver
// Decisiones del spec).
const TRIM_ORDER: StepOrigin[] = ["interes", "opcional", "recomendado"];

/**
 * 5. Si la ruta no cabe en el presupuesto, recorta empezando por el origen menos prioritario y,
 * dentro de cada grupo, desde el final de la lista hacia el principio. Nunca quita un requerido.
 */
export function trimToBudget(
  steps: BuiltStep[],
  budgetHours: number,
  catalog: CatalogCourse[],
): { steps: BuiltStep[]; discarded: DiscardedStep[] } {
  const hoursBySlug = indexHoursBySlug(catalog);
  const kept = [...steps];
  const discarded: DiscardedStep[] = [];
  let totalHours = sumHours(kept, hoursBySlug);

  for (const origin of TRIM_ORDER) {
    for (let index = kept.length - 1; index >= 0 && totalHours > budgetHours; index--) {
      if (kept[index].origin !== origin) {
        continue;
      }
      const [removed] = kept.splice(index, 1);
      totalHours -= hoursBySlug.get(removed.courseSlug) ?? 0;
      discarded.push({ ...removed, discardReason: "no cabía en tu tiempo" });
    }
  }

  return { steps: kept, discarded };
}

// Agrupa los pasos de un mismo programa por su stage original (ascendente) y les asigna stages
// finales consecutivos; varios cursos en el mismo stage original comparten el stage final y se
// ordenan entre sí con `position` (0 cuando el stage final no tiene más de un curso).
function appendRenumberedGroup(
  groupSteps: BuiltStep[],
  startingStage: number,
  target: BuiltStep[],
): number {
  let nextStage = startingStage;

  const originalStagesInOrder: number[] = [];
  for (const step of groupSteps) {
    if (!originalStagesInOrder.includes(step.stage)) {
      originalStagesInOrder.push(step.stage);
    }
  }

  for (const originalStage of originalStagesInOrder) {
    const stepsInStage = groupSteps.filter((step) => step.stage === originalStage);
    stepsInStage.forEach((step, index) => {
      const position = stepsInStage.length > 1 ? index + 1 : 0;
      target.push({ ...step, stage: nextStage, position });
    });
    nextStage += 1;
  }

  return nextStage;
}

// El orden de INTERESTS es la prioridad con la que los cursos de interés cierran la ruta.
const INTEREST_SLUGS_IN_ORDER = Object.keys(INTERESTS);

function interestOrderRank(courseSlug: string): number {
  const index = INTEREST_SLUGS_IN_ORDER.findIndex((interestSlug) =>
    INTERESTS[interestSlug].courseSlugs.includes(courseSlug),
  );

  return index === -1 ? INTEREST_SLUGS_IN_ORDER.length : index;
}

/**
 * 6. Asigna el stage final 1..N: primero Fundamentos si entró, después cada programa fusionado en
 * el orden de la meta, y por último los cursos de interés, uno por stage propio.
 */
export function renumberStages(steps: BuiltStep[], resolvedPrograms: ProgramInput[]): BuiltStep[] {
  const renumbered: BuiltStep[] = [];
  let nextStage = 1;

  for (const program of resolvedPrograms) {
    const programSteps = steps.filter((step) => step.sourceProgramSlug === program.slug);
    nextStage = appendRenumberedGroup(programSteps, nextStage, renumbered);
  }

  const interestSteps = steps
    .filter((step) => step.origin === "interes")
    .sort((a, b) => interestOrderRank(a.courseSlug) - interestOrderRank(b.courseSlug));

  for (const step of interestSteps) {
    renumbered.push({ ...step, stage: nextStage, position: 0 });
    nextStage += 1;
  }

  return renumbered;
}

// Los parámetros van en un objeto porque tres de ellos son números seguidos: nombrarlos en la
// llamada evita intercambiar presupuesto y total sin que el compilador lo note.
function composeTitleAndSummary({
  goal,
  budgetHours,
  totalHours,
  totalSteps,
  fitsInBudget,
}: {
  goal: GoalDefinition;
  budgetHours: number;
  totalHours: number;
  totalSteps: number;
  fitsInBudget: boolean;
}): { title: string; summary: string } {
  const title = `Tu ruta hacia ${goal.label}`;

  const fitSummary = fitsInBudget
    ? `Cabe en tu presupuesto de ${budgetHours} h.`
    : `Supera tu presupuesto de ${budgetHours} h: vas a necesitar más tiempo del que marcaste.`;

  const summary = `${totalSteps} cursos, ${totalHours} h en total. ${fitSummary}`;

  return { title, summary };
}

// Semanas por mes con las que el ADR 0001 calculó su ejemplo de 260 h (6 meses × 10 h/semana).
const WEEKS_PER_MONTH = 4.33;

export function buildPath(
  profile: LearnerProfile,
  catalog: CatalogCourse[],
  programs: ProgramInput[],
): BuiltPath {
  const goal = requireGoal(profile.goal);
  const hoursBySlug = indexHoursBySlug(catalog);

  const availableWeeks = Math.round(profile.deadlineMonths * WEEKS_PER_MONTH);
  const budgetHours = availableWeeks * profile.hoursPerWeek;

  const resolvedPrograms = resolvePrograms(profile, programs);

  let steps = mergeOfficialSteps(resolvedPrograms, profile);
  const discarded: DiscardedStep[] = [];

  const droppedMastered = dropMasteredTechnologies(steps, profile);
  steps = droppedMastered.steps;
  discarded.push(...droppedMastered.discarded);

  const officialHours = sumHours(steps, hoursBySlug);

  const withInterests = applyInterests(steps, profile, budgetHours, officialHours, catalog);
  steps = withInterests.steps;
  discarded.push(...withInterests.discarded);

  const trimmed = trimToBudget(steps, budgetHours, catalog);
  steps = trimmed.steps;
  discarded.push(...trimmed.discarded);

  const finalSteps = renumberStages(steps, resolvedPrograms);

  const totalHours = sumHours(finalSteps, hoursBySlug);
  const fitsInBudget = totalHours <= budgetHours;
  const overflowHours = fitsInBudget ? 0 : totalHours - budgetHours;

  const { title, summary } = composeTitleAndSummary({
    goal,
    budgetHours,
    totalHours,
    totalSteps: finalSteps.length,
    fitsInBudget,
  });

  return {
    goal: profile.goal,
    title,
    summary,
    // Copia: `goal.programSlugs` es el array de la tabla GOALS, y quien reciba el resultado no
    // tiene por qué saber que mutarlo corrompe la tabla para el resto del proceso.
    mergedProgramSlugs: [...goal.programSlugs],
    budgetHours,
    totalHours,
    fitsInBudget,
    overflowHours,
    steps: finalSteps,
    discarded,
  };
}
