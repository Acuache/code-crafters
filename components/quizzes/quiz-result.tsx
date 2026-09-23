import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { AttemptResult } from "@/app/(app)/paths/[id]/actions";

export function QuizResult({ result, kind, onRetry, onClose }: {
  result: AttemptResult;
  kind: "course" | "chapter";
  onRetry(): void;
  onClose(): void;
}) {
  const celebration = result.attemptId.charCodeAt(0) % 4 + 1;
  return (
    <div className="space-y-4 text-center">
      <Image alt="Celebración por completar el quiz" className="mx-auto" height={180} src={`/streak/celebration-${celebration}.webp`} width={180} />
      <h3 className="font-heading text-2xl font-semibold">{result.passed ? "¡Quiz aprobado!" : "Seguí practicando"}</h3>
      <p className="text-3xl font-semibold">{result.scorePercentage}%</p>
      <p>{result.correctCount} respuestas correctas</p>
      {result.passed && kind === "chapter" ? <p>El curso sigue en progreso.</p> : null}
      {result.passed && result.stepCompleted ? <p>{result.nextStepId ? "Desbloqueaste el siguiente paso." : "¡Completaste tu ruta!"}</p> : null}
      <div className="flex justify-center gap-2">
        {!result.passed ? <Button onClick={onRetry}>Reintentar quiz</Button> : null}
        <Button onClick={onClose} variant={result.passed ? "default" : "outline"}>Cerrar</Button>
      </div>
    </div>
  );
}
