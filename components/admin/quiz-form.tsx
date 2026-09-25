"use client";

import { useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useFormState, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";

import { saveCourseQuiz, setCourseQuizActive } from "@/app/(admin)/admin/courses/actions";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  courseQuizDraftSchema,
  DEFAULT_PASS_PERCENTAGE,
  MAX_QUIZ_QUESTIONS,
  type CourseQuizDraft,
  type QuizQuestion,
} from "@/lib/quizzes/schema";

// El quiz tal como está guardado; null si el curso todavía no tiene.
export type SavedQuiz = {
  id: string;
  isActive: boolean;
  passPercentage: number;
  questions: QuizQuestion[];
};

// Índices literales: react-hook-form tipa la ruta de cada opción de la tupla (`options.0`...).
const OPTIONS = [
  { index: 0, letter: "A" },
  { index: 1, letter: "B" },
  { index: 2, letter: "C" },
  { index: 3, letter: "D" },
] as const;

// id vacío: saveCourseQuiz le pone uno al guardar.
function createEmptyQuestion(): QuizQuestion {
  return { id: "", prompt: "", options: ["", "", "", ""], correctOption: 0, explanation: "" };
}

function initialValuesFor(savedQuiz: SavedQuiz | null): CourseQuizDraft {
  if (!savedQuiz) {
    return {
      questions: [createEmptyQuestion()],
      passPercentage: DEFAULT_PASS_PERCENTAGE,
      isActive: true,
    };
  }

  return {
    questions: savedQuiz.questions,
    passPercentage: savedQuiz.passPercentage,
    isActive: savedQuiz.isActive,
  };
}

type QuizStatusCardProps = {
  quizId: string;
  isActive: boolean;
};

// Mismo patrón que CourseStatusCard (spec 10): el estado cambia recién cuando el servidor confirma,
// por el revalidatePath de la action. Desactivar oculta el botón del quiz en las rutas.
export function QuizStatusCard({ quizId, isActive }: QuizStatusCardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function handleToggle() {
    setErrorMessage(null);

    startSaving(async () => {
      const result = await setCourseQuizActive(quizId, !isActive);
      if (!result.ok) {
        setErrorMessage(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Estado del quiz
          {isActive ? <Badge>Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
        </CardTitle>
        <CardDescription>
          {isActive
            ? "Los alumnos lo ven en sus rutas y aprobarlo marca el curso como hecho."
            : "Los alumnos no lo ven. Sus intentos anteriores se conservan."}
        </CardDescription>
        <CardAction>
          <Button variant="outline" onClick={handleToggle} disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isActive ? "Desactivar" : "Activar"}
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

type QuizFormProps = {
  courseId: number;
  savedQuiz: SavedQuiz | null;
};

export function QuizForm({ courseId, savedQuiz }: QuizFormProps) {
  const isCreating = savedQuiz === null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [wasSaved, setWasSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<CourseQuizDraft>({
    resolver: zodResolver(courseQuizDraftSchema),
    defaultValues: initialValuesFor(savedQuiz),
    mode: "onTouched",
  });
  // keyName propio: el `id` de cada pregunta es un dato del quiz, no la key de React.
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "questions",
    keyName: "fieldKey",
  });
  const { errors } = form.formState;
  const canAddQuestion = fields.length < MAX_QUIZ_QUESTIONS;

  function handleValidSubmit(values: CourseQuizDraft) {
    setServerError(null);
    setWasSaved(false);

    startSaving(async () => {
      const result = await saveCourseQuiz(courseId, values);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }

      // Las preguntas nuevas vuelven con el id que les puso la action: sin esto, el próximo
      // guardado les daría otro.
      form.reset({ ...values, questions: result.data });
      setWasSaved(true);
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleValidSubmit)}
      noValidate
      className="flex flex-col gap-8"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.passPercentage}>
          <FieldLabel htmlFor="quiz-pass-percentage">Porcentaje para aprobar</FieldLabel>
          <Input
            id="quiz-pass-percentage"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            className="max-w-32"
            aria-invalid={!!errors.passPercentage}
            {...form.register("passPercentage", { valueAsNumber: true })}
          />
          <FieldDescription>
            Aprobar marca el curso como hecho y suma el día a la racha. Por defecto,{" "}
            {DEFAULT_PASS_PERCENTAGE} %.
          </FieldDescription>
          <FieldError errors={[errors.passPercentage]} />
        </Field>

        {isCreating ? (
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id="quiz-is-active"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
                <FieldLabel htmlFor="quiz-is-active">
                  Activo: los alumnos lo ven en sus rutas apenas lo guardes
                </FieldLabel>
              </Field>
            )}
          />
        ) : null}
      </FieldGroup>

      <div className="flex flex-col gap-6">
        {fields.map((questionField, index) => (
          <QuestionFields
            key={questionField.fieldKey}
            control={form.control}
            index={index}
            questionCount={fields.length}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <div className="flex flex-col items-start gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!canAddQuestion}
          onClick={() => append(createEmptyQuestion())}
        >
          <PlusIcon data-icon="inline-start" />
          Agregar pregunta
        </Button>
        {canAddQuestion ? null : (
          <p className="text-sm text-muted-foreground">
            Llegaste al máximo de {MAX_QUIZ_QUESTIONS} preguntas.
          </p>
        )}
      </div>

      {serverError ? (
        <Alert variant="destructive">
          <WarningIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {wasSaved ? (
        <Alert>
          <CheckCircleIcon />
          <AlertDescription>Quiz guardado.</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <Button type="submit" variant="brand" disabled={isSaving}>
          {isSaving ? <Spinner data-icon="inline-start" /> : null}
          {isCreating ? "Crear quiz" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

type QuestionFieldsProps = {
  control: Control<CourseQuizDraft>;
  index: number;
  questionCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

function QuestionFields({
  control,
  index,
  questionCount,
  onMoveUp,
  onMoveDown,
  onRemove,
}: QuestionFieldsProps) {
  const questionNumber = index + 1;
  const idPrefix = `quiz-question-${index}`;
  const { errors } = useFormState({ control, name: `questions.${index}.options` });
  // "Las cuatro opciones deben ser distintas" es del grupo, no de una opción: el resolver lo deja
  // en `root` porque cada opción está registrada por separado.
  const distinctOptionsError = errors.questions?.[index]?.options?.root;

  return (
    <FieldSet className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLegend>Pregunta {questionNumber}</FieldLegend>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === 0}
            onClick={onMoveUp}
            aria-label={`Subir la pregunta ${questionNumber}`}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={index === questionCount - 1}
            onClick={onMoveDown}
            aria-label={`Bajar la pregunta ${questionNumber}`}
          >
            <ArrowDownIcon />
          </Button>
          {/* El quiz necesita al menos una pregunta: la última no se puede borrar. */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={questionCount === 1}
            onClick={onRemove}
            aria-label={`Borrar la pregunta ${questionNumber}`}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      <FieldGroup>
        <Controller
          control={control}
          name={`questions.${index}.prompt`}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-prompt`}>Pregunta</FieldLabel>
              <Textarea id={`${idPrefix}-prompt`} aria-invalid={fieldState.invalid} {...field} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {OPTIONS.map((option) => (
          <Controller
            key={option.letter}
            control={control}
            name={`questions.${index}.options.${option.index}`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${idPrefix}-option-${option.index}`}>
                  Opción {option.letter}
                </FieldLabel>
                <Input
                  id={`${idPrefix}-option-${option.index}`}
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ))}
        <FieldError errors={[distinctOptionsError]} />

        <Controller
          control={control}
          name={`questions.${index}.correctOption`}
          render={({ field }) => (
            <Field>
              <FieldTitle id={`${idPrefix}-correct-title`}>Respuesta correcta</FieldTitle>
              {/* Base UI maneja `value` como string[] incluso en modo simple. Tocar la opción ya
                  elegida manda `[]`: se ignora, porque siempre hay una correcta. */}
              <ToggleGroup
                variant="outline"
                spacing={0}
                value={[String(field.value)]}
                onValueChange={(values) => {
                  if (values[0] !== undefined) {
                    field.onChange(Number(values[0]));
                  }
                }}
                aria-labelledby={`${idPrefix}-correct-title`}
              >
                {OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.letter}
                    value={String(option.index)}
                    className="px-4"
                  >
                    {option.letter}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          )}
        />

        <Controller
          control={control}
          name={`questions.${index}.explanation`}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-explanation`}>Explicación</FieldLabel>
              <Textarea
                id={`${idPrefix}-explanation`}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              <FieldDescription>El alumno la ve apenas responde, acierte o no.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
    </FieldSet>
  );
}
