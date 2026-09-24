"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  assessmentAnswersSchema,
  QUIZ_DEFAULT_VALUES,
  STEP_FIELDS,
  type AssessmentAnswers,
} from "@/components/quiz/quiz-schema";
import { FreeTextStep } from "@/components/quiz/steps/free-text-step";
import { GoalStep } from "@/components/quiz/steps/goal-step";
import { InterestsStep } from "@/components/quiz/steps/interests-step";
import { LevelStep } from "@/components/quiz/steps/level-step";
import { TechnologiesStep } from "@/components/quiz/steps/technologies-step";
import { TimeStep } from "@/components/quiz/steps/time-step";
import { GeneratingPath } from "@/components/paths/generating-path";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { generatePath } from "@/app/(app)/paths/actions";
import { saveAssessment } from "@/app/(app)/quiz/actions";

// Un componente por paso, en el mismo orden que STEP_FIELDS (components/quiz/quiz-schema.ts):
// currentStep indexa los dos arrays a la vez.
const STEPS = [
  { title: "Tu meta", Step: GoalStep },
  { title: "Tu nivel", Step: LevelStep },
  { title: "Ya dominás", Step: TechnologiesStep },
  { title: "Te interesa", Step: InterestsStep },
  { title: "Tu tiempo", Step: TimeStep },
  { title: "Contanos más", Step: FreeTextStep },
] as const;

const LAST_STEP = STEPS.length - 1;

export function QuizForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<AssessmentAnswers>({
    resolver: zodResolver(assessmentAnswersSchema),
    defaultValues: QUIZ_DEFAULT_VALUES,
    mode: "onTouched",
  });

  async function handleNext() {
    const stepIsValid = await form.trigger(STEP_FIELDS[currentStep]);
    if (stepIsValid) {
      setCurrentStep((step) => Math.min(step + 1, LAST_STEP));
    }
  }

  function handleBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  const onSubmit = form.handleSubmit((answers) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await saveAssessment(answers);
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }

      setAssessmentId(result.assessmentId);
      const generation = await generatePath(result.assessmentId);
      setGenerationError(generation.message);
    });
  });

  function handleRetryGeneration() {
    if (!assessmentId) {
      return;
    }

    setGenerationError(null);
    startTransition(async () => {
      const generation = await generatePath(assessmentId);
      setGenerationError(generation.message);
    });
  }

  if (assessmentId) {
    if (generationError) {
      return (
        <Card className="mx-auto w-full max-w-xl">
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>No pudimos generar tu ruta</AlertTitle>
              <AlertDescription>{generationError}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-between">
            <Button
              variant="outline"
              render={<Link href="/dashboard" />}
              nativeButton={false}
            >
              Volver al dashboard
            </Button>
            <Button onClick={handleRetryGeneration} disabled={isPending}>
              {isPending ? "Reintentando…" : "Reintentar"}
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return (
      <Card className="mx-auto w-full max-w-xl">
        <CardContent>
          <GeneratingPath />
        </CardContent>
      </Card>
    );
  }

  const { title: stepTitle, Step: CurrentStep } = STEPS[currentStep];
  const stepLabel = `Paso ${currentStep + 1} de ${STEPS.length} — ${stepTitle}`;
  const progressPercentage = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === LAST_STEP;

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto w-full max-w-xl">
      <Card>
        <CardHeader>
          <Progress value={progressPercentage}>
            <ProgressLabel>{stepLabel}</ProgressLabel>
          </Progress>
        </CardHeader>
        <CardContent>
          <CurrentStep control={form.control} />
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>No pudimos guardar tus respuestas</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="justify-between">
          <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            Atrás
          </Button>
          {/* Las `key` distintas obligan a React a crear otro <button> en vez de reusar el mismo
              cambiándole el `type`: sin ellas, el clic en "Siguiente" del paso 5 terminaba sobre
              un botón que ya era `submit` y enviaba el formulario, salteando el texto libre. */}
          {isLastStep ? (
            <Button key="submit" type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar mis respuestas"}
            </Button>
          ) : (
            <Button key="next" type="button" onClick={handleNext}>
              Siguiente
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
