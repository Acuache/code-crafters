import { CourseForm, EMPTY_COURSE_FIELDS } from "@/components/admin/course-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/supabase/guards";

export default async function NewCoursePage() {
  await requireAdmin();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo curso</CardTitle>
        <CardDescription>
          Después de crearlo, ubicalo en un programa para que pueda aparecer en las rutas generadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CourseForm mode="create" initialValues={EMPTY_COURSE_FIELDS} />
      </CardContent>
    </Card>
  );
}
