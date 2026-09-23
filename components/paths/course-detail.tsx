import { ArrowSquareOutIcon, LockIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PathStepView } from "@/lib/paths/path-view";

export function CourseDetail({ step }: { step: PathStepView }) {
  const locked = step.uiStatus === "locked";
  return <Card><CardHeader><CardTitle><h2>{step.course.title}</h2></CardTitle></CardHeader><CardContent>
    <p className="text-muted-foreground">{step.course.summary}</p><p>{step.course.hours} horas · {step.course.chapters.length} capítulos</p>
    <Separator />
    <ul className="space-y-2">{step.course.chapters.map((chapter) => <li key={chapter}>{chapter}</li>)}</ul>
    <Button disabled={locked}>{locked ? <LockIcon /> : null}{locked ? "Completa el paso anterior" : "Comenzar quiz del curso"}</Button>
    <Button variant="outline" render={<a href={step.course.url} target="_blank" rel="noreferrer" />} nativeButton={false}>Ver en DevTalles <ArrowSquareOutIcon /></Button>
  </CardContent></Card>;
}
