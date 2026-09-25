"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionFailure } from "@/lib/action-result";
import { isValidShareSlug } from "@/lib/sharing/shared-path";
import { createClient } from "@/lib/supabase/server";

// copy_shared_path lanza P0002 si la ruta no existe o su autor la dejó de compartir.
const PATH_UNAVAILABLE_CODE = "P0002";

const PATH_UNAVAILABLE: ActionFailure = {
  ok: false,
  message: "Esta ruta ya no está disponible.",
};

// Copia la ruta compartida a la cuenta de quien la mira y lo lleva a su copia. Si ya la tenía, la
// RPC devuelve la existente; si es su propia ruta, la original. Solo vuelve si falla.
export async function copySharedPath(slug: unknown): Promise<ActionFailure> {
  if (typeof slug !== "string" || !isValidShareSlug(slug)) {
    return PATH_UNAVAILABLE;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // Sin sesión, o si venció con la página abierta: después del login vuelve al link.
  if (!data?.claims) {
    redirect(`/login?next=/shared/${slug}`);
  }

  const { data: copiedPathId, error } = await supabase.rpc("copy_shared_path", { p_slug: slug });

  if (error) {
    if (error.code === PATH_UNAVAILABLE_CODE) {
      return PATH_UNAVAILABLE;
    }

    console.error(`[sharing] copySharedPath: ${error.message}`);
    return { ok: false, message: "No pudimos crear tu copia. Prueba de nuevo." };
  }

  revalidatePath("/dashboard");
  redirect(`/paths/${copiedPathId}`);
}
