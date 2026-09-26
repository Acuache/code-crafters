import { describe, expect, it } from "vitest";

import { assignQuestionIds } from "./question-ids";

function sequentialIds() {
  let next = 0;
  return () => {
    next += 1;
    return `new-${next}`;
  };
}

describe("assignQuestionIds", () => {
  it("keeps the ids of questions that already had one", () => {
    const questions = [{ id: "a" }, { id: "b" }];

    expect(assignQuestionIds(questions, sequentialIds())).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("gives an id to new questions", () => {
    const questions = [{ id: "a" }, { id: "" }, { id: "" }];

    expect(assignQuestionIds(questions, sequentialIds())).toEqual([
      { id: "a" },
      { id: "new-1" },
      { id: "new-2" },
    ]);
  });

  it("replaces a repeated id so every question stays distinct", () => {
    const questions = [{ id: "a" }, { id: "a" }];

    expect(assignQuestionIds(questions, sequentialIds())).toEqual([{ id: "a" }, { id: "new-1" }]);
  });
});
