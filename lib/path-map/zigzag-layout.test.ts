import { describe, expect, it } from "vitest";

import {
  buildSegmentPath,
  computeNodePositions,
  LABEL_WIDTH,
  MAX_OFFSET,
  NODE_SIZE,
  ROW_HEIGHT,
  TRACK_PADDING_TOP,
  TRACK_WIDTH,
  trackHeight,
} from "./zigzag-layout";

const TRACK_CENTER = TRACK_WIDTH / 2;

function offsetsFromCenter(firstStepNumber: number, count: number): number[] {
  return computeNodePositions(count, firstStepNumber).map(
    (position) => (position.x - TRACK_CENTER) / MAX_OFFSET,
  );
}

describe("computeNodePositions", () => {
  it("desde el paso 1, los primeros 8 nodos siguen el patrón de ida y vuelta", () => {
    expect(offsetsFromCenter(1, 8)).toEqual([0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5]);
  });

  it("el patrón se repite después del octavo nodo", () => {
    expect(offsetsFromCenter(1, 10).slice(8)).toEqual([0, 0.5]);
  });

  it("una unidad que empieza en el paso 4 continúa el zigzag en vez de reiniciarlo", () => {
    expect(offsetsFromCenter(4, 3)).toEqual([0.5, 0, -0.5]);
  });

  it("ningún título se sale de la pista, para cualquier cantidad de pasos", () => {
    const positions = computeNodePositions(40, 1);

    for (const position of positions) {
      expect(position.x - LABEL_WIDTH / 2).toBeGreaterThanOrEqual(0);
      expect(position.x + LABEL_WIDTH / 2).toBeLessThanOrEqual(TRACK_WIDTH);
    }
  });

  it("las y crecen de a una fila y dejan lugar arriba para el globo", () => {
    const positions = computeNodePositions(3, 1);

    expect(positions.map((position) => position.y)).toEqual([
      TRACK_PADDING_TOP + NODE_SIZE / 2,
      TRACK_PADDING_TOP + NODE_SIZE / 2 + ROW_HEIGHT,
      TRACK_PADDING_TOP + NODE_SIZE / 2 + 2 * ROW_HEIGHT,
    ]);
  });

  it("sin pasos no hay nodos", () => {
    expect(computeNodePositions(0, 1)).toEqual([]);
  });
});

describe("trackHeight", () => {
  it("alcanza para el último nodo y su título", () => {
    const [lastPosition] = computeNodePositions(5, 1).slice(-1);

    expect(trackHeight(5)).toBeGreaterThanOrEqual(lastPosition.y + NODE_SIZE / 2);
  });
});

describe("buildSegmentPath", () => {
  it("empieza en el primer nodo y termina en el segundo", () => {
    const path = buildSegmentPath({ x: 160, y: 80 }, { x: 208, y: 208 });

    expect(path.startsWith("M 160 80 ")).toBe(true);
    expect(path.endsWith(" 208 208")).toBe(true);
  });

  it("los puntos de control comparten la y del medio (tangentes verticales)", () => {
    expect(buildSegmentPath({ x: 160, y: 80 }, { x: 208, y: 208 })).toBe(
      "M 160 80 C 160 144, 208 144, 208 208",
    );
  });
});
