// El id de cada pregunta tiene que ser único dentro del quiz: submit_quiz_attempt devuelve la
// corrección por `questionId`. Una pregunta nueva llega del formulario sin id, y uno repetido se
// reemplaza en vez de rechazar el guardado. Los ids existentes no cambian al editar.
export function assignQuestionIds<Question extends { id: string }>(
  questions: Question[],
  createId: () => string,
): Question[] {
  const usedIds = new Set<string>();

  return questions.map((question) => {
    const needsNewId = question.id === "" || usedIds.has(question.id);
    const id = needsNewId ? createId() : question.id;
    usedIds.add(id);
    return { ...question, id };
  });
}
