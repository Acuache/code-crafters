import { AiBadge } from "@/components/brand/ai-badge";
import { Card, CardContent } from "@/components/ui/card";
import { EXAMPLE_AI, EXAMPLE_COURSES, EXAMPLE_FREE_TEXT } from "@/lib/landing/example-path";
import { cn } from "@/lib/utils";

import { afterArrival, FADE_IN_ON_ARRIVAL } from "./reveal";

const firstCourse = EXAMPLE_COURSES[0];

// Lo que escribió el usuario, cómo lo explica el motor y cómo lo explica la IA con sus palabras.
export function AiMockup() {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Lo que escribiste</span>
          <blockquote className="border-l-2 pl-3 text-pretty italic">
            “{EXAMPLE_FREE_TEXT}”
          </blockquote>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Motor · {firstCourse.title}
          </span>
          <p className="text-muted-foreground">{firstCourse.engineReason}</p>
        </div>

        <div
          // Sin fondo propio: el AiBadge ya trae su tinta, y sobre otro fondo le baja el contraste.
          className={cn(
            "flex flex-col items-start gap-2 border-l-4 border-ai py-1 pl-3",
            FADE_IN_ON_ARRIVAL,
          )}
          style={afterArrival(600)}
        >
          <AiBadge />
          <p className="font-heading font-medium">{EXAMPLE_AI.title}</p>
          <p className="text-pretty">{EXAMPLE_AI.firstCourseReason}</p>
        </div>
      </CardContent>
    </Card>
  );
}
