"use client";

import { useState, useTransition } from "react";
import { TrashIcon, WarningIcon } from "@phosphor-icons/react";

import { deletePath } from "@/app/(app)/dashboard/actions";
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

type DeletePathButtonProps = {
  pathId: string;
  pathTitle: string;
};

// Sin update optimista (spec 09): borrar es irreversible, así que la tarjeta desaparece sólo
// cuando el servidor confirma, por el revalidatePath de la action.
export function DeletePathButton({ pathId, pathTitle }: DeletePathButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    // Mientras se borra no se deja cerrar: el resultado todavía puede ser un error que mostrar.
    if (isDeleting) {
      return;
    }

    setErrorMessage(null);
    setIsOpen(nextOpen);
  }

  function handleConfirmDelete() {
    setErrorMessage(null);

    startDeleting(async () => {
      const result = await deletePath(pathId);

      if (result.ok) {
        setIsOpen(false);
        return;
      }

      setErrorMessage(result.message);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ruta ${pathTitle}`} />
        }
      >
        <TrashIcon />
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>¿Eliminar esta ruta?</DialogTitle>
          <DialogDescription>
            Vas a eliminar «{pathTitle}». Se pierde el progreso marcado. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isDeleting} />}>
            Cancelar
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
            {isDeleting ? <Spinner data-icon="inline-start" /> : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
