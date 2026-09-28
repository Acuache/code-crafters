import Link from "next/link";
import { CheckCircleIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CourseQuizStatus = "active" | "inactive" | "none";

export type AdminCourseRow = {
  id: number;
  slug: string;
  title: string;
  hours: number;
  difficulty: "principiante" | "intermedio" | "avanzado";
  isActive: boolean;
  programCount: number;
  quizStatus: CourseQuizStatus;
};

function QuizStatusBadge({ status }: { status: CourseQuizStatus }) {
  if (status === "active") {
    return (
      <Badge>
        <CheckCircleIcon data-icon="inline-start" aria-hidden="true" />
        Activo
      </Badge>
    );
  }
  if (status === "inactive") {
    return <Badge variant="secondary">Inactivo</Badge>;
  }
  return <Badge variant="outline">Sin quiz</Badge>;
}

function formatHours(hours: number): string {
  return `${hours.toLocaleString("es-ES")} h`;
}

export function CoursesTable({ courses }: { courses: AdminCourseRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Curso</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Horas</TableHead>
          <TableHead className="hidden sm:table-cell">Dificultad</TableHead>
          <TableHead className="hidden lg:table-cell">Programas</TableHead>
          <TableHead>Quiz</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id}>
            <TableCell className="min-w-0 whitespace-normal">
              <div className="flex flex-col items-start gap-1">
                <Link
                  href={`/admin/courses/${encodeURIComponent(course.slug)}`}
                  className="inline-flex min-h-6 items-center font-medium text-primary-bright underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {course.title}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs break-all text-muted-foreground">
                    {course.slug}
                  </span>
                  {course.isActive ? null : <Badge variant="secondary">Inactivo</Badge>}
                  {course.programCount > 0 ? (
                    <span className="text-xs text-muted-foreground lg:hidden">
                      {course.programCount} {course.programCount === 1 ? "programa" : "programas"}
                    </span>
                  ) : (
                    <Badge variant="destructive" className="lg:hidden">
                      Sin programa
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground sm:hidden">
                  {formatHours(course.hours)} · {course.difficulty}
                </span>
              </div>
            </TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">
              {formatHours(course.hours)}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant="outline">{course.difficulty}</Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {course.programCount > 0 ? (
                <span className="tabular-nums">{course.programCount}</span>
              ) : (
                // Sin ubicación en un programa el motor solo lo propone si un interés lo nombra.
                <Badge variant="destructive">Sin programa</Badge>
              )}
            </TableCell>
            <TableCell>
              <Link
                href={`/admin/courses/${encodeURIComponent(course.slug)}/quiz`}
                aria-label={`${course.quizStatus === "none" ? "Crear" : "Editar"} quiz de ${course.title}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md text-primary-bright hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <QuizStatusBadge status={course.quizStatus} />
                <span className="inline-flex items-center gap-1 text-xs font-medium">
                  {course.quizStatus === "none" ? (
                    <PlusIcon data-icon="inline-start" aria-hidden="true" />
                  ) : null}
                  {course.quizStatus === "none" ? "Crear" : "Editar"}
                  {course.quizStatus === "none" ? null : (
                    <PencilSimpleIcon data-icon="inline-end" aria-hidden="true" />
                  )}
                </span>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
