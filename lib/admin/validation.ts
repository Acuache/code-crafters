import { z } from "zod";

// Los ids de courses, programs y program_courses son `bigint identity`.
export const databaseIdSchema = z.number().int().positive();

export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}
