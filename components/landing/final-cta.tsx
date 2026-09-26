import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LandingLink } from "@/lib/landing/cta";

import { MASCOT_POSES } from "./mascot-poses";

const rocket = MASCOT_POSES.rocket;

export function FinalCta({ primaryCta }: { primaryCta: LandingLink }) {
  return (
    <section className="px-4 py-20 sm:px-6 lg:py-28">
      <Card className="mx-auto max-w-4xl brand-gradient-soft">
        <div className="flex flex-col items-center gap-6 px-6 text-center sm:flex-row sm:gap-10 sm:px-10 sm:text-left">
          {/* Cierra el círculo con el cohete del hero. Decorativa. */}
          <Image
            src={rocket.src}
            width={rocket.width}
            height={rocket.height}
            alt=""
            sizes="160px"
            className="h-auto w-28 shrink-0 drop-shadow-xl motion-safe:animate-float sm:w-40"
          />
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <h2 className="text-title text-balance">Tu próxima meta empieza hoy</h2>
            <p className="text-lg text-pretty text-muted-foreground">
              Seis preguntas y tienes tu ruta con cursos reales de DevTalles.
            </p>
            <Button
              variant="brand"
              size="lg"
              className="h-11 px-6 text-base"
              render={<Link href={primaryCta.href} />}
              nativeButton={false}
            >
              {primaryCta.label}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
