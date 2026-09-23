"use client";

import { useState, useTransition } from "react";
import { WarningIcon } from "@phosphor-icons/react";

import { setCourseActive } from "@/app/(admin)/admin/courses/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type CourseStatusCardProps = {
  courseId: number;
  isActive: boolean;
};

// Sin update optimista: desactivar puede rechazarse por reglas del servidor (programas, intereses),
// así que el estado cambia recién cuando el servidor confirma, por el revalidatePath de la action.
export function CourseStatusCard({ courseId, isActive }: CourseStatusCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function handleToggle() {
    setErrorMessage(null);

    startSaving(async () => {
      const result = await setCourseActive(courseId, !isActive);
      if (!result.ok) {
        setErrorMessage(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Estado
          {isActive ? <Badge>Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
        </CardTitle>
        <CardDescription>
          {isActive
            ? "Un curso activo puede aparecer en las rutas nuevas si está en algún programa."
            : "Un curso inactivo no aparece en ninguna ruta nueva. Las rutas ya generadas lo conservan."}
        </CardDescription>
        <CardAction>
          <Button variant="outline" onClick={handleToggle} disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isActive ? "Desactivar" : "Reactivar"}
          </Button>
        </CardAction>
      </CardHeader>
      {errorMessage ? (
        <CardContent>
          <Alert variant="destructive">
            <WarningIcon />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
    </Card>
  );
}
