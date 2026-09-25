import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";

import { copySharedPath } from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Como el de Next, redirect corta la action lanzando un error.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

const SLUG = "feedfacecafe0001";
const COPY_ID = "3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b";

type RpcResult = { data: string | null; error: { code: string; message: string } | null };

function mockSupabase({ signedIn, rpcResult }: { signedIn: boolean; rpcResult?: RpcResult }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult ?? { data: COPY_ID, error: null });
  const client = {
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: signedIn ? { claims: { sub: "user" } } : null }),
    },
    rpc,
  };
  // El mock solo implementa lo que usa la action, no todo el cliente de Supabase.
  vi.mocked(createClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>,
  );
  return { rpc };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("copySharedPath", () => {
  it("rechaza un slug con formato inválido sin tocar la base", async () => {
    const result = await copySharedPath("../etc");

    expect(result).toEqual({ ok: false, message: "Esta ruta ya no está disponible." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión, manda al login y vuelve al link", async () => {
    const { rpc } = mockSupabase({ signedIn: false });

    await expect(copySharedPath(SLUG)).rejects.toThrow(`REDIRECT /login?next=/shared/${SLUG}`);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("si la ruta se dejó de compartir, avisa que ya no está disponible", async () => {
    mockSupabase({
      signedIn: true,
      rpcResult: { data: null, error: { code: "P0002", message: "Ruta no disponible" } },
    });

    const result = await copySharedPath(SLUG);

    expect(result).toEqual({ ok: false, message: "Esta ruta ya no está disponible." });
  });

  it("ante otro error de la base, no muestra el texto de Postgres", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSupabase({
      signedIn: true,
      rpcResult: { data: null, error: { code: "XX000", message: "internal error" } },
    });

    const result = await copySharedPath(SLUG);

    expect(result).toEqual({ ok: false, message: "No pudimos crear tu copia. Prueba de nuevo." });
  });

  it("copia la ruta y lleva a la copia", async () => {
    const { revalidatePath } = await import("next/cache");
    const { rpc } = mockSupabase({ signedIn: true });

    await expect(copySharedPath(SLUG)).rejects.toThrow(`REDIRECT /paths/${COPY_ID}`);
    expect(rpc).toHaveBeenCalledWith("copy_shared_path", { p_slug: SLUG });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
