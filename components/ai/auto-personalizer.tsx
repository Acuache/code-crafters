"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { InfoIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { personalizePath } from "@/lib/ai/actions";

type AutoPersonalizerProps = {
  pathId: string;
};

const FAILURE_MESSAGE = "No pudimos personalizar el texto de tu ruta ahora. Tu ruta sigue igual.";

// La página lo monta solo cuando corresponde (key configurada, texto libre escrito, ruta sin
// intentos previos, usos disponibles): este componente no decide nada, solo lo ejecuta una vez.
// El texto nuevo llega por el revalidatePath de la action; la ruta sigue usable mientras tanto.
export function AutoPersonalizer({ pathId }: AutoPersonalizerProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const [isPersonalizing, startPersonalizing] = useTransition();
  // En desarrollo, StrictMode monta los efectos dos veces: sin esta marca se gastarían dos usos.
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    startPersonalizing(async () => {
      const result = await personalizePath(pathId);
      if (!result.ok) {
        setHasFailed(true);
      }
    });
  }, [pathId]);

  if (isPersonalizing) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <Spinner />
        Personalizando tu ruta con lo que nos contaste…
      </p>
    );
  }

  if (hasFailed) {
    return (
      <Alert>
        <InfoIcon />
        <AlertDescription>{FAILURE_MESSAGE}</AlertDescription>
      </Alert>
    );
  }

  return null;
}
