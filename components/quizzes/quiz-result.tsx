import Image from "next/image";
import { CheckCircleIcon, FireIcon, XCircleIcon } from "@phosphor-icons/react";

import type { AttemptResult } from "@/app/(app)/paths/[id]/actions";
import { Button } from "@/components/ui/button";
import type { QuizQuestion } from "@/lib/quizzes/schema";

type QuizResultProps = {
  questions: QuizQuestion[];
  passPercentage: number;
  result: AttemptResult;
  onRetry: () => void;
  onClose: () => void;
};

function describeOutcome(result: AttemptResult, passPercentage: number): string {
  if (!result.passed) {
    return `Necesitas ${passPercentage} % para aprobar. Repasa las explicaciones y vuelve a intentarlo.`;
  }

  if (result.stepCompleted) {
    return "Marcamos el curso como hecho en tu ruta.";
  }

  return "Aprobaste el quiz del curso.";
}

// La racha suma como máximo un día por fecha: aprobar dos veces el mismo día no la mueve.
function describeStreak(result: AttemptResult): string | null {
  if (result.streakIncreased) {
    return "Sumaste un día a tu racha";
  }

  if (result.passed) {
    return "Tu racha ya tenía sumado el día de hoy";
  }

  return null;
}

export function QuizResult({
  questions,
  passPercentage,
  result,
  onRetry,
  onClose,
}: QuizResultProps) {
  const mascotSrc = result.passed ? "/streak/celebration-1.webp" : "/astronauta.webp";
  const streakMessage = describeStreak(result);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* Decorativa: el título de abajo ya dice si aprobó (CLAUDE.md §Marca). */}
        <Image src={mascotSrc} alt="" width={128} height={128} />
        <h3 className="font-heading text-2xl font-semibold">
          {result.passed ? "¡Quiz aprobado!" : "Casi, sigue practicando"}
        </h3>
        <p className="font-heading text-4xl font-semibold tabular-nums">
          {result.scorePercentage} %
        </p>
        <p className="text-pretty text-muted-foreground">
          {result.correctCount} de {questions.length} correctas ·{" "}
          {describeOutcome(result, passPercentage)}
        </p>
        {streakMessage ? (
          <p className="flex items-center gap-2 text-sm font-medium">
            <FireIcon weight="fill" className="text-primary-bright" aria-hidden="true" />
            {streakMessage}
          </p>
        ) : null}
      </div>

      <ol className="flex flex-col gap-3">
        {questions.map((question, index) => {
          const questionResult = result.results.find((item) => item.questionId === question.id);
          if (!questionResult) {
            return null;
          }

          return (
            <li key={question.id} className="flex flex-col gap-1 rounded-xl border p-4">
              <p className="flex items-start gap-2 font-medium">
                {questionResult.correct ? (
                  <CheckCircleIcon weight="fill" className="mt-0.5 shrink-0 text-primary-bright" />
                ) : (
                  <XCircleIcon weight="fill" className="mt-0.5 shrink-0 text-destructive" />
                )}
                <span>
                  <span className="sr-only">
                    {questionResult.correct ? "Correcta: " : "Incorrecta: "}
                  </span>
                  {index + 1}. {question.prompt}
                </span>
              </p>
              {questionResult.correct ? null : (
                <p className="text-sm">
                  Respuesta correcta: {question.options[questionResult.correctOption]}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{questionResult.explanation}</p>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {result.passed ? null : (
          <Button variant="outline" onClick={onRetry}>
            Reintentar quiz
          </Button>
        )}
        <Button variant={result.passed ? "brand" : "default"} onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
