import Link from "next/link";
import { ArrowDownIcon, PathIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import type { LandingLink } from "@/lib/landing/cta";

import { HeroScene } from "./hero-scene";

type LandingHeroProps = {
  primaryCta: LandingLink;
  isSignedIn: boolean;
};

export function LandingHero({ primaryCta, isSignedIn }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 pt-10 pb-16 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:py-12">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <h1 className="text-hero text-balance">
            Deja de adivinar{" "}
            <span className="block bg-linear-to-r from-primary-bright to-chart-2 bg-clip-text text-transparent">
              qué curso sigue
            </span>
          </h1>
          <p className="max-w-lg text-lg text-pretty text-muted-foreground sm:text-xl">
            Dinos tu meta y cuánto tiempo tienes. DevPathlles ordena los cursos de DevTalles, salta
            lo que ya dominas y te marca el siguiente paso.
          </p>

          <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <Button
              variant="brand"
              size="lg"
              className="h-14 w-full px-8 text-lg sm:w-auto"
              render={<Link href={primaryCta.href} />}
              nativeButton={false}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <PathIcon aria-hidden="true" className="size-5" />
                {primaryCta.label}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="h-14 px-5 text-base text-muted-foreground"
              render={<a href="#como-funciona" />}
              nativeButton={false}
            >
              <span className="inline-flex items-center justify-center gap-2">
                Mira cómo funciona
                <ArrowDownIcon aria-hidden="true" />
              </span>
            </Button>
          </div>

          {isSignedIn ? null : (
            <p className="text-sm text-balance text-muted-foreground">
              Gratis · Seis preguntas · Entra con Discord, Google o GitHub
            </p>
          )}
        </div>

        <HeroScene />
      </div>
    </section>
  );
}
