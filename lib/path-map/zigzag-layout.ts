// Geometría del mapa de la ruta (spec 12). Funciones puras: los nodos (posicionados en absoluto)
// y los conectores SVG salen de las mismas coordenadas, sin medir el DOM, así que no hay saltos
// de layout al hidratar y todo se puede testear sin navegador.

// Medidas en px. La pista tiene ancho fijo y se centra: cabe en un móvil de 360 px
// (360 − 2 × 16 de gutter = 328 ≥ 320) y el SVG no se deforma en pantallas anchas.
export const TRACK_WIDTH = 320;
export const NODE_SIZE = 64;
export const LABEL_WIDTH = 128;
// Nodo + título de dos líneas + aire hasta el siguiente nodo.
export const ROW_HEIGHT = 128;
// Espacio arriba del primer nodo de cada unidad para el globo "Empezar"/"Continuar", que se
// dibuja encima del nodo y no debe pisar el banner.
export const TRACK_PADDING_TOP = 48;

// Máximo desplazamiento horizontal desde el centro: el título, el elemento más ancho del nodo,
// nunca se sale de la pista.
export const MAX_OFFSET = (TRACK_WIDTH - LABEL_WIDTH) / 2;

// Ida y vuelta en fracciones de MAX_OFFSET: centro → derecha → centro → izquierda → centro.
const ZIGZAG_PATTERN = [0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5] as const;

// Centro del nodo dentro de la pista.
export type NodePosition = { x: number; y: number };

/**
 * Posición de cada nodo de una unidad. `firstStepNumber` es el número corrido (1..N) del primer
 * paso de la unidad: el zigzag sigue su patrón a través de las unidades en vez de reiniciarse
 * en cada banner.
 */
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

/**
 * `d` de una curva cúbica entre dos centros de nodo. Las dos tangentes son verticales (los
 * puntos de control comparten la `y` del medio), así la línea sale hacia abajo de un nodo y
 * entra desde arriba en el siguiente, como un camino y no como una diagonal.
 */
export function buildSegmentPath(from: NodePosition, to: NodePosition): string {
  const middleY = (from.y + to.y) / 2;

  return `M ${from.x} ${from.y} C ${from.x} ${middleY}, ${to.x} ${middleY}, ${to.x} ${to.y}`;
}
