// Geometría del mapa. Los nodos y los conectores SVG salen de las mismas coordenadas, sin medir el
// DOM: no hay saltos de layout al hidratar.

// En px. Ancho fijo: cabe en un móvil de 360 px con 16 px de margen y el SVG no se deforma.
export const TRACK_WIDTH = 320;
export const NODE_SIZE = 64;
export const LABEL_WIDTH = 128;
// Nodo + título de dos líneas + aire hasta el siguiente nodo.
export const ROW_HEIGHT = 128;
// Espacio para el globo "Empezar"/"Continuar" sobre el primer nodo, sin pisar el banner.
export const TRACK_PADDING_TOP = 48;

// El título, lo más ancho del nodo, nunca se sale de la pista.
export const MAX_OFFSET = (TRACK_WIDTH - LABEL_WIDTH) / 2;

// Ida y vuelta en fracciones de MAX_OFFSET: centro → derecha → centro → izquierda → centro.
const ZIGZAG_PATTERN = [0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5] as const;

export type NodePosition = { x: number; y: number };

// `firstStepNumber` hace que el zigzag siga de una unidad a la otra en vez de reiniciarse.
export function computeNodePositions(count: number, firstStepNumber: number): NodePosition[] {
  const positions: NodePosition[] = [];

  for (let index = 0; index < count; index++) {
    const patternIndex = (firstStepNumber - 1 + index) % ZIGZAG_PATTERN.length;
    const horizontalOffset = ZIGZAG_PATTERN[patternIndex] * MAX_OFFSET;

    positions.push({
      x: TRACK_WIDTH / 2 + horizontalOffset,
      y: TRACK_PADDING_TOP + NODE_SIZE / 2 + index * ROW_HEIGHT,
    });
  }

  return positions;
}

export function trackHeight(count: number): number {
  return TRACK_PADDING_TOP + count * ROW_HEIGHT;
}

// Curva con tangentes verticales: sale hacia abajo de un nodo y entra desde arriba en el
// siguiente, como un camino y no como una diagonal.
export function buildSegmentPath(from: NodePosition, to: NodePosition): string {
  const middleY = (from.y + to.y) / 2;

  return `M ${from.x} ${from.y} C ${from.x} ${middleY}, ${to.x} ${middleY}, ${to.x} ${to.y}`;
}
