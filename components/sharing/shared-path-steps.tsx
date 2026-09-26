"use client";

import { useState } from "react";
import { ListBulletsIcon, MapTrifoldIcon } from "@phosphor-icons/react";

import { PathMap } from "@/components/paths/path-map";
import {
  isPathView,
  writeViewToUrl,
  type PathStepView,
  type PathView,
} from "@/components/paths/path-step";
import { PathStepsList } from "@/components/paths/path-steps-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupStepsByProgram } from "@/lib/progress/group-steps";
import type { SharedPathStep } from "@/lib/sharing/shared-path";

// Todo pendiente y sin quiz: la página pública no muestra el avance del autor. El curso sirve de id
// porque una ruta no repite cursos (unique (path_id, course_id)).
function toReadOnlyStep(step: SharedPathStep): PathStepView {
  return {
    id: String(step.courseId),
    stage: step.stage,
    position: step.position,
    origin: step.origin,
    reason: step.reason,
    status: "pending",
    discardReason: null,
    courseTitle: step.courseTitle,
    courseHours: step.courseHours,
    courseUrl: step.courseUrl,
    courseImageUrl: step.courseImageUrl,
    quiz: null,
    programSlug: step.programSlug,
    programName: step.programName,
  };
}

type SharedPathStepsProps = {
  steps: SharedPathStep[];
  initialView: PathView;
};

// El mapa y la lista de /paths/[id] en modo solo lectura (spec 15).
export function SharedPathSteps({ steps, initialView }: SharedPathStepsProps) {
  const [view, setView] = useState<PathView>(initialView);

  const readOnlySteps = steps.map(toReadOnlyStep);
  const groups = groupStepsByProgram(readOnlySteps);
  const stepNumbers = new Map(readOnlySteps.map((step, index) => [step.id, index + 1]));

  function handleViewChange(value: unknown) {
    if (!isPathView(value)) {
      return;
    }

    setView(value);
    writeViewToUrl(value);
  }

  return (
    <Tabs value={view} onValueChange={handleViewChange} className="gap-8">
      <TabsList className="self-center">
        <TabsTrigger value="mapa" className="px-4">
          <MapTrifoldIcon data-icon="inline-start" />
          Mapa
        </TabsTrigger>
        <TabsTrigger value="lista" className="px-4">
          <ListBulletsIcon data-icon="inline-start" />
          Lista
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mapa">
        <PathMap groups={groups} stepNumbers={stepNumbers} totalSteps={readOnlySteps.length} />
      </TabsContent>

      <TabsContent value="lista">
        <PathStepsList groups={groups} stepNumbers={stepNumbers} />
      </TabsContent>
    </Tabs>
  );
}
