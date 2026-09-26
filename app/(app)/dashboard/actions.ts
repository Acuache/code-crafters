"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionFailure, ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

const pathIdSchema = z.uuid();

const PATH_NOT_FOUND: ActionFailure = {
  ok: false,
  message: "No encontramos esa ruta. Recarga la página.",
};

// Endpoint público: RLS (`learning_paths` por dueño) ya descarta las rutas de otro usuario, así que
// cero filas borradas cubre a la vez "ajena" e "inexistente". Los `path_steps` se van por el
// `on delete cascade` del spec 02; la fila de `assessments` se conserva a propósito.
export async function deletePath(pathId: unknown): Promise<ActionResult> {
  const parsedId = pathIdSchema.safeParse(pathId);

  if (!parsedId.success) {
    return PATH_NOT_FOUND;
  }

  await requireUser();
  const supabase = await createClient();

  const { data: deletedRows, error } = await supabase
    .from("learning_paths")
    .delete()
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    return { ok: false, message: "No se pudo eliminar la ruta. Prueba de nuevo." };
  }

  if (!deletedRows || deletedRows.length === 0) {
    return PATH_NOT_FOUND;
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
