import { describe, expect, it } from "vitest";

import {
  authorHandle,
  authorLabel,
  describePathSize,
  isValidShareSlug,
  sharedPathSchema,
  type SharedPathStep,
} from "./shared-path";

// Lo que devuelve get_shared_path para una visitante sin copia.
const validSharedPath = {
  title: "Ruta IA",
  summary: "Resumen",
  budgetHours: 10,
  isPersonalized: true,
  author: { username: "autora", avatarUrl: null },
  viewer: { isOwner: false, ownPathId: null },
  steps: [
    {
      courseId: 1,
      stage: 1,
      position: 1,
      origin: "requerido",
      reason: "Primero",
      courseTitle: "Curso 1",
      courseHours: 2.5,
      courseUrl: "https://cursos.devtalles.com/courses/curso-1",
      courseImageUrl: null,
      programSlug: "react",
      programName: "React",
    },
  ],
};

describe("isValidShareSlug", () => {
  it("acepta 16 caracteres hex en minúscula", () => {
    expect(isValidShareSlug("feedfacecafe0001")).toBe(true);
  });

  it.each([
    ["vacío", ""],
    ["más corto", "feedfacecafe001"],
    ["más largo", "feedfacecafe00001"],
    ["con mayúsculas", "FEEDFACECAFE0001"],
    ["con caracteres que no son hex", "feedfacecafe000g"],
    ["con una ruta", "../feedfacecafe0"],
  ])("rechaza un slug %s", (_case, slug) => {
    expect(isValidShareSlug(slug)).toBe(false);
  });
});

describe("sharedPathSchema", () => {
  it("acepta el JSON de get_shared_path", () => {
    expect(sharedPathSchema.safeParse(validSharedPath).success).toBe(true);
  });

  it("acepta la copia de la visitante en ownPathId", () => {
    const withCopy = {
      ...validSharedPath,
      viewer: { isOwner: false, ownPathId: "3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b" },
    };

    expect(sharedPathSchema.safeParse(withCopy).success).toBe(true);
  });

  it("rechaza un origen de paso desconocido", () => {
    const unknownOrigin = {
      ...validSharedPath,
      steps: [{ ...validSharedPath.steps[0], origin: "inventado" }],
    };

    expect(sharedPathSchema.safeParse(unknownOrigin).success).toBe(false);
  });

  it("rechaza un JSON sin pasos", () => {
    const withoutSteps: Partial<typeof validSharedPath> = { ...validSharedPath };
    delete withoutSteps.steps;

    expect(sharedPathSchema.safeParse(withoutSteps).success).toBe(false);
  });

  it("rechaza horas que no son número", () => {
    const hoursAsText = { ...validSharedPath, budgetHours: "10" };

    expect(sharedPathSchema.safeParse(hoursAsText).success).toBe(false);
  });
});

describe("authorHandle", () => {
  it.each([
    ["dos nombres y dos apellidos", "YELTSIN MICHAEL ACUACHE YALLE", "yeltsin_acuache"],
    ["un nombre y dos apellidos", "Juan Pérez García", "juan_perez"],
    ["un nombre y un apellido", "María Núñez", "maria_nunez"],
    ["un usuario de Discord", "michael_dev", "michael_dev"],
    ["espacios de más", "  Ana   Torres  ", "ana_torres"],
  ])("con %s", (_case, username, handle) => {
    expect(authorHandle(username)).toBe(handle);
  });

  it("sin nombre, no devuelve nada", () => {
    expect(authorHandle(null)).toBeNull();
    expect(authorHandle("   ")).toBeNull();
  });
});

describe("authorLabel", () => {
  it("nombra al autor con su nombre corto", () => {
    expect(authorLabel({ username: "Ana Torres", avatarUrl: null })).toBe("de ana_torres");
  });

  it("sin username, no inventa un nombre", () => {
    expect(authorLabel({ username: null, avatarUrl: null })).toBe("de alguien de DevPathlles");
  });
});

describe("describePathSize", () => {
  const baseStep: SharedPathStep = { ...validSharedPath.steps[0], origin: "requerido" };

  it("cuenta los cursos y suma sus horas", () => {
    const steps = [
      { ...baseStep, courseHours: 2.5 },
      { ...baseStep, courseId: 2, courseHours: 10 },
    ];

    expect(describePathSize(steps)).toBe("2 cursos · 12,5 h");
  });

  it("usa el singular con un solo curso", () => {
    expect(describePathSize([{ ...baseStep, courseHours: 3 }])).toBe("1 curso · 3 h");
  });
});
