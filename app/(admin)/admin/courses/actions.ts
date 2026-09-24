"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  courseSchema,
  courseUpdateSchema,
  type CourseUpdateInput,
} from "@/lib/admin/course-schema";
import type { ActionFailure, ActionResult } from "@/lib/action-result";
import { findEngineReferences, type EngineReference } from "@/lib/admin/engine-references";
import { GENERIC_SAVE_ERROR, describePostgresError } from "@/lib/admin/postgres-errors";
import { placementSchema, type PlacementInput } from "@/lib/admin/program-schema";
import { databaseIdSchema, firstIssueMessage } from "@/lib/admin/validation";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const COURSE_NOT_FOUND: ActionFailure = {
  ok: false,
  message: "No encontramos ese curso. Recarga la página.",
};

const PLACEMENT_NOT_FOUND: ActionFailure = {
  ok: false,
  message: "No encontramos esa ubicación. Recarga la página.",
};

// Las páginas del panel usan el slug en la URL, y hay slugs con tildes o mayúsculas: se revalida
// el patrón de la ruta (todas las páginas de cursos / programas) en vez de armar cada URL literal.
function revalidateCatalogPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/courses/[slug]", "page");
  revalidatePath("/admin/programs", "page");
  revalidatePath("/admin/programs/[slug]", "page");
}

// Columnas de `courses` que escribe el formulario, en snake_case. Sin `slug` (fijo tras crear) ni
// `is_active` (solo lo cambia setCourseActive, que tiene su propio chequeo).
function toCourseColumns(input: CourseUpdateInput) {
  return {
    title: input.title,
    summary: input.summary,
    url: input.url,
    image_url: input.imageUrl,
    instructor: input.instructor,
    hours: input.hours,
    lessons: input.lessons,
    price: input.price,
    is_free: input.isFree,
    is_pro: input.isPro,
    is_new: input.isNew,
    in_construction: input.inConstruction,
    difficulty: input.difficulty,
    outcome: input.outcome,
    areas: input.areas,
    prerequisites: input.prerequisites,
    topics: input.topics,
    outcomes: input.outcomes,
    chapters: input.chapters,
    related: input.related,
  };
}

export async function createCourse(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsedInput = courseSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, message: firstIssueMessage(parsedInput.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .insert({ ...toCourseColumns(parsedInput.data), slug: parsedInput.data.slug })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }

  revalidateCatalogPages();
  // Fuera de cualquier try/catch: redirect() lanza NEXT_REDIRECT para cortar la action.
  redirect(`/admin/courses/${encodeURIComponent(parsedInput.data.slug)}`);
}

export async function updateCourse(courseId: unknown, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = databaseIdSchema.safeParse(courseId);
  if (!parsedId.success) {
    return COURSE_NOT_FOUND;
  }

  // courseUpdateSchema no tiene `slug`: si llega en el input, se descarta al parsear.
  const parsedInput = courseUpdateSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, message: firstIssueMessage(parsedInput.error) };
  }

  const supabase = await createClient();
  const { data: updatedRows, error } = await supabase
    .from("courses")
    .update(toCourseColumns(parsedInput.data))
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return COURSE_NOT_FOUND;
  }

  revalidateCatalogPages();
  return { ok: true };
}

function describeEngineReference(reference: EngineReference): string {
  if (reference.kind === "interest") {
    return `el interés «${reference.label}»`;
  }
  return `la tecnología dominable «${reference.label}»`;
}

// Por qué no se puede desactivar: loadCatalog (spec 07) solo carga cursos activos, pero sí todos
// los program_courses, e INTERESTS / TECH_TO_SLUGS (spec 04) nombran slugs fijos. Con cualquiera de
// esas referencias, el motor propondría un curso sin id y generatePath fallaría al insertar.
function describeDeactivationBlockers(
  programNames: string[],
  engineReferences: EngineReference[],
): string | null {
  const blockers: string[] = [];

  if (programNames.length > 0) {
    blockers.push(
      `Está en ${programNames.length === 1 ? "el programa" : "los programas"} ${programNames.join(", ")}: quítalo primero desde «Dónde aparece este curso».`,
    );
  }

  if (engineReferences.length > 0) {
    const referenceList = engineReferences.map(describeEngineReference).join(", ");
    blockers.push(
      `El motor lo usa en ${referenceList}: hay que quitarlo de lib/paths/interests.ts por código.`,
    );
  }

  if (blockers.length === 0) {
    return null;
  }
  return `No se puede desactivar. ${blockers.join(" ")}`;
}

export async function setCourseActive(courseId: unknown, isActive: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = databaseIdSchema.safeParse(courseId);
  const parsedIsActive = z.boolean().safeParse(isActive);
  if (!parsedId.success || !parsedIsActive.success) {
    return COURSE_NOT_FOUND;
  }

  const supabase = await createClient();

  if (!parsedIsActive.data) {
    const { data: course, error: loadError } = await supabase
      .from("courses")
      .select("slug, program_courses(programs(name))")
      .eq("id", parsedId.data)
      .maybeSingle();

    if (loadError) {
      return { ok: false, message: GENERIC_SAVE_ERROR };
    }
    if (!course) {
      return COURSE_NOT_FOUND;
    }

    const programNames = course.program_courses.map((placement) => placement.programs.name);
    const blockers = describeDeactivationBlockers(programNames, findEngineReferences(course.slug));
    if (blockers) {
      return { ok: false, message: blockers };
    }
  }

  const { data: updatedRows, error } = await supabase
    .from("courses")
    .update({ is_active: parsedIsActive.data })
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return COURSE_NOT_FOUND;
  }

  revalidateCatalogPages();
  return { ok: true };
}

// La siguiente posición libre dentro de (programa, etapa, nivel): `position` solo ordena las
// alternativas de un mismo paso, así que el admin no la elige y el unique no choca.
async function findNextPosition(
  supabase: Supabase,
  placement: Pick<PlacementInput, "programId" | "stage" | "level">,
): Promise<number | null> {
  const { data: lastPlacement, error } = await supabase
    .from("program_courses")
    .select("position")
    .eq("program_id", placement.programId)
    .eq("stage", placement.stage)
    .eq("level", placement.level)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }
  return (lastPlacement?.position ?? 0) + 1;
}

export async function addPlacement(courseId: unknown, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = databaseIdSchema.safeParse(courseId);
  if (!parsedId.success) {
    return COURSE_NOT_FOUND;
  }

  const parsedInput = placementSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, message: firstIssueMessage(parsedInput.error) };
  }

  const supabase = await createClient();

  const { data: course, error: loadError } = await supabase
    .from("courses")
    .select("is_active")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (loadError) {
    return { ok: false, message: GENERIC_SAVE_ERROR };
  }
  if (!course) {
    return COURSE_NOT_FOUND;
  }
  // Un curso inactivo en un programa rompería generatePath: loadCatalog no lo carga.
  if (!course.is_active) {
    return { ok: false, message: "Reactiva el curso antes de ubicarlo en un programa." };
  }

  const position = await findNextPosition(supabase, parsedInput.data);
  if (position === null) {
    return { ok: false, message: GENERIC_SAVE_ERROR };
  }

  const { error } = await supabase.from("program_courses").insert({
    program_id: parsedInput.data.programId,
    course_id: parsedId.data,
    stage: parsedInput.data.stage,
    level: parsedInput.data.level,
    position,
    note: parsedInput.data.note,
  });

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }

  revalidateCatalogPages();
  return { ok: true };
}

export async function updatePlacement(placementId: unknown, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = databaseIdSchema.safeParse(placementId);
  if (!parsedId.success) {
    return PLACEMENT_NOT_FOUND;
  }

  const parsedInput = placementSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, message: firstIssueMessage(parsedInput.error) };
  }

  const supabase = await createClient();

  const { data: currentPlacement, error: loadError } = await supabase
    .from("program_courses")
    .select("program_id, stage, level, position")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (loadError) {
    return { ok: false, message: GENERIC_SAVE_ERROR };
  }
  if (!currentPlacement) {
    return PLACEMENT_NOT_FOUND;
  }

  // Si solo cambia la nota, el curso se queda en su lugar dentro del grupo. Si cambia el grupo
  // (programa, etapa o nivel), pasa al final del grupo destino.
  const staysInSameGroup =
    currentPlacement.program_id === parsedInput.data.programId &&
    currentPlacement.stage === parsedInput.data.stage &&
    currentPlacement.level === parsedInput.data.level;

  let position = currentPlacement.position;
  if (!staysInSameGroup) {
    const nextPosition = await findNextPosition(supabase, parsedInput.data);
    if (nextPosition === null) {
      return { ok: false, message: GENERIC_SAVE_ERROR };
    }
    position = nextPosition;
  }

  const { data: updatedRows, error } = await supabase
    .from("program_courses")
    .update({
      program_id: parsedInput.data.programId,
      stage: parsedInput.data.stage,
      level: parsedInput.data.level,
      position,
      note: parsedInput.data.note,
    })
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return PLACEMENT_NOT_FOUND;
  }

  revalidateCatalogPages();
  return { ok: true };
}

// Deja un hueco en las posiciones del grupo: groupProgramCourseRows (spec 07) ordena por
// `position` sin exigir que sean contiguas.
export async function removePlacement(placementId: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = databaseIdSchema.safeParse(placementId);
  if (!parsedId.success) {
    return PLACEMENT_NOT_FOUND;
  }

  const supabase = await createClient();
  const { data: deletedRows, error } = await supabase
    .from("program_courses")
    .delete()
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }
  if (!deletedRows || deletedRows.length === 0) {
    return PLACEMENT_NOT_FOUND;
  }

  revalidateCatalogPages();
  return { ok: true };
}
