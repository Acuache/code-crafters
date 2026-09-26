import { describe, expect, it } from "vitest";

import { railFillRatio, stationState } from "./journey-state";

describe("stationState", () => {
  it("las estaciones de arriba de la actual ya se visitaron", () => {
    expect(stationState(0, 2)).toBe("visited");
  });

  it("la estación en pantalla es la actual", () => {
    expect(stationState(2, 2)).toBe("current");
  });

  it("las de abajo todavía no llegan", () => {
    expect(stationState(4, 2)).toBe("upcoming");
  });
});

describe("railFillRatio", () => {
  const centers = [100, 300, 500, 700, 900];

  it("con un solo nodo no hay riel que rellenar", () => {
    expect(railFillRatio([100], 0)).toBe(0);
  });

  it("con todos los centros iguales no hay riel que rellenar", () => {
    expect(railFillRatio([100, 100], 1)).toBe(0);
  });

  it("en el primer nodo el riel va vacío", () => {
    expect(railFillRatio(centers, 0)).toBe(0);
  });

  it("en un nodo del medio va relleno hasta ese nodo", () => {
    expect(railFillRatio(centers, 2)).toBe(0.5);
  });

  it("en el último nodo va lleno", () => {
    expect(railFillRatio(centers, 4)).toBe(1);
  });

  it("usa la posición real de cada nodo, no su número", () => {
    expect(railFillRatio([0, 100, 400], 1)).toBe(0.25);
  });

  it("un índice fuera de rango se queda en el borde", () => {
    expect(railFillRatio(centers, 9)).toBe(1);
    expect(railFillRatio(centers, -1)).toBe(0);
  });
});
