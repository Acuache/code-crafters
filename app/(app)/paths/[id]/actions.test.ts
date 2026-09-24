import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/guards", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { normalizeTimezone, validateAttemptInput } from "@/lib/quizzes/action-validation";

describe("quiz actions input boundaries", () => {
  it("normalizes an invalid IANA timezone to UTC", () => {
    expect(normalizeTimezone("Mars/Olympus")).toBe("UTC");
    expect(normalizeTimezone("America/Guayaquil")).toBe("America/Guayaquil");
  });

  it("rejects malformed answers before database access", () => {
    expect(validateAttemptInput({
      quizId: "550e8400-e29b-41d4-a716-446655440000",
      pathId: "550e8400-e29b-41d4-a716-446655440001",
      pathStepId: "550e8400-e29b-41d4-a716-446655440002",
      answers: [0, 4],
      timezone: "UTC",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440003",
    }).success).toBe(false);
  });
});
