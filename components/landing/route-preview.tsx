import { Eyebrow } from "@/components/brand/eyebrow";
import { Badge } from "@/components/ui/badge";
import { EXAMPLE_ANSWERS, EXAMPLE_COURSES } from "@/lib/landing/example-path";
import { formatHours } from "@/lib/progress/path-progress";

import { EngineMockup } from "./mockups/engine-mockup";

const TOTAL_HOURS = EXAMPLE_COURSES.reduce((total, course) => total + course.hours, 0);

export function RoutePreview() {
  return (
    <section
      id="ruta-ejemplo"
      aria-labelledby="ruta-ejemplo-title"
      className="scroll-mt-24 rounded-3xl border border-border/70 bg-card/70 p-4 shadow-brand backdrop-blur sm:p-6"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Ruta de ejemplo</Eyebrow>
          <h2 id="ruta-ejemplo-title" className="mt-1 text-xl font-semibold text-balance">
            Tu ruta hacia React
          </h2>
        </div>
        <Badge variant="secondary">
          {EXAMPLE_COURSES.length} cursos · {formatHours(TOTAL_HOURS)}
        </Badge>
      </header>

      <p className="mb-2 text-sm text-muted-foreground">
        Muestra ilustrativa, según estas respuestas:
      </p>
      <ul aria-label="Respuestas del ejemplo" className="mb-4 flex flex-wrap gap-2">
        {EXAMPLE_ANSWERS.map((answer) => (
          <li key={answer}>
            <Badge variant="outline" className="font-normal">
              {answer}
            </Badge>
          </li>
        ))}
      </ul>

      <EngineMockup />
    </section>
  );
}
