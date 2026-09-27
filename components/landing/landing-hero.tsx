import Link from "next/link";
import { ArrowDownIcon, PathIcon } from "@phosphor-icons/react/ssr";

import { Eyebrow } from "@/components/brand/eyebrow";
import { Button } from "@/components/ui/button";
import type { LandingLink } from "@/lib/landing/cta";

import { HeroMascot } from "./hero-mascot";

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
            Tu ruta de aprendizaje en DevTalles,{" "}
            <span className="text-reflection bg-clip-text text-transparent">
              trazada para ti
            </span>
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Cuéntanos tu meta, tu nivel y cuánto tiempo tienes. DevPathlles arma una ruta con cursos
            reales de DevTalles, te explica por qué va cada uno y te acompaña hasta terminarla.
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
            <p className="text-sm text-muted-foreground">
              Gratis · Entra con Discord, Google o GitHub
            </p>
          )}
        </div>

        <HeroMascot />
      </div>
    </section>
  );
}
