import { Button } from "@/components/ui/button";
import type { SafeQuizQuestion } from "@/lib/quizzes/schema";

type QuizQuestionProps = {
  question: SafeQuizQuestion;
  selectedOption: number | undefined;
  onSelect: (optionIndex: number) => void;
};

// Sin "use client" a propósito: recibe un callback y solo se importa desde quiz-dialog.tsx.
// Sin feedback inmediato: la corrección llega toda junta al entregar (submit_quiz_attempt), así no
// se puede tantear opción por opción.
export function QuizQuestion({ question, selectedOption, onSelect }: QuizQuestionProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-heading text-lg font-semibold text-pretty">{question.prompt}</h3>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Opciones">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedOption === optionIndex;

          return (
            <Button
              key={option}
              role="radio"
              aria-checked={isSelected}
              variant={isSelected ? "default" : "outline"}
              className="h-auto justify-start py-3 text-left whitespace-normal"
              onClick={() => onSelect(optionIndex)}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
