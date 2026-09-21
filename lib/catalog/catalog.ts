// Acceso a datos del catálogo (SPEC 07): dos queries a Supabase (cursos activos; program_courses
// con el slug del programa y del curso embebidos) más las funciones puras que traducen esas filas
// al contrato del motor de reglas (CatalogCourse[] / ProgramInput[], spec 04) y a los mapas
// slug → id que generatePath() necesita para insertar path_steps. Vive en lib/, no en
// app/(app)/paths/: es acceso a datos reutilizable, del mismo tipo que lib/supabase/* — no
// propiedad del motor puro (lib/paths/*, spec 04), que no hace ningún I/O.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CatalogCourse, ProgramInput, ProgramStepInput } from "@/lib/paths/types";

type Supabase = SupabaseClient<Database>;

type ProgramCourseLevel = "requerido" | "recomendado" | "opcional";

// Una fila por curso activo — de acá salen CatalogCourse[] y el mapa slug → id de cursos.
type CourseRow = {
  id: number;
  slug: string;
  hours: number; // numeric(5,1) en Postgres; PostgREST puede devolverlo como string, se normaliza con Number()
  difficulty: "principiante" | "intermedio" | "avanzado";
  outcome: string;
};

// Una fila por cada program_courses, ya aplanada — la forma que produce flattenProgramCourseRows a
// partir de la respuesta cruda de Supabase (RawProgramCourseRow, abajo).
export type ProgramCourseRow = {
  programSlug: string;
  stage: number;
  level: ProgramCourseLevel;
  position: number;
  note: string | null;
  courseSlug: string;
};

// Forma cruda que devuelve PostgREST: `programs`/`courses` llegan anidados (así es como Supabase
// embebe relaciones). `programs` trae también `id` — ProgramCourseRow no lo declara porque
// groupProgramCourseRows no lo necesita, pero buildProgramIdMap sí, y lo lee de esta forma cruda
// (antes de aplanar) en vez de ensanchar el tipo público sólo para ese mapa aparte.
type RawProgramCourseRow = {
  stage: number;
  level: ProgramCourseLevel;
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

const LEVEL_RANK: Record<ProgramCourseLevel, number> = {
  requerido: 0,
  recomendado: 1,
  opcional: 2,
};

// Agrupa por programSlug y, dentro de cada programa, por (stage, level) — la clave que garantiza
// unique (program_id, stage, level, position) del spec 02. Verificado contra la base real (select
// program_id, stage, level, count(*) from program_courses group by 1,2,3 having count(*) > 1): da
// exactamente 7 grupos, con posiciones consecutivas 1..N en cada uno — los mismos 7 pasos con
// alternativas que documentó el spec 04, ninguno es un choque entre dos pasos distintos. Las filas
// de un mismo grupo se ordenan por `position` para convertirse en `courseSlugs`. Los pasos
// resultantes se ordenan por `stage` asc y, dentro del mismo `stage`, por LEVEL_RANK — necesario
// porque `stage` se repite dentro de una misma ruta en 10 de las 15 rutas, y sin un segundo
// criterio el orden dependería del orden de llegada de la query. Los programas del resultado se
// ordenan por `slug` para que el resultado no dependa tampoco del orden en que aparecieron las
// filas de programas distintos.
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
      return LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
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

// Punto de entrada que usa generatePath() (spec 07): las dos queries en paralelo, traducidas al
// contrato del motor de reglas más los dos mapas slug → id que hacen falta para insertar
// path_steps.
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
