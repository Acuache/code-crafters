"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkQuizAnswer, requestQuiz, submitQuizAttempt } from "@/app/(app)/paths/[id]/actions";
import { StreakCard } from "@/components/gamification/streak-card";
import { QuizDialog, type QuizTarget } from "@/components/quizzes/quiz-dialog";
import { BonusMissions } from "./bonus-missions";
import { CourseDetail } from "./course-detail";
import { DiscardedSteps } from "./discarded-steps";
import { PathOverview } from "./path-overview";
import { PathTimeline } from "./path-timeline";
import type { PathStepView, PathView } from "@/lib/paths/path-view";

export function PathExperience({ path, streak }: { path: PathView; streak: { current: number; best: number; activityDates: string[] } }) {
  const router = useRouter();
  const initial = path.mainSteps.find((step) => step.uiStatus !== "done") ?? path.mainSteps[0] ?? path.bonusSteps[0];
  const [selected, setSelected] = useState<PathStepView | undefined>(initial);
  const [quizTarget, setQuizTarget] = useState<QuizTarget | null>(null);
  const openQuiz = (step: PathStepView, kind: "course" | "chapter", chapterTitle: string | null) => setQuizTarget({ pathId: path.id, pathStepId: step.id, kind, chapterTitle });
  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
    <header><p className="text-sm font-medium text-primary">TU MISIÓN</p><h1 className="font-heading text-3xl font-semibold">{path.title}</h1><p className="text-muted-foreground">{path.summary}</p></header>
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
      <aside className="space-y-6"><PathOverview path={path} streak={streak} /><StreakCard {...streak} /></aside>
      <main className="space-y-6"><PathTimeline steps={path.mainSteps} selectedId={selected?.id ?? ""} onSelect={setSelected} /><DiscardedSteps steps={path.discardedSteps} /></main>
      <aside className="space-y-6">{selected ? <CourseDetail step={selected} onCourseQuiz={() => openQuiz(selected, "course", null)} onChapterQuiz={(chapter) => openQuiz(selected, "chapter", chapter)} /> : null}<BonusMissions steps={path.bonusSteps} onSelect={setSelected} /></aside>
    </div>
    <QuizDialog checkAnswerAction={checkQuizAnswer} onClose={() => setQuizTarget(null)} onCompleted={() => router.refresh()} open={Boolean(quizTarget)} requestQuizAction={requestQuiz} submitAttemptAction={submitQuizAttempt} target={quizTarget} />
  </div>;
}
