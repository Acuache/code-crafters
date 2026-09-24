// Sin "use client" a propósito, mismo criterio que step-status-toggle.tsx: recibe callbacks y solo
// se importa desde path-steps-view.tsx, que ya es cliente.
import { useEffect, useRef, useState } from "react";

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
import type { QuizKind, SafeQuiz } from "@/lib/quizzes/schema";

import { QuizQuestion } from "./quiz-question";
import { QuizResult } from "./quiz-result";

export type QuizTarget = {
  pathId: string;
  pathStepId: string;
  kind: QuizKind;
  chapterTitle: string | null;
};

type RequestQuizAction = (target: QuizTarget) => Promise<ActionResultWithData<SafeQuiz>>;
type SubmitAttemptAction = (input: unknown) => Promise<ActionResultWithData<AttemptResult>>;

type QuizDialogProps = {
  // null = cerrado. El padre le pone una `key` nueva en cada apertura, así el estado arranca
  // limpio (fase "loading") sin tener que reiniciarlo desde un efecto.
  target: QuizTarget | null;
  onClose: () => void;
  // Se llama después de guardar un intento, para que la ruta refleje el paso hecho y la racha.
  onAttemptSaved: (result: AttemptResult) => void;
  // Las actions se inyectan para poder probar el diálogo sin servidor.
  requestQuizAction: RequestQuizAction;
  submitAttemptAction: SubmitAttemptAction;
};

type Phase = "loading" | "answering" | "submitting" | "result" | "error";

// Una action rechaza (en vez de devolver ok: false) cuando se corta la conexión.
const CONNECTION_ERROR = "Se perdió la conexión. Revisa tu internet e intenta de nuevo.";

function describeQuiz(quiz: SafeQuiz | null): string {
  if (!quiz) {
    return "Pon a prueba lo que aprendiste";
  }

  const kindLabel = quiz.kind === "chapter" ? "de práctica" : "del curso";
  return `${quiz.questions.length} preguntas ${kindLabel} · apruebas con ${quiz.passPercentage} %`;
}

export function QuizDialog({
  target,
  onClose,
  onAttemptSaved,
  requestQuizAction,
  submitAttemptAction,
}: QuizDialogProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<SafeQuiz | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Una clave por intento: si el envío se repite (doble click, red lenta), Postgres devuelve el
  // mismo resultado en vez de guardar dos intentos.
  const idempotencyKey = useRef("");

  function startAttempt(loadedQuiz: SafeQuiz) {
    idempotencyKey.current = crypto.randomUUID();
    setQuiz(loadedQuiz);
    setAnswers(Array.from({ length: loadedQuiz.questions.length }, () => undefined));
    setQuestionIndex(0);
    setResult(null);
    setPhase("answering");
  }

  function showError(message: string) {
    setErrorMessage(message);
    setPhase("error");
  }

  function applyQuizResponse(response: ActionResultWithData<SafeQuiz>) {
    if (!response.ok) {
      showError(response.message);
      return;
    }

    startAttempt(response.data);
  }

  // Pide el quiz al abrir. El estado solo cambia cuando responde el servidor; si el diálogo se
  // cierra antes, la respuesta se descarta.
  useEffect(() => {
    if (!target) {
      return;
    }

    let isActive = true;
    requestQuizAction(target)
      .then((response) => {
        if (isActive) {
          applyQuizResponse(response);
        }
      })
      .catch(() => {
        if (isActive) {
          showError(CONNECTION_ERROR);
        }
      });

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cada apertura monta un diálogo nuevo (key)
  }, [target]);

  function selectOption(optionIndex: number) {
    setAnswers((current) =>
      current.map((answer, index) => (index === questionIndex ? optionIndex : answer)),
    );
  }

  async function submitAttempt() {
    if (!quiz || !target) {
      return;
    }

    const completeAnswers = answers.filter((answer) => answer !== undefined);
    if (completeAnswers.length !== quiz.questions.length) {
      return;
    }

    setPhase("submitting");
    let response: ActionResultWithData<AttemptResult>;
    try {
      // Reintentar tras un corte reusa la misma clave: si el intento sí se guardó, vuelve ese.
      response = await submitAttemptAction({
        quizId: quiz.id,
        pathId: target.pathId,
        pathStepId: target.pathStepId,
        answers: completeAnswers,
        timezone: browserTimeZone(),
        idempotencyKey: idempotencyKey.current,
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

  function retryAfterError() {
    if (quiz) {
      setPhase("answering");
      return;
    }

    if (!target) {
      return;
    }

    setPhase("loading");
    requestQuizAction(target)
      .then(applyQuizResponse)
      .catch(() => showError(CONNECTION_ERROR));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      onClose();
    }
  }

  const currentQuestion = quiz?.questions[questionIndex];
  const isLastQuestion = quiz !== null && questionIndex === quiz.questions.length - 1;
  const hasCurrentAnswer = answers[questionIndex] !== undefined;
  const progressPercent = quiz
    ? Math.round(((questionIndex + 1) / quiz.questions.length) * 100)
    : 0;

  return (
    <Dialog open={target !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{quiz?.title ?? "Quiz"}</DialogTitle>
          <DialogDescription>{describeQuiz(quiz)}</DialogDescription>
        </DialogHeader>

        {phase === "loading" ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Spinner /> Preparando tu quiz…
          </p>
        ) : null}

        {phase === "error" ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert">{errorMessage}</p>
            <Button variant="outline" onClick={retryAfterError}>
              Intentar de nuevo
            </Button>
          </div>
        ) : null}

        {phase === "answering" && quiz && currentQuestion ? (
          <>
            <Progress
              value={progressPercent}
              aria-label={`Pregunta ${questionIndex + 1} de ${quiz.questions.length}`}
            />
            <QuizQuestion
              question={currentQuestion}
              selectedOption={answers[questionIndex]}
              onSelect={selectOption}
            />
            <DialogFooter>
              {questionIndex > 0 ? (
                <Button variant="ghost" onClick={() => setQuestionIndex(questionIndex - 1)}>
                  Anterior
                </Button>
              ) : null}
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
            <Spinner /> Corrigiendo tus respuestas…
          </p>
        ) : null}

        {phase === "result" && quiz && result ? (
          <QuizResult
            kind={quiz.kind}
            questions={quiz.questions}
            result={result}
            onRetry={() => startAttempt(quiz)}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
