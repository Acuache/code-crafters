import type { ProgramLevel, StepOrigin } from "./types";

export const PROGRAM_LEVELS = [
  "requerido",
  "recomendado",
  "opcional",
] as const satisfies readonly ProgramLevel[];

// Orden de estudio dentro de una misma etapa: lo requerido va primero.
export const PROGRAM_LEVEL_ORDER: Record<ProgramLevel, number> = {
  requerido: 0,
  recomendado: 1,
  opcional: 2,
};

export const STEP_ORIGINS: readonly StepOrigin[] = [...PROGRAM_LEVELS, "interes"];

// `path_steps.origin` es `text` en Postgres, así que el tipo generado es `string`.
export function isStepOrigin(value: string): value is StepOrigin {
  return STEP_ORIGINS.some((origin) => origin === value);
}
