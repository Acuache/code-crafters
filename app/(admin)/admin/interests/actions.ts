"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionFailure, ActionResult } from "@/lib/action-result";
import { GENERIC_SAVE_ERROR, describePostgresError } from "@/lib/admin/postgres-errors";
import { databaseIdSchema } from "@/lib/admin/validation";
import { INTERESTS } from "@/lib/paths/interests";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

// Qué cursos sugiere cada interés y en qué orden (spec 17); las etiquetas siguen en código.

type Supabase = Awaited<ReturnType<typeof createClient>>;

const NOT_FOUND: ActionFailure = {
  ok: false,
  message: "No encontramos ese interés o ese curso. Recarga la página.",
};

const interestSlugSchema = z.string().refine((slug) => Object.hasOwn(INTERESTS, slug));
const directionSchema = z.enum(["up", "down"]);

function revalidateInterestPages() {
  revalidatePath("/admin/interests");
  revalidatePath("/admin/courses/[slug]", "page");
}

async function loadInterestRows(supabase: Supabase, interestSlug: string) {
  const { data, error } = await supabase
    .from("interest_courses")
    .select("course_id, position")
    .eq("interest_slug", interestSlug)
    .order("position")
    .order("course_id");

  if (error) {
    return null;
  }
  return data ?? [];
}

export async function addInterestCourse(
  interestSlug: unknown,
  courseId: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedSlug = interestSlugSchema.safeParse(interestSlug);
  const parsedCourseId = databaseIdSchema.safeParse(courseId);
  if (!parsedSlug.success || !parsedCourseId.success) {
    return NOT_FOUND;
  }

  const supabase = await createClient();
  const [rows, courseResult] = await Promise.all([
    loadInterestRows(supabase, parsedSlug.data),
    supabase.from("courses").select("is_active").eq("id", parsedCourseId.data).maybeSingle(),
  ]);

  if (!rows || courseResult.error) {
    return { ok: false, message: GENERIC_SAVE_ERROR };
  }
  if (!courseResult.data) {
    return NOT_FOUND;
  }
  // Un curso inactivo no llega al motor: sugerirlo no tendría efecto.
  if (!courseResult.data.is_active) {
    return { ok: false, message: "Reactiva el curso antes de sumarlo a un interés." };
  }

  const lastPosition = Math.max(0, ...rows.map((row) => row.position));
  const { error } = await supabase.from("interest_courses").insert({
    interest_slug: parsedSlug.data,
    course_id: parsedCourseId.data,
    position: lastPosition + 1,
  });

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }

  revalidateInterestPages();
  return { ok: true };
}

export async function removeInterestCourse(
  interestSlug: unknown,
  courseId: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedSlug = interestSlugSchema.safeParse(interestSlug);
  const parsedCourseId = databaseIdSchema.safeParse(courseId);
  if (!parsedSlug.success || !parsedCourseId.success) {
    return NOT_FOUND;
  }

  const supabase = await createClient();
  const { data: deletedRows, error } = await supabase
    .from("interest_courses")
    .delete()
    .eq("interest_slug", parsedSlug.data)
    .eq("course_id", parsedCourseId.data)
    .select("course_id");

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }
  if (!deletedRows || deletedRows.length === 0) {
    return NOT_FOUND;
  }

  revalidateInterestPages();
  return { ok: true };
}

// Intercambia con el vecino y renumera 1..N, por si quedaron huecos o posiciones repetidas.
export async function moveInterestCourse(
  interestSlug: unknown,
  courseId: unknown,
  direction: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedSlug = interestSlugSchema.safeParse(interestSlug);
  const parsedCourseId = databaseIdSchema.safeParse(courseId);
  const parsedDirection = directionSchema.safeParse(direction);
  if (!parsedSlug.success || !parsedCourseId.success || !parsedDirection.success) {
    return NOT_FOUND;
  }

  const supabase = await createClient();
  const rows = await loadInterestRows(supabase, parsedSlug.data);
  if (!rows) {
    return { ok: false, message: GENERIC_SAVE_ERROR };
  }

  const index = rows.findIndex((row) => row.course_id === parsedCourseId.data);
  if (index === -1) {
    return NOT_FOUND;
  }

  const neighborIndex = parsedDirection.data === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= rows.length) {
    return { ok: true };
  }

  const reordered = [...rows];
  [reordered[index], reordered[neighborIndex]] = [reordered[neighborIndex], reordered[index]];

  for (const [newIndex, row] of reordered.entries()) {
    const newPosition = newIndex + 1;
    if (row.position === newPosition) {
      continue;
    }
    const { error } = await supabase
      .from("interest_courses")
      .update({ position: newPosition })
      .eq("interest_slug", parsedSlug.data)
      .eq("course_id", row.course_id);

    if (error) {
      return { ok: false, message: describePostgresError(error) };
    }
  }

  revalidateInterestPages();
  return { ok: true };
}
