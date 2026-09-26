import type { Enums } from "@/lib/supabase/database.types";

export type PathStepStatus = Enums<"path_step_status">;

// Lo único que distingue un paso quitado a mano de un descarte del motor: restoreStep filtra por
// este mismo texto.
export const USER_DISCARD_REASON = "lo quitaste tú";

// Forma mínima: el dashboard la arma desde su propia query, sin depender de la vista de la ruta.
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

// Avance medido en horas. Los descartados no cuentan, y `in_progress` no suma a lo hecho porque
// "en curso" no dice cuánto falta.
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

  // Sumar floats deja residuos como 15.100000000000001 que no deben llegar a la pantalla.
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

// Locale fijo: servidor y navegador deben formatear igual para que la hidratación coincida.
export function formatHours(hours: number): string {
  return `${hours.toLocaleString("es-ES", { maximumFractionDigits: 1 })} h`;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
