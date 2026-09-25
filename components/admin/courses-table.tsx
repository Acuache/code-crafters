import Link from "next/link";

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
    return <Badge>Activo</Badge>;
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
          <TableHead>Slug</TableHead>
          <TableHead className="text-right">Horas</TableHead>
          <TableHead>Dificultad</TableHead>
          <TableHead>Programas</TableHead>
          <TableHead>Quiz</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((course) => (
          <TableRow key={course.id}>
            <TableCell className="max-w-72">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/courses/${encodeURIComponent(course.slug)}`}
                  className="truncate font-medium text-primary-bright underline-offset-4 hover:underline"
                >
                  {course.title}
                </Link>
                {course.isActive ? null : <Badge variant="secondary">Inactivo</Badge>}
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{course.slug}</TableCell>
            <TableCell className="text-right tabular-nums">{formatHours(course.hours)}</TableCell>
            <TableCell>
              <Badge variant="outline">{course.difficulty}</Badge>
            </TableCell>
            <TableCell>
              {course.programCount > 0 ? (
                <span className="tabular-nums">{course.programCount}</span>
              ) : (
                // Sin ubicación en un programa el motor solo lo propone si un interés lo nombra.
                <Badge variant="destructive">Sin programa</Badge>
              )}
            </TableCell>
            <TableCell>
              <Link href={`/admin/courses/${encodeURIComponent(course.slug)}/quiz`}>
                <QuizStatusBadge status={course.quizStatus} />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
