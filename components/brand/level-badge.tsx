import { Badge } from "@/components/ui/badge";
import type { ProgramLevel } from "@/lib/paths/types";

const BADGE_VARIANT_BY_LEVEL: Record<ProgramLevel, "required" | "recommended" | "optional"> = {
  requerido: "required",
  recomendado: "recommended",
  opcional: "optional",
};

// Mismo código de color que la demo de docs/investigacion/opcion-c.html.
export function LevelBadge({ level }: { level: ProgramLevel }) {
  return <Badge variant={BADGE_VARIANT_BY_LEVEL[level]}>{level}</Badge>;
}
