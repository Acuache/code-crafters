"use client";

// Cliente porque step-meta usa los iconos de Phosphor con contexto, que no corren en el servidor.

import { ProhibitIcon } from "@phosphor-icons/react";

import { CourseDuration, StepOriginBadge } from "@/components/paths/step-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAMPLE_COURSES, EXAMPLE_DISCARDED } from "@/lib/landing/example-path";
import { cn } from "@/lib/utils";

import { afterArrival, FADE_IN_ON_ARRIVAL } from "./reveal";

const ROW_STAGGER_MS = 120;
const STRIKE_DELAY_MS = 300 + EXAMPLE_COURSES.length * ROW_STAGGER_MS;

export function EngineMockup() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Los primeros pasos de una ruta de ejemplo</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {EXAMPLE_COURSES.map((course, index) => (
            <li
              key={course.slug}
              className={cn("flex flex-col gap-1.5 py-2.5 first:pt-0", FADE_IN_ON_ARRIVAL)}
              style={afterArrival(300 + index * ROW_STAGGER_MS)}
            >
              <span className="font-medium">{course.title}</span>
              <span className="flex items-center gap-2">
                <StepOriginBadge origin={course.origin} />
                <CourseDuration hours={course.hours} />
              </span>
            </li>
          ))}
          {EXAMPLE_DISCARDED.map((course) => (
            <li key={course.slug} className="flex flex-col gap-1.5 py-2.5 last:pb-0">
              {/* La tachadura aparece al llegar; el motivo de abajo lo dice con palabras. */}
              <span
                className="text-muted-foreground line-through decoration-muted-foreground decoration-2 transition-[text-decoration-color] duration-500 group-data-[reached=false]/station:decoration-transparent"
                style={afterArrival(STRIKE_DELAY_MS)}
              >
                {course.title}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ProhibitIcon aria-hidden="true" />
                Quitado: {course.discardReason}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
