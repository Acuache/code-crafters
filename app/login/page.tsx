import Image from "next/image";
import { redirect } from "next/navigation";

import { Eyebrow } from "@/components/brand/eyebrow";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/server";
import { signInWithProvider, type OAuthProvider } from "@/lib/supabase/actions";
import { ProviderButton } from "./provider-button";

const providers: { id: OAuthProvider; label: string }[] = [
  { id: "discord", label: "Discord" },
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
];

const errorMessages: Record<string, { title: string; description: string }> = {
  oauth_denied: {
    title: "Inicio de sesión cancelado",
    description: "Cancelaste el acceso con el proveedor. Podés intentarlo de nuevo cuando quieras.",
  },
  oauth_callback_failed: {
    title: "No pudimos completar el inicio de sesión",
    description: "El enlace de acceso venció o no es válido. Intentá iniciar sesión de nuevo.",
  },
  oauth_init_failed: {
    title: "No pudimos iniciar el acceso",
    description: "Ocurrió un problema al conectar con el proveedor. Intentá de nuevo.",
  },
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const errorMessage = error ? errorMessages[error] : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-logo-backdrop rounded-2xl px-6 py-4">
          <Image src="/logo.webp" alt="DevPathlles" width={240} height={92} priority />
        </div>
        <Eyebrow>Iniciar sesión</Eyebrow>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrá a DevPathlles</CardTitle>
          <CardDescription>
            Elegí un proveedor para continuar. Lo usamos para guardar tus rutas y tu progreso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>{errorMessage.title}</AlertTitle>
              <AlertDescription>{errorMessage.description}</AlertDescription>
            </Alert>
          ) : null}

          {providers.map((provider) => (
            <form key={provider.id} action={signInWithProvider.bind(null, provider.id)}>
              <ProviderButton provider={provider.id} label={provider.label} />
            </form>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
