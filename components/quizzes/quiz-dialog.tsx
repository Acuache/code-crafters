"use client";

import { useEffect, useRef, useState } from "react";
import type { ActionResult, AttemptResult } from "@/app/(app)/paths/[id]/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { QuizKind, SafeQuiz } from "@/lib/quizzes/schema";
import { QuizQuestion } from "./quiz-question";
import { QuizResult } from "./quiz-result";

export type QuizTarget = { pathId: string; pathStepId: string; kind: QuizKind; chapterTitle: string | null };
type CheckResult = { correct: boolean; explanation: string };
type RequestQuiz = (target: QuizTarget) => Promise<ActionResult<SafeQuiz>>;
type CheckAnswer = (input: { quizId: string; questionId: string; selectedOption: number }) => Promise<ActionResult<CheckResult>>;
type SubmitAttempt = (input: unknown) => Promise<ActionResult<AttemptResult>>;

export function QuizDialog({ open, target, onClose, onCompleted, requestQuizAction, checkAnswerAction, submitAttemptAction }: {
  open: boolean;
  target: QuizTarget | null;
  onClose(): void;
  onCompleted(): void;
  requestQuizAction: RequestQuiz;
  checkAnswerAction: CheckAnswer;
  submitAttemptAction: SubmitAttempt;
}) {
  const [state, setState] = useState<"loading" | "answering" | "submitting" | "result" | "error">("loading");
  const [quiz, setQuiz] = useState<SafeQuiz | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | undefined>>([]);
  const [feedback, setFeedback] = useState<Array<CheckResult | undefined>>([]);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [message, setMessage] = useState("");
  const idempotencyKey = useRef(crypto.randomUUID());

  const applyQuizResponse = (response: Awaited<ReturnType<RequestQuiz>>) => {
    if (!response.ok) {
      setMessage(response.message);
      setState("error");
      return;
    }
    setQuiz(response.data);
    setAnswers(Array(response.data.questions.length).fill(undefined));
    setFeedback(Array(response.data.questions.length).fill(undefined));
    setIndex(0);
    idempotencyKey.current = crypto.randomUUID();
    setState("answering");
  };

  const load = async () => {
    if (!target) return;
    setState("loading");
    setMessage("");
    applyQuizResponse(await requestQuizAction(target));
  };

  useEffect(() => {
    if (!open || !target) return;
    let active = true;
    void requestQuizAction(target).then((response) => {
      if (active) applyQuizResponse(response);
    });
    return () => { active = false; };
  }, [open, requestQuizAction, target]);

  const check = async () => {
    if (!quiz || answers[index] === undefined) return;
    const response = await checkAnswerAction({ quizId: quiz.id, questionId: quiz.questions[index].id, selectedOption: answers[index] });
    if (!response.ok) {
      setMessage(response.message);
      setState("error");
      return;
    }
    setFeedback((current) => current.map((item, itemIndex) => itemIndex === index ? response.data : item));
  };

  const submit = async () => {
    if (!quiz || !target || answers.some((answer) => answer === undefined)) return;
    setState("submitting");
    const response = await submitAttemptAction({
      quizId: quiz.id,
      pathId: target.pathId,
      pathStepId: target.pathStepId,
      answers: answers as number[],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      idempotencyKey: idempotencyKey.current,
    });
    if (!response.ok) {
      setMessage(response.message);
      setState("error");
      return;
    }
    setResult(response.data);
    setState("result");
    onCompleted();
  };

  const retryQuiz = () => {
    idempotencyKey.current = crypto.randomUUID();
    setAnswers(Array(quiz?.questions.length ?? 0).fill(undefined));
    setFeedback(Array(quiz?.questions.length ?? 0).fill(undefined));
    setIndex(0);
    setResult(null);
    setState("answering");
  };

  const currentQuestion = quiz?.questions[index];
  const currentFeedback = feedback[index];
  const atLast = Boolean(quiz && index === quiz.questions.length - 1);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{quiz?.title ?? "Quiz"}</DialogTitle>
          <DialogDescription>{quiz ? `${quiz.questions.length} preguntas ${quiz.kind === "chapter" ? "de práctica" : "del curso"}` : "Poné a prueba lo aprendido"}</DialogDescription>
        </DialogHeader>
        {state === "loading" ? <p className="flex items-center gap-2"><Spinner /> Preparando tu quiz…</p> : null}
        {state === "error" ? <div className="space-y-3"><p role="alert">{message}</p><Button onClick={() => { if (quiz) setState("answering"); else void load(); }}>Intentar de nuevo</Button></div> : null}
        {state === "answering" && quiz && currentQuestion ? (
          <>
            <p className="text-sm text-muted-foreground">Pregunta {index + 1} de {quiz.questions.length}</p>
            <QuizQuestion question={currentQuestion} selected={answers[index]} feedback={currentFeedback} onSelect={(answer) => setAnswers((current) => current.map((item, itemIndex) => itemIndex === index ? answer : item))} />
            <DialogFooter>
              {!currentFeedback ? <Button disabled={answers[index] === undefined} onClick={() => void check()}>Comprobar</Button> : atLast ? <Button onClick={() => void submit()}>Ver resultado</Button> : <Button onClick={() => setIndex((current) => current + 1)}>Siguiente</Button>}
            </DialogFooter>
          </>
        ) : null}
        {state === "submitting" ? <p className="flex items-center gap-2"><Spinner /> Guardando tu resultado…</p> : null}
        {state === "result" && result && quiz ? <QuizResult kind={quiz.kind} onClose={onClose} onRetry={retryQuiz} result={result} /> : null}
      </DialogContent>
    </Dialog>
  );
}
