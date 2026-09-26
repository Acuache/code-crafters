import type { Metadata } from "next";

import { FinalCta } from "@/components/landing/final-cta";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { TechStrip } from "@/components/landing/tech-strip";
import { landingCtas } from "@/lib/landing/cta";
import { createClient } from "@/lib/supabase/server";

const TITLE = "DevPathlles · Tu ruta de aprendizaje en DevTalles";
const DESCRIPTION =
  "Cuéntanos tu meta, tu nivel y cuánto tiempo tienes: DevPathlles arma una ruta con cursos reales de DevTalles y te acompaña hasta terminarla.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "DevPathlles",
    type: "website",
  },
};

// La sesión solo decide qué dicen los botones: si Supabase no responde, la landing se ve igual.
// createClient() queda fuera del try: cookies() avisa a Next que la página es dinámica lanzando un
// error propio, y atraparlo lo ocultaría.
async function readIsSignedIn(): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data } = await supabase.auth.getClaims();
    return Boolean(data?.claims);
  } catch (error) {
    console.error("[landing] no se pudo leer la sesión:", error);
    return false;
  }
}

export default async function LandingPage() {
  const isSignedIn = await readIsSignedIn();
  const ctas = landingCtas(isSignedIn);

  return (
    <>
      <LandingHeader cta={ctas.header} />
      <main className="flex flex-1 flex-col">
        <LandingHero primaryCta={ctas.primary} isSignedIn={isSignedIn} />
        <TechStrip />
        <HowItWorks />
        <LandingFaq />
        <FinalCta primaryCta={ctas.primary} />
      </main>
      <LandingFooter />
    </>
  );
}
