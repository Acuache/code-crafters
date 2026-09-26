import { ChatCircleTextIcon } from "@phosphor-icons/react/ssr";

import { AiBadge } from "@/components/brand/ai-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { appliedAdjustmentSchema } from "@/lib/ai/profile-adjustment";
import { GOALS } from "@/lib/paths/goals";
import { INTERESTS, TECHNOLOGIES } from "@/lib/paths/interests";

type ProfileAdjustmentsNoteProps = {
  adjustments: unknown; // learning_paths.ai_adjustments (jsonb)
};

function labelOf(table: Record<string, { label: string }>, slug: string): string {
  return table[slug]?.label ?? slug;
}

// Spec 11: hace visible qué cambió la IA en las respuestas a partir del texto libre, para que el
// usuario vea que lo escuchó y pueda entender por qué su ruta no es exactamente lo que marcó.
export function ProfileAdjustmentsNote({ adjustments }: ProfileAdjustmentsNoteProps) {
  const parsed = appliedAdjustmentSchema.safeParse(adjustments);
  if (!parsed.success) {
    return null;
  }

  const { goal, addedInterests, removedInterests, addedMastered, removedMastered, explanation } =
    parsed.data;

  const changes: string[] = [];
  if (goal) {
    changes.push(`Meta: ${labelOf(GOALS, goal.from)} → ${labelOf(GOALS, goal.to)}`);
  }
  for (const slug of addedInterests) {
    changes.push(`+ ${labelOf(INTERESTS, slug)}`);
  }
  for (const slug of removedInterests) {
    changes.push(`− ${labelOf(INTERESTS, slug)}`);
  }
  for (const slug of addedMastered) {
    changes.push(`Ya dominas: ${labelOf(TECHNOLOGIES, slug)}`);
  }
  for (const slug of removedMastered) {
    changes.push(`Por aprender: ${labelOf(TECHNOLOGIES, slug)}`);
  }

  return (
    <Alert>
      <ChatCircleTextIcon />
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Ajustamos tu ruta por lo que contaste
        <AiBadge />
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{explanation}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Cambios en tus respuestas">
          {changes.map((change) => (
            <li key={change}>
              <Badge variant="secondary">{change}</Badge>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
