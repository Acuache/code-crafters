import { useState, useTransition, type ReactElement, type ReactNode } from "react";
import { WarningIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/action-result";

type ConfirmDialogProps = {
  trigger: ReactElement;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<ActionResult>;
};

// Confirmación de una acción destructiva que corre en el servidor. Sin "use client" a propósito:
// recibe `onConfirm`, así que solo se importa desde componentes cliente.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirming, startConfirming] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    // Mientras corre no se deja cerrar: el resultado todavía puede ser un error que mostrar.
    if (isConfirming) {
      return;
    }

    setErrorMessage(null);
    setIsOpen(nextOpen);
  }

  function handleConfirm() {
    setErrorMessage(null);

    startConfirming(async () => {
      const result = await onConfirm();

      if (result.ok) {
        setIsOpen(false);
        return;
      }

      setErrorMessage(result.message);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isConfirming} />}>
            Cancelar
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? <Spinner data-icon="inline-start" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
