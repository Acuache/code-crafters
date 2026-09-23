import { describe, expect, it } from "vitest";

import { scoreQuiz } from "./score";

describe("scoreQuiz", () => {
  it("passes a quiz at exactly the configured threshold", () => {
    expect(scoreQuiz([0, 1, 2, 3, 0], [0, 1, 2, 0, 1], 60)).toEqual({
      correctCount: 3,
      scorePercentage: 60,
      passed: true,
    });
  });

  it("rounds the percentage to the nearest integer", () => {
    expect(scoreQuiz([0, 1, 3], [0, 1, 2], 60)).toEqual({
      correctCount: 2,
      scorePercentage: 67,
      passed: true,
    });
  });

  it("rejects answer arrays with a different length", () => {
    expect(() => scoreQuiz([0], [0, 1], 60)).toThrow(
      "La cantidad de respuestas no coincide con el quiz.",
    );
  });

  it("rejects an empty quiz", () => {
    expect(() => scoreQuiz([], [], 60)).toThrow("El quiz debe contener preguntas.");
  });
});
