import * as React from "react";

import { cn } from "@/lib/utils";

// La etiqueta pequeña en mayúsculas que DevTalles pone arriba de cada título de sección.
function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="eyebrow"
      className={cn("text-eyebrow text-primary-bright uppercase", className)}
      {...props}
    />
  );
}

export { Eyebrow };
