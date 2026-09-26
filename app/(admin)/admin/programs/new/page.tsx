import { ProgramForm } from "@/components/admin/program-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/supabase/guards";
import { createClient } from "@/lib/supabase/server";

export default async function NewProgramPage() {
  await requireAdmin();

  // Por defecto el programa nuevo va al final de la lista.
  const supabase = await createClient();
  const { data: lastProgram } = await supabase
    .from("programs")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (lastProgram?.position ?? 0) + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo programa</CardTitle>
        <CardDescription>
          Un programa nuevo no aparece en el cuestionario hasta que alguna meta de
          lib/paths/goals.ts lo nombre. Eso se hace por código.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProgramForm mode="create" initialValues={{ slug: "", name: "", position: nextPosition }} />
      </CardContent>
    </Card>
  );
}
