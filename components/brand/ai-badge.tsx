import { SparkleIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";

// El lima (--ai) marca "esto lo generó la IA": no se reusa para otra cosa.
function AiBadge() {
  return (
    <Badge variant="ai">
      <SparkleIcon data-icon="inline-start" />
      Generado con IA
    </Badge>
  );
}

export { AiBadge };
