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
import { isUserDiscarded } from "@/lib/progress/path-progress";

import { CourseCover } from "./course-cover";
import type { PathStepView } from "./path-step";
import { CourseDuration } from "./step-meta";

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
                Qué quitamos y por qué ({steps.length})
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
                        <Badge variant="secondary">{step.discardReason}</Badge>
                        <CourseDuration hours={step.courseHours} />
                      </div>
                    </div>
                    {/* Un descarte del motor no se restaura: rompería el presupuesto de horas. */}
                    {isUserDiscarded(step) ? (
                      <Button variant="outline" size="sm" onClick={() => onRestore(step.id)}>
                        <ArrowCounterClockwiseIcon data-icon="inline-start" />
                        Restaurar
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
