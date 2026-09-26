import { describe, expect, it } from "vitest";

import { placementSchema, programSchema } from "./program-schema";

describe("programSchema", () => {
  it("acepta un programa válido", () => {
    const result = programSchema.safeParse({ slug: "svelte", name: "Svelte", position: 16 });

    expect(result.success).toBe(true);
  });

  it("rechaza un slug que no es kebab-case y una posición menor que 1", () => {
    expect(programSchema.safeParse({ slug: "Svelte", name: "Svelte", position: 1 }).success).toBe(
      false,
    );
    expect(programSchema.safeParse({ slug: "svelte", name: "Svelte", position: 0 }).success).toBe(
      false,
    );
  });
});

describe("placementSchema", () => {
  it("una nota vacía se guarda como null", () => {
    const result = placementSchema.parse({
      programId: 3,
      stage: 2,
      level: "requerido",
      note: "   ",
    });

    expect(result.note).toBeNull();
  });

  it("rechaza un nivel desconocido y una etapa no entera", () => {
    expect(
      placementSchema.safeParse({ programId: 3, stage: 2, level: "obligatorio", note: null })
        .success,
    ).toBe(false);
    expect(
      placementSchema.safeParse({ programId: 3, stage: 1.5, level: "opcional", note: null })
        .success,
    ).toBe(false);
  });
});
