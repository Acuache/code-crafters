import type { CSSProperties } from "react";

// Aparece cuando el astronauta llega a la estación. Solo actúa con data-reached="false", que Journey
// pone con JS y movimiento permitido: sin eso, el mockup se ve terminado.
export const FADE_IN_ON_ARRIVAL =
  "transition duration-500 ease-out group-data-[reached=false]/station:translate-y-2 group-data-[reached=false]/station:opacity-0";

// Cuánto espera después de la llegada (--arrival-delay lo define Journey con TRAVEL_DURATION_MS).
export function afterArrival(extraMs: number): CSSProperties {
  return { transitionDelay: `calc(var(--arrival-delay) + ${extraMs}ms)` };
}
