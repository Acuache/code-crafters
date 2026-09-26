"use client";

import { TrashIcon } from "@phosphor-icons/react";

import { deletePath } from "@/app/(app)/dashboard/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

type DeletePathButtonProps = {
  pathId: string;
  pathTitle: string;
};

// Sin update optimista: borrar es irreversible, así que la tarjeta desaparece recién cuando el
// servidor confirma, por el revalidatePath de la action.
export function DeletePathButton({ pathId, pathTitle }: DeletePathButtonProps) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ruta ${pathTitle}`}>
          <TrashIcon />
        </Button>
      }
      title="¿Eliminar esta ruta?"
      description={`Vas a eliminar «${pathTitle}». Se pierde el progreso marcado. No se puede deshacer.`}
      confirmLabel="Eliminar"
      onConfirm={() => deletePath(pathId)}
    />
  );
}
