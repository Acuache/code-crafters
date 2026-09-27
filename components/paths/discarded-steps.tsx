import { ArrowCounterClockwiseIcon, ProhibitIcon } from "@phosphor-icons/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DISCARD_REASONS } from "@/lib/paths/discard-reasons";
import { isUserDiscarded, USER_DISCARD_REASON } from "@/lib/progress/path-progress";

import { CourseCover } from "./course-cover";
import type { PathStepView } from "./path-step";
import { CourseDuration } from "./step-meta";

const DISCARD_REASON_LABELS: Record<string, string> = {
  [DISCARD_REASONS.mastered]: "Ya lo dominas",
  [DISCARD_REASONS.inConstruction]: "Aún no está disponible",
  [DISCARD_REASONS.missingBase]: "Falta una base previa",
  [DISCARD_REASONS.interestQuota]: "Priorizamos otros temas",
  [DISCARD_REASONS.budget]: "No cabía en el tiempo disponible",
  [USER_DISCARD_REASON]: "Lo quitaste de tu ruta",
};

type DiscardedStepsProps = {
  steps: PathStepView[];
  onRestore: (stepId: string) => void;
};

export function DiscardedSteps({ steps, onRestore }: DiscardedStepsProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Accordion>
          <AccordionItem>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <ProhibitIcon className="text-muted-foreground" aria-hidden="true" />
                Cursos fuera de tu ruta ({steps.length})
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="flex flex-col gap-3 pt-2">
                {steps.map((step) => (
                  <li
                    key={step.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-2"
                  >
                    <CourseCover
                      imageUrl={step.courseImageUrl}
                      alt=""
                      sizes="96px"
                      isDimmed
                      className="w-24 overflow-hidden rounded-lg"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-sm font-medium text-pretty">{step.courseTitle}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {step.discardReason
                            ? (DISCARD_REASON_LABELS[step.discardReason] ?? step.discardReason)
                            : "Fuera de la ruta"}
                        </Badge>
                        <CourseDuration hours={step.courseHours} />
                      </div>
                      {/* El badge es corto; qué base le falta se lee acá (spec 17). */}
                      {step.discardReason === DISCARD_REASONS.missingBase ? (
                        <p className="text-xs text-pretty text-muted-foreground">{step.reason}</p>
                      ) : null}
                    </div>
                    {/* Un descarte del motor no se restaura: rompería el presupuesto de horas. */}
                    {isUserDiscarded(step) ? (
                      <Button variant="outline" size="sm" onClick={() => onRestore(step.id)}>
                        <ArrowCounterClockwiseIcon data-icon="inline-start" />
                        Volver a incluir
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
