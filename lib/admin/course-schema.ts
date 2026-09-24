// Schema del curso del panel de administración (SPEC 10). Lo comparten el formulario (cliente,
// vía zodResolver) y las server actions (servidor): por eso cada preprocesado es idempotente —
// acepta tanto lo que produce el formulario (texto del textarea, "" en un input vacío, NaN de un
// input numérico vacío) como el valor ya normalizado que la action vuelve a validar.

import { z } from "zod";

// El mismo host que autoriza `images.remotePatterns` en next.config.ts (spec 08): una portada de
// otro dominio rompería el <Image> de /paths/[id].
export const THINKIFIC_IMAGE_HOST = "import.cdn.thinkific.com";

// kebab-case en minúsculas. Solo se exige al crear: hay slugs heredados del scraping que no lo
// cumplen (p. ej. "PHP-moderno", "NestJS-Testing") y no se pueden renombrar (ver Decisiones).
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const COURSE_DIFFICULTIES = ["principiante", "intermedio", "avanzado"] as const;

export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Los parámetros de estos preprocesados están tipados con lo que manda el formulario: de ahí zod
// infiere el tipo de entrada del schema (z.input), que es el tipo de los valores de
// react-hook-form. En runtime el servidor recibe `unknown`, por eso cada uno chequea el tipo real y
// deja pasar lo que no reconoce para que el schema de adentro lo rechace.

export function blankToNull(value: string | null): string | null {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}

// Un input numérico vacío llega como NaN con `valueAsNumber` de react-hook-form.
function emptyNumberToNull(value: number | null): number | null {
  if (typeof value === "number" && Number.isNaN(value)) {
    return null;
  }
  return value;
}

// El formulario manda el texto del textarea; la action vuelve a validar el arreglo ya parseado.
function linesToArray(value: string | string[]): string[] {
  if (typeof value === "string") {
    return parseLines(value);
  }
  if (Array.isArray(value)) {
    return parseLines(value.join("\n"));
  }
  return value;
}

const slugSchema = z
  .string()
  .regex(SLUG_PATTERN, { error: "Usa minúsculas, números y guiones (ej. react-avanzado)." });

const lineListSchema = z.preprocess(linesToArray, z.array(z.string()));

const optionalTextSchema = z.preprocess(blankToNull, z.string().trim().nullable());

export const courseSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, { error: "El título es obligatorio." }),
  summary: optionalTextSchema,
  url: z.url({ protocol: /^https$/, error: "Pega una URL https válida." }),
  imageUrl: z.preprocess(
    blankToNull,
    z
      .url({
        protocol: /^https$/,
        hostname: /^import\.cdn\.thinkific\.com$/,
        error: `La portada tiene que ser una URL https de ${THINKIFIC_IMAGE_HOST}.`,
      })
      .nullable(),
  ),
  instructor: optionalTextSchema,
  hours: z
    .number({ error: "Indica las horas del curso." })
    .positive({ error: "Las horas tienen que ser mayores que 0." })
    .max(9999.9, { error: "Como máximo 9999,9 horas." }),
  lessons: z
    .number({ error: "Indica la cantidad de lecciones." })
    .int({ error: "Las lecciones son un número entero." })
    .nonnegative({ error: "Las lecciones no pueden ser negativas." }),
  price: z.preprocess(
    emptyNumberToNull,
    z
      .number({ error: "El precio tiene que ser un número." })
      .nonnegative({ error: "El precio no puede ser negativo." })
      .max(9999.99, { error: "Como máximo 9999,99." })
      .nullable(),
  ),
  isFree: z.boolean(),
  isPro: z.boolean(),
  isNew: z.boolean(),
  inConstruction: z.boolean(),
  // El Select arranca vacío (""): se pasa a null para que el error sea "Elige una dificultad.".
  difficulty: z.preprocess(
    blankToNull,
    z.enum(COURSE_DIFFICULTIES, { error: "Elige una dificultad." }),
  ),
  outcome: z.string().trim().min(1, { error: "Escribe qué logra el alumno al terminarlo." }),
  areas: lineListSchema,
  prerequisites: lineListSchema,
  topics: lineListSchema,
  outcomes: lineListSchema,
  chapters: lineListSchema,
  related: lineListSchema,
});

// La edición no valida ni manda el slug: queda fijo una vez creado, y así un slug heredado que no
// es kebab-case no bloquea editar el resto del curso. Al ser un z.object sin `slug`, un slug que
// llegue igual en el input se descarta al parsear.
export const courseUpdateSchema = courseSchema.omit({ slug: true });

export type CourseFormValues = z.input<typeof courseSchema>;
export type CourseInput = z.output<typeof courseSchema>;
export type CourseUpdateInput = z.output<typeof courseUpdateSchema>;
