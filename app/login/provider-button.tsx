"use client";

import { useFormStatus } from "react-dom";
import {
  DiscordLogoIcon,
  GithubLogoIcon,
  GoogleLogoIcon,
  type Icon,
} from "@phosphor-icons/react";
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
};

export function ProviderButton({ provider, label }: ProviderButtonProps) {
  const { pending } = useFormStatus();
  const ProviderIcon = providerIcons[provider];

  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <ProviderIcon data-icon="inline-start" />
      )}
      Continuar con {label}
    </Button>
  );
}
