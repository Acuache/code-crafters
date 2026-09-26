import type { ReactNode } from "react";

import { Eyebrow } from "@/components/brand/eyebrow";
import { Separator } from "@/components/ui/separator";

type SectionProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Envoltorio común para cada bloque de la galería: encabezado con eyebrow +
 * título + descripción opcional, separador y el contenido de la sección.
 */
function Section({ eyebrow, title, description, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-6 py-12">
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-title">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Separator />
      {children}
    </section>
  );
}

export { Section };
