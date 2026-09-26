// Estado del recorrido "Cómo funciona" de la landing: qué estación ya pasó, cuál está en pantalla y
// hasta dónde va relleno el riel.

export type StationState = "visited" | "current" | "upcoming";

export function stationState(index: number, currentIndex: number): StationState {
  if (index < currentIndex) {
    return "visited";
  }

  if (index === currentIndex) {
    return "current";
  }

  return "upcoming";
}

// Qué fracción del riel (del primer al último nodo) va rellena hasta el nodo actual. Con un solo
// nodo, o con centros iguales, devuelve 0.
export function railFillRatio(nodeCenters: readonly number[], currentIndex: number): number {
  if (nodeCenters.length < 2) {
    return 0;
  }

  const firstCenter = nodeCenters[0];
  const railLength = nodeCenters[nodeCenters.length - 1] - firstCenter;
  if (railLength <= 0) {
    return 0;
  }

  const lastIndex = nodeCenters.length - 1;
  const clampedIndex = Math.min(Math.max(currentIndex, 0), lastIndex);

  return (nodeCenters[clampedIndex] - firstCenter) / railLength;
}
