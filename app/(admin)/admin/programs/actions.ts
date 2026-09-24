"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { describePostgresError } from "@/lib/admin/postgres-errors";
import { programSchema } from "@/lib/admin/program-schema";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

import type { AdminActionResult } from "../courses/actions";

const idSchema = z.number().int().positive();

// En la edición el slug no se valida ni se escribe: queda fijo una vez creado.
const programUpdateSchema = programSchema.omit({ slug: true });

const PROGRAM_NOT_FOUND: AdminActionResult = {
  ok: false,
  message: "No encontramos ese programa. Recargá la página.",
};

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisá los datos del formulario.";
}

function revalidateProgramPages() {
  revalidatePath("/admin/programs", "page");
  revalidatePath("/admin/programs/[slug]", "page");
  revalidatePath("/admin/courses/[slug]", "page");
}

// Sin DELETE a propósito (ver Decisiones del spec 10): path_steps.source_program_id es
// `on delete set null`, y borrar un programa desarmaría la agrupación de las rutas viejas.
export async function createProgram(input: unknown): Promise<AdminActionResult> {
  await requireAdmin();

  const parsedInput = programSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, message: firstIssueMessage(parsedInput.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("programs").insert({
    slug: parsedInput.data.slug,
    // source_slug es la entrada de data/programs.json de donde salió el seed; un programa creado
    // desde el panel no sale de ninguna, así que se toma a sí mismo como origen.
    source_slug: parsedInput.data.slug,
    name: parsedInput.data.name,
    position: parsedInput.data.position,
  });

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }

  revalidateProgramPages();
  redirect(`/admin/programs/${encodeURIComponent(parsedInput.data.slug)}`);
}

export async function updateProgram(
  programId: unknown,
  input: unknown,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsedId = idSchema.safeParse(programId);
  if (!parsedId.success) {
    return PROGRAM_NOT_FOUND;
  }

  const parsedInput = programUpdateSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, message: firstIssueMessage(parsedInput.error) };
  }

  const supabase = await createClient();
  const { data: updatedRows, error } = await supabase
    .from("programs")
    .update({ name: parsedInput.data.name, position: parsedInput.data.position })
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    return { ok: false, message: describePostgresError(error) };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return PROGRAM_NOT_FOUND;
  }

  revalidateProgramPages();
  return { ok: true };
}
