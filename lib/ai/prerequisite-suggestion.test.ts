import { describe, expect, it } from "vitest";

import {
  buildPrerequisiteSuggestionPrompt,
  buildPrerequisiteSuggestionSchema,
  MAX_SUGGESTIONS,
} from "./prerequisite-suggestion";

describe("buildPrerequisiteSuggestionSchema", () => {
  const schema = buildPrerequisiteSuggestionSchema([
    "javascript-moderno",
    "typescript-guia-completa",
  ]);

  it("acepta cursos de la lista", () => {
    const parsed = schema.safeParse({
      suggestions: [{ courseSlug: "javascript-moderno", kind: "necesita", reason: "Lo pide." }],
    });

    expect(parsed.success).toBe(true);
  });

  it("rechaza un curso que no está en la lista", () => {
    const parsed = schema.safeParse({
      suggestions: [{ courseSlug: "curso-inventado", kind: "necesita", reason: "Lo pide." }],
    });

    expect(parsed.success).toBe(false);
  });

  it(`rechaza más de ${MAX_SUGGESTIONS} sugerencias`, () => {
    const suggestion = { courseSlug: "javascript-moderno", kind: "conviene", reason: "Ayuda." };
    const parsed = schema.safeParse({
      suggestions: Array.from({ length: MAX_SUGGESTIONS + 1 }, () => suggestion),
    });

    expect(parsed.success).toBe(false);
  });
});

describe("buildPrerequisiteSuggestionPrompt", () => {
  it("incluye el texto del instructor y solo los cursos candidatos", () => {
    const { prompt } = buildPrerequisiteSuggestionPrompt({
      course: {
        slug: "Astro",
        title: "Astro",
        difficulty: "intermedio",
        prerequisitesText: ["Conocimientos de TypeScript."],
      },
      candidates: [
        { slug: "typescript-guia-completa", title: "TypeScript", difficulty: "intermedio" },
      ],
    });

    expect(prompt).toContain("- Conocimientos de TypeScript.");
    expect(prompt).toContain("- typescript-guia-completa: TypeScript (intermedio)");
  });

  it("avisa cuando el instructor no escribió requisitos", () => {
    const { prompt } = buildPrerequisiteSuggestionPrompt({
      course: {
        slug: "vscode",
        title: "VS Code",
        difficulty: "principiante",
        prerequisitesText: [],
      },
      candidates: [],
    });

    expect(prompt).toContain("el instructor no escribió requisitos");
  });
});
