import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { EXAMPLE_COURSES, EXAMPLE_DISCARDED } from "./example-path";

type RawCourse = { slug: string; title: string; hours: number };

// Fixture, no fuente de runtime: el ejemplo de la landing no puede prometer un curso que no existe.
const catalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "courses.json"), "utf8"),
) as RawCourse[];

const catalogBySlug = new Map(catalog.map((course) => [course.slug, course]));

describe("ruta de ejemplo de la landing", () => {
  it.each([...EXAMPLE_COURSES, ...EXAMPLE_DISCARDED])(
    "$slug existe en el catálogo con el mismo título y las mismas horas",
    (exampleCourse) => {
      const catalogCourse = catalogBySlug.get(exampleCourse.slug);

      expect(catalogCourse).toBeDefined();
      expect(exampleCourse.title).toBe(catalogCourse?.title);
      expect(exampleCourse.hours).toBe(catalogCourse?.hours);
    },
  );

  it("los cursos activos tienen un origen válido del motor", () => {
    const validOrigins = ["requerido", "recomendado", "opcional", "interes"];

    for (const exampleCourse of EXAMPLE_COURSES) {
      expect(validOrigins).toContain(exampleCourse.origin);
    }
  });

  it("el curso quitado usa el motivo que escribe el motor para una tecnología dominada", () => {
    expect(EXAMPLE_DISCARDED.map((course) => course.discardReason)).toEqual(["ya lo dominas"]);
  });
});
