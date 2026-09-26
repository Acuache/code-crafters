import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, CheckCircleIcon, ShieldCheckIcon } from "@phosphor-icons/react/ssr";

import { Eyebrow } from "@/components/brand/eyebrow";
import { MASCOT_POSES } from "@/components/landing/mascot-poses";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { signInWithProvider, type OAuthProvider } from "@/lib/supabase/actions";
import { parseNextPath } from "@/lib/supabase/next-path";
import { ProviderButton } from "./provider-button";

type Provider = { id: OAuthProvider; label: string };

// Discord va destacado: lo pide el concurso y ahí está la comunidad de DevTalles.
const PRIMARY_PROVIDER: Provider = { id: "discord", label: "Discord" };
const OTHER_PROVIDERS: Provider[] = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
];

const errorMessages: Record<string, { title: string; description: string }> = {
  oauth_denied: {
    title: "Inicio de sesión cancelado",
    description:
      "Cancelaste el acceso con el proveedor. Puedes intentarlo de nuevo cuando quieras.",
  },
  oauth_callback_failed: {
    title: "No pudimos completar el inicio de sesión",
    description: "El enlace de acceso venció o no es válido. Intenta iniciar sesión de nuevo.",
  },
  oauth_init_failed: {
    title: "No pudimos iniciar el acceso",
    description: "Ocurrió un problema al conectar con el proveedor. Intenta de nuevo.",
  },
};

const BENEFITS = ["Cursos reales de DevTalles", "XP, niveles y racha", "Compártela en Discord"];

// La órbita con estrellas: el astronauta que saluda ya está en el logo, el mapa y la landing.
const mascot = MASCOT_POSES.orbit;

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  // A dónde volver después del login, por ejemplo al link de una ruta compartida (spec 15).
  const nextPath = parseNextPath(next);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect(nextPath ?? "/dashboard");
  }

  const errorMessage = error ? errorMessages[error] : undefined;

  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <BrandPanel />

      <div className="flex flex-col px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" render={<Link href="/" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
            Volver al inicio
          </Button>
          <ThemeToggle />
        </div>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="relative w-full max-w-md">
            <div
              aria-hidden="true"
              className="absolute -inset-8 rounded-full bg-primary/15 blur-3xl"
            />
            <Card className="relative gap-6 py-8 shadow-brand">
              <CardHeader className="justify-items-center gap-3 px-6 text-center sm:px-8">
                {/* Solo en móvil, donde no está el panel de marca. */}
                <div className="rounded-2xl bg-logo-backdrop px-5 py-3 lg:hidden">
                  <Image
                    src="/logo.webp"
                    alt="DevPathlles"
                    width={144}
                    height={55}
                    loading="eager"
                    className="h-auto w-40"
                  />
                </div>
                <Eyebrow>Iniciar sesión</Eyebrow>
                <h1 className="text-title text-balance">Entra a DevPathlles</h1>
                <p className="text-pretty text-muted-foreground">
                  Elige cómo entrar. Guardamos tus rutas y tu avance en tu cuenta.
                </p>
              </CardHeader>

              <CardContent className="gap-4 px-6 sm:px-8">
                {errorMessage ? (
                  <Alert variant="destructive">
                    <AlertTitle>{errorMessage.title}</AlertTitle>
                    <AlertDescription>{errorMessage.description}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-2">
                  <ProviderForm provider={PRIMARY_PROVIDER} nextPath={nextPath} isPrimary />
                  <p className="text-center text-xs text-balance text-muted-foreground">
                    Recomendado: la comunidad de DevTalles está en Discord
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Separator className="flex-1" />
                  <span className="shrink-0">o continúa con</span>
                  <Separator className="flex-1" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {OTHER_PROVIDERS.map((provider) => (
                    <ProviderForm
                      key={provider.id}
                      provider={provider}
                      nextPath={nextPath}
                      isCompact
                    />
                  ))}
                </div>
              </CardContent>

              <CardFooter className="justify-center gap-2 px-6 text-center text-xs text-muted-foreground sm:px-8">
                <ShieldCheckIcon aria-hidden="true" className="size-4 shrink-0" />
                <span className="text-pretty">
                  Usamos tu nombre y tu avatar para tu perfil. Nunca publicamos nada en tu nombre.
                </span>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

type ProviderFormProps = {
  provider: Provider;
  nextPath: string | null;
  isPrimary?: boolean;
  isCompact?: boolean;
};

function ProviderForm({ provider, nextPath, isPrimary, isCompact }: ProviderFormProps) {
  return (
    <form action={signInWithProvider.bind(null, provider.id, nextPath)}>
      <ProviderButton
        provider={provider.id}
        label={provider.label}
        isPrimary={isPrimary}
        isCompact={isCompact}
      />
    </form>
  );
}

// Solo en desktop: el mismo lenguaje del hero de la landing (estrellas, mascota que flota, título).
function BrandPanel() {
  return (
    <aside
      aria-label="Qué es DevPathlles"
      className="relative hidden overflow-hidden border-r brand-gradient-soft lg:flex"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 starfield opacity-60 motion-safe:animate-twinkle"
      />
      <div className="relative m-auto flex max-w-lg flex-col items-center gap-8 px-10 py-16 text-center">
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-8 rounded-full bg-primary/30 blur-3xl"
          />
          <Image
            src={mascot.src}
            width={mascot.width}
            height={mascot.height}
            alt=""
            sizes="288px"
            loading="eager"
            className="relative h-auto w-72 drop-shadow-2xl motion-safe:animate-float"
          />
        </div>
        <p className="font-heading text-title text-balance">
          Tu ruta de aprendizaje en DevTalles,{" "}
          <span className="bg-linear-to-r from-primary-bright to-chart-2 bg-clip-text text-transparent">
            trazada para ti
          </span>
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1.5 text-sm"
            >
              <CheckCircleIcon
                weight="fill"
                aria-hidden="true"
                className="size-4 shrink-0 text-primary-bright"
              />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
