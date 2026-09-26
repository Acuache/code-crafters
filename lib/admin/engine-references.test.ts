import { describe, expect, it } from "vitest";

import { findEngineReferences, isProgramReachable } from "./engine-references";

describe("findEngineReferences", () => {
  it("encuentra un curso que usa un interés", () => {
    expect(findEngineReferences("patrones-diseno")).toEqual([
      { kind: "interest", interestSlug: "patrones-diseno", label: "Patrones de diseño" },
    ]);
  });

  it("encuentra un curso que usa una tecnología dominable", () => {
    expect(findEngineReferences("react-de-cero")).toEqual([
      { kind: "technology", technology: "react", label: "React" },
    ]);
  });

  it("devuelve las dos referencias cuando un curso está en un interés y en una tecnología", () => {
    const kinds = findEngineReferences("docker-guia-practica").map((reference) => reference.kind);

    expect(kinds).toEqual(["interest", "technology"]);
  });

  it("devuelve [] para un curso que el motor no nombra", () => {
    expect(findEngineReferences("nextjs")).toEqual([]);
  });
});

describe("isProgramReachable", () => {
  it("fundamentos es alcanzable aunque ninguna meta lo nombre", () => {
    expect(isProgramReachable("fundamentos")).toBe(true);
  });

  it("un programa que nombra alguna meta es alcanzable", () => {
    expect(isProgramReachable("react")).toBe(true);
  });

  it("dart-web no es alcanzable (fuera de GOALS a propósito, spec 04)", () => {
    expect(isProgramReachable("dart-web")).toBe(false);
  });

  it("un slug inventado no es alcanzable", () => {
    expect(isProgramReachable("programa-inventado")).toBe(false);
  });
});
