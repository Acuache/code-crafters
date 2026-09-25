import { describe, expect, it } from "vitest";

import { parseNextPath } from "./next-path";

describe("parseNextPath", () => {
  it.each([
    ["una ruta compartida", "/shared/feedfacecafe0001"],
    ["una ruta con query", "/paths/abc?vista=lista"],
    ["el dashboard", "/dashboard"],
  ])("acepta %s", (_case, value) => {
    expect(parseNextPath(value)).toBe(value);
  });

  it.each([
    ["una URL externa", "https://evil.com"],
    ["una URL sin esquema", "//evil.com"],
    ["una barra invertida", "/\\evil.com"],
    ["un tab que el navegador borra", "/\t/evil.com"],
    ["un esquema javascript", "javascript:alert(1)"],
    ["una ruta relativa", "dashboard"],
    ["un texto vacío", ""],
    ["un texto demasiado largo", `/${"a".repeat(200)}`],
    ["algo que no es texto", ["/dashboard"]],
    ["undefined", undefined],
  ])("rechaza %s", (_case, value) => {
    expect(parseNextPath(value)).toBeNull();
  });
});
