import { ClockIcon } from "@phosphor-icons/react";

import { LevelBadge } from "@/components/brand/level-badge";
import { Badge } from "@/components/ui/badge";
import type { StepOrigin } from "@/lib/paths/types";
import { formatHours } from "@/lib/progress/path-progress";

export function StepOriginBadge({ origin }: { origin: StepOrigin }) {
  if (origin === "interes") {
    return <Badge variant="outline">interés</Badge>;
  }

  return <LevelBadge level={origin} />;
}

export function CourseDuration({ hours }: { hours: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <ClockIcon aria-hidden="true" />
      {formatHours(hours)}
    </span>
  );
}
