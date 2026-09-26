import { cache } from "react";
import { z } from "zod";

import { STEP_ORIGINS } from "@/lib/paths/levels";
import { formatHours } from "@/lib/progress/path-progress";
import { createClient } from "@/lib/supabase/server";

// 8 bytes aleatorios en hex: el default de learning_paths.share_slug (spec 15).
export const SHARE_SLUG_PATTERN = /^[0-9a-f]{16}$/;

export function isValidShareSlug(slug: string): boolean {
  return SHARE_SLUG_PATTERN.test(slug);
}

const sharedStepSchema = z.object({
  courseId: z.number().int(),
  stage: z.number().int(),
  position: z.number().int(),
  origin: z.enum(STEP_ORIGINS),
  reason: z.string(),
  courseTitle: z.string(),
  courseHours: z.number(),
  courseUrl: z.string(),
  courseImageUrl: z.string().nullable(),
  programSlug: z.string().nullable(),
  programName: z.string().nullable(),
});

// get_shared_path devuelve `Json` sin tipo: se valida en vez de castear.
export const sharedPathSchema = z.object({
  title: z.string(),
  summary: z.string().nullable(),
  budgetHours: z.number().nullable(),
  isPersonalized: z.boolean(),
  author: z.object({
    username: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  viewer: z.object({
    isOwner: z.boolean(),
    ownPathId: z.uuid().nullable(),
  }),
  steps: z.array(sharedStepSchema),
});

export type SharedPath = z.infer<typeof sharedPathSchema>;
export type SharedPathStep = z.infer<typeof sharedStepSchema>;

// El nombre del autor como usuario: "YELTSIN MICHAEL ACUACHE YALLE" → "yeltsin_acuache". El perfil
// guarda el nombre completo que manda el proveedor, y la ruta compartida muestra solo el primer
// nombre y el primer apellido. Con 4 palabras o más se asume nombre, nombre, apellido, apellido; con
// 2 o 3, que el apellido va segundo. Un usuario de Discord (una palabra) queda igual.
export function authorHandle(username: string | null): string | null {
  if (!username) {
    return null;
  }

  const words = username
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== "");

  if (words.length === 0) {
    return null;
  }

  const firstName = words[0];
  if (words.length === 1) {
    return firstName;
  }

  const surname = words.length >= 4 ? words[words.length - 2] : words[1];
  return `${firstName}_${surname}`;
}

// "de yeltsin_acuache", o genérico si el perfil no tiene nombre.
export function authorLabel(author: SharedPath["author"]): string {
  const handle = authorHandle(author.username);
  if (!handle) {
    return "de alguien de DevPathlles";
  }

  return `de ${handle}`;
}

// "3 cursos · 12 h": el tamaño de la ruta, sin el avance del autor.
export function describePathSize(steps: SharedPathStep[]): string {
  const courseCount = steps.length === 1 ? "1 curso" : `${steps.length} cursos`;
  const totalHours = steps.reduce((sum, step) => sum + step.courseHours, 0);

  return `${courseCount} · ${formatHours(totalHours)}`;
}

// Con `cache`, generateMetadata y la página comparten una sola consulta por request.
export const loadSharedPath = cache(async (slug: string): Promise<SharedPath | null> => {
  if (!isValidShareSlug(slug)) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_path", { p_slug: slug });

  // Una falla de la base no es "este link no existe": la muestra app/error.tsx, con reintento.
  if (error) {
    throw new Error(`No se pudo cargar la ruta compartida: ${error.message}`);
  }

  if (data === null) {
    return null;
  }

  const parsed = sharedPathSchema.safeParse(data);
  if (!parsed.success) {
    console.error(`[sharing] loadSharedPath: JSON inválido: ${z.prettifyError(parsed.error)}`);
    return null;
  }

  return parsed.data;
});
