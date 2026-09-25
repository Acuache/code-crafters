"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionFailure, ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

const pathIdSchema = z.uuid();
const isPublicSchema = z.boolean();

const PATH_NOT_FOUND: ActionFailure = {
  ok: false,
  message: "No encontramos esa ruta. Recarga la página.",
};

const SHARING_FAILED: ActionFailure = {
  ok: false,
  message: "No pudimos cambiar la visibilidad. Prueba de nuevo.",
};

// Publica o vuelve privada una ruta (spec 15). El link no cambia: share_slug es fijo. RLS
// (`learning_paths` por dueño) descarta las rutas ajenas, así que cero filas es "no encontrada".
export async function setPathSharing(pathId: unknown, isPublic: unknown): Promise<ActionResult> {
  const parsedId = pathIdSchema.safeParse(pathId);
  if (!parsedId.success) {
    return PATH_NOT_FOUND;
  }

  const parsedIsPublic = isPublicSchema.safeParse(isPublic);
  if (!parsedIsPublic.success) {
    return SHARING_FAILED;
  }

  await requireUser();
  const supabase = await createClient();

  const { data: updatedRows, error } = await supabase
    .from("learning_paths")
    .update({ is_public: parsedIsPublic.data })
    .eq("id", parsedId.data)
    .select("id");

  if (error) {
    console.error(`[sharing] setPathSharing: ${error.message}`);
    return SHARING_FAILED;
  }

  if (!updatedRows || updatedRows.length === 0) {
    return PATH_NOT_FOUND;
  }

  revalidatePath(`/paths/${parsedId.data}`);
  return { ok: true };
}
