import Link from "next/link";
import { ArrowDownIcon, PathIcon } from "@phosphor-icons/react/ssr";

import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";
import type { LandingLink } from "@/lib/landing/cta";

import { HeroMascot } from "./hero-mascot";
import { RoutePreview } from "./route-preview";

type LandingHeroProps = {
  primaryCta: LandingLink;
  isSignedIn: boolean;
};

export function LandingHero({ primaryCta, isSignedIn }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <Eyebrow>Rutas de aprendizaje · Cursos de DevTalles</Eyebrow>
          <h1 className="text-display text-balance">
            Una ruta de DevTalles que{" "}
            <span className="text-reflection bg-clip-text text-transparent">
              sí cabe en tu tiempo
            </span>
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Responde seis preguntas. DevPathlles combina cursos reales de DevTalles según tu meta y
            nivel, deja fuera lo que ya dominas y ajusta la ruta a tus horas y plazo. Cada curso
            explica por qué aparece.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              variant="brand"
              size="lg"
              className="h-11 px-6 text-base"
              render={<Link href={primaryCta.href} />}
              nativeButton={false}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <PathIcon aria-hidden="true" />
                {primaryCta.label}
              </span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-5 text-base"
              render={<a href="#ruta-ejemplo" />}
              nativeButton={false}
            >
              <span className="inline-flex items-center justify-center gap-2">
                Ver una ruta de ejemplo
                <ArrowDownIcon aria-hidden="true" />
              </span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <HeroMascot compact />
            <p className="max-w-sm text-sm text-pretty text-muted-foreground">
              DevPathlles es gratis.{" "}
              {isSignedIn
                ? null
                : "Inicia sesión con Discord, Google o GitHub para crear y guardar tu ruta. "}
              Los cursos están en DevTalles y pueden tener costo.
            </p>
          </div>
        </div>

        <RoutePreview />
      </div>
    </section>
  );
}
