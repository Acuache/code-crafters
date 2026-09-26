// Sin "use client" a propósito, mismo criterio que step-status-toggle.tsx: recibe callbacks y solo
// se importa desde path-steps-view.tsx, que ya es cliente.
import { useState } from "react";

import type { AttemptResult } from "@/app/(app)/paths/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResultWithData } from "@/lib/action-result";
import { browserTimeZone } from "@/lib/gamification/streak";
import type { CourseQuiz } from "@/lib/quizzes/schema";

import { QuizQuestion } from "./quiz-question";
import { QuizResult } from "./quiz-result";

// El quiz llega ya cargado con la página: abrirlo no espera a nadie.
export type QuizSession = {
  quiz: CourseQuiz;
  courseTitle: string;
  pathId: string;
  pathStepId: string;
};

type SubmitAttemptAction = (input: unknown) => Promise<ActionResultWithData<AttemptResult>>;

type QuizDialogProps = {
  // null = cerrado. El padre le pone una `key` nueva en cada apertura, así cada intento arranca
  // limpio sin reiniciar el estado desde un efecto.
  session: QuizSession | null;
  onClose: () => void;
  // Se llama después de guardar un intento, para que la ruta refleje el paso hecho y la racha.
  onAttemptSaved: (result: AttemptResult) => void;
  // La action se inyecta para poder probar el diálogo sin servidor.
  submitAttemptAction: SubmitAttemptAction;
};

type Phase = "answering" | "submitting" | "result" | "error";

// Una action rechaza (en vez de devolver ok: false) cuando se corta la conexión.
const CONNECTION_ERROR = "Se perdió la conexión. Revisa tu internet e intenta de nuevo.";

function describeQuiz(quiz: CourseQuiz): string {
  const questionCount = quiz.questions.length;
  const questionsLabel = questionCount === 1 ? "pregunta" : "preguntas";
  return `${questionCount} ${questionsLabel} · apruebas con ${quiz.passPercentage} %`;
}

function emptyAnswers(session: QuizSession | null): (number | undefined)[] {
  const questionCount = session?.quiz.questions.length ?? 0;
  return Array.from({ length: questionCount }, () => undefined);
}

export function QuizDialog({
  session,
  onClose,
  onAttemptSaved,
  submitAttemptAction,
}: QuizDialogProps) {
  // La sesión con la que se abrió: sigue visible mientras el diálogo se anima al cerrarse, cuando
  // el padre ya pasó `null`.
  const [openedSession] = useState(session);
  const [phase, setPhase] = useState<Phase>("answering");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(() => emptyAnswers(session));
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Una clave por intento: si el envío se repite (doble click, reintento tras un corte), Postgres
  // devuelve el mismo resultado en vez de guardar dos intentos.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      onClose();
    }
  }

  function selectOption(optionIndex: number) {
    // Una vez elegida, la respuesta queda fija.
    if (answers[questionIndex] !== undefined) {
      return;
    }

    setAnswers((current) =>
      current.map((answer, index) => (index === questionIndex ? optionIndex : answer)),
    );
  }

  function showError(message: string) {
    setErrorMessage(message);
    setPhase("error");
  }

  async function submitAttempt() {
    if (!openedSession) {
      return;
    }

    const completeAnswers = answers.filter((answer) => answer !== undefined);
    if (completeAnswers.length !== openedSession.quiz.questions.length) {
      return;
    }

    setPhase("submitting");
    let response: ActionResultWithData<AttemptResult>;
    try {
      // Reintentar tras un corte reusa la misma clave: si el intento sí se guardó, vuelve ese.
      response = await submitAttemptAction({
        quizId: openedSession.quiz.id,
        pathId: openedSession.pathId,
        pathStepId: openedSession.pathStepId,
        answers: completeAnswers,
        timezone: browserTimeZone(),
        idempotencyKey,
      });
    } catch {
      showError(CONNECTION_ERROR);
      return;
    }

    if (!response.ok) {
      showError(response.message);
      return;
    }

    setResult(response.data);
    setPhase("result");
    onAttemptSaved(response.data);
  }

  function startNewAttempt() {
    setIdempotencyKey(crypto.randomUUID());
    setAnswers(emptyAnswers(openedSession));
    setQuestionIndex(0);
    setResult(null);
    setPhase("answering");
  }

  if (!openedSession) {
    return null;
  }

  const { quiz, courseTitle } = openedSession;
  const questionCount = quiz.questions.length;
  const currentQuestion = quiz.questions[questionIndex];
  const isLastQuestion = questionIndex === questionCount - 1;
  const hasCurrentAnswer = answers[questionIndex] !== undefined;
  const progressPercent = Math.round(((questionIndex + 1) / questionCount) * 100);

  return (
    <Dialog open={session !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-pretty">
            Quiz: {courseTitle}
          </DialogTitle>
          <DialogDescription>{describeQuiz(quiz)}</DialogDescription>
        </DialogHeader>

        {phase === "answering" && currentQuestion ? (
          <>
            <Progress
              value={progressPercent}
              aria-label={`Pregunta ${questionIndex + 1} de ${questionCount}`}
            />
            <QuizQuestion
              // Cada pregunta monta su propio grupo de opciones: el foco no arrastra a la siguiente.
              key={currentQuestion.id}
              question={currentQuestion}
              selectedOption={answers[questionIndex]}
              onSelect={selectOption}
            />
            <DialogFooter>
              {isLastQuestion ? (
                <Button variant="brand" disabled={!hasCurrentAnswer} onClick={submitAttempt}>
                  Entregar
                </Button>
              ) : (
                <Button
                  disabled={!hasCurrentAnswer}
                  onClick={() => setQuestionIndex(questionIndex + 1)}
                >
                  Siguiente
                </Button>
              )}
            </DialogFooter>
          </>
        ) : null}

        {phase === "submitting" ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Spinner /> Guardando tu intento…
          </p>
        ) : null}

        {phase === "error" ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert">{errorMessage}</p>
            {/* Vuelve a la última pregunta con sus respuestas: "Entregar" reusa la misma clave. */}
            <Button variant="outline" onClick={() => setPhase("answering")}>
              Intentar de nuevo
            </Button>
          </div>
        ) : null}

        {phase === "result" && result ? (
          <QuizResult
            questions={quiz.questions}
            passPercentage={quiz.passPercentage}
            result={result}
            onRetry={startNewAttempt}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
