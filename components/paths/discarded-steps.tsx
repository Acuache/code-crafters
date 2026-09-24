import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PathStepView } from "@/lib/paths/path-view";

export function DiscardedSteps({ steps }: { steps: PathStepView[] }) {
  if (!steps.length) return null;
  return (
    <Accordion defaultValue={["discarded"]}>
      <AccordionItem value="discarded">
        <AccordionTrigger>Qué quitamos y por qué</AccordionTrigger>
        <AccordionContent>
          {steps.map((step) => (
            <p key={step.id}>
              <strong>{step.course.title}:</strong> {step.discardReason}
            </p>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
