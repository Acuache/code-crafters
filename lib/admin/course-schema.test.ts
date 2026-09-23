import { describe, expect, it } from "vitest";

import { courseSchema, parseLines, type CourseFormValues } from "./course-schema";

// Lo que manda el formulario para un curso válido: arreglos como texto del textarea, opcionales
// vacíos como "".
function validFormValues(overrides: Partial<CourseFormValues> = {}): CourseFormValues {
  return {
    slug: "react-avanzado",
    title: "React avanzado",
    summary: "",
    url: "https://cursos.devtalles.com/courses/react-avanzado",
    imageUrl: "",
    instructor: "Fernando Herrera",
    hours: 12.5,
    lessons: 80,
    price: Number.NaN,
    isFree: false,
    isPro: true,
    isNew: true,
    inConstruction: false,
    difficulty: "avanzado",
    outcome: "Construye apps de React listas para producción.",
    areas: "frontend",
    prerequisites: "React\n\nTypeScript",
    topics: "",
    outcomes: "",
    chapters: "",
    related: "",
    ...overrides,
  };
}

describe("parseLines", () => {
  it("recorta cada línea y descarta las vacías", () => {
    expect(parseLines("  React  \n\n   \nNext.js\n")).toEqual(["React", "Next.js"]);
  });

  it("acepta saltos de línea de Windows (\\r\\n)", () => {
    expect(parseLines("React\r\nNext.js\r\n\r\n")).toEqual(["React", "Next.js"]);
  });

  it("un texto vacío da un arreglo vacío", () => {
    expect(parseLines("")).toEqual([]);
  });
});

describe("courseSchema", () => {
  it("acepta un curso válido y normaliza vacíos a null y textareas a arreglos", () => {
    const result = courseSchema.safeParse(validFormValues());

    expect(result.success).toBe(true);
    expect(result.data?.imageUrl).toBeNull();
    expect(result.data?.summary).toBeNull();
    expect(result.data?.price).toBeNull();
    expect(result.data?.prerequisites).toEqual(["React", "TypeScript"]);
    expect(result.data?.topics).toEqual([]);
  });

  it("volver a validar la salida da la misma salida (el servidor revalida lo del cliente)", () => {
    const firstPass = courseSchema.parse(validFormValues());
    const secondPass = courseSchema.parse(firstPass);

    expect(secondPass).toEqual(firstPass);
  });

  it("rechaza un slug que no es kebab-case", () => {
    for (const slug of ["React-Avanzado", "react_avanzado", "react avanzado", "-react", ""]) {
      expect(courseSchema.safeParse(validFormValues({ slug })).success).toBe(false);
    }
  });

  it("rechaza hours menor o igual a 0", () => {
    expect(courseSchema.safeParse(validFormValues({ hours: 0 })).success).toBe(false);
    expect(courseSchema.safeParse(validFormValues({ hours: -3 })).success).toBe(false);
    expect(courseSchema.safeParse(validFormValues({ hours: Number.NaN })).success).toBe(false);
  });

  it("rechaza una image_url de otro host", () => {
    const result = courseSchema.safeParse(
      validFormValues({ imageUrl: "https://example.com/portada.png" }),
    );

    expect(result.success).toBe(false);
  });

  it("acepta una image_url del CDN de Thinkific", () => {
    const result = courseSchema.safeParse(
      validFormValues({ imageUrl: "https://import.cdn.thinkific.com/123/portada.png" }),
    );

    expect(result.success).toBe(true);
  });

  it("rechaza una url que no es URL o no es https", () => {
    expect(courseSchema.safeParse(validFormValues({ url: "no es una url" })).success).toBe(false);
    expect(
      courseSchema.safeParse(validFormValues({ url: "http://cursos.devtalles.com/x" })).success,
    ).toBe(false);
  });
});
