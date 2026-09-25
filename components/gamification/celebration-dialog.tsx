// Sin "use client": solo lo importa path-steps-view.tsx, que ya es cliente.
import type { ReactNode } from "react";
import Image from "next/image";
import { PathIcon, StarIcon, type Icon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import {
  mainCelebration,
  type CelebrationEvents,
  type MainCelebration,
} from "@/lib/gamification/summary";

import { AchievementMedal } from "./achievement-grid";

type Pose = { src: string; width: number; height: number };

// 160 px de alto; el ancho respeta la proporción de cada imagen.
const POSES: Record<MainCelebration, Pose> = {
  "path-complete": { src: "/streak/celebration-2.webp", width: 162, height: 160 },
  "level-up": { src: "/streak/celebration-3.webp", width: 148, height: 160 },
  achievement: { src: "/streak/celebration-4.webp", width: 170, height: 160 },
};

export type Celebration = {
  events: CelebrationEvents;
  courseTitle: string;
};

type GainedItem = {
  key: string;
  visual: ReactNode;
  label: string;
  detail: string;
};

function IconCircle({ icon: ItemIcon }: { icon: Icon }) {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      aria-hidden="true"
    >
      <ItemIcon weight="fill" className="size-5" />
    </span>
  );
}

function newAchievements(events: CelebrationEvents) {
  return ACHIEVEMENTS.filter((achievement) => events.newAchievements.includes(achievement.id));
}

function celebrationTitle(main: MainCelebration, events: CelebrationEvents): string {
  if (main === "path-complete") {
    return "¡Completaste tu ruta!";
  }

  if (main === "level-up") {
    return `¡Subiste al nivel ${events.levelUp}!`;
  }

  const achievements = newAchievements(events);
  if (achievements.length === 1) {
    return `¡Ganaste la insignia «${achievements[0].name}»!`;
  }

  return "¡Ganaste insignias nuevas!";
}

function gainedItems({ events, courseTitle }: Celebration): GainedItem[] {
  const items: GainedItem[] = [];
  const gainedXp = events.completedCourse?.gainedXp ?? 0;

  if (gainedXp > 0) {
    items.push({
      key: "xp",
      visual: <Image src="/streak/celebration-1.webp" alt="" width={28} height={40} />,
      label: `+${gainedXp} XP`,
      detail: `«${courseTitle}»`,
    });
  }

  if (events.completedPathId !== null) {
    items.push({
      key: "path",
      visual: <IconCircle icon={PathIcon} />,
      label: "Terminaste la ruta",
      detail: "Completaste todos sus cursos",
    });
  }

  if (events.levelUp !== null) {
    items.push({
      key: "level",
      visual: <IconCircle icon={StarIcon} />,
      label: `Nivel ${events.levelUp}`,
      detail: "Tu XP te subió de nivel",
    });
  }

  for (const achievement of newAchievements(events)) {
    items.push({
      key: achievement.id,
      visual: <AchievementMedal achievementId={achievement.id} isEarned size="sm" />,
      label: `Insignia «${achievement.name}»`,
      detail: achievement.description,
    });
  }

  return items;
}

type CelebrationDialogProps = {
  // Aparte de `celebration`: el contenido sigue visible mientras el modal se cierra.
  open: boolean;
  celebration: Celebration | null;
  onClose: () => void;
};

export function CelebrationDialog({ open, celebration, onClose }: CelebrationDialogProps) {
  const main = celebration ? mainCelebration(celebration.events) : null;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        {celebration && main ? (
          <CelebrationContent celebration={celebration} main={main} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type CelebrationContentProps = {
  celebration: Celebration;
  main: MainCelebration;
  onClose: () => void;
};

function CelebrationContent({ celebration, main, onClose }: CelebrationContentProps) {
  const pose = POSES[main];

  return (
    <>
      <DialogHeader className="items-center text-center">
        <Image
          src={pose.src}
          alt=""
          width={pose.width}
          height={pose.height}
          className="drop-shadow-xl"
        />
        <DialogTitle className="text-xl font-semibold text-balance">
          {celebrationTitle(main, celebration.events)}
        </DialogTitle>
        <DialogDescription>Esto es lo que ganaste con este avance:</DialogDescription>
      </DialogHeader>

      <ul className="flex flex-col gap-3">
        {gainedItems(celebration).map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <span className="flex w-10 shrink-0 justify-center">{item.visual}</span>
            <div className="flex min-w-0 flex-col">
              <span className="font-heading font-semibold">{item.label}</span>
              <span className="text-sm text-muted-foreground">{item.detail}</span>
            </div>
          </li>
        ))}
      </ul>

      <DialogFooter>
        <Button variant="brand" onClick={onClose} className="w-full sm:w-auto">
          ¡Seguir!
        </Button>
      </DialogFooter>
    </>
  );
}

export function showCourseCompletedToast(courseTitle: string, gainedXp: number) {
  if (gainedXp === 0) {
    toast.add({ title: `«${courseTitle}» ya sumaba XP en otra de tus rutas` });
    return;
  }

  toast.add({
    title: (
      <span className="flex items-center gap-3">
        <Image
          src="/streak/celebration-1.webp"
          alt=""
          width={28}
          height={40}
          className="shrink-0"
        />
        <span>
          +{gainedXp} XP · «{courseTitle}»
        </span>
      </span>
    ),
  });
}
