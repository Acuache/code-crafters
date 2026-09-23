"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { z } from "zod";

import { createProgram, updateProgram } from "@/app/(admin)/admin/programs/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  programSchema,
  type ProgramFormValues,
  type ProgramInput,
} from "@/lib/admin/program-schema";

// En la edición el slug se muestra deshabilitado pero no se valida; updateProgram lo descarta.
const programEditSchema = programSchema.extend({ slug: z.string() });

type ProgramFormProps =
  | { mode: "create"; initialValues: ProgramFormValues }
  | { mode: "edit"; programId: number; initialValues: ProgramFormValues };

export function ProgramForm(props: ProgramFormProps) {
  const isEditing = props.mode === "edit";
  const [serverError, setServerError] = useState<string | null>(null);
  const [wasSaved, setWasSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<ProgramFormValues, unknown, ProgramInput>({
    resolver: zodResolver(isEditing ? programEditSchema : programSchema),
    defaultValues: props.initialValues,
    mode: "onTouched",
  });
  const { errors } = form.formState;

  function handleValidSubmit(values: ProgramInput) {
    setServerError(null);
    setWasSaved(false);

    startSaving(async () => {
      const result =
        props.mode === "edit"
          ? await updateProgram(props.programId, values)
          : await createProgram(values);

      // Con éxito, createProgram redirige al detalle y la promesa no trae un resultado.
      if (!result) {
        return;
      }
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      setWasSaved(true);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleValidSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={!!errors.slug} data-disabled={isEditing || undefined}>
          <FieldLabel htmlFor="program-slug">Slug</FieldLabel>
          <Input
            id="program-slug"
            className="font-mono"
            disabled={isEditing}
            aria-invalid={!!errors.slug}
            {...form.register("slug")}
          />
          <FieldDescription>
            {isEditing
              ? "El slug queda fijo: las metas del cuestionario apuntan a él."
              : "Minúsculas, números y guiones. No se puede cambiar después."}
          </FieldDescription>
          <FieldError errors={[errors.slug]} />
        </Field>

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="program-name">Nombre</FieldLabel>
          <Input id="program-name" aria-invalid={!!errors.name} {...form.register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.position}>
          <FieldLabel htmlFor="program-position">Posición</FieldLabel>
          <Input
            id="program-position"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            aria-invalid={!!errors.position}
            {...form.register("position", { valueAsNumber: true })}
          />
          <FieldDescription>El orden del programa en las listas del panel.</FieldDescription>
          <FieldError errors={[errors.position]} />
        </Field>
      </FieldGroup>

      {serverError ? (
        <Alert variant="destructive">
          <WarningIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {wasSaved ? (
        <Alert>
          <CheckCircleIcon />
          <AlertDescription>Cambios guardados.</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" variant="brand" disabled={isSaving}>
          {isSaving ? <Spinner data-icon="inline-start" /> : null}
          {isEditing ? "Guardar cambios" : "Crear programa"}
        </Button>
      </div>
    </form>
  );
}
