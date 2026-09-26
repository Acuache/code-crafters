import { LevelBadge } from "@/components/brand/level-badge";
import { AiBadge } from "@/components/brand/ai-badge";
import { XpBar } from "@/components/gamification/xp-bar";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Los bloques compuestos que van a reutilizar el quiz, la ruta y el
 * dashboard, para no reinventarlos pantalla por pantalla.
 */
function PatternsSection() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <Card>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">LevelBadge</span>
          <div className="flex flex-wrap gap-2">
            <LevelBadge level="requerido" />
            <LevelBadge level="recomendado" />
            <LevelBadge level="opcional" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">AiBadge</span>
          <AiBadge />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">XpBar</span>
          <XpBar level={4} currentXp={320} nextLevelXp={500} />
        </CardContent>
      </Card>
    </div>
  );
}

export { PatternsSection };
