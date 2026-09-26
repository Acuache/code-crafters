"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { z } from "zod";

import { createCourse, updateCourse } from "@/app/(admin)/admin/courses/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
import { Textarea } from "@/components/ui/textarea";
import {
  COURSE_DIFFICULTIES,
  THINKIFIC_IMAGE_HOST,
  courseSchema,
  type CourseFormValues,
  type CourseInput,
} from "@/lib/admin/course-schema";

// En la edición el slug se muestra deshabilitado pero no se valida (puede ser un slug heredado que
// no es kebab-case); updateCourse lo descarta igual en el servidor.
const courseEditSchema = courseSchema.extend({ slug: z.string() });

// Lo que maneja el formulario: los valores crudos de cada input (texto del textarea, "" en un
// opcional vacío, NaN en un número vacío). El schema los normaliza al validar.
export type CourseFormFields = CourseFormValues;

export const EMPTY_COURSE_FIELDS: CourseFormFields = {
  slug: "",
  title: "",
  summary: "",
  url: "",
  imageUrl: "",
  instructor: "",
  hours: Number.NaN,
  lessons: Number.NaN,
  price: Number.NaN,
  isFree: false,
  isPro: false,
  isNew: false,
  inConstruction: false,
  difficulty: "",
  outcome: "",
  areas: "",
  prerequisites: "",
  topics: "",
  outcomes: "",
  chapters: "",
  related: "",
};

const DIFFICULTY_ITEMS = COURSE_DIFFICULTIES.map((difficulty) => ({
  value: difficulty,
  label: difficulty,
}));

const FLAG_FIELDS = [
  { name: "isFree", label: "Gratis" },
  { name: "isPro", label: "Incluido en PRO" },
  { name: "isNew", label: "Nuevo" },
  { name: "inConstruction", label: "En construcción" },
] as const;

const LINE_LIST_FIELDS = [
  { name: "areas", label: "Áreas", placeholder: "frontend" },
  { name: "prerequisites", label: "Requisitos previos", placeholder: "JavaScript" },
  { name: "topics", label: "Temas", placeholder: "Hooks" },
  { name: "outcomes", label: "Qué vas a aprender", placeholder: "Crear componentes" },
  { name: "chapters", label: "Capítulos", placeholder: "Introducción" },
  { name: "related", label: "Cursos relacionados (slugs)", placeholder: "react-pro" },
] as const;

type CourseFormProps =
  | { mode: "create"; initialValues: CourseFormFields }
  | { mode: "edit"; courseId: number; initialValues: CourseFormFields };

type LinesFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
};

// Seis campos idénticos salvo por el texto: se repiten en un map en vez de copiar el bloque seis
// veces.
function LinesField({ id, label, placeholder, registration }: LinesFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} placeholder={placeholder} {...registration} />
      <FieldDescription>Uno por línea. Las líneas vacías se ignoran.</FieldDescription>
    </Field>
  );
}

export function CourseForm(props: CourseFormProps) {
  const isEditing = props.mode === "edit";
  const [serverError, setServerError] = useState<string | null>(null);
  const [wasSaved, setWasSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<CourseFormFields, unknown, CourseInput>({
    resolver: zodResolver(isEditing ? courseEditSchema : courseSchema),
    defaultValues: props.initialValues,
    mode: "onTouched",
  });
  const { errors } = form.formState;

  function handleValidSubmit(values: CourseInput) {
    setServerError(null);
    setWasSaved(false);

    startSaving(async () => {
      const result =
        props.mode === "edit"
          ? await updateCourse(props.courseId, values)
          : await createCourse(values);

      // Con éxito, createCourse redirige a la edición y la promesa no trae un resultado.
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
    <form
      onSubmit={form.handleSubmit(handleValidSubmit)}
      noValidate
      className="flex flex-col gap-8"
    >
      <FieldSet>
        <FieldLegend>Datos del curso</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!errors.slug} data-disabled={isEditing || undefined}>
            <FieldLabel htmlFor="course-slug">Slug</FieldLabel>
            <Input
              id="course-slug"
              className="font-mono"
              disabled={isEditing}
              aria-invalid={!!errors.slug}
              {...form.register("slug")}
            />
            <FieldDescription>
              {isEditing
                ? "El slug queda fijo: el motor de rutas lo usa para reconocer el curso."
                : "Minúsculas, números y guiones. No se puede cambiar después."}
            </FieldDescription>
            <FieldError errors={[errors.slug]} />
          </Field>

          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="course-title">Título</FieldLabel>
            <Input id="course-title" aria-invalid={!!errors.title} {...form.register("title")} />
            <FieldError errors={[errors.title]} />
          </Field>

          <Field data-invalid={!!errors.summary}>
            <FieldLabel htmlFor="course-summary">Resumen</FieldLabel>
            <Textarea id="course-summary" {...form.register("summary")} />
          </Field>

          <Field data-invalid={!!errors.outcome}>
            <FieldLabel htmlFor="course-outcome">Qué logra el alumno al terminarlo</FieldLabel>
            <Textarea
              id="course-outcome"
              aria-invalid={!!errors.outcome}
              {...form.register("outcome")}
            />
            <FieldError errors={[errors.outcome]} />
          </Field>

          <Field data-invalid={!!errors.difficulty}>
            <FieldLabel htmlFor="course-difficulty">Dificultad</FieldLabel>
            <Controller
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <Select
                  items={DIFFICULTY_ITEMS}
                  value={field.value === "" ? null : field.value}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger
                    id="course-difficulty"
                    className="w-full"
                    aria-invalid={!!errors.difficulty}
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder="Elige una dificultad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DIFFICULTY_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.difficulty]} />
          </Field>

          <Field data-invalid={!!errors.instructor}>
            <FieldLabel htmlFor="course-instructor">Instructor</FieldLabel>
            <Input id="course-instructor" {...form.register("instructor")} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Enlaces</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!errors.url}>
            <FieldLabel htmlFor="course-url">URL del curso en DevTalles</FieldLabel>
            <Input
              id="course-url"
              type="url"
              placeholder="https://cursos.devtalles.com/courses/..."
              aria-invalid={!!errors.url}
              {...form.register("url")}
            />
            <FieldError errors={[errors.url]} />
          </Field>

          <Field data-invalid={!!errors.imageUrl}>
            <FieldLabel htmlFor="course-image-url">Portada</FieldLabel>
            <Input
              id="course-image-url"
              type="url"
              placeholder={`https://${THINKIFIC_IMAGE_HOST}/...`}
              aria-invalid={!!errors.imageUrl}
              {...form.register("imageUrl")}
            />
            <FieldDescription>
              Opcional. Solo imágenes de {THINKIFIC_IMAGE_HOST}, el CDN de las portadas de
              DevTalles.
            </FieldDescription>
            <FieldError errors={[errors.imageUrl]} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Duración y precio</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!errors.hours}>
            <FieldLabel htmlFor="course-hours">Horas</FieldLabel>
            <Input
              id="course-hours"
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.1}
              aria-invalid={!!errors.hours}
              {...form.register("hours", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.hours]} />
          </Field>

          <Field data-invalid={!!errors.lessons}>
            <FieldLabel htmlFor="course-lessons">Lecciones</FieldLabel>
            <Input
              id="course-lessons"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              aria-invalid={!!errors.lessons}
              {...form.register("lessons", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.lessons]} />
          </Field>

          <Field data-invalid={!!errors.price}>
            <FieldLabel htmlFor="course-price">Precio (USD)</FieldLabel>
            <Input
              id="course-price"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              aria-invalid={!!errors.price}
              {...form.register("price", { valueAsNumber: true })}
            />
            <FieldDescription>
              Vacío si el curso solo se consigue con la suscripción PRO.
            </FieldDescription>
            <FieldError errors={[errors.price]} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Etiquetas</FieldLegend>
        <FieldGroup data-slot="checkbox-group">
          {FLAG_FIELDS.map((flag) => (
            <Controller
              key={flag.name}
              control={form.control}
              name={flag.name}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id={`course-${flag.name}`}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                  <FieldLabel htmlFor={`course-${flag.name}`}>{flag.label}</FieldLabel>
                </Field>
              )}
            />
          ))}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Contenido</FieldLegend>
        <FieldGroup>
          {LINE_LIST_FIELDS.map((listField) => (
            <LinesField
              key={listField.name}
              id={`course-${listField.name}`}
              label={listField.label}
              placeholder={listField.placeholder}
              registration={form.register(listField.name)}
            />
          ))}
        </FieldGroup>
      </FieldSet>

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
          {isEditing ? "Guardar cambios" : "Crear curso"}
        </Button>
      </div>
    </form>
  );
}
