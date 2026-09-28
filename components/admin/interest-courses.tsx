"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";

import {
  addInterestCourse,
  moveInterestCourse,
  removeInterestCourse,
} from "@/app/(admin)/admin/interests/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/action-result";

export type InterestCourseRow = {
  courseId: number;
  slug: string;
  title: string;
  inConstruction: boolean;
};

export type InterestCourseOption = {
  id: number;
  title: string;
};

type InterestCoursesProps = {
  interestSlug: string;
  label: string;
  courses: InterestCourseRow[];
  // Los cursos activos que todavía no están en este interés.
  courseOptions: InterestCourseOption[];
};

// Los cursos que sugiere un interés, en orden de preferencia (spec 17).
export function InterestCourses({
  interestSlug,
  label,
  courses,
  courseOptions,
}: InterestCoursesProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const optionItems = courseOptions.map((course) => ({ value: course.id, label: course.title }));

  function runAction(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setErrorMessage(null);

    startSaving(async () => {
      const result = await action();
      if (result.ok) {
        onSuccess?.();
        return;
      }
      setErrorMessage(result.message);
    });
  }

  function handleAdd() {
    if (selectedCourseId === null) {
      setErrorMessage("Elige un curso para agregar.");
      return;
    }
    runAction(
      () => addInterestCourse(interestSlug, selectedCourseId),
      () => setSelectedCourseId(null),
    );
  }

  return (
    <Card className="motion-safe:transition-shadow motion-safe:duration-200 motion-safe:hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <h3>{label}</h3>
          <Badge variant="secondary">
            {courses.length} {courses.length === 1 ? "curso" : "cursos"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Entra el primero que tenga su base en la ruta; si sobra tiempo, los siguientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este interés no sugiere ningún curso.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {courses.map((course, index) => (
              <li
                key={course.courseId}
                className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2 hover:bg-muted/40 motion-safe:transition-colors motion-safe:duration-200"
              >
                <span className="w-6 text-center text-sm text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/courses/${encodeURIComponent(course.slug)}`}
                    className="text-sm font-medium text-primary-bright underline-offset-4 hover:underline"
                  >
                    {course.title}
                  </Link>
                  {course.inConstruction ? (
                    <Badge variant="secondary">En construcción</Badge>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Subir ${course.title}`}
                  disabled={isSaving || index === 0}
                  onClick={() =>
                    runAction(() => moveInterestCourse(interestSlug, course.courseId, "up"))
                  }
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Bajar ${course.title}`}
                  disabled={isSaving || index === courses.length - 1}
                  onClick={() =>
                    runAction(() => moveInterestCourse(interestSlug, course.courseId, "down"))
                  }
                >
                  <ArrowDownIcon />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${course.title}`}>
                      <TrashIcon />
                    </Button>
                  }
                  title={`¿Quitar ${course.title} de «${label}»?`}
                  description="Vale para las rutas nuevas. Las rutas ya generadas no cambian."
                  confirmLabel="Quitar"
                  onConfirm={() => removeInterestCourse(interestSlug, course.courseId)}
                />
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={optionItems}
            value={selectedCourseId}
            onValueChange={(value) => setSelectedCourseId(value ?? null)}
          >
            <SelectTrigger className="min-w-0 flex-1" aria-label={`Curso para sumar a ${label}`}>
              <SelectValue placeholder="Elige un curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {optionItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleAdd} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PlusIcon data-icon="inline-start" />
            )}
            Agregar
          </Button>
        </div>

        {errorMessage ? (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
