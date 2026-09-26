"use client";

import { useFormStatus } from "react-dom";
import { DiscordLogoIcon, GithubLogoIcon, GoogleLogoIcon, type Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { OAuthProvider } from "@/lib/supabase/actions";

const providerIcons: Record<OAuthProvider, Icon> = {
  discord: DiscordLogoIcon,
  google: GoogleLogoIcon,
  github: GithubLogoIcon,
};

type ProviderButtonProps = {
  provider: OAuthProvider;
  label: string;
  // El proveedor destacado (Discord: lo pide el concurso y ahí vive la comunidad) va con el color
  // de marca; el resto, en outline.
  isPrimary?: boolean;
  // Lado a lado solo cabe el nombre; el lector de pantalla sigue oyendo "Continuar con …".
  isCompact?: boolean;
};

export function ProviderButton({
  provider,
  label,
  isPrimary = false,
  isCompact = false,
}: ProviderButtonProps) {
  const { pending } = useFormStatus();
  const ProviderIcon = providerIcons[provider];
  const fullLabel = `Continuar con ${label}`;

  return (
    <Button
      type="submit"
      variant={isPrimary ? "brand" : "outline"}
      size="lg"
      className="h-11 w-full rounded-full text-base"
      disabled={pending}
      aria-label={isCompact ? fullLabel : undefined}
    >
      {pending ? <Spinner data-icon="inline-start" /> : <ProviderIcon data-icon="inline-start" />}
      {isCompact ? label : fullLabel}
    </Button>
  );
}
