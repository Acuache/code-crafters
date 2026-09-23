import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("createAdminClient", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;

  afterEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SECRET_KEY = originalSecret;
  });

  it("rejects missing administrative credentials without leaking values", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SECRET_KEY;
    const { createAdminClient } = await import("./admin");

    expect(() => createAdminClient()).toThrow(
      "Falta la configuración administrativa de Supabase en el servidor.",
    );
  });
});
