import Image from "next/image";
import { ArrowCounterClockwiseIcon, BookOpenTextIcon, ProhibitIcon } from "@phosphor-icons/react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatHours, isUserDiscarded } from "@/lib/progress/path-progress";

import type { PathStepView } from "./path-steps-view";

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
                    <div className="relative aspect-[760/420] w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {step.courseImageUrl ? (
                        // Decorativa: el título del curso ya está al lado.
                        <Image
                          src={step.courseImageUrl}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-cover opacity-60 grayscale"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <BookOpenTextIcon aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-sm font-medium text-pretty">{step.courseTitle}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{step.discardReason}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatHours(step.courseHours)}
                        </span>
                      </div>
                    </div>
                    {/* Sólo lo que quitó el usuario se restaura: devolver un descarte del motor
                        rompería el presupuesto de horas o contradiría "ya lo dominás". */}
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
