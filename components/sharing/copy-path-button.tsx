"use client";

import { useState, useTransition } from "react";
import { CopySimpleIcon } from "@phosphor-icons/react";

import { copySharedPath } from "@/app/shared/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type CopyPathButtonProps = {
  slug: string;
};

// "Hacer esta ruta": copia la ruta compartida a la cuenta de quien la mira (spec 15).
export function CopyPathButton({ slug }: CopyPathButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleCopy() {
    setErrorMessage(null);
    startTransition(async () => {
      // Si sale bien, la action redirige a la copia y no vuelve.
      const failure = await copySharedPath(slug);
      setErrorMessage(failure.message);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="brand" onClick={handleCopy} disabled={isPending}>
        {isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <CopySimpleIcon data-icon="inline-start" />
        )}
        {isPending ? "Creando tu copia…" : "Hacer esta ruta"}
      </Button>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
