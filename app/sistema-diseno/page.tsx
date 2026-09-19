import type { Metadata } from "next"
import Image from "next/image"

import { Eyebrow } from "@/components/brand/eyebrow"
import { ThemeToggle } from "@/components/theme-toggle"
import { Section } from "./_components/section"
import { PaletteSection } from "./_components/palette-section"
import { ContrastSection } from "./_components/contrast-section"
import { TypographySection } from "./_components/typography-section"
import { ShapeSection } from "./_components/shape-section"
import { ComponentGallery } from "./_components/component-gallery"
import { StateGallery } from "./_components/state-gallery"
import { PatternsSection } from "./_components/patterns-section"
import { UsageRules } from "./_components/usage-rules"

export const metadata: Metadata = {
  title: "Sistema de diseño",
  description: "Tokens, tipografía y componentes de DevPathlles, inspirados en cursos.devtalles.com.",
  robots: { index: false },
}

export default function SistemaDisenoPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-6">
      <header className="relative flex flex-col items-center gap-6 py-24 text-center">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="bg-logo-backdrop rounded-2xl px-6 py-4">
          <Image src="/logo.webp" alt="" width={240} height={92} />
        </div>
        <Eyebrow>Sistema de diseño</Eyebrow>
        <h1 className="text-display max-w-2xl text-balance">DevPathlles, con la marca de DevTalles</h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          Paleta, tipografía y componentes tomados del CSS real de{" "}
          <a
            href="https://cursos.devtalles.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-bright underline underline-offset-4"
          >
            cursos.devtalles.com
          </a>
          , integrados en los tokens que ya usa shadcn/ui.
        </p>
      </header>

      <Section
        eyebrow="Paleta"
        title="Colores"
        description="Cada token con su valor en los dos temas y cuándo usarlo."
      >
        <PaletteSection />
      </Section>

      <Section
        eyebrow="Accesibilidad"
        title="Contraste"
        description="Ratios medidos contra WCAG AA (4.5:1 texto, 3:1 componentes)."
      >
        <ContrastSection />
      </Section>

      <Section eyebrow="Tipografía" title="Space Grotesk + DM Sans">
        <TypographySection />
      </Section>

      <Section eyebrow="Forma" title="Radios, sombras y gradientes">
        <ShapeSection />
      </Section>

      <Section eyebrow="Componentes" title="shadcn/ui con la marca aplicada">
        <ComponentGallery />
      </Section>

      <Section eyebrow="Estados" title="Foco, inválido y carga">
        <StateGallery />
      </Section>

      <Section
        eyebrow="Patrones del producto"
        title="Bloques para quiz, ruta y dashboard"
      >
        <PatternsSection />
      </Section>

      <Section eyebrow="Reglas de uso" title="Correcto vs. incorrecto">
        <UsageRules />
      </Section>
    </div>
  )
}
