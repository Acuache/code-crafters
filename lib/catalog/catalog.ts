// Carga el catálogo desde Supabase y lo traduce al contrato del motor de reglas (lib/paths), que es
// puro y no hace I/O. También arma los mapas slug → id que generatePath() necesita para insertar.

import type { SupabaseClient } from "@supabase/supabase-js";

import { PROGRAM_LEVEL_ORDER } from "@/lib/paths/levels";
import type {
  CatalogCourse,
  ProgramInput,
  ProgramLevel,
  ProgramStepInput,
} from "@/lib/paths/types";
import type { Database } from "@/lib/supabase/database.types";

type Supabase = SupabaseClient<Database>;

type CourseRow = {
  id: number;
  slug: string;
  hours: number;
  difficulty: "principiante" | "intermedio" | "avanzado";
  outcome: string;
};

export type ProgramCourseRow = {
  programSlug: string;
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
  programs: { id: number; slug: string };
  courses: { slug: string };
};

async function fetchActiveCourses(supabase: Supabase): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, hours, difficulty, outcome")
    .eq("is_active", true);

  if (error) {
    throw new Error(`No se pudieron cargar los cursos: ${error.message}`);
  }

  return data ?? [];
}

async function fetchRawProgramCourseRows(supabase: Supabase): Promise<RawProgramCourseRow[]> {
  const { data, error } = await supabase
    .from("program_courses")
    .select("stage, level, position, note, programs(id, slug), courses(slug)");

  if (error) {
    throw new Error(`No se pudieron cargar los programas: ${error.message}`);
  }

  return data ?? [];
}

function flattenProgramCourseRows(rows: RawProgramCourseRow[]): ProgramCourseRow[] {
  return rows.map((row) => ({
    programSlug: row.programs.slug,
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
    // numeric(5,1): Number() asegura que las horas se sumen y no se concatenen.
    hours: Number(row.hours),
    difficulty: row.difficulty,
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

  for (const row of rows) {
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

    programs.push({ slug: programSlug, steps });
  }

  programs.sort((a, b) => a.slug.localeCompare(b.slug));

  return programs;
}

export type LoadedCatalog = {
  catalog: CatalogCourse[];
  programs: ProgramInput[];
  courseIds: Record<string, number>;
  programIds: Record<string, number>;
};

export async function loadCatalog(supabase: Supabase): Promise<LoadedCatalog> {
  const [courseRows, rawProgramCourseRows] = await Promise.all([
    fetchActiveCourses(supabase),
    fetchRawProgramCourseRows(supabase),
  ]);

  return {
    catalog: mapCourseRowsToCatalog(courseRows),
    programs: groupProgramCourseRows(flattenProgramCourseRows(rawProgramCourseRows)),
    courseIds: buildCourseIdMap(courseRows),
    programIds: buildProgramIdMap(rawProgramCourseRows),
  };
}
