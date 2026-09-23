import { describe, expect, it } from "vitest";

import { getOrCreateQuiz, toSafeQuiz, type QuizRecord, type QuizStore } from "./repository";

const questions = [{ id: "1", prompt: "P", options: ["A", "B", "C", "D"] as [string, string, string, string], correctOption: 0, explanation: "E" }];
const ready: QuizRecord = { id: "quiz-1", title: "Curso", kind: "course", status: "ready", questions, passPercentage: 60, updatedAt: new Date() };

describe("quiz repository", () => {
  it("removes answers and explanations from the client DTO", () => {
    expect(toSafeQuiz(ready).questions).toEqual([{ id: "1", prompt: "P", options: ["A", "B", "C", "D"] }]);
  });

  it("reuses an existing ready quiz without generating", async () => {
    const store: QuizStore = { findActive: async () => ready, claim: async () => { throw new Error("unused"); }, publish: async () => ready, fail: async () => undefined };
    let generated = false;
    const result = await getOrCreateQuiz({ targetKey: "course:1", title: "Curso", kind: "course" }, { store, generate: async () => { generated = true; return { questions }; } });
    expect(result.id).toBe("quiz-1");
    expect(generated).toBe(false);
  });

  it("publishes only the winner of a shared claim", async () => {
    let record: QuizRecord | null = null;
    const store: QuizStore = {
      findActive: async () => record,
      claim: async () => record ? { record, claimed: false } : { record: (record = { ...ready, status: "generating", questions: null }), claimed: true },
      publish: async () => (record = ready),
      fail: async () => undefined,
    };
    const generate = async () => ({ questions });
    const [first, second] = await Promise.all([
      getOrCreateQuiz({ targetKey: "course:1", title: "Curso", kind: "course" }, { store, generate, wait: async () => undefined }),
      getOrCreateQuiz({ targetKey: "course:1", title: "Curso", kind: "course" }, { store, generate, wait: async () => undefined }),
    ]);
    expect(first.id).toBe(second.id);
  });
});
