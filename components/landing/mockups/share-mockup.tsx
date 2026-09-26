import { LinkSimpleIcon } from "@phosphor-icons/react/ssr";

import { Card, CardContent } from "@/components/ui/card";
import { EXAMPLE_AI } from "@/lib/landing/example-path";
import { cn } from "@/lib/utils";

import { afterArrival, FADE_IN_ON_ARRIVAL } from "./reveal";

// Una tarjeta de link genérica, como la que muestra un chat al pegar el enlace. No imita la
// interfaz de Discord.
export function ShareMockup() {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <LinkSimpleIcon aria-hidden="true" />
          /shared/tu-ruta
        </span>
        <div
          className={cn(
            "flex flex-col gap-1 rounded-lg border-l-4 border-primary-bright bg-surface p-3",
            FADE_IN_ON_ARRIVAL,
          )}
          style={afterArrival(400)}
        >
          <span className="text-xs font-medium text-muted-foreground">DevPathlles</span>
          <span className="font-heading font-semibold text-primary-bright">{EXAMPLE_AI.title}</span>
          <span className="text-muted-foreground">de tu_nombre</span>
        </div>
      </CardContent>
    </Card>
  );
}
