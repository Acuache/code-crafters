export type QuizScore = {
  correctCount: number;
  scorePercentage: number;
  passed: boolean;
};

export function scoreQuiz(
  answers: number[],
  correctOptions: number[],
  passPercentage: number,
): QuizScore {
  if (correctOptions.length === 0) {
    throw new Error("El quiz debe contener preguntas.");
  }

  if (answers.length !== correctOptions.length) {
    throw new Error("La cantidad de respuestas no coincide con el quiz.");
  }

  const correctCount = answers.reduce(
    (total, answer, index) => total + (answer === correctOptions[index] ? 1 : 0),
    0,
  );
  const scorePercentage = Math.round((correctCount / correctOptions.length) * 100);

  return {
    correctCount,
    scorePercentage,
    passed: scorePercentage >= passPercentage,
  };
}
