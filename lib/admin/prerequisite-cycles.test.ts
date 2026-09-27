import { describe, expect, it } from "vitest";

import { wouldCreateCycle } from "./prerequisite-cycles";

const JAVASCRIPT = 1;
const REACT = 2;
const NEXTJS = 3;
const TYPESCRIPT = 4;

// Next.js pide React, y React pide JavaScript.
const edges = [
  { courseId: REACT, prerequisiteCourseId: JAVASCRIPT },
  { courseId: NEXTJS, prerequisiteCourseId: REACT },
];

describe("wouldCreateCycle", () => {
  it("detecta un ciclo directo", () => {
    expect(wouldCreateCycle(edges, { courseId: JAVASCRIPT, prerequisiteCourseId: REACT })).toBe(
      true,
    );
  });

  it("detecta un ciclo indirecto", () => {
    expect(wouldCreateCycle(edges, { courseId: JAVASCRIPT, prerequisiteCourseId: NEXTJS })).toBe(
      true,
    );
  });

  it("un curso no puede pedirse a sí mismo", () => {
    expect(wouldCreateCycle(edges, { courseId: REACT, prerequisiteCourseId: REACT })).toBe(true);
  });

  it("deja agregar un requisito que no cierra ningún ciclo", () => {
    expect(wouldCreateCycle(edges, { courseId: NEXTJS, prerequisiteCourseId: TYPESCRIPT })).toBe(
      false,
    );
    expect(wouldCreateCycle(edges, { courseId: NEXTJS, prerequisiteCourseId: JAVASCRIPT })).toBe(
      false,
    );
  });
});
