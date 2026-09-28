"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, SparkleIcon, TrashIcon, WarningIcon, XIcon } from "@phosphor-icons/react";

import {
  addPrerequisite,
  removePrerequisite,
  suggestPrerequisites,
} from "@/app/(admin)/admin/courses/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  PREREQUISITE_KIND_LABELS,
  PREREQUISITE_KINDS,
  prerequisiteSchema,
  type PrerequisiteFormValues,
  type PrerequisiteInput,
  type PrerequisiteKind,
  type PrerequisiteSuggestion,
} from "@/lib/admin/prerequisite-schema";

export type PrerequisiteRow = {
  courseId: number;
  slug: string;
  title: string;
  kind: PrerequisiteKind;
};

export type CourseOption = {
  id: number;
  title: string;
};

const KIND_ITEMS = PREREQUISITE_KINDS.map((kind) => ({
  value: kind,
  label: PREREQUISITE_KIND_LABELS[kind],
}));

const NEW_PREREQUISITE_VALUES: PrerequisiteFormValues = {
  prerequisiteCourseId: Number.NaN,
  kind: "necesita",
};

function KindBadge({ kind }: { kind: PrerequisiteKind }) {
  return (
    <Badge variant={kind === "necesita" ? "required" : "outline"}>
      {PREREQUISITE_KIND_LABELS[kind]}
    </Badge>
  );
}

type AddPrerequisiteDialogProps = {
  courseId: number;
  courseOptions: CourseOption[];
};

function AddPrerequisiteDialog({ courseId, courseOptions }: AddPrerequisiteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<PrerequisiteFormValues, unknown, PrerequisiteInput>({
    resolver: zodResolver(prerequisiteSchema),
    defaultValues: NEW_PREREQUISITE_VALUES,
    mode: "onTouched",
  });
  const { errors } = form.formState;
  const courseItems = courseOptions.map((course) => ({ value: course.id, label: course.title }));

  function handleOpenChange(nextOpen: boolean) {
    // Mientras se guarda no se deja cerrar: el resultado todavía puede ser un error que mostrar.
    if (isSaving) {
      return;
    }
    if (nextOpen) {
      form.reset(NEW_PREREQUISITE_VALUES);
    }
    setServerError(null);
    setIsOpen(nextOpen);
  }

  function handleValidSubmit(values: PrerequisiteInput) {
    setServerError(null);

    startSaving(async () => {
      const result = await addPrerequisite(courseId, values);
      if (result.ok) {
        setIsOpen(false);
        return;
      }
      setServerError(result.message);
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <PlusIcon data-icon="inline-start" />
            Agregar requisito
          </Button>
        }
      />
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(handleValidSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>Agregar requisito</DialogTitle>
            <DialogDescription>
              Vale para las rutas nuevas. Las ya generadas no cambian.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!errors.prerequisiteCourseId}>
              <FieldLabel htmlFor="prerequisite-course">Curso</FieldLabel>
              <Controller
                control={form.control}
                name="prerequisiteCourseId"
                render={({ field }) => (
                  <Select
                    items={courseItems}
                    value={Number.isNaN(field.value) ? null : field.value}
                    onValueChange={(value) => field.onChange(value ?? Number.NaN)}
                  >
                    <SelectTrigger
                      id="prerequisite-course"
                      className="w-full"
                      aria-invalid={!!errors.prerequisiteCourseId}
                    >
                      <SelectValue placeholder="Elige un curso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {courseItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.prerequisiteCourseId]} />
            </Field>

            <Field data-invalid={!!errors.kind}>
              <FieldLabel htmlFor="prerequisite-kind">Tipo</FieldLabel>
              <Controller
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <Select
                    items={KIND_ITEMS}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    <SelectTrigger
                      id="prerequisite-kind"
                      className="w-full"
                      aria-invalid={!!errors.kind}
                    >
                      <SelectValue placeholder="Elige un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {KIND_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>
                «Necesita» suma el curso a la ruta si falta. «Conviene antes» solo ordena.
              </FieldDescription>
              <FieldError errors={[errors.kind]} />
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
              <XIcon data-icon="inline-start" aria-hidden="true" />
              Cancelar
            </DialogClose>
            <Button type="submit" variant="brand" disabled={isSaving}>
              {isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
              )}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SuggestionListProps = {
  courseId: number;
  suggestions: PrerequisiteSuggestion[];
  onAdded: (suggestion: PrerequisiteSuggestion) => void;
};

function SuggestionList({ courseId, suggestions, onAdded }: SuggestionListProps) {
  const [addingCourseId, setAddingCourseId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startAdding] = useTransition();

  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        La IA no encontró cursos del catálogo en los requisitos que escribió el instructor.
      </p>
    );
  }

  function handleAdd(suggestion: PrerequisiteSuggestion) {
    setErrorMessage(null);
    setAddingCourseId(suggestion.courseId);

    startAdding(async () => {
      const result = await addPrerequisite(courseId, {
        prerequisiteCourseId: suggestion.courseId,
        kind: suggestion.kind,
      });
      setAddingCourseId(null);
      if (result.ok) {
        onAdded(suggestion);
        return;
      }
      setErrorMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.courseId}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{suggestion.title}</span>
                <KindBadge kind={suggestion.kind} />
              </div>
              <p className="text-xs text-pretty text-muted-foreground">{suggestion.reason}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={addingCourseId !== null}
              onClick={() => handleAdd(suggestion)}
            >
              {addingCourseId === suggestion.courseId ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              Agregar
            </Button>
          </li>
        ))}
      </ul>
      {errorMessage ? (
        <Alert variant="destructive">
          <WarningIcon />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function RemovePrerequisiteButton({
  courseId,
  prerequisite,
}: {
  courseId: number;
  prerequisite: PrerequisiteRow;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${prerequisite.title}`}>
          <TrashIcon />
        </Button>
      }
      title={`¿Quitar ${prerequisite.title} de los requisitos?`}
      description="Vale para las rutas nuevas. Las rutas ya generadas no cambian."
      confirmLabel="Quitar"
      onConfirm={() => removePrerequisite(courseId, prerequisite.courseId)}
    />
  );
}

type CoursePrerequisitesProps = {
  courseId: number;
  prerequisites: PrerequisiteRow[];
  // Los cursos activos que todavía no son requisito de este (sin el curso mismo).
  courseOptions: CourseOption[];
  isAiEnabled: boolean;
};

// Qué pide este curso antes (spec 17): el motor nunca lo pone antes de sus requisitos.
export function CoursePrerequisites({
  courseId,
  prerequisites,
  courseOptions,
  isAiEnabled,
}: CoursePrerequisitesProps) {
  const [suggestions, setSuggestions] = useState<PrerequisiteSuggestion[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [isSuggesting, startSuggesting] = useTransition();

  function handleSuggest() {
    setSuggestError(null);

    startSuggesting(async () => {
      const result = await suggestPrerequisites(courseId);
      if (result.ok) {
        setSuggestions(result.data);
        return;
      }
      setSuggestError(result.message);
    });
  }

  function removeSuggestion(added: PrerequisiteSuggestion) {
    setSuggestions((current) =>
      current ? current.filter((suggestion) => suggestion.courseId !== added.courseId) : current,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qué pide antes</CardTitle>
        <CardDescription>
          El motor nunca pone este curso antes de sus requisitos. «Necesita» además suma el curso a
          la ruta si falta.
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          {isAiEnabled ? (
            <Button variant="outline" onClick={handleSuggest} disabled={isSuggesting}>
              {isSuggesting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SparkleIcon data-icon="inline-start" />
              )}
              Sugerir con IA
            </Button>
          ) : null}
          <AddPrerequisiteDialog courseId={courseId} courseOptions={courseOptions} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {suggestError ? (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertDescription>{suggestError}</AlertDescription>
          </Alert>
        ) : null}

        {suggestions ? (
          <SuggestionList
            courseId={courseId}
            suggestions={suggestions}
            onAdded={removeSuggestion}
          />
        ) : null}

        {prerequisites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este curso no pide ningún otro.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prerequisites.map((prerequisite) => (
                <TableRow key={prerequisite.courseId}>
                  <TableCell className="whitespace-normal">
                    <Link
                      href={`/admin/courses/${encodeURIComponent(prerequisite.slug)}`}
                      className="font-medium text-primary-bright underline-offset-4 hover:underline"
                    >
                      {prerequisite.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <KindBadge kind={prerequisite.kind} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <RemovePrerequisiteButton courseId={courseId} prerequisite={prerequisite} />
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
