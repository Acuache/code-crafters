import { Progress, ProgressLabel } from "@/components/ui/progress";

type XpBarProps = {
  level: number;
  currentXp: number;
  nextLevelXp: number;
};

// El valor va en un <span> propio y no con el render-prop de ProgressValue: una función no se puede
// pasar como children de un Server Component a uno cliente.
export function XpBar({ level, currentXp, nextLevelXp }: XpBarProps) {
  const progressPercentage = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));

  return (
    <Progress value={progressPercentage} className="flex-col items-stretch gap-1.5">
      <div className="flex items-center justify-between">
        <ProgressLabel>Nivel {level}</ProgressLabel>
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {currentXp} / {nextLevelXp} XP
        </span>
      </div>
    </Progress>
  );
}
