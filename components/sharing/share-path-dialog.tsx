"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  LinkBreakIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
  WarningIcon,
} from "@phosphor-icons/react";

import { setPathSharing } from "@/app/(app)/paths/[id]/share-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
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
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle className="text-lg">Compartir tu ruta</DialogTitle>
            <Badge variant={isPublic ? "secondary" : "outline"}>
              {isPublic ? <LinkSimpleIcon data-icon="inline-start" /> : null}
              {isPublic ? "Enlace activo" : "Solo tú"}
            </Badge>
          </div>
          <DialogDescription>
            {isPublic
              ? "Quien tenga el enlace puede ver tu ruta y copiarla a su cuenta. Tu avance permanece privado."
              : "Al crear el enlace, cualquiera podrá ver el título, el resumen, los cursos, tu nombre y tu avatar de Discord. Tu progreso permanecerá privado."}
          </DialogDescription>
        </DialogHeader>

        {isPublic ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="share-url" className="text-sm font-medium">
              Enlace público
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="share-url"
                ref={linkInputRef}
                readOnly
                value={shareUrl}
                className="h-11 min-w-0 font-mono text-xs"
                title={shareUrl}
                onClick={(event) => event.currentTarget.select()}
              />
              <Button
                variant="brand"
                className="h-11 sm:shrink-0"
                onClick={copyLink}
                disabled={isSaving}
              >
                {isCopied ? (
                  <CheckIcon data-icon="inline-start" />
                ) : (
                  <CopyIcon data-icon="inline-start" />
                )}
                {isCopied ? "Copiado" : "Copiar enlace"}
              </Button>
            </div>
            {copyStatus !== "idle" ? (
              <p role="status" aria-atomic="true" className="text-sm text-muted-foreground">
                {isCopied
                  ? "Enlace copiado al portapapeles."
                  : "El enlace quedó seleccionado. Cópialo con el atajo de tu dispositivo."}
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

        {isPublic ? <Separator /> : null}

        <DialogFooter className={isPublic ? "sm:justify-start" : undefined}>
          {isPublic ? (
            <Button
              variant="destructive"
              className="h-11"
              onClick={() => changeSharing(false)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <LinkBreakIcon data-icon="inline-start" />
              )}
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
