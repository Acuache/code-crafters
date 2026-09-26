import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAMPLE_ANSWERS } from "@/lib/landing/example-path";

import { afterArrival, FADE_IN_ON_ARRIVAL } from "./reveal";

const CHIP_STAGGER_MS = 90;

export function QuizMockup() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Tus respuestas</CardTitle>
        <CardDescription>Un ejemplo del cuestionario</CardDescription>
      </CardHeader>
      <CardContent>
        <ul aria-label="Respuestas de ejemplo" className="flex flex-wrap gap-2">
          {EXAMPLE_ANSWERS.map((answer, index) => (
            <li
              key={answer}
              className={FADE_IN_ON_ARRIVAL}
              style={afterArrival(300 + index * CHIP_STAGGER_MS)}
            >
              <Badge variant="secondary" className="h-7 px-2.5">
                {answer}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
