import { describe, expect, it } from "vitest";

import { parseNextPath } from "@/lib/supabase/next-path";

import { landingCtas } from "./cta";

describe("landingCtas", () => {
  it("sin sesión, la cabecera lleva al login y el primario al cuestionario después del login", () => {
    const ctas = landingCtas(false);

    expect(ctas.header).toEqual({ label: "Entrar", href: "/login" });
    expect(ctas.primary).toEqual({ label: "Arma tu ruta", href: "/login?next=/quiz" });
  });

  it("con sesión, los dos llevan al panel", () => {
    const ctas = landingCtas(true);

    expect(ctas.header).toEqual({ label: "Ir a mi panel", href: "/dashboard" });
    expect(ctas.primary).toEqual({ label: "Ir a mi panel", href: "/dashboard" });
  });

  it("el login acepta el next del botón primario", () => {
    const primaryUrl = new URL(landingCtas(false).primary.href, "http://localhost");

    expect(parseNextPath(primaryUrl.searchParams.get("next"))).toBe("/quiz");
  });
});
