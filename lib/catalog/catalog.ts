// Carga el catálogo y las reglas del motor desde Supabase y los traduce al contrato del motor de
// reglas (lib/paths), que es puro y no hace I/O. También arma los mapas slug → id que
// generatePath() necesita para insertar.

import type { SupabaseClient } from "@supabase/supabase-js";

import { PROGRAM_LEVEL_ORDER } from "@/lib/paths/levels";
import type {
  CatalogCourse,
  EngineRules,
  ProgramInput,
  ProgramLevel,
  ProgramStepInput,
} from "@/lib/paths/types";
import type { Database } from "@/lib/supabase/database.types";

type Supabase = SupabaseClient<Database>;

type CourseRow = {
  id: number;
  slug: string;
  title: string;
  hours: number;
  difficulty: "principiante" | "intermedio" | "avanzado";
  outcome: string;
  in_construction: boolean;
};

export type ProgramCourseRow = {
  programSlug: string;
  programName: string;
  stage: number;
  level: ProgramLevel;
  position: number;
  note: string | null;
  courseSlug: string;
};

// Como llega de PostgREST, con las relaciones anidadas. buildProgramIdMap lee `programs.id` de acá
// para no ensanchar ProgramCourseRow solo por ese mapa.
type RawProgramCourseRow = {
  stage: number;
  level: ProgramLevel;
  position: number;
  note: string | null;
  programs: { id: number; slug: string; name: string };
  courses: { slug: string };
};

export type PrerequisiteRow = {
  courseSlug: string;
  prerequisiteSlug: string;
  kind: "necesita" | "conviene";
};

export type InterestCourseRow = {
  interestSlug: string;
  courseSlug: string;
  position: number;
};

async function fetchActiveCourses(supabase: Supabase): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, hours, difficulty, outcome, in_construction")
    .eq("is_active", true);

  if (error) {
    throw new Error(`No se pudieron cargar los cursos: ${error.message}`);
  }

  return data ?? [];
}

async function fetchRawProgramCourseRows(supabase: Supabase): Promise<RawProgramCourseRow[]> {
  const { data, error } = await supabase
    .from("program_courses")
    .select("stage, level, position, note, programs(id, slug, name), courses(slug)");

  if (error) {
    throw new Error(`No se pudieron cargar los programas: ${error.message}`);
  }

  return data ?? [];
}

// course_prerequisites tiene dos FK a courses: el alias y `!columna` eligen cuál es cuál.
async function fetchPrerequisiteRows(supabase: Supabase): Promise<PrerequisiteRow[]> {
  const { data, error } = await supabase
    .from("course_prerequisites")
    .select(
      "kind, course:courses!course_id(slug), prerequisite:courses!prerequisite_course_id(slug)",
    );

  if (error) {
    throw new Error(`No se pudieron cargar los requisitos entre cursos: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    courseSlug: row.course.slug,
    prerequisiteSlug: row.prerequisite.slug,
    kind: row.kind,
  }));
}

async function fetchInterestCourseRows(supabase: Supabase): Promise<InterestCourseRow[]> {
  const { data, error } = await supabase
    .from("interest_courses")
    .select("interest_slug, position, courses(slug)");

  if (error) {
    throw new Error(`No se pudieron cargar los cursos de los intereses: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    interestSlug: row.interest_slug,
    courseSlug: row.courses.slug,
    position: row.position,
  }));
}

function flattenProgramCourseRows(rows: RawProgramCourseRow[]): ProgramCourseRow[] {
  return rows.map((row) => ({
    programSlug: row.programs.slug,
    programName: row.programs.name,
    stage: row.stage,
    level: row.level,
    position: row.position,
    note: row.note,
    courseSlug: row.courses.slug,
  }));
}

function mapCourseRowsToCatalog(rows: CourseRow[]): CatalogCourse[] {
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    // numeric(5,1): Number() asegura que las horas se sumen y no se concatenen.
    hours: Number(row.hours),
    difficulty: row.difficulty,
    inConstruction: row.in_construction,
    outcome: row.outcome,
  }));
}

function buildCourseIdMap(rows: CourseRow[]): Record<string, number> {
  const courseIds: Record<string, number> = {};
  for (const row of rows) {
    courseIds[row.slug] = row.id;
  }
  return courseIds;
}

function buildProgramIdMap(rows: RawProgramCourseRow[]): Record<string, number> {
  const programIds: Record<string, number> = {};
  for (const row of rows) {
    programIds[row.programs.slug] = row.programs.id;
  }
  return programIds;
}

// Un paso del programa es un grupo (stage, level): sus filas son alternativas, ordenadas por
// `position`. Los pasos se ordenan por stage y después por nivel, porque un mismo stage puede tener
// cursos de varios niveles; y los programas por slug, para que el resultado no dependa del orden en
// que llegan las filas.
export function groupProgramCourseRows(rows: ProgramCourseRow[]): ProgramInput[] {
  const rowsByProgram = new Map<string, Map<string, ProgramCourseRow[]>>();
  const programNames = new Map<string, string>();

  for (const row of rows) {
    programNames.set(row.programSlug, row.programName);

    let groups = rowsByProgram.get(row.programSlug);
    if (!groups) {
      groups = new Map();
      rowsByProgram.set(row.programSlug, groups);
    }

    const groupKey = `${row.stage}::${row.level}`;
    const group = groups.get(groupKey);
    if (group) {
      group.push(row);
    } else {
      groups.set(groupKey, [row]);
    }
  }

  const programs: ProgramInput[] = [];

  for (const [programSlug, groups] of rowsByProgram) {
    const steps: ProgramStepInput[] = [...groups.values()].map((groupRows) => {
      const sortedByPosition = [...groupRows].sort((a, b) => a.position - b.position);
      const [firstRow] = sortedByPosition;

      return {
        stage: firstRow.stage,
        level: firstRow.level,
        note: firstRow.note,
        courseSlugs: sortedByPosition.map((row) => row.courseSlug),
      };
    });

    steps.sort((a, b) => {
      if (a.stage !== b.stage) {
        return a.stage - b.stage;
      }
      return PROGRAM_LEVEL_ORDER[a.level] - PROGRAM_LEVEL_ORDER[b.level];
    });

    const name = programNames.get(programSlug) ?? programSlug;
    programs.push({ slug: programSlug, name, steps });
  }

  programs.sort((a, b) => a.slug.localeCompare(b.slug));

  return programs;
}

// Filas sueltas → reglas por curso y por interés, ordenadas por `position`.
export function buildEngineRules(
  prerequisiteRows: PrerequisiteRow[],
  interestCourseRows: InterestCourseRow[],
): EngineRules {
  const rules: EngineRules = { prerequisites: {}, interestCourses: {} };

  for (const row of prerequisiteRows) {
    rules.prerequisites[row.courseSlug] ??= { needs: [], bestAfter: [] };
    const coursePrerequisites = rules.prerequisites[row.courseSlug];
    if (row.kind === "necesita") {
      coursePrerequisites.needs.push(row.prerequisiteSlug);
    } else {
      coursePrerequisites.bestAfter.push(row.prerequisiteSlug);
    }
  }

  const sortedInterestRows = [...interestCourseRows].sort((a, b) => a.position - b.position);
  for (const row of sortedInterestRows) {
    rules.interestCourses[row.interestSlug] ??= [];
    rules.interestCourses[row.interestSlug].push(row.courseSlug);
  }

  return rules;
}

export type LoadedCatalog = {
  catalog: CatalogCourse[];
  programs: ProgramInput[];
  rules: EngineRules;
  courseIds: Record<string, number>;
  programIds: Record<string, number>;
};

export async function loadCatalog(supabase: Supabase): Promise<LoadedCatalog> {
  const [courseRows, rawProgramCourseRows, prerequisiteRows, interestCourseRows] =
    await Promise.all([
      fetchActiveCourses(supabase),
      fetchRawProgramCourseRows(supabase),
      fetchPrerequisiteRows(supabase),
      fetchInterestCourseRows(supabase),
    ]);

  return {
    catalog: mapCourseRowsToCatalog(courseRows),
    programs: groupProgramCourseRows(flattenProgramCourseRows(rawProgramCourseRows)),
    rules: buildEngineRules(prerequisiteRows, interestCourseRows),
    courseIds: buildCourseIdMap(courseRows),
    programIds: buildProgramIdMap(rawProgramCourseRows),
  };
}
