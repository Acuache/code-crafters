// Motor de reglas v2 (spec 17): función pura; el porqué de cada paso está en el spec y el ADR 0008.

import { DISCARD_REASONS } from "./discard-reasons";
import { GOALS, type GoalDefinition } from "./goals";
import { INTERESTS, TECH_TO_SLUGS } from "./interests";
import type {
  BuiltPath,
  BuiltStep,
  CatalogCourse,
  DiscardedStep,
  EngineRules,
  LearnerProfile,
  ProgramInput,
  ProgramLevel,
  ProgramStepInput,
  StepOrigin,
} from "./types";

const FUNDAMENTOS_PROGRAM_SLUG = "fundamentos";
// Quien no empieza de cero ya sabe programar, aunque no lo marque como tecnología.
const PROGRAMMING_BASICS_SLUG = "programacion-para-principiantes";

// Semanas por mes con las que el ADR 0001 calculó su ejemplo de 260 h (6 meses × 10 h/semana).
const WEEKS_PER_MONTH = 4.33;

// Piso del cupo de intereses (spec 04): un cuarto del presupuesto queda para lo que marcó.
const INTEREST_BUDGET_FLOOR_RATIO = 0.25;

// Si un curso llega por dos caminos, se queda con el origen más exigente.
const ORIGIN_PRIORITY: Record<StepOrigin, number> = {
  requerido: 3,
  recomendado: 2,
  opcional: 1,
  interes: 0,
};

const DIFFICULTY_RANK: Record<CatalogCourse["difficulty"], number> = {
  principiante: 0,
  intermedio: 1,
  avanzado: 2,
};

// `requerido` no está a propósito: el recorte por tiempo nunca lo toca.
const TRIM_ORDER: StepOrigin[] = ["interes", "opcional", "recomendado"];

// Las etapas del segundo programa de la meta quedan detrás de las del primero.
const PROGRAM_STAGE_BLOCK = 100;

// Ancla de un curso que todavía no tiene lugar: al final de todo.
const UNANCHORED = 1_000_000;
// Rondas para que las anclas se acomoden entre sí; con las rutas reales se estabilizan antes.
const ANCHOR_ROUNDS = 12;

const OFFICIAL_LEVEL_LABEL: Record<ProgramLevel, string> = {
  requerido: "Requerido",
  recomendado: "Recomendado",
  opcional: "Opcional",
};

// Un curso que la ruta va a incluir. Se muta en el lugar: varios pasos lo refinan.
type Candidate = {
  slug: string;
  origin: StepOrigin;
  // Solo en cursos de un programa de la meta: índice del programa × 100 + su etapa.
  officialStage: number | null;
  programStage: number | null;
  programSlug: string | null;
  programLevel: ProgramLevel | null;
  // Programación, el primer curso del principiante.
  isFirstStep: boolean;
  // Viene de la base del principiante (Fundamentos), no de la meta.
  isBase: boolean;
  interestSlug: string | null;
  // Los cursos que lo necesitan, cuando entró (o subió de nivel) por un requisito.
  neededBy: string[];
  raisedByPrerequisite: boolean;
  addedWithSpareTime: boolean;
};

function newCandidate(slug: string, fields: Partial<Omit<Candidate, "slug">>): Candidate {
  return {
    slug,
    origin: "interes",
    officialStage: null,
    programStage: null,
    programSlug: null,
    programLevel: null,
    isFirstStep: false,
    isBase: false,
    interestSlug: null,
    neededBy: [],
    raisedByPrerequisite: false,
    addedWithSpareTime: false,
    ...fields,
  };
}

type DiscardDraft = {
  slug: string;
  discardReason: string;
  reason: string;
  origin: StepOrigin;
  programSlug: string | null;
  stage: number;
};

type PathDraft = {
  candidates: Map<string, Candidate>;
  // Incluye lo que esos cursos necesitan: dominar React incluye JavaScript.
  mastered: Set<string>;
  discards: DiscardDraft[];
};

type EngineContext = {
  profile: LearnerProfile;
  goal: GoalDefinition;
  coursesBySlug: Map<string, CatalogCourse>;
  programsBySlug: Map<string, ProgramInput>;
  rules: EngineRules;
  budgetHours: number;
};

// Un paso opcional espera a que la ruta tenga sus bases para decidir si entra.
type DeferredOptionalStep = {
  step: ProgramStepInput;
  programSlug: string;
  programIndex: number | null; // null: el paso es de la base del principiante
};

// Una meta desconocida es un bug de quien llama, no un caso a tolerar en silencio.
function requireGoal(goalSlug: string): GoalDefinition {
  const goal = GOALS[goalSlug];
  if (!goal) {
    throw new Error(`Meta desconocida: "${goalSlug}".`);
  }
  return goal;
}

function needsOf(context: EngineContext, courseSlug: string): string[] {
  return context.rules.prerequisites[courseSlug]?.needs ?? [];
}

function bestAfterOf(context: EngineContext, courseSlug: string): string[] {
  return context.rules.prerequisites[courseSlug]?.bestAfter ?? [];
}

function interestCoursesOf(context: EngineContext, interestSlug: string): string[] {
  return context.rules.interestCourses[interestSlug] ?? [];
}

function interestLabel(interestSlug: string): string {
  return INTERESTS[interestSlug]?.label ?? interestSlug;
}

function hoursOf(context: EngineContext, courseSlug: string): number {
  return context.coursesBySlug.get(courseSlug)?.hours ?? 0;
}

function titleOf(context: EngineContext, courseSlug: string): string {
  return context.coursesBySlug.get(courseSlug)?.title ?? courseSlug;
}

function difficultyRankOf(context: EngineContext, courseSlug: string): number {
  const course = context.coursesBySlug.get(courseSlug);
  return course ? DIFFICULTY_RANK[course.difficulty] : 0;
}

// Un curso inactivo no llega en el catálogo: sus requisitos se ignoran y nunca se propone.
function isInCatalog(context: EngineContext, courseSlug: string): boolean {
  return context.coursesBySlug.has(courseSlug);
}

function isInConstruction(context: EngineContext, courseSlug: string): boolean {
  return context.coursesBySlug.get(courseSlug)?.inConstruction ?? false;
}

function isAvailable(context: EngineContext, courseSlug: string): boolean {
  const isExcludedFromGoal = context.goal.excludedCourseSlugs?.includes(courseSlug) ?? false;
  return (
    isInCatalog(context, courseSlug) &&
    !isInConstruction(context, courseSlug) &&
    !isExcludedFromGoal
  );
}

function isMarkedByInterest(context: EngineContext, courseSlug: string): boolean {
  return context.profile.interests.some((interestSlug) =>
    interestCoursesOf(context, interestSlug).includes(courseSlug),
  );
}

function firstInterestNaming(context: EngineContext, courseSlug: string): string | null {
  const interestSlug = context.profile.interests.find((candidate) =>
    interestCoursesOf(context, candidate).includes(courseSlug),
  );
  return interestSlug ?? null;
}

function sumDraftHours(context: EngineContext, draft: PathDraft): number {
  let total = 0;
  for (const courseSlug of draft.candidates.keys()) {
    total += hoursOf(context, courseSlug);
  }
  return total;
}

// Lo que el curso necesita ya está en la ruta o el usuario lo domina.
function hasItsBase(context: EngineContext, draft: PathDraft, courseSlug: string): boolean {
  return needsOf(context, courseSlug).every(
    (prerequisiteSlug) =>
      draft.candidates.has(prerequisiteSlug) ||
      draft.mastered.has(prerequisiteSlug) ||
      !isInCatalog(context, prerequisiteSlug),
  );
}

function missingBaseOf(context: EngineContext, draft: PathDraft, courseSlug: string): string[] {
  return needsOf(context, courseSlug).filter(
    (prerequisiteSlug) =>
      !draft.candidates.has(prerequisiteSlug) &&
      !draft.mastered.has(prerequisiteSlug) &&
      isInCatalog(context, prerequisiteSlug),
  );
}

function isNeededByAnother(context: EngineContext, draft: PathDraft, courseSlug: string): boolean {
  for (const candidate of draft.candidates.values()) {
    if (needsOf(context, candidate.slug).includes(courseSlug)) {
      return true;
    }
  }
  return false;
}

// Intereses y opcionales esperan a su base: nunca adelantan los cursos que necesitan.
function waitsForItsBase(candidate: Candidate): boolean {
  return (
    candidate.origin === "interes" ||
    candidate.origin === "opcional" ||
    (candidate.interestSlug !== null && candidate.officialStage === null)
  );
}

// "A", "A y B", "A, B y C".
function joinWithAnd(values: string[]): string {
  if (values.length <= 1) {
    return values.join("");
  }
  return `${values.slice(0, -1).join(", ")} y ${values[values.length - 1]}`;
}

function describeOfficialLevel(context: EngineContext, candidate: Candidate): string {
  const level = candidate.programLevel ?? "opcional";
  const programName = candidate.programSlug
    ? (context.programsBySlug.get(candidate.programSlug)?.name ?? candidate.programSlug)
    : context.goal.label;
  return `${OFFICIAL_LEVEL_LABEL[level]} en la ruta oficial de ${programName}.`;
}

function composeReason(context: EngineContext, candidate: Candidate): string {
  // El admin puede cambiar la base: la razón de Programación solo vale para Programación.
  if (candidate.isFirstStep && candidate.slug === PROGRAMMING_BASICS_SLUG) {
    return `Tu primer paso: aprendes la lógica de programación antes de ${context.goal.label}.`;
  }
  if (candidate.isFirstStep) {
    return `Tu primer paso antes de ${context.goal.label}.`;
  }

  const interest = candidate.interestSlug ? interestLabel(candidate.interestSlug) : null;

  if (candidate.addedWithSpareTime && interest) {
    return `Por tu interés en ${interest}; te sobraba tiempo para sumarlo.`;
  }

  const isOnlyForInterest =
    candidate.origin === "interes" || (interest !== null && candidate.officialStage === null);
  if (isOnlyForInterest && interest) {
    return `Por tu interés en ${interest}.`;
  }

  const [firstDependent] = candidate.neededBy;
  const cameForAPrerequisite = candidate.officialStage === null || candidate.raisedByPrerequisite;
  if (firstDependent && cameForAPrerequisite) {
    return `Lo necesitas antes de ${titleOf(context, firstDependent)}.`;
  }

  if (candidate.isBase) {
    return "Base para cualquier ruta; llega cuando ya tienes soltura con el lenguaje.";
  }

  const interestSuffix = interest ? ` Coincide con tu interés en ${interest}.` : "";
  return `${describeOfficialLevel(context, candidate)}${interestSuffix}`;
}

function discardCandidate(
  context: EngineContext,
  draft: PathDraft,
  candidate: Candidate,
  discardReason: string,
) {
  draft.discards.push({
    slug: candidate.slug,
    discardReason,
    reason: composeReason(context, candidate),
    origin: candidate.origin,
    programSlug: candidate.programSlug,
    stage: candidate.programStage ?? 0,
  });
}

function discardForMissingBase(
  context: EngineContext,
  draft: PathDraft,
  courseSlug: string,
  source: { origin: StepOrigin; programSlug: string | null; stage: number; interestSlug: string },
) {
  const missingTitles = missingBaseOf(context, draft, courseSlug).map((slug) =>
    titleOf(context, slug),
  );
  const verb = missingTitles.length === 1 ? "está" : "están";
  const interest = interestLabel(source.interestSlug);

  draft.discards.push({
    slug: courseSlug,
    discardReason: DISCARD_REASONS.missingBase,
    reason: `Coincide con tu interés en ${interest}, pero necesita ${joinWithAnd(missingTitles)}, que no ${verb} en tu ruta.`,
    origin: source.origin,
    programSlug: source.programSlug,
    stage: source.stage,
  });
}

// De los dos, el que viene de la meta; si vienen los dos, el de la etapa oficial más temprana.
function pickProgramSource(existing: Candidate, incoming: Candidate): Candidate | null {
  if (existing.officialStage === null) {
    return incoming.officialStage === null ? null : incoming;
  }
  if (incoming.officialStage === null) {
    return existing;
  }
  return incoming.officialStage < existing.officialStage ? incoming : existing;
}

// Un curso que llega por dos caminos se queda con el origen más exigente.
function mergeCandidate(existing: Candidate, incoming: Candidate) {
  const programSource = pickProgramSource(existing, incoming);

  if (ORIGIN_PRIORITY[incoming.origin] > ORIGIN_PRIORITY[existing.origin]) {
    existing.origin = incoming.origin;
  }
  if (programSource) {
    existing.officialStage = programSource.officialStage;
    existing.programStage = programSource.programStage;
    existing.programSlug = programSource.programSlug;
    existing.programLevel = programSource.programLevel;
  }
  existing.interestSlug ??= incoming.interestSlug;
  existing.isFirstStep = existing.isFirstStep || incoming.isFirstStep;
  // La base se acomoda sola; un curso que también es de la meta sigue el orden de la meta.
  existing.isBase = existing.officialStage === null && (existing.isBase || incoming.isBase);
}

function addCandidate(draft: PathDraft, incoming: Candidate) {
  const existing = draft.candidates.get(incoming.slug);
  if (existing) {
    mergeCandidate(existing, incoming);
  } else {
    draft.candidates.set(incoming.slug, incoming);
  }
}

// 1. Lo dominado. A quien no empieza de cero se le da por sabida la programación, en silencio.
function collectMasteredCourses(context: EngineContext): {
  mastered: Set<string>;
  silentlyMastered: Set<string>;
} {
  const mastered = new Set<string>();

  function markWithItsPrerequisites(courseSlug: string) {
    if (mastered.has(courseSlug)) {
      return;
    }
    mastered.add(courseSlug);
    for (const prerequisiteSlug of needsOf(context, courseSlug)) {
      markWithItsPrerequisites(prerequisiteSlug);
    }
  }

  for (const technology of context.profile.masteredTechnologies) {
    const courseSlug = TECH_TO_SLUGS[technology];
    if (courseSlug) {
      markWithItsPrerequisites(courseSlug);
    }
  }

  const silentlyMastered = new Set<string>();
  if (context.profile.level !== "empiezo_de_cero") {
    mastered.add(PROGRAMMING_BASICS_SLUG);
    silentlyMastered.add(PROGRAMMING_BASICS_SLUG);
  }

  return { mastered, silentlyMastered };
}

// 2. La base del principiante (Fundamentos): su primera etapa abre la ruta.
function addBeginnerBase(context: EngineContext, draft: PathDraft): DeferredOptionalStep[] {
  const fundamentos = context.programsBySlug.get(FUNDAMENTOS_PROGRAM_SLUG);
  if (!fundamentos) {
    return [];
  }

  const nonOptionalStages = fundamentos.steps
    .filter((step) => step.level !== "opcional")
    .map((step) => step.stage);
  const firstStage = Math.min(...nonOptionalStages);
  const deferred: DeferredOptionalStep[] = [];

  for (const step of fundamentos.steps) {
    const courseSlug = step.courseSlugs.find((slug) => isAvailable(context, slug));
    if (!courseSlug || draft.mastered.has(courseSlug)) {
      continue;
    }

    if (step.level === "opcional") {
      if (isMarkedByInterest(context, courseSlug)) {
        deferred.push({ step, programSlug: FUNDAMENTOS_PROGRAM_SLUG, programIndex: null });
      }
      continue;
    }

    addCandidate(
      draft,
      newCandidate(courseSlug, {
        origin: step.level,
        programStage: step.stage,
        programSlug: FUNDAMENTOS_PROGRAM_SLUG,
        programLevel: step.level,
        isBase: true,
        isFirstStep: step.stage === firstStage,
      }),
    );
  }

  return deferred;
}

// Gana la alternativa que ya está en la ruta, dominada o marcada; si no, el orden de la web.
function chooseAlternative(
  context: EngineContext,
  draft: PathDraft,
  courseSlugs: string[],
): string {
  const closeToProfile = courseSlugs.find(
    (slug) =>
      draft.candidates.has(slug) || draft.mastered.has(slug) || isMarkedByInterest(context, slug),
  );
  return closeToProfile ?? courseSlugs[0];
}

// 3. Un curso por paso requerido o recomendado de cada programa de la meta.
function addGoalPrograms(context: EngineContext, draft: PathDraft): DeferredOptionalStep[] {
  const deferred: DeferredOptionalStep[] = [];

  context.goal.programSlugs.forEach((programSlug, programIndex) => {
    const program = context.programsBySlug.get(programSlug);
    if (!program) {
      return;
    }

    for (const step of program.steps) {
      if (step.level === "opcional") {
        deferred.push({ step, programSlug, programIndex });
        continue;
      }

      const availableSlugs = step.courseSlugs.filter((slug) => isAvailable(context, slug));
      if (availableSlugs.length === 0) {
        discardStepInConstruction(context, draft, step, programSlug);
        continue;
      }

      addCandidate(
        draft,
        newCandidate(chooseAlternative(context, draft, availableSlugs), {
          origin: step.level,
          officialStage: programIndex * PROGRAM_STAGE_BLOCK + step.stage,
          programStage: step.stage,
          programSlug,
          programLevel: step.level,
        }),
      );
    }
  });

  return deferred;
}

// Solo va a "Qué quitamos" si el paso no tenía otra alternativa disponible.
function discardStepInConstruction(
  context: EngineContext,
  draft: PathDraft,
  step: ProgramStepInput,
  programSlug: string,
) {
  for (const courseSlug of step.courseSlugs) {
    if (!isInConstruction(context, courseSlug)) {
      continue;
    }
    const candidate = newCandidate(courseSlug, {
      origin: step.level,
      programStage: step.stage,
      programSlug,
      programLevel: step.level,
    });
    discardCandidate(context, draft, candidate, DISCARD_REASONS.inConstruction);
  }
}

// 4. Saca lo que el usuario ya domina.
function dropMasteredCourses(
  context: EngineContext,
  draft: PathDraft,
  silentlyMastered: Set<string>,
) {
  for (const candidate of [...draft.candidates.values()]) {
    if (!draft.mastered.has(candidate.slug)) {
      continue;
    }
    draft.candidates.delete(candidate.slug);
    if (!silentlyMastered.has(candidate.slug)) {
      discardCandidate(context, draft, candidate, DISCARD_REASONS.mastered);
    }
  }
}

function pullPrerequisitesOf(
  context: EngineContext,
  draft: PathDraft,
  courseSlug: string,
  origin: StepOrigin,
) {
  for (const prerequisiteSlug of needsOf(context, courseSlug)) {
    if (draft.mastered.has(prerequisiteSlug) || !isInCatalog(context, prerequisiteSlug)) {
      continue;
    }
    // No entra, pero la ruta avisa que a ese curso le falta algo que todavía no se puede tomar.
    if (isInConstruction(context, prerequisiteSlug)) {
      const unavailable = newCandidate(prerequisiteSlug, { origin, neededBy: [courseSlug] });
      discardCandidate(context, draft, unavailable, DISCARD_REASONS.inConstruction);
      continue;
    }

    const existing = draft.candidates.get(prerequisiteSlug);
    if (!existing) {
      draft.candidates.set(
        prerequisiteSlug,
        newCandidate(prerequisiteSlug, { origin, neededBy: [courseSlug] }),
      );
      pullPrerequisitesOf(context, draft, prerequisiteSlug, origin);
      continue;
    }

    const raisesOrigin = ORIGIN_PRIORITY[origin] > ORIGIN_PRIORITY[existing.origin];
    if (existing.officialStage === null || raisesOrigin) {
      existing.neededBy.push(courseSlug);
    }
    if (raisesOrigin) {
      existing.origin = origin;
      existing.raisedByPrerequisite = true;
      pullPrerequisitesOf(context, draft, prerequisiteSlug, origin);
    }
  }
}

// 5. Cada curso trae lo que necesita, con su mismo nivel (React requerido: JavaScript también).
function pullRequiredPrerequisites(context: EngineContext, draft: PathDraft) {
  for (const candidate of [...draft.candidates.values()]) {
    pullPrerequisitesOf(context, draft, candidate.slug, candidate.origin);
  }
}

// 6. Un opcional entra si coincide con un interés y su base ya está en la ruta.
function addOptionalSteps(
  context: EngineContext,
  draft: PathDraft,
  deferredSteps: DeferredOptionalStep[],
) {
  for (const { step, programSlug, programIndex } of deferredSteps) {
    const matchingSlugs = step.courseSlugs.filter(
      (slug) =>
        isAvailable(context, slug) &&
        isMarkedByInterest(context, slug) &&
        !draft.mastered.has(slug),
    );
    if (matchingSlugs.length === 0) {
      continue;
    }

    const courseSlug = matchingSlugs.find((slug) => hasItsBase(context, draft, slug));
    if (!courseSlug) {
      const [preferredSlug] = matchingSlugs;
      // matchingSlugs ya filtró por interés marcado: siempre hay uno.
      const interestSlug = firstInterestNaming(context, preferredSlug);
      if (interestSlug) {
        discardForMissingBase(context, draft, preferredSlug, {
          origin: "opcional",
          programSlug,
          stage: step.stage,
          interestSlug,
        });
      }
      continue;
    }

    const officialStage =
      programIndex === null ? null : programIndex * PROGRAM_STAGE_BLOCK + step.stage;
    addCandidate(
      draft,
      newCandidate(courseSlug, {
        origin: "opcional",
        officialStage,
        programStage: step.stage,
        programSlug,
        programLevel: "opcional",
        isBase: programIndex === null,
        interestSlug: firstInterestNaming(context, courseSlug),
      }),
    );
  }
}

// Un curso de la meta que también está en la lista de un interés marcado lo menciona en su porqué.
function tagProgramCoursesWithInterests(context: EngineContext, draft: PathDraft) {
  for (const interestSlug of context.profile.interests) {
    for (const courseSlug of interestCoursesOf(context, interestSlug)) {
      const candidate = draft.candidates.get(courseSlug);
      if (candidate && candidate.officialStage !== null && candidate.interestSlug === null) {
        candidate.interestSlug = interestSlug;
      }
    }
  }
}

// 7. Un curso por interés marcado, con su base, hasta el cupo de horas (spec 04).
function addInterestCourses(context: EngineContext, draft: PathDraft) {
  const officialHours = sumDraftHours(context, draft);
  tagProgramCoursesWithInterests(context, draft);

  type InterestProposal = { courseSlug: string; interestSlug: string; hours: number };
  const proposals: InterestProposal[] = [];

  for (const interestSlug of context.profile.interests) {
    const options = interestCoursesOf(context, interestSlug).filter(
      (slug) => isAvailable(context, slug) && !draft.mastered.has(slug),
    );
    if (options.length === 0) {
      continue;
    }

    const [preferredSlug] = options;
    const preferredCandidate = draft.candidates.get(preferredSlug);
    if (preferredCandidate) {
      preferredCandidate.interestSlug ??= interestSlug;
      continue;
    }

    const proposedSlug = options.find(
      (slug) =>
        !draft.candidates.has(slug) &&
        !proposals.some((proposal) => proposal.courseSlug === slug) &&
        hasItsBase(context, draft, slug),
    );
    if (proposedSlug) {
      proposals.push({
        courseSlug: proposedSlug,
        interestSlug,
        hours: hoursOf(context, proposedSlug),
      });
      continue;
    }

    const isCoveredByAnotherOption = options.some((slug) => draft.candidates.has(slug));
    if (!isCoveredByAnotherOption) {
      discardForMissingBase(context, draft, preferredSlug, {
        origin: "interes",
        programSlug: null,
        stage: 0,
        interestSlug,
      });
    }
  }

  const minimumInterestHours = INTEREST_BUDGET_FLOOR_RATIO * context.budgetHours;
  const interestBudget = Math.max(minimumInterestHours, context.budgetHours - officialHours);
  const shortestFirst = [...proposals].sort((a, b) => a.hours - b.hours);
  let spentHours = 0;

  for (const proposal of shortestFirst) {
    const candidate = newCandidate(proposal.courseSlug, {
      origin: "interes",
      interestSlug: proposal.interestSlug,
    });

    if (spentHours + proposal.hours <= interestBudget) {
      spentHours += proposal.hours;
      draft.candidates.set(proposal.courseSlug, candidate);
    } else {
      discardCandidate(context, draft, candidate, DISCARD_REASONS.interestQuota);
    }
  }
}

// Desde el final: intereses, opcionales, recomendados y la base (Git) al último.
function pickTrimVictim(context: EngineContext, draft: PathDraft): Candidate | null {
  const ordered = orderCandidates(context, draft);
  const canLeave = (candidate: Candidate) => !isNeededByAnother(context, draft, candidate.slug);

  // Un opcional de Fundamentos entró por un interés: se recorta como cualquier opcional.
  const waitsUntilLast = (candidate: Candidate) =>
    candidate.isBase && candidate.origin !== "opcional";

  for (const origin of TRIM_ORDER) {
    for (let index = ordered.length - 1; index >= 0; index--) {
      const candidate = ordered[index];
      if (candidate.origin === origin && !waitsUntilLast(candidate) && canLeave(candidate)) {
        return candidate;
      }
    }
  }

  for (let index = ordered.length - 1; index >= 0; index--) {
    const candidate = ordered[index];
    const isTrimmableBase =
      candidate.isBase && !candidate.isFirstStep && candidate.origin !== "requerido";
    if (isTrimmableBase && canLeave(candidate)) {
      return candidate;
    }
  }

  return null;
}

// Un curso que entró solo porque otro lo necesitaba sale cuando ya nadie lo necesita.
function dropOrphanedPrerequisites(context: EngineContext, draft: PathDraft) {
  let droppedAny = true;
  while (droppedAny) {
    droppedAny = false;
    for (const candidate of [...draft.candidates.values()]) {
      const cameOnlyAsPrerequisite =
        candidate.officialStage === null &&
        !candidate.isBase &&
        candidate.origin !== "interes" &&
        candidate.interestSlug === null;
      if (cameOnlyAsPrerequisite && !isNeededByAnother(context, draft, candidate.slug)) {
        draft.candidates.delete(candidate.slug);
        droppedAny = true;
      }
    }
  }
}

// 8. Recorta hasta que quepa; después regresa lo recortado que vuelva a caber con su base.
function trimToBudget(context: EngineContext, draft: PathDraft) {
  const removed: Candidate[] = [];

  while (sumDraftHours(context, draft) > context.budgetHours) {
    const victim = pickTrimVictim(context, draft);
    if (!victim) {
      break;
    }
    removed.push(victim);
    draft.candidates.delete(victim.slug);
    dropOrphanedPrerequisites(context, draft);
  }

  for (const candidate of removed.reverse()) {
    const fits =
      sumDraftHours(context, draft) + hoursOf(context, candidate.slug) <= context.budgetHours;
    if (fits && hasItsBase(context, draft, candidate.slug)) {
      draft.candidates.set(candidate.slug, candidate);
    } else {
      discardCandidate(context, draft, candidate, DISCARD_REASONS.budget);
    }
  }
}

// 9. Con horas de sobra entran más cursos de cada interés marcado, por turnos.
function addInterestCoursesWithSpareTime(context: EngineContext, draft: PathDraft) {
  const fitsWithItsBase = (courseSlug: string) =>
    sumDraftHours(context, draft) + hoursOf(context, courseSlug) <= context.budgetHours &&
    hasItsBase(context, draft, courseSlug);

  let addedAny = true;
  while (addedAny) {
    addedAny = false;
    for (const interestSlug of context.profile.interests) {
      const nextSlug = interestCoursesOf(context, interestSlug).find(
        (slug) =>
          isAvailable(context, slug) &&
          !draft.candidates.has(slug) &&
          !draft.mastered.has(slug) &&
          fitsWithItsBase(slug),
      );
      if (!nextSlug) {
        continue;
      }
      draft.candidates.set(
        nextSlug,
        newCandidate(nextSlug, { origin: "interes", interestSlug, addedWithSpareTime: true }),
      );
      addedAny = true;
    }
  }
}

// El ancla dice dónde le toca ir a cada curso; depende de las vecinas, por eso va en rondas.
function computeAnchors(context: EngineContext, draft: PathDraft): Map<string, number> {
  const candidates = [...draft.candidates.values()];
  const anchors = new Map<string, number>();
  for (const candidate of candidates) {
    anchors.set(candidate.slug, candidate.officialStage ?? UNANCHORED);
  }
  const anchorOf = (courseSlug: string) => anchors.get(courseSlug) ?? UNANCHORED;

  // Los cursos de la meta en su orden actual: marcan el ritmo de la dificultad.
  const pacingCourses = () =>
    candidates
      .filter((candidate) => candidate.officialStage !== null && !candidate.isFirstStep)
      .sort((a, b) => anchorOf(a.slug) - anchorOf(b.slug));

  const lastProgramAnchor = () => {
    const programAnchors = candidates
      .filter((candidate) => candidate.officialStage !== null)
      .map((candidate) => anchorOf(candidate.slug));
    return Math.max(0, ...programAnchors);
  };

  const afterItsBase = (courseSlug: string) =>
    needsOf(context, courseSlug)
      .filter((prerequisiteSlug) => anchors.has(prerequisiteSlug))
      .map((prerequisiteSlug) => anchorOf(prerequisiteSlug) + 0.1);

  const beforeItsDependents = (courseSlug: string) =>
    candidates
      .filter(
        (dependent) =>
          !waitsForItsBase(dependent) && needsOf(context, dependent.slug).includes(courseSlug),
      )
      .map((dependent) => anchorOf(dependent.slug) - 0.5);

  // Antes del primer curso más difícil de la meta, y siempre después de lo que necesita.
  const byDifficulty = (courseSlug: string) => {
    const pace = pacingCourses();
    const rank = difficultyRankOf(context, courseSlug);
    const harder =
      pace.find((candidate) => difficultyRankOf(context, candidate.slug) > rank) ??
      pace.find(
        (candidate) =>
          candidate.slug !== courseSlug && difficultyRankOf(context, candidate.slug) === rank,
      );
    const anchor = harder ? anchorOf(harder.slug) - 0.25 : lastProgramAnchor() + 1;
    return Math.max(anchor, ...afterItsBase(courseSlug));
  };

  // La base (Git) llega justo después del primer curso no principiante de la meta.
  const afterFirstNonBeginnerCourse = () => {
    const first = pacingCourses().find(
      (candidate) => difficultyRankOf(context, candidate.slug) > 0,
    );
    return first ? anchorOf(first.slug) + 0.25 : lastProgramAnchor() + 1;
  };

  for (let round = 0; round < ANCHOR_ROUNDS; round++) {
    for (const candidate of candidates) {
      const dependents = beforeItsDependents(candidate.slug);
      let anchor: number;

      if (candidate.isFirstStep) {
        anchor = -1;
      } else if (candidate.officialStage !== null && waitsForItsBase(candidate)) {
        anchor = Math.max(candidate.officialStage, ...afterItsBase(candidate.slug));
      } else if (candidate.officialStage !== null) {
        anchor = Math.min(candidate.officialStage, ...dependents);
      } else if (waitsForItsBase(candidate)) {
        anchor = Math.min(byDifficulty(candidate.slug), ...dependents);
      } else if (candidate.isBase) {
        anchor = Math.min(afterFirstNonBeginnerCourse(), ...dependents);
      } else if (dependents.length > 0) {
        // Entró porque otro lo necesita: justo antes del primero que lo necesita.
        anchor = Math.min(...dependents);
      } else {
        anchor = byDifficulty(candidate.slug);
      }

      anchors.set(candidate.slug, anchor);
    }
  }

  return anchors;
}

// Topológico por requisitos; entre los que ya pueden ir, ancla, dificultad y horas.
function orderCandidates(context: EngineContext, draft: PathDraft): Candidate[] {
  const anchors = computeAnchors(context, draft);
  const candidates = [...draft.candidates.values()];
  const placed = new Set<string>();
  const ordered: Candidate[] = [];

  const mustComeFirst = (courseSlug: string) =>
    [...needsOf(context, courseSlug), ...bestAfterOf(context, courseSlug)].filter(
      (prerequisiteSlug) => draft.candidates.has(prerequisiteSlug),
    );

  const compareCandidates = (a: Candidate, b: Candidate) =>
    (anchors.get(a.slug) ?? UNANCHORED) - (anchors.get(b.slug) ?? UNANCHORED) ||
    difficultyRankOf(context, a.slug) - difficultyRankOf(context, b.slug) ||
    hoursOf(context, a.slug) - hoursOf(context, b.slug);

  while (ordered.length < candidates.length) {
    const ready = candidates.filter(
      (candidate) =>
        !placed.has(candidate.slug) &&
        mustComeFirst(candidate.slug).every((prerequisiteSlug) => placed.has(prerequisiteSlug)),
    );

    // Solo con un ciclo en los requisitos (el panel no lo deja crear).
    if (ready.length === 0) {
      ordered.push(...candidates.filter((candidate) => !placed.has(candidate.slug)));
      break;
    }

    const [next] = ready.sort(compareCandidates);
    ordered.push(next);
    placed.add(next.slug);
  }

  return ordered;
}

// 10. Etapas 1..N: comparten etapa solo cursos de la misma etapa oficial que no se piden entre sí.
function assignStages(context: EngineContext, ordered: Candidate[]): BuiltStep[] {
  const stages: Candidate[][] = [];
  let previousGroupKey: string | null = null;

  for (const candidate of ordered) {
    const groupKey =
      candidate.officialStage !== null && !candidate.isFirstStep
        ? `${candidate.programSlug}:${candidate.officialStage}`
        : null;
    const currentStage = stages.at(-1);
    const dependsOnCurrentStage =
      currentStage?.some(
        (member) =>
          needsOf(context, candidate.slug).includes(member.slug) ||
          bestAfterOf(context, candidate.slug).includes(member.slug),
      ) ?? false;

    if (
      currentStage &&
      groupKey !== null &&
      groupKey === previousGroupKey &&
      !dependsOnCurrentStage
    ) {
      currentStage.push(candidate);
    } else {
      stages.push([candidate]);
    }
    previousGroupKey = groupKey;
  }

  return stages.flatMap((stageCandidates, stageIndex) =>
    stageCandidates.map((candidate, index) => ({
      courseSlug: candidate.slug,
      sourceProgramSlug: candidate.programSlug,
      stage: stageIndex + 1,
      position: stageCandidates.length > 1 ? index + 1 : 0,
      origin: candidate.origin,
      reason: composeReason(context, candidate),
    })),
  );
}

// Un curso aparece una sola vez en "Qué quitamos", y nunca si al final quedó en la ruta.
function collectDiscardedSteps(draft: PathDraft): DiscardedStep[] {
  const seenSlugs = new Set<string>();
  const discarded: DiscardedStep[] = [];

  for (const discard of draft.discards) {
    if (draft.candidates.has(discard.slug) || seenSlugs.has(discard.slug)) {
      continue;
    }
    seenSlugs.add(discard.slug);
    discarded.push({
      courseSlug: discard.slug,
      sourceProgramSlug: discard.programSlug,
      stage: discard.stage,
      position: 0,
      origin: discard.origin,
      reason: discard.reason,
      discardReason: discard.discardReason,
    });
  }

  return discarded;
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

export function computeBudgetHours(profile: LearnerProfile): number {
  const availableWeeks = Math.round(profile.deadlineMonths * WEEKS_PER_MONTH);
  return availableWeeks * profile.hoursPerWeek;
}

export function buildPath(
  profile: LearnerProfile,
  catalog: CatalogCourse[],
  programs: ProgramInput[],
  rules: EngineRules,
): BuiltPath {
  const goal = requireGoal(profile.goal);
  const context: EngineContext = {
    profile,
    goal,
    coursesBySlug: new Map(catalog.map((course) => [course.slug, course])),
    programsBySlug: new Map(programs.map((program) => [program.slug, program])),
    rules,
    budgetHours: computeBudgetHours(profile),
  };

  const { mastered, silentlyMastered } = collectMasteredCourses(context);
  const draft: PathDraft = { candidates: new Map(), mastered, discards: [] };

  const deferredOptionalSteps: DeferredOptionalStep[] = [];
  if (profile.level === "empiezo_de_cero") {
    deferredOptionalSteps.push(...addBeginnerBase(context, draft));
  }
  deferredOptionalSteps.push(...addGoalPrograms(context, draft));

  dropMasteredCourses(context, draft, silentlyMastered);
  pullRequiredPrerequisites(context, draft);
  addOptionalSteps(context, draft, deferredOptionalSteps);
  addInterestCourses(context, draft);
  trimToBudget(context, draft);
  addInterestCoursesWithSpareTime(context, draft);

  const steps = assignStages(context, orderCandidates(context, draft));
  const discarded = collectDiscardedSteps(draft);

  const totalHours = sumDraftHours(context, draft);
  const fitsInBudget = totalHours <= context.budgetHours;
  const overflowHours = fitsInBudget ? 0 : totalHours - context.budgetHours;

  const { title, summary } = composeTitleAndSummary({
    goal,
    budgetHours: context.budgetHours,
    totalHours,
    totalSteps: steps.length,
    fitsInBudget,
  });

  return {
    goal: profile.goal,
    title,
    summary,
    // Copia: `goal.programSlugs` es el array de la tabla GOALS, y quien reciba el resultado no
    // tiene por qué saber que mutarlo corrompe la tabla para el resto del proceso.
    mergedProgramSlugs: [...goal.programSlugs],
    budgetHours: context.budgetHours,
    totalHours,
    fitsInBudget,
    overflowHours,
    steps,
    discarded,
  };
}
