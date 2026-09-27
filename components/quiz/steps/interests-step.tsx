"use client";

import { type Control, useController } from "react-hook-form";
import Image from "next/image";

import type { AssessmentAnswers } from "@/components/quiz/quiz-schema";
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INTERESTS } from "@/lib/paths/interests";

const INTEREST_ICON_PATHS: Record<string, string> = {
  docker: "/languages-icons/docker.svg",
  "solid-clean-code": "/languages-icons/solid-clean-code.svg",
  "patrones-diseno": "/languages-icons/patrones-diseno.svg",
  "control-versiones": "/languages-icons/git.svg",
  "bases-de-datos-sql": "/languages-icons/sql.svg",
  testing: "/languages-icons/testing.svg",
  "tiempo-real": "/languages-icons/tiempo-real.svg",
  "ia-aplicada": "/languages-icons/ia-aplicada.svg",
  microservicios: "/languages-icons/microservicios.svg",
  "sitios-de-contenido": "/languages-icons/HTML5.svg",
  "agentes-vibe-coding": "/languages-icons/agentes-vibe-coding.svg",
  estilos: "/languages-icons/CSS3.svg",
};

export function InterestsStep({ control }: { control: Control<AssessmentAnswers> }) {
  const { field } = useController({ control, name: "interests" });

  return (
    <FieldSet>
      <FieldLegend>¿Qué te interesa sumar a tu ruta?</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldDescription>
            Son temas transversales que se agregan a tu ruta si entran en tu tiempo disponible. Está
            bien si no marcas ninguno.
          </FieldDescription>
          <ToggleGroup
            multiple
            variant="outline"
            aria-label="Intereses para sumar a tu ruta"
            className="w-full flex-wrap"
            value={field.value}
            onValueChange={field.onChange}
          >
            {Object.entries(INTERESTS).map(([slug, interest]) => (
              <ToggleGroupItem key={slug} value={slug} className="gap-1.5">
                <Image
                  src={INTEREST_ICON_PATHS[slug]}
                  alt=""
                  aria-hidden="true"
                  width={16}
                  height={16}
                  className="size-4 object-contain"
                />
                {interest.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
