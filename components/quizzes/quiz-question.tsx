import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { SafeQuizQuestion } from "@/lib/quizzes/schema";

type Feedback = { correct: boolean; explanation: string };

export function QuizQuestion({ question, selected, feedback, onSelect }: {
  question: SafeQuizQuestion;
  selected: number | undefined;
  feedback?: Feedback;
  onSelect(index: number): void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl font-semibold">{question.prompt}</h3>
      <div className="grid gap-2" role="radiogroup" aria-label="Opciones">
        {question.options.map((option, index) => (
          <Button
            aria-checked={selected === index}
            aria-label={option}
            disabled={Boolean(feedback)}
            key={option}
            onClick={() => onSelect(index)}
            role="radio"
            variant={selected === index ? "default" : "outline"}
          >
            {option}
          </Button>
        ))}
      </div>
      {feedback ? (
        <Alert variant={feedback.correct ? "default" : "destructive"}>
          <AlertTitle>{feedback.correct ? "Respuesta correcta" : "Respuesta incorrecta"}</AlertTitle>
          <AlertDescription>{feedback.explanation}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
