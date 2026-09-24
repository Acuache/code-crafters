import { describe, expect, it } from "vitest";

import { buildPersonalizationSchema, MAX_TITLE_LENGTH } from "./personalization-schema";

const schema = buildPersonalizationSchema(["javascript-moderno", "react-de-cero"]);

const validResponse = {
  title: "De JavaScript a React en 6 meses",
  summary: "Una ruta para pasar de las bases de JavaScript a construir apps con React.",
  reasons: [
    { courseSlug: "javascript-moderno", reason: "Es la base que necesitas antes de React." },
    { courseSlug: "react-de-cero", reason: "Es el corazón de tu meta de frontend." },
  ],
};

describe("buildPersonalizationSchema", () => {
  it("acepta una respuesta válida", () => {
    expect(schema.safeParse(validResponse).success).toBe(true);
  });

  it("rechaza un courseSlug que no está en la ruta", () => {
    const response = {
      ...validResponse,
      reasons: [{ courseSlug: "angular-de-cero", reason: "Un curso que el motor no eligió." }],
    };

    expect(schema.safeParse(response).success).toBe(false);
  });

  it(`rechaza un título de ${MAX_TITLE_LENGTH + 1} caracteres`, () => {
    const response = { ...validResponse, title: "a".repeat(MAX_TITLE_LENGTH + 1) };

    expect(schema.safeParse(response).success).toBe(false);
  });

  it("rechaza una razón vacía o de solo espacios", () => {
    const response = {
      ...validResponse,
      reasons: [{ courseSlug: "react-de-cero", reason: "   " }],
    };

    expect(schema.safeParse(response).success).toBe(false);
  });

  it("acepta un reasons que omite pasos de la ruta", () => {
    const response = { ...validResponse, reasons: [validResponse.reasons[0]] };

    expect(schema.safeParse(response).success).toBe(true);
  });
});
