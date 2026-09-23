"use client";

import { useState } from "react";
import { BonusMissions } from "./bonus-missions";
import { CourseDetail } from "./course-detail";
import { DiscardedSteps } from "./discarded-steps";
import { PathOverview } from "./path-overview";
import { PathTimeline } from "./path-timeline";
import type { PathStepView, PathView } from "@/lib/paths/path-view";

export function PathExperience({ path, streak }: { path: PathView; streak: { current: number; best: number; activityDates: string[] } }) {
  const initial = path.mainSteps.find((step) => step.uiStatus !== "done") ?? path.mainSteps[0] ?? path.bonusSteps[0];
  const [selected, setSelected] = useState<PathStepView | undefined>(initial);
  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
    <header><p className="text-sm font-medium text-primary">TU MISIÓN</p><h1 className="font-heading text-3xl font-semibold">{path.title}</h1><p className="text-muted-foreground">{path.summary}</p></header>
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
      <aside><PathOverview path={path} streak={streak} /></aside>
      <main className="space-y-6"><PathTimeline steps={path.mainSteps} selectedId={selected?.id ?? ""} onSelect={setSelected} /><DiscardedSteps steps={path.discardedSteps} /></main>
      <aside className="space-y-6">{selected ? <CourseDetail step={selected} /> : null}<BonusMissions steps={path.bonusSteps} onSelect={setSelected} /></aside>
    </div>
  </div>;
}
