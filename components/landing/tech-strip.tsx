import { Eyebrow } from "@/components/brand/eyebrow";
import { Badge } from "@/components/ui/badge";
import { TECHNOLOGIES } from "@/lib/paths/interests";
import { cn } from "@/lib/utils";

// Las mismas 15 del cuestionario (spec 04): la franja no puede prometer una tecnología que no hay.
const TECHNOLOGY_LABELS = Object.values(TECHNOLOGIES).map((technology) => technology.label);

function TechnologyList({ isMarqueeCopy }: { isMarqueeCopy: boolean }) {
  return (
    <ul
      aria-label={isMarqueeCopy ? undefined : "Tecnologías de las rutas"}
      aria-hidden={isMarqueeCopy ? true : undefined}
      className={cn(
        "flex shrink-0 gap-3 pr-3 motion-reduce:flex-wrap motion-reduce:pr-0",
        isMarqueeCopy && "motion-reduce:hidden",
      )}
    >
      {TECHNOLOGY_LABELS.map((label) => (
        <li key={label}>
          <Badge variant="secondary" className="h-8 px-3 text-sm">
            {label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function TechStrip() {
  return (
    <div className="border-y bg-surface/40 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:px-6">
        <Eyebrow>Rutas con cursos de</Eyebrow>
        <div className="overflow-hidden motion-safe:[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max motion-safe:animate-marquee motion-safe:hover:[animation-play-state:paused] motion-reduce:w-full">
            <TechnologyList isMarqueeCopy={false} />
            <TechnologyList isMarqueeCopy />
          </div>
        </div>
      </div>
    </div>
  );
}
