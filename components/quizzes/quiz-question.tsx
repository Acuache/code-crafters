import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { QuizQuestion as QuizQuestionData } from "@/lib/quizzes/schema";
import { cn } from "@/lib/utils";

type QuizQuestionProps = {
  question: QuizQuestionData;
  // undefined = todavía sin responder.
  selectedOption: number | undefined;
  onSelect: (optionIndex: number) => void;
};

type OptionState = "unanswered" | "correct" | "incorrect" | "other";

function stateOfOption(
  optionIndex: number,
  question: QuizQuestionData,
  selectedOption: number | undefined,
): OptionState {
  if (selectedOption === undefined) {
    return "unanswered";
  }

  if (optionIndex === question.correctOption) {
    return "correct";
  }

  if (optionIndex === selectedOption) {
    return "incorrect";
  }

  return "other";
}

const OPTION_STATE_CLASS: Record<OptionState, string> = {
  unanswered: "",
  correct: "border-primary-bright bg-primary-bright/10",
  incorrect: "border-destructive bg-destructive/10",
  other: "opacity-60",
};

// Sin "use client" a propósito: recibe un callback y solo se importa desde quiz-dialog.tsx.
// Feedback al instante (spec 13): al elegir, la opción queda fija y se ve si es correcta, cuál era
// la correcta y la explicación. submit_quiz_attempt vuelve a corregir en Postgres al entregar.
export function QuizQuestion({ question, selectedOption, onSelect }: QuizQuestionProps) {
  const isAnswered = selectedOption !== undefined;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-heading text-lg font-semibold text-pretty">{question.prompt}</h3>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Opciones">
        {question.options.map((option, optionIndex) => {
          const state = stateOfOption(optionIndex, question, selectedOption);

          return (
            <Button
              key={option}
              role="radio"
              aria-checked={selectedOption === optionIndex}
              variant="outline"
              // Deshabilitada pero enfocable: el foco no se pierde al responder.
              disabled={isAnswered}
              focusableWhenDisabled
              className={cn(
                "h-auto justify-start gap-3 py-3 text-left whitespace-normal",
                OPTION_STATE_CLASS[state],
              )}
              onClick={() => onSelect(optionIndex)}
            >
              <span className="flex-1">{option}</span>
              {state === "correct" ? (
                <CheckCircleIcon weight="fill" className="text-primary-bright" aria-hidden="true" />
              ) : null}
              {state === "incorrect" ? (
                <XCircleIcon weight="fill" className="text-destructive" aria-hidden="true" />
              ) : null}
            </Button>
          );
        })}
      </div>

      {isAnswered ? (
        <AnswerFeedback question={question} isCorrect={selectedOption === question.correctOption} />
      ) : null}
    </div>
  );
}

type AnswerFeedbackProps = {
  question: QuizQuestionData;
  isCorrect: boolean;
};

function AnswerFeedback({ question, isCorrect }: AnswerFeedbackProps) {
  const correctAnswer = question.options[question.correctOption];

  // El color va en el Alert y no en el ícono: el Alert fuerza `text-current` en sus íconos.
  return (
    <Alert className={isCorrect ? "text-primary-bright" : "text-destructive"}>
      {isCorrect ? <CheckCircleIcon weight="fill" /> : <XCircleIcon weight="fill" />}
      <AlertTitle>{isCorrect ? "¡Correcto!" : "Incorrecto"}</AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        {isCorrect ? null : (
          <p className="font-medium text-foreground">La respuesta correcta es: {correctAnswer}</p>
        )}
        <p>{question.explanation}</p>
      </AlertDescription>
    </Alert>
  );
}
