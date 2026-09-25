"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
  WarningIcon,
} from "@phosphor-icons/react";

import { setPathSharing } from "@/app/(app)/paths/[id]/share-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const COPIED_FEEDBACK_MS = 2000;

type CopyStatus = "idle" | "copied" | "manual";

type SharePathDialogProps = {
  pathId: string;
  shareSlug: string;
  isPublic: boolean;
};

// El dueño publica su ruta, copia el link o deja de compartirla (spec 15). `isPublic` llega de la
// página: la action la revalida, así que no hace falta un estado propio.
export function SharePathDialog({ pathId, shareSlug, isPublic }: SharePathDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Se arma al abrir, en el navegador: en el servidor no hay `window.location`.
  const [shareUrl, setShareUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (copyStatus !== "copied") {
      return;
    }

    const timeout = window.setTimeout(() => setCopyStatus("idle"), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  function handleOpenChange(nextOpen: boolean) {
    // Mientras corre no se deja cerrar: el resultado todavía puede ser un error que mostrar.
    if (isSaving) {
      return;
    }

    if (nextOpen) {
      setShareUrl(`${window.location.origin}/shared/${shareSlug}`);
    }

    setErrorMessage(null);
    setCopyStatus("idle");
    setIsOpen(nextOpen);
  }

  function changeSharing(nextIsPublic: boolean) {
    setErrorMessage(null);
    setCopyStatus("idle");

    startSaving(async () => {
      const result = await setPathSharing(pathId, nextIsPublic);
      if (!result.ok) {
        setErrorMessage(result.message);
      }
    });
  }

  // Sin permiso de portapapeles (o fuera de HTTPS), el texto queda seleccionado para copiarlo a mano.
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("copied");
    } catch {
      linkInputRef.current?.select();
      setCopyStatus("manual");
    }
  }

  const isCopied = copyStatus === "copied";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <ShareNetworkIcon data-icon="inline-start" />
        Compartir
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartir tu ruta</DialogTitle>
          <DialogDescription>
            {isPublic
              ? "Cualquiera con este enlace puede ver tu ruta y hacerla desde su cuenta. Tu avance no se muestra."
              : "Se verán el título, el resumen y los cursos de tu ruta tal como los ves, con tu nombre y tu avatar de Discord. Tu avance no se muestra."}
          </DialogDescription>
        </DialogHeader>

        {isPublic ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                ref={linkInputRef}
                readOnly
                value={shareUrl}
                aria-label="Enlace público de tu ruta"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button variant="outline" onClick={copyLink} disabled={isSaving}>
                {isCopied ? (
                  <CheckIcon data-icon="inline-start" />
                ) : (
                  <CopyIcon data-icon="inline-start" />
                )}
                {isCopied ? "Copiado" : "Copiar enlace"}
              </Button>
            </div>
            {copyStatus === "manual" ? (
              <p role="status" className="text-sm text-muted-foreground">
                Copia el enlace a mano
              </p>
            ) : null}
          </div>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          {isPublic ? (
            <Button variant="ghost" onClick={() => changeSharing(false)} disabled={isSaving}>
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              Dejar de compartir
            </Button>
          ) : (
            <Button variant="brand" onClick={() => changeSharing(true)} disabled={isSaving}>
              {isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <LinkSimpleIcon data-icon="inline-start" />
              )}
              Crear enlace público
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
