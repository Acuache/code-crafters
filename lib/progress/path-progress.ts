import type { Enums } from "@/lib/supabase/database.types";

export type PathStepStatus = Enums<"path_step_status">;

// Motivo con el que se guarda un paso que el usuario quitó a mano (la frase del ADR 0004). Es lo
// único que lo distingue de un descarte del motor sin una columna nueva, así que restoreStep
// filtra por este mismo valor en el servidor.
export const USER_DISCARD_REASON = "lo quitaste vos";

// Forma mínima que necesita el cálculo: el spec 09 la arma desde su propia query sin depender de
// la forma que usa la vista de una ruta.
export type ProgressStep = {
  status: PathStepStatus;
  hours: number;
};

export type PathProgress = {
  activeHours: number;
  doneHours: number;
  percentDone: number;
  activeCount: number;
  doneCount: number;
  fitsInBudget: boolean;
  overflowHours: number;
};

/**
 * Avance de una ruta medido en horas: los pasos descartados no cuentan, y `in_progress` no suma
 * a lo hecho porque "en curso" no dice cuánto falta. `fitsInBudget`/`overflowHours` se derivan acá
 * porque `learning_paths` no los persiste (spec 07).
 */
export function summarizePathProgress(
  steps: ProgressStep[],
  budgetHours: number | null,
): PathProgress {
  let activeHours = 0;
  let doneHours = 0;
  let activeCount = 0;
  let doneCount = 0;

  for (const step of steps) {
    if (step.status === "discarded") {
      continue;
    }

    activeHours += step.hours;
    activeCount += 1;

    if (step.status === "done") {
      doneHours += step.hours;
      doneCount += 1;
    }
  }

  // Redondeo a un decimal: las horas son numeric(5,1) y sumar floats como 8.5 + 6.5 + 0.1 deja
  // residuos del tipo 15.100000000000001 que no deben llegar a la pantalla.
  activeHours = roundToOneDecimal(activeHours);
  doneHours = roundToOneDecimal(doneHours);

  const percentDone = activeHours === 0 ? 0 : Math.round((doneHours / activeHours) * 100);

  if (budgetHours === null) {
    return {
      activeHours,
      doneHours,
      percentDone,
      activeCount,
      doneCount,
      fitsInBudget: true,
      overflowHours: 0,
    };
  }

  const overflowHours = roundToOneDecimal(Math.max(0, activeHours - budgetHours));

  return {
    activeHours,
    doneHours,
    percentDone,
    activeCount,
    doneCount,
    fitsInBudget: overflowHours === 0,
    overflowHours,
  };
}

export function isUserDiscarded(step: {
  status: PathStepStatus;
  discardReason: string | null;
}): boolean {
  return step.status === "discarded" && step.discardReason === USER_DISCARD_REASON;
}

// Locale fijo: la vista se renderiza en el servidor y se hidrata en el navegador, y sin locale
// explícito cada entorno podría formatear el decimal distinto ("15.5" vs "15,5").
export function formatHours(hours: number): string {
  return `${hours.toLocaleString("es-ES", { maximumFractionDigits: 1 })} h`;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
