import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { setPathSharing } from "./share-actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/guards", () => ({ requireUser: vi.fn().mockResolvedValue({}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const PATH_ID = "3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b";

type UpdateResult = { data: { id: string }[] | null; error: { message: string } | null };

// Imita la cadena from().update().eq().select() que usa la action.
function mockSupabase(updateResult: UpdateResult) {
  const select = vi.fn().mockResolvedValue(updateResult);
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  // El mock solo implementa lo que usa la action, no todo el cliente de Supabase.
  vi.mocked(createClient).mockResolvedValue({ from } as unknown as Awaited<
    ReturnType<typeof createClient>
  >);
  return { update, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setPathSharing", () => {
  it("rechaza un id que no es uuid sin tocar la base", async () => {
    const result = await setPathSharing("no-es-uuid", true);

    expect(result).toEqual({ ok: false, message: "No encontramos esa ruta. Recarga la página." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rechaza una visibilidad que no es booleana", async () => {
    const result = await setPathSharing(PATH_ID, "true");

    expect(result.ok).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("publica la ruta del dueño y revalida su página", async () => {
    const { update, eq } = mockSupabase({ data: [{ id: PATH_ID }], error: null });

    const result = await setPathSharing(PATH_ID, true);

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ is_public: true });
    expect(eq).toHaveBeenCalledWith("id", PATH_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/paths/${PATH_ID}`);
  });

  it("una ruta ajena o inexistente (cero filas) es no encontrada", async () => {
    mockSupabase({ data: [], error: null });

    const result = await setPathSharing(PATH_ID, false);

    expect(result).toEqual({ ok: false, message: "No encontramos esa ruta. Recarga la página." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("si la base falla, pide probar de nuevo sin mostrar el error de Postgres", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSupabase({ data: null, error: { message: "internal error" } });

    const result = await setPathSharing(PATH_ID, true);

    expect(result).toEqual({
      ok: false,
      message: "No pudimos cambiar la visibilidad. Prueba de nuevo.",
    });
  });
});
