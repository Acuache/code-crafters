"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleIcon, PlusIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";

import {
  addPlacement,
  removePlacement,
  updatePlacement,
  type AdminActionResult,
} from "@/app/(admin)/admin/courses/actions";
import { LevelBadge } from "@/components/brand/level-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  PROGRAM_COURSE_LEVELS,
  placementSchema,
  type PlacementFormValues,
  type PlacementInput,
} from "@/lib/admin/program-schema";

type ProgramCourseLevel = (typeof PROGRAM_COURSE_LEVELS)[number];

export type PlacementRow = {
  id: number;
  programId: number;
  programSlug: string;
  programName: string;
  stage: number;
  level: ProgramCourseLevel;
  note: string | null;
};

export type ProgramOption = {
  id: number;
  name: string;
};

const LEVEL_ITEMS = PROGRAM_COURSE_LEVELS.map((level) => ({ value: level, label: level }));

type PlacementDialogProps = {
  programs: ProgramOption[];
  initialValues: PlacementFormValues;
  title: string;
  description: string;
  submitLabel: string;
  trigger: React.ReactElement;
  onSave: (values: PlacementInput) => Promise<AdminActionResult>;
};

// El mismo formulario sirve para agregar y para editar una ubicación; cambia la action y el texto.
function PlacementDialog({
  programs,
  initialValues,
  title,
  description,
  submitLabel,
  trigger,
  onSave,
}: PlacementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<PlacementFormValues, unknown, PlacementInput>({
    resolver: zodResolver(placementSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });
  const { errors } = form.formState;
  const programItems = programs.map((program) => ({ value: program.id, label: program.name }));

  function handleOpenChange(nextOpen: boolean) {
    // Mientras se guarda no se deja cerrar: el resultado todavía puede ser un error que mostrar.
    if (isSaving) {
      return;
    }
    if (nextOpen) {
      form.reset(initialValues);
    }
    setServerError(null);
    setIsOpen(nextOpen);
  }

  function handleValidSubmit(values: PlacementInput) {
    setServerError(null);

    startSaving(async () => {
      const result = await onSave(values);
      if (result.ok) {
        setIsOpen(false);
        return;
      }
      setServerError(result.message);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(handleValidSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!errors.programId}>
              <FieldLabel htmlFor="placement-program">Programa</FieldLabel>
              <Controller
                control={form.control}
                name="programId"
                render={({ field }) => (
                  <Select
                    items={programItems}
                    value={Number.isNaN(field.value) ? null : field.value}
                    onValueChange={(value) => field.onChange(value ?? Number.NaN)}
                  >
                    <SelectTrigger
                      id="placement-program"
                      className="w-full"
                      aria-invalid={!!errors.programId}
                    >
                      <SelectValue placeholder="Elegí un programa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {programItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.programId]} />
            </Field>

            <Field data-invalid={!!errors.stage}>
              <FieldLabel htmlFor="placement-stage">Etapa</FieldLabel>
              <Input
                id="placement-stage"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                aria-invalid={!!errors.stage}
                {...form.register("stage", { valueAsNumber: true })}
              />
              <FieldDescription>
                El orden de estudio dentro del programa: 1 es lo primero.
              </FieldDescription>
              <FieldError errors={[errors.stage]} />
            </Field>

            <Field data-invalid={!!errors.level}>
              <FieldLabel htmlFor="placement-level">Nivel</FieldLabel>
              <Controller
                control={form.control}
                name="level"
                render={({ field }) => (
                  <Select
                    items={LEVEL_ITEMS}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger
                      id="placement-level"
                      className="w-full"
                      aria-invalid={!!errors.level}
                    >
                      <SelectValue placeholder="Elegí un nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {LEVEL_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.level]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="placement-note">Nota</FieldLabel>
              <Textarea
                id="placement-note"
                placeholder="Opcional. Ej.: elegí uno de los dos."
                {...form.register("note")}
              />
            </Field>
          </FieldGroup>

          {serverError ? (
            <Alert variant="destructive">
              <WarningIcon />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isSaving} />}>
              Cancelar
            </DialogClose>
            <Button type="submit" variant="brand" disabled={isSaving}>
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemovePlacementButton({ placement }: { placement: PlacementRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRemoving, startRemoving] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (isRemoving) {
      return;
    }
    setErrorMessage(null);
    setIsOpen(nextOpen);
  }

  function handleConfirmRemove() {
    setErrorMessage(null);

    startRemoving(async () => {
      const result = await removePlacement(placement.id);
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
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Quitar del programa ${placement.programName}`}
          />
        }
      >
        <TrashIcon />
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>¿Quitar este curso de {placement.programName}?</DialogTitle>
          <DialogDescription>
            Deja de aparecer en las rutas nuevas de ese programa. Las rutas ya generadas no cambian.
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isRemoving} />}>
            Cancelar
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirmRemove} disabled={isRemoving}>
            {isRemoving ? <Spinner data-icon="inline-start" /> : null}
            Quitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CoursePlacementsProps = {
  courseId: number;
  courseIsActive: boolean;
  placements: PlacementRow[];
  programs: ProgramOption[];
};

const NEW_PLACEMENT_VALUES: PlacementFormValues = {
  programId: Number.NaN,
  stage: 1,
  level: "opcional",
  note: "",
};

export function CoursePlacements({
  courseId,
  courseIsActive,
  placements,
  programs,
}: CoursePlacementsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dónde aparece este curso</CardTitle>
        <CardDescription>
          El motor arma las rutas a partir de los programas: un curso sin programa solo aparece si
          un interés del cuestionario lo nombra.
        </CardDescription>
        {courseIsActive ? (
          <CardAction>
            <PlacementDialog
              programs={programs}
              initialValues={NEW_PLACEMENT_VALUES}
              title="Agregar a un programa"
              description="El curso se agrega al final de la etapa y el nivel que elijas."
              submitLabel="Agregar"
              trigger={
                <Button variant="outline">
                  <PlusIcon data-icon="inline-start" />
                  Agregar a un programa
                </Button>
              }
              onSave={(values) => addPlacement(courseId, values)}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {courseIsActive ? null : (
          <Alert>
            <WarningIcon />
            <AlertDescription>Reactivá el curso para ubicarlo en un programa.</AlertDescription>
          </Alert>
        )}

        {placements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no está en ningún programa.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programa</TableHead>
                <TableHead className="text-right">Etapa</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements.map((placement) => (
                <TableRow key={placement.id}>
                  <TableCell>
                    <Link
                      href={`/admin/programs/${encodeURIComponent(placement.programSlug)}`}
                      className="font-medium text-primary-bright underline-offset-4 hover:underline"
                    >
                      {placement.programName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{placement.stage}</TableCell>
                  <TableCell>
                    <LevelBadge nivel={placement.level} />
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                    {placement.note ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <PlacementDialog
                        programs={programs}
                        initialValues={{
                          programId: placement.programId,
                          stage: placement.stage,
                          level: placement.level,
                          note: placement.note ?? "",
                        }}
                        title={`Editar ubicación en ${placement.programName}`}
                        description="Si cambiás el programa, la etapa o el nivel, el curso pasa al final de su nuevo grupo."
                        submitLabel="Guardar"
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar ubicación en ${placement.programName}`}
                          >
                            <PencilSimpleIcon />
                          </Button>
                        }
                        onSave={(values) => updatePlacement(placement.id, values)}
                      />
                      <RemovePlacementButton placement={placement} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
