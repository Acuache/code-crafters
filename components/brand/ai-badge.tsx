import { SparkleIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";

/**
 * El lima (--ai) es, en toda la investigación del proyecto
 * (docs/investigacion/opcion-c.html), la marca visual de "esto lo generó
 * la IA" y no un color de marca genérico. No reusar --ai para otra cosa.
 *
 * AiBadge es un Server Component: los íconos se importan del submódulo
 * /ssr de @phosphor-icons/react, que no depende de React Context (ver
 * https://github.com/phosphor-icons/react#server-side-rendering-ssr).
 * El módulo principal solo funciona dentro de un árbol "use client".
 */
function AiBadge() {
  return (
    <Badge variant="ai">
      <SparkleIcon data-icon="inline-start" />
      Generado con IA
    </Badge>
  );
}

export { AiBadge };
