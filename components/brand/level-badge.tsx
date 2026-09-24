import { Badge } from "@/components/ui/badge";

type NivelCurso = "requerido" | "recomendado" | "opcional";

const BADGE_VARIANT_BY_LEVEL: Record<NivelCurso, "required" | "recommended" | "optional"> = {
  requerido: "required",
  recomendado: "recommended",
  opcional: "optional",
};

/**
 * Marca el nivel de un curso dentro de una ruta de aprendizaje, con el
 * mismo código de color que ya usaba docs/investigacion/opcion-c.html:
 * salmón (requerido), ámbar (recomendado), lila apagado (opcional).
 */
function LevelBadge({ nivel }: { nivel: NivelCurso }) {
  return <Badge variant={BADGE_VARIANT_BY_LEVEL[nivel]}>{nivel}</Badge>;
}

export { LevelBadge };
export type { NivelCurso };
